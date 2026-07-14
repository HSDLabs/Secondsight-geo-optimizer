import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canonicalizeUrl,
  createVisibilityProviderRegistry,
  normalizeClaudeResponse,
  normalizeGeminiResponse,
  normalizeOpenAIResponse,
  normalizeOpenRouterResponse
} from '../ai/providers.js'
import {
  assertSafeCitationUrl,
  buildRootCauses,
  createAIVisibilityService,
  deterministicAnalysis,
  fetchReadableCitation,
  InMemoryAIVisibilityStore
} from './aiVisibilityService.js'

const promptCategories = ['discovery', 'recommendation', 'comparison', 'alternative', 'problem_solution', 'branded', 'reputation', 'discovery', 'recommendation', 'comparison']

function generatedPrompts() {
  return {
    prompts: promptCategories.map((category, index) => ({
      text: `Visibility prompt ${index + 1} for Acme in category ${category}?`,
      category,
      funnelStage: ['awareness', 'consideration', 'decision'][index % 3],
      priority: ['high', 'medium', 'low'][index % 3],
      language: 'English',
      country: 'US'
    }))
  }
}

function semantic(overrides = {}) {
  return {
    recommendation: 'recommended',
    sentiment: 'positive',
    supportingQuotes: ['Acme is recommended'],
    associatedAttributes: ['reliable'],
    reasonsForRecommendation: ['Acme is recommended'],
    detectedEntities: [{ name: 'BetaCo', aliases: [], relationship: 'direct_competitor' }],
    confidence: 'high',
    ...overrides
  }
}

function fakeProvider(id, handler) {
  return {
    id,
    transport: 'direct',
    model: `${id}-model`,
    capabilities: { webSearch: true, citations: true, structuredOutput: true },
    availability: () => ({ available: true }),
    runPrompt: handler
  }
}

function serviceFixture({ answer = '1. Acme is recommended for teams.\n2. BetaCo is another option.', geminiFails = false, now } = {}) {
  const rawVisibility = { provider: 'raw', nested: { retained: true } }
  const openai = fakeProvider('openai', async input => {
    if (input.schemaName === 'visibility_prompts') return { answer: JSON.stringify(generatedPrompts()), citations: [], searchQueries: [], rawResponse: { prompt: true }, model: 'openai-model', latencyMs: 1 }
    if (input.schemaName === 'visibility_answer_analysis') return { answer: JSON.stringify(semantic()), citations: [], searchQueries: [], rawResponse: { analysis: true }, model: 'openai-model', latencyMs: 1 }
    return { answer, citations: [], searchQueries: [], rawResponse: rawVisibility, model: 'openai-model', latencyMs: 2 }
  })
  const gemini = fakeProvider('gemini', async input => {
    if (geminiFails) {
      const error = new Error('temporary provider outage')
      error.code = 'PROVIDER_TRANSIENT_ERROR'
      error.retryable = true
      error.status = 429
      throw error
    }
    return { answer, citations: [], searchQueries: [], rawResponse: { gemini: true }, model: 'gemini-model', latencyMs: 3 }
  })
  const claude = fakeProvider('claude', async () => ({ answer, citations: [], searchQueries: [], rawResponse: { claude: true }, model: 'claude-model', latencyMs: 3 }))
  const providerRegistry = new Map([['openai', openai], ['gemini', gemini], ['claude', claude]])
  const store = new InMemoryAIVisibilityStore({ now: now || (() => Date.now()), ttlMs: 1000 })
  const service = createAIVisibilityService({ store, providerRegistry, env: { ANALYSIS_ENGINE: 'openai' }, fetchImpl: async () => { throw new Error('unexpected fetch') }, dnsLookup: async () => [{ address: '93.184.216.34' }], sleep: async () => {}, now: now || (() => Date.now()) })
  return { service, store, rawVisibility }
}

async function prepareProject(service, projectId = 'project_one') {
  const result = await service.generatePrompts(projectId, {
    project: {
      website: 'https://acme.example', brandName: 'Acme', brandAliases: ['Acme Inc'], businessCategory: 'Software',
      productsServices: ['Workflow platform'], targetAudience: 'Operations teams', targetCountry: 'US', language: 'English', knownCompetitors: ['BetaCo']
    },
    diagnostics: {
      analysisSessionId: 'session_1',
      analysis: { url: 'https://acme.example', readable: { textContent: 'Acme workflow platform', wordCount: 3 }, a11y: { issues: [] } },
      crawler: { url: 'https://acme.example', issues: [] }
    }
  })
  const selected = result.prompts.slice(0, 2)
  for (const prompt of selected) await service.updatePrompt(prompt.id, { status: 'approved' })
  return selected
}

