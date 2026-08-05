/**
 * Configuration object
 *
 * @typedef {Object} TConfig
 * @type {Object}
 * @property {Object} [waibu={}] - Waibu configuration
 * @property {string} [waibu.prefix=''] - Prefix for Waibu routes
 * @property {Object} [waibuAdmin={}] - Waibu Admin configuration
 * @property {boolean} [waibuAdmin.menuHandler=false] - Enable or disable menu handler
 * @property {string} [waibuAdmin.modelDisabled='*'] - Disable specific models
 * @property {boolean} [mountMainAsRoot=true] - Mount main app as root
 * @property {Object} [page={}] - Page configuration
 * @property {string} [page.charset='utf-8'] - Character set for pages
 * @property {Object} [page.cache={}] - Cache configuration for pages
 * @property {number} [page.cache.ttlDur=0] - Time-to-live duration for cache in milliseconds
 * @property {Array<string>} [page.cache.urls=[]] - URLs to cache
 * @property {string} [page.refreshDur='1d'] - Duration to refresh pages in milliseconds
 * @property {boolean} [page.insertWarning=false] - Insert warning
 * @property {boolean} [page.usePluginTitle=false] - Use plugin title
 * @property {boolean} [page.scriptsAtEndOfBody=true] - Place scripts at the end of the body
 * @property {Object} [darkMode={}] - Dark mode configuration
 * @property {string|null} [darkMode.set=null] - Dark mode set
 * @property {string} [darkMode.qsKey='dark-mode'] - Query string key for dark mode
 * @property {Object} [intl={}] - Internationalization configuration
 * @property {Array<string>} [intl.detectors=['qs']] - Detectors for internationalization
 * @property {Object} [session={}] - Session configuration
 * @property {string} [session.secret='f703a74b884b539e78c642a5369fe538'] - Secret for session
 * @property {string} [session.cookieName='sid'] - Cookie name for session
 * @property {Object} [session.cookie={}] - Cookie configuration for session
 * @property {string} [session.cookie.secure='auto'] - Secure flag for cookie
 * @property {number} [session.cookie.maxAge=604800000] - Max age for cookie in milliseconds
 * @property {boolean} [session.saveUninitialized=false] - Save uninitialized sessions
 * @property {string} [session.trashOldDur='5m'] - Duration to trash old sessions
 * @property {boolean} [emoji=true] - Enable or disable emoji support
 * @property {Object} [viewEngine={}] - View engine configuration
 * @property {Object} [viewEngine.layout={}] - Layout configuration for view engine
 * @property {string} [viewEngine.layout.default='waibuMpa:/default.html'] - Default layout template
 * @property {boolean} [viewEngine.layout.fallback=true] - Fallback to default layout if not found
 * @property {Object} [theme={}] - Theme configuration
 * @property {string|null} [theme.set=null] - Theme set
 * @property {Object} [theme.autoInsert={}] - Auto insert configuration for theme
 * @property {boolean} [theme.autoInsert.css=true] - Auto insert CSS
 * @property {boolean} [theme.autoInsert.meta=true] - Auto insert meta tags
 * @property {boolean} [theme.autoInsert.scripts=true] - Auto insert scripts
 * @property {boolean} [theme.autoInsert.links=true] - Auto insert links
 * @property {boolean} [theme.autoInsert.inlineScript=true] - Auto insert inline scripts
 * @property {boolean} [theme.autoInsert.inlineCss=true] - Auto insert inline CSS
 * @property {Object} [theme.component={}] - Component configuration for theme
 * @property {string} [theme.component.unknownTag='replaceWithDiv'] - Behavior for unknown tags in components
 * @property {string} [theme.component.ttlDur='1m'] - Time-to-live duration for components in milliseconds
 * @property {Object} [iconset={}] - Iconset configuration
 * @property {string|null} [iconset.set=null] - Iconset set
 * @property {Object} [iconset.autoInsert={}] - Auto insert configuration for iconset
 * @property {boolean} [iconset.autoInsert.css=true] - Auto insert CSS for iconset
 * @property {boolean} [iconset.autoInsert.scripts=true] - Auto insert scripts for iconset
 * @property {boolean} [iconset.autoInsert.links=true] - Auto insert links for iconset
 * @property {boolean} [iconset.autoInsert.inlineScript=true] - Auto insert inline scripts for iconset
 * @property {boolean} [iconset.autoInsert.inlineCss=true] - Auto insert inline CSS for iconset
 * @property {Object} [concatResource={}] - Concatenation resource configuration
 * @property {number} [concatResource.ttlDur=0] - Time-to-live duration for concatenated resources in milliseconds
 * @property {Array<string>} [concatResource.excluded=[]] - Excluded resources from concatenation
 * @property {boolean} [concatResource.css=false] - Concatenate CSS resources
 * @property {boolean} [concatResource.scripts=false] - Concatenate script resources
 * @property {boolean} [concatResource.links=false] - Concatenate link resources
 * @property {Object} [cheerio={}] - Cheerio configuration
 * @property {Object} [cheerio.loadOptions={}] - Load options for Cheerio
 * @property {Object} [cheerio.loadOptions.xml={}] - XML load options for Cheerio
 * @property {boolean} [cheerio.loadOptions.xml.xmlMode=false] - XML mode for Cheerio
 * @property {boolean} [cheerio.loadOptions.xml.decodeEntities=false] - Decode entities for Cheerio
 * @property {boolean} [cheerio.loadOptions.xml.recognizeSelfClosing=true] - Recognize self-closing tags for Cheerio
 * @property {Object} [asset={}] - App asset configuration
 * @property {string|boolean} [asset.dirRoute='/~'] - Asset route. Set to `false` to disable asset route
 * @property {number|string} [asset.maxAgeDur='1d'] - Max age duration for assets in milliseconds
 * @property {Object} [prettier={}] - Prettier configuration
 * @property {number} [prettier.printWidth=80] - Prettier print width
 * @property {string} [prettier.parser='html'] - Prettier parser
 * @property {Object} [minifier={}] - Minifier configuration
 * @property {boolean} [minifier.removeAttributeQuotes=true] - Remove attribute quotes in minified HTML
 * @property {boolean} [minifier.removeComments=true] - Remove comments in minified HTML
 * @property {boolean} [minifier.removeCommentsFromCDATA=true] - Remove comments from CDATA in minified HTML
 * @property {boolean} [minifier.removeCDATASectionsFromCDATA=true] - Remove CDATA sections from CDATA in minified HTML
 * @property {boolean} [minifier.collapseWhitespace=true] - Collapse whitespace in minified HTML
 * @property {boolean} [minifier.conservativeCollapse=true] - Conservative collapse of whitespace in minified HTML
 * @property {boolean} [minifier.decodeEntities=true] - Decode entities in minified HTML
 * @property {boolean} [minifier.collapseBooleanAttributes=true] - Collapse boolean attributes in minified HTML
 * @property {boolean} [minifier.removeRedundantAttributes=true] - Remove redundant attributes in minified HTML
 * @property {boolean} [minifier.removeEmptyAttributes=true] - Remove empty attributes in minified HTML
 * @property {Object} [multipart={}] - Multipart configuration
 * @property {Object} [cors={}] - CORS configuration
 * @property {Object} [helmet={}] - Helmet configuration
 * @property {boolean|Object} [compress=false] - Compression configuration
 * @property {boolean|Object} [rateLimit=false] - Rate limit configuration
 * @property {Array<string>} [disabled=[]] - Disabled features
 * @property {string} [reqTtlDur='1d'] - Request time-to-live duration in milliseconds
 */
