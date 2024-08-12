const {
  getConf, isAuthenticated, clearCache,
} = require('../entities.js')
const {
  log,
} = require('../logger.js')

const clearCacheOp = async ({ email, password }) => {
  const conf = await getConf()
  if (!email || (conf.users.length && !await isAuthenticated({email, password}))) return

  const res = (await clearCache()).trim()
  const lastNewLine = res.lastIndexOf('\n')
  const lastLine = res.substring(lastNewLine === -1 ? 0 : lastNewLine + 1)
  await log(`*Clearing cache* ${lastLine.replace(/\./g, '\\.')}`)
}

module.exports = clearCacheOp
