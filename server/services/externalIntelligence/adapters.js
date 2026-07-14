import { SOURCE_DEFINITIONS, clearCapabilityFailure, getScrapeBadgerClient, recordCapabilityFailure } from './capabilities.js'
import { normalizeEvidence, topicFingerprints } from './evidence.js'
import { withTimeout } from './security.js'

const REQUEST_TIMEOUT_MS = 15_000
const SOURCE_TIMEOUT_MS = 90_000

function isoDate(daysAgo) {
  const date = new Date(Date.now() - daysAgo * 86400000)
  return date.toISOString().slice(0, 10)
}

function requestedRangeFor(config, days) {
  if (config.dateMode === 'manual' && config.requestedRange) return config.requestedRange
  return { from: isoDate(days), to: new Date().toISOString().slice(0, 10) }
}

function redditTime(days) {
  if (days <= 1) return 'day'
  if (days <= 7) return 'week'
  if (days <= 31) return 'month'
  return 'year'
}

function youtubeUploadDate(days) {
  if (days <= 1) return 'today'
  if (days <= 7) return 'week'
  if (days <= 31) return 'month'
  return 'year'
}

function sourceOrigin(item) {
  if (item.sourceType === 'reddit') return item.community || item.sourceName
  return item.sourceName || item.author
}

function normalizeBatch(rawItems, context) {
  return rawItems
    .map(raw => {
      try { return normalizeEvidence(raw, context) } catch { return null }
    })
    .filter(Boolean)
}

function createAdapter(sourceType) {
  const client = getScrapeBadgerClient()
  const definition = SOURCE_DEFINITIONS[sourceType]
  return {
    ...definition,
    async collectBatch({ entity, rangeDays, requestedRange, cursor, batchSize }) {
      const range = rangeDays === null && requestedRange
        ? requestedRange
        : requestedRangeFor({ dateMode: 'automatic' }, rangeDays || 30)
      const query = entity.name
      if (sourceType === 'reddit') {
        const response = await withTimeout(() => client.reddit.search.posts({
          query,
          sort: 'relevance',
          time: redditTime(rangeDays || 365),
          after: cursor || undefined,
          limit: Math.min(100, batchSize)
        }), REQUEST_TIMEOUT_MS, 'Reddit collection')
        return { rawItems: response?.posts || [], nextCursor: response?.pagination?.after || response?.pagination?.next || null, exhausted: !(response?.pagination?.after || response?.pagination?.next), queryUsed: query, actualRange: range }
      }
      if (sourceType === 'news') {
        const response = await withTimeout(() => client.google.news.search({ q: query, max_results: Math.min(100, batchSize) }), REQUEST_TIMEOUT_MS, 'News collection')
        const rawItems = response?.news_results || response?.organic || response?.articles || []
        return { rawItems, nextCursor: null, exhausted: true, queryUsed: query, actualRange: range }
      }
      if (sourceType === 'x') {
        const queryWithRange = `${query} since:${range.from} until:${range.to} lang:en`
        const response = await withTimeout(() => client.twitter.tweets.search(queryWithRange, { queryType: 'Latest', count: Math.min(100, batchSize), cursor: cursor || undefined }), REQUEST_TIMEOUT_MS, 'X collection')
        return { rawItems: response?.data || [], nextCursor: response?.nextCursor || null, exhausted: !response?.hasMore, queryUsed: queryWithRange, actualRange: range }
      }
      if (sourceType === 'youtube') {
        const response = await withTimeout(() => client.youtube.search.search({
          query,
          type: 'video',
          sort_by: 'relevance',
          upload_date: youtubeUploadDate(rangeDays || 365),
          continuation: cursor || undefined
        }), REQUEST_TIMEOUT_MS, 'YouTube collection')
        return { rawItems: response?.results || [], nextCursor: response?.continuation || null, exhausted: !response?.continuation, queryUsed: query, actualRange: range }
      }
      throw new Error(`Source ${sourceType} is not supported.`)
    }
  }
}

export function createSourceAdapters() {
  return Object.fromEntries(['reddit', 'news', 'x', 'youtube'].map(source => [source, createAdapter(source)]))
}

