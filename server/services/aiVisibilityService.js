import crypto from 'node:crypto'
import dns from 'node:dns/promises'
import net from 'node:net'
import { extractReadable } from './layers/readability.js'
import { externalRunStore } from './externalIntelligence/store.js'
import {
  canonicalizeUrl,
  createVisibilityProviderRegistry,
  domainFromUrl,
  getAnalysisEngine,
  VisibilityProviderError
} from '../ai/providers.js'

const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_MAX_RUNS = 100
const DEFAULT_MAX_PROJECTS = 50
const MAX_CITATION_BYTES = 2 * 1024 * 1024
const RUN_TERMINAL = new Set(['completed', 'completed_degraded', 'failed'])
const ENGINE_IDS = ['openai', 'gemini', 'claude']
const PROMPT_CATEGORIES = ['discovery', 'recommendation', 'comparison', 'alternative', 'problem_solution', 'branded', 'reputation']
const FUNNEL_STAGES = ['awareness', 'consideration', 'decision']
const PRIORITIES = ['high', 'medium', 'low']
const RECOMMENDATIONS = ['strongly_recommended', 'recommended', 'listed', 'neutral', 'discouraged', 'not_present']
const SENTIMENTS = ['positive', 'neutral', 'mixed', 'negative']
const RELATIONSHIPS = ['direct_competitor', 'indirect_competitor', 'alternative', 'complementary', 'publisher_source', 'marketplace', 'unknown']
const TRANSIENT_CODES = new Set(['PROVIDER_TRANSIENT_ERROR', 'PROVIDER_TIMEOUT'])

export const DIAGNOSTIC_PATHS = Object.freeze({
  crawler_access: '/crawl-indexability',
  machine_intelligence: '/ai-understanding',
  sources_authority: '/sources-authority',
  citation_gap: '/ai-visibility'
})

export class AIVisibilityError extends Error {
  constructor(message, { code = 'INVALID_REQUEST', status = 400, engine, retryable = false } = {}) {
    super(message)
    this.name = 'AIVisibilityError'
    this.code = code
    this.status = status
    this.engine = engine
    this.retryable = retryable
  }
}

function id(prefix) {
  return `${prefix}_${crypto.randomUUID()}`
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableValue(value[key])]))
  }
  return value
}

function snapshotHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stableValue(value))).digest('hex')
}

function string(value, max = 4000) {
  return [...String(value || '')]
    .filter(character => {
      const code = character.charCodeAt(0)
      return code === 9 || code === 10 || code === 13 || code >= 32
    })
    .join('')
    .trim()
    .slice(0, max)
}

function strings(values, maxItems = 50, maxLength = 300) {
  return [...new Set((Array.isArray(values) ? values : []).map(value => string(value, maxLength)).filter(Boolean))].slice(0, maxItems)
}

function clone(value) {
  return value == null ? value : structuredClone(value)
}

function percent(numerator, denominator) {
  return denominator ? Math.round(numerator / denominator * 100) : 0
}

function normalizeName(value) {
  return string(value, 200).toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

function matchesDomain(candidate, expected) {
  const value = String(candidate || '').toLowerCase().replace(/^www\./, '')
  const root = String(expected || '').toLowerCase().replace(/^www\./, '')
  return Boolean(value && root && (value === root || value.endsWith(`.${root}`)))
}

function exactMatch(answer, candidates) {
  const lower = answer.toLocaleLowerCase()
  let best = null
  for (const candidate of candidates.filter(Boolean)) {
    const needle = candidate.toLocaleLowerCase()
    let from = 0
    while (from < lower.length) {
      const index = lower.indexOf(needle, from)
      if (index < 0) break
      const before = lower[index - 1]
      const after = lower[index + needle.length]
      const boundaryBefore = !before || !/[\p{L}\p{N}]/u.test(before)
      const boundaryAfter = !after || !/[\p{L}\p{N}]/u.test(after)
      if (boundaryBefore && boundaryAfter && (!best || index < best.index)) best = { index, text: answer.slice(index, index + candidate.length), candidate }
      from = index + Math.max(1, needle.length)
    }
  }
  return best
}

function rankedPosition(answer, candidates) {
  let ordinal = 0
  for (const line of answer.split(/\r?\n/)) {
    const match = line.match(/^\s*(?:(\d+)[.)]|[-*•])\s+(.+)/u)
    if (!match) continue
    ordinal += 1
    if (exactMatch(match[2], candidates)) return match[1] ? Number(match[1]) : ordinal
  }
  return undefined
}

function boundedAnalysisSnapshot(value) {
  if (!value || typeof value !== 'object') return null
  return {
    url: string(value.url, 2000),
    title: string(value.title, 500),
    metadata: {
      title: string(value.metadata?.title, 500),
      description: string(value.metadata?.description, 2000),
      canonical: string(value.metadata?.canonical, 2000),
      schemas: clone((value.metadata?.schemas || value.metadata?.jsonLd || []).slice(0, 20))
    },
    readable: {
      title: string(value.readable?.title, 500),
      excerpt: string(value.readable?.excerpt, 2000),
      textContent: string(value.readable?.textContent || value.readable?.text, 30000),
      markdown: string(value.readable?.markdown, 30000),
      wordCount: Number(value.readable?.wordCount || 0)
    },
    a11y: {
      stats: clone(value.a11y?.stats || {}),
      issues: clone((value.a11y?.issues || []).slice(0, 100).map(issue => ({
        id: string(issue.id, 200), type: string(issue.type, 200), severity: string(issue.severity, 50),
        evidence: string(issue.evidence || issue.reason, 2000), affectedUrls: strings(issue.affectedUrls, 20, 2000)
      })))
    }
  }
}

function boundedCrawlerSnapshot(value) {
  if (!value || typeof value !== 'object') return null
  return {
    url: string(value.url, 2000),
    origin: string(value.origin, 2000),
    analyzedAt: string(value.analyzedAt, 100),
    robots: {
      found: Boolean(value.robots?.found), status: Number(value.robots?.status || 0),
      aiCrawlerPermissions: clone(value.robots?.aiCrawlerPermissions || {}), error: string(value.robots?.error, 1000)
    },
    pages: { summary: clone(value.pages?.summary || {}), pageSignals: clone((value.pages?.pageSignals || []).slice(0, 100)) },
    urlInspection: clone(value.urlInspection || null),
    issues: clone((value.issues || []).slice(0, 200).map(issue => ({
      id: string(issue.id, 200), type: string(issue.type, 200), title: string(issue.title, 500),
      severity: string(issue.severity, 50), confidence: string(issue.confidence, 50),
      affectedUrls: strings(issue.affectedUrls, 30, 2000), evidence: string(issue.evidence, 3000),
      crawlerAffected: strings(issue.crawlerAffected, 30, 200), source: string(issue.source, 200)
    })))
  }
}

function boundedExternalSnapshot(run) {
  if (!run) return null
  return {
    id: run.id,
    status: run.status,
    entity: clone(run.entity),
    sourceSummaries: clone(run.sourceSummaries || []),
    dimensions: clone(run.dimensions || []),
    issues: clone(run.issues || []),
    evidence: clone((run.evidence || []).slice(0, 200).map(item => ({
      id: item.id, sourceType: item.sourceType, sourceRole: item.sourceRole, sourceName: item.sourceName,
      url: item.url, title: item.title, snippet: item.snippet, authorityScore: item.authorityScore
    }))),
    sectionData: clone(run.sectionData || {})
  }
}

