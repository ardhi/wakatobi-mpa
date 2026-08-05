import path from 'path'
import iconsetFactory from './class/iconset.js'
import viewEngineFactory from './class/view-engine.js'
import themeFactory from './class/theme.js'
import componentFactory from './class/component.js'

const omitted = ['css', 'style', 'links', 'scripts', 'ns', 'appTitle', 'title', 'fullTitle']
const names = ['description', 'keywords', 'robots', 'viewport', 'author', 'publisher',
  'application-name', 'generator', 'referrer', 'theme-color', 'googlebot'
]

/**
 * @module Helper
 */

/**
 * Print a link element
 *
 * @memberof module:Helper
 * @param {Object} link - Link object
 * @returns {string} - HTML string for the link element
 */
export function printLink (link) {
  const { routePath } = this.app.waibu
  link.rel = link.rel ?? 'stylesheet'
  link.type = link.type ?? 'text/css'
  link.href = routePath(link.href)
  const attrs = this.stringifyAttribs(link)
  return `<link ${attrs} />`
}

/**
 * Print a script element
 *
 * @memberof module:Helper
 * @param {Object} script - Script object
 * @returns {string} - HTML string for the script element
 */
export function printScript (script) {
  const { routePath } = this.app.waibu
  const { stringifyAttribs } = this.app.waibuMpa
  script.src = routePath(script.src)
  const result = `<script ${stringifyAttribs(script)}></script>`
  return result
}

/**
 * Collect regular resources (css, scripts, links) from theme/iconset, frontmatter, and options
 *
 * @memberof module:Helper
 * @async
 * @param {string} type - Type of resource ('css', 'scripts', 'links')
 * @param {Function} transformer - Function to transform each resource item
 * @param {Object} [options={}] - Additional options for resource collection
 * @returns {Promise<Array>} - Array of collected and transformed resource items
 */
async function collectRegular (type, transformer, options = {}) {
  const { runHook } = this.app.bajo
  const { map, get, set, isString, camelCase, uniq } = this.app.lib._
  const { arrangeArray } = this.app.lib.aneka
  const { req } = options

  let items = []
  // find in theme/iconset
  for (const item of ['theme', 'iconset']) {
    if (this.config[item] && this.config[item].autoInsert[type]) {
      const rsc = get(options, `${item}.${type}`, [])
      const opts = { items, req }
      opts[type] = rsc
      await runHook(`${this.ns}.${item}:${camelCase(`before inject ${type}`)}`, opts)
      if (rsc) items.push(...rsc)
      await runHook(`${this.ns}.${item}:${camelCase(`after inject ${type}`)}`, opts)
    }
  }
  // find in frontmatter
  let fm = get(options, `locals.page.${type}`, [])
  if (isString(fm)) fm = [fm]
  items.push(...fm)
  // find in options
  items.push(...options[type])
  const key = type === 'scripts' ? 'src' : 'href'
  items = items.map(item => {
    if (isString(item)) return set({}, key, item)
    return item
  })
  // arrange
  let tmp = items.map(item => item[key])
  tmp = arrangeArray(tmp)
  const newItems = []
  for (const t of tmp) {
    const item = items.find(i => i[key].endsWith(t))
    item[key] = t
    newItems.push(item)
  }
  return uniq(map(newItems, i => transformer.call(this, i)))
}

/**
 * Collect inline resources (css, scripts) from theme/iconset and options
 *
 * @memberof module:Helper
 * @async
 * @param {string} type - Type of resource ('inlineCss', 'inlineScript')
 * @param {Object} [options={}] - Additional options for resource collection
 * @returns {Promise<Array>} - Array of collected inline resources
 */
