/**
 * pageProber.js — Probe discovered pages to collect crawl signals.
 *
 * For a sampled set of URLs from the sitemap (or inferred from the target),
 * this module:
 *   1. Sends HEAD requests to capture status codes, timing, redirects
 *   2. Fetches HTML for a subset to extract meta robots, canonical, hreflang
 *   3. Aggregates results into a summary
 *
 * The sampled approach keeps analysis fast even for large sites.
 */

import { probePage, fetchPage } from './fetchers.js'

/** Max pages to probe with HEAD */
const MAX_PROBE = 50

/** Max pages to GET for HTML analysis */
const MAX_HTML_FETCH = 20

/**
 * Probe a list of discovered URLs.
 *
 * @param {string[]} urls — URLs to probe
 * @param {string} origin — the site origin
 * @returns {object} { probed, summary }
 */
export async function probePages(urls, origin) {
  // Deduplicate
  const unique = [...new Set(urls)]

  // Always include the homepage
  if (!unique.includes(origin) && !unique.includes(origin + '/')) {
    unique.unshift(origin + '/')
  }

  // Sample: take the first MAX_PROBE
  const sample = unique.slice(0, MAX_PROBE)

  // Phase 1: HEAD probe all sampled URLs (parallel, batched)
  const probeResults = await batchProcess(sample, probePage, 10)

  // Phase 2: For the first MAX_HTML_FETCH that returned 200, GET the HTML
  const okUrls = probeResults
    .filter(r => r.status >= 200 && r.status < 300)
    .slice(0, MAX_HTML_FETCH)

  const htmlResults = await batchProcess(
    okUrls.map(r => r.finalUrl || r.url),
    fetchPage,
    5
  )

  // Parse HTML signals from fetched pages
  const pageSignals = htmlResults
    .filter(r => r.ok && r.body)
    .map(r => ({
      url: r.url,
      ...extractHtmlSignals(r.body, r.url, r.headers)
    }))

  // Build summary
  const summary = buildSummary(probeResults, pageSignals)

  return {
    probed: probeResults.map(r => ({
      url: r.url,
      finalUrl: r.finalUrl,
      status: r.status,
      timing: r.timing,
      redirectChain: r.redirectChain,
      error: r.error
    })),
    pageSignals,
    summary,
    sampleSize: sample.length,
    totalDiscovered: unique.length
  }
}

/**
 * Extract crawl-relevant signals from an HTML page body.
 */
