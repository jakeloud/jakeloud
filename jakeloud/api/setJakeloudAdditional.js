const {
  getApp, JAKELOUD, isAuthenticated
} = require('../entities.js')

const setJakeloudAdditional = async ({ additional, email, password }) => {
  if (!additional || !await isAuthenticated({ email, password })) return
  let jakeloudApp = await getApp(JAKELOUD)
  if (email !== jakeloudApp.email) return
  jakeloudApp.additional = additional
  await jakeloudApp.save()
}

module.exports = setJakeloudAdditional
