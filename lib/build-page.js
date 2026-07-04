import path from 'path'
import { printLink, printScript, injectElements } from './helper.js'

/**
 * Print warning message in page
 *
 * @memberof module:Helper
 * @param {string} text
 * @param {string} message
 * @param {Object} [opts={}]
 * @returns {string}
 */
function alert (text, message, opts = {}) {
  if (opts.partial) throw this.error(message)
  if (!this.config.page.insertWarning) return text
  const error = `<p class="warning">${message}</p>`
  return `${text}\n${error}`
}

const reqAsset = {}

/**
 * Replace unknown component tag with div or comment
 *
 * @async
 * @memberof module:Helper
 * @param {Object} options
 * @param {Object} options.el - Cheerio element
 * @param {Object} options.cmp - Component instance
 * @param {Object} [options.opts={}] - Options
 * @returns {Promise<void>}
 */
async function replace (options = {}) {
  const { el, cmp = {}, opts = {} } = options
  const { parseAttribs, stringifyAttribs } = this.app.waibuMpa
  const { isEmpty, camelCase } = this.app.lib._

  const tag = camelCase(el.name.slice(cmp.namespace.length))
  const html = cmp.$(el).html()
  const attr = parseAttribs(el.attribs)
  attr.octag = tag
  const params = { tag, attr, html, el, opts }
  const result = await cmp.buildTag(params)
  if (result) {
    cmp.$(el).replaceWith(result)
    return
  }
  if (isEmpty(attr.class)) delete attr.class
  if (isEmpty(attr.style)) delete attr.style
  switch (this.config.theme.component.unknownTag) {
    case 'remove': cmp.$(el).remove(); break
    case 'comment': {
      const ohtml = cmp.$(el).html().replaceAll('<!-- unknown component ', '').replaceAll(' -->', '')
      let attrs = stringifyAttribs(attr)
      if (!isEmpty(attrs)) attrs = ' ' + attrs
      cmp.$(el).replaceWith(`<!-- unknown component <${el.name}${attrs}>${ohtml}</${el.name}> -->`)
      break
    }
    default: {
      const result = await cmp.render({ tag: 'div', attr, html: params.html })
      cmp.$(el).replaceWith(result)
    }
  }
}

/**
 * Replace unknown component tag with div or comment
 *
 * @async
 * @memberof module:Helper
 * @param {Object} options
 * @param {Object} options.el - Cheerio element
 * @param {Object} options.cmp - Component instance
 * @param {Object} [options.opts={}] - Options
 * @returns {Promise<void>}
 */
async function replaceTag (options = {}) {
  const { el, cmp = {}, opts = {} } = options
  const me = this
  const children = cmp.$(el).children()
  if (children.length > 0) {
    for (const child of children) {
      await replaceTag.call(this, { el: child, cmp, opts })
      if (child.name.startsWith(cmp.namespace)) {
        await replace.call(me, { el: child, cmp, opts })
      }
    }
  }
}

/**
 * Apply include directive in the page
 *
 * @memberof module:Helper
 * @param {Object} $ - Cheerio instance
 * @returns {string}
 */
function applyInclude ($) {
  const { unescape } = this.app.waibu
  const { forOwn } = this.app.lib._
  // c:include hacks
  const incs = {}
  $('div[c=include], div[c=page-start], div[c=page-end]').each(function () {
    incs[this.attribs.id] = {
      prepend: this.attribs.prepend,
      append: this.attribs.append,
      html: $(this).html()
    }
    $(this).replaceWith(this.attribs.id)
  })
  let text = $.root().html()
  forOwn(incs, (v, k) => {
    text = text.replace(k, `${unescape(v.prepend ?? '')}${v.html}${unescape(v.append ?? '')}`)
  })
  return text
}

/**
 * Parse attributes of an element and apply transformations
 *
 * @async
 * @memberof module:Helper
 * @param {Object} options
 * @param {Object} options.$ - Cheerio instance
 * @param {Object} options.el - Cheerio element
 * @param {Object} options.req - Request object
 */
