import { stripHtml } from 'string-strip-html'
import iconsetMappings from './lib/iconset-mappings.js'
import toolsFactory from './lib/class/tools.js'
import widgetFactory from './lib/class/widget.js'
import Store from './lib/class/store.js'
import { config, configDev, configProd } from './lib/config.js'
import path from 'path'
import { minify } from 'html-minifier-terser'
import * as prettier from 'prettier'
import * as emoji from 'node-emoji'
import buildPage from './lib/build-page.js'

// taken from: https://stackoverflow.com/questions/52928550/js-get-list-of-all-available-standard-html-tags
const tags = 'a,abbr,address,area,article,aside,audio,b,base,bdi,bdo,blockquote,body,br,button,canvas,caption,cite,code,col,colgroup,data,datalist,dd,del,details,dfn,dialog,div,dl,dt,em,embed,fieldset,figcaption,figure,footer,form,h1,h2,h3,h4,h5,h6,head,header,hgroup,hr,html,i,iframe,img,input,ins,kbd,label,legend,li,link,main,map,mark,menu,meta,meter,nav,noscript,object,ol,optgroup,option,output,p,param,picture,pre,progress,q,rp,rt,ruby,s,samp,script,section,select,slot,small,source,span,strong,style,sub,summary,sup,table,tbody,td,template,textarea,tfoot,th,thead,time,title,tr,track,u,ul,var,video,wbr'

/**
 * Plugin factory
 *
 * @param {string} pkgName - NPM package name
 * @returns {WaibuMpa} - WaibuMpa class
 */
