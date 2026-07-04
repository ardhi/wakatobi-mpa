import path from 'path'

/**
 * Component factory function that creates the MpaComponent class.
 *
 * @async
 * @returns {Promise<MpaComponent>} The MpaComponent class
 *
 */
async function componentFactory () {
  /**
   * MpaComponent class definition.
   *
   * @class
   */
  class MpaComponent extends this.app.baseClass.MpaTools {
    /**
     * Constructor
     */
    constructor (options = {}) {
      super(options.plugin)
      const { plugin, $, theme, iconset, locals, reply, req, scriptBlock = {}, styleBlock = {} } = options
      const { get } = plugin.app.lib._
      this.$ = $
      this.theme = theme
      this.iconset = iconset
      this.locals = locals
      this.reply = reply
      this.req = req
      this.ttlDur = get(plugin, 'app.waibuMpa.config.theme.component.ttlDur', 0)
      this.namespace = 'c:'
      this.noTags = []
      this.scriptBlock = scriptBlock
      this.styleBlock = styleBlock
      this.widget = {}
    }

    addScriptBlock = (type, block) => {
      if (!block) {
        block = type
        type = 'root'
      }
      if (typeof block === 'string') block = [block]
      this.scriptBlock[type] = this.scriptBlock[type] ?? []
      this.scriptBlock[type].push(...block)
    }

    addStyleBlock = (type, block) => {
      if (!block) {
        block = type
        type = 'root'
      }
      if (typeof block === 'string') block = [block]
      this.styleBlock[type] = this.styleBlock[type] ?? []
      this.styleBlock[type].push(...block)
    }

    /**
     * Loads base factories dynamically from the file system.
     * @async
     */

    loadBaseWidgets = async () => {
      const { camelCase } = this.app.lib._
      const { importModule } = this.app.bajo
      const { fastGlob } = this.app.lib
      const pattern = `${this.app.waibuMpa.dir.pkg}/lib/class/widget/*.js`
      const files = await fastGlob(pattern)
      for (const file of files) {
        const mod = await importModule(file)
        const name = camelCase(path.basename(file, '.js'))
        this.widget[name] = await mod.call(this.plugin)
      }
    }

    /**
     * Retrieves a widget builder class or instance for a specific method.
     * @async
     * @param {string} method - The method name to retrieve the builder for.
     * @returns {Promise<Function|Object>} The builder class or instance.
     */
    getWidget = async (method) => {
      const { isClass } = this.app.lib.aneka
      let Widget = this.widget[method]
      if (!isClass(Widget)) Widget = await Widget.call(this.plugin)
      return Widget
    }

    /**
     * Determines the method to use based on the provided parameters.
     * @param {Object} params - The parameters containing the method information.
     * @returns {string} The determined method name.
     */
    getMethod = (params) => {
      let method = params.ctag
      if (!this.widget[method]) method = 'any'
      return method
    }

    /**
     * Builds a tag with the given parameters and options.
     * @async
     * @param {Object} [params={}] - The parameters for the tag.
     * @param {Object} [opts={}] - Additional options for building the tag.
     * @returns {Promise<string|boolean>} The rendered HTML or `false` if the build fails.
     */
    buildTag = async (params = {}, opts = {}) => {
      const { sprintf } = this.app.lib
      const { compile } = this.app.bajoTemplate
      const { escape } = this.app.waibu
      const { isEmpty, merge, uniq, without } = this.app.lib._
      params.ctag = params.tag
      this.reply.ctags = this.reply.ctags ?? []
      if (!this.reply.ctags.includes(params.ctag)) this.reply.ctags.push(params.ctag)
      const method = this.getMethod(params)
      if (opts.attr) params.attr = merge({}, opts.attr, params.attr)
      this.normalizeAttr(params)
      params.attr.content = params.attr.content ?? ''
      let html
      if (params.attr.content.includes('%s')) html = sprintf(params.attr.content, params.html)
      else if (isEmpty(params.html)) html = params.attr.content
      if (!isEmpty(html)) params.html = (params.noEscape || params.attr.noEscape) ? html : escape(html)
      await this.iconAttr(params, method)
      await this.beforeBuildTag(method, params)
      const Widget = await this.getWidget(method)
      const widget = new Widget({ component: this, params, options: opts })
      const resp = await widget.build()
      if (resp === false) {
        return false
      }

      await this.afterBuildTag(method, params)
      params.attr.class = without(uniq(params.attr.class), undefined, null, '')
      if (isEmpty(params.attr.class)) delete params.attr.class
      if (isEmpty(params.attr.style)) delete params.attr.style
      if (isEmpty(params.html)) return await this.render(params, opts)

      const merged = merge({}, params.locals, { attr: params.attr })
      const result = await compile(params.html, merged, { ttl: this.ttlDur })
      params.html = result
      return await this.render(params, opts)
    }

    /**
     * Normalizes the attributes of the given parameters.
     * @param {Object} [params={}] - The parameters containing attributes to normalize.
     * @param {Object} [opts={}] - Additional options for normalization.
     */
    normalizeAttr = (params = {}, opts = {}) => {
      const { without, keys, isString, isArray } = this.app.lib._
      const { generateId } = this.app.lib.aneka
      const { attrToArray, attrToObject } = this.app.waibu
      params.attr = params.attr ?? {}
      params.attr.class = attrToArray(params.attr.class)
      params.attr.style = attrToObject(params.attr.style)
      if (isString(opts.cls)) params.attr.class.push(opts.cls)
      else if (isArray(opts.cls)) params.attr.class.push(...opts.cls)
      if (opts.tag) params.tag = opts.tag
      if (opts.autoId) params.attr.id = isString(params.attr.id) ? params.attr.id : generateId('alpha')
      for (const k of without(keys(opts), 'cls', 'tag', 'autoId')) {
        params.attr[k] = opts[k]
      }
      params.html = params.html ?? ''
    }

    /**
     * Renders the final HTML for the given parameters.
     * @async
     * @param {Object} [params={}] - The parameters for rendering.
     * @returns {Promise<string>} The rendered HTML.
     */
    render = async (params = {}) => {
      const { omit, isEmpty, merge, kebabCase, isArray } = this.app.lib._
      const { stringifyAttribs } = this.app.waibuMpa
      params.attr = params.attr ?? {}

      params.tag = params.attr.tag ?? ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(params.tag) ? params.tag : kebabCase(params.tag)
      params.attr = omit(params.attr, ['tag', 'content'])
      params.html = params.html ?? ''
      params.attrs = stringifyAttribs(params.attr)
      if (!isEmpty(params.attrs)) params.attrs = ' ' + params.attrs
      let html = isArray(params.html) ? params.html.join('\n') : params.html
      if (!params.noTag) {
        html = params.selfClosing ? `<${params.tag}${params.attrs}/>` : `<${params.tag}${params.attrs}>${params.html}</${params.tag}>`
        const method = this.getMethod(params)
        if (this.widget[method]) { // static method on Widget
          const Widget = await this.getWidget(method)
          if (Widget.after) {
            html = (await Widget.after.call(this, merge({}, params, { result: html }))) ?? html
          }
        }
      } else if (!this.noTags.includes(params.attr.octag)) this.noTags.push(params.attr.octag)
      if (params.prepend) html = `${params.prepend}${html}`
      if (params.append) html += params.append
      return html
    }

    /**
     * Processes icon-related attributes and appends them to the HTML.
     * @async
     * @param {Object} [params={}] - The parameters containing icon attributes.
     * @param {string} method - The method name.
     */
    iconAttr = async (params = {}, method) => {
      if (['modal', 'toast'].includes(method)) return
      const { groupAttrs } = this.app.waibuMpa
      const { merge } = this.app.lib._
      for (const k in params.attr) {
        const v = params.attr[k]
        if (!['icon', 'iconEnd'].includes(k)) continue
        const group = groupAttrs(params.attr, ['icon', 'iconEnd'])
        const _params = { attr: merge(k.endsWith('End') ? group.iconEnd : group.icon, { name: v }) }
        const Widget = this.widget.icon
        const widget = new Widget({ component: this, params: _params })
        await widget.build()
        const icon = await this.render(_params)
        params.html = k.endsWith('End') ? `${params.html} ${icon}` : `${icon} ${params.html}`
        delete params.attr[k]
      }
    }

    /**
     * Builds the `<option>` elements for a `<select>` tag.
     * @param {Object} params - The parameters containing options and values.
     * @returns {string} The generated `<option>` elements.
     */
    buildOptions = async (params) => {
      const { isString, has, omit, find, isPlainObject, isArray, pick, camelCase, get, isEmpty } = this.app.lib._
      const { attrToArray } = this.app.waibu
      const { getMethod, callHandler } = this.app.bajo
      let prop = {}
      const schema = get(this, 'locals.schema')
      if (schema) prop = find(schema.properties, { name: params.attr.name }) ?? {}
      if (!has(params.attr, 'options')) return
      const items = []
      let input = params.attr.options
      let values = attrToArray(params.attr.dataValue ?? params.attr.value, '|')
      if (!has(params.attr, 'multiple')) {
        if (values.length > 0) values = [values[0]]
        else if (prop.default) values = [prop.default]
      }
      let options = []
      if (isString(input)) {
        if (getMethod(input, false)) {
          input = await callHandler(input)
        } else {
          const separator = isString(params.attr.optionsSeparator) ? params.attr.optionsSeparator : ';'
          input = attrToArray(input, separator).map(item => {
            const [value, text] = item.split(':')
            return { value, text }
          })
        }
      }
      if (isPlainObject(input)) {
        for (const key in input) {
          options.push({ value: key, text: (input[key] + '') })
        }
      } else if (isArray(input)) {
        options = input.map(item => {
          if (isPlainObject(item)) return pick(item, ['value', 'text'])
          return { value: item, text: (item + '') }
        })
      }
      if (!isEmpty(prop)) options.unshift({ value: '', text: '_blank_' })
      for (const opt of options) {
        const sel = find(values, v => opt.value === v)
        const ttext = camelCase(`${prop.name} ${opt.text}`)
        items.push(`<option value="${opt.value}"${sel ? ' selected' : ''}>${this.req.te(ttext) ? this.req.t(ttext) : this.req.t(opt.text)}</option>`)
      }
      params.attr = omit(params.attr, ['options'])
      return items.join('\n')
    }

    /**
     * Builds a URL with the given parameters.
     * @param {Object} options - The options for building the URL.
     * @param {Array<string>} [options.exclude] - Keys to exclude from the URL.
     * @param {string} [options.prefix] - The prefix for the URL.
     * @param {string} [options.base] - The base URL.
     * @param {string} [options.url] - The URL to modify.
     * @param {Object} [options.params={}] - Query parameters to include.
     * @param {boolean} [options.prettyUrl] - Whether to generate a pretty URL.
     * @returns {string} The built URL.
     */
    buildUrl = ({ exclude, prefix, base, url, params = {}, prettyUrl }) => {
      const { isEmpty } = this.app.lib._
      const { buildUrl } = this.app.waibuMpa
      url = url ?? (isEmpty(this.req.referer) ? this.req.url : this.req.referer)
      return buildUrl({ exclude, prefix, base, url, params, prettyUrl })
    }

    /**
     * Builds a sentence with optional rendering and minification.
     * @async
     * @param {string|string[]} sentence - The sentence or array of sentences to build.
     * @param {Object} [params={}] - Parameters for rendering the sentence.
     * @param {Object} [extra={}] - Extra options such as wrapping or minification.
     * @returns {Promise<string>} The built sentence.
     */
    buildSentence = async (sentence, params = {}, extra = {}) => {
      const { get, merge } = this.app.lib._
      if (Array.isArray(sentence)) sentence = sentence.join(' ')
      const { minify, renderString } = this.app.waibuMpa
      if (extra.wrapped) sentence = '<w>' + sentence + '</w>'
      const opts = {
        partial: true,
        ext: params.ext ?? '.html',
        req: this.req,
        reply: this.reply,
        theme: get(this, 'theme.name', 'default'),
        iconset: get(this, 'iconset.name', 'default')
      }
      let html = await renderString(sentence, merge({}, this.locals, params), opts)
      if (extra.wrapped) html = html.slice(3, html.length - 4)
      if (extra.minify) html = await minify(html)
      return html
    }

    /**
     * Hook executed before building a tag.
     * @param {string} tag - The tag name.
     * @param {Object} params - The parameters for the tag.
     */
    beforeBuildTag = async (tag, params) => {}

    /**
     * Hook executed after building a tag.
     * @param {string} tag - The tag name.
     * @param {Object} params - The parameters for the tag.
     */
    afterBuildTag = async (tag, params) => {}

    /**
     * Builds a child tag based on a detector attribute.
     * @async
     * @param {string} detector - The attribute to detect child tags.
     * @param {Object} options - Options for building the child tag.
     * @param {string} [options.tag] - The tag name.
     * @param {Object} options.params - The parameters for the child tag.
     * @param {string} [options.inner] - Inner HTML for the child tag.
     */
    buildChildTag = async (detector, { tag, params, inner }) => {
      const { has, pickBy, omit, keys } = this.app.lib._
      if (has(params.attr, detector)) {
        const [prefix] = detector.split('-')
        const attr = {}
        const html = tag ? params.attr[detector] : undefined
        tag = tag ?? prefix
        const picked = pickBy(params.attr, (v, k) => k.startsWith(`${prefix}-`))
        for (const k in picked) {
          attr[k.slice(prefix.length + 1)] = picked[k]
        }
        const child = await this.buildTag({ tag, params: { attr, html } })
        params.html += `\n${child}`
        const excluded = [detector, ...keys(picked)]
        params.attr = omit(params.attr, excluded)
      }
    }
  }

  this.app.baseClass.MpaComponent = MpaComponent
  return MpaComponent
}

export default componentFactory