test('provider registry requires keys and models and exposes disabled Claude honestly', () => {
  const registry = createVisibilityProviderRegistry({ env: { OPENAI_API_KEY: 'key', OPENAI_MODEL: 'model', CLAUDE_TRANSPORT: 'disabled' } })
  assert.equal(registry.get('openai').availability().available, true)
  assert.deepEqual(registry.get('gemini').availability(), { available: false, reason: 'API key not configured' })
  assert.deepEqual(registry.get('claude').availability(), { available: false, reason: 'API key not configured' })
})

test('direct adapters use current structured request shapes and preserve raw responses', async () => {
  let openaiRequest
  let geminiRequest
  let claudeRequest
  const rawOpenAI = { output_text: '{"ok":true}', output: [] }
  const rawGemini = { output_text: '{"ok":true}', steps: [] }
  const rawClaude = { stop_reason: 'end_turn', content: [{ type: 'text', text: '{"ok":true}' }] }
  const schema = { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] }
  const registry = createVisibilityProviderRegistry({
    env: {
      OPENAI_API_KEY: 'o', OPENAI_MODEL: 'openai-model', OPENAI_TRANSPORT: 'direct',
      GEMINI_API_KEY: 'g', GEMINI_MODEL: 'gemini-model', GEMINI_TRANSPORT: 'direct',
      ANTHROPIC_API_KEY: 'a', CLAUDE_MODEL: 'claude-model', CLAUDE_TRANSPORT: 'direct'
    },
    clients: {
      openai: { responses: { create: async request => { openaiRequest = request; return rawOpenAI } } },
      gemini: { interactions: { create: async request => { geminiRequest = request; return rawGemini } } },
      claude: { messages: { create: async request => { claudeRequest = request; return rawClaude } } }
    }
  })
  const common = { prompt: 'Return JSON', responseSchema: schema, schemaName: 'test_output', webSearchEnabled: false, language: 'English', country: 'US' }
  const openai = await registry.get('openai').runPrompt(common)
  const gemini = await registry.get('gemini').runPrompt(common)
  const claude = await registry.get('claude').runPrompt(common)
  assert.equal(openaiRequest.text.format.type, 'json_schema')
  assert.equal(geminiRequest.store, false)
  assert.deepEqual(geminiRequest.response_format, { type: 'text', mime_type: 'application/json', schema })
  assert.deepEqual(claudeRequest.output_config, { format: { type: 'json_schema', schema } })
  assert.equal(openai.rawResponse, rawOpenAI)
  assert.equal(gemini.rawResponse, rawGemini)
  assert.equal(claude.rawResponse, rawClaude)
})

test('provider normalizers retain answer, query, and citation metadata', () => {
  const openai = normalizeOpenAIResponse({ output_text: 'OpenAI answer', output: [
    { type: 'web_search_call', action: { queries: ['acme reviews'] } },
    { type: 'message', content: [{ type: 'output_text', text: 'OpenAI answer', annotations: [{ type: 'url_citation', url: 'https://example.com/a', title: 'A', start_index: 0, end_index: 6 }] }] }
  ] })
  assert.equal(openai.citations[0].answerEndIndex, 6)
  assert.deepEqual(openai.searchQueries, ['acme reviews'])

  const gemini = normalizeGeminiResponse({ steps: [
    { type: 'google_search_call', arguments: { queries: ['acme'] } },
    { type: 'model_output', content: [{ type: 'text', text: 'Gemini answer', annotations: [{ type: 'url_citation', url: 'https://example.com/g', title: 'G', startIndex: 0, endIndex: 6 }] }] }
  ] })
  assert.equal(gemini.answer, 'Gemini answer')
  assert.equal(gemini.citations[0].citedText, 'Gemini')

  const claude = normalizeClaudeResponse({ content: [{ type: 'text', text: 'Claude answer', citations: [{ type: 'web_search_result_location', url: 'https://example.com/c', title: 'C', cited_text: 'Claude' }] }] })
  assert.equal(claude.citations[0].citedText, 'Claude')

  const openrouter = normalizeOpenRouterResponse({ choices: [{ message: { content: 'Router answer', annotations: [{ type: 'url_citation', url_citation: { url: 'https://example.com/r', title: 'R', start_index: 0, end_index: 6 } }] } }] })
  assert.equal(openrouter.citations[0].domain, 'example.com')
})