async function parseAttr (options = {}) {
  const { $, el, req } = options
  const { routePath } = this.app.waibu
  const { map, isString, isEmpty } = this.app.lib._
  const { attrToArray } = this.app.waibu

  // const ns = get(req, 'routeOptions.config.ns')
  const deleted = []
  el.attribs = el.attribs ?? {}
  const parent = $(el).parent()
  for (const key in el.attribs) {
    const val = el.attribs[key]
    if (val === 'undefined') {
      deleted.push(key)
      continue
    }
    // parse urls
    if (!(parent.length > 0 && ['code', 'pre'].includes(parent[0].name)) &&
      (['href', 'src', 'action'].includes(key) || key.includes('-href')) &&
      !(val.slice(1, 3) === '%=' && val[val.length - 2] === '%')) {
      el.attribs['o' + key] = val
      try {
        let [link, params] = val.split('|')
        if (!isEmpty(params)) params = this.parseAttribs(params, { trimValue: false, delimiter: ';' })
        el.attribs[key] = routePath(link, { params })
      } catch (err) {
      }
    }
    // translate
    if (key.slice(0, 2) === 't:') {
      const value = map(attrToArray(val, '|'), (v, idx) => {
        if (idx > 0) v = req.t(v)
        return v
      })
      el.attribs[key.slice(2)] = req.t(...value)
      delete el.attribs[key]
    }
    // open modal/offcanvas etc
    if (isString(el.attribs[key])) {
      const val = el.attribs[key]
      if (key === 'open') {
        const [id, type = 'modal'] = val.split(':')
        el.attribs['data-bs-target'] = `#${id}`
        el.attribs['data-bs-toggle'] = type === 'drawer' ? 'offcanvas' : type
        el.attribs['aria-controls'] = id
        delete el.attribs[key]
      } else if (key === 'open-tab') {
        el.attribs.onclick = `window.open('${val}', '_blank')`
      } else if (key === 'open-url') {
        el.attribs.onclick = `window.location.href = '${val}'`
      } else if (key === 'open-fn') {
        let [action, ...args] = val.split(':')
        let [ns, method] = action.split('.')
        if (!method) {
          method = ns
          ns = 'window'
        }
        args = args.map(item => `'${item}'`)
        el.attribs.onclick = `${ns}['${method}'](${args.join(', ')}); document.body.click()`
      }
    }
  }
  if (deleted.length > 0) {
    for (const d of deleted) {
      delete el.attribs[d]
    }
  }
}

/**
 * Mutate attributes of an element and its children
 *
 * @async
 * @memberof module:Helper
 * @param {Object} options
 * @param {Object} options.$ - Cheerio instance
 * @param {Object} options.el - Cheerio element
 * @param {Object} options.req - Request object
 */
async function attrsMutation (options = {}) {
  const { $, el, req } = options
  const me = this
  const children = $(el).children()
  if (children.length > 0) {
    for (const child of children) {
      await attrsMutation.call(me, { $, el: child, req })
      await parseAttr.call(me, { $, el: child, req })
    }
  }
}

/**
 * Manipulate the DOM based on specific attributes and move elements as needed
 *
 * @async
 * @memberof module:Helper
 * @param {Object} options
 * @param {Object} options.$ - Cheerio instance
 * @param {Object} options.theme - Theme object
 */
async function manipulation (options = {}) {
  const { $, theme } = options
  const { isEmpty } = this.app.lib._
  const actions = ['move-to:replaceWith', 'append-to:append', 'prepend-to:prepend', 'before', 'after']
  for (const action of actions) {
    const [key, method] = action.split(':')
    $(`[${key}]`).each(function () {
      const target = this.attribs[key]
      delete this.attribs[key]
      $(`${target}`)[method ?? key]($(this))
    })
  }
  // force move all drawer, modal before </body>
  if (!isEmpty(theme.moveToEnd)) {
    $(theme.moveToEnd).each(function () {
      $('body').append(this)
    })
  }
  // force all alpine scripts to move
  const allScripts = []
  for (const item of ['initializing', 'init']) {
    const scripts = []
    $(`script[type="alpine:${item}"]`).each(function () {
      scripts.push($(this).prop('innerHTML'))
      $(this).remove()
    })
    if (scripts.length > 0) {
      scripts.unshift(`document.addEventListener("alpine:${item}", () => {`)
      scripts.push('})')
      allScripts.push(...scripts)
    }
  }
  if (allScripts.length > 0) {
    allScripts.unshift('<script>')
    allScripts.push('</script>')
    $('body').append(allScripts.join('\n'))
  }
}

/**
 * Apply concatenation of resources (CSS, JS) based on configuration and cache results
 *
 * @async
 * @memberof module:Helper
 * @param {Object} options
 * @param {Object} options.$ - Cheerio instance
 * @param {Object} options.req - Request object
 * @param {string} options.tag - HTML tag
 * @param {string} options.attr - Attribute name
 * @param {string} options.type - Resource type
 * @returns {Promise<void>}
 */
