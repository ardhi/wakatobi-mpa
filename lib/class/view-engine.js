async function viewEngineFactory () {
  class MpaViewEngine extends this.app.baseClass.MpaTools {
    constructor (plugin, name, fileExts = []) {
      super(plugin)
      this.name = name
      this.fileExts = typeof fileExts === 'string' ? [fileExts] : fileExts
      this.history = {}
    }

    _applySetting = (locals = {}, opts = {}) => {
      for (const key of ['theme', 'iconset']) {
        opts[key] = opts[key] ?? opts.req[key]
      }
      opts.postProcessor = this.plugin._applyFormat
      opts.groupId = opts.req.id
      opts.lang = opts.req.lang
    }

    render = async (tpl, locals = {}, opts = {}) => {
      this._applySetting(locals, opts)
      return await this.app.bajoTemplate.render(tpl, locals, opts)
    }

    renderString = async (content, locals = {}, opts = {}) => {
      locals.tpl = null
      this._applySetting(locals, opts)
      return await this.app.bajoTemplate.renderString(content, locals, opts)
    }
  }

  this.app.baseClass.MpaViewEngine = MpaViewEngine
  return MpaViewEngine
}

export default viewEngineFactory
