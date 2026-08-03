async function resolveFile (req) {
  const { camelCase } = this.app.lib._
  const { fastGlob } = this.app.lib
  const id = camelCase(req.params.id)
  let type = ''
  let files
  if (req.query.type) type = `-${req.query.type}`
  if (id !== 'main') {
    const plugin = this.app.getPlugin(id)
    files = await fastGlob(`${plugin.dir.pkg}/asset/logo${type}.*`)
    if (files.length > 0) return files[0]
    throw this.error('_notFound')
  }
  // 1. main
  files = await fastGlob(`${this.app.main.dir.pkg}/asset/logo${type}.*`)
  // 2. site attachment
  if (files.length > 0) return files[0]
  let dir = this.app.getPluginDataDir('dobo')
  files = await fastGlob(`${dir}/attachment/SumbaSite/${req.site.id}/file/logo${type}.*`)
  if (files.length > 0) return files[0]
  // 3. theme
  const theme = this.app.waibuMpa.themes.find(item => item.name === req.theme)
  files = await fastGlob(`${theme.plugin.dir.pkg}/asset/${theme.name}/logo${type}.*`)
  if (files.length === 0) files = await fastGlob(`${theme.plugin.dir.pkg}/asset/_common/logo${type}.*`)
  if (files.length > 0) return files[0]
  // 4. default
  dir = this.app.waibu.dir.pkg
  files = await fastGlob(`${dir}/asset/logo${type}.*`)
  if (files.length > 0) return files[0]
  throw this.error('_notFound')
}

async function logo (req, reply) {
  const { importModule } = this.app.bajo
  const { download } = await importModule('waibu:/lib/helper.js', { asDefaultImport: false })
  return await download.call(this, resolveFile, req, reply)
}

export default logo
