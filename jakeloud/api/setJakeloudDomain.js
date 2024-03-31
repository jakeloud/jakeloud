const {
  getApp, JAKELOUD, getConf, isAuthenticated
} = require('../entities.js')

const setJakeloudDomain = async ({ email, password, domain }) => {
  const conf = await getConf()
  if (!email || (conf.users.length && !await isAuthenticated({email, password}))) return

  const jakeloudApp = await getApp(JAKELOUD)
  if (!domain) {
    domain = jakeloudApp.domain
  }

  jakeloudApp.domain = domain
  jakeloudApp.email = email

  jakeloudApp.state = 'building'
  await jakeloudApp.save()
  await jakeloudApp.proxy()
  await jakeloudApp.loadState()
  if (jakeloudApp.email) {
    jakeloudApp.state = 'starting'
    await jakeloudApp.save()
    await jakeloudApp.cert()
  }
}

module.exports = setJakeloudDomain
