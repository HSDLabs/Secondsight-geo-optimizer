import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenAI } from '@google/genai'
import OpenAI from 'openai'

const ENGINE_IDS = ['openai', 'gemini', 'claude']
const TRANSPORTS = new Set(['direct', 'openrouter', 'disabled'])
const DEFAULT_TRANSPORTS = { openai: 'direct', gemini: 'direct', claude: 'disabled' }
const DEFAULT_TIMEOUT_MS = 60000

export class VisibilityProviderError extends Error {
  constructor(message, { code = 'PROVIDER_ERROR', engine, retryable = false, status } = {}) {
    super(message)
    this.name = 'VisibilityProviderError'
    this.code = code
    this.engine = engine
    this.retryable = retryable
    this.status = status
  }
}

export function canonicalizeUrl(value) {
  try {
    const url = new URL(String(value || ''))
    if (!['http:', 'https:'].includes(url.protocol)) return ''
    url.hash = ''
    url.username = ''
    url.password = ''
    url.hostname = url.hostname.toLowerCase().replace(/\.$/, '')
    if ((url.protocol === 'http:' && url.port === '80') || (url.protocol === 'https:' && url.port === '443')) url.port = ''
    const tracking = /^(utm_.+|gclid|dclid|fbclid|msclkid|mc_cid|mc_eid)$/i
    const retained = [...url.searchParams.entries()]
      .filter(([key]) => !tracking.test(key))
      .sort(([aKey, aValue], [bKey, bValue]) => aKey.localeCompare(bKey) || aValue.localeCompare(bValue))
    url.search = ''
    for (const [key, item] of retained) url.searchParams.append(key, item)
    url.pathname = url.pathname.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/'
    return url.href
  } catch {
    return ''
  }
}

export function domainFromUrl(value) {
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, '') } catch { return '' }
}

function providerCitation(citation) {
  const url = citation.url || citation.uri || citation.url_citation?.url
  const canonicalUrl = canonicalizeUrl(url)
  if (!canonicalUrl) return null
  const start = citation.start_index ?? citation.startIndex ?? citation.url_citation?.start_index
  const end = citation.end_index ?? citation.endIndex ?? citation.url_citation?.end_index
  return {
    url,
    canonicalUrl,
    domain: domainFromUrl(canonicalUrl),
    title: citation.title || citation.url_citation?.title || undefined,
    citedText: citation.cited_text || citation.citedText || citation.url_citation?.content || undefined,
    answerStartIndex: Number.isInteger(start) ? start : undefined,
    answerEndIndex: Number.isInteger(end) ? end : undefined
  }
}

