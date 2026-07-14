const GROUP_ORDER = ['home', 'categories', 'products', 'articles', 'other']

const GROUP_LABELS = {
  home: 'Home',
  categories: 'Categories',
  products: 'Products',
  articles: 'Articles',
  other: 'Other'
}

const CATEGORY_SEGMENTS = new Set(['category', 'categories', 'collection', 'collections', 'shop', 'w'])
const PRODUCT_SEGMENTS = new Set(['product', 'products', 'p', 't', 'dp', 'item'])
const ARTICLE_SEGMENTS = new Set(['blog', 'article', 'articles', 'news', 'stories', 'help'])

/** @typedef {'home'|'categories'|'products'|'articles'|'other'} DiscoveryGroupId */
/** @typedef {{ id: DiscoveryGroupId, label: string, count: number, inspected: number, healthy: number, attention: number, blocked: number }} DiscoveryGroup */
/** @typedef {{ url: string, path: string, group: DiscoveryGroupId, status: string, inSitemap: boolean, robotsAccess: string, httpStatus: number|null, canonical: string|null, noindex: boolean, redirected: boolean, inspected: boolean, linkEvidenceInspected: boolean, incoming: string[], outgoing: string[], issues: object[] }} DiscoveryRecord */
/** @typedef {{ returned: number, total: number, inspected: number, responseCapped: boolean, sampled: boolean }} SamplingSummary */

export function buildDiscoveryExplorerModel(crawlerData) {
  const origin = normalizeOrigin(crawlerData?.origin || crawlerData?.url)
  if (!origin) return emptyModel()

  const records = new Map()
  const ensure = value => {
    const url = normalizeUrl(value, origin)
    if (!url) return null
    if (!records.has(url)) records.set(url, baseRecord(url, origin))
    return records.get(url)
  }

  ensure(origin)

  for (const item of crawlerData?.sitemaps?.urls || []) {
    const record = ensure(item.loc)
    if (!record) continue
    Object.assign(record, {
      inSitemap: true,
      sitemapSource: item.source || null,
      status: item.classification || record.status,
      robotsAccess: item.robotsAccess || record.robotsAccess,
      httpStatus: item.httpStatus || record.httpStatus,
      canonical: item.canonical || record.canonical,
      noindex: Boolean(item.noindex),
      inspected: Boolean(item.verified || item.httpStatus)
    })
  }

  const probes = new Map()
  for (const probe of crawlerData?.pages?.probed || []) {
    const record = ensure(probe.url)
    if (!record) continue
    probes.set(record.url, probe)
    record.httpStatus = probe.status || record.httpStatus
    record.error = probe.error || null
    record.finalUrl = probe.finalUrl ? normalizeUrl(probe.finalUrl, origin) : record.url
    record.redirected = Boolean(record.finalUrl && record.finalUrl !== record.url)
    record.inspected = true
    if (record.error || record.httpStatus >= 400) record.status = 'error'
    else if (record.redirected) record.status = 'redirect'
  }

  const signals = new Map()
  const edgeKeys = new Set()
  const relationships = []
  for (const signal of crawlerData?.pages?.pageSignals || []) {
    const source = ensure(signal.url)
    if (!source) continue
    signals.set(source.url, signal)
    source.canonical = signal.canonical || source.canonical
    source.noindex = Boolean(signal.noindex)
    source.inspected = true
    source.linkEvidenceInspected = true
    if (source.noindex) source.status = 'noindex'

    for (const targetValue of signal.internalLinks || []) {
      const target = ensure(targetValue)
      if (!target || target.url === source.url) continue
      const key = `${source.url}|${target.url}`
      if (edgeKeys.has(key)) continue
      edgeKeys.add(key)
      relationships.push({ source: source.url, target: target.url, type: 'internal-link' })
      source.outgoing.push(target.url)
      target.incoming.push(source.url)
      target.linkEvidenceInspected = true
    }
  }

  const issuesByUrl = new Map()
  for (const issue of crawlerData?.issues || []) {
    for (const affected of issue.affectedUrls || []) {
      const url = normalizeUrl(affected, origin)
      if (!url) continue
      if (!issuesByUrl.has(url)) issuesByUrl.set(url, [])
      issuesByUrl.get(url).push(issue)
    }
  }

  for (const record of records.values()) {
    record.issues = issuesByUrl.get(record.url) || []
    record.incoming = unique(record.incoming)
    record.outgoing = unique(record.outgoing)
    record.group = classifyDiscoveryUrl(record.url, origin)
    record.path = displayPath(record.url)
    record.health = healthFor(record)
    if (record.status === 'unverified' && record.inspected && record.httpStatus >= 200 && record.httpStatus < 400) record.status = 'indexable'
  }

  const recordList = [...records.values()].sort((a, b) => {
    const groupDelta = GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group)
    return groupDelta || a.path.localeCompare(b.path)
  })

  const groups = GROUP_ORDER.map(id => {
    const items = recordList.filter(record => record.group === id)
    return {
      id,
      label: GROUP_LABELS[id],
      count: items.length,
      inspected: items.filter(record => record.inspected).length,
      healthy: items.filter(record => record.health === 'healthy').length,
      attention: items.filter(record => record.health === 'attention').length,
      blocked: items.filter(record => record.health === 'blocked').length
    }
  })

  const returned = recordList.length
  const total = Math.max(crawlerData?.sitemaps?.summary?.total || crawlerData?.sitemaps?.totalUrls || 0, returned)
  const sampling = {
    returned,
    total,
    inspected: recordList.filter(record => record.inspected).length,
    responseCapped: Boolean(crawlerData?.sitemaps?.responseCapped),
    sampled: Boolean(crawlerData?.sitemaps?.responseCapped || (crawlerData?.pages?.totalDiscovered || 0) > (crawlerData?.pages?.sampleSize || 0))
  }

  return { origin, groups, records: recordList, relationships, sampling, probes, signals }
}

