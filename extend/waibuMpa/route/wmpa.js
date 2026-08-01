const wmpa = {
  url: '/wmpa.js',
  method: 'GET',
  noCacheReq: true,
  noMenu: true,
  handler: async function (req, reply) {
    const { get, trim } = this.app.lib._
    const { getPluginPrefix } = this.app.waibu
    const { importModule } = this.app.bajo
    const { formatterFieldMap, formatter } = await importModule('bajo:/lib/helper.js', { asDefaultImport: false })
    const prefix = {
      virtual: `/${getPluginPrefix('waibuStatic')}/${this.app.waibu.config.prefixVirtual}`,
      asset: `/${getPluginPrefix('waibuStatic')}`,
      main: `/${getPluginPrefix('main')}`
    }
    const mpaPrefix = get(this, 'app.waibuMpa.config.waibu.prefix')
    const renderUrl = '/' + trim(`/${mpaPrefix}/component/render`, '/')
    let accessTokenUrl = ''
    let api = {}
    if (this.app.sumba) {
      const sumbaPrefix = get(this, 'app.sumba.config.waibu.prefix')
      accessTokenUrl = '/' + trim(`/${mpaPrefix}/${sumbaPrefix}/access-token`, '/')
      api = {
        prefix: this.app.waibuRestApi ? this.app.waibuRestApi.config.waibu.prefix : '',
        ext: this.app.waibuRestApi ? (this.app.waibuRestApi.config.format.asExt ? '.json' : '') : '',
        headerKey: this.app.waibuRestApi ? this.app.sumba._getAuthSetting('jwt', 'waibuRestApi').headerKey : '',
        dataKey: this.app.waibuRestApi ? this.app.waibuRestApi.config.responseKey.data : '',
        rateLimitDelay: 2000,
        rateLimitRetry: 2
      }
    }
    const formatOpts = {
      datetime: get(req, 'site.setting.bajo.intl.datetime', this.app.bajo.config.intl.datetime),
      date: get(req, 'site.setting.bajo.intl.date', this.app.bajo.config.intl.date),
      time: get(req, 'site.setting.bajo.intl.time', this.app.bajo.config.intl.time),
      timeZone: get(req, 'site.setting.bajo.intl.timeZone', this.app.bajo.config.intl.timeZone),
      integer: get(req, 'site.setting.bajo.intl.integer', this.app.bajo.config.intl.integer),
      smallint: get(req, 'site.setting.bajo.intl.smallint', this.app.bajo.config.intl.smallint),
      float: get(req, 'site.setting.bajo.intl.float', this.app.bajo.config.intl.float),
      double: get(req, 'site.setting.bajo.intl.double', this.app.bajo.config.intl.double)
    }
    const params = { prefix, accessTokenUrl, renderUrl, api, formatOpts, formatterFieldMap, formatter }
    return await reply.view('waibuMpa.template:/wmpa.js', params)
  }
}

export default wmpa
