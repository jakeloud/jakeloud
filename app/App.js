const { exec } = require('child_process')
const MIN_PORT = 38000

class App {
  constructor({name, domain, repo, port}) {
    this.name = name
    this.domain = domain
    this.repo = repo
    this.port = port
    this.state = 'unknown'
  }
  async setup() {
    // nginx + certbot
    return new Promise((resolve, reject) => {
      exec('/etc/jakeloud/jakeloud/setup-app.sh', {
        env: {domain, port},
      }, (error, stdout, stderr) => {
        if (error) reject(error) else resolve()
      }
    })
  }
  async clone() {
    // git clone repo to /etc/jakeloud/<domain>
  }
  async build() {
    // docker build /etc/jakeloud/<domain>/Dockerfile
  }
  async run() {
    // docker run <domain>-latest
  }
  async stop() {
    // docker stop <domain>-latest
  }
  async remove() {
    // docker image rm <domain>
    // docker rm <domain>-latest

    // if there are no other services using this repo
    // -> rm /etc/jakeloud/<domain>
  }
}

module.exports = { App }