export function classifyDiscoveryUrl(value, originValue) {
  const url = safeUrl(value, originValue)
  const origin = safeUrl(originValue)
  if (!url) return 'other'
  if (origin && url.origin === origin.origin && normalizePath(url.pathname) === '/') return 'home'
  const segments = url.pathname.toLowerCase().split('/').filter(Boolean)
  if (segments.some(segment => CATEGORY_SEGMENTS.has(segment))) return 'categories'
  if (segments.some(segment => PRODUCT_SEGMENTS.has(segment)) || isSkuLikeProductPath(segments)) return 'products'
  if (segments.some(segment => ARTICLE_SEGMENTS.has(segment))) return 'articles'
  return 'other'
}

export function filterDiscoveryRecords(records, { group = 'home', query = '', filters = [] } = {}) {
  const normalizedQuery = query.trim().toLowerCase()
  const active = new Set(filters)
  return records.filter(record => {
    if (group && group !== 'all' && record.group !== group) return false
    if (normalizedQuery && !`${record.url} ${record.path}`.toLowerCase().includes(normalizedQuery)) return false
    if (active.has('blocked') && record.robotsAccess !== 'blocked' && record.status !== 'blocked') return false
    if (active.has('no-links') && !(record.group !== 'home' && record.linkEvidenceInspected && record.incoming.length === 0)) return false
    if (active.has('noindex') && !record.noindex) return false
    if (active.has('redirected') && !record.redirected) return false
    if (active.has('errors') && !(record.error || record.httpStatus >= 400 || record.status === 'error')) return false
    if (active.has('in-sitemap') && !record.inSitemap) return false
    return true
  })
}

export function buildLocalGraph(model, selectedUrl, maxNeighbors = 12) {
  const selected = model.records.find(record => record.url === selectedUrl)
  if (!selected || !selected.linkEvidenceInspected) return { nodes: [], links: [], hiddenCount: 0, available: false }
  const issueUrls = new Set(model.records.filter(record => record.issues.length).map(record => record.url))
  const neighbors = unique([...selected.incoming, ...selected.outgoing])
    .sort((a, b) => Number(issueUrls.has(b)) - Number(issueUrls.has(a)))
  const visible = neighbors.slice(0, maxNeighbors)
  const visibleSet = new Set([selected.url, ...visible])
  const nodes = [selected, ...visible.map(url => model.records.find(record => record.url === url)).filter(Boolean)]
  const links = model.relationships.filter(link => visibleSet.has(link.source) && visibleSet.has(link.target) && (link.source === selected.url || link.target === selected.url))
  return { nodes, links, hiddenCount: Math.max(0, neighbors.length - visible.length), available: true }
}

function emptyModel() {
  return { origin: '', groups: GROUP_ORDER.map(id => ({ id, label: GROUP_LABELS[id], count: 0, inspected: 0, healthy: 0, attention: 0, blocked: 0 })), records: [], relationships: [], sampling: { returned: 0, total: 0, inspected: 0, responseCapped: false, sampled: false }, probes: new Map(), signals: new Map() }
}

function baseRecord(url, origin) {
  return { url, path: displayPath(url), group: classifyDiscoveryUrl(url, origin), status: 'unverified', health: 'attention', inSitemap: false, sitemapSource: null, robotsAccess: 'unknown', httpStatus: null, canonical: null, noindex: false, redirected: false, finalUrl: url, error: null, inspected: false, linkEvidenceInspected: false, incoming: [], outgoing: [], issues: [] }
}

function healthFor(record) {
  if (record.status === 'blocked' || record.status === 'error' || record.robotsAccess === 'blocked' || record.httpStatus >= 400) return 'blocked'
  if (record.status === 'indexable' && !record.noindex && !record.redirected) return 'healthy'
  return 'attention'
}

function isSkuLikeProductPath(segments) {
  if (segments.length < 2) return false
  const terminal = segments.at(-1) || ''
  const hasProductHint = segments.some(segment => /^(sku|style|buy|detail|pd)$/.test(segment))
  const hasSku = /(?=.*[a-z])(?=.*\d)[a-z0-9]{5,}(?:-[a-z0-9]{2,})?/i.test(terminal)
  return hasProductHint && hasSku
}

function normalizeOrigin(value) {
  const url = safeUrl(value)
  return url ? url.origin : ''
}

export function normalizeDiscoveryUrl(value, origin) {
  return normalizeUrl(value, origin)
}

function normalizeUrl(value, origin) {
  const url = safeUrl(value, origin)
  if (!url || !['http:', 'https:'].includes(url.protocol)) return ''
  url.hash = ''
  url.pathname = normalizePath(url.pathname)
  return url.href
}

function normalizePath(pathname) {
  const value = pathname.replace(/\/{2,}/g, '/').replace(/\/$/, '')
  return value || '/'
}

function safeUrl(value, base) {
  try { return new URL(value, base) } catch { return null }
}

function displayPath(value) {
  const url = safeUrl(value)
  return url ? `${url.pathname}${url.search}` || '/' : String(value || '')
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}
