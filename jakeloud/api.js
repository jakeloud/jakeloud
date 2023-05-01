const {
  App, getApp, JAKELOUD, getConf, setConf, setUser, isAuthenticated, updateJakeloud,
} = require('./entities.js')

const deleteAppOp = async (req, res, body) => {
  const { name, email } = body
  const app = await getApp(name)
  if (!await isAuthenticated(body) || !name || !app || !app.email === email) return
  await app.stop()

  let conf = await getConf({email})
  const isRepoUsedElsewhere = conf.apps.filter(a => a.repo === app.repo).length > 1
  await app.remove(!isRepoUsedElsewhere)

  conf = await getConf({email})
  conf.apps = conf.apps.filter(a => a.name !== name)
  await setConf(conf)
}

const setJakeloudDomainOp = async (req, res, body) => {
  const { email, domain } = body
  const conf = await getConf({email})
  if (!email || !domain || (conf.users.length && !await isAuthenticated(body))) return

  let jakeloudApp = await getApp(JAKELOUD)
  jakeloudApp.domain = domain
  jakeloudApp.email = email
  jakeloudApp.state = 'setting up domain'
  await jakeloudApp.save()
  await jakeloudApp.proxy()
  jakeloudApp = await getApp(JAKELOUD)
  if (jakeloudApp.domain === domain) {
    await jakeloudApp.cert()
  }
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
  const app = new App({ email, domain, repo, name, port, vcs })
  await app.save()
  // run pipeline
  await app.clone()
  await app.build()
  await app.proxy()
  await app.start()
  await app.cert()
}

const updateJakeloudOp = async (req, res, body) => {
  if (!await isAuthenticated(body)) return
  updateJakeloud()
}

const ops = {
  'set-jakeloud-domain': setJakeloudDomainOp,
  'set-jakeloud-additional': setJakeloudAdditionalOp,
  'register': registerOp,
  'get-conf': getConfOp,
  'create-app': createAppOp,
  'delete-app': deleteAppOp,
  'update-jakeloud': updateJakeloudOp,
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
