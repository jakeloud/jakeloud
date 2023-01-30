const http = require('http')
const url = require('url')
const path = require('path')
const { readFileSync } = require('fs')

const { App, getApp, setApp, JAKELOUD, getConf, setConf } = require('./entities.js')
const { postRoutes } = require('./api.js')

const fileCache = {}
const server = http.createServer(async (req, res) => {
  const pathname = url.parse(req.url).pathname
  if (req.method === 'GET') {
    const file = pathname === '/' ? 'index.html' : `.${pathname}`
    if (!fileCache[file]) {
      try {
        fileCache[file] = readFileSync(path.resolve('/etc/jakeloud/jakeloud/static', file), 'utf8')
      } catch (e) {}
    }
    res.write(fileCache[file] || '404 Not Found')
  } else if (req.method === 'POST') {
    try {
      let body = ''
      await new Promise((resolve, reject) => {
        req.on('data', data => {
          body += data
          if (body.length > 1024) {
            req.connection.destroy()
            reject()
          }
        })
        req.on('end', async () => {
          let parsedBody
          try {
            parsedBody = JSON.parse(body)
          } catch(e) {
            parsedBody = {}
          }
          try {
            await postRoutes[pathname](req, res, parsedBody)
            resolve()
          } catch(e) {
            console.log(e)
            reject()
          }
        })
      })
    } catch(e) {}
  }
  res.end()
})

getApp(JAKELOUD).then(jakeloudApp =>
  server.listen(jakeloudApp.port, async () => {
    jakeloudApp.port = server.address().port
    await setApp(JAKELOUD, jakeloudApp)
    await jakeloudApp.proxy()
    if (jakeloudApp.domain) {
      await jakeloudApp.cert()
    }
  })
)
