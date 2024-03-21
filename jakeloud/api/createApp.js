const {
  App, getConf, isAuthenticated
} = require('../entities.js')
const {
  log,
} = require('../logger.js')

const createApp = async (body) => {
  const startTime = Date.now()
  const { domain, repo, name, email } = body
  const dockerOptions = body['docker options']
  const additional = {dockerOptions}
  if (!await isAuthenticated(body) || !domain || !repo || !name || !email) return
  const conf = await getConf()
  const takenPorts = conf.apps.map(app => app.port)
  let port = 38000
  while (takenPorts.includes(port)) port++
  const app = new App({ email, domain, repo, name, port, additional })
  await app.save()
  await app.advance(true)

  const endTime = Date.now()
  const dt = Math.ceil((endTime - startTime)/1000)

  await app.loadState()
  if (app.state.startsWith('Error')) {
    await log(`*${name}* Failed to start\\. _${dt}s_`)
  } else {
    await log(`*${name}* started\\. _${dt}s_`)
  }
}

module.exports = createApp