export const config = {
  waibu: {
    prefix: ''
  },
  waibuAdmin: {
    menuHandler: false,
    modelDisabled: '*'
  },
  mountMainAsRoot: true,
  page: {
    charset: 'utf-8',
    cache: {
      ttlDur: 0,
      urls: []
    },
    refreshDur: '1d',
    insertWarning: false,
    usePluginTitle: false,
    scriptsAtEndOfBody: true
  },
  darkMode: {
    set: null,
    qsKey: 'dark-mode'
  },
  intl: {
    detectors: ['qs']
  },
  asset: {
    dirRoute: '/~',
    maxAgeDur: '1h'
  },
  session: {
    secret: 'f703a74b884b539e78c642a5369fe538',
    cookieName: 'sid',
    cookie: {
      secure: 'auto',
      maxAge: 86400 * 7 * 1000
    },
    saveUninitialized: false,
    trashOldDur: '5m'
  },
  emoji: true,
  viewEngine: {
    layout: {
      default: 'waibuMpa:/default.html',
      fallback: true
    }
  },
  theme: {
    set: null,
    autoInsert: {
      css: true,
      meta: true,
      scripts: true,
      links: true,
      inlineScript: true,
      inlineCss: true
    },
    component: {
      unknownTag: 'replaceWithDiv',
      ttlDur: '1m'
    }
  },
  iconset: {
    set: null,
    autoInsert: {
      css: true,
      scripts: true,
      links: true,
      inlineScript: true,
      inlineCss: true
    }
  },
  concatResource: {
    ttlDur: 0,
    excluded: [],
    css: false,
    scripts: false,
    links: false
  },
  cheerio: {
    loadOptions: {
      xml: {
        xmlMode: false,
        decodeEntities: false,
        recognizeSelfClosing: true
      }
    }
  },
  prettier: {
    parser: 'html',
    printWidth: 120
  },
  minifier: {
    removeAttributeQuotes: true,
    removeComments: true,
    removeCommentsFromCDATA: true,
    removeCDATASectionsFromCDATA: true,
    collapseWhitespace: true,
    conservativeCollapse: true,
    decodeEntities: true,
    collapseBooleanAttributes: true,
    removeRedundantAttributes: true,
    removeEmptyAttributes: true
  },
  multipart: {},
  cors: {},
  helmet: {
    contentSecurityPolicy: false
  },
  compress: false,
  rateLimit: false,
  disabled: [],
  reqTtlDur: '1d'
}

/**
 * Configuration object for development environment
 *
 * @typedef {Object} TConfigDev
 * @type {TConfig}
 */
export const configDev = {
  minifier: false,
  page: {
    insertWarning: true
  }
}

/**
 * Configuration object for production environment
 *
 * @typedef {Object} TConfigProd
 * @type {TConfig}
 */
export const configProd = {
  theme: {
    component: {
      unknownTag: 'remove',
      ttlDur: '5m'
    }
  },
  prettier: false,
  compress: {},
  rateLimit: {}
}
