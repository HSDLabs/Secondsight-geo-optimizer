import { CRAWLER_CATALOG, CRAWLER_BY_ID, CRAWLER_BY_TOKEN } from '../../../shared/crawlers.js'

export { CRAWLER_CATALOG, CRAWLER_BY_ID, CRAWLER_BY_TOKEN }
export const AI_CRAWLERS = CRAWLER_CATALOG.map(crawler => ({ ...crawler, ua: crawler.token, desc: crawler.description }))
export const getScoreTone = value => value >= 80 ? 'good' : value >= 55 ? 'warning' : 'poor'

export function getBotStatusLabel(robots, botUa) {
  const status = robots.aiCrawlerPermissions?.[botUa] || robots.aiCrawlerPermissions?.['*'] || 'allowed'
  return status === 'blocked' ? 'Blocked' : status === 'partially-blocked' ? 'Limited' : 'Allowed'
}

export function getBotRulesContent(robots, botUa) {
  const specific = robots.rules?.find(group => group.userAgent.toLowerCase() === botUa.toLowerCase())
  const wildcard = robots.rules?.find(group => group.userAgent === '*')
  const group = specific || wildcard
  if (!group?.rules?.length) return `User-agent: ${botUa}\n# No matching rules; access is allowed by default.`
  return [`User-agent: ${group.userAgent}`, ...group.rules.map(rule => `${rule.type === 'allow' ? 'Allow' : 'Disallow'}: ${rule.path}`)].join('\n')
}

export function getProbedDetails(pages, issues, locUrl) {
  const normalize = value => String(value || '').replace(/\/$/, '')
  const probed = pages?.probed?.find(page => normalize(page.url) === normalize(locUrl))
  const signals = pages?.pageSignals?.find(page => normalize(page.url) === normalize(locUrl) || normalize(page.url) === normalize(probed?.finalUrl))
  const blocked = issues?.some(issue => issue.type === 'blocked-in-sitemap' && issue.affectedUrls?.some(url => normalize(url) === normalize(locUrl)))
  return { status: probed?.status || null, timing: probed?.timing || 0, noindex: !!signals?.noindex, blocked, error: probed?.error, canonical: signals?.canonical, internalLinks: signals?.internalLinks || [], finalUrl: probed?.finalUrl }
}

