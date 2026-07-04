async function checkLang (req, reply) {
  if (!req.session) return
  if (req.langDetector) {
    req.session.lang = req.lang
    return
  }
  if (req.session.lang) req.lang = req.session.lang
}

async function checkDark (req, reply) {
  const { isSet } = this.app.lib.aneka
  const key = this.config.darkMode.qsKey
  const value = this.config.darkMode.set ?? req.query[key]
  if (isSet(value)) {
    req.darkMode = value
    if (req.session) req.session.darkMode = req.darkMode
    return
  }
  if (isSet(req.session.darkMode)) req.darkMode = req.session.darkMode
}

async function hook () {
  return [{
    level: 9,
    name: 'waibuMpa:preParsing',
    handler: async function (req, reply) {
      const { importModule } = this.app.bajo
      const { attachIntl } = await importModule('waibu:/lib/webapp.js', { asDefaultImport: false })
      await attachIntl.call(this, this.config.intl.detectors, req, reply)
      await checkLang.call(this, req, reply)
      await checkDark.call(this, req, reply)
    }
  }, {
    name: 'waibuMpa.theme:afterInjectScripts',
    handler: async function ({ items }) {
      // items.push(`${this.ns}.virtual:/json2csv/json2csv.js`)
    }
  }]
}

export default hook
