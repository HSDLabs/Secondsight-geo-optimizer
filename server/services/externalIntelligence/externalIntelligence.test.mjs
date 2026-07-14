import assert from 'node:assert/strict'
import test from 'node:test'
import { collectAdaptiveSource } from './adapters.js'
import { getSourceCapabilities, SOURCE_DEFINITIONS } from './capabilities.js'
import { assessRelevance, buildEntityProfile, deduplicateAndCluster, normalizeEvidence } from './evidence.js'
import { computeSignalSummary } from './scoring.js'
import { parseSafeHttpUrl } from './security.js'
import { assertSingleProcessMemoryStore, InMemoryExternalRunStore } from './store.js'
import { modelForSection } from './intelligence.js'

const entity = buildEntityProfile('https://discord.com', {
  title: 'Discord',
  description: 'Communication platform for communities, voice chat, gaming, and developers.',
  category: 'Communication software'
})

function evidence(sourceType, id, title, url, extra = {}) {
  return normalizeEvidence({ id, title, url, ...extra }, {
    sourceType,
    role: sourceType === 'news' ? 'editorial' : 'community',
    entity,
    queryUsed: 'Discord',
    requestedRange: null,
    actualRange: { from: '2026-06-01', to: '2026-07-01' },
    parserVersion: `${sourceType}-test`
  })
}

test('relevance uses positive context and excludes ambiguous meanings', () => {
  const correct = assessRelevance({ title: 'Discord launches community moderation tools', snippet: 'Voice and gaming communities', url: 'https://example.com/discord', sourceName: 'Example' }, entity)
  const wrong = assessRelevance({ title: 'Discord between two political groups', snippet: 'An argument and disagreement', url: 'https://example.com/politics', sourceName: 'Example' }, entity)
  assert.ok(correct.relevanceScore >= 35)
  assert.ok(wrong.relevanceScore < 35)
  assert.match(wrong.relevanceReason, /Excluded ambiguous context/)
})

test('source searches use the canonical domain term when the page title is marketing copy', () => {
  const notion = buildEntityProfile('https://www.notion.so', {
    title: 'The AI workspace that works for you',
    description: 'Write, plan, and organize work in one connected workspace.'
  })
  assert.equal(notion.name, 'The AI workspace that works for you')
  assert.equal(notion.searchTerm, 'notion')
})

test('normalized evidence retains provenance and safe source fields', () => {
  const item = evidence('reddit', 'abc', 'Discord community update', 'https://reddit.com/r/discordapp/comments/abc', { subreddit: 'discordapp', score: 42, num_comments: 8 })
  assert.equal(item.sourceType, 'reddit')
  assert.equal(item.provenance.collector, 'scrapebadger:reddit')
  assert.equal(item.provenance.parserVersion, 'reddit-test')
  assert.equal(item.provenance.contentHash.length, 64)
  assert.ok(item.entitySignalsMatched.length)
})

test('news deduplication clusters syndicated headlines without inflating retained count', () => {
  const first = evidence('news', 'one', 'Discord launches new moderation tools for communities', 'https://a.example/story', { publisher: 'Publisher A' })
  const second = evidence('news', 'two', 'Discord launches new moderation tools for online communities', 'https://b.example/story', { publisher: 'Publisher B' })
  const result = deduplicateAndCluster([first, second])
  assert.equal(result.retained.length, 1)
  assert.equal(result.clustered, 1)
  assert.equal(result.retained[0].clusterSize, 2)
})