export async function collectAdaptiveSource({ adapter, entity, configuration, signal, onProgress }) {
  const startedAt = Date.now()
  const requestedRanges = configuration.dateMode === 'manual' ? [null] : [30, 90, 180, 365]
  const allItems = []
  const rawSeen = new Set()
  const hashes = new Set()
  const origins = new Set()
  const topics = new Set()
  let found = 0
  let relevant = 0
  let duplicateCandidates = 0
  let lowValueBatches = 0
  let actualRange = configuration.requestedRange || null
  let stoppedReason = 'source_exhausted'

  try {
    for (const rangeDays of requestedRanges) {
      let cursor = null
      let exhausted = false
      do {
        if (signal?.aborted) {
          stoppedReason = 'cancelled'
          return { items: allItems, counts: { found, relevant, duplicate: duplicateCandidates, clustered: 0, retained: allItems.length }, actualRange, stoppedReason, cancelled: true }
        }
        if (Date.now() - startedAt >= SOURCE_TIMEOUT_MS) {
          stoppedReason = 'source_timeout'
          exhausted = true
          break
        }
        if (found >= adapter.rawCeiling) {
          stoppedReason = 'raw_ceiling'
          exhausted = true
          break
        }
        const batch = await adapter.collectBatch({ entity, rangeDays, requestedRange: configuration.requestedRange, cursor, batchSize: Math.min(50, adapter.rawCeiling - found) })
        actualRange = batch.actualRange || actualRange
        const normalized = normalizeBatch(batch.rawItems, {
          sourceType: adapter.sourceType,
          role: adapter.role,
          entity,
          queryUsed: batch.queryUsed,
          requestedRange: configuration.requestedRange,
          actualRange,
          parserVersion: adapter.parserVersion
        })
        const uniqueNormalized = normalized.filter(item => {
          if (rawSeen.has(item.id)) return false
          rawSeen.add(item.id)
          return true
        })
        found += uniqueNormalized.length
        const relevantBatch = uniqueNormalized.filter(item => item.relevanceScore >= 35)
        relevant += relevantBatch.length
        let newRetained = 0
        for (const item of relevantBatch) {
          if (hashes.has(item.provenance.contentHash) || (item.url && allItems.some(existing => existing.url === item.url))) {
            duplicateCandidates += 1
            continue
          }
          hashes.add(item.provenance.contentHash)
          allItems.push(item)
          newRetained += 1
        }
        const batchTopics = topicFingerprints(relevantBatch)
        const newTopics = batchTopics.filter(topic => !topics.has(topic))
        newTopics.forEach(topic => topics.add(topic))
        const batchOrigins = relevantBatch.map(sourceOrigin).filter(Boolean)
        const newOrigins = batchOrigins.filter(origin => !origins.has(origin))
        newOrigins.forEach(origin => origins.add(origin))
        const duplicateRate = relevantBatch.length ? (relevantBatch.length - newRetained) / relevantBatch.length : 0
        const newTopicRate = batchTopics.length ? newTopics.length / batchTopics.length : 0
        const retainedRate = uniqueNormalized.length ? newRetained / uniqueNormalized.length : 0
        const lowValue = duplicateRate >= 0.8 || (newTopicRate < 0.1 && newOrigins.length === 0 && retainedRate < 0.2)
        lowValueBatches = lowValue ? lowValueBatches + 1 : 0
        await onProgress?.({ found, relevant, retained: allItems.length, actualRange })
        cursor = batch.nextCursor
        exhausted = batch.exhausted || !cursor
        if (allItems.length >= adapter.softTarget && lowValueBatches >= 1) {
          stoppedReason = 'saturated'
          exhausted = true
          break
        }
        if (lowValueBatches >= 2) {
          stoppedReason = 'low_value_batches'
          exhausted = true
          break
        }
      } while (!exhausted)
      if (allItems.length >= adapter.softTarget || found >= adapter.rawCeiling || stoppedReason === 'low_value_batches') break
    }
    clearCapabilityFailure(adapter.sourceType)
    return {
      items: allItems,
      counts: { found, relevant, duplicate: duplicateCandidates, clustered: 0, retained: allItems.length },
      actualRange,
      stoppedReason,
      durationMs: Date.now() - startedAt
    }
  } catch (error) {
    recordCapabilityFailure(adapter.sourceType, error)
    error.partialDiagnostics = { found, relevant, retained: allItems.length, actualRange, durationMs: Date.now() - startedAt }
    throw error
  }
}