async function factory (pkgName) {
  const me = this
  const {
    trim, forOwn, omit, isEmpty, get, isString, filter, kebabCase, camelCase,
    map, last, without, isPlainObject, isFunction, isArray, cloneDeep,
    trimEnd, pick, groupBy, isNumber, isBoolean, isUndefined, isSymbol,
    isNull, isDate
  } = this.app.lib._
  const { dayjs, outmatch, parseObject, fs, fastGlob } = this.app.lib
  const { defaultsDeep, isSet, titleize } = this.app.lib.aneka
  const {
    breakNsPath, importPkg, importModule, readConfig, runHook, eachPlugins
  } = this.app.bajo

  /**
   * WaibuMpa class definition.
   *
   * **Never** call this function directly!!! It's only-meant to be called by the {@link https://ardhi.github.io/bajo|Bajo framework} during plugin initialization.
   *
   * @class
   */
  class WaibuMpa extends this.app.baseClass.Base {
    /**
     * All supported HTML tags
     *
     * @type {string[]}
     */
    static htmlTags = tags.split(',')

    /**
     * Iconset mappings
     *
     * @type {Object}
     */
    static iconsetMappings = iconsetMappings

    /**
     * Constructor
     */
    constructor () {
      super(pkgName, me.app)

      /**
       * @property {TConfig} - Configuration object
       */
      this.config = config

      /**
       * @property {TConfigDev} - Development configuration object
       */
      this.configDev = configDev
      /**
       * @property {TConfigProd} - Production configuration object
       */
      this.configProd = configProd
    }

    /**
     * Initialize the plugin
     *
     * @async
     * @method
     */
    init = async () => {
      this.config.waibu.prefix = trim(this.config.waibu.prefix, '/')
      await toolsFactory.call(this)
      await widgetFactory.call(this)
    }

    /**
     * Build a URL based on the provided options.
     *
     * @method
     * @param {Object} [options={}] - Options for building the URL
     * @param {Array<string>} [options.exclude=[]] - Keys to exclude from the query string
     * @param {string} [options.prefix='?'] - Prefix for the query string
     * @param {string} [options.base] - Base path for the URL
     * @param {string} [options.url=''] - URL to build upon
     * @param {Object} [options.params={}] - Parameters to include in the query string
     * @param {boolean} [options.prettyUrl] - Whether to use a pretty URL format
     * @returns {string} - The constructed URL
     */
    buildUrl = (options = {}) => {
      const { exclude = [], prefix = '?', base, url = '', params = {}, prettyUrl } = options
      const { qs } = this.app.waibu
      const qsKey = this.app.waibu.config.qsKey
      let path
      let hash
      let query
      [path = '', hash = ''] = url.split('#')
      if (hash.includes('?')) [hash, query] = hash.split('?')
      else [path, query] = path.split('?')
      query = parseObject(qs.parse(query) ?? {})
      forOwn(params, (v, k) => {
        const key = qsKey[k] ?? k
        query[key] = v
      })
      const id = query.id
      if (prettyUrl) delete query.id
      query = prefix + qs.stringify(omit(query, exclude))
      if (!isEmpty(hash)) hash = '#' + hash
      if (!base) return path + query + hash
      const parts = path.split('/')
      if (base) {
        parts.pop()
        parts.push(base)
      }
      if (prettyUrl && id) parts.push(id)
      return parts.join('/') + query + hash
    }

    /**
     * Get the title of a plugin.
     *
     * @method
     * @param {string} name - The name of the plugin
     * @param {Object} req - The request object
     * @returns {string} - The title of the plugin
     */
    getPluginTitle = (name, req) => {
      const plugin = this.app.getPlugin(name, true)
      if (!plugin) return
      const text = get(plugin, 'config.waibuMpa.title', plugin.ns)
      return this.t(text, { lang: req.lang })
    }

    /**
     * Get the title of the application.
     *
     * @method
     * @param {Object} req - The request object
     * @returns {string} - The title of the application
     */
    getAppTitle = (req) => {
      const text = get(req, 'site.title', get(this, 'config.appTitle', this.ns))
      return this.t(text, { lang: req.lang })
    }

    /**
     * Get the resource information for a given name.
     *
     * @method
     * @param {string} name - The name of the resource
     * @returns {Object} - The resource information
     */
    getResource (name) {
      const subNses = ['layout', 'template', 'partial']
      const { ns, path, subNs, subSubNs, qs } = breakNsPath(name)
      const plugin = this.app.getPlugin(ns)
      const dir = `${plugin.dir.pkg}/extend/waibuMpa`
      if (!subNses.includes(subNs)) throw this.error('unknownResource%s', name)
      const fullPath = subSubNs ? `${dir}/${subSubNs}/${subNs}${path}` : `${dir}/${subNs}${path}`
      return { ns, subNs, subSubNs, path, qs, fullPath }
    }

    /**
     * Get the session ID from the raw cookie.
     *
     * @method
     * @param {string} rawCookie - The raw cookie string
     * @param {boolean} secure - Whether the cookie is secure
     * @returns {string} - The session ID
     */
    getSessionId = (rawCookie, secure) => {
      const cookieName = this.config.session.cookieName
      return this.webAppCtx.parseCookie(rawCookie)[cookieName]
    }

    /**
     * Get the view engine for a given file extension.
     *
     * @method
     * @param {string} ext - The file extension
     * @returns {Object} - The view engine
     */
    getViewEngine = (ext) => {
      const ve = this.viewEngines.find(v => v.fileExts.includes(ext))
      return ve ?? this.viewEngines.find(v => v.name === 'default')
    }

    /**
     * Group attributes by keys.
     *
     * @method
     * @param {Object} [attribs={}] - The attributes to group
     * @param {Array|string} [keys=[]] - The keys to group by
     * @param {boolean} [removeEmpty=true] - Whether to remove empty groups
     * @returns {Object} - The grouped attributes
     */
    groupAttrs = (attribs = {}, keys = [], removeEmpty = true) => {
      const { attrToArray, attrToObject } = this.app.waibu
      if (isString(keys)) keys = [keys]
      const attr = { _: {} }
      for (const a in attribs) {
        for (const k of keys) {
          if (a === k) {
            attr._[k] = attribs[a]
            continue
          }
          attr[k] = attr[k] ?? {}
          attr[k].class = attr[k].class ?? []
          attr[k].style = attr[k].style ?? {}
          const _k = kebabCase(k)
          let name = camelCase(kebabCase(a).slice(_k.length + 1))
          if (a.includes('@') || a.includes(':')) name = a.slice(_k.length + 1)
          if (!kebabCase(a).startsWith(k + '-')) {
            if (!keys.includes(a)) {
              attr._[a] = attribs[a]
              if (a === 'class' && isString(attribs[a])) attr._.class = attrToArray(attr._.class)
              if (a === 'style' && isString(attribs[a])) attr._.style = attrToObject(attr._.style)
            }
            continue
          }
          attr[k][name] = attribs[a]
          if (name === 'class' && isString(attribs[a])) attr[k].class = attrToArray(attr[k].class)
          if (name === 'style' && isString(attribs[a])) attr[k].style = attrToObject(attr[k].style)
        }
      }
      const deleted = filter(Object.keys(attr._), m => {
        let match
        m = kebabCase(m)
        for (const k of keys) {
          if (m.startsWith(k + '-')) match = true
        }
        return match
      })
      attr._ = omit(attr._, deleted)
      for (const k of keys) {
        const item = attr[k]
        if (removeEmpty && !attr._[k] && Object.keys(item).length === 2 && isEmpty(item.class) && isEmpty(item.style)) delete attr[k]
      }
      return attr
    }

    /**
     * Minify HTML text.
     *
     * @method
     * @param {string} text - The HTML text to minify
     * @returns {string} - The minified HTML
     */
    minify = async (text) => {
      const minifier = await importPkg('waibuMpa:html-minifier-terser')
      return await minifier.minify(text, {
        collapseWhitespace: true
      })
    }

    /**
     * Custom JSON stringify function.
     *
     * @method
     * @param {any} obj - The object to stringify
     * @param {boolean|function} [replacer] - The replacer function or true for custom handling
     * @param {number|string} [space] - The space argument for JSON.stringify
     * @returns {string} - The JSON string
     * @see {@link https://github.com/siddharth-sunchu/native-methods/blob/master/JSONStringfy.js}
     */
    jsonStringify = (obj, replacer, space) => {
      if (replacer !== true) return JSON.stringify(obj, replacer, space)

      const isNotNumber = (value) => {
        return isNumber(value) && isNaN(value)
      }

      const isInfinity = (value) => {
        return isNumber(value) && !isFinite(value)
      }

      const restOfDataTypes = (value) => {
        return isNumber(value) || isString(value) || isBoolean(value)
      }

      const ignoreDataTypes = (value) => {
        return isUndefined(value) || isFunction(value) || isSymbol(value)
      }

      const nullDataTypes = (value) => {
        return isNotNumber(value) || isInfinity(value) || isNull(value)
      }

      const arrayValuesNullTypes = (value) => {
        return isNotNumber(value) || isInfinity(value) || isNull(value) || ignoreDataTypes(value)
      }

      const removeComma = (str) => {
        const tempArr = str.split('')
        tempArr.pop()
        return tempArr.join('')
      }

      if (ignoreDataTypes(obj)) {
        return undefined
      }

      if (isDate(obj)) {
        return `"${obj.toISOString()}"`
      }

      if (nullDataTypes(obj)) {
        return `${null}`
      }

      if (isSymbol(obj)) {
        return undefined
      }

      if (restOfDataTypes(obj)) {
        const passQuotes = isString(obj) ? "'" : ''
        const item = isString(obj) ? obj.replaceAll("'", "\\'") : obj
        return `${passQuotes}${item}${passQuotes}`
      }

      if (isArray(obj)) {
        let arrStr = ''
        obj.forEach((eachValue) => {
          arrStr += arrayValuesNullTypes(eachValue) ? this.jsonStringify(null, replacer, space) : this.jsonStringify(eachValue, replacer, space)
          arrStr += ','
        })

        return '[' + removeComma(arrStr) + ']'
      }

      if (isPlainObject(obj)) {
        let objStr = ''

        const objKeys = Object.keys(obj)

        objKeys.forEach((eachKey) => {
          const eachValue = obj[eachKey]
          if (eachKey.includes('-')) eachKey = `'${eachKey}'`
          objStr += (!ignoreDataTypes(eachValue)) ? `${eachKey}:${this.jsonStringify(eachValue, replacer, space)},` : ''
        })
        return '{' + removeComma(objStr) + '}'
      }
    }

    /**
     * Generate pagination layout.
     *
     * @method
     * @param {number|Object} totalItems - The total number of items or an object containing pagination info
     * @param {number} [itemsPerPage] - The number of items per page
     * @param {number} [currentPage] - The current page number
     * @returns {Array} - The pagination layout
     * @see {@link https://github.com/kyleparisi/pagination-layout/blob/master/pagination-layout-be.js}
     */
    paginationLayout = (totalItems, itemsPerPage, currentPage) => {
      if (isPlainObject(totalItems)) {
        currentPage = totalItems.page
        itemsPerPage = totalItems.limit
        totalItems = totalItems.count
      }
      function last (array) {
        const length = array == null ? 0 : array.length
        return length ? array[length - 1] : undefined
      }

      const pages = Math.ceil(totalItems / itemsPerPage)

      if (!totalItems) return []

      // default pages when we only have <= 4 pages
      if ([1, 2, 3, 4, 5, 6, 7].indexOf(pages) !== -1) {
        const defaultView = []
        for (let i = 1; i <= pages; i++) {
          defaultView.push(i)
        }
        return defaultView
      }

      currentPage = currentPage || 1

      const boundary = 2
      let boundaryMiddle = false

      // if current page is sufficiently in the middle, boundary is +1 and -1
      if (
        currentPage > 3 &&
        (pages - currentPage >= 3 ||
        pages - currentPage === 1)
      ) {
        boundaryMiddle = true
      }

      if (currentPage > pages) {
        currentPage = pages
      }

      if (currentPage < 1) {
        currentPage = 1
      }

      const output = []

      if (!boundaryMiddle) {
        // count up to boundary amount from current page
        for (let i = currentPage; i <= pages; i++) {
          if (output.length === boundary) {
            break
          }
          output.push(i)
        }

        // if we do not fill the boundary count, count down from current page
        if (output.length < boundary) {
          for (let i = currentPage - 1; i > pages - boundary; i--) {
            output.unshift(i)
          }
        }
      } else {
        // count up 1 and down 1 from current page
        output.push(currentPage - 1)
        output.push(currentPage)
        output.push(currentPage + 1)
      }

      // attach last page to nav when only 1 away
      if (pages - last(output) === 1) {
        output.push(pages)
      }

      // attach first page to when only 1 away
      if (output[0] === 2) {
        output.unshift(1)
      }

      // attach first page to when only 2 away
      if (currentPage === 3) {
        output.unshift(2)
        output.unshift(1)
      }

      // put lowest page and ... when we exceed the boundary
      if (
        currentPage > 3 &&
        pages > boundary &&
        pages > 7
      ) {
        output.unshift(1, '...')
      }

      if (output.length < 7) {
        let need = 7 - output.length
        // should count down
        if (pages === last(output)) {
          for (let i = 1; i <= need; i++) {
            output.splice(2, 0, output[2] - 1)
          }
        } else if (!boundaryMiddle) { // should count up
          // remove "...", [last page]
          need = need - 2
          for (let i = 1; i <= need; i++) {
            output.push(last(output) + 1)
          }
        }
      }

      // done if the final page is in view
      if (!(pages - last(output) > 1)) {
        return output
      }

      // attach final page to view
      output.push('...')
      output.push(pages)
      return output
    }

    /**
     * Render a string using the appropriate view engine.
     *
     * @async
     * @method
     * @param {string} text - The string to render
     * @param {Object} [locals={}] - The local variables for the template
     * @param {Object} [opts={}] - The options for rendering
     * @returns {Promise<string>} - The rendered string
     */
    renderString = async (text, locals = {}, opts = {}) => {
      const ve = this.getViewEngine(opts.ext)
      return await ve.renderString(text, locals, opts)
    }

    /**
     * Render a template using the appropriate view engine.
     *
     * @async
     * @method
     * @param {string} tpl - The template file path
     * @param {Object} [locals={}] - The local variables for the template
     * @param {Object} [opts={}] - The options for rendering
     * @returns {Promise<string>} - The rendered template
     */
    render = async (tpl, locals = {}, opts = {}) => {
      const ext = path.extname(tpl)
      if (['.json', '.js', '.css'].includes(ext)) opts.partial = true
      opts.ext = ext
      const ve = this.getViewEngine(ext)
      return await ve.render(tpl, locals, opts)
    }

    /**
     * Strip HTML tags from a string.
     *
     * @method
     * @param {string} html - The HTML string to strip
     * @param {Object} [options={}] - The options for stripping
     * @returns {string} - The stripped string
     */
    stripHtmlTags = (html, options = {}) => {
      const { result } = stripHtml(html, options)
      return result
    }

    /**
     * Convert a URL to a breadcrumb array.
     *
     * @method
     * @param {string} url - The URL to convert
     * @param {Object} [options={}] - The options for conversion
     * @param {string} [options.base=''] - The base URL to remove
     * @param {string} [options.delimiter='/'] - The delimiter for splitting the URL
     * @param {boolean} [options.returnParts=false] - Whether to return the parts array
     * @param {Function} [options.handler] - The handler function for each breadcrumb
     * @param {Object} [options.handlerScope] - The scope for the handler function
     * @param {Object} [options.handlerOpts={}] - The options for the handler function
     * @returns {Array} - The breadcrumb array
     */
    urlToBreadcrumb = (url, options = {}) => {
      let { base = '', delimiter = '/', returnParts, handler, handlerScope, handlerOpts = {} } = options
      const { routePath } = this.app.waibu

      function defHandler (item) {
        return item
      }

      function breakPath (route, delimiter = '/') {
        route = trim(route, delimiter)
        const parts = without(route.split(delimiter), '')
        const routes = []
        for (const p of parts) {
          const l = last(routes)
          routes.push(l ? `${l}${delimiter}${p}` : p)
        }
        return routes
      }

      url = routePath(url)
      const route = trim(url.replace(base, ''), '/')
      const parts = breakPath.call(this, route, delimiter)
      if (returnParts) return parts
      if (!handler) handler = defHandler
      if (!handlerScope) handlerScope = this
      const result = map(parts, (r, idx) => {
        const f = `${base}/${r}`
        const opts = parts.length > 2 && (idx === parts.length - 2) && handlerOpts.hrefRebuild ? { hrefRebuild: handlerOpts.hrefRebuild } : {}
        return handler.call(handlerScope, f, url, opts)
      })
      return result
    }

    /**
     * Get the pages from a menu based on the path and subPath.
     *
     * @method
     * @param {Object} menu - The menu object
     * @param {string} [path] - The path to filter the pages
     * @param {string|Function} [subPath] - The subPath to filter the pages or a function to handle the filtering
     * @returns {Array} - The filtered pages
     */
    getMenuPages = (menu, path, subPath) => {
      const all = get(menu, 'pages', [])
      if (!path) return all
      const pages = filter(all, a => {
        return a.children && (a.title === path || a.href === path)
      })
      if (!isFunction(subPath)) {
        return filter(pages, p => {
          return p.title === subPath || p.href === subPath
        })
      }
      return subPath(pages, subPath)
    }

    /**
     * Parse attributes from a string or object.
     *
     * @method
     * @param {string|Object} text - The text or object to parse
     * @param {Object} [options={}] - The options for parsing
     * @param {string} [options.delimiter=' '] - The delimiter for splitting the text
     * @param {string} [options.kvDelimiter='='] - The delimiter for key-value pairs
     * @param {boolean} [options.camelCasedKey=true] - Whether to camelCase the keys
     * @param {boolean} [options.trimValue=true] - Whether to trim the values
     * @returns {Object} - The parsed attributes
     */
    parseAttribs = (text, options = {}) => {
      const { delimiter = ' ', kvDelimiter = '=', camelCasedKey = true, trimValue = true } = options
      let attrs = []
      if (isPlainObject(text)) {
        forOwn(text, (v, k) => {
          attrs.push(`${k}${kvDelimiter}"${v}"`)
        })
      } else attrs = map(text.split(delimiter), t => trim(t))
      const result = {}
      const names = this.app.getAllNs()
      for (const attr of attrs) {
        let [k, ...v] = map(attr.split(kvDelimiter), a => trim(a))
        v = v.join(kvDelimiter)
        if (trimValue) v = v.slice(1, v.length - 1)
        if (v === 'undefined') continue
        if (k !== 'content' && (v === '' || v === 'true')) v = true
        // check for retainAttrKey on ALL plugins
        let retain = false
        for (const name of names) {
          const plugin = this.app[name]
          if (plugin && plugin.retainAttrKey && plugin.retainAttrKey(k)) retain = true
        }
        if (!retain && camelCasedKey) k = camelCase(k)
        result[k] = v
      }
      return result
    }

    /**
     * Stringify attributes from an object.
     *
     * @method
     * @param {Object} obj - The object to stringify
     * @param {boolean} [kebabCasedKey=true] - Whether to kebab-case the keys
     * @returns {string} - The stringified attributes
     */
    stringifyAttribs = (obj = {}, kebabCasedKey = true) => {
      const { objectToAttr, arrayToAttr } = this.app.waibu
      const attrs = []
      const names = this.app.getAllNs()
      forOwn(obj, (v, k) => {
        let retain = false
        for (const name of names) {
          const plugin = this.app[name]
          if (plugin && plugin.retainAttrKey && plugin.retainAttrKey(k)) retain = true
        }
        if (retain) {
          if (v === true) attrs.push(k)
          else attrs.push(`${k}="${v}"`)
          return undefined
        }
        if (kebabCasedKey) k = kebabCase(k)
        if (!isSet(v)) return undefined
        if (['class', 'style'].includes(k) && isEmpty(v)) return undefined
        if (isArray(v)) v = arrayToAttr(v)
        if (isPlainObject(v)) v = objectToAttr(v)
        if (k !== 'content' && v === true) attrs.push(k)
        else attrs.push(`${k}="${v}"`)
      })
      return attrs.join(' ')
    }

    /**
     * Get a theme by name.
     *
     * @method
     * @param {string} name - The name of the theme
     * @param {boolean} [nameOnly=false] - Whether to return only the name
     * @returns {Object|string|undefined} - The theme object, name, or undefined if not found
     */
    getTheme = (name, nameOnly) => {
      const theme = this.themes.find(item => item.name === name)
      if (!theme) return theme
      return nameOnly ? theme.name : theme
    }

    /**
     * Get an iconset by name.
     *
     * @method
     * @param {string} name - The name of the iconset
     * @param {boolean} [nameOnly=false] - Whether to return only the name
     * @returns {Object|string|undefined} - The iconset object, name, or undefined if not found
     */
    getIconset = (name, nameOnly) => {
      const iconset = this.iconsets.find(item => item.name === name)
      if (!iconset) return iconset
      return nameOnly ? iconset.name : iconset
    }

    /**
     * Render a view with the given options.
     *
     * @async
     * @method
     * @param {Object} options - The options for rendering the view
     * @param {string} options.tpl - The template to render
     * @param {Object} [options.params={}] - The parameters for the template
     * @param {Object} [options.opts={}] - The options for rendering
     * @param {Object} options.reply - The reply object
     * @returns {Promise<string>} - The rendered view
     */
    renderView = async (options = {}) => {
      const { tpl, params = {}, opts = {}, reply } = options
      const buildLocals = await importModule('waibu:/lib/build-locals.js')
      const { get: getCache, set: setCache } = this.app.bajoCache ?? {}
      const { routePath } = this.app.waibu

      async function isCacheable (req, cachedUrls) {
        const { hash } = this.app.bajoExtra
        const ns = get(req, 'routeOptions.config.ns')
        let cache = get(req, 'routeOptions.config.cache', omit(this.config.page.cache, ['urls']))
        cache.methods = cache.methods ?? ['GET']
        if (!ns || (!this.app.bajoCache) || (!req.site) || !cache.methods.includes(req.method)) return { ttl: 0 }
        if (isFunction(cache)) {
          cache = await cache.call(this.app[ns], req, cachedUrls)
        }
        const url = req.url.split('?')[0].split('#')[0]
        for (const item of cachedUrls) {
          if (item.isMatch(url)) cache.ttlDur = item.ttlDur ?? cache.ttlDur
        }
        const key = `waibu-mpa-page-${req.site.id}-${cache.key ?? (await hash(req.url))}`
        return { key, ttl: cache.ttlDur }
      }

      const mime = await importPkg('waibu:mime')
      const cfg = this.config
      const cachedUrls = cloneDeep(this.config.page.cache.urls).map(item => {
        if (isString(item)) item = { url: item }
        item.url = routePath(item.url)
        item.isMatch = outmatch(item.url)
        return item
      })
      let ext = path.extname(tpl)
      if (ext === '.md') ext = '.html'
      let mimeType = isEmpty(ext) ? 'text/html' : mime.getType(ext)
      mimeType += `; charset=${cfg.page.charset}`
      reply.header('Content-Type', mimeType)
      reply.header('Content-Language', reply.request.lang)
      reply.header('X-Req-Id', reply.request.id)
      opts.req = reply.request
      opts.reply = reply
      for (const item of ['theme', 'iconset']) {
        if (!reply.request[item]) reply.request[item] = this[item + 's'][0].name
        if (this[item + 's'].length === 1) reply.request[item] = this[item + 's'][0].name
      }
      const { key, ttl } = await isCacheable.call(this, reply.request, cachedUrls)
      if (ttl > 0) {
        const cached = await getCache({ key })
        if (cached) {
          reply.header('X-Wmpa-Cached', true)
          return cached
        }
      }
      const locals = await buildLocals.call(this, { tpl, params, opts })
      if (!get(reply.request, 'routeOptions.config.noCacheReq')) {
        await this.app.cache.save(`${this.ns}.req:/${opts.req.id}-locals.json`, locals, this.config.reqTtlDur)
      }
      const result = await this.render(tpl, locals, opts)
      if (ttl > 0) await setCache({ key, value: result, ttl })
      if (reply.request.session) {
        ext = path.extname(reply.request.url)
        if (isEmpty(ext) || ['.html'].includes(ext)) {
          if (reply.request.session.prevUrl !== reply.request.url) reply.request.session.prevUrl = reply.request.url
          else reply.request.session.prevUrl = ''
        }
      }
      return result
    }

    /**
     * Check and set the iconset for a request
     * @async
     * @method
     * @param {Object} req - The request object
     * @param {Object} reply - The reply object
     * @returns {Promise<void>} A promise that resolves when the iconset is checked and set
     */
    checkIconset = async (req, reply) => {
      const { get, isString } = this.app.lib._
      const mpa = this.app.waibuMpa

      if (!req.site) return
      const siteIconset = get(req, 'site.setting.waibuMpa.iconset')
      req.iconset = siteIconset ?? get(mpa, 'config.iconset.set', 'default')
      const hiconset = req.headers['x-iconset']
      if (isString(hiconset) && mpa.getIconset(hiconset)) req.iconset = hiconset
      req.iconset = req.iconset ?? 'default'
    }

    /**
     * Check and set the theme for a request
     * @async
     * @method
     * @param {Object} req - The request object
     * @param {Object} reply - The reply object
     * @returns {Promise<void>} A promise that resolves when the theme is checked and set
     */
    checkTheme = async (req, reply) => {
      const { get, isString } = this.app.lib._
      const mpa = this.app.waibuMpa

      if (!req.site) return
      const siteTheme = get(req, 'site.setting.waibuMpa.theme')
      req.theme = siteTheme ?? get(mpa, 'config.theme.set', 'default')
      const htheme = req.headers['x-theme']
      if (isString(htheme) && mpa.getTheme(htheme)) req.theme = htheme
      req.theme = req.theme ?? 'default'
    }

    /**
     * Normalize menu items by checking their routes and removing invalid entries.
     *
     * @async
     * @method
     * @param {Array<Object>} items - The menu items to normalize
     * @param {Object} req - The request object
     * @returns {Promise<Array<Object>>} - The normalized menu items
     */
    normalizeMenuItems = async (items, req) => {
      const { pullAt } = this.app.lib._
      const { checkRoute } = this.app.waibu
      let menu = []
      for (const item of items) {
        if (item.href) {
          try {
            await checkRoute(req, [item.href])
            menu.push(item)
          } catch (err) {}
        } else menu.push(item)
      }
      const deleted = []
      menu.forEach((item, index) => {
        if (!item.href) {
          const next = menu[index + 1]
          if (!next || next.title === '-') deleted.push(index)
        }
      })
      pullAt(menu, deleted)
      if (menu.length === 1 && menu[0].title === '-') menu = []
      return menu
    }

    /**
     * Apply formatting to the given text based on the options.
     *
     * @async
     * @method
     * @param {Object} options - The options for formatting
     * @param {string} options.text - The text to format
     * @param {Object} [options.locals={}] - The local variables for the template
     * @param {Object} [options.opts={}] - The options for formatting
     * @returns {Promise<string>} - The formatted text
     */
    _applyFormat = async (options = {}) => {
      let { text, locals = {}, opts = {} } = options
      const { ext } = opts
      const isDev = this.app.bajo.config.env === 'dev'
      const viewEngine = this.getViewEngine(ext)
      const exts = without(['.html', ...viewEngine.fileExts], '.js', '.css')

      if (this.config.emoji && exts.includes(ext)) text = emoji.emojify(text)
      if (exts.includes(ext)) text = await buildPage.call(this, { text, locals, opts })
      if (!isDev && !opts.partial && this.config.prettier && exts.includes(ext)) text = await prettier.format(text, this.config.prettier)
      if (!isDev && !opts.partial && this.config.minifier && ['.js', '.css', ...exts].includes(ext)) text = minify(text, this.config.minifier)
      return text
    }

    /**
     * Decorate the request and reply objects with additional properties and methods.
     *
     * @method
     */
    _decorate = () => {
      const cfg = this.config
      const me = this
      this.webAppCtx.decorateRequest('theme', cfg.theme.set)
      this.webAppCtx.decorateRequest('iconset', cfg.iconset.set)
      this.webAppCtx.decorateRequest('darkMode', cfg.darkMode.set)
      this.webAppCtx.decorateRequest('referer', '')
      this.webAppCtx.decorateReply('ctags', null)
      this.webAppCtx.decorateReply('view', async function (tpl, params = {}, opts = {}) {
        return await me.renderView({ reply: this, tpl, params, opts })
      })
    }

    /**
     * Load resources for the given module and item.
     *
     * @async
     * @method
     * @param {Object} mod - The module object
     * @param {string} item - The item key to load resources for
     * @returns {Promise<Array>} - The loaded resources
     */
    async _loadResource (mod = [], item) {
      if (isEmpty(mod[item])) return []
      if (!isArray(mod[item])) mod[item] = [mod[item]]
      const items = []
      const extItems = []
      for (const i in mod[item]) {
        if (isString(mod[item][i])) {
          if (mod[item][i].startsWith('/')) items.push(mod.css[i])
          else {
            let name = mod[item][i]
            if (['$', '^'].includes(name[0])) name = name.slice(1)
            const { ns, path, subNs } = breakNsPath(name, undefined, false)
            if (subNs === 'load') extItems.push({ ns, path })
            else items.push(mod[item][i])
          }
        } else items.push(mod[item][i])
      }
      for (const c of extItems) {
        let emod = await readConfig(`${c.ns}:${c.path}`, { ns: c.ns, ignoreError: false })
        if (!isArray(emod)) emod = [emod]
        for (const m of emod) {
          items.push(m)
        }
      }
      return items
    }

    /**
     * Handle not found errors.
     *
     * @method
     * @param {Error} err - The error object
     * @param {Object} req - The request object
     * @param {Object} reply - The reply object
     * @returns {Promise<string>} - The rendered view
     * @async
     */
    _handleNotFound = async (err, req, reply) => {
      const welcome = req.url.split('?')[0] === '/'
      const msg = req.t('routeNotFound%s%s', req.url, req.method)
      const error = err ?? this.error(msg)
      if (err) error.message = msg
      if (!welcome) {
        error.statusCode = 404
        reply.code(404)
      }
      reply.header('Content-Type', `text/html; charset=${this.config.page.charset}`)
      reply.header('Content-Language', req.lang)
      if (error.noContent) return ''
      const tpl = welcome ? `${this.ns}.template:/welcome.html` : `${this.ns}.template:/404.html`
      req.webApp = this.ns
      return await this.renderView({ reply, tpl, params: { error } })
    }

    /**
     * Handle general errors.
     *
     * @method
     * @param {Error} err - The error object
     * @param {Object} req - The request object
     * @param {Object} reply - The reply object
     * @returns {Promise<string>} - The rendered view
     * @async
     */
    _handleError = async (err, req, reply) => {
      const { resolveTemplate, compile } = this.app.bajoTemplate
      err.statusCode = err.statusCode ?? 500
      reply.code(err.statusCode)
      reply.header('Content-Type', `text/html; charset=${this.config.page.charset}`)
      reply.header('Content-Language', req.lang)
      if (err.message === '_notFound' || err.statusCode === 404) {
        return await this._handleNotFound(err, req, reply)
      }
      if (err.noContent) return ''
      let tpl = `${this.ns}.template:/${err.statusCode}.html`
      try {
        resolveTemplate(tpl)
      } catch (err) {
        tpl = `${this.ns}.template:/500.html`
      }
      try {
        req.webApp = this.ns
        return await this.renderView({ reply, tpl, params: { error: err }, opts: { noFlash: true } })
      } catch (err) {
        // only going here if something happened in reply.view
        const content = fs.readFileSync(resolveTemplate(tpl).file, 'utf8')
        return await compile(content, { error: err })
      }
    }

    /**
     * Create route for '/robots.txt'.
     *
     * Location of robots.txt file can be found in:
     * 1. site attachment; if not found, then
     * 2. main plugin's file; if not found, then
     * 3. theme dir; if not found, then
     * 4. default plugin's file
     *
     * @async
     * @method
     * @returns {Promise<void>}
     */
    _handleRobotsTxt = async () => {
      if (!this.config.robotsTxt) return
      const { download } = await importModule('waibu:/lib/helper.js', { asDefaultImport: false })
      const me = this
      this.webAppCtx.get('/robots.txt', async function (req, reply) {
        let file
        // 1. site attachment
        if (me.app.dobo) {
          const dir = me.app.getPluginDataDir('dobo')
          file = `${dir}/attachment/SumbaSite/${get(req, 'site.id')}/file/robots.txt`
        }
        // 2. main robots.txt
        if (!fs.existsSync(file)) file = me.app.getPluginFile('main:/robots.txt')
        // 3. theme directory
        const theme = me.themes.find(item => item.name === get(req, 'theme'))
        if (!fs.existsSync(file) && theme) {
          file = `${theme.plugin.dir.pkg}/asset/${theme.name}/robots.txt`
          if (!fs.existsSync(file)) file = `${theme.plugin.dir.pkg}/asset/_common/robots.txt`
        }
        // 4. Default
        if (!fs.existsSync(file)) file = me.app.getPluginFile('waibuMpa:/asset/robots.txt')
        reply.header('cache-control', 'max-age=86400')
        return await download.call(me, file, req, reply)
      })
    }

    /**
     * Create route for '/favicon.:ext'
     *
     * Location of favicon file can be found in:
     * 1. site attachment; if not found, then
     * 2. main plugin's file; if not found, then
     * 3. theme dir; if not found, then
     * 4. default plugin's file
     *
     * @async
     * @method
     * @returns {Promise<void>}
     */
    _handleFavicon = async () => {
      if (!this.config.favicon) return
      const { download } = await importModule('waibu:/lib/helper.js', { asDefaultImport: false })
      const me = this
      this.webAppCtx.get('/favicon.:ext', async function (req, reply) {
        let file
        // 1. site attachment
        if (me.app.dobo) {
          const dir = me.app.getPluginDataDir('dobo')
          file = `${dir}/attachment/SumbaSite/${get(req, 'site.id')}/file/favicon.${req.params.ext}`
        }
        // 2. main favicon
        if (!fs.existsSync(file)) file = me.app.getPluginFile(`main:/asset/favicon.${req.params.ext}`)
        // 3. theme directory
        const theme = me.themes.find(item => item.name === get(req, 'theme'))
        if (!fs.existsSync(file) && theme) {
          file = `${theme.plugin.dir.pkg}/asset/${theme.name}/favicon.${req.params.ext}`
          if (!fs.existsSync(file)) file = `${theme.plugin.dir.pkg}/asset/_common/favicon.${req.params.ext}`
        }
        // 4. Default
        if (!fs.existsSync(file)) file = me.app.getPluginFile('waibuMpa:/asset/favicon.png')
        reply.header('cache-control', 'max-age=86400')
        return await download.call(me, file, req, reply)
      })
    }

    /**
     * Handle sub-applications.
     *
     * @method
     * @returns {Promise<void>}
     * @async
     */
    _handleSubApp = async () => {
      const { collectWebApps } = await importModule('waibu:/lib/helper.js', { asDefaultImport: false })
      await runHook(`${this.ns}:beforeSubApp`, this.webAppCtx)
      const mods = await collectWebApps.call(this.app[this.ns], 'boot.js', 'waibuMpa')
      for (const m of mods) {
        this.log.debug('bootSubApp%s', m.ns)
        await this.webAppCtx.register(async (subCtx) => {
          this.app[m.ns].instance = subCtx
          await runHook(`${this.ns}.${m.alias}:afterCreateContext`, subCtx, m.prefix)
          await m.handler.call(this.app[m.ns], subCtx, m.prefix)
        }, { prefix: m.prefix })
      }
      await runHook(`${this.ns}:afterSubApp`, this.webAppCtx)
    }

    /**
     * Build routes based on the provided options.
     *
     * @method
     * @param {Object} options - The options for building routes
     * @param {Array} options.files - The route files
     * @param {string} options.pathPrefix - The path prefix for the routes
     * @param {string} options.dir - The directory containing route files
     * @param {string} options.ns - The namespace for the routes
     * @param {Object} options.cfg - The configuration object
     * @param {Object} options.parent - The parent route object
     * @param {string} options.urlPrefix - The URL prefix for the routes
     * @param {boolean} options.subRoute - Whether the route is a sub-route
     * @returns {Promise<void>}
     * @async
     */
    async _buildRoute (options = {}) {
      const { files, pathPrefix, dir, ns, cfg, parent, urlPrefix, subRoute } = options
      const { getPluginPrefix } = this.app.waibu
      const { mergeRouteHooks } = await importModule('waibu:/lib/webapp.js', { asDefaultImport: false })
      const mods = []
      const me = this
      for (const f of files) {
        const ext = path.extname(f)
        const urls = f.slice(0, f.length - ext.length).replace(`${dir}/extend/${pathPrefix}`, '').replaceAll('@', ':').split('/')
        if (last(urls) === 'index') urls.pop()
        const url = urls.join('/')
        let mod
        if (ext === '.js') mod = await importModule(f)
        else if (ext === '.json') mod = await this.app.bajo.fromJson(f, { readFromFile: true })
        else if (['.html', '.md'].includes(ext)) mod = [{ view: f }]
        if (!mod) continue
        if (isFunction(mod)) mod = [{ handler: mod }]
        else if (isPlainObject(mod)) mod = [mod]
        for (let m of mod) {
          const mhandler = m.handler // parseObject has problem with function
          const murl = m.url // same as above
          m = parseObject(omit(m, ['handler', 'url'], { parseValue: true }))
          m.url = murl
          m.handler = mhandler
          m.url = m.url ?? url
          if (isFunction(m.url)) m.url = await m.url.call(this)
          if (m.redirect) {
            m.handler = async function (req, reply) {
              return reply.redirectTo(m.redirect)
            }
          }
          if (!m.handler) {
            m.handler = async function (req, reply) {
              const params = {}
              let tpl = m.view ?? `${ns}.template:${m.url}.html`
              if (m.tbd) {
                params.page = { title: titleize(last(m.url.split('/'))) }
                tpl = 'waibuMpa.template:/tbd.html'
              }
              return await reply.view(tpl, params)
            }
          }
          if (urlPrefix) m.url = `/${urlPrefix}/${m.url}`
          m.url = trimEnd(m.url, '/')
          if (isArray(m.methods)) {
            m.method = [...m.methods]
            delete m.methods
          }
          m.method = m.method ?? 'GET'
          await mergeRouteHooks.call(me, m)
          m.config = m.config ?? {}
          m.config.prefix = getPluginPrefix(ns)
          m.config.pathSrc = m.url
          m.config.webApp = parent ?? ns
          m.config.xSite = m.xSite
          m.config.mainSiteEdit = m.mainSiteEdit
          m.config.noMenu = m.noMenu
          m.config.noSidebar = m.noSidebar
          m.config.ns = ns
          m.config.subNs = ''
          m.config.noCacheReq = m.noCacheReq
          m.config.title = m.title ?? camelCase(last(m.url.split('/')))
          m.config.subRoute = subRoute
          if (m.cache === true) m.cache = omit(me.config.page.cache, ['urls'])
          m.config.cache = defaultsDeep(m.cache ?? {}, { ttlDur: 0 })

          delete m.title
          m = defaultsDeep(pick(cfg, ['exposeHeadRoute', 'bodyLimit']), m)
          mods.push(m)
        }
      }
      return mods
    }

    /**
     * Add routes to the application.
     *
     * @method
     * @param {Object} options - The options for adding routes
     * @param {string} options.appPrefix - The application prefix
     * @param {string} options.prefix - The route prefix
     * @param {Array} options.mods - The route modules
     * @param {Object} options.appCtx - The application context
     * @param {Object} options.cfg - The configuration object
     * @returns {Promise<void>}
     * @async
     */
    _addRoutes = async (options = {}) => {
      const { appPrefix, prefix, mods, appCtx, cfg } = options
      const { isRouteDisabled } = this.app.waibu
      const { reroutedPath } = await importModule('waibu:/lib/webapp.js', { asDefaultImport: false })
      for (const mod of mods) {
        const fullPath = appPrefix === '' ? mod.url : `/${appPrefix}${mod.url}`
        if (isRouteDisabled(`${prefix === '' ? '' : `/${prefix}`}${fullPath}`)) continue
        const rpath = await reroutedPath.call(this, fullPath, cfg.rerouted)
        if (rpath) {
          this.log.warn('rerouted%s%s', `${prefix}${fullPath}`, `${prefix}${rpath}`)
          mod.url = rpath
          mod.pathReroutedTo = rpath
          this.webAppCtx.route(mod)
        } else appCtx.route(mod)
      }
    }

    /**
     * Build routes for the application.
     *
     * @method
     * @param {string} prefix - The route prefix
     * @returns {Promise<void>}
     * @async
     */
    _buildRoutes = async (prefix) => {
      const { getPluginPrefix } = this.app.waibu
      const cfg = this.config
      const pathPrefix = 'waibuMpa/route'
      const me = this
      const appCtxs = {}
      let subRoutes = []
      const names = this.app.getAllNs()
      await runHook(`${this.ns}:beforeBuildRoutes`, this.webAppCtx)
      await eachPlugins(async function ({ dir }) {
        const { ns } = this
        let appPrefix = getPluginPrefix(ns)
        if (ns === me.ns || (ns === me.app.mainNs && cfg.mountMainAsRoot)) appPrefix = ''
        const pattern = `${dir}/extend/${pathPrefix}/**/*.{js,json,html,md}`
        const files = await fastGlob(pattern)
        // subRoutes
        const spattern = `${dir}/extend/waibuMpa/extend/{${names.join(',')}}/route/**/*.{js,json,html,md}`
        const sfiles = await fastGlob(spattern)
        for (const file of sfiles) {
          const [sns] = file.replace(`${dir}/extend/waibuMpa/extend/`, '').split('/')
          subRoutes.push({ file, ns: sns, sns: ns, dir })
        }
        if (files.length === 0) return undefined
        await me.webAppCtx.register(async (appCtx) => {
          appCtxs[ns] = appCtx
          await runHook(`${me.ns}.${this.ns}:beforeBuildRoutes`, appCtx, appPrefix)
          const mods = await me._buildRoute.call(this, { appCtx, files, appPrefix, pathPrefix, dir, ns, cfg, parent: me.ns })
          await me._addRoutes({ appPrefix, prefix, mods, appCtx, cfg })
          await runHook(`${me.ns}.${this.ns}:afterBuildRoutes`, appCtx, appPrefix)
        }, { prefix: appPrefix })
      })
      if (subRoutes.length > 0) {
        subRoutes = groupBy(subRoutes, 'ns')
        for (const k in subRoutes) {
          const items = subRoutes[k]
          const appCtx = appCtxs[k]
          if (!appCtx) throw this.error('cantHaveSubroutesWithoutContext%s', k)
          for (const item of items) {
            let appPrefix = getPluginPrefix(k)
            if (item.sns === me.ns || (item.sns === me.app.mainNs && cfg.mountMainAsRoot)) appPrefix = ''
            await runHook(`${me.ns}.${k}:beforeBuildSubRoutes`, appCtx, appPrefix)
            const scope = this.app[item.sns]
            const pathPrefix = `waibuMpa/extend/${item.ns}/route/`
            const urlPrefix = getPluginPrefix(item.sns)
            const mods = await me._buildRoute.call(scope, { appCtx, files: [item.file], pathPrefix, dir: item.dir, ns: item.ns, cfg, parent: me.ns, urlPrefix, subRoute: item.sns })
            await me._addRoutes({ appPrefix, prefix, mods, appCtx, cfg })
            await runHook(`${me.ns}.${k}:afterBuildSubRoutes`, appCtx, appPrefix)
          }
        }
      }

      await runHook(`${this.ns}:afterBuildRoutes`, this.webAppCtx)
    }

    /**
     * Trash old sessions.
     *
     * @method
     * @returns {Promise<void>}
     * @async
     */
    _trashOldSession = async () => {
      if (!this.app.dobo) return
      const model = this.app.dobo.getModel('WmpaSession')
      const recs = await model.findAllRecord({ sort: { createdAt: 1 } }, { noHook: true, noModelHook: true })
      for (const rec of recs) {
        let expires = get(rec, 'session.cookie.expires')
        if (!expires) expires = dayjs(rec.createdAt).add(this.config.session.cookie.maxAge, 'ms').toISOString()
        const diff = dayjs(expires).diff(dayjs())
        if (diff < 0) await model.removeRecord(rec.id, { noReturn: true })
      }
    }

    /**
     * Handle session setup.
     *
     * @method
     * @returns {Promise<void>}
     * @async
     */
    _handleSession = async () => {
      const [cookie, session, flash] = await importPkg('waibu:@fastify/cookie',
        'waibu:@fastify/session', 'waibu:@fastify/flash')
      const cfg = this.getConfig('session')
      if (!cfg) return
      delete cfg.trashOldDur
      await runHook(`${this.ns}:beforeSessionSetup`)
      if (this.app.dobo) {
        this.sessionStore = new Store(this)
        cfg.store = this.sessionStore
      }
      this.webAppCtx.register(cookie)
      this.webAppCtx.register(session, cfg)
      this.webAppCtx.register(flash)
      await runHook(`${this.ns}:afterSessionSetup`, this.webAppCtx)

      this._trashOldSession()
      setInterval(() => {
        this._trashOldSession()
      }, this.config.session.trashOldDur)
    }
  }

  return WaibuMpa
}

export default factory
