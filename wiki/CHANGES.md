# Changes

## 2026-07-04

- [2.23.0] Reorganize projects to reduce boot time

## 2026-07-01

- [2.22.0] Remove ```bajo-config``` dependency

## 2026-06-30

- [2.21.1] Bug fix in ```wmpa.js```

## 2026-06-20

- [2.21.0] Add ```renderView()```
- [2.21.0] Change ```reply.view()``` to use ```renderView()``` above
- [2.21.0] Add ```403.html```
- [2.21.0] Bug fix in ```error-handler.js```
- [2.21.0] Bug fix in ```not-found-handler.js```

## 2026-06-19

- [2.20.2] Bug fix in ```not-found-handler.js```

## 2026-06-18

- [2.20.1] Bug fix in ```build-route.js```

## 2026-06-12

- [2.20.0] Necessary updates to ```bajo@2.18.0``` specs

## 2026-06-10

- [2.19.0] Remove route redirects because now directly handled by ```waibu```
- [2.19.0] Bug fix in ```page-end``` widget

## 2026-06-05

- [2.18.2] Bug fix in ```error-handler.js```
- [2.18.2] Bug fix in ```page-end``` widget

## 2026-06-04

- [2.18.1] Bug fix in ```component.buildTag()```

## 2026-06-03

- [2.18.0] Populate ```widget.model``` if available
- [2.18.0] If route's url ends with ```index```, rewrite url to use it's folder instead

## 2026-06-01

- [2.17.1] Bug fix in ```component.buildTag()```

## 2026-05-28

- [2.17.0] Change hooks to be written in one ```hook.js``` file
- [2.17.0] Change model schemas to be written in one ```model.js``` file

## 2026-05-25

- [2.16.0] Add theme & iconset auto detection mechanism
- [2.16.0] Add page expiration & reload through ```routeOptions.config.refreshDur``` or ```config.page.refreshDur```

## 2026-05-22

- [2.15.2] Bug fix in ```error-handler.js```
- [2.15.2] Bug fix in ```component.buildTag()```

## 2026-05-16

- [2.15.1] Bug fix in ```component.js```

## 2026-05-11

- [2.15.0] Updates to match ```dobo@2.23.0``` specs
- [2.15.0] Bug fix in ```jsonStringify()```
- [2.15.0] Bug fix in ```component.js```
- [2.15.0] Bug fix in ```widget.js```

## 2026-04-21

- [2.14.2] Bug fix in ```Component.beforeBuildTag()```  and ```Component.afterBuildTag()```

## 2026-04-18

- [2.14.1] Bug fix in ```getRef()``` in ```MpaWidget```
- [2.14.1] Bug fix in ```getRefName()``` in ```MpaWidget```

## 2026-04-17

- [2.14.0] Add data binding properties to ```Widget``` base class
- [2.14.0] Add ```Widget.getRef()```
- [2.14.0] Add ```Widget.getRefValue()```
- [2.14.0] Add ```Widget.getRefName()```
- [2.14.0] Add ```Widget.getSetting()```

## 2026-04-11

- [2.13.2] Bug fix in ```Wmpa.parseValue()```
- [2.13.2] Bug fix in ```Widget.plugin``` now match the right plugin

## 2026-04-07

- [2.13.0] Bug fix in ```component.buildOptions()```

## 2026-04-02

- [2.13.0] Changes in widget's static ```css```, ```scripts``` etc, now can be a function that callable with scope to its component

## 2026-03-30

- [2.12.0] Add inter site module support

## 2026-03-27

- [2.11.0] Add options to enable cache with Bajo Cache module
- [2.11.0] Change all ```cacheMaxAge``` keys to ```ttlDur``` to align with above mentioned cache engine

## 2026-03-22

- [2.10.1] Bug fix in applying routes to ```webCtx```

## 2026-03-19

- [2.10.0] Add ```options-separator``` to use different separator than the default one (```;```)

## 2026-03-15