async function applyConcatRsc (options = {}) {
  const { $, req, tag, attr, type } = options
  const { includes } = this.app.lib.aneka
  const { routePath } = this.app.waibu
  const { hash, fetch } = this.app.bajoExtra
  const { isEmpty, map, without } = this.app.lib._
  const { get: getCache, set: setCache } = this.app.bajoCache ?? {}
  const prefix = this.app.bajoCache.config.exportPrefix
  const excluded = map(this.config.concatResource.excluded, item => routePath(item))
  const baseUrl = `${req.protocol}://${req.hostname}${req.port ? `:${req.port}` : ''}` // TODO: auth, if any
  const items = []
  $(`${tag}[${attr}]`).each(function () {
    items.push(this.attribs[attr])
  })
  if (items.length === 0) return
  let keys = []
  const notKeys = []
  const key = `${prefix}-waibu-mpa-concat-resource-${await hash(items)}`
  const cached = await getCache({ key })
  if (!cached) {
    const contents = []
    for (const item of items) {
      try {
        if (excluded.includes(item)) throw this.error('excludedFromRscConcat%s', item)
        let url = item
        if (!item.startsWith('http')) {
          const u = new URL(req.url, baseUrl)
          if (item[0] === '/') url = u.origin + url
          else url = u.origin + path.dirname(u.pathname) + '/' + url
        }
        const resp = await fetch(url, undefined, { rawResponse: true })
        if (!resp.ok) throw this.error('respError%s', resp.status)
        const text = await resp.text()
        if (type === 'css' && includes(['url(".', 'url(.', 'url(\'.'], text)) throw this.error('cssContainsRelPath%s', item)
        contents.push(`/* waibu resource: ${item} */`, text)
        keys.push(item)
      } catch (err) {
        notKeys.push(item)
      }
    }
    if (isEmpty(contents)) return
    $(map(keys, k => `${tag}[${attr}="${k}"]`).join(',')).remove()
    const value = { contents, notKeys, type, tag, attr }
    await setCache({ key, value, ttl: this.config.concatResource.ttlDur })
  } else {
    keys = without(items, ...cached.notKeys)
    $(map(keys, k => `${tag}[${attr}="${k}"]`).join(',')).remove()
  }
  const rsc = `bajoCache:/external/${key.slice(prefix.length + 1)}.${type}`
  if (tag === 'link') $('head').prepend(printLink.call(this, rsc))
  else if (tag === 'script') $('body').append(printScript.call(this, rsc))
}

/**
 * Concatenate resources (CSS, JS) based on configuration and cache results
 *
 * @async
 * @memberof module:Helper
 * @param {Object} options
 * @param {Object} options.$ - Cheerio instance
 * @param {Object} options.req - Request object
 * @returns {Promise<void>}
 */
async function concatResources (options = {}) {
  const { $, req } = options
  if (!(this.app.bajoExtra && this.app.bajoCache)) return
  if (this.config.concatResource.ttlDur === 0) return
  if (this.config.concatResource.css) await applyConcatRsc.call(this, { $, req, tag: 'link', attr: 'href', type: 'css' })
  if (this.config.concatResource.links) await applyConcatRsc.call(this, { $, req, tag: 'link', attr: 'href', type: 'css' })
  if (this.config.concatResource.scripts) await applyConcatRsc.call(this, { $, req, tag: 'script', attr: 'src', type: 'js' })
}

/**
 * Build the final HTML page by processing the template, applying themes, iconsets, and manipulating the DOM as needed
 *
 * @async
 * @memberof module:Helper
 * @param {Object} options
 * @param {string} options.text - HTML content
 * @param {Object} options.locals - Local variables
 * @param {Object} options.opts - Options
 * @returns {Promise<string>}
 */
async function buildPage (options = {}) {
  let { text, locals = {}, opts = {} } = options
  const { find, cloneDeep } = this.app.lib._
  const { runHook, importPkg } = this.app.bajo
  const cheerio = await importPkg('bajoExtra:cheerio')
  const { req, reply } = opts
  if (!reqAsset[req.id]) {
    reqAsset[req.id] = {
      scriptBlock: { root: [] },
      styleBlock: { root: [] }
    }
  }
  const theme = find(this.themes, { name: opts.theme })
  if (!theme) text = alert.call(this, text, req.t('unknown%s%s', req.t('theme'), req.theme), opts)
  const iconset = find(this.iconsets, { name: opts.iconset })
  if (!iconset) text = alert.call(this, text, req.t('unknown%s%s', req.t('iconset'), req.iconset), opts)
  const partial = opts.partial
  const ns = req.ns
  let $ = cheerio.load(text, this.config.cheerio.loadOptions, false)
  if (partial) $('c\\:page-start, c\\:page-end').remove()
  await runHook(`${this.ns}${partial ? '.partial' : ''}:beforeBuildPage`, { $, theme, iconset, req, reply, locals, ns, text })
  await attrsMutation.call(this, { $, el: $.root(), req })
  const cmp = await theme.createComponent({ $, iconset, req, reply, locals: cloneDeep(locals), scriptBlock: reqAsset[req.id].scriptBlock, styleBlock: reqAsset[req.id].styleBlock })
  await replaceTag.call(this, { el: $.root(), cmp, opts })
  text = applyInclude.call(this, $)
  if (!opts.partial) {
    $ = cheerio.load(text, this.config.cheerio.loadOptions, false)
    await manipulation.call(this, { $, el: $.root(), req, theme })
    await injectElements.call(this, { $, cmp, theme, iconset, req, locals, reply, opts })
    await concatResources.call(this, { $, theme, iconset, req })
    await runHook(`${this.ns}:afterBuildPage`, { $, theme, iconset, req, reply, locals, ns, text })
    text = $.root().html()
    delete reqAsset[req.id]
  }
  return text
}

export default buildPage
