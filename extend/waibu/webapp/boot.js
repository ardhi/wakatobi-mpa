import { collectViewEngines, collectThemes, collectIconsets } from '../../../lib/helper.js'

const boot = {
  level: 10,
  handler: async function (prefix) {
    const { importPkg, importModule } = this.app.bajo
    const bodyParser = await importPkg('waibu:@fastify/formbody')
    const {
      routeHook, handleMultipartBody, handleCors, handleHelmet, handleCompress, handleRateLimit
    } = await importModule('waibu:/lib/webapp.js', { asDefaultImport: false })

    await this.webAppCtx.register(bodyParser)
    await handleRateLimit.call(this, this.config.rateLimit)
    await handleCors.call(this, this.config.cors)
    await handleHelmet.call(this, this.config.helmet)
    await handleCompress.call(this, this.config.compress)
    await handleMultipartBody.call(this, this.config.multipart)
    await this._decorate()
    for (const item of ['favicon.png', 'robots.txt']) {
      await this._handleAssetFile(item)
    }
    await this._handleAssetDir()
    await this._handleSession()
    await routeHook.call(this, this.ns)
    await collectViewEngines.call(this)
    await collectThemes.call(this)
    await collectIconsets.call(this)
    await this._buildRoutes(prefix)
    await this._handleSubApp()
  }
}

export default boot
