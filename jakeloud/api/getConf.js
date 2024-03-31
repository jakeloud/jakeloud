const {
  getApp, JAKELOUD, getConf, isAuthenticated
} = require('../entities.js')

const _getConf = async ({email, password}) => {
  const conf = await getConf()
  if (!conf.users.length) {
    const jakeloudApp = await getApp(JAKELOUD)
    if (!jakeloudApp.email) {
      return {message: 'domain'}
    }
    return {message: 'register'}
  }
  if (!await isAuthenticated({email, password})) {
    return {message: 'login'}
  }
  return conf
}

module.exports = _getConf