async function collectInline (type, options = {}) {
  const { runHook } = this.app.bajo
  const { isEmpty, get, camelCase, uniq, trim } = this.app.lib._
  const { $, req } = options
  const items = []
  for (const item of ['theme', 'iconset']) {
    if (this.config[item] && this.config[item].autoInsert[type]) {
      const rsc = get(options, `${item}.${camelCase(type)}`)
      const opts = { items, req }
      opts[type] = rsc
      await runHook(`${this.ns}.${item}:${camelCase(`before inject ${type}`)}`, opts)
      if (rsc) items.push(rsc)
      await runHook(`${this.ns}.${item}:${camelCase(`after inject ${type}`)}`, opts)
    }
  }
  // find in options
  if (!isEmpty(options[type])) items.push(...options[type])
  $(type === 'inlineCss' ? 'style' : 'script').each(function () {
    const item = trim($(this).html())
    if (!isEmpty(item)) {
      items.push(item)
      $(this).remove()
    }
  })
  return uniq(items)
}

/**
 * Inject scripts into the page
 *
 * @memberof module:Helper
 * @async
 * @param {Object} [options={}] - Options for script injection
 * @param {Object} [options.$] - Cheerio instance for DOM manipulation
 * @param {Object} [options.cmp] - Component instance
 * @param {Object} [options.locals] - Local variables for rendering
 */
async function injectScript (options = {}) {
  const { $, cmp, locals } = options
  const { render } = this.app.bajoTemplate
  const parent = this.config.page.scriptsAtEndOfBody ? 'body' : 'head'
  const regular = await collectRegular.call(this, 'scripts', printScript, options)
  const dirRoute = this.app.waibuMpa.config.asset.dirRoute
  if (dirRoute) regular.push(printScript.call(this, { src: `${dirRoute}/app.js` }))
  if (regular.length > 0) $(parent).append(regular.join('\n'))
  const inline = await collectInline.call(this, 'inlineScript', options)
  if (inline.length > 0) cmp.scriptBlock.root.push(...inline)
  const script = await render(locals.page.scriptBlock, { block: cmp.scriptBlock }, { default: 'bajoTemplate.partial:/script-block.html' })
  $(parent).append(script)
}

/**
 * Inject meta tags into the page
 *
 * @memberof module:Helper
 * @async
 * @param {Object} [options={}] - Options for meta injection
 * @param {Object} [options.$] - Cheerio instance for DOM-like manipulation
 * @param {Object} [options.theme] - Theme instance
 * @param {Object} [options.req] - Request object
 * @param {Object} [options.locals] - Local variables for rendering
 */
async function injectMeta (options = {}) {
  const { runHook } = this.app.bajo
  const { map, uniq, isArray, keys, omit, get, isFunction } = this.app.lib._
  const { sprintf } = this.app.lib
  const { $, theme, req, locals } = options
  const { page = {} } = locals
  let items = [{
    tag: 'meta',
    name: 'req-id',
    content: req.id
  }]
  const refreshDur = get(req, 'routeOptions.config.refreshDur', get(this, 'config.page.refreshDur', 0))
  if (refreshDur > 0) {
    items.push({
      tag: 'meta',
      httpEquiv: 'Refresh',
      content: Math.floor(refreshDur / 60) + ''
    })
  }
  // meta
  for (const attr of keys(omit(locals.page, [...omitted]))) {
    if (!page[attr]) continue
    if (!names.includes(attr)) continue
    items.push({
      name: attr,
      content: isArray(page[attr]) ? page[attr].join(', ') : page[attr]
    })
  }
  if (this.config.theme && this.config.theme.autoInsert.meta) {
    await runHook(`${this.ns}.${theme.name}:beforeInjectMeta`, { meta: theme.meta, items, req })
    items.push(...(theme.meta ?? []))
    await runHook(`${this.ns}.${theme.name}:afterInjectMeta`, { meta: theme.meta, items, req })
  }
  // title
  const format = get(this, 'app.waibuMpa.pageTitleFormat', '%s : %s')
  const title = page.fullTitle ?? page.title
  let pageTitle
  if (isFunction(format)) pageTitle = await format.call(this, locals)
  else pageTitle = sprintf(format, title, this.app.waibuMpa.getAppTitle(req))
  $('head').append(`<title>${pageTitle}</title>`)
  items.push({ tag: 'link', href: '/favicon.png', rel: 'icon', type: 'image/png' })
  // meta
  items = map(items, m => {
    const tag = m.tag ?? 'meta'
    delete m.tag
    const attrs = this.stringifyAttribs(m)
    return `<${tag} ${attrs} />`
  })
  $('head').append(uniq(items).join('\n'))
}