export function extractHtmlSignals(html, pageUrl, headers = {}) {
  const result = {
    canonical: null,
    metaRobots: null,
    noindex: false,
    nofollow: false,
    hreflang: [],
    title: null,
    pagination: { prev: null, next: null },
    internalLinks: [],
    xRobotsTag: headers['x-robots-tag'] || null
  }

  if (result.xRobotsTag?.toLowerCase().includes('noindex')) result.noindex = true

  // Extract <title>
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (titleMatch) result.title = titleMatch[1].trim()

  // Extract <link rel="canonical">
  const canonicalMatch = html.match(
    /<link[^>]+rel\s*=\s*["']canonical["'][^>]+href\s*=\s*["']([^"']+)["'][^>]*>/i
  ) || html.match(
    /<link[^>]+href\s*=\s*["']([^"']+)["'][^>]+rel\s*=\s*["']canonical["'][^>]*>/i
  )
  if (canonicalMatch) {
    try {
      result.canonical = new URL(canonicalMatch[1], pageUrl).href
    } catch {
      result.canonical = canonicalMatch[1]
    }
  }

  // Extract <meta name="robots">
  const robotsMatch = html.match(
    /<meta[^>]+name\s*=\s*["']robots["'][^>]+content\s*=\s*["']([^"']+)["'][^>]*>/i
  ) || html.match(
    /<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]+name\s*=\s*["']robots["'][^>]*>/i
  )
  if (robotsMatch) {
    result.metaRobots = robotsMatch[1].toLowerCase()
    result.noindex = result.metaRobots.includes('noindex')
    result.nofollow = result.metaRobots.includes('nofollow')
  }

  // Also check X-Robots-Tag style meta (googlebot, etc)
  const googleBotMeta = html.match(
    /<meta[^>]+name\s*=\s*["']googlebot["'][^>]+content\s*=\s*["']([^"']+)["'][^>]*>/i
  )
  if (googleBotMeta && googleBotMeta[1].toLowerCase().includes('noindex')) {
    result.noindex = true
  }

  // Extract hreflang links
  const hreflangRegex = /<link[^>]+rel\s*=\s*["']alternate["'][^>]+hreflang\s*=\s*["']([^"']+)["'][^>]+href\s*=\s*["']([^"']+)["'][^>]*>/gi
  let hMatch
  while ((hMatch = hreflangRegex.exec(html)) !== null) {
    try {
      result.hreflang.push({
        lang: hMatch[1],
        href: new URL(hMatch[2], pageUrl).href
      })
    } catch {
      result.hreflang.push({ lang: hMatch[1], href: hMatch[2] })
    }
  }

  // Also try reverse attribute order
  const hreflangRegex2 = /<link[^>]+hreflang\s*=\s*["']([^"']+)["'][^>]+href\s*=\s*["']([^"']+)["'][^>]+rel\s*=\s*["']alternate["'][^>]*>/gi
  while ((hMatch = hreflangRegex2.exec(html)) !== null) {
    const href = (() => { try { return new URL(hMatch[2], pageUrl).href } catch { return hMatch[2] } })()
    if (!result.hreflang.some(h => h.lang === hMatch[1] && h.href === href)) {
      result.hreflang.push({ lang: hMatch[1], href })
    }
  }

  // Extract pagination rel=prev/next
  const prevMatch = html.match(
    /<link[^>]+rel\s*=\s*["']prev["'][^>]+href\s*=\s*["']([^"']+)["'][^>]*>/i
  )
  const nextMatch = html.match(
    /<link[^>]+rel\s*=\s*["']next["'][^>]+href\s*=\s*["']([^"']+)["'][^>]*>/i
  )
  if (prevMatch) result.pagination.prev = prevMatch[1]
  if (nextMatch) result.pagination.next = nextMatch[1]

  const origin = (() => { try { return new URL(pageUrl).origin } catch { return '' } })()
  const links = new Set()
  const anchorRegex = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi
  let anchorMatch
  while ((anchorMatch = anchorRegex.exec(html)) !== null && links.size < 100) {
    try {
      const link = new URL(anchorMatch[1], pageUrl)
      if (link.origin !== origin || !['http:', 'https:'].includes(link.protocol)) continue
      link.hash = ''
      links.add(link.href)
    } catch { /* Ignore invalid and non-HTTP links. */ }
  }
  result.internalLinks = [...links]

  return result
}

function buildSummary(probeResults, pageSignals) {
  const statuses = {}
  let totalTiming = 0
  let timedCount = 0
  let redirectCount = 0
  let errorCount = 0

  for (const r of probeResults) {
    const bucket = r.status === 0
      ? 'error'
      : `${Math.floor(r.status / 100)}xx`
    statuses[bucket] = (statuses[bucket] || 0) + 1

    if (r.timing > 0) {
      totalTiming += r.timing
      timedCount++
    }
    if (r.redirectChain?.length > 0) redirectCount++
    if (r.error) errorCount++
  }

  const noindexCount = pageSignals.filter(p => p.noindex).length
  const canonicalMismatchCount = pageSignals.filter(p => {
    if (!p.canonical) return false
    try {
      return new URL(p.canonical).href !== new URL(p.url).href
    } catch {
      return p.canonical !== p.url
    }
  }).length

  return {
    statusCodes: statuses,
    avgResponseTime: timedCount > 0 ? Math.round(totalTiming / timedCount) : null,
    redirectChains: redirectCount,
    errors: errorCount,
    noindexPages: noindexCount,
    canonicalMismatches: canonicalMismatchCount,
    pagesProbed: probeResults.length,
    pagesAnalyzed: pageSignals.length
  }
}

/**
 * Process items in parallel batches.
 */
async function batchProcess(items, fn, batchSize) {
  const results = []
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(item => fn(item)))
    results.push(...batchResults)
  }
  return results
}
