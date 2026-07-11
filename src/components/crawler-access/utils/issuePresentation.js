const TITLES = {
  'robots-not-found': 'robots.txt is missing',
  'robots-unreachable': 'robots.txt could not be evaluated',
  'robots-blocks-all': 'All crawlers are blocked',
  'crawl-delay-high': 'Crawl delay is unusually high',
  'sitemap-not-found': 'No valid sitemap was found',
  'sitemap-not-in-robots': 'Sitemap is not declared in robots.txt',
  'sitemap-parse-error': 'Sitemap could not be parsed',
  'sitemap-empty': 'Sitemap contains no URLs',
  'duplicate-url': 'Duplicate URL appears in sitemaps',
  'redirect-chain': 'Page uses a redirect chain',
  'redirect-loop': 'Page is trapped in a redirect loop',
  'http-error': 'Page returned an HTTP error',
  'slow-response': 'Page response is too slow',
  'noindex-detected': 'Page is marked noindex',
  'noindex-in-sitemap': 'Noindex page is listed in a sitemap',
  'canonical-mismatch': 'Canonical points to another URL',
  'canonical-missing': 'Page has no canonical URL',
  'hreflang-invalid': 'Hreflang annotation is invalid',
  'blocked-in-sitemap': 'Sitemap URL is blocked by robots.txt',
  'ai-crawler-blocked': 'Crawler access is fully blocked',
  'ai-crawler-partial': 'Crawler access is limited',
  'rendered-text-unavailable': 'No readable rendered content was found',
  'llms-txt-missing': 'Missing llms.txt',
  'llms-txt-needs-improvement': 'llms.txt needs improvement'
}

const IMPACTS = {
  'robots-not-found': 'Crawler policy is implicit and harder to audit.',
  'robots-unreachable': 'Crawler permission cannot be determined reliably.',
  'robots-blocks-all': 'Prevents discovery and indexing across the site.',
  'crawl-delay-high': 'Slows crawling and delays fresh-content discovery.',
  'sitemap-not-found': 'Important pages may be discovered more slowly.',
  'sitemap-not-in-robots': 'Crawlers receive a weaker sitemap discovery signal.',
  'sitemap-parse-error': 'URLs in the affected sitemap may not be discovered.',
  'sitemap-empty': 'The sitemap contributes no discoverable pages.',
  'duplicate-url': 'Adds noise and wastes sitemap processing.',
  'redirect-chain': 'Wastes crawl budget and delays the final response.',
  'redirect-loop': 'Makes the destination inaccessible to crawlers.',
  'http-error': 'Crawlers cannot reliably retrieve the page.',
  'slow-response': 'May reduce crawl frequency and user reliability.',
  'noindex-detected': 'Removes the page from index eligibility.',
  'noindex-in-sitemap': 'Sends contradictory discovery and indexing signals.',
  'canonical-mismatch': 'May consolidate visibility signals to another URL.',
  'canonical-missing': 'Makes duplicate-content consolidation less explicit.',
  'hreflang-invalid': 'Language variants may be interpreted incorrectly.',
  'blocked-in-sitemap': 'Advertises a URL that crawlers are forbidden to fetch.',
  'ai-crawler-blocked': 'Prevents the selected crawler from accessing content.',
  'ai-crawler-partial': 'Limits the crawler’s coverage of public content.',
  'rendered-text-unavailable': 'Important content may be invisible to retrieval systems.',
  'llms-txt-missing': 'Misses an optional machine-readable discovery aid.',
  'llms-txt-needs-improvement': 'The file may not communicate key resources clearly.',
  'robots-analysis': 'Makes crawler policy ambiguous or harder to maintain.'
}

const LOW_EFFORT = new Set(['duplicate-url', 'canonical-missing', 'noindex-detected', 'noindex-in-sitemap', 'sitemap-not-in-robots', 'llms-txt-missing', 'llms-txt-needs-improvement'])
const HIGH_EFFORT = new Set(['redirect-loop', 'http-error', 'rendered-text-unavailable'])

export function presentIssue(issue) {
  return {
    ...issue,
    displayTitle: issue.title || TITLES[issue.type] || humanize(issue.type),
    displayEvidence: compact(issue.evidence || 'No supporting evidence was recorded.'),
    impact: issue.impact || IMPACTS[issue.type] || IMPACTS['robots-analysis'],
    affected: formatAffected(issue),
    effort: issue.effort || (LOW_EFFORT.has(issue.type) ? 'Low' : HIGH_EFFORT.has(issue.type) ? 'High' : 'Medium')
  }
}

function formatAffected(issue) {
  const urls = issue.affectedUrls || []
  if (issue.type === 'robots-blocks-all') return 'Whole site'
  if (urls.length) return `${urls.length.toLocaleString()} URL${urls.length === 1 ? '' : 's'}`
  const crawlers = (issue.crawlerAffected || []).filter(value => value !== 'all')
  if (crawlers.length) return `${crawlers.length} crawler${crawlers.length === 1 ? '' : 's'}`
  if (issue.lines?.length) return `${issue.lines.length} line${issue.lines.length === 1 ? '' : 's'}`
  return '—'
}

function compact(value) { return String(value).replace(/\s*\n\s*/g, ' · ').replace(/\s+/g, ' ').trim() }
function humanize(value = 'Crawler issue') { return value.replace(/-/g, ' ').replace(/^./, char => char.toUpperCase()) }
