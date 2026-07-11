import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeRobotsTxt } from './robotsAnalyzer.js'
import { classifySitemapUrls } from './sitemapSummary.js'
import { validateLlmsTxt } from './llmsTxt.js'
import { extractHtmlSignals } from './pageProber.js'
import { buildLlmsIssues } from './index.js'
import { presentIssue } from '../../../src/pages/crawler-access/issuePresentation.js'

test('robots analysis counts syntax and attaches stable conflict issues to both lines', () => {
  const result = analyzeRobotsTxt(`# global\nUser-agent: *\nAllow: /private\nDisallow: /private\nDisallow: /\nUnknown-thing: value`)
  assert.equal(result.summary.totalRules, 3)
  assert.equal(result.summary.comments, 1)
  assert.equal(result.summary.userAgentGroups, 1)
  assert.equal(result.summary.allowRules, 1)
  assert.equal(result.summary.disallowRules, 2)
  const conflict = result.issues.find(issue => issue.title === 'Conflicting robots.txt rules')
  assert.deepEqual(conflict.lines, [4, 3])
  assert.ok(result.lines[3].issueIds.includes(conflict.id))
  assert.ok(result.issues.some(issue => issue.title === 'Crawler access fully blocked'))
  assert.ok(result.issues.some(issue => issue.title === 'Unknown robots.txt directive'))
})

test('robots analysis flags duplicate, malformed, and out-of-group rules', () => {
  const result = analyzeRobotsTxt(`Disallow: /tmp\nnot a directive\nUser-agent: GPTBot\nAllow: /docs\nAllow: /docs`)
  assert.ok(result.issues.some(issue => issue.title === 'Rule outside a user-agent group'))
  assert.ok(result.issues.some(issue => issue.title === 'Malformed robots.txt directive'))
  assert.ok(result.issues.some(issue => issue.title === 'Duplicate robots.txt rule'))
})

test('sitemap status precedence is blocked, noindex, indexable, error, then unverified', () => {
  const urls = ['/blocked', '/hidden', '/good', '/broken', '/unknown'].map(path => ({ loc: `https://example.com${path}`, source: 'https://example.com/sitemap.xml' }))
  const result = classifySitemapUrls({
    urls,
    robots: { found: true, status: 200, parsed: { groups: [{ userAgent: '*', rules: [{ type: 'disallow', path: '/blocked', line: 2 }] }] } },
    pages: {
      probed: [
        { url: urls[1].loc, status: 200 }, { url: urls[2].loc, status: 200 }, { url: urls[3].loc, status: 500 }
      ],
      pageSignals: [{ url: urls[1].loc, noindex: true }, { url: urls[2].loc, noindex: false }]
    }
  })
  assert.deepEqual(result.urls.map(url => url.classification), ['blocked', 'noindex', 'indexable', 'error', 'unverified'])
  assert.deepEqual(result.summary, { total: 5, indexable: 1, noindex: 1, blocked: 1, error: 1, unverified: 1, errors: 1, inspected: 4, inspectedPercentage: 80 })
})

test('llms.txt validator checks title, sections, links, and duplicates', () => {
  const good = validateLlmsTxt(`# Example\n\n> A useful site.\n\n## Guides\n- [Start](https://example.com/start): Begin here.`)
  assert.equal(good.valid, true)
  assert.equal(good.stats.links, 1)
  const weak = validateLlmsTxt(`## Links\n- [One](/one)\n- [One again](/one)`, 'https://example.com')
  assert.equal(weak.valid, false)
  assert.ok(weak.recommendations.some(item => item.includes('duplicate')))
})

test('HTML signals include same-origin links and X-Robots noindex', () => {
  const result = extractHtmlSignals(`<a href="/one">One</a><a href="https://other.example/two">Two</a><a href="/one#section">Again</a>`, 'https://example.com/page', { 'x-robots-tag': 'noindex, follow' })
  assert.equal(result.noindex, true)
  assert.deepEqual(result.internalLinks, ['https://example.com/one'])
})

test('llms.txt findings are included without affecting their informational priority', () => {
  const missing = buildLlmsIssues({ found: false, url: 'https://example.com/llms.txt', error: null })
  assert.equal(missing[0].type, 'llms-txt-missing')
  assert.equal(missing[0].severity, 'info')
  const valid = buildLlmsIssues({ found: true, url: 'https://example.com/llms.txt', validation: { score: 90, gaps: [] } })
  assert.deepEqual(valid, [])
})

test('issue presentation provides clean action-queue fields', () => {
  const issue = presentIssue({ type: 'noindex-in-sitemap', severity: 'critical', affectedUrls: ['https://example.com/a'], evidence: 'Page has noindex\nbut is listed.', recommendation: 'Remove one contradictory signal.' })
  assert.equal(issue.displayTitle, 'Noindex page is listed in a sitemap')
  assert.equal(issue.affected, '1 URL')
  assert.equal(issue.effort, 'Low')
  assert.equal(issue.displayEvidence, 'Page has noindex · but is listed.')
})