/**
 * Inject CSS into the page
 *
 * @memberof module:Helper
 * @async
 * @param {Object} [options={}] - Options for CSS injection
 * @param {Object} [options.$] - Cheerio instance for DOM-like manipulation
 */
async function injectCss (options = {}) {
  const { $ } = options
  const regular = await collectRegular.call(this, 'css', printLink, options)
  const dirRoute = this.app.waibuMpa.config.asset.dirRoute
  if (dirRoute) regular.push(printLink.call(this, { href: `${dirRoute}/app.css` }))
  if (regular.length > 0) $('head').append(regular.join('\n'))
  const inline = await collectInline.call(this, 'inlineCss', options)
  if (inline.length > 0) $('head').append(`<style>\n${inline.join('\n')}\n</style>`)
}

/**
 * Inject link elements into the page
 *
 * @memberof module:Helper
 * @async
 * @param {Object} [options={}] - Options for link injection
 * @param {Object} [options.$] - Cheerio instance for DOM-like manipulation
 */
async function injectLink (options = {}) {
  const { $ } = options
  const regular = await collectRegular.call(this, 'links', printLink, options)
  if (regular.length > 0) $('head').append(regular.join('\n'))
}

/**
 * Inject elements into the page
 *
 * @memberof module:Helper
 * @async
 * @param {Object} [options={}] - Options for element injection
 * @param {Object} [options.$] - Cheerio instance for DOM-like manipulation
 * @param {Object} [options.req] - Request object
 * @param {Object} [options.cmp] - Component instance
 * @param {Object} [options.reply] - Reply object
 */
export async function injectElements (options = {}) {
  const { $, req, cmp, reply } = options
  const { isClass } = this.app.lib.aneka
  const { runHook } = this.app.bajo
  const { get, isString, isFunction, isEmpty } = this.app.lib._
  $('html').attr('lang', req.lang)
  if (req.darkMode) $('body').attr('data-bs-theme', 'dark')
  const rsc = {}
  for (const tag of reply.ctags ?? []) {
    let Builder = get(cmp, `widget.${tag}`)
    if (!isFunction(Builder)) continue
    if (!isClass(Builder)) Builder = await Builder.call(cmp)
    for (const key of ['links', 'scripts', 'css']) {
      let item = Builder[key] ?? []
      if (isString(item)) item = [item]
      if (isFunction(item)) item = await item.call(cmp, Builder)
      if (item.length > 0) {
        rsc[key] = rsc[key] ?? []
        rsc[key].push(...item)
      }
    }
    for (const key of ['inlineScript', 'inlineCss']) {
      let item = Builder[key] ?? ''
      if (isFunction(item)) item = await item.call(cmp, Builder)
      if (!isEmpty(item)) {
        rsc[key] = rsc[key] ?? []
        rsc[key].push(item)
      }
    }
  }
  for (const key of ['links', 'scripts', 'css']) {
    options[key] = rsc[key] ?? []
  }
  options.inlineScript = rsc.inlineScript
  options.inlineCss = rsc.inlineCss
  await runHook(`${this.ns}.injectElement:beforeBuildPage`, options)
  await injectMeta.call(this, options)
  await injectLink.call(this, options)
  await injectCss.call(this, options)
  await injectScript.call(this, options)
}