function diagnosticRecord(data, sourceOrigin, analysisSessionId, capturedAt = new Date().toISOString()) {
  return data ? { sourceOrigin, capturedAt, analysisSessionId: analysisSessionId || null, snapshotHash: snapshotHash(data), data } : null
}

function validateProject(projectId, input) {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(projectId)) throw new AIVisibilityError('projectId must contain only letters, numbers, underscores, or hyphens.')
  const website = canonicalizeUrl(input?.website)
  if (!website) throw new AIVisibilityError('A valid project website is required.')
  const project = {
    id: projectId,
    website,
    brandName: string(input.brandName, 200),
    brandAliases: strings(input.brandAliases, 20, 200),
    businessCategory: string(input.businessCategory, 500),
    productsServices: strings(input.productsServices, 50, 300),
    targetAudience: string(input.targetAudience, 1000),
    targetCountry: string(input.targetCountry, 100),
    language: string(input.language, 100),
    knownCompetitors: strings(input.knownCompetitors, 50, 200)
  }
  for (const key of ['brandName', 'businessCategory', 'targetAudience', 'targetCountry', 'language']) {
    if (!project[key]) throw new AIVisibilityError(`${key} is required.`)
  }
  return project
}

export class AIVisibilityStore {
  async createRun() { throw new Error('Not implemented') }
  async getRun() { throw new Error('Not implemented') }
  async updateRun() { throw new Error('Not implemented') }
  async savePrompts() { throw new Error('Not implemented') }
  async getPrompts() { throw new Error('Not implemented') }
  async updatePrompt() { throw new Error('Not implemented') }
  async saveResponse() { throw new Error('Not implemented') }
  async getResponse() { throw new Error('Not implemented') }
  async getResponses() { throw new Error('Not implemented') }
  async saveAnalysis() { throw new Error('Not implemented') }
  async saveRootCauses() { throw new Error('Not implemented') }
}

export class InMemoryAIVisibilityStore extends AIVisibilityStore {
  constructor({
    ttlMs = Number(process.env.AI_VISIBILITY_TTL_MS) || DAY_MS,
    maxRuns = Number(process.env.AI_VISIBILITY_MAX_RUNS) || DEFAULT_MAX_RUNS,
    maxProjects = Number(process.env.AI_VISIBILITY_MAX_PROJECTS) || DEFAULT_MAX_PROJECTS,
    now = () => Date.now()
  } = {}) {
    super()
    this.ttlMs = ttlMs
    this.maxRuns = maxRuns
    this.maxProjects = maxProjects
    this.now = now
    this.projects = new Map()
    this.prompts = new Map()
    this.runs = new Map()
    this.responses = new Map()
    this.analyses = new Map()
    this.rootCauses = new Map()
    this.competitors = new Map()
    this.tombstones = new Map()
  }

  async saveProject(project) {
    this.prune()
    const now = new Date(this.now()).toISOString()
    const current = this.projects.get(project.id)
    this.projects.set(project.id, { ...current, ...clone(project), createdAt: current?.createdAt || now, updatedAt: now, expiresAt: new Date(this.now() + this.ttlMs).toISOString() })
    this.prune()
    return this.projects.get(project.id)
  }

  async getProject(projectId) {
    this.prune()
    return this.projects.get(projectId) || null
  }

  async createRun(run) {
    this.prune()
    this.runs.set(run.id, clone(run))
    this.prune()
  }

  async getRun(runId) {
    this.prune()
    return this.runs.get(runId) || null
  }

  missingRunReason(runId) {
    this.prune()
    return this.tombstones.has(runId) ? 'expired' : 'not_found'
  }

  async updateRun(runId, patch) {
    this.prune()
    const current = this.runs.get(runId)
    if (!current) return null
    const value = typeof patch === 'function' ? patch(current) : patch
    const next = { ...current, ...clone(value), updatedAt: new Date(this.now()).toISOString() }
    this.runs.set(runId, next)
    return next
  }

  async savePrompts(prompts, { replaceCandidates = false } = {}) {
    if (replaceCandidates && prompts[0]) {
      for (const [promptId, prompt] of this.prompts) {
        if (prompt.projectId === prompts[0].projectId && prompt.status === 'candidate') this.prompts.delete(promptId)
      }
    }
    for (const prompt of prompts) this.prompts.set(prompt.id, clone(prompt))
  }

  async getPrompts(projectId) {
    return [...this.prompts.values()].filter(prompt => prompt.projectId === projectId).map(clone)
  }

  async getPrompt(promptId) { return clone(this.prompts.get(promptId) || null) }

  async updatePrompt(promptId, patch) {
    const current = this.prompts.get(promptId)
    if (!current) return null
    const next = { ...current, ...clone(patch), updatedAt: new Date(this.now()).toISOString() }
    this.prompts.set(promptId, next)
    return clone(next)
  }

  async saveResponse(response) { this.responses.set(response.id, clone(response)) }
  async getResponse(responseId) { return clone(this.responses.get(responseId) || null) }
  async getResponses(projectId) { return [...this.responses.values()].filter(response => response.projectId === projectId).map(clone) }
  async saveAnalysis(analysis) { this.analyses.set(analysis.responseId, clone(analysis)) }
  async getAnalysis(responseId) { return clone(this.analyses.get(responseId) || null) }
  async saveRootCauses(rootCauses) { for (const cause of rootCauses) this.rootCauses.set(cause.id, clone(cause)) }
  async replaceRootCauses(responseId, causes) {
    for (const [causeId, cause] of this.rootCauses) if (cause.responseId === responseId) this.rootCauses.delete(causeId)
    await this.saveRootCauses(causes)
  }
  async getRootCauses(projectId) { return [...this.rootCauses.values()].filter(cause => cause.projectId === projectId).map(clone) }
  async getResponseRootCauses(responseId) { return [...this.rootCauses.values()].filter(cause => cause.responseId === responseId).map(clone) }
  async saveCompetitor(competitor) { this.competitors.set(competitor.id, clone(competitor)) }
  async getCompetitor(entityId) { return clone(this.competitors.get(entityId) || null) }
  async getCompetitors(projectId) { return [...this.competitors.values()].filter(entity => entity.projectId === projectId).map(clone) }

  removeRun(runId, expired = true) {
    this.runs.delete(runId)
    if (expired) this.tombstones.set(runId, this.now())
    for (const [responseId, response] of this.responses) {
      if (response.runId !== runId) continue
      this.responses.delete(responseId)
      this.analyses.delete(responseId)
      for (const [causeId, cause] of this.rootCauses) if (cause.responseId === responseId) this.rootCauses.delete(causeId)
    }
  }

  removeProject(projectId) {
    this.projects.delete(projectId)
    for (const [promptId, prompt] of this.prompts) if (prompt.projectId === projectId) this.prompts.delete(promptId)
    for (const run of [...this.runs.values()]) if (run.projectId === projectId) this.removeRun(run.id)
    for (const [entityId, entity] of this.competitors) if (entity.projectId === projectId) this.competitors.delete(entityId)
  }

