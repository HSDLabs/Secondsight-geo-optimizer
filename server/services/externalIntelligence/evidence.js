import crypto from 'node:crypto'
import { safeSourceUrl, sanitizeText } from './security.js'

export const NORMALIZATION_VERSION = '1.0.0'

const POSITIVE_WORDS = ['helpful', 'love', 'best', 'improved', 'reliable', 'great', 'useful', 'positive', 'success', 'secure']
const NEGATIVE_WORDS = ['outage', 'breach', 'privacy', 'lawsuit', 'complaint', 'broken', 'risk', 'controversy', 'failure', 'unsafe']
const AMBIGUOUS_NEGATIVE_CONTEXT = {
  apple: ['fruit', 'recipe', 'orchard', 'pie', 'tree'],
  discord: ['argument', 'disagreement', 'conflict between'],
  nike: ['person named nike', 'nike goddess'],
  notion: ['notion that', 'concept', 'idea of'],
  linear: ['linear equation', 'linear algebra', 'regression'],
  monday: ['monday morning', 'on monday', 'next monday']
}

function contentHash(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function tokens(value) {
  return unique(String(value || '').toLowerCase().match(/[a-z0-9][a-z0-9+#.-]{2,}/g) || [])
    .filter(token => !['this', 'that', 'with', 'from', 'have', 'about', 'your', 'their', 'https', 'www'].includes(token))
}

function sentimentFor(text) {
  const lower = text.toLowerCase()
  const positive = POSITIVE_WORDS.filter(word => lower.includes(word)).length
  const negative = NEGATIVE_WORDS.filter(word => lower.includes(word)).length
  if (!positive && !negative) return { sentiment: 'unknown', confidence: 0 }
  if (positive && negative) return { sentiment: 'mixed', confidence: Math.min(1, (positive + negative) / 5) }
  return { sentiment: positive > negative ? 'positive' : 'negative', confidence: Math.min(1, Math.max(positive, negative) / 3) }
}

export function buildEntityProfile(url, hint = {}, override = null) {
  const parsed = new URL(override?.canonicalUrl || url)
  const domainStem = parsed.hostname.replace(/^www\./, '').split('.')[0]
  const hintedName = sanitizeText(override?.name || hint.name || hint.title || domainStem, 120)
    .replace(/\s+[|–—-].*$/, '')
  const name = hintedName || domainStem
  const description = sanitizeText(hint.description || hint.excerpt || '', 500)
  const aliases = unique([name, domainStem, ...(hint.aliases || [])]).map(value => sanitizeText(value, 100)).filter(Boolean)
  const categoryTerms = tokens([hint.category, hint.industry, description, ...(hint.schemaTypes || [])].join(' ')).slice(0, 20)
  return {
    name,
    domain: parsed.hostname,
    url: parsed.href,
    canonicalUrl: parsed.href,
    description,
    entityType: sanitizeText(hint.entityType || hint.schemaTypes?.[0] || 'Organization', 80),
    primaryCategory: sanitizeText(hint.category || hint.industry || 'Not determined', 100),
    confidence: override ? 100 : description ? 88 : 65,
    aliases,
    categoryTerms,
    entitySignals: unique([parsed.hostname, ...aliases, ...categoryTerms])
  }
}

export function assessRelevance(item, entity) {
  const combined = `${item.title} ${item.snippet} ${item.url} ${item.sourceName}`.toLowerCase()
  const matched = []
  let score = 0
  if (combined.includes(entity.domain.toLowerCase())) {
    score += 55
    matched.push(`domain:${entity.domain}`)
  }
  for (const alias of entity.aliases) {
    const normalized = alias.toLowerCase()
    if (normalized.length > 2 && new RegExp(`(^|[^a-z0-9])${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i').test(combined)) {
      score += 35
      matched.push(`alias:${alias}`)
      break
    }
  }
  const contextMatches = entity.categoryTerms.filter(term => combined.includes(term)).slice(0, 5)
  score += Math.min(25, contextMatches.length * 5)
  matched.push(...contextMatches.map(term => `context:${term}`))
  const negativeContexts = AMBIGUOUS_NEGATIVE_CONTEXT[entity.name.toLowerCase()] || []
  const negatives = negativeContexts.filter(term => combined.includes(term))
  if (negatives.length && !combined.includes(entity.domain.toLowerCase())) score -= 45
  matched.push(...negatives.map(term => `excluded-context:${term}`))
  score = Math.max(0, Math.min(100, score))
  return {
    relevanceScore: score,
    relevanceReason: negatives.length && score < 35
      ? `Excluded ambiguous context: ${negatives.join(', ')}`
      : matched.length
        ? `Matched ${matched.join(', ')}`
        : 'No reliable entity signal matched.',
    relevanceMethod: negatives.length ? 'lexical_with_negative_rules' : 'lexical_entity_context',
    entitySignalsMatched: matched
  }
}

function provenance({ sourceType, queryUsed, requestedRange, actualRange, rawSourceId, normalizedText, parserVersion }) {
  return {
    collector: `scrapebadger:${sourceType}`,
    collectedAt: new Date().toISOString(),
    queryUsed,
    requestedRange,
    actualRange,
    rawSourceId: rawSourceId ? String(rawSourceId) : undefined,
    contentHash: contentHash(normalizedText),
    parserVersion,
    normalizationVersion: NORMALIZATION_VERSION
  }
}

export function normalizeEvidence(raw, context) {
  const { sourceType, role, entity, queryUsed, requestedRange, actualRange, parserVersion } = context
  let sourceName = ''
  let title = ''
  let snippet = ''
  let url = ''
  let author
  let community
  let publishedAt
  let engagement = {}
  let rawSourceId
  let authorityScore

  if (sourceType === 'reddit') {
    rawSourceId = raw.id
    title = raw.title
    snippet = raw.selftext || raw.body || ''
    community = raw.subreddit
    author = raw.author
    sourceName = raw.subreddit ? `r/${raw.subreddit}` : 'Reddit'
    url = raw.permalink?.startsWith('/') ? `https://www.reddit.com${raw.permalink}` : raw.permalink || raw.url
    publishedAt = raw.createdAt || raw.created_at || raw.created_utc
    engagement = { votes: Number(raw.score || 0), comments: Number(raw.comments || raw.num_comments || 0) }
    authorityScore = 35
  } else if (sourceType === 'news') {
    rawSourceId = raw.id || raw.url || raw.link
    title = raw.title || raw.headline
    snippet = raw.snippet || raw.description
    sourceName = raw.publisher || raw.source?.name || raw.source || 'News source'
    author = raw.author
    url = raw.url || raw.link
    publishedAt = raw.publishedAt || raw.published_at || raw.date
    authorityScore = 80
  } else if (sourceType === 'x') {
    rawSourceId = raw.id
    title = raw.full_text || raw.text
    snippet = raw.full_text || raw.text
    author = raw.username || raw.user_name
    sourceName = author ? `@${author}` : 'X'
    url = raw.id && author ? `https://x.com/${author}/status/${raw.id}` : raw.url
    publishedAt = raw.created_at
    engagement = { votes: Number(raw.favorite_count || 0), comments: Number(raw.reply_count || 0), shares: Number(raw.retweet_count || 0), views: Number(raw.view_count || 0) }
    authorityScore = raw.user_verified || raw.user_is_blue_verified ? 50 : 35
  } else if (sourceType === 'youtube') {
    rawSourceId = raw.video_id
    title = raw.title
    snippet = raw.description_snippet
    author = raw.channel_name
    sourceName = raw.channel_name || 'YouTube'
    url = raw.url || (raw.video_id ? `https://www.youtube.com/watch?v=${raw.video_id}` : '')
    publishedAt = raw.published_at || (raw.published_utc ? new Date(raw.published_utc * 1000).toISOString() : undefined)
    engagement = { views: Number(raw.view_count || 0) }
    authorityScore = raw.channel_is_verified ? 65 : 50
  }

  title = sanitizeText(title, 500)
  snippet = sanitizeText(snippet, 4000)
  url = safeSourceUrl(url)
  const normalizedText = `${title}\n${snippet}\n${url}`
  const base = {
    id: `${sourceType}_${contentHash(`${rawSourceId || url}|${normalizedText}`).slice(0, 20)}`,
    sourceType,
    sourceRole: role,
    sourceName: sanitizeText(sourceName, 160),
    url,
    title,
    snippet,
    author: sanitizeText(author, 160) || undefined,
    community: sanitizeText(community, 160) || undefined,
    publishedAt: publishedAt ? new Date(publishedAt).toISOString() : undefined,
    engagement,
    authorityScore,
    sentiment: 'unknown',
    sentimentConfidence: 0,
    themes: [],
    associations: [],
    claims: []
  }
  const relevance = assessRelevance(base, entity)
  const sentiment = sentimentFor(`${title} ${snippet}`)
  return {
    ...base,
    ...relevance,
    ...sentiment,
    provenance: provenance({ sourceType, queryUsed, requestedRange, actualRange, rawSourceId, normalizedText, parserVersion })
  }
}

function titleTokens(item) {
  return new Set(tokens(item.title))
}

function similarity(a, b) {
  const left = titleTokens(a)
  const right = titleTokens(b)
  if (!left.size || !right.size) return 0
  const intersection = [...left].filter(token => right.has(token)).length
  return intersection / new Set([...left, ...right]).size
}

export function deduplicateAndCluster(items) {
  const retained = []
  const exactKeys = new Set()
  let duplicates = 0
  let clustered = 0
  for (const item of items) {
    const key = item.url || item.provenance.contentHash
    if (exactKeys.has(key)) {
      duplicates += 1
      continue
    }
    exactKeys.add(key)
    if (item.sourceType === 'news') {
      const match = retained.find(candidate => candidate.sourceType === 'news' && similarity(candidate, item) >= 0.75)
      if (match) {
        match.clusterId ||= `cluster_${match.id}`
        match.relatedEvidence ||= []
        match.relatedEvidence.push({ id: item.id, sourceName: item.sourceName, url: item.url, publishedAt: item.publishedAt })
        match.clusterSize = 1 + match.relatedEvidence.length
        clustered += 1
        continue
      }
    }
    retained.push({ ...item, clusterSize: 1 })
  }
  return { retained, duplicates, clustered }
}

export function topicFingerprints(items) {
  return unique(items.flatMap(item => tokens(`${item.title} ${item.snippet}`).slice(0, 8)))
}
