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
    exec(cmd, (error, stdout, stderr) => {
      if (error) reject(error)
      else resolve(stdout)
    })
  })

const updateJakeloud = async () => {
  await execWrapped('sudo sh -c "$(curl --silent -fsSL https://raw.githubusercontent.com/notTGY/jakeloud/main/install.sh)"')
}

const setConf = (json) => writeFileSync(CONF_FILE, JSON.stringify(json, null, 2))

const getConf = async ({email, sudo} = {}) => {
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
  const apps = conf.apps.map(app => new App(app)).filter(app => sudo || app.email === email)
  conf.apps = apps
  return conf
}

class App {
  constructor({name, domain, repo, port, state, email, vcs, additional}) {
    this.name = name
    this.domain = domain
    this.repo = repo
    this.state = state
    this.email = email
    this.vcs = vcs
    this.port = port
    // TODO: add ssh port, additional.onpremise
    // TODO: add additional.env
    this.additional = additional
  }
  async save() {
    const conf = await getConf({sudo: true})
    if (conf.apps.find(app => app.name === this.name)) {
      conf.apps = conf.apps.map(app => app.name === this.name ? this : app)
      await setConf(conf)
    } else {
      conf.apps.push(this)
      await setConf(conf)
    }
  }

  async loadState() {
    // this can bring problems, as getConf depends on App constructor
    const app = await getApp(this.name)
    this.state = app.state
  }

  async clone() {
    await this.loadState()
    this.state = 'cloning'
    await this.save()
    try {
      await execWrapped(`rm -rf /etc/jakeloud/${this.repo}`)
      await execWrapped(`git clone https://${this.vcs}/${this.repo}.git /etc/jakeloud/${this.repo}`)
    } catch(e) {
      this.state = `Error: ${e}`
      await this.save()
    }
  }

  async build() {
    await this.loadState()
    if (this.state !== 'cloning') return
    this.state = 'building'
    await this.save()
    try {
      await execWrapped(`docker build -t ${this.repo.toLowerCase()} /etc/jakeloud/${this.repo}`)
    } catch (e) {
      this.state = `Error: ${e}`
      await this.save()
    }
  }
  async proxy() {
    await this.loadState()
    if (this.state !== 'building') return
    this.state = 'proxying'
    await this.save()
    try {
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
    } catch (e) {
      this.state = `Error: ${e}`
      await this.save()
    }
  }

  async start() {
    await this.loadState()
    if (this.state !== 'proxying') return
    this.state = 'starting'
    await this.save()
    try {
      await execWrapped(`if [ -z "$(sudo docker ps -q -f name=${this.name})" ]; then echo "starting first time"; else docker stop ${this.name} && docker rm ${this.name}; fi`)
      await execWrapped(`docker run --name ${this.name} -d -p ${this.port}:80 ${this.repo.toLowerCase()}`)
    } catch (e) {
      this.state = `Error: ${e}`
      await this.save()
    }
  }

  async cert() {
    await this.loadState()
    if (this.state !== 'starting') return
    this.state = 'certing'
    await this.save()
    try {
      await execWrapped(`certbot -n --agree-tos --email ${this.email} --nginx -d ${this.domain}`)
      this.state = `🟢 running`
      await this.save()
    } catch(e) {
      this.state = `Error: ${e}`
      await this.save()
    }
  }
  async stop() {
    this.state = 'stopping'
    await this.save()
    try {
      await execWrapped(`docker stop ${this.name}`)
    } catch (e) {
      this.state = `Error: ${e}`
      await this.save()
    }
  }
  async remove(removeRepo) {
    await this.loadState()
    if (this.state.startsWith('Error')) return
    this.state = 'removing'
    await this.save()
    try {
      const proms = [
        execWrapped(`docker rm ${this.name.toLowerCase()}`),
        execWrapped(`rm -f /etc/nginx/sites-available/${this.name}`),
        execWrapped(`rm -f /etc/nginx/sites-enabled/${this.name}`),
      ]
      if (removeRepo) {
        proms.push(execWrapped(`docker image rm ${this.repo.toLowerCase()} && rm -r /etc/jakeloud/${this.repo}`))
      }
  
      await Promise.all(proms)
    } catch (e) {
      this.state = `Error: ${e}`
      await this.save()
    }
  }
}

const getApp = async (name) => {
  const { users, apps } = await getConf({sudo: true})
  return apps.find(app => app.name === name)
}

const isAuthenticated = async (body) => {
  const { users } = await getConf()
  const { password, email } = body
  if (users.length === 0 || !password || !email) return false
  const user = users.find(u => u.email === email)
  if (!user) return false
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
  JAKELOUD,
  getConf,
  setConf,
  isAuthenticated,
  setUser,
  updateJakeloud,
}
