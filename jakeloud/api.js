const { App, getApp, setApp, JAKELOUD, getConf, setConf, setUser, isAuthenticated, updateJakeloud } = require('./entities.js')

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

const postRoutes = {
  '/set-jakeloud-domain': async (req, res, body) => {
    const { users } = await getConf()
    const { email, domain } = body
    if (!email || !domain) return
    const isAuthed = await isAuthenticated(body)
    if (users.length && !isAuthed) return

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
  },
  '/register': async (req, res, body) => {
    const { users } = await getConf()
    const { password, email } = body
    if (users.length || !email || !password) return
    setUser(email, password)
  },
  '/get-conf': async (req, res, body) => {
    const { users, apps } = await getConf()
    const isAuthed = await isAuthenticated(body)
    if (users.length && !isAuthed) {
      res.write(JSON.stringify({message: 'login'}))
      return
    }
    if (!users.length) {
      const jakeloudApp = apps.find(app => app.name == JAKELOUD)
      if (!jakeloudApp.domain) {
        res.write(JSON.stringify({message: 'domain'}))
        return
      }
      res.write(JSON.stringify({message: 'register'}))
      return
    }
    res.write(JSON.stringify({apps, users}))
  },
  '/create-app': async (req, res, body) => {
    const isAuthed = await isAuthenticated(body)
    const { domain, repo, name, email } = body
    if (!isAuthed || !domain || !repo || !name || !email) return
    const { apps } = await getConf()
    const takenPorts = apps.map(app => app.port)
    let port = 38000
    while (takenPorts.includes(port)) port++
    const newApp = new App({ email, domain, repo, name, port })
    await setApp(name, newApp)
    res.write('ok')
    fullReloadApp(name)
  },
  '/api': async (req, res, body) => {
    const { users } = await getConf()
    switch (body.op) {
      case 'update-jakeloud':
        if (!await isAuthenticated(body)) return
        updateJakeloud()
        break
      default:
        res.write('{"message":"noop"}')
    }
  },
}

module.exports = { postRoutes }