function uniqueCitations(items) {
  const seen = new Set()
  return items.filter(Boolean).filter(item => {
    const key = `${item.canonicalUrl}|${item.answerStartIndex ?? ''}|${item.answerEndIndex ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function normalizeOpenAIResponse(response) {
  let answer = response.output_text || ''
  const citations = []
  const searchQueries = []
  for (const item of response.output || []) {
    if (item.type === 'message') {
      for (const content of item.content || []) {
        if (content.type === 'output_text') {
          answer ||= content.text || ''
          for (const annotation of (content.annotations || []).filter(annotation => annotation.type === 'url_citation')) {
            const normalized = providerCitation(annotation)
            if (normalized && !normalized.citedText && Number.isInteger(normalized.answerStartIndex) && Number.isInteger(normalized.answerEndIndex)) {
              normalized.citedText = content.text.slice(normalized.answerStartIndex, normalized.answerEndIndex)
            }
            citations.push(normalized)
          }
        }
      }
    }
    if (item.type === 'web_search_call') {
      const action = item.action || {}
      searchQueries.push(...(action.queries || [action.query]).filter(Boolean))
    }
  }
  return { answer, citations: uniqueCitations(citations), searchQueries: [...new Set(searchQueries)] }
}

export function normalizeGeminiResponse(interaction) {
  let answer = interaction.output_text || interaction.outputText || ''
  const citations = []
  const searchQueries = []
  for (const step of interaction.steps || []) {
    const type = step.type
    if (type === 'google_search_call') {
      searchQueries.push(...(step.arguments?.queries || step.args?.queries || []).filter(Boolean))
    }
    if (type === 'model_output') {
      for (const content of step.content || []) {
        if (content.type === 'text') {
          answer ||= content.text || ''
          for (const annotation of content.annotations || []) {
            if (annotation.type === 'url_citation') {
              const normalized = providerCitation(annotation)
              if (normalized && !normalized.citedText && Number.isInteger(normalized.answerStartIndex) && Number.isInteger(normalized.answerEndIndex)) {
                normalized.citedText = content.text.slice(normalized.answerStartIndex, normalized.answerEndIndex)
              }
              citations.push(normalized)
            }
          }
        }
      }
    }
  }
  return { answer, citations: uniqueCitations(citations), searchQueries: [...new Set(searchQueries)] }
}

export function normalizeClaudeResponse(responseOrResponses) {
  const responses = Array.isArray(responseOrResponses) ? responseOrResponses : [responseOrResponses]
  let answer = ''
  const citations = []
  const searchQueries = []
  for (const response of responses) {
    for (const block of response.content || []) {
      if (block.type === 'text') {
        answer += block.text || ''
        citations.push(...(block.citations || []).filter(citation => citation.type === 'web_search_result_location').map(providerCitation))
      }
      if (block.type === 'server_tool_use' && block.name === 'web_search') {
        const query = block.input?.query
        if (query) searchQueries.push(query)
      }
    }
  }
  return { answer, citations: uniqueCitations(citations), searchQueries: [...new Set(searchQueries)] }
}

export function normalizeOpenRouterResponse(response) {
  const message = response.choices?.[0]?.message || {}
  const citations = (message.annotations || [])
    .filter(annotation => annotation.type === 'url_citation')
    .map(annotation => {
      const normalized = providerCitation(annotation.url_citation || annotation)
      if (normalized && !normalized.citedText && Number.isInteger(normalized.answerStartIndex) && Number.isInteger(normalized.answerEndIndex)) {
        normalized.citedText = String(message.content || '').slice(normalized.answerStartIndex, normalized.answerEndIndex)
      }
      return normalized
    })
  return { answer: message.content || '', citations: uniqueCitations(citations), searchQueries: [] }
}

function configuredModel(env, engine) {
  return env[`${engine.toUpperCase()}_MODEL`] || ''
}

function configuredTransport(env, engine) {
  return (env[`${engine.toUpperCase()}_TRANSPORT`] || DEFAULT_TRANSPORTS[engine]).toLowerCase()
}

function directKey(env, engine) {
  if (engine === 'openai') return env.OPENAI_API_KEY || env.CHATGPT_API_KEY || ''
  if (engine === 'gemini') return env.GEMINI_API_KEY || env.GOOGLE_GEMINI_API || ''
  return env.ANTHROPIC_API_KEY || ''
}

function availabilityFor(env, engine) {
  const transport = configuredTransport(env, engine)
  const key = transport === 'openrouter' ? env.OPENROUTER_API_KEY : directKey(env, engine)
  if (!key) return { available: false, reason: 'API key not configured' }
  if (!configuredModel(env, engine)) return { available: false, reason: 'Model not configured' }
  if (!TRANSPORTS.has(transport)) return { available: false, reason: 'Unsupported transport configuration' }
  if (transport === 'disabled') return { available: false, reason: 'Provider disabled' }
  return { available: true }
}

function providerCapabilities(transport) {
  return {
    webSearch: transport !== 'disabled',
    citations: transport !== 'disabled',
    structuredOutput: transport === 'direct' || transport === 'openrouter'
  }
}

function schemaInstruction(input) {
  if (!input.responseSchema) return input.prompt
  return `${input.prompt}\n\nReturn only JSON matching this schema:\n${JSON.stringify(input.responseSchema)}`
}

function runContext(input) {
  const parts = []
  if (input.language) parts.push(`Answer in ${input.language}.`)
  if (input.country) parts.push(`Use context relevant to ${input.country}.`)
  return parts.join(' ')
}

function retryAfterMs(error) {
  const value = error.headers?.get?.('retry-after') || error.headers?.['retry-after'] || error.response?.headers?.get?.('retry-after')
  if (!value) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds)) return Math.min(5000, Math.max(0, seconds * 1000))
  const date = Date.parse(value)
  return Number.isFinite(date) ? Math.min(5000, Math.max(0, date - Date.now())) : undefined
}

function classifyError(error, engine) {
  if (error instanceof VisibilityProviderError) return error
  const status = error.status || error.statusCode || error.response?.status
  const code = error.code || error.error?.code
  const retryable = error.name === 'AbortError' || status === 408 || status === 409 || status === 429 || status >= 500 || ['ABORT_ERR', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'UND_ERR_CONNECT_TIMEOUT'].includes(code)
  const classified = new VisibilityProviderError(String(error.message || `${engine} request failed.`), {
    code: retryable ? 'PROVIDER_TRANSIENT_ERROR' : 'PROVIDER_REQUEST_FAILED',
    engine,
    retryable,
    status
  })
  classified.retryAfterMs = retryAfterMs(error)
  return classified
}

function createOpenAIClient(apiKey, clients) {
  return clients.openai || new OpenAI({ apiKey, timeout: DEFAULT_TIMEOUT_MS, maxRetries: 0 })
}

function createGeminiClient(apiKey, clients) {
  return clients.gemini || new GoogleGenAI({ apiKey })
}

function createClaudeClient(apiKey, clients) {
  return clients.claude || new Anthropic({ apiKey, timeout: DEFAULT_TIMEOUT_MS, maxRetries: 0 })
}

async function runOpenAI(input, env, clients) {
  const client = createOpenAIClient(directKey(env, 'openai'), clients)
  const request = {
    model: input.model,
    input: schemaInstruction(input),
    ...(runContext(input) ? { instructions: runContext(input) } : {}),
    ...(input.webSearchEnabled ? { tools: [{ type: 'web_search' }], include: ['web_search_call.action.sources'] } : {}),
    ...(input.responseSchema ? { text: { format: { type: 'json_schema', name: input.schemaName || 'visibility_output', strict: true, schema: input.responseSchema } } } : {})
  }
  const rawResponse = await client.responses.create(request, { signal: input.signal })
  return { ...normalizeOpenAIResponse(rawResponse), rawResponse }
}

async function runGemini(input, env, clients) {
  const client = createGeminiClient(directKey(env, 'gemini'), clients)
  const rawResponse = await client.interactions.create({
    model: input.model,
    input: schemaInstruction(input),
    store: false,
    ...(runContext(input) ? { system_instruction: runContext(input) } : {}),
    ...(input.webSearchEnabled ? { tools: [{ type: 'google_search' }] } : {}),
    ...(input.responseSchema ? { response_format: { type: 'text', mime_type: 'application/json', schema: input.responseSchema } } : {})
  }, { signal: input.signal })
  return { ...normalizeGeminiResponse(rawResponse), rawResponse }
}

async function runClaude(input, env, clients) {
  const client = createClaudeClient(directKey(env, 'claude'), clients)
  const responses = []
  const messages = [{ role: 'user', content: schemaInstruction(input) }]
  for (let continuation = 0; continuation < 3; continuation += 1) {
    const response = await client.messages.create({
      model: input.model,
      max_tokens: 4096,
      messages,
      ...(runContext(input) ? { system: runContext(input) } : {}),
      ...(input.responseSchema ? { output_config: { format: { type: 'json_schema', schema: input.responseSchema } } } : {}),
      ...(input.webSearchEnabled ? { tools: [{ type: 'web_search_20260318', name: 'web_search', max_uses: 5, allowed_callers: ['direct'] }] } : {})
    }, { signal: input.signal })
    responses.push(response)
    if (response.stop_reason !== 'pause_turn') break
    messages.push({ role: 'assistant', content: response.content })
  }
  if (responses.at(-1)?.stop_reason === 'pause_turn') {
    throw new VisibilityProviderError('Claude web search did not complete within the continuation limit.', { code: 'PROVIDER_TIMEOUT', engine: 'claude', retryable: true })
  }
  const rawResponse = responses.length === 1 ? responses[0] : responses
  return { ...normalizeClaudeResponse(responses), rawResponse }
}

async function runOpenRouter(input, env, fetchImpl) {
  const response = await fetchImpl('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    signal: input.signal,
    body: JSON.stringify({
      model: input.model,
      messages: [...(runContext(input) ? [{ role: 'system', content: runContext(input) }] : []), { role: 'user', content: schemaInstruction(input) }],
      ...(input.webSearchEnabled ? { tools: [{ type: 'openrouter:web_search' }] } : {}),
      ...(input.responseSchema ? { response_format: { type: 'json_schema', json_schema: { name: input.schemaName || 'visibility_output', strict: true, schema: input.responseSchema } } } : {})
    })
  })
  const rawResponse = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new VisibilityProviderError(rawResponse.error?.message || `OpenRouter request failed with HTTP ${response.status}.`, {
      code: response.status === 429 || response.status >= 500 ? 'PROVIDER_TRANSIENT_ERROR' : 'PROVIDER_REQUEST_FAILED',
      retryable: response.status === 429 || response.status >= 500,
      status: response.status
    })
  }
  return { ...normalizeOpenRouterResponse(rawResponse), rawResponse }
}

export function createVisibilityProviderRegistry({ env = process.env, clients = {}, fetchImpl = globalThis.fetch, now = () => Date.now() } = {}) {
  const registry = new Map()
  for (const id of ENGINE_IDS) {
    const transport = configuredTransport(env, id)
    registry.set(id, {
      id,
      transport,
      model: configuredModel(env, id),
      capabilities: providerCapabilities(transport),
      availability: () => availabilityFor(env, id),
      async runPrompt(input) {
        const availability = availabilityFor(env, id)
        if (!availability.available) {
          throw new VisibilityProviderError(availability.reason, { code: 'PROVIDER_UNAVAILABLE', engine: id, retryable: false })
        }
        const started = now()
        try {
          const result = transport === 'openrouter'
            ? await runOpenRouter({ ...input, model: input.model || configuredModel(env, id) }, env, fetchImpl)
            : id === 'openai'
              ? await runOpenAI({ ...input, model: input.model || configuredModel(env, id) }, env, clients)
              : id === 'gemini'
                ? await runGemini({ ...input, model: input.model || configuredModel(env, id) }, env, clients)
                : await runClaude({ ...input, model: input.model || configuredModel(env, id) }, env, clients)
          return { ...result, model: input.model || configuredModel(env, id), latencyMs: Math.max(0, now() - started) }
        } catch (error) {
          throw classifyError(error, id)
        }
      }
    })
  }
  return registry
}

export function getAnalysisEngine(env = process.env) {
  const engine = String(env.ANALYSIS_ENGINE || 'openai').toLowerCase()
  if (!ENGINE_IDS.includes(engine)) throw new TypeError('ANALYSIS_ENGINE must be openai, gemini, or claude.')
  return engine
}
