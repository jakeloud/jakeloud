const {
  App, getApp, setApp, JAKELOUD, getConf, setConf, setUser, isAuthenticated, updateJakeloud,
} = require('./entities.js')

const fullReloadApp = async (name, email) => {
  let app
  app = await getApp(name)
  app.state = 'cloning'
  await setApp(name, app)
  await app.clone()
  if ((await getApp(name)).state != 'cloning') return
  app = await getApp(name)
  app.state = 'building'
  await setApp(name, app)
  await app.build()
  if ((await getApp(name)).state != 'building') return

  app = await getApp(name)
  app.state = 'starting'
  await setApp(name, app)
  // here we stop&remove previously running instance
  await app.start()
  if ((await getApp(name)).state != 'starting') return

  app = await getApp(name)
  app.state = 'proxying'
  await setApp(name, app)
  await app.proxy()
  if ((await getApp(name)).state != 'proxying') return

  app = await getApp(name)
  app.state = 'certing'
  await setApp(name, app)
  await app.cert()
  if ((await getApp(name)).state != 'certing') return

  app = await getApp(name)
  app.state = 'running'
  await setApp(name, app)
}

const deleteApp = async (req, res, body) => {
  const { name, email } = body
  const app = await getApp(name)
  if (!await isAuthenticated(body) || !name || !app || !app.email === email) return
  await app.stop()

  const conf = await getConf({email})
  const isRepoUsedElsewhere = conf.apps.filter(a => a.repo === app.repo).length > 1
  await app.remove(!isRepoUsedElsewhere)

  const syncConf = await getConf({email})
  syncConf.apps = syncConf.apps.filter(a => a.name !== name)
  await setConf(syncConf)
}

const setJakeloudDomainOp = async (req, res, body) => {
  const { email, domain } = body
  const conf = await getConf({email})
  if (!email || !domain || (conf.users.length && !await isAuthenticated(body))) return

  const jakeloudApp = await getApp(JAKELOUD)
  jakeloudApp.domain = domain
  jakeloudApp.email = email
  jakeloudApp.state = 'setting up domain'
  await setApp(JAKELOUD, jakeloudApp)

  jakeloudApp.proxy().then(async () => {
    const jakeloudApp = await getApp(JAKELOUD)
    if (jakeloudApp.domain === domain) {
      await jakeloudApp.cert()
      jakeloudApp.state = 'running'
      await setApp(JAKELOUD, jakeloudApp)
    }
  })
}

setJakeloudAdditionalOp = async (req, res, body) => {
  const { additional, email } = body
  const conf = await getConf({email})
  if (!additional || !await isAuthenticated(body)) return
  const jakeloudAppIndex = conf.apps.findIndex(a => a.name === JAKELOUD)
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
  const conf = await getConf({email: body.email})
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
  res.write(JSON.stringify(conf))
}

const createAppOp = async (req, res, body) => {
  const { domain, repo, name, email, vcs } = body
  if (!await isAuthenticated(body) || !domain || !repo || !name || !email || !vcs) return
  const conf = await getConf({sudo: true})
  const takenPorts = conf.apps.map(app => app.port)
  let port = 38000
  while (takenPorts.includes(port)) port++
  const newApp = new App({ email, domain, repo, name, port, vcs })
  await setApp(name, newApp)
  fullReloadApp(name, body.email)
}

const deleteAppOp = async (req, res, body) => {
}

const api = async (req, res, body) => {
  switch (body.op) {
    case 'set-jakeloud-domain':
      await setJakeloudDomainOp(req, res, body)
      break
    case 'set-jakeloud-additional':
      await setJakeloudAdditionalOp(req, res, body)
      break
    case 'register':
      await registerOp(req, res, body)
      break
    case 'get-conf':
      await getConfOp(req, res, body)
      break
    case 'create-app':
      await createAppOp(req, res, body)
      break
    case 'delete-app':
      deleteApp(req, res, body)
      break
    case 'update-jakeloud':
      if (!await isAuthenticated(body)) return
      updateJakeloud()
      break
    default:
      res.write('{"message":"noop"}')
  }
}

module.exports = { api }