test('canonical URLs remove tracking, fragments, default ports, and sort retained parameters', () => {
  assert.equal(canonicalizeUrl('HTTPS://WWW.Example.COM:443/path/?utm_source=x&b=2&a=1#part'), 'https://www.example.com/path?a=1&b=2')
})

test('deterministic analysis separates ranked and character positions', () => {
  const result = deterministicAnalysis({ website: 'https://acme.example', brandName: 'Acme', brandAliases: ['Acme Inc'], knownCompetitors: ['BetaCo'] }, 'Intro\n1. BetaCo\n2. Acme is recommended', [])
  assert.equal(result.brandMentioned, true)
  assert.equal(result.mentionPosition, 2)
  assert.ok(result.mentionCharacterIndex > 1)
  assert.deepEqual(result.knownCompetitorMatches, ['BetaCo'])
})

test('prompt approval, immutable snapshots, raw retention, grounded analysis, and metrics work end to end', async () => {
  const { service, rawVisibility } = serviceFixture()
  const prompts = await prepareProject(service)
  await service.updatePrompt(prompts[0].id, { text: 'Edited approved prompt?' })
  const run = await service.createRun('project_one', { promptIds: [prompts[0].id], engines: ['openai'], webSearchEnabled: false })
  await service.updatePrompt(prompts[0].id, { text: 'Later edit that must not affect the run?' })
  const finished = await service.waitForRun(run.id)
  assert.equal(finished.status, 'completed')
  const summaries = await service.projectResponses('project_one')
  assert.equal(summaries[0].promptText, 'Edited approved prompt?')
  assert.equal('rawProviderResponse' in summaries[0], false)
  const detail = await service.responseDetail(summaries[0].id)
  assert.deepEqual(detail.rawProviderResponse, rawVisibility)
  assert.equal(detail.analysis.brandMentioned, true)
  assert.equal(detail.analysis.mentionPosition, 1)
  assert.equal(detail.analysis.citationState, 'brand_mentioned_no_brand_citation')
  const metrics = await service.metrics('project_one')
  assert.equal(metrics.mentionRate, 100)
  assert.equal(metrics.recommendationRate, 100)
  assert.equal(metrics.averagePosition, 1)
  assert.equal(metrics.competitorsDetected, 1)
  assert.equal('score' in metrics, false)
})

test('a partial provider failure retains useful results and excludes the failure from metric denominators', async () => {
  const { service } = serviceFixture({ geminiFails: true })
  const prompts = await prepareProject(service, 'partial_project')
  const run = await service.createRun('partial_project', { promptIds: [prompts[0].id], engines: ['openai', 'gemini'], webSearchEnabled: false })
  const finished = await service.waitForRun(run.id)
  assert.equal(finished.status, 'completed_degraded')
  assert.equal(finished.failedTasks, 1)
  assert.equal(finished.errors[0].status, 429)
  const metrics = await service.metrics('partial_project')
  assert.equal(metrics.mentionRate, 100)
  assert.deepEqual(metrics.engineBreakdown.map(item => item.engine), ['openai'])
})

test('root causes retain diagnostic evidence and use the required unsupported-cause fallback', () => {
  const project = {
    id: 'p', website: 'https://acme.example',
    diagnostics: { crawler: { sourceOrigin: 'request_snapshot', capturedAt: '2026-07-14T00:00:00.000Z', snapshotHash: 'abc', data: { issues: [
      { id: 'blocked', title: 'Crawler blocked', severity: 'critical', evidence: 'Disallow: /', affectedUrls: ['https://acme.example/'] }
    ] } } }
  }
  const response = { id: 'r', citations: [] }
  const causes = buildRootCauses(project, response, { brandMentioned: false })
  assert.equal(causes[0].evidence.exactText, 'Disallow: /')
  assert.equal(causes[0].evidence.snapshotHash, 'abc')

  const fallback = buildRootCauses({ id: 'p2', website: 'https://none.example', diagnostics: {} }, response, { brandMentioned: false })
  assert.equal(fallback.length, 1)
  assert.equal(fallback[0].title, 'No supported root cause found')
})