/**
 * Add an item to the container
 *
 * @memberof module:Helper
 * @async
 * @param {Object} [options={}] - Options for adding an item
 * @param {string} [options.file] - File path of the item
 * @param {Object} [options.container] - Container to store the item
 * @param {string} [options.prefix] - Prefix for the item key
 */
async function addItem ({ file, container, prefix = '' } = {}) {
  const { importModule } = this.app.bajo
  const { camelCase } = this.app.lib._
  const baseName = path.basename(file, path.extname(file))
  const key = camelCase(`${prefix} ${baseName}`)
  const mod = await importModule(file)
  container[key] = mod
}

/**
 * Load items into the theme
 *
 * @memberof module:Helper
 * @async
 * @param {string} type - Type of items to load
 * @param {Object} theme - Theme object to load items into
 */
async function loadItems (type, theme) {
  const { eachPlugins } = this.app.bajo
  const { fastGlob } = this.app.lib
  const me = this

  const container = {}
  // main
  const files = await fastGlob(`${this.dir.pkg}/extend/waibuMpa/theme/component/${type}/*.js`)
  for (const file of files) {
    await addItem.call(this, { file, container })
  }
  // extender
  await eachPlugins(async function ({ file }) {
    await addItem.call(me, { file, container, prefix: this.alias })
  }, { glob: `theme/component/${type}/*.js`, prefix: this.ns })
  theme[type] = container
}

/**
 * Build a theme
 *
 * @memberof module:Helper
 * @async
 * @param {Object} mod - Module object
 * @param {Object} fw - Framework object
 */
async function buildTheme (mod, fw) {
  const { runHook } = this.app.bajo
  const { omit, merge, find } = this.app.lib._
  const me = this

  await runHook(`${this.ns}.${mod.name}:beforeCollectTheme`, mod, fw)
  const Theme = await themeFactory.call(this)
  const theme = new Theme(this, mod.name)
  Object.assign(theme, omit(mod, ['ns']))
  await loadItems.call(mod.plugin, 'widget', theme)
  await loadItems.call(mod.plugin, 'method', theme)
  theme.createComponent = async function ({ $, iconset, req, reply, locals, scriptBlock, styleBlock }) {
    const Cls = await componentFactory.call(me)
    const cmp = new Cls({ plugin: fw ? fw.plugin : mod.plugin, $, theme, iconset, req, reply, locals, scriptBlock, styleBlock })
    await cmp.loadBaseWidgets()
    const framework = theme.framework ? find(me.themes, { name: theme.framework }) : undefined
    merge(cmp.widget, framework ? framework.widget : {}, theme.widget)
    Object.assign(cmp, merge({}, framework ? framework.method : {}, theme.method))
    return cmp
  }
  this.themes.push(theme)
  this.log.trace('- %s@%s', theme.name, mod.name)
  await runHook(`${this.ns}.${mod.name}:afterCollectTheme`, theme)
}

/**
 * Collect themes
 *
 * @memberof module:Helper
 * @async
 * @returns {Promise<void>}
 */
export async function collectThemes () {
  const { eachPlugins, importModule } = this.app.bajo
  const { isFunction, isArray, find, without } = this.app.lib._

  this.themes = []
  if (this.config.theme === false) {
    this.log.warn('supportDisabled%s', this.t('Theme'))
    return
  }
  this.log.debug('collect%s', this.t('themes'))
  const modso = []
  const modsf = []
  const me = this
  await eachPlugins(async function ({ file }) {
    const plugin = this
    let mod = await importModule(file)
    if (isFunction(mod)) mod = await mod.call(this, me.webAppCtx)
    if (!isArray(mod)) mod = [mod]
    mod = mod.map(m => Object.assign(m, { plugin }))
    for (const m of mod) {
      m.meta = m.meta ?? []
      if (!isArray(m.meta)) m.meta = [m.meta]
      m.metaExcludes = m.metaExcludes ?? []
      if (!isArray(m.metaExcludes)) m.metaExcludes = [m.metaExcludes]
      for (const key of ['css', 'links', 'scripts', 'cssExcludes', 'linksExcludes', 'scriptsExcludes']) {
        m[key] = await me._loadResource.call(this, m, key)
      }
      m.component = {}
      if (m.framework) modsf.push(m) // module needs framework
      else modso.push(m) // independent module
    }
  }, { glob: 'theme.js', prefix: this.ns })
  for (const mod of modso) {
    await buildTheme.call(this, mod)
  }
  for (const mod of modsf) {
    const fw = find(modso, { name: mod.framework })
    if (!fw) throw this.error('cantFindThemeFramework%s', mod.framework)
    for (const key of ['meta', 'css', 'links', 'scripts']) {
      mod[key].push(...without(fw[key], ...mod[`${key}Excludes`]))
    }
    mod.moveToEnd = fw.moveToEnd
    await buildTheme.call(this, mod, fw)
  }
}

