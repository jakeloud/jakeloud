const http = require('https')
const { getApp, JAKELOUD } = require('./entities.js')

const log = async (message = 'message unspecified') => {
  const jakeloudApp = await getApp(JAKELOUD)

  const additional = jakeloudApp.additional
  if (!additional) return

  const botToken = additional.botToken
  const chatId = additional.chatId

  if (!botToken || !chatId) return


  const path = `/bot${botToken}/sendMessage?chat_id=${chatId}&text=${message}`
  const options = {
    hostname: 'api.telegram.org',
    path: encodeURI(path),
    method: 'GET',
  }

  const req = http.request(options, (res) => {})
  req.end()
}

module.exports = { log }