export function buildDiscoveryGraph(crawlerData) {
  if (!crawlerData?.origin) return { graphNodes: [], graphLinks: [], canvasWidth: 760, canvasHeight: 320, nodeMap: new Map(), sampled: false }
  const { origin, sitemaps = {}, pages = {} } = crawlerData
  const nodes = new Map()
  const links = new Map()
  const addNode = node => { if (!nodes.has(node.id)) nodes.set(node.id, node); else nodes.set(node.id, { ...nodes.get(node.id), ...node }) }
  const addLink = (source, target, type) => { if (source !== target) links.set(`${source}|${target}|${type}`, { source, target, type }) }
  const pageId = url => `page:${normalizeUrl(url)}`
  const siteId = `site:${origin}`
  addNode({ id: siteId, name: new URL(origin).hostname, url: origin, type: 'site', status: 'indexable', depth: 0 })

  const sitemapEntries = (sitemaps.discovered || []).filter(item => item.ok).slice(0, 12)
  sitemapEntries.forEach(item => {
    const id = `sitemap:${normalizeUrl(item.url)}`
    addNode({ id, name: shortPath(item.url), url: item.url, type: 'sitemap', status: 'indexable', depth: 1, source: 'Sitemap discovery' })
    addLink(siteId, id, 'sitemap')
  })

  const visibleEntries = (sitemaps.urls || []).slice(0, 50)
  visibleEntries.forEach(entry => {
    const id = pageId(entry.loc)
    addNode({ id, name: shortPath(entry.loc), url: entry.loc, type: 'page', status: entry.classification || 'unverified', httpStatus: entry.httpStatus, canonical: entry.canonical, depth: 2, source: shortPath(entry.source), inSitemap: true })
    const sourceId = `sitemap:${normalizeUrl(entry.source)}`
    if (nodes.has(sourceId)) addLink(sourceId, id, 'sitemap')
  })

  ;(pages.pageSignals || []).slice(0, 20).forEach(signal => {
    const sourceId = pageId(signal.url)
    const detail = getPageStatus(signal.url, crawlerData)
    addNode({ id: sourceId, name: shortPath(signal.url), url: signal.url, type: 'page', status: detail.status, httpStatus: detail.httpStatus, canonical: signal.canonical, internalLinks: signal.internalLinks || [], depth: nodes.has(sourceId) ? nodes.get(sourceId).depth : 2, source: nodes.has(sourceId) ? nodes.get(sourceId).source : 'Page probe' })
    ;(signal.internalLinks || []).slice(0, 12).forEach(target => {
      const targetId = pageId(target)
      if (!nodes.has(targetId) && nodes.size < 70) addNode({ id: targetId, name: shortPath(target), url: target, type: 'page', status: 'unverified', depth: 3, source: `Linked from ${shortPath(signal.url)}` })
      if (nodes.has(targetId)) addLink(sourceId, targetId, 'internal-link')
    })
    if (signal.canonical && normalizeUrl(signal.canonical) !== normalizeUrl(signal.url)) {
      const targetId = pageId(signal.canonical)
      if (!nodes.has(targetId) && nodes.size < 70) addNode({ id: targetId, name: shortPath(signal.canonical), url: signal.canonical, type: 'page', status: 'unverified', depth: 3, source: 'Canonical target' })
      if (nodes.has(targetId)) addLink(sourceId, targetId, 'canonical')
    }
  })

  ;(pages.probed || []).forEach(probe => {
    if (!probe.finalUrl || normalizeUrl(probe.finalUrl) === normalizeUrl(probe.url)) return
    const sourceId = pageId(probe.url); const targetId = pageId(probe.finalUrl)
    if (!nodes.has(sourceId) && nodes.size < 70) addNode({ id: sourceId, name: shortPath(probe.url), url: probe.url, type: 'page', status: 'redirect', depth: 2, httpStatus: probe.status })
    if (!nodes.has(targetId) && nodes.size < 70) addNode({ id: targetId, name: shortPath(probe.finalUrl), url: probe.finalUrl, type: 'page', status: 'unverified', depth: 3 })
    if (nodes.has(sourceId) && nodes.has(targetId)) addLink(sourceId, targetId, 'redirect')
  })

  const graphNodes = [...nodes.values()]
  const graphLinks = [...links.values()]
  const depths = new Map()
  graphNodes.forEach(node => { if (!depths.has(node.depth)) depths.set(node.depth, []); depths.get(node.depth).push(node) })
  const maxRows = Math.max(...[...depths.values()].map(items => items.length), 1)
  depths.forEach((items, depth) => items.sort((a, b) => a.name.localeCompare(b.name)).forEach((node, index) => { node.x = 70 + depth * 230; node.y = 36 + index * 48 + (maxRows - items.length) * 24 }))
  const nodeMap = new Map(graphNodes.map(node => [node.id, node]))
  graphNodes.forEach(node => { node.incoming = graphLinks.filter(link => link.target === node.id).length; node.outgoing = graphLinks.filter(link => link.source === node.id).length })
  return { graphNodes, graphLinks, nodeMap, canvasWidth: Math.max(760, (Math.max(...graphNodes.map(node => node.depth), 0) + 1) * 230 + 170), canvasHeight: Math.max(320, maxRows * 48 + 72), sampled: (pages.totalDiscovered || 0) > (pages.sampleSize || 0) || sitemaps.responseCapped }
}

function getPageStatus(url, crawlerData) {
  const entry = crawlerData.sitemaps?.urls?.find(item => normalizeUrl(item.loc) === normalizeUrl(url))
  const probe = crawlerData.pages?.probed?.find(item => normalizeUrl(item.url) === normalizeUrl(url))
  const signal = crawlerData.pages?.pageSignals?.find(item => normalizeUrl(item.url) === normalizeUrl(url))
  if (entry?.classification) return { status: entry.classification, httpStatus: entry.httpStatus }
  if (signal?.noindex) return { status: 'noindex', httpStatus: probe?.status }
  if (probe?.error || probe?.status >= 400) return { status: 'error', httpStatus: probe?.status }
  if (signal && probe?.status >= 200 && probe.status < 400) return { status: 'indexable', httpStatus: probe.status }
  return { status: 'unverified', httpStatus: probe?.status }
}

function normalizeUrl(value) { try { const url = new URL(value); url.hash = ''; return url.href.replace(/\/$/, '') } catch { return String(value || '').replace(/\/$/, '') } }
function shortPath(value) { try { const url = new URL(value); return `${url.pathname}${url.search}` || '/' } catch { return String(value || '') } }