/**
 * Collect view engines
 *
 * @memberof module:Helper
 * @async
 * @returns {Promise<void>}
 */
export async function collectViewEngines () {
  const { eachPlugins, importModule, join, runHook } = this.app.bajo
  const { isFunction, omit, isArray } = this.app.lib._
  this.viewEngines = []
  this.log.debug('collect%s', 'view engines')
  const me = this
  await eachPlugins(async function ({ file }) {
    const { ns } = this
    let mod = await importModule(file)
    if (isFunction(mod)) mod = await mod.call(this, me.webAppCtx)
    if (!isArray(mod)) mod = [mod]
    for (const m of mod) {
      await runHook(`${me.ns}.${mod.name}:beforeCollectViewEngine`, m)
      const Cls = await viewEngineFactory.call(me)
      const ve = new Cls(this, m.name, m.fileExts)
      Object.assign(ve, omit(m, ['name', 'fileExts']))
      me.viewEngines.push(ve)
      me.log.trace('- %s@%s (%s)', ve.name, ns, join(ve.fileExts))
      await runHook(`${me.ns}.${mod.name}:afterCollectViewEngine`, ve)
    }
  }, { glob: 'view-engine.js', prefix: this.ns })
}

/**
 * Collect iconsets
 *
 * @memberof module:Helper
 * @async
 * @returns {Promise<void>}
 */
export async function collectIconsets () {
  const { eachPlugins, importModule, runHook } = this.app.bajo
  const { omit, isFunction, isArray, pullAt, findIndex, cloneDeep } = this.app.lib._

  this.iconsets = []
  if (this.config.iconset === false) {
    this.log.warn('supportDisabled%s', this.t('Iconset'))
    return
  }
  this.log.debug('collect%s', this.t('iconsets'))
  const me = this
  const all = []
  await eachPlugins(async function ({ file }) {
    const { ns } = this
    let mod = await importModule(file)
    if (isFunction(mod)) mod = await mod.call(this, me.webAppCtx)
    if (!isArray(mod)) mod = [mod]
    for (const m of mod) {
      for (const key of ['css', 'links', 'scripts']) {
        m[key] = await me._loadResource(m, key)
      }
      m.ns = ns
      all.push(m)
    }
  }, { glob: 'iconset.js', prefix: this.ns })
  const defIdx = findIndex(all, { name: this.config.iconset.default })
  if (defIdx > -1) {
    const def = cloneDeep(all[defIdx])
    pullAt(all, defIdx)
    all.unshift(def)
  }
  for (const a of all) {
    await runHook(`${this.ns}.${a.ns}:beforeCollectIconset`, a)
    const Cls = await iconsetFactory.call(this)
    const iconset = new Cls(this.app[a.ns], omit(a, ['ns']))
    this.iconsets.push(iconset)
    this.log.trace('- %s@%s', iconset.name, iconset.plugin.ns)
    await runHook(`${this.ns}.${a.ns}:afterCollectIconset`, iconset)
  }
}
