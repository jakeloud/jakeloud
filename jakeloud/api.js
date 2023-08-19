const {
  App, getApp, JAKELOUD, getConf, setConf, setUser, isAuthenticated, updateJakeloud,
} = require('./entities.js')

const setJakeloudDomainOp = async (req, res, body) => {
  const { email, domain } = body
  const conf = await getConf()
  if (!email || !domain || (conf.users.length && !await isAuthenticated(body))) return

  let jakeloudApp = await getApp(JAKELOUD)
  jakeloudApp.domain = domain
  jakeloudApp.email = email
  jakeloudApp.state = 'building'
  await jakeloudApp.save()
  await jakeloudApp.proxy()
  jakeloudApp = await getApp(JAKELOUD)
  if (jakeloudApp.domain === domain) {
    jakeloudApp.state = 'starting'
    await jakeloudApp.save()
    await jakeloudApp.cert()
  }
}

setJakeloudAdditionalOp = async (req, res, body) => {
  const { additional, email } = body
  const conf = await getConf()
  if (!additional || !await isAuthenticated(body)) return
  const jakeloudAppIndex = conf.apps.findIndex(a => a.name === JAKELOUD)
  if (email !== conf.apps[jakeloudAppIndex].owner) return
  conf.apps[jakeloudAppIndex].additional = additional
  await setConf(conf)
}

const registerOp = async (req, res, body) => {
  const conf = await getConf()
  const { password, email } = body
  const jakeloudApp = await getApp(JAKELOUD)
  if (!(jakeloudApp.additional.allowRegister || !conf.users.length) || !email || !password) return
  setUser(email, password)
}

const getConfOp = async (req, res, body) => {
  const conf = await getConf()
  if (!conf.users.length) {
    const jakeloudApp = await getApp(JAKELOUD)
    if (!jakeloudApp.domain) {
      res.write(JSON.stringify({message: 'domain'}))
      return
    }
    res.write(JSON.stringify({message: 'register'}))
    return
  }
  if (!await isAuthenticated(body)) {
    res.write(JSON.stringify({message: 'login'}))
    return
  }
  // don't leak token
  conf.apps = conf.apps.map(app => {
    if (!app.vcs) return app
    app.vcs = app.vcs.replace(/:[^@]+/g, '') // user:token@host -> user@host
    return app
  })
  res.write(JSON.stringify(conf))
}

const createAppOp = async (req, res, body) => {
  const { domain, repo, name, email, vcs } = body
  const dockerOptions = body['docker options']
  const additional = {dockerOptions}
  if (!await isAuthenticated(body) || !domain || !repo || !name || !email || !vcs) return
  const conf = await getConf()
  const takenPorts = conf.apps.map(app => app.port)
  const takenSshPorts = conf.apps.map(app => app.sshPort)
  let port = 38000
  while (takenPorts.includes(port) || takenSshPorts.includes(port)) port++
  const app = new App({ email, domain, repo, name, port, vcs, additional })
  await app.save()
  // run pipeline
  await app.clone()
  await app.build()
  await app.proxy()
  await app.start()
  await app.cert()
}

const createOnPremiseOp = async (req, res, body) => {
  const { domain, repo, name, email, vcs } = body
  const dockerOptions = body['docker options']
  const additional = {dockerOptions, isOnPremise: true}
  if (!await isAuthenticated(body) || !domain || !repo || !name || !email || !vcs) return
  const conf = await getConf()
  const takenPorts = conf.apps.map(app => app.port)
  const takenSshPorts = conf.apps.map(app => app.sshPort)
  let port = 38000
  while (takenPorts.includes(port) || takenSshPorts.includes(port)) port++
  let sshPort = port + 1
  while (takenPorts.includes(sshPort) || takenSshPorts.includes(sshPort)) sshPort++
  const app = new App({ email, domain, repo, name, port, sshPort, vcs, additional })
  await app.save()
  // run pipeline
  await app.clone()
  await app.build()
  await app.proxy()
  await app.start()
  await app.cert()
}

const deleteAppOp = async (req, res, body) => {
  const { name, email } = body
  const app = await getApp(name)
  if (!await isAuthenticated(body) || !name || !app || !app.email === email) return
  await app.stop()

  let conf = await getConf()
  const isRepoUsedElsewhere = conf.apps.filter(a => a.repo === app.repo).length > 1
  await app.remove(!isRepoUsedElsewhere)

  conf = await getConf()
  conf.apps = conf.apps.filter(a => a.name !== name)
  await setConf(conf)
}

const updateJakeloudOp = async (req, res, body) => {
  if (!await isAuthenticated(body)) return
  updateJakeloud()
}

const ops = {
  setJakeloudDomainOp,
  setJakeloudAdditionalOp,
  registerOp,
  getConfOp,
  createAppOp,
  createOnPremiseOp,
  deleteAppOp,
  updateJakeloudOp,
}

const api = async (req, res, body) => {
  const op = ops[body.op]
  if (!op) {
    res.write('{"message":"noop"}')
  } else {
    await op(req, res, body)
  }
}

module.exports = { api }
