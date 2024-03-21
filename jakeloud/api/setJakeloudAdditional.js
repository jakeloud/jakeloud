const {
  getApp, JAKELOUD, isAuthenticated
} = require('../entities.js')

const setJakeloudAdditional = async (body) => {
  const { additional, email } = body
  if (!additional || !await isAuthenticated(body)) return
  let jakeloudApp = await getApp(JAKELOUD)
  if (email !== jakeloudApp.email) return
  jakeloudApp.additional = additional
  await jakeloudApp.save()
}

module.exports = setJakeloudAdditional