- [2.9.2] Bug fix in ```favicon``` handler
- [2.9.2] Bug fix in ```logo``` route

## 2026-03-13

- [2.9.1] Bug fix in route ```logo```. If nothing found at all, defaults to waibu logos

## 2026-03-11

- [2.9.0] Add default ```configDev``` and ```configProd```

## 2026-03-08

- [2.8.3] Bug fix in ```getAppTitle()```
- [2.8.3] Bug fix in ```getPluginTitle()```

## 2026-03-07

- [2.8.0] Add favicon route
- [2.8.0] Update logo route to search in ```site``` attachment with fallback to ```main``` location
- [2.8.1] Update favicon behaviour: if no file in ```main``` then use the default one
- [2.8.2] Cleanup debugging message

## 2026-03-05

- [2.7.0] New params structure for component functions in ```wmpa.js```

## 2026-03-03

- [2.6.4] Bug fix in ```wmpa.addComponent()```

## 2026-03-02

- [2.6.3] Bug fix in ```applyFormat()```. In ```dev``` environment, prettier & minifier should be disabled

## 2026-02-22

- [2.6.2] Bug fix in frontend's timezone

## 2026-02-21

- [2.6.1] Bug fix in ```errorHandler```
- [2.6.1] Bug fix in ```notFoundHandler```
- [2.6.1] Add fallback template for both handlers above

## 2026-02-18

- [2.6.0] Add auto trashing old session
- [2.6.0] Remove unecessary ```expires``` field in ```WmpaSession```
- [2.6.0] Change component's ```buildOptions()``` to async method to accomodate ```prop.values``` as a handler
- [2.6.0] Bug fix in theme and iconset resolver

## 2026-02-18

- [2.5.0] Move ```attrTo*()``` and ```base64Json*()``` to ```waibu``` because they are sometimes needed outside the ```waibu-mpa```
- [2.5.0] Bug fix in ```component.buildOptions()```
- [2.5.1] Bug fix in ```component.buildOptions()```

## 2026-02-17

- [2.4.3] Bug fix in ```req.theme``` and ```req.iconset``` resolver

## 2026-02-10

- [2.4.2] Put ```bajo-config``` as dependency

## 2026-02-09

- [2.3.0] Add ```config.page.scriptsAtEndOfBody``` to put scripts at the end of body or not. Defaults to ```true```
- [2.3.0] Add not found & error handlers
- [2.3.0] Bug fix in old context
- [2.3.0] Bug fix in ```loadResource()```
- [2.3.0] Bug fix in ```<link />``` injection
- [2.3.0] Bug fix in order of metas, links & scripts
- [2.4.0] Add ```anchor``` and ```navigation``` icons
- [2.4.0] Add dark mode auto detect right at inject elements
- [2.4.1] Bug fix in ```parseAttribs()```
- [2.4.1] Attribute mutations (href, src, action) now accept url with parameter


## 2026-02-05

- [2.1.11] Bug fix in rendering ```preconnect```

## 2026-01-21

- [2.1.8] Add ```getPluginTitle()```
- [2.1.8] Bug fix in ```getAppTitle()```
- [2.1.8] Rework on all title handlers
- [2.1.9] Favicon handling

## 2026-01-19

- [2.1.6] Bug fix in ```getAppTitle()```
- [2.1.7] Change default cookie ```maxAge``` to 7 days

## 2026-01-18

- [2.1.5] Dark mode should only be handle by a hook

## 2026-01-17

- [2.1.3] Bug fix in ```getAppTitle()```
- [2.1.4] Add capability to set custom theme & iconset through headers

## 2026-01-13

- [2.1.1] Bug fix in waibuMpa's widgeting system

## 2026-01-08

- [2.1.0] Upgrade to ```node-emoji@2.2.0```
- [2.1.0] Upgrade to ```prettier@2.7.4```
- [2.1.0] Upgrade to ```tring-strip-html@13.5.0```

## 2025-12-30

- [2.1.0] Ported to match ```bajo@2.2.x``` specs
