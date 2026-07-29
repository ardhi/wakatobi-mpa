/* global _ */

class Wmpa {
  constructor () {
    this.lang = '<%= _meta.lang %>'
    this.prefixVirtual = '<%= prefix.virtual %>'
    this.prefixAsset = '<%= prefix.asset %>'
    this.prefixMain = '<%= prefix.main %>'
    this.accessTokenUrl = '<%= accessTokenUrl %>'
    this.renderUrl = '<%= renderUrl %>'
    this.apiPrefix = '<%= api.prefix %>'
    this.apiExt = '<%= api.ext %>'
    this.apiHeaderKey = '<%= api.headerKey %>'
    this.apiDataKey = '<%= api.dataKey %>'
    this.apiRateLimitCount = 0
    this.apiRateLimitDelay = <%= api.rateLimitDelay %>
    this.apiRateLimitRetry = <%= api.rateLimitRetry %>
    this.formatOpts = <%= _jsonStringify(formatOpts, true) %>
    this.fetchingApi = {}
    this.formatterFieldMap = <%= _jsonStringify(formatterFieldMap, true) %>
    this.formatter = {
      metric: {
        speedFn: (val) => val,
        speedUnit: 'kmh',
        distanceFn: (val) => val,
        distanceUnit: 'km',
        areaFn: (val) => val,
        areaUnit: 'km²',
        degreeFn: (val) => val,
        degreeUnit: '°',
        degreeUnitSep: ''
      },
      imperial: {
        speedFn: (val) => val / 1.609,
        speedUnit: 'mih',
        distanceFn: (val) => val / 1.609,
        distanceUnit: 'mi',
        areaFn: (val) => val / 2.59,
        areaUnit: 'mi²',
        degreeFn: (val) => val,
        degreeUnit: '°',
        degreeUnitSep: ''
      },
      nautical: {
        speedFn: (val) => val / 1.852,
        speedUnit: 'kn',
        distanceFn: (val) => val / 1.852,
        distanceUnit: 'nm',
        areaFn: (val) => val / 2.92,
        areaUnit: 'nm²',
        degreeFn: (val) => val,
        degreeUnit: '°',
        degreeUnitSep: ''
      }
    }
    this.init()
  }

