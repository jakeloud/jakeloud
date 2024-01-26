const { readFileSync, writeFileSync, existsSync, linkSync } = require('fs')
const { exec } = require('child_process')
const crypto = require('crypto')

const JAKELOUD = 'jakeloud'

const execWrapped = (cmd) =>
  new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) reject(error)
      else resolve(stdout)
    })
  })

const updateJakeloud = async () => {
  await execWrapped('sudo sh -c "$(curl --silent -fsSL https://raw.githubusercontent.com/jakeloud/jakeloud/main/install.sh)"')
}

const CONF_FILE = '/etc/jakeloud/conf.json'
const setConf = (json) => {
  writeFileSync(CONF_FILE, JSON.stringify(json, null, 2))
}
const getConf = async () => {
  let conf
  try {
    conf = JSON.parse(readFileSync(CONF_FILE, 'utf8'))
  } catch(e) {
    console.error('Problem with conf.json', e)
  }
  conf.apps = conf.apps.map(app => new App(app))
  return conf
}

class App {
  constructor({name, domain, repo, port, state, email, additional}) {
    this.name = name
    this.domain = domain
    this.repo = repo
    this.state = state
    this.email = email
    this.port = port
    this.additional = additional || {}
  }
  async save() {
    const conf = await getConf()
    const appIndex = conf.apps.findIndex(app => app.name === this.name)
    if (appIndex === -1) {
      conf.apps.push(this)
    } else {
      conf.apps[appIndex] = this
    }
    await setConf(conf)
  }

  // git@github.com:<user>/<repo>.git -> <user>/<repo>
  get shortRepoPath() {
    try {
      return this.repo.split(':')[1].split('.git')[0]
    } catch (e) {
      throw new Error('Repo format should be git@github.com:<user>/<repo>.git')
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
      await execWrapped(`rm -rf /etc/jakeloud/${this.shortRepoPath}`)
      // FIXME: here error occurs if server hasn't queried github.com by ssh
      // it asks for fingerprint
      await execWrapped(`eval "$(ssh-agent -s)"
      ssh-add /etc/jakeloud/id_rsa; git clone ${this.repo} /etc/jakeloud/${this.shortRepoPath}
      kill $SSH_AGENT_PID`)
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
      await execWrapped(`docker build -t ${this.shortRepoPath.toLowerCase()} /etc/jakeloud/${this.shortRepoPath}`)
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
      // test nginx config for syntax errors
      await execWrapped(`sudo nginx -t`)

      if (!existsSync(`/etc/nginx/sites-enabled/${file}`)) {
        linkSync(`/etc/nginx/sites-available/${file}`, `/etc/nginx/sites-enabled/${file}`)
      }
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
      const dockerOptions = this.additional.dockerOptions || ''

      await execWrapped(`docker run --name ${this.name} -d -p ${this.port}:80 ${dockerOptions} ${this.shortRepoPath.toLowerCase()}`)
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
        proms.push(execWrapped(`docker image rm ${this.shortRepoPath.toLowerCase()} && rm -r /etc/jakeloud/${this.shortRepoPath}`))
      }
  
      await Promise.all(proms)
    } catch (e) {
      this.state = `Error: ${e}`
      await this.save()
    }
  }
}

const getApp = async (name) => {
  const { apps } = await getConf()
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
  
  const userIndex = conf.users.findIndex(user => user.email === email)
  if (userIndex === -1) {
    conf.users.push({email, hash, salt})
  } else {
    conf.users[userIndex] = {email, hash, salt}
  }
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
