const {
  getApp, JAKELOUD, getConf, isAuthenticated
} = require('../entities.js')

const setJakeloudDomain = async (body) => {
  const { email, domain } = body
  const conf = await getConf()
  if (!email || (conf.users.length && !await isAuthenticated(body))) return

  const jakeloudApp = await getApp(JAKELOUD)
  if (!domain) {
    domain = jakeloudApp.domain
  }

  jakeloudApp.domain = domain
  jakeloudApp.email = email
  jakeloudApp.state = 'building'
  await jakeloudApp.advance()
}

module.exports = setJakeloudDomain