  prune() {
    const now = this.now()
    for (const run of [...this.runs.values()]) if (Date.parse(run.expiresAt) <= now) this.removeRun(run.id)
    for (const project of [...this.projects.values()]) if (Date.parse(project.expiresAt) <= now) this.removeProject(project.id)
    while (this.runs.size > this.maxRuns) {
      const oldest = [...this.runs.values()].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))[0]
      this.removeRun(oldest.id)
    }
    while (this.projects.size > this.maxProjects) {
      const oldest = [...this.projects.values()].sort((a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt))[0]
      this.removeProject(oldest.id)
    }
    for (const [runId, at] of this.tombstones) if (now - at > this.ttlMs) this.tombstones.delete(runId)
  }
}

const PROMPT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['prompts'],
  properties: {
    prompts: {
      type: 'array',
      minItems: 10,
      maxItems: 15,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'category', 'funnelStage', 'priority', 'language'],
        properties: {
          text: { type: 'string' },
          category: { type: 'string', enum: PROMPT_CATEGORIES },
          funnelStage: { type: 'string', enum: FUNNEL_STAGES },
          priority: { type: 'string', enum: PRIORITIES },
          country: { type: 'string' },
          language: { type: 'string' },
          persona: { type: 'string' }
        }
      }
    }
  }
}

const ANALYSIS_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['recommendation', 'sentiment', 'supportingQuotes', 'associatedAttributes', 'reasonsForRecommendation', 'detectedEntities', 'confidence'],
  properties: {
    recommendation: { type: 'string', enum: RECOMMENDATIONS }, sentiment: { type: 'string', enum: SENTIMENTS },
    supportingQuotes: { type: 'array', minItems: 1, items: { type: 'string' } }, associatedAttributes: { type: 'array', items: { type: 'string' } },
    reasonsForRecommendation: { type: 'array', items: { type: 'string' } }, confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    detectedEntities: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name', 'aliases', 'relationship'], properties: {
      name: { type: 'string' }, aliases: { type: 'array', items: { type: 'string' } }, relationship: { type: 'string', enum: RELATIONSHIPS }
    } } }
  }
}

function parseJsonAnswer(answer, label) {
  try { return JSON.parse(answer) } catch { throw new AIVisibilityError(`${label} did not return valid JSON.`, { code: 'INVALID_PROVIDER_OUTPUT', status: 502 }) }
}

function validateGeneratedPrompts(value) {
  if (!value || !Array.isArray(value.prompts) || value.prompts.length < 10 || value.prompts.length > 15) throw new AIVisibilityError('Prompt generation must return 10 to 15 prompts.', { code: 'INVALID_PROVIDER_OUTPUT', status: 502 })
  const seen = new Set()
  for (const prompt of value.prompts) {
    if (!string(prompt.text) || !PROMPT_CATEGORIES.includes(prompt.category) || !FUNNEL_STAGES.includes(prompt.funnelStage) || !PRIORITIES.includes(prompt.priority) || !string(prompt.language)) {
      throw new AIVisibilityError('Prompt generation response did not match the required schema.', { code: 'INVALID_PROVIDER_OUTPUT', status: 502 })
    }
    const key = normalizeName(prompt.text)
    if (seen.has(key)) throw new AIVisibilityError('Prompt generation returned duplicate prompts.', { code: 'INVALID_PROVIDER_OUTPUT', status: 502 })
    seen.add(key)
  }
  const categories = new Set(value.prompts.map(prompt => prompt.category))
  if (!PROMPT_CATEGORIES.every(category => categories.has(category))) throw new AIVisibilityError('Prompt generation did not cover every required category.', { code: 'INVALID_PROVIDER_OUTPUT', status: 502 })
  return value.prompts
}

export function deterministicAnalysis(project, rawAnswer, citations) {
  const domain = domainFromUrl(project.website)
  const aliases = [project.brandName, ...project.brandAliases]
  const nameMatch = exactMatch(rawAnswer, aliases)
  const domainMatch = exactMatch(rawAnswer, [domain])
  const match = !nameMatch || (domainMatch && domainMatch.index < nameMatch.index) ? domainMatch : nameMatch
  const competitors = project.knownCompetitors.filter(name => exactMatch(rawAnswer, [name]))
  return {
    brandMentioned: Boolean(match),
    brandMentionText: match?.text,
    mentionCharacterIndex: match ? match.index + 1 : undefined,
    mentionPosition: match ? rankedPosition(rawAnswer, aliases) : undefined,
    knownCompetitorMatches: competitors,
    brandDomainCited: citations.some(citation => matchesDomain(citation.domain, domain)),
    citationDomainMatches: citations.filter(citation => matchesDomain(citation.domain, domain)).map(citation => citation.domain)
  }
}

function validateSemanticAnalysis(value, rawAnswer) {
  if (!value || !RECOMMENDATIONS.includes(value.recommendation) || !SENTIMENTS.includes(value.sentiment) || !['high', 'medium', 'low'].includes(value.confidence)) {
    throw new AIVisibilityError('Semantic analysis did not match the required schema.', { code: 'INVALID_ANALYSIS_OUTPUT', status: 502 })
  }
  if (!Array.isArray(value.supportingQuotes) || !value.supportingQuotes.length || value.supportingQuotes.some(quote => !quote || !rawAnswer.includes(quote))) {
    throw new AIVisibilityError('Semantic analysis included a quote not present in the raw answer.', { code: 'UNGROUNDED_ANALYSIS', status: 502 })
  }
  for (const entity of value.detectedEntities || []) {
    if (!entity.name || !RELATIONSHIPS.includes(entity.relationship) || !exactMatch(rawAnswer, [entity.name, ...(entity.aliases || [])])) {
      throw new AIVisibilityError('Semantic analysis included an entity not present in the raw answer.', { code: 'UNGROUNDED_ANALYSIS', status: 502 })
    }
  }
  return value
}

function sourceTypeFor(citation, project, competitors) {
  const projectDomain = domainFromUrl(project.website)
  if (matchesDomain(citation.domain, projectDomain)) return 'first_party'
  if (competitors.some(entity => entity.decision === 'confirmed' && entity.domains?.some(domain => matchesDomain(citation.domain, domain)))) return 'competitor'
  if (['reddit.com', 'quora.com', 'stackoverflow.com', 'news.ycombinator.com'].some(domain => matchesDomain(citation.domain, domain))) return 'community'
  if (['g2.com', 'capterra.com', 'trustpilot.com', 'yelp.com'].some(domain => matchesDomain(citation.domain, domain))) return 'review'
  if (['wikipedia.org', 'wikidata.org', 'britannica.com'].some(domain => matchesDomain(citation.domain, domain))) return 'reference'
  return citation.title ? 'editorial' : 'unknown'
}

function associatedBrandsFor(citation, project, competitors, sourceType) {
  const brands = []
  const context = `${citation.title || ''} ${citation.citedText || ''}`
  if (sourceType === 'first_party' || exactMatch(context, [project.brandName, ...project.brandAliases])) brands.push(project.brandName)
  for (const entity of competitors) {
    if (entity.decision === 'confirmed' && (entity.domains?.some(domain => matchesDomain(citation.domain, domain)) || exactMatch(context, [entity.name, ...(entity.aliases || [])]))) brands.push(entity.name)
  }
  return [...new Set(brands)]
}

