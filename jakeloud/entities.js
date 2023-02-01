const { readFileSync, writeFileSync, existsSync, linkSync } = require('fs')
const { exec } = require('child_process')
const crypto = require('crypto')

const JAKELOUD = 'jakeloud'
const CONF_FILE = '/etc/jakeloud/conf.json'
const FALLBACK_CONF = {
  apps: [{ name: JAKELOUD, port: 666 }],
  users: [],
}

const execWrapped = (cmd) =>
  new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) =>
      error ? reject(error) : resolve()
    )
  })

const updateJakeloud = async () => {
  await execWrapped('sudo sh -c "$(curl --silent -fsSL https://raw.githubusercontent.com/notTGY/jakeloud/main/install.sh)"')
}

const setConf = (json) => writeFileSync(CONF_FILE, JSON.stringify(json))

const getConf = async () => {
  let conf
  try {
    if (existsSync(CONF_FILE)) {
      const contents = readFileSync(CONF_FILE, 'utf8')
      conf = JSON.parse(contents)
    } else {
      conf = FALLBACK_CONF
    }
  } catch(e) {
    conf = FALLBACK_CONF
  }
  const apps = conf.apps.map(app => new App(app))
  conf.apps = apps
  return conf
}

class App {
  constructor({name, domain, repo, port, state, email}) {
    this.name = name
    this.domain = domain
    this.repo = repo
    this.port = port
    this.state = state
    this.email = email
  }
  async clone() {
    await execWrapped(`rm -rf /etc/jakeloud/${this.repo}`)
    await execWrapped(`git clone https://github.com/${this.repo}.git /etc/jakeloud/${this.repo}`)
  }
  async proxy() {
    const content = `
server {
  listen 80;
  server_name ${this.domain};

  location / {
    proxy_set_header   X-Forwarded-For $remote_addr;
    proxy_set_header   Host $host;
    proxy_pass         http://127.0.0.1:${this.port};
  }
}`

    const file = this.name === JAKELOUD ? 'default' : this.name
    writeFileSync(`/etc/nginx/sites-available/${file}`, content)
    if (!existsSync(`/etc/nginx/sites-enabled/${file}`))
      linkSync(`/etc/nginx/sites-available/${file}`, `/etc/nginx/sites-enabled/${file}`)

    await execWrapped(`sudo systemctl restart nginx`)
  }

  async cert() {
    await execWrapped(`certbot -n --agree-tos --email ${this.email} --nginx -d ${this.domain}`)
  }

  async build() {
    await execWrapped(`docker build -t ${this.repo.toLowerCase()} /etc/jakeloud/${this.repo}`)
  }
  async start() {
    await execWrapped(`if [ -z "$(sudo docker ps -q -f name=${this.name})" ]; then echo "starting first time"; else docker stop ${this.name} && docker rm ${this.name}; fi`)
    await execWrapped(`docker run --name ${this.name} -d -p ${this.port}:80 ${this.repo.toLowerCase()}`)
  }
  async stop() {
    await execWrapped(`docker stop ${this.name}`)
  }
  async remove(removeRepo) {
    const proms = [execWrapped(`docker rm ${this.name}`)]
    if (removeRepo) {
      proms.push(execWrapped(`docker image rm ${this.repo} && rm -r /etc/jakeloud/${this.repo}`))
    }

    await Promise.all(proms)
  }
}

const getApp = async (name) => {
  const { users, apps } = await getConf()
  return apps.find(app => app.name === name)
}
const setApp = async (name, newApp) => {
  const conf = await getConf()
  if (conf.apps.find(app => app.name === name)) {
    conf.apps = conf.apps.map(app => app.name === name ? newApp : app)
    await setConf(conf)
  } else {
    conf.apps.push(newApp)
    await setConf(conf)
  }
}

const isAuthenticated = async (body) => {
  const { users } = await getConf()
  const { password, email } = body
  if (users.length === 0 || !password || !email) return false
  const user = users.find(u => u.email === email)
  const { hash, salt } = user
  const encryptHash = crypto.pbkdf2Sync(password, salt, 10000, 512, 'sha512')
  return crypto.timingSafeEqual(Buffer.from(hash), encryptHash)
}

const setUser = async (email, password) => {
  const conf = await getConf()
  const salt = crypto.randomBytes(128).toString('base64')
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 512, 'sha512')
  conf.users.push({email, hash, salt})
  await setConf(conf)
}

module.exports = {
  App,
  getApp,
  setApp,
  JAKELOUD,
  getConf,
  setConf,
  isAuthenticated,
  setUser,
  updateJakeloud,
}
