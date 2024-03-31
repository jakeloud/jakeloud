const {
  getApp, getConf, isAuthenticated
} = require('../entities.js')

const deleteApp = async ({name, email, password}) => {
  const app = await getApp(name)
  if (!await isAuthenticated({email, password}) || !name || !app) return
  await app.stop()

  let conf = await getConf()
  const isRepoUsedElsewhere = conf.apps.filter(a => a.repo === app.repo).length > 1
  await app.remove(!isRepoUsedElsewhere)
}

module.exports = deleteApp
