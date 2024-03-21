const setJakeloudDomainOp = require('./api/setJakeloudDomain.js')
const setJakeloudAdditionalOp = require('./api/setJakeloudAdditional.js')
const registerOp = require('./api/register.js')
const getConfOp = require('./api/getConf.js')
const createAppOp = require('./api/createApp.js')
const deleteAppOp = require('./api/deleteApp.js')

const ops = {
  setJakeloudDomainOp,
  setJakeloudAdditionalOp,
  registerOp,
  getConfOp,
  createAppOp,
  deleteAppOp,
}

const api = async (req, res, body) => {
  const op = ops[body.op]
  if (!op) {
    res.write('{"message":"noop"}')
  } else {
    const result = await op(body)
    if (result) {
      res.write(JSON.stringify(result))
    }
  }
}

module.exports = { api }
