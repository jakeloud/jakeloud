const {
  App, getApp, setApp, JAKELOUD, getConf, setConf, setUser, isAuthenticated, updateJakeloud,
} = require('./entities.js')

const fullReloadApp = async (name) => {
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

const deleteApp = async (name) => {
  const app = await getApp(name)
  await app.stop()

  const conf = await getConf()
  const isRepoUsedElsewhere = conf.apps.filter(a => a.repo === app.repo).length > 1
  await app.remove(!isRepoUsedElsewhere)

  const syncConf = await getConf()
  syncConf.apps = syncConf.apps.filter(a => a.name !== name)
  await setConf(syncConf)
}

const setJakeloudDomainOp = async (req, res, body) => {
  const conf = await getConf()
  const { email, domain } = body
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

const registerOp = async (req, res, body) => {
  const conf = await getConf()
  const { password, email } = body
  if (conf.users.length || !email || !password) return
  setUser(email, password)
}

const getConfOp = async (req, res, body) => {
  const conf = await getConf()
  if (conf.users.length && !await isAuthenticated(body)) {
    res.write(JSON.stringify({message: 'login'}))
    return
  }
  if (!conf.users.length) {
    const jakeloudApp = await getApp(JAKELOUD)
    if (!jakeloudApp.domain) {
      res.write(JSON.stringify({message: 'domain'}))
      return
    }
    res.write(JSON.stringify({message: 'register'}))
    return
  }
  res.write(JSON.stringify(conf))
}

const createAppOp = async (req, res, body) => {
  const { domain, repo, name, email, vcs } = body
  if (!await isAuthenticated(body) || !domain || !repo || !name || !email || !vcs) return
  const conf = await getConf()
  const takenPorts = conf.apps.map(app => app.port)
  let port = 38000
  while (takenPorts.includes(port)) port++
  const newApp = new App({ email, domain, repo, name, port, vcs })
  await setApp(name, newApp)
  fullReloadApp(name)
}

const deleteAppOp = async (req, res, body) => {
}

const api = async (req, res, body) => {
  switch (body.op) {
    case 'set-jakeloud-domain':
      await setJakeloudDomainOp(req, res, body)
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
      const { name } = body
      if (!await isAuthenticated(body) |!name) return
      deleteApp(name)
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
