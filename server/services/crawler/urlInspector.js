import { CRAWLER_CATALOG } from '../../../shared/crawlers.js'
import { renderInspectionPage } from '../layers/playwright.js'
import { fetchText } from './fetchers.js'
import { extractHtmlSignals } from './pageProber.js'
import { parseRobotsTxt, evaluateCrawler } from './robotsParser.js'
import { parseSitemaps } from './sitemapParser.js'

export async function inspectCrawlerUrl({ url, robots, sitemaps, issueSource = 'robots.txt' }) {
  const rendered = await renderInspectionPage(url)
  const signals = rendered.html ? extractHtmlSignals(rendered.html, rendered.finalUrl || url) : emptySignals()
  const xRobotsTag = rendered.headers['x-robots-tag'] || null
  const noindex = signals.noindex || /(?:^|[,:\s])noindex(?:$|[,:\s])/i.test(xRobotsTag || '')
  const normalizedUrl = normalizeUrl(url)
  const inSitemap = (sitemaps?.urls || []).some(entry => normalizeUrl(entry.loc) === normalizedUrl)
  const groups = robots?.parsed?.groups || robots?.rules || []
  const robotsState = getRobotsState(robots)
  const issues = []
  const bots = {}
  const policyAvailabilityIssue = robotsState === 'available' ? null : {
    id: robotsState === 'missing' ? 'robots-not-found' : 'robots-unreachable',
    type: robotsState === 'missing' ? 'robots-not-found' : 'robots-unreachable',
    title: robotsState === 'missing' ? 'robots.txt was not found' : 'robots.txt could not be evaluated',
    severity: 'warning',
    confidence: 'definite',
    affectedUrls: [`${new URL(url).origin}/robots.txt`],
    evidence: robotsState === 'missing' ? 'No robots.txt policy was available; RFC default access applies.' : 'The robots.txt request failed, so crawler policy is unknown.',
    recommendation: robotsState === 'missing' ? 'Publish a robots.txt file to make crawler policy explicit.' : 'Restore a successful robots.txt response and run the inspection again.',
    crawlerAffected: ['all'],
    source: issueSource
  }
  if (policyAvailabilityIssue) issues.push(policyAvailabilityIssue)

  for (const crawler of CRAWLER_CATALOG) {
    const result = evaluateCrawler(groups, crawler.token, url, robotsState)
    const issueIds = []
    if (result.coverage === 'none') {
      const issue = permissionIssue(crawler, result, url, 'critical', 'ai-crawler-blocked', issueSource)
      issues.push(issue)
      issueIds.push(issue.id)
    } else if (result.coverage === 'partial') {
      const issue = permissionIssue(crawler, result, url, 'warning', 'ai-crawler-partial', issueSource)
      issues.push(issue)
      issueIds.push(issue.id)
    } else if (result.coverage === 'unknown' && policyAvailabilityIssue) {
      issueIds.push(policyAvailabilityIssue.id)
    } else if (robotsState === 'missing' && policyAvailabilityIssue) {
      issueIds.push(policyAvailabilityIssue.id)
    }

    bots[crawler.id] = {
      access: result.access,
      coverage: result.coverage,
      ruleSource: result.ruleSource,
      matchedRule: result.matchedRule,
      effectiveRules: result.effectiveRules,
      issueIds,
      simulation: null
    }
  }

  if (rendered.status >= 400 || rendered.status === 0) {
    issues.push({
      id: `http-error-${hash(url)}`,
      type: 'http-error',
      title: rendered.status ? `URL returned HTTP ${rendered.status}` : 'URL could not be reached',
      severity: rendered.status >= 500 || rendered.status === 0 ? 'critical' : 'warning',
      confidence: 'definite',
      affectedUrls: [url],
      evidence: rendered.status ? `HTTP ${rendered.status}` : rendered.error || 'No HTTP response',
      recommendation: 'Resolve the server, authentication, firewall, or URL error preventing a successful response.',
      crawlerAffected: ['all'],
      source: issueSource
    })
  }
  if (noindex) {
    issues.push({
      id: `noindex-${hash(url)}`,
      type: 'noindex-detected',
      title: 'Page is marked noindex',
      severity: inSitemap ? 'critical' : 'warning',
      confidence: 'definite',
      affectedUrls: [url],
      evidence: xRobotsTag ? `X-Robots-Tag: ${xRobotsTag}` : `meta robots: ${signals.metaRobots}`,
      recommendation: 'Remove noindex if this page should be eligible for search and answer-engine visibility.',
      crawlerAffected: ['Googlebot', 'bingbot', 'OAI-SearchBot', 'Claude-SearchBot', 'PerplexityBot'],
      source: issueSource
    })
  }
  if (!rendered.bodyText.trim() && rendered.status >= 200 && rendered.status < 300) {
    issues.push({
      id: `rendered-text-unavailable-${hash(url)}`,
      type: 'rendered-text-unavailable',
      title: 'No readable rendered text detected',
      severity: 'warning',
      confidence: 'high',
      affectedUrls: [url],
      evidence: 'The rendered page body did not expose readable text.',
      recommendation: 'Ensure important content is present in rendered HTML and is not hidden behind unsupported interactions.',
      crawlerAffected: ['all'],
      source: issueSource
    })
  }

  return {
    url,
    testedAt: new Date().toISOString(),
    mode: 'policy',
    shared: {
      httpStatus: rendered.status,
      finalUrl: rendered.finalUrl,
      redirects: rendered.redirects,
      canonical: signals.canonical,
      noindex,
      robotsDirectives: { meta: signals.metaRobots, header: xRobotsTag },
      inSitemap,
      renderedTextAvailable: !!rendered.bodyText.trim(),
      renderedWordCount: countWords(rendered.bodyText),
      error: rendered.error
    },
    bots,
    issues: dedupeIssues(issues)
  }
}

