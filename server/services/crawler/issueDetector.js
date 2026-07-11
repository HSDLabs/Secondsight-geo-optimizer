/**
 * issueDetector.js — Cross-reference all crawler data to produce normalized issues.
 *
 * Every issue follows the contract:
 * { id, type, severity, confidence, affectedUrls, evidence, recommendation, crawlerAffected, source }
 */

import { isPathAllowed } from './robotsParser.js'

export function detectIssues({ robots, sitemaps, pages, origin, urlInspection }) {
  const issues = []
  const add = (issue) => issues.push(issue)

  // ── robots.txt issues ──
  if (!robots.found) {
    add({ id: 'robots-not-found', type: 'robots-not-found', severity: 'warning', confidence: 'definite', affectedUrls: [`${origin}/robots.txt`], evidence: 'No robots.txt file was found at the expected location.', recommendation: 'Create a robots.txt file at the site root to guide crawlers.', crawlerAffected: ['all'], source: 'robots.txt' })
  } else {
    // Check if robots blocks all crawlers
    const wildcardGroup = robots.parsed.groups.find(g => g.userAgent === '*')
    if (wildcardGroup?.rules.some(r => r.type === 'disallow' && r.path === '/') && !wildcardGroup.rules.some(r => r.type === 'allow')) {
      add({ id: 'robots-blocks-all', type: 'robots-blocks-all', severity: 'critical', confidence: 'definite', affectedUrls: ['/'], evidence: 'User-agent: *\nDisallow: /', recommendation: 'Remove the blanket Disallow: / rule unless you intentionally want to block all crawlers.', crawlerAffected: ['all'], source: 'robots.txt' })
    }

    // High crawl delays
    for (const [agent, delay] of Object.entries(robots.parsed.crawlDelays)) {
      if (delay >= 10) {
        add({ id: `crawl-delay-${agent.toLowerCase()}`, type: 'crawl-delay-high', severity: 'warning', confidence: 'definite', affectedUrls: [], evidence: `Crawl-delay: ${delay} for ${agent}`, recommendation: `A crawl delay of ${delay}s is very high. Consider reducing it to allow faster indexing.`, crawlerAffected: [agent], source: 'robots.txt' })
      }
    }
  }

  // ── sitemap issues ──
  if (sitemaps.discovered.length === 0 || sitemaps.discovered.every(s => !s.ok)) {
    add({ id: 'sitemap-not-found', type: 'sitemap-not-found', severity: 'warning', confidence: 'high', affectedUrls: [`${origin}/sitemap.xml`], evidence: 'No valid sitemap was found.', recommendation: 'Create a sitemap.xml to help search engines discover your pages.', crawlerAffected: ['all'], source: 'sitemap' })
  }

  if (robots.found && robots.parsed.sitemapReferences.length === 0 && sitemaps.discovered.some(s => s.ok)) {
    add({ id: 'sitemap-not-in-robots', type: 'sitemap-not-in-robots', severity: 'warning', confidence: 'definite', affectedUrls: [], evidence: 'A sitemap exists but is not referenced in robots.txt.', recommendation: 'Add a Sitemap: directive to robots.txt pointing to your sitemap.', crawlerAffected: ['all'], source: 'robots.txt' })
  }

  for (const err of sitemaps.errors) {
    add({ id: `sitemap-error-${hash(err.url)}`, type: 'sitemap-parse-error', severity: 'warning', confidence: 'definite', affectedUrls: [err.url], evidence: `Parse error: ${err.error}`, recommendation: 'Fix the XML syntax in your sitemap file.', crawlerAffected: ['all'], source: 'sitemap' })
  }

  if (sitemaps.totalUrls === 0 && sitemaps.discovered.some(s => s.ok)) {
    add({ id: 'sitemap-empty', type: 'sitemap-empty', severity: 'warning', confidence: 'definite', affectedUrls: sitemaps.discovered.filter(s => s.ok).map(s => s.url), evidence: 'Sitemap was found but contains no URLs.', recommendation: 'Add URLs to your sitemap.', crawlerAffected: ['all'], source: 'sitemap' })
  }

  // Duplicate URLs in sitemap
  for (const dup of sitemaps.health.duplicateUrls) {
    add({ id: `dup-sitemap-${hash(dup.url)}`, type: 'duplicate-url', severity: 'info', confidence: 'definite', affectedUrls: [dup.url], evidence: `URL appears ${dup.count} times in sitemaps.`, recommendation: 'Remove duplicate entries from your sitemap.', crawlerAffected: ['all'], source: 'sitemap' })
  }

  // ── page probe issues ──
  if (pages) {
    for (const p of pages.probed) {
      // Redirect chains (3+ hops)
      if (p.redirectChain?.length >= 3) {
        add({ id: `redirect-chain-${hash(p.url)}`, type: 'redirect-chain', severity: 'warning', confidence: 'definite', affectedUrls: [p.url, ...p.redirectChain.map(r => r.url)], evidence: `${p.redirectChain.length}-hop redirect chain: ${p.redirectChain.map(r => `${r.status} → ${r.location}`).join(' → ')}`, recommendation: 'Reduce the redirect chain to a single redirect.', crawlerAffected: ['all'], source: 'pages' })
      }

      if (p.error === 'redirect-loop') {
        add({ id: `redirect-loop-${hash(p.url)}`, type: 'redirect-loop', severity: 'critical', confidence: 'definite', affectedUrls: [p.url], evidence: 'Redirect loop detected — exceeded 10 hops.', recommendation: 'Fix the redirect configuration to prevent loops.', crawlerAffected: ['all'], source: 'pages' })
      }

      // HTTP errors
      if (p.status >= 400) {
        add({ id: `http-error-${hash(p.url)}`, type: 'http-error', severity: p.status >= 500 ? 'critical' : 'warning', confidence: 'definite', affectedUrls: [p.url], evidence: `HTTP ${p.status}`, recommendation: p.status === 404 ? 'Remove this URL from sitemaps or fix the broken page.' : `Investigate and fix the ${p.status} error.`, crawlerAffected: ['all'], source: 'pages' })
      }

      // Slow response
      if (p.timing > 3000) {
        add({ id: `slow-${hash(p.url)}`, type: 'slow-response', severity: 'warning', confidence: 'high', affectedUrls: [p.url], evidence: `Response took ${p.timing}ms`, recommendation: 'Optimize server response time to under 2 seconds.', crawlerAffected: ['all'], source: 'pages' })
      }
    }

    // Page signal issues
    for (const ps of pages.pageSignals) {
      // noindex pages
      if (ps.noindex) {
        add({ id: `noindex-${hash(ps.url)}`, type: 'noindex-detected', severity: 'warning', confidence: 'definite', affectedUrls: [ps.url], evidence: `meta robots: ${ps.metaRobots}`, recommendation: 'Remove noindex if this page should be visible to search engines.', crawlerAffected: ['all'], source: 'pages' })

        // noindex AND in sitemap
        const inSitemap = sitemaps.urls.some(u => normalizeForCompare(u.loc) === normalizeForCompare(ps.url))
        if (inSitemap) {
          add({ id: `noindex-in-sitemap-${hash(ps.url)}`, type: 'noindex-in-sitemap', severity: 'critical', confidence: 'definite', affectedUrls: [ps.url], evidence: 'Page has noindex but is listed in the sitemap.', recommendation: 'Either remove noindex or remove the URL from the sitemap. These signals contradict each other.', crawlerAffected: ['all'], source: 'sitemap' })
        }
      }

      // Canonical mismatches
      if (ps.canonical) {
        if (normalizeForCompare(ps.canonical) !== normalizeForCompare(ps.url)) {
          add({ id: `canonical-mismatch-${hash(ps.url)}`, type: 'canonical-mismatch', severity: 'warning', confidence: 'high', affectedUrls: [ps.url], evidence: `Page URL: ${ps.url}\nCanonical: ${ps.canonical}`, recommendation: 'Ensure the canonical URL matches the page URL unless intentionally consolidating.', crawlerAffected: ['Googlebot', 'Bingbot'], source: 'pages' })
        }
      } else {
        add({ id: `canonical-missing-${hash(ps.url)}`, type: 'canonical-missing', severity: 'info', confidence: 'high', affectedUrls: [ps.url], evidence: 'No canonical tag found.', recommendation: 'Add a self-referencing canonical tag to prevent duplicate content issues.', crawlerAffected: ['Googlebot', 'Bingbot'], source: 'pages' })
      }

      // Hreflang missing return links
      if (ps.hreflang?.length > 0) {
        for (const hl of ps.hreflang) {
          if (!hl.href) {
            add({ id: `hreflang-invalid-${hash(ps.url)}-${hl.lang}`, type: 'hreflang-invalid', severity: 'warning', confidence: 'high', affectedUrls: [ps.url], evidence: `hreflang="${hl.lang}" has no href.`, recommendation: 'Every hreflang annotation must include a valid href.', crawlerAffected: ['Googlebot'], source: 'pages' })
          }
        }
      }
    }

    // robots vs sitemap: URLs in sitemap that are blocked by robots
    if (robots.found && sitemaps.urls.length > 0) {
      for (const su of sitemaps.urls.slice(0, 200)) {
        try {
          const path = new URL(su.loc).pathname
          if (!isPathAllowed(robots.parsed.groups, '*', path)) {
            add({ id: `blocked-in-sitemap-${hash(su.loc)}`, type: 'blocked-in-sitemap', severity: 'critical', confidence: 'definite', affectedUrls: [su.loc], evidence: `URL is in sitemap but blocked by robots.txt for User-agent: *`, recommendation: 'Either allow this path in robots.txt or remove it from the sitemap.', crawlerAffected: ['all'], source: 'robots.txt' })
          }
        } catch { /* invalid URL — skip */ }
      }
    }
  }

  const combined = [...(urlInspection?.issues || []), ...issues]
  return [...new Map(combined.map(issue => [`${issue.type}|${(issue.affectedUrls || []).join('|')}`, issue])).values()]
}

function hash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36)
}

function normalizeForCompare(url) {
  try {
    const u = new URL(url)
    return `${u.protocol}//${u.hostname}${u.pathname.replace(/\/+$/, '') || '/'}${u.search}`
  } catch { return url }
}