test('adaptive collection stops on repeated low-value batches and tracks unique found items', async () => {
  let calls = 0
  const adapter = {
    sourceType: 'reddit', role: 'community', parserVersion: 'test', softTarget: 99, rawCeiling: 20,
    async collectBatch() {
      calls += 1
      return {
        rawItems: [{ id: 'same', title: 'Discord community discussion', subreddit: 'discordapp', permalink: '/r/discordapp/comments/same' }],
        nextCursor: calls < 4 ? String(calls) : null,
        exhausted: calls >= 4,
        queryUsed: 'Discord',
        actualRange: { from: '2026-06-01', to: '2026-07-01' }
      }
    }
  }
  const result = await collectAdaptiveSource({ adapter, entity, configuration: { dateMode: 'automatic', requestedRange: null }, signal: new AbortController().signal })
  assert.equal(result.counts.found, 1)
  assert.equal(result.counts.retained, 1)
  assert.ok(calls <= 3)
})

test('signal dimensions enforce volume and source-diversity gates', () => {
  const items = Array.from({ length: 30 }, (_, index) => ({
    id: `item-${index}`,
    sourceType: index < 10 ? 'reddit' : index < 20 ? 'news' : 'youtube',
    sourceRole: index < 10 ? 'community' : index < 20 ? 'editorial' : 'creator',
    sourceName: `origin-${index % 8}`,
    authorityScore: index < 10 ? 35 : 75,
    sentiment: 'positive',
    sentimentConfidence: .8
  }))
  const dimensions = computeSignalSummary(items, [
    { sourceType: 'reddit', state: 'complete' },
    { sourceType: 'news', state: 'complete' },
    { sourceType: 'youtube', state: 'complete' }
  ])
  assert.equal(dimensions.find(item => item.id === 'external-presence').status, 'Strong')
  assert.match(dimensions.find(item => item.id === 'authority-coverage').rationale, /Social engagement is excluded/)
})

test('capabilities distinguish planned sources from missing authentication', () => {
  const original = process.env.SCRAPEBADGER_API_KEY
  delete process.env.SCRAPEBADGER_API_KEY
  const capabilities = getSourceCapabilities()
  assert.equal(capabilities.find(source => source.sourceType === 'reddit').state, 'authentication_required')
  assert.equal(capabilities.find(source => source.sourceType === 'linkedin').state, 'not_supported')
  if (original) process.env.SCRAPEBADGER_API_KEY = original
})

test('development collection caps each Scrapebadger source at ten items', () => {
  for (const sourceType of ['reddit', 'news', 'x', 'youtube']) {
    assert.equal(SOURCE_DEFINITIONS[sourceType].softTarget, 10)
    assert.equal(SOURCE_DEFINITIONS[sourceType].rawCeiling, 10)
  }
})

test('structured intelligence uses Luna for summaries and Terra for analysis sections', () => {
  assert.equal(modelForSection('summary', {}), 'gpt-5.6-luna')
  assert.equal(modelForSection('associations', {}), 'gpt-5.6-terra')
  assert.equal(modelForSection('risks', { OPENAI_EXTERNAL_INTELLIGENCE_MODEL: 'compatibility-model' }), 'compatibility-model')
})

test('temporary store keeps exact capacity and reports replaced instances', () => {
  const store = new InMemoryExternalRunStore({ ttlMs: 1000, maxRuns: 2 })
  store.create({ status: 'queued' })
  store.create({ status: 'queued' })
  assert.equal(store.runs.size, 2)
  const foreignId = 'run_foreign_00000000-0000-0000-0000-000000000000'
  assert.equal(store.missingReason(foreignId), 'instance_replaced')
})

test('memory store refuses known multi-worker deployment', () => {
  const original = process.env.WEB_CONCURRENCY
  process.env.WEB_CONCURRENCY = '2'
  assert.throws(() => assertSingleProcessMemoryStore(), /exactly one API process/)
  if (original === undefined) delete process.env.WEB_CONCURRENCY
  else process.env.WEB_CONCURRENCY = original
})

test('URL validation rejects internal destinations', () => {
  assert.throws(() => parseSafeHttpUrl('http://127.0.0.1/private'), /Private or internal/)
  assert.equal(parseSafeHttpUrl('https://example.com/path').hostname, 'example.com')
})