function citationStateFor(analysis, citations) {
  const firstParty = citations.some(citation => citation.sourceType === 'first_party')
  const externalBrand = citations.some(citation => citation.sourceType !== 'first_party' && citation.associatedBrands?.length)
  const competitor = citations.some(citation => citation.sourceType === 'competitor')
  if (analysis.brandMentioned && firstParty) return 'brand_mentioned_first_party_citation'
  if (analysis.brandMentioned && externalBrand) return 'brand_mentioned_external_citation'
  if (analysis.brandMentioned) return 'brand_mentioned_no_brand_citation'
  if (firstParty) return 'brand_domain_cited_not_recommended'
  if (competitor) return 'brand_absent_competitor_cited'
  return 'brand_absent_no_brand_citation'
}

function isPrivateIp(address) {
  if (!net.isIP(address)) return false
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number)
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19))
  }
  const value = address.toLowerCase()
  return value === '::' || value === '::1' || value.startsWith('fc') || value.startsWith('fd') || /^fe[89ab]/.test(value)
    || value.startsWith('::ffff:127.') || value.startsWith('::ffff:10.') || value.startsWith('::ffff:192.168.')
}

export async function assertSafeCitationUrl(value, { dnsLookup = dns.lookup } = {}) {
  let url
  try { url = new URL(value) } catch { throw new AIVisibilityError('Citation URL is invalid.', { code: 'CITATION_FETCH_BLOCKED', status: 400 }) }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new AIVisibilityError('Citation URL is not an allowed public HTTP(S) URL.', { code: 'CITATION_FETCH_BLOCKED', status: 400 })
  const host = url.hostname.toLowerCase().replace(/\.$/, '')
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || isPrivateIp(host)) throw new AIVisibilityError('Citation URL resolves to a private or local destination.', { code: 'CITATION_FETCH_BLOCKED', status: 400 })
  const records = await dnsLookup(host, { all: true })
  if (!records.length || records.some(record => isPrivateIp(record.address))) throw new AIVisibilityError('Citation URL resolves to a private or local destination.', { code: 'CITATION_FETCH_BLOCKED', status: 400 })
  return url
}

export async function fetchReadableCitation(value, { fetchImpl, dnsLookup, timeoutMs = 10000 }) {
  let current = value
  for (let redirects = 0; redirects <= 5; redirects += 1) {
    const safeUrl = await assertSafeCitationUrl(current, { dnsLookup })
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    let response
    try { response = await fetchImpl(safeUrl, { redirect: 'manual', signal: controller.signal, headers: { Accept: 'text/html,application/xhtml+xml' } }) }
    finally { clearTimeout(timer) }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirects === 5) throw new AIVisibilityError('Citation redirect limit exceeded.', { code: 'CITATION_FETCH_UNAVAILABLE', status: 502 })
      const location = response.headers.get('location')
      if (!location) throw new AIVisibilityError('Citation redirect did not include a destination.', { code: 'CITATION_FETCH_UNAVAILABLE', status: 502 })
      current = new URL(location, safeUrl).href
      continue
    }
    if (!response.ok) throw new AIVisibilityError(`Citation returned HTTP ${response.status}.`, { code: 'CITATION_FETCH_UNAVAILABLE', status: 502 })
    const type = response.headers.get('content-type') || ''
    if (!/text\/html|application\/xhtml\+xml/i.test(type)) throw new AIVisibilityError('Citation response was not HTML.', { code: 'CITATION_FETCH_UNAVAILABLE', status: 502 })
    const length = Number(response.headers.get('content-length') || 0)
    if (length > MAX_CITATION_BYTES) throw new AIVisibilityError('Citation response exceeded the size limit.', { code: 'CITATION_FETCH_UNAVAILABLE', status: 502 })
    const bytes = await response.arrayBuffer()
    if (bytes.byteLength > MAX_CITATION_BYTES) throw new AIVisibilityError('Citation response exceeded the size limit.', { code: 'CITATION_FETCH_UNAVAILABLE', status: 502 })
    const html = new TextDecoder().decode(bytes)
    return extractReadable(html, safeUrl.href).textContent
  }
  throw new AIVisibilityError('Citation redirect limit exceeded.', { code: 'CITATION_FETCH_UNAVAILABLE', status: 502 })
}

function similarity(a, b) {
  const tokens = value => new Set(value.toLocaleLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(token => token.length > 2))
  const left = tokens(a)
  const right = tokens(b)
  if (!left.size) return 0
  return [...left].filter(token => right.has(token)).length / left.size
}

function createLimiter(max = 3) {
  let active = 0
  const queued = []
  const drain = () => {
    while (active < max && queued.length) {
      active += 1
      const { task, resolve, reject } = queued.shift()
      Promise.resolve().then(task).then(resolve, reject).finally(() => { active -= 1; drain() })
    }
  }
  return task => new Promise((resolve, reject) => { queued.push({ task, resolve, reject }); drain() })
}

function errorShape(error, engine) {
  return {
    code: error.code || 'PROVIDER_ERROR',
    message: string(error.message || 'Provider task failed.', 500),
    engine: error.engine || engine,
    retryable: Boolean(error.retryable),
    ...(Number.isInteger(error.status) ? { status: error.status } : {})
  }
}

function rootCause({ project, response, pillar, severity, title, description, exactText, sourceId, url, provenance, section }) {
  return {
    id: id('cause'), projectId: project.id, responseId: response.id, pillar, severity, title, description,
    evidence: { sourceType: provenance?.sourceOrigin || pillar, sourceId, url, exactText, capturedAt: provenance?.capturedAt, snapshotHash: provenance?.snapshotHash },
    link: { path: DIAGNOSTIC_PATHS[pillar], section, sourceId }
  }
}

