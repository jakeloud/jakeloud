const http = require('http')
const {
  readFile, writeFile,
} = require('node:fs/promises')
const { resolve } = require('node:path')

const JAKELOUD = 'jakeloud'
const CONF_FILE = '/etc/jakeloud/conf.json'
const getConf = async () => {
  const contents = await readFile(CONF_FILE, {encoding: 'utf8'})
  return JSON.parse(contents)
}
const setConf = (json) =>
  writeFile(CONF_FILE, JSON.stringify(json))


const server = http.createServer(handle)

const startServer = async () => {
  let conf
  let oldPort = 0

  try {
    conf = await getConf()
    oldPort = conf.filter(app => app.name == JAKELOUD).port
  } catch(e) {
    conf = [{ name: JAKELOUD }]
  }

  server.listen(oldPort, () => {
    const port = server.address().port
    // 1. update conf with current port
    const newConfig = conf.map(app => {
      if (app.name == JAKELOUD) app.port = port
      return app
    })
    setConf(newConfig)
    // 2. setup nginx for this port
    //   * if config jakeloud.conf exists - just overwrite ports there
    //   * if not - create config and set state to 'requires domain'

  })
}
startServer()
