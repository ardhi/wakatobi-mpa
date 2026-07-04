import { EventEmitter } from 'events'
import util from 'util'

function Store (plugin, options = {}) {
  this.plugin = plugin
  this.app = plugin.app
  this.model = 'WmpaSession'
  EventEmitter.call(this)
}

util.inherits(Store, EventEmitter)
const opts = { noHook: true, noCache: true, noValidation: true, dataOnly: true, throwNotFound: false }

Store.prototype.set = function (sessionId, session, callback) {
  const { log } = this.app.waibuMpa
  const mdl = this.app.dobo.getModel(this.model)
  const sess = JSON.stringify(session)
  mdl.getRecord(sessionId, opts)
    .then(item => {
      if (!item) return mdl.createRecord({ id: sessionId, session: sess }, opts)
      return mdl.updateRecord(sessionId, { session: sess }, opts)
    })
    .then(item => {
      callback()
    })
    .catch(err => {
      log.error('sessErr%s%s', 'SET', err.message)
      callback()
    })
}

Store.prototype.get = function (sessionId, callback) {
  const { log } = this.app.waibuMpa
  const mdl = this.app.dobo.getModel(this.model)
  mdl.getRecord(sessionId, opts)
    .then(item => {
      callback(null, item.session)
    })
    .catch(err => {
      log.error('sessErr%s%s', 'GET', err.message)
      callback()
    })
}

Store.prototype.destroy = function (sessionId, callback) {
  const { log } = this.app.waibuMpa
  const mdl = this.app.dobo.getModel(this.model)
  mdl.removeRecord(sessionId, opts)
    .then(item => {
      callback()
    })
    .catch(err => {
      log.error('sessErr%s%s', 'DESTROY', err.message)
      callback()
    })
}

// TODO: clear expired sessions
Store.prototype.clearExpired = function (callback) {
}

export default Store
