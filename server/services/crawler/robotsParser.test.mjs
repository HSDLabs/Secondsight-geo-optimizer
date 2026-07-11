import test from 'node:test'
import assert from 'node:assert/strict'
import { CRAWLER_CATALOG } from '../../../shared/crawlers.js'
import { evaluateCrawler, parseRobotsTxt } from './robotsParser.js'

test('uses the supported reference crawler catalog', () => {
  assert.deepEqual(CRAWLER_CATALOG.map(crawler => crawler.token), [
    'OAI-SearchBot', 'GPTBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User',
    'Claude-SearchBot', 'Googlebot', 'Google-Extended', 'bingbot', 'PerplexityBot'
  ])
})

test('merges repeated matching groups and preserves rule lines', () => {
  const parsed = parseRobotsTxt('User-agent: GPTBot\nDisallow: /one\n\nUser-agent: gptbot\nDisallow: /two')
  const result = evaluateCrawler(parsed.groups, 'GPTBot', '/two/page')
  assert.equal(result.effectiveRules.length, 2)
  assert.equal(result.matchedRule.path, '/two')
  assert.equal(result.matchedRule.line, 5)
})

test('falls back to wildcard only when no specific group exists', () => {
  const parsed = parseRobotsTxt('User-agent: *\nDisallow: /private\nUser-agent: GPTBot\nAllow: /')
  assert.equal(evaluateCrawler(parsed.groups, 'GPTBot', '/private').access, 'allowed')
  assert.equal(evaluateCrawler(parsed.groups, 'ClaudeBot', '/private').access, 'blocked')
})

test('uses longest match and lets Allow win equivalent matches', () => {
  const parsed = parseRobotsTxt('User-agent: *\nDisallow: /docs\nAllow: /docs/public\nDisallow: /same\nAllow: /same')
  assert.equal(evaluateCrawler(parsed.groups, 'Googlebot', '/docs/public/a').access, 'allowed')
  assert.equal(evaluateCrawler(parsed.groups, 'Googlebot', '/docs/private').access, 'blocked')
  assert.equal(evaluateCrawler(parsed.groups, 'Googlebot', '/same').access, 'allowed')
})

test('supports wildcard, end anchor, query strings, and percent-normalized paths', () => {
  const parsed = parseRobotsTxt('User-agent: *\nDisallow: /*.pdf$\nDisallow: /search?draft=\nDisallow: /docs/beta')
  assert.equal(evaluateCrawler(parsed.groups, 'bingbot', '/guide.pdf').access, 'blocked')
  assert.equal(evaluateCrawler(parsed.groups, 'bingbot', '/guide.pdf?download=1').access, 'allowed')
  assert.equal(evaluateCrawler(parsed.groups, 'bingbot', '/search?draft=true').access, 'blocked')
  assert.equal(evaluateCrawler(parsed.groups, 'bingbot', '/docs/%62eta').access, 'blocked')
})

test('reports full, partial, none, and unknown coverage', () => {
  const full = parseRobotsTxt('User-agent: *\nAllow: /')
  const partial = parseRobotsTxt('User-agent: *\nDisallow: /private')
  const none = parseRobotsTxt('User-agent: *\nDisallow: /')
  const exception = parseRobotsTxt('User-agent: *\nDisallow: /\nAllow: /public')
  assert.equal(evaluateCrawler(full.groups, 'Googlebot', '/').coverage, 'full')
  assert.equal(evaluateCrawler(partial.groups, 'Googlebot', '/').coverage, 'partial')
  assert.equal(evaluateCrawler(none.groups, 'Googlebot', '/').coverage, 'none')
  assert.equal(evaluateCrawler(exception.groups, 'Googlebot', '/public').coverage, 'partial')
  assert.equal(evaluateCrawler([], 'Googlebot', '/', 'unreachable').coverage, 'unknown')
})

test('treats an absent robots file as allowed by default but records its source', () => {
  const result = evaluateCrawler([], 'OAI-SearchBot', '/products/one', 'missing')
  assert.equal(result.access, 'allowed')
  assert.equal(result.coverage, 'full')
  assert.equal(result.ruleSource, 'missing')
})
