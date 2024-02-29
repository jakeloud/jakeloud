const http = require('http')
const { getApp, JAKELOUD } = require('./entities.js')

const log = async (message = 'message unspecified') => {
  const jakeloudApp = await getApp(JAKELOUD)

  const additional = jakeloudApp.additional
  if (!additional) return

  const botToken = additional.botToken
  const chatId = additional.chatId

  if (!botToken || !chatId) return

  const options = {
    hostname: 'api.telegram.org',
    path: `/bot${botToken}/sendMessage?chat_id=${chatId}&text=${message}`,
    method: 'GET',
  }

  const req = http.request(options, (res) => {})
}

module.exports = { log }