  init = () => {
    this.reqId = document.querySelector('meta[name="req-id"]').getAttribute('content')
    window.addEventListener('load', evt => {
      if (window.hljs) window.hljs.highlightAll()
    })
    document.addEventListener('alpine:initializing', () => {
      Alpine.store('wmpa', {
        loading: false,
        reqAborted: null
      })
    })
    if (_.isEmpty(this.accessTokenUrl)) return
    fetch(this.accessTokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' }
    }).then(resp => {
      return resp.text()
    }).then(token => {
      this.accessToken = token
    })
  }

  isSet = (value) => {
    return ![undefined, null].includes(value)
  }

  randomRange = (min, max) => {
    return Math.floor(Math.random() * (max - min + 1) + min)
  }

  randomId = (length = 10, noNum = true) => {
    let result = ''
    let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    if (!noNum) chars += '0123456789'
    const charsLength = chars.length
    let counter = 0
    while (counter < length) {
      result += chars.charAt(Math.floor(Math.random() * charsLength))
      counter += 1
    }
    return result
  }

  fetchRender = async (body, qs = {}) => {
    if (_.isArray(body)) body = body.join('\n')
    let url = this.renderUrl + '?'
    _.forOwn(qs, (v, k) => {
      url += '&' + k + '=' + v
    })
    const opts = {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'X-Referer': window.location.href,
        'X-Req-Id': this.reqId
      },
      body
    }
    if (qs.theme) opts.headers['X-Theme'] = qs.theme
    if (qs.iconset) opts.headers['X-Iconset'] = qs.iconset
    const resp = await fetch(url, opts)
    if (!resp.ok) throw new Error('Response status: ' + resp.status)
    return await resp.text()
  }

  fetchApi = async (endpoint, opts, filter = {}) => {
    let wait = 0
    while(!this.accessToken && wait < 50) {
      wait++
      await this.delay(100)
    }
    Alpine.store('wmpa').reqAborted = null
    const oendpoint = endpoint
    const oopts = _.cloneDeep(opts)
    const ofilter = _.cloneDeep(filter)
    let options = _.cloneDeep(opts) ?? {}
    options.fetching = options.fetching ?? {}
    if (options.fetching) {
      this.fetchingApi[oendpoint] = this.fetchingApi[oendpoint] ?? {}
      if (this.fetchingApi[oendpoint].status === 'fetching') return
      this.fetchingApi[oendpoint].status = 'fetching'
      delete options.fetching
    }
    Alpine.store('wmpa').loading = true
    endpoint = '/' + this.apiPrefix + endpoint + this.apiExt
    options.headers = options.headers ?? {}
    options.headers[this.apiHeaderKey] = this.accessToken
    const abortCtrl = new AbortController()
    options.signal = abortCtrl.signal
    if (this.fetchingApi[oendpoint]) this.fetchingApi[oendpoint].abortCtrl = abortCtrl
    const { mapSearch } = filter
    if (mapSearch) {
      Alpine.store('mapSearch').busy = mapSearch
      delete filter.mapSearch
    }
    const qs = new URLSearchParams(filter)
    endpoint += '?' + qs.toString()
    const req = new Request(endpoint, options)
    let resp
    try {
      resp = await fetch(req)
      const result = await resp.json()
      delete this.fetchingApi[oendpoint]
      Alpine.store('wmpa').loading = false
      if (mapSearch) Alpine.store('mapSearch').busy = false
      if (resp.status >= 500) return []
      if (resp.ok) {
        this.apiRateLimitCount = 0
        return result[this.apiDataKey]
      }
      if (resp.status === 429) {
        this.apiRateLimitCount++
        if (this.apiRateLimitCount > this.apiRateLimitRetry) {
          this.apiRateLimitCount = 0
          return []
        }
        await this.delay(this.apiRateLimitDelay)
        return this.fetchApi(oendpoint, oopts, ofilter)
      } else return []
    } catch (err) {
      if (mapSearch) Alpine.store('mapSearch').busy = false
      if (req.signal.aborted) {
        Alpine.store('wmpa').reqAborted = oendpoint
        this.fetchingApi[oendpoint].status = 'abort:Request aborted'
      }
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        window.location.reload()
      }
      return []
    }
  }

  createComponentFromHtml = (html, opts = {}) => {
    const { wrapper, returnText } = opts
    if (wrapper) html = '<' + wrapper + '>' + html + '</' + wrapper + '>'
    if (returnText) return html
    const tpl = document.createElement('template')
    tpl.innerHTML = html
    return tpl.content.firstElementChild
  }

  getElement = (selector) => {
    return selector instanceof HTMLElement ? selector : document.querySelector(selector)
  }

  createComponent = async (body, opts = {}) => {
    if (_.isArray(body)) body = body.join('\n')
    const { wrapper, returnText, ...options } = opts
    const html = await this.fetchRender(body, options)
    return this.createComponentFromHtml(html, { wrapper, returnText })
  }

  replaceWithComponentHtml = (html, opts = {}) => {
    const { wrapper, selector } = opts
    const cmp = this.createComponentFromHtml(html, { wrapper })
    const el = this.getElement(selector)
    if (!el) return
    el.replaceWith(cmp)
    return cmp.getAttribute('id')
  }

  replaceWithComponent = async (body, opts = {}) => {
    const { selector, wrapper, ...options } = opts
    let cmp
    if (_.isString(body) || _.isArray(body)) cmp = await this.createComponent(body, { wrapper, ...options })
    else cmp = body
    const el = this.getElement(selector)
    if (!el) return
    el.replaceWith(cmp)
    return cmp.getAttribute('id')
  }

  addChild = (selector, cmp, checkChild) => {
    const el = this.getElement(selector)
    if (!el) return
    /*
    if (checkChild) {
      if (!el.hasChildNodes()) el.appendChild(cmp)
    } else el.appendChild(cmp)
    */
    el.appendChild(cmp)
    return cmp.getAttribute('id')
  }

  addComponentHtml = (html, opts = {}) => {
    const { selector = 'body', wrapper, checkChild, ...options } = opts
    const cmp = this.createComponentFromHtml(html, { wrapper, ...options })
    return this.addChild(selector, cmp)
  }

  addComponent = async (body, opts = {}) => {
    const { selector = 'body', wrapper, checkChild, ...options } = opts
    let cmp
    if (_.isString(body) || _.isArray(body)) cmp = await this.createComponent(body, { wrapper, ...options })
    else cmp = body
    return this.addChild(selector, cmp)
  }

  alpineScope = (selector) => {
    if (!selector) selector = '#' + Alpine.store('map').id
    const el = document.querySelector(selector)
    if (!el) return
    return _.get(el, '_x_dataStack.0')
  }

  alpineScopeMethod = (fnName, selector) => {
    const scope = this.alpineScope(selector)
    if (!scope) return
    let [ns, method] = fnName.split('.')
    if (!method) return scope[ns].bind(scope)
    let obj = scope[ns]
    if (_.isFunction(obj)) {
      obj = obj()
      return obj[method].bind(obj)
    }
    return obj[method].bind(scope)
  }

  t = async (...params) => {
    let [text, ...value] = params
    value = value.join('|')
    const body = '<c:t value="' + value + '">' + text + '</c:t>'
    return await this.fetchRender(body)
  }

  copyToClipboard = async (content, isSelector) => {
    if (isSelector) {
      try {
        const el = document.querySelector(content)
        content = el.textContent
      } catch (err) {
        await wbs.notify('Invalid selector!', { type: 'danger' })
        return
      }
    }
    await navigator.clipboard.writeText(content)
  }

  loadScript = async (url) => {
    const script = document.createElement('script')
    script.src = url
    script.type = 'text/javascript'
    document.getElementsByTagName('body')[0].appendChild(script)
  }

  isAsync = (fn) => {
    return fn.constructor.name === 'AsyncFunction'
  }

  parseValue = (value, type) => {
    try {
      if (type === 'boolean') value = value === 'true'
      else if (['integer', 'smallint'].includes(type)) value = parseInt(value)
      else if (['float', 'double'].includes(type)) value = parseFloat(value)
      else if (['datetime', 'date', 'time'].includes(type)) value = new Date(Date.parse(value))
      else if (['array', 'object'].includes(type)) value = JSON.parse(value)
    } catch (err) {}
    return value
  }

  postForm = (params, path, method) => {
    method = method ?? 'POST'
    const form = document.createElement('form')
    form.setAttribute('method', method)
    if (path) form.setAttribute('action', path)
    params._src = window.location.href
    for (const key in params) {
      const input = document.createElement('input')
      input.setAttribute('type', 'hidden')
      input.setAttribute('name', key)
      input.setAttribute('value', params[key]) // TODO: sanitizing
      form.appendChild(input)
    }
    document.body.appendChild(form)
    form.submit()
  }

  delay = async (ms) => {
    return new Promise((resolve) => {
      setTimeout(resolve, ms)
    })
  }

  formatSpeed = (value) => {
    return this.formatByField('speed', value, 'float', { withUnit: false })
  }

  formatDistance = (value) => {
    return this.formatByField('distance', value, 'float', { withUnit: false })
  }

  formatArea = (value) => {
    return this.formatByField('area', value, 'float', { withUnit: false })
  }

  getUnitFormat = (options = {}) => {
    const measure = Alpine.store('map') ? Alpine.store('map').measure : undefined
    let unitSys = options.unitSys ?? measure ?? 'metric'
    if (!['imperial', 'nautical', 'metric'].includes(unitSys)) unitSys = 'metric'
    return { unitSys, format: this.formatter[unitSys] }
  }

  formatByField = (type, value, dataType, options = {}) => {
    const { format } = this.getUnitFormat(options)
    const { withUnit = true } = options
    const lang = options.lang ?? this.lang
    value = format[type + 'Fn'](value)
    const unit = format[type + 'Unit']
    const sep = format[type + 'UnitSep'] ?? ' '
    if (!withUnit) return [value, unit, sep]
    const setting = _.defaultsDeep(options[dataType], this.formatOpts[dataType])
    value = new Intl.NumberFormat(lang, setting).format(value)
    return value + sep + unit
  }

  format = (value, type, opts = {}) => {
    const options = _.cloneDeep(opts)
    const { emptyValue = this.formatOpts.emptyValue } = options
    const lang = options.lang ?? this.lang
    options.withUnit = options.withUnit ?? true
    if ([undefined, null, ''].includes(value)) return emptyValue
    if (type === 'auto') {
      if (value instanceof Date) type = 'datetime'
    }
    if (['float', 'double'].includes(type) && wmapsUtil) {
      if (options.latitude) return wmapsUtil.decToDms(value)
      if (options.longitude) return wmapsUtil.decToDms(value, { isLng: true })
    }
    if (['integer', 'smallint', 'float', 'double'].includes(type)) {
      value = ['integer', 'smallint'].includes(type) ? parseInt(Math.round(value)) : parseFloat(value)
      if (isNaN(value)) return emptyValue
      const setting = _.defaultsDeep(options[type], this.formatOpts[type])
      const field = this.formatterFieldMap[options.field]
      return field ? this.formatByField(field, value, type, options) : new Intl.NumberFormat(lang, setting).format(value)
    }
    if (['datetime', 'date'].includes(type)) {
      const setting = _.defaultsDeep(options[type], this.formatOpts[type])
      setting.timeZone = setting.timeZone ?? this.formatOpts.timeZone
      return new Intl.DateTimeFormat(lang, setting).format(new Date(value))
    }
    if (['time'].includes(type)) {
      const setting = _.defaultsDeep(options.time, this.formatOpts.time)
      setting.timeZone = setting.timeZone ?? this.formatOpts.timeZone
      return new Intl.DateTimeFormat(lang, setting).format(new Date('1970-01-01T' + value + 'Z'))
    }
    if (['array'].includes(type)) return value.join(', ')
    if (['object'].includes(type)) return JSON.stringify(value)
    return value
  }

  formatProps = ({ props = {}, schema = {}, emptyValue = '-' }) => {
    props = _.cloneDeep(props)
    for (const s in schema) {
      if (!_.has(props, s)) props[s] = null
    }
    for (const p in props) {
      if (_.isFunction(schema[p])) props[p] = schema[p](props[p])
      else {
        const [type, subType] = (schema[p] ?? 'auto').split(':')
        const opts = _.cloneDeep(this.formatOpts)
        opts.field = subType ?? p
        if (p === 'lng') opts.longitude = true
        if (p === 'lat') opts.latitude = true
        if (emptyValue) opts.emptyValue = emptyValue
        props[p] = this.format(props[p], type, opts)
      }
    }
    return props
  }

  formatTpl = ({ props = {}, tpl = '', schema = {} }) => {
    props = this.formatProps({ props, schema })
    const compiled = _.isFunction(tpl) ? tpl : _.template(tpl)
    return compiled(props)
  }

  mergeArrays = (arr1, arr2) => {
    return [...arr1.concat(arr2).reduce((m, o) => {
      m.set(o.member, Object.assign(m.get(o.member) || {}, o))
    }, new Map()).values()]
  }

  getAge = (dt, fullView) => {
    const secNum = Math.abs(dayjs().diff(dt, 's'))
    let hours = Math.floor(secNum / 3600)
    let days = Math.floor(hours / 24)
    hours = hours - (days * 24)
    let minutes = Math.floor((secNum - (days * 86400) - (hours * 3600)) / 60)
    let seconds = secNum - (days * 86400) - (hours * 3600) - (minutes * 60)

    if (hours < 10) { hours = '0' + hours }
    if (minutes < 10) { minutes = '0' + minutes }
    if (seconds < 10) { seconds = '0'+ seconds }
    if (!fullView) {
      let parts = minutes + ':' + seconds
      if (days === 0) {
        if (hours !== '00') return hours + ':' + parts
        return parts
      }
      return days + 'd ' + hours + ':' + parts
    }
    return days + 'd ' + hours + ':' + minutes + ':' + seconds
  }

  secToHms = (secs, ms) => {
    let remain
    if (ms) {
      remain = secs % 1000
      secs = Math.floor(secs / 1000)
    }
    const secNum = parseInt(secs, 10)
    const hours = Math.floor(secNum / 3600)
    const minutes = Math.floor(secNum / 60) % 60
    const seconds = secNum % 60

    let hms = [hours, minutes, seconds]
      .map(v => v < 10 ? '0' + v : v)
      .filter((v, i) => v !== '00' || i > 0)
      .join(':')
    if (ms) hms += '+' + _.padStart(remain, 3, '0')
    return hms
  }

  pascalCase = (text) => {
    return _.upperFirst(_.camelCase(text))
  }

  insertString = (text, insertedText, index) => {
    return text.slice(0, index) + insertedText + text.slice(index)
  }

  copyArray = (arr = []) => {
    return [...arr]
  }

  toBase64 = (str) => {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
      function toSolidBytes(match, p1) {
        return String.fromCharCode('0x' + p1)
    }))
  }

  fromBase64 = (str) => {
    return decodeURIComponent(atob(str).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    }).join(''))
  }

  getTableDataset = (selector, ignoreHeader = true) => {
    const table = document.querySelector(selector)
    if (!table) return []
    const data = []
    let row
    for (let i = ignoreHeader ? 1 : 0; row = table.rows[i]; i++) {
      let col
      const d = {}
      for (let j = 0; col = row.cells[j]; j++) {
        if (!col.dataset.key) continue
        let value = col.dataset.value
        if (['integer', 'float', 'smallint', 'double'].includes(col.dataset.type)) value = Number(value)
        else if (col.dataset.type === 'boolean') value = value === 'true'
        d[col.dataset.key] = value
      }
      data.push(d)
    }
    return data
  }
}

const wmpa = new Wmpa() // eslint-disable-line no-unused-vars
window.wmpa = wmpa
if (window._ && window._.VERSION) {
  window._.templateSettings.evaluate = /\{\%(.+?)\%\}/g
  window._.templateSettings.interpolate = /\{\%=(.+?)\%\}/g
  window._.templateSettings.escape = /\{\%-(.+?)\%\}/g
}
