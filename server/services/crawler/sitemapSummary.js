import { evaluateCrawler } from './robotsParser.js'

export function classifySitemapUrls({ urls = [], pages = {}, robots = {} }) {
  const probes = new Map((pages.probed || []).map(item => [normalize(item.url), item]))
  const signals = new Map((pages.pageSignals || []).map(item => [normalize(item.url), item]))
  const robotsState = robots.found ? 'available' : robots.status === 404 ? 'missing' : 'unreachable'
  const groups = robots.parsed?.groups || robots.rules || []

  const classifiedUrls = urls.map(entry => {
    const key = normalize(entry.loc)
    const probe = probes.get(key)
    const signal = signals.get(key) || (probe?.finalUrl ? signals.get(normalize(probe.finalUrl)) : null)
    const policy = evaluateCrawler(groups, '*', entry.loc, robotsState)
    let classification = 'unverified'
    if (policy.access === 'blocked') classification = 'blocked'
    else if (signal?.noindex) classification = 'noindex'
    else if (probe?.error || (probe && (probe.status === 0 || probe.status >= 400))) classification = 'error'
    else if (probe && probe.status >= 200 && probe.status < 400 && signal) classification = 'indexable'

    return { ...entry, classification, httpStatus: probe?.status || null, noindex: !!signal?.noindex, canonical: signal?.canonical || null, robotsAccess: policy.access, verified: classification !== 'unverified' }
  })

  const counts = Object.fromEntries(['indexable', 'noindex', 'blocked', 'error', 'unverified'].map(key => [key, classifiedUrls.filter(url => url.classification === key).length]))
  const total = classifiedUrls.length
  const inspected = total - counts.unverified
  return {
    urls: classifiedUrls,
    summary: { total, ...counts, errors: counts.error, inspected, inspectedPercentage: total ? Math.round((inspected / total) * 1000) / 10 : 0 }
  }
}

function normalize(value) {
  try { const url = new URL(value); url.hash = ''; return url.href.replace(/\/$/, '') }
  catch { return String(value || '').replace(/\/$/, '') }
}