export async function analyzeStandaloneInspection({ url, expectedOrigin }) {
  const parsedUrl = new URL(url)
  const origin = new URL(expectedOrigin).origin
  if (parsedUrl.origin !== origin) throw new Error('URL must use the analyzed site origin.')

  const robotsUrl = `${origin}/robots.txt`
  const robotsResponse = await fetchText(robotsUrl)
  const robotsFound = robotsResponse.ok && robotsResponse.status === 200
  const parsed = robotsFound ? parseRobotsTxt(robotsResponse.body) : null
  const robots = {
    found: robotsFound,
    status: robotsResponse.status,
    error: robotsResponse.error,
    parsed,
    rules: parsed?.groups || []
  }
  const sitemaps = await parseSitemaps(origin, parsed?.sitemapReferences || [])
  return inspectCrawlerUrl({ url: parsedUrl.href, origin, robots, sitemaps, issueSource: 'URL inspection' })
}

function permissionIssue(crawler, result, url, severity, type, source) {
  const paths = result.effectiveRules.filter(rule => rule.type === 'disallow').map(rule => rule.path)
  const blockedHere = result.access === 'blocked'
  return {
    id: `crawler-policy-${crawler.id}-${hash(url)}`,
    type,
    title: `${crawler.name} ${result.coverage === 'none' ? 'is fully blocked' : result.coverage === 'unknown' ? 'could not be evaluated' : 'has limited coverage'}`,
    severity,
    confidence: result.coverage === 'unknown' ? 'low' : 'definite',
    affectedUrls: blockedHere ? [url] : paths,
    evidence: result.matchedRule
      ? `${result.matchedRule.type === 'allow' ? 'Allow' : 'Disallow'}: ${result.matchedRule.path} (line ${result.matchedRule.line})`
      : result.coverage === 'unknown' ? 'robots.txt could not be fetched reliably.' : `Disallowed paths: ${paths.join(', ')}`,
    recommendation: `Review the effective robots.txt rules for ${crawler.name} and allow important public content where appropriate.`,
    crawlerAffected: [crawler.token],
    source
  }
}

function getRobotsState(robots) {
  if (robots?.found) return 'available'
  if (!robots || robots.status === 0 || robots.status >= 500 || robots.error) return 'unreachable'
  return 'missing'
}

function emptySignals() {
  return { canonical: null, metaRobots: null, noindex: false }
}

function normalizeUrl(value) {
  try {
    const url = new URL(value)
    return `${url.origin}${url.pathname.replace(/\/+$/, '') || '/'}${url.search}`
  } catch {
    return value
  }
}

function countWords(value) {
  return value.trim() ? value.trim().split(/\s+/).length : 0
}

function hash(value) {
  let result = 0
  for (let index = 0; index < value.length; index++) result = ((result << 5) - result + value.charCodeAt(index)) | 0
  return Math.abs(result).toString(36)
}

function dedupeIssues(issues) {
  return [...new Map(issues.map(issue => [issue.id, issue])).values()]
}
