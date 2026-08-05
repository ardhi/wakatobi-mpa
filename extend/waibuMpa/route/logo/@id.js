async function resolveFile (req) {
  const { camelCase, isEmpty } = this.app.lib._
  const { fastGlob } = this.app.lib
  const id = camelCase(req.params.id)
  const type = isEmpty(req.query.type) ? '' : `-${req.query.type}`
  let files = []
  // plugins logo
  if (id !== 'main') {
    const plugin = this.app.getPlugin(id)
    files = await fastGlob(`${plugin.dir.pkg}/asset/logo${type}.*`)
    if (files.length > 0) return files[0]
    throw this.error('_notFound', { noContent: true })
  }

  // 1. site attachment
  if (this.app.dobo) {
    const dir = this.app.getPluginDataDir('dobo')
    files = await fastGlob(`${dir}/attachment/SumbaSite/${req.site.id}/file/logo${type}.*`)
  }
  // 2. main
  if (files.length === 0) {
    files = await fastGlob(`${this.app.main.dir.pkg}/asset/logo${type}.*`)
  }
  // 3. theme
  if (files.length === 0) {
    const theme = this.app.waibuMpa.themes.find(item => item.name === req.theme)
    if (theme) {
      files = await fastGlob(`${theme.plugin.dir.pkg}/asset/${theme.name}/logo${type}.*`)
      if (files.length === 0) files = await fastGlob(`${theme.plugin.dir.pkg}/asset/_common/logo${type}.*`)
    }
  }
  // 4. default
  if (files.length === 0) {
    const dir = this.app.waibu.dir.pkg
    files = await fastGlob(`${dir}/asset/logo${type}.*`)
  }
  if (files.length > 0) return files[0]
  throw this.error('_notFound', { noContent: true })
}

async function logo (req, reply) {
  const { importModule } = this.app.bajo
  const { download } = await importModule('waibu:/lib/helper.js', { asDefaultImport: false })
  return await download.call(this, resolveFile, req, reply)
}

export default logo