export function buildRootCauses(project, response, analysis) {
  if (analysis.brandMentioned && response.citations.some(citation => citation.sourceType === 'first_party')) return []
  const causes = []
  const crawler = project.diagnostics?.crawler
  for (const issue of crawler?.data?.issues || []) {
    if (!['critical', 'warning', 'high', 'medium'].includes(issue.severity)) continue
    if (!issue.evidence) continue
    causes.push(rootCause({ project, response, pillar: 'crawler_access', severity: ['critical', 'high'].includes(issue.severity) ? 'high' : 'medium',
      title: issue.title || 'Crawler access diagnostic', description: 'This crawler diagnostic is a possible contributing factor to the visibility result; it does not prove causation.',
      exactText: issue.evidence, sourceId: issue.id, url: issue.affectedUrls?.[0], provenance: crawler, section: 'issues' }))
    if (causes.length >= 3) break
  }
  const machine = project.diagnostics?.analysis
  for (const issue of machine?.data?.a11y?.issues || []) {
    if (!issue.evidence || !['critical', 'warning', 'high', 'medium'].includes(issue.severity)) continue
    causes.push(rootCause({ project, response, pillar: 'machine_intelligence', severity: ['critical', 'high'].includes(issue.severity) ? 'high' : 'medium',
      title: issue.type || 'Machine-readable content issue', description: 'This stored extraction evidence may constrain how reliably an answer engine interprets the page.',
      exactText: issue.evidence, sourceId: issue.id, url: issue.affectedUrls?.[0] || machine.data.url, provenance: machine, section: 'interpretation' }))
    if (causes.filter(cause => cause.pillar === 'machine_intelligence').length >= 2) break
  }
  if (machine?.data && !machine.data.readable?.textContent) {
    causes.push(rootCause({ project, response, pillar: 'machine_intelligence', severity: 'high', title: 'Readable content was unavailable',
      description: 'The captured machine-readability snapshot did not contain readable page text, which is a likely visibility constraint.',
      exactText: 'No readable text was present in the stored analysis snapshot.', url: machine.data.url, provenance: machine, section: 'raw-evidence' }))
  }
  const external = project.diagnostics?.external
  const authority = external?.data?.dimensions?.find(dimension => dimension.id === 'authority-coverage')
  if (authority && ['Insufficient evidence', 'Limited'].includes(authority.status) && authority.rationale) {
    causes.push(rootCause({ project, response, pillar: 'sources_authority', severity: authority.status === 'Insufficient evidence' ? 'high' : 'medium',
      title: 'Independent authority evidence is limited', description: 'This Sources & Authority diagnostic is a possible contributing factor, not proof that it caused the answer.',
      exactText: authority.rationale, sourceId: authority.id, url: project.website, provenance: external, section: 'evidence' }))
  }
  if (!response.citations.some(citation => citation.sourceType === 'first_party')) {
    const competitor = response.citations.find(citation => citation.sourceType === 'competitor')
    if (competitor || causes.length) {
      const exactText = competitor ? `Competitor citation: ${competitor.canonicalUrl}` : 'No normalized citation in this response matched the tracked domain.'
      causes.push(rootCause({ project, response, pillar: 'citation_gap', severity: competitor ? 'high' : 'medium', title: competitor ? 'Competitor cited while tracked domain was absent' : 'Tracked domain was not cited',
        description: 'This is direct citation evidence from the provider response; it does not establish why the provider selected its sources.',
        exactText, sourceId: competitor?.id, url: competitor?.canonicalUrl || project.website, provenance: null, section: 'citations' }))
    }
  }
  if (!causes.length) {
    causes.push(rootCause({ project, response, pillar: 'citation_gap', severity: 'low', title: 'No supported root cause found',
      description: 'This run did not cite the tracked domain, but the available diagnostics do not establish a specific cause.',
      exactText: 'No stored crawler, machine-intelligence, Sources & Authority, or citation evidence established a more specific factor.', url: project.website, section: 'citations' }))
  }
  return causes
}

function promptGenerationInput(project) {
  return `Generate 10 to 15 realistic AI visibility prompts for this brand. Cover discovery, recommendation, comparison, alternatives, problem/solution, branded facts, and reputation/trust. Balance awareness, consideration, and decision intent. Do not answer the prompts.\n\nProject:\n${JSON.stringify({
    website: project.website, brandName: project.brandName, brandAliases: project.brandAliases, businessCategory: project.businessCategory,
    productsServices: project.productsServices, targetAudience: project.targetAudience, targetCountry: project.targetCountry,
    language: project.language, knownCompetitors: project.knownCompetitors,
    siteSummary: project.diagnostics?.analysis?.data?.readable?.excerpt || project.diagnostics?.analysis?.data?.metadata?.description,
    siteContent: project.diagnostics?.analysis?.data?.readable?.textContent?.slice(0, 12000),
    externalEntity: project.diagnostics?.external?.data?.entity
  })}`
}

function semanticAnalysisInput(project, response, deterministic) {
  return `Analyze the raw answer for how it treats the tracked brand. Return only schema-valid JSON. Every supporting quote must be copied exactly from rawAnswer. Every detected entity must appear by name or alias in rawAnswer. Do not infer a citation caused a mention.\n\n${JSON.stringify({
    brandName: project.brandName, aliases: project.brandAliases, website: project.website, knownCompetitors: project.knownCompetitors,
    deterministic, rawAnswer: response.rawAnswer
  })}`
}