test('citation URL guard blocks localhost, private IPs, and public DNS resolving privately', async () => {
  await assert.rejects(assertSafeCitationUrl('http://localhost/private'), /private or local/)
  await assert.rejects(assertSafeCitationUrl('http://127.0.0.1/private'), /private or local/)
  await assert.rejects(assertSafeCitationUrl('https://public.example', { dnsLookup: async () => [{ address: '10.0.0.1' }] }), /private or local/)
})

test('citation fetch revalidates redirects and enforces redirect, type, and size limits', async () => {
  const publicDns = async host => [{ address: host === 'private.example' ? '127.0.0.1' : '93.184.216.34' }]
  await assert.rejects(fetchReadableCitation('https://public.example', {
    dnsLookup: publicDns,
    fetchImpl: async () => new Response(null, { status: 302, headers: { location: 'https://private.example/secret' } })
  }), /private or local/)

  await assert.rejects(fetchReadableCitation('https://public.example', {
    dnsLookup: publicDns,
    fetchImpl: async () => new Response(null, { status: 302, headers: { location: '/again' } })
  }), /redirect limit/)

  await assert.rejects(fetchReadableCitation('https://public.example', {
    dnsLookup: publicDns,
    fetchImpl: async () => new Response('plain', { status: 200, headers: { 'content-type': 'text/plain' } })
  }), /not HTML/)

  await assert.rejects(fetchReadableCitation('https://public.example', {
    dnsLookup: publicDns,
    fetchImpl: async () => new Response('', { status: 200, headers: { 'content-type': 'text/html', 'content-length': String(3 * 1024 * 1024) } })
  }), /size limit/)
})

test('competitor confirmation reclassifies citations without rerunning providers', async () => {
  const answer = '1. Acme is recommended.\n2. BetaCo is another option.'
  const raw = { answer }
  const registry = new Map()
  const openai = fakeProvider('openai', async input => {
    if (input.schemaName === 'visibility_prompts') return { answer: JSON.stringify(generatedPrompts()), citations: [], searchQueries: [], rawResponse: {}, model: 'openai-model', latencyMs: 1 }
    if (input.schemaName === 'visibility_answer_analysis') return { answer: JSON.stringify(semantic()), citations: [], searchQueries: [], rawResponse: {}, model: 'openai-model', latencyMs: 1 }
    return { answer, citations: [{ url: 'https://betaco.example/review', canonicalUrl: 'https://betaco.example/review', domain: 'betaco.example' }], searchQueries: [], rawResponse: raw, model: 'openai-model', latencyMs: 1 }
  })
  registry.set('openai', openai)
  registry.set('gemini', fakeProvider('gemini', async () => { throw new Error('unused') }))
  registry.set('claude', fakeProvider('claude', async () => { throw new Error('unused') }))
  const store = new InMemoryAIVisibilityStore()
  const service = createAIVisibilityService({ store, providerRegistry: registry, env: { ANALYSIS_ENGINE: 'openai' }, fetchImpl: async () => { throw new Error('unavailable') }, dnsLookup: async () => [{ address: '93.184.216.34' }], sleep: async () => {} })
  const prompts = await prepareProject(service, 'competitor_project')
  const run = await service.createRun('competitor_project', { promptIds: [prompts[0].id], engines: ['openai'], webSearchEnabled: true })
  await service.waitForRun(run.id)
  const beta = (await service.listCompetitors('competitor_project')).find(entity => entity.name === 'BetaCo')
  await service.updateCompetitor(beta.id, { decision: 'confirm', domains: ['betaco.example'] })
  const citations = await service.listCitations('competitor_project')
  assert.equal(citations[0].sourceType, 'competitor')
})

test('expired runs return a distinct expiration error', async () => {
  let clock = 1000
  const now = () => clock
  const { service } = serviceFixture({ now })
  const prompts = await prepareProject(service, 'expiry_project')
  const run = await service.createRun('expiry_project', { promptIds: [prompts[0].id], engines: ['openai'], webSearchEnabled: false })
  await service.waitForRun(run.id)
  clock += 1001
  await assert.rejects(service.getRun(run.id), error => error.code === 'RUN_EXPIRED' && error.status === 410)
})
