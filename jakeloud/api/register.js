const {
  getApp, JAKELOUD, getConf, setUser
} = require('../entities.js')

const register = async ({ password, email }) => {
  const conf = await getConf()
  const jakeloudApp = await getApp(JAKELOUD)
  if (!(jakeloudApp.additional.allowRegister || !conf.users.length) || !email || !password) return
  setUser(email, password)
}

module.exports = register