export function createAIVisibilityService({
  store = new InMemoryAIVisibilityStore(),
  providerRegistry = createVisibilityProviderRegistry(),
  env = process.env,
  fetchImpl = globalThis.fetch,
  dnsLookup = dns.lookup,
  externalStore = externalRunStore,
  now = () => Date.now(),
  concurrency = 3,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
} = {}) {
  const limit = createLimiter(concurrency)
  const pageCache = new Map()
  const pendingRuns = new Map()

  function provider(engine) {
    const selected = providerRegistry.get(engine)
    if (!selected) throw new AIVisibilityError(`Unsupported visibility engine: ${engine}`, { code: 'INVALID_ENGINE' })
    return selected
  }

  function analysisProvider() {
    const engine = getAnalysisEngine(env)
    const selected = provider(engine)
    const availability = selected.availability()
    if (!availability.available) throw new AIVisibilityError(`${engine} analysis provider is unavailable: ${availability.reason}.`, { code: 'PROVIDER_UNAVAILABLE', status: 503, engine })
    return selected
  }

  async function saveKnownCompetitors(project) {
    const existing = await store.getCompetitors(project.id)
    for (const name of project.knownCompetitors) {
      if (existing.some(entity => normalizeName(entity.name) === normalizeName(name))) continue
      await store.saveCompetitor({ id: id('entity'), projectId: project.id, name, aliases: [], relationship: 'direct_competitor', decision: 'confirmed', confirmed: true, domains: [], mentionCount: 0, appearedResponseIds: [], source: 'project_input' })
    }
  }

  async function createProjectSnapshot(projectId, input) {
    const project = validateProject(projectId, input.project)
    const capturedAt = new Date(now()).toISOString()
    const sessionId = string(input.diagnostics?.analysisSessionId, 200)
    const analysis = boundedAnalysisSnapshot(input.diagnostics?.analysis)
    const crawler = boundedCrawlerSnapshot(input.diagnostics?.crawler)
    const externalRun = input.diagnostics?.externalRunId ? externalStore.get(input.diagnostics.externalRunId) : null
    project.diagnostics = {
      externalRunId: string(input.diagnostics?.externalRunId, 300) || null,
      analysis: diagnosticRecord(analysis, 'request_snapshot', sessionId, capturedAt),
      crawler: diagnosticRecord(crawler, 'request_snapshot', sessionId, capturedAt),
      external: diagnosticRecord(boundedExternalSnapshot(externalRun), 'external_run', sessionId, capturedAt)
    }
    const saved = await store.saveProject(project)
    await saveKnownCompetitors(saved)
    return saved
  }

  async function generatePrompts(projectId, input) {
    const project = await createProjectSnapshot(projectId, input || {})
    const selected = analysisProvider()
    let result
    try {
      result = await selected.runPrompt({ prompt: promptGenerationInput(project), model: selected.model, webSearchEnabled: false, language: project.language, country: project.targetCountry, responseSchema: PROMPT_SCHEMA, schemaName: 'visibility_prompts' })
    } catch (error) {
      throw normalizeServiceError(error)
    }
    const generated = validateGeneratedPrompts(parseJsonAnswer(result.answer, 'Prompt generation'))
    const createdAt = new Date(now()).toISOString()
    const prompts = generated.map(item => ({
      id: id('prompt'), projectId, text: string(item.text, 2000), category: item.category, funnelStage: item.funnelStage,
      priority: item.priority, country: string(item.country || project.targetCountry, 100), language: string(item.language || project.language, 100),
      persona: string(item.persona, 300) || undefined, status: 'candidate', createdAt, updatedAt: createdAt
    }))
    await store.savePrompts(prompts, { replaceCandidates: true })
    return { projectId, prompts }
  }

  async function updatePrompt(promptId, patch) {
    const current = await store.getPrompt(promptId)
    if (!current) throw new AIVisibilityError('Prompt was not found.', { code: 'PROMPT_NOT_FOUND', status: 404 })
    const allowed = {}
    if ('text' in patch) { allowed.text = string(patch.text, 2000); if (!allowed.text) throw new AIVisibilityError('Prompt text cannot be empty.') }
    if ('category' in patch) { if (!PROMPT_CATEGORIES.includes(patch.category)) throw new AIVisibilityError('Invalid prompt category.'); allowed.category = patch.category }
    if ('funnelStage' in patch) { if (!FUNNEL_STAGES.includes(patch.funnelStage)) throw new AIVisibilityError('Invalid funnel stage.'); allowed.funnelStage = patch.funnelStage }
    if ('priority' in patch) { if (!PRIORITIES.includes(patch.priority)) throw new AIVisibilityError('Invalid prompt priority.'); allowed.priority = patch.priority }
    if ('status' in patch) { if (!['candidate', 'approved', 'rejected'].includes(patch.status)) throw new AIVisibilityError('Invalid prompt status.'); allowed.status = patch.status }
    if ('country' in patch) allowed.country = string(patch.country, 100)
    if ('language' in patch) allowed.language = string(patch.language, 100)
    if ('persona' in patch) allowed.persona = string(patch.persona, 300) || undefined
    return store.updatePrompt(promptId, allowed)
  }

  async function callWithRetry(selected, input) {
    let lastError
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 60000)
      try { return await selected.runPrompt({ ...input, signal: controller.signal }) }
      catch (error) {
        lastError = error
        const retryable = error.retryable || error.name === 'AbortError' || TRANSIENT_CODES.has(error.code)
        if (!retryable || attempt === 3) throw error
        await sleep(Math.min(5000, error.retryAfterMs ?? (attempt === 1 ? 500 : 1500)))
      } finally { clearTimeout(timer) }
    }
    throw lastError
  }

  async function validateCitationSupport(citation) {
    const checkText = citation.citedText
    if (!checkText) return { supportStatus: 'not_checked' }
    let content = pageCache.get(citation.canonicalUrl)
    if (content && content.expiresAt <= now()) { pageCache.delete(citation.canonicalUrl); content = null }
    try {
      if (!content) {
        const textContent = await fetchReadableCitation(citation.canonicalUrl, { fetchImpl, dnsLookup })
        content = { textContent, expiresAt: now() + DAY_MS }
        pageCache.set(citation.canonicalUrl, content)
        while (pageCache.size > 200) pageCache.delete(pageCache.keys().next().value)
      }
      const normalizedNeedle = checkText.replace(/\s+/g, ' ').trim().toLocaleLowerCase()
      const normalizedPage = content.textContent.replace(/\s+/g, ' ').trim().toLocaleLowerCase()
      if (normalizedPage.includes(normalizedNeedle)) return { supportStatus: 'supported', supportConfidence: 'high' }
      const score = similarity(checkText, content.textContent)
      if (score >= 0.8) return { supportStatus: 'supported', supportConfidence: 'medium' }
      if (score >= 0.55) return { supportStatus: 'partially_supported', supportConfidence: 'medium' }
      return { supportStatus: 'unsupported', supportConfidence: score >= 0.3 ? 'medium' : 'high' }
    } catch {
      return { supportStatus: 'unavailable' }
    }
  }

  async function normalizeCitations(project, responseId, items) {
    const competitors = await store.getCompetitors(project.id)
    return Promise.all(items.map(async (item, index) => {
      const sourceType = sourceTypeFor(item, project, competitors)
      const citation = {
        id: `${responseId}_citation_${index + 1}`, responseId, url: item.url, canonicalUrl: item.canonicalUrl || canonicalizeUrl(item.url),
        domain: item.domain || domainFromUrl(item.canonicalUrl || item.url), title: item.title, citedText: item.citedText,
        answerStartIndex: item.answerStartIndex, answerEndIndex: item.answerEndIndex,
        sourceType, supportStatus: 'not_checked', associatedBrands: associatedBrandsFor(item, project, competitors, sourceType)
      }
      return { ...citation, ...await validateCitationSupport(citation) }
    }))
  }

  async function saveDetectedEntities(project, responseId, semantic, deterministic) {
    const existing = await store.getCompetitors(project.id)
    const found = [...(semantic.detectedEntities || [])]
    for (const name of deterministic.knownCompetitorMatches) found.push({ name, aliases: [], relationship: 'direct_competitor' })
    for (const item of found) {
      const current = existing.find(entity => normalizeName(entity.name) === normalizeName(item.name) || entity.aliases?.some(alias => normalizeName(alias) === normalizeName(item.name)))
      if (current) {
        const appeared = [...new Set([...(current.appearedResponseIds || []), responseId])]
        await store.saveCompetitor({ ...current, mentionCount: appeared.length, appearedResponseIds: appeared })
      } else {
        const entity = { id: id('entity'), projectId: project.id, name: string(item.name, 200), aliases: strings(item.aliases, 20, 200), relationship: item.relationship,
          decision: 'pending', confirmed: false, domains: [], mentionCount: 1, appearedResponseIds: [responseId], source: 'answer_analysis' }
        await store.saveCompetitor(entity)
        existing.push(entity)
      }
    }
  }

  async function executeTask(runId, task) {
    const run = await store.getRun(runId)
    const project = await store.getProject(run.projectId)
    const selected = provider(task.engine)
    const responseId = id('response')
    const startedAt = new Date(now()).toISOString()
    let result
    try {
      result = await callWithRetry(selected, { prompt: task.promptText, model: selected.model, webSearchEnabled: run.webSearchEnabled, country: task.country, language: task.language })
    } catch (error) {
      await store.updateRun(runId, current => ({ failedTasks: current.failedTasks + 1, completedTasks: current.completedTasks + 1, errors: [...current.errors, { ...errorShape(error, task.engine), promptId: task.promptId }] }))
      return
    }
    const citations = await normalizeCitations(project, responseId, result.citations || [])
    const response = {
      id: responseId, projectId: project.id, runId, promptId: task.promptId, promptText: task.promptText, engine: task.engine,
      model: result.model, webSearchEnabled: run.webSearchEnabled, rawAnswer: result.answer, rawProviderResponse: result.rawResponse,
      citations, searchQueries: result.searchQueries || [], status: 'complete', startedAt, completedAt: new Date(now()).toISOString(), latencyMs: result.latencyMs
    }
    await store.saveResponse(response)
    await store.updateRun(runId, current => ({ status: 'analyzing', completedTasks: current.completedTasks + 1 }))
    const deterministic = deterministicAnalysis(project, response.rawAnswer, citations)
    try {
      const analyzer = analysisProvider()
      const semanticResult = await callWithRetry(analyzer, {
        prompt: semanticAnalysisInput(project, response, deterministic), model: analyzer.model, webSearchEnabled: false,
        country: project.targetCountry, language: project.language, responseSchema: ANALYSIS_SCHEMA, schemaName: 'visibility_answer_analysis'
      })
      const semantic = validateSemanticAnalysis(parseJsonAnswer(semanticResult.answer, 'Answer analysis'), response.rawAnswer)
      const analysis = {
        responseId, ...deterministic,
        recommendation: deterministic.brandMentioned ? semantic.recommendation : 'not_present', sentiment: semantic.sentiment,
        supportingQuotes: strings(semantic.supportingQuotes, 20, 1000), associatedAttributes: strings(semantic.associatedAttributes, 30, 300),
        reasonsForRecommendation: strings(semantic.reasonsForRecommendation, 30, 500),
        detectedEntities: (semantic.detectedEntities || []).map(item => ({ id: id('detected'), name: item.name, aliases: strings(item.aliases, 20, 200), relationship: item.relationship, confirmed: false, mentionCount: 1 })),
        confidence: semantic.confidence,
        citationState: citationStateFor(deterministic, citations)
      }
      await store.saveAnalysis(analysis)
      await saveDetectedEntities(project, responseId, semantic, deterministic)
      const latest = await store.getResponse(responseId)
      const causes = buildRootCauses(project, latest, analysis)
      await store.replaceRootCauses(responseId, causes)
    } catch (error) {
      await store.updateRun(runId, current => ({ errors: [...current.errors, { ...errorShape(error, getAnalysisEngine(env)), promptId: task.promptId, responseId }] }))
    }
  }

  async function executeRun(runId, tasks) {
    await store.updateRun(runId, { status: 'running' })
    await Promise.all(tasks.map(task => limit(() => executeTask(runId, task))))
    const responses = await store.getResponses((await store.getRun(runId)).projectId)
    const runResponses = responses.filter(response => response.runId === runId)
    const run = await store.getRun(runId)
    const status = !runResponses.length ? 'failed' : run.errors.length || run.failedTasks ? 'completed_degraded' : 'completed'
    await store.updateRun(runId, { status, completedAt: new Date(now()).toISOString() })
    return store.getRun(runId)
  }

  async function createRun(projectId, input) {
    let project = await store.getProject(projectId)
    if (!project) throw new AIVisibilityError('Project was not found. Generate prompts first.', { code: 'PROJECT_NOT_FOUND', status: 404 })
    if (project.diagnostics?.externalRunId) {
      const currentExternalRun = externalStore.get(project.diagnostics.externalRunId)
      if (currentExternalRun) {
        const capturedAt = new Date(now()).toISOString()
        project = await store.saveProject({
          ...project,
          diagnostics: {
            ...project.diagnostics,
            external: diagnosticRecord(boundedExternalSnapshot(currentExternalRun), 'external_run', project.diagnostics.analysis?.analysisSessionId, capturedAt)
          }
        })
      }
    }
    analysisProvider()
    const promptIds = [...new Set(input.promptIds || [])]
    const engines = [...new Set(input.engines || [])]
    if (!promptIds.length) throw new AIVisibilityError('At least one approved prompt is required.')
    if (!engines.length || engines.some(engine => !ENGINE_IDS.includes(engine))) throw new AIVisibilityError('At least one supported engine is required.', { code: 'INVALID_ENGINE' })
    const prompts = await Promise.all(promptIds.map(promptId => store.getPrompt(promptId)))
    if (prompts.some(prompt => !prompt || prompt.projectId !== projectId || prompt.status !== 'approved')) throw new AIVisibilityError('Every requested prompt must exist, belong to the project, and be approved.', { code: 'PROMPT_NOT_APPROVED' })
    for (const engine of engines) {
      const availability = provider(engine).availability()
      if (!availability.available) throw new AIVisibilityError(`${engine} is unavailable: ${availability.reason}.`, { code: 'PROVIDER_UNAVAILABLE', status: 503, engine })
    }
    const createdAt = new Date(now()).toISOString()
    const tasks = prompts.flatMap(prompt => engines.map(engine => ({ promptId: prompt.id, promptText: prompt.text, engine, country: prompt.country || project.targetCountry, language: prompt.language || project.language })))
    const run = {
      id: id('visibility_run'), projectId, promptIds, promptSnapshots: prompts.map(prompt => ({ id: prompt.id, text: prompt.text })), engines,
      webSearchEnabled: Boolean(input.webSearchEnabled), status: 'queued', totalTasks: tasks.length, completedTasks: 0, failedTasks: 0,
      createdAt, updatedAt: createdAt, expiresAt: new Date(now() + store.ttlMs).toISOString(), errors: []
    }
    await store.createRun(run)
    const pending = Promise.resolve().then(() => executeRun(run.id, tasks)).finally(() => pendingRuns.delete(run.id))
    pendingRuns.set(run.id, pending)
    return run
  }

  async function waitForRun(runId) { await pendingRuns.get(runId); return store.getRun(runId) }

  async function getRun(runId) {
    const run = await store.getRun(runId)
    if (run) return run
    const expired = store.missingRunReason(runId) === 'expired'
    throw new AIVisibilityError(expired ? 'Temporary visibility run has expired.' : 'Visibility run was not found.', { code: expired ? 'RUN_EXPIRED' : 'RUN_NOT_FOUND', status: expired ? 410 : 404 })
  }

  async function responseDetail(responseId) {
    const response = await store.getResponse(responseId)
    if (!response) throw new AIVisibilityError('Visibility response was not found.', { code: 'RESPONSE_NOT_FOUND', status: 404 })
    return { ...response, analysis: await store.getAnalysis(responseId), rootCauses: await store.getResponseRootCauses(responseId) }
  }

  async function projectResponses(projectId, filters = {}) {
    const responses = (await store.getResponses(projectId)).filter(response => !filters.runId || response.runId === filters.runId)
      .filter(response => !filters.engine || response.engine === filters.engine).filter(response => !filters.promptId || response.promptId === filters.promptId)
    return Promise.all(responses.map(async response => {
      const summary = { ...response }
      delete summary.rawProviderResponse
      return { ...summary, analysis: await store.getAnalysis(response.id) }
    }))
  }

  async function reclassifyProject(projectId) {
    const project = await store.getProject(projectId)
    const competitors = await store.getCompetitors(projectId)
    for (const response of await store.getResponses(projectId)) {
      response.citations = response.citations.map(citation => {
        const sourceType = sourceTypeFor(citation, project, competitors)
        return { ...citation, sourceType, associatedBrands: associatedBrandsFor(citation, project, competitors, sourceType) }
      })
      await store.saveResponse(response)
      const analysis = await store.getAnalysis(response.id)
      if (analysis) {
        await store.saveAnalysis({ ...analysis, citationState: citationStateFor(analysis, response.citations) })
        await store.replaceRootCauses(response.id, buildRootCauses(project, response, analysis))
      }
    }
  }

  async function updateCompetitor(entityId, patch) {
    const current = await store.getCompetitor(entityId)
    if (!current) throw new AIVisibilityError('Competitor entity was not found.', { code: 'COMPETITOR_NOT_FOUND', status: 404 })
    if (!['confirm', 'reject'].includes(patch.decision)) throw new AIVisibilityError('decision must be confirm or reject.')
    const next = {
      ...current,
      decision: patch.decision === 'confirm' ? 'confirmed' : 'rejected', confirmed: patch.decision === 'confirm',
      relationship: patch.relationship && RELATIONSHIPS.includes(patch.relationship) ? patch.relationship : current.relationship,
      aliases: 'aliases' in patch ? strings(patch.aliases, 20, 200) : current.aliases,
      domains: 'domains' in patch ? strings(patch.domains, 20, 300).map(domain => domainFromUrl(domain.includes('://') ? domain : `https://${domain}`)).filter(Boolean) : current.domains,
      decidedAt: new Date(now()).toISOString()
    }
    await store.saveCompetitor(next)
    await reclassifyProject(current.projectId)
    return next
  }

  async function metrics(projectId) {
    const responses = await store.getResponses(projectId)
    const analyzed = []
    for (const response of responses) {
      const analysis = await store.getAnalysis(response.id)
      if (analysis) analyzed.push({ response, analysis })
    }
    const mentioned = analyzed.filter(item => item.analysis.brandMentioned)
    const recommended = analyzed.filter(item => ['strongly_recommended', 'recommended'].includes(item.analysis.recommendation))
    const ranked = mentioned.map(item => item.analysis.mentionPosition).filter(Number.isFinite)
    const firstPartyResponses = responses.filter(response => response.citations.some(citation => citation.sourceType === 'first_party'))
    const citations = responses.flatMap(response => response.citations)
    const checked = citations.filter(citation => ['supported', 'partially_supported', 'unsupported'].includes(citation.supportStatus))
    const supported = checked.filter(citation => citation.supportStatus === 'supported').length
    const partial = checked.filter(citation => citation.supportStatus === 'partially_supported').length
    const unsupported = checked.filter(citation => citation.supportStatus === 'unsupported').length
    const competitors = (await store.getCompetitors(projectId)).filter(entity => entity.decision === 'confirmed' && entity.mentionCount > 0)
    const runs = [...store.runs.values()].filter(run => run.projectId === projectId)
    const engineBreakdown = ENGINE_IDS.map(engine => {
      const engineAnalyzed = analyzed.filter(item => item.response.engine === engine)
      const engineResponses = responses.filter(response => response.engine === engine)
      return {
        engine, responseCount: engineResponses.length,
        mentionRate: percent(engineAnalyzed.filter(item => item.analysis.brandMentioned).length, engineAnalyzed.length),
        recommendationRate: percent(engineAnalyzed.filter(item => ['strongly_recommended', 'recommended'].includes(item.analysis.recommendation)).length, engineAnalyzed.length)
      }
    }).filter(item => item.responseCount > 0)
    const domains = new Map()
    for (const citation of citations) domains.set(citation.domain, (domains.get(citation.domain) || 0) + 1)
    return {
      mentionRate: percent(mentioned.length, analyzed.length), recommendationRate: percent(recommended.length, analyzed.length),
      firstPartyCitationRate: percent(firstPartyResponses.length, responses.length),
      averagePosition: ranked.length ? Number((ranked.reduce((sum, value) => sum + value, 0) / ranked.length).toFixed(1)) : null,
      competitorsDetected: competitors.length, citationShare: percent(citations.filter(citation => citation.sourceType === 'first_party').length, citations.length),
      distinctFirstPartyPagesCited: new Set(citations.filter(citation => citation.sourceType === 'first_party').map(citation => citation.canonicalUrl)).size,
      citationSupportRate: percent(supported, checked.length), citationSupportCounts: { checked: checked.length, supported, partiallySupported: partial, unsupported },
      successfulRunCount: runs.filter(run => ['completed', 'completed_degraded'].includes(run.status)).length,
      failedRunCount: runs.filter(run => run.status === 'failed').length,
      engineBreakdown,
      topCompetitors: competitors.sort((a, b) => b.mentionCount - a.mentionCount).slice(0, 10),
      topCitationSources: [...domains.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([domain, count]) => ({ domain, count, share: percent(count, citations.length) }))
    }
  }

  async function overview(projectId) {
    const project = await store.getProject(projectId)
    const base = { persistence: 'temporary', historyAvailable: false, trendsAvailable: false }
    if (!project) return { status: 'empty', ...base, engines: [...providerRegistry.values()].map(item => ({ id: item.id, ...item.availability(), capabilities: item.capabilities })), promptCount: 0 }
    const prompts = await store.getPrompts(projectId)
    const runs = [...store.runs.values()].filter(run => run.projectId === projectId).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    const latestRun = runs[0]
    if (latestRun && !RUN_TERMINAL.has(latestRun.status)) return { status: 'running', ...base, run: latestRun }
    if (!latestRun) return { status: 'empty', ...base, engines: [...providerRegistry.values()].map(item => ({ id: item.id, ...item.availability(), capabilities: item.capabilities })), promptCount: prompts.length }
    const calculated = await metrics(projectId)
    const latestResponses = (await projectResponses(projectId, { runId: latestRun.id }))
    const comparisonPrompt = prompts.filter(prompt => latestResponses.some(response => response.promptId === prompt.id)).sort((a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority))[0]
    const rootCauses = await store.getRootCauses(projectId)
    return {
      status: 'ready', ...base, latestRun,
      metrics: Object.fromEntries(Object.entries(calculated).filter(([key]) => !['engineBreakdown', 'topCompetitors', 'topCitationSources'].includes(key))),
      engineBreakdown: calculated.engineBreakdown, topCompetitors: calculated.topCompetitors, topCitationSources: calculated.topCitationSources,
      answerComparison: comparisonPrompt ? { prompt: comparisonPrompt, responses: latestResponses.filter(response => response.promptId === comparisonPrompt.id) } : null,
      rootCausePreview: rootCauses.slice(0, 5)
    }
  }

  function normalizeServiceError(error) {
    if (error instanceof AIVisibilityError) return error
    if (error instanceof VisibilityProviderError) return new AIVisibilityError(error.message, { code: error.code, status: error.code === 'PROVIDER_UNAVAILABLE' ? 503 : 502, engine: error.engine, retryable: error.retryable })
    return new AIVisibilityError(string(error.message || 'AI Visibility operation failed.', 500), { code: 'AI_VISIBILITY_ERROR', status: 500 })
  }

  return {
    store, generatePrompts, updatePrompt, createRun, getRun, waitForRun, responseDetail, projectResponses, updateCompetitor, metrics, overview,
    listPrompts: projectId => store.getPrompts(projectId),
    listCompetitors: projectId => store.getCompetitors(projectId),
    listCitations: async projectId => (await store.getResponses(projectId)).flatMap(response => response.citations),
    listRootCauses: projectId => store.getRootCauses(projectId),
    engineStatus: () => [...providerRegistry.values()].map(item => ({ id: item.id, transport: item.transport, model: item.model || null, ...item.availability(), capabilities: item.capabilities })),
    normalizeServiceError
  }
}

export const aiVisibilityStore = new InMemoryAIVisibilityStore()
export const aiVisibilityService = createAIVisibilityService({ store: aiVisibilityStore })
