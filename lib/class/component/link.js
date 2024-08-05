async function link ({ params } = {}) {
  const { routePath } = this.plugin.app.waibu
  const { isEmpty } = this._
  params.tag = 'link'
  params.selfClosing = true
  if (isEmpty(params.attr.href)) return
  params.attr.href = routePath(params.attr.href)
}

export default link