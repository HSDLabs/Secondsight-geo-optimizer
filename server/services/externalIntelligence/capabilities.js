import client from '../externalWeb/scrapeBadger.js'

const runtimeFailures = new Map()

export const SOURCE_DEFINITIONS = {
  reddit: { sourceType: 'reddit', role: 'community', supportsDateRange: true, supportsPagination: true, supportsEngagement: true, softTarget: 10, rawCeiling: 10, parserVersion: 'reddit-1' },
  news: { sourceType: 'news', role: 'editorial', supportsDateRange: true, supportsPagination: false, supportsEngagement: false, softTarget: 10, rawCeiling: 10, parserVersion: 'news-1' },
  x: { sourceType: 'x', role: 'social', supportsDateRange: true, supportsPagination: true, supportsEngagement: true, softTarget: 10, rawCeiling: 10, parserVersion: 'x-1' },
  youtube: { sourceType: 'youtube', role: 'creator', supportsDateRange: true, supportsPagination: true, supportsEngagement: true, softTarget: 10, rawCeiling: 10, parserVersion: 'youtube-1' },
  linkedin: { sourceType: 'linkedin', role: 'professional', supportsDateRange: false, supportsPagination: false, supportsEngagement: false, notSupported: true },
  review: { sourceType: 'review', role: 'customer-review', supportsDateRange: false, supportsPagination: false, supportsEngagement: false, notSupported: true }
}

export function classifySourceError(error) {
  const status = error?.status || error?.statusCode
  const message = String(error?.message || '').toLowerCase()
  if (status === 401 || status === 403 || /auth|api key|unauthor|forbidden/.test(message)) return 'authentication_required'
  if (status === 429 || /rate limit|credits|quota/.test(message)) return 'rate_limited'
  if (/not supported|not available|restricted|region/.test(message)) return 'unavailable'
  return 'failed'
}

export function recordCapabilityFailure(sourceType, error) {
  runtimeFailures.set(sourceType, {
    state: classifySourceError(error),
    reason: String(error?.message || 'Collector unavailable').slice(0, 240),
    at: Date.now()
  })
}

export function clearCapabilityFailure(sourceType) {
  runtimeFailures.delete(sourceType)
}

export function getSourceCapabilities() {
  const configured = Boolean(process.env.SCRAPEBADGER_API_KEY)
  return Object.values(SOURCE_DEFINITIONS).map(definition => {
    const failure = runtimeFailures.get(definition.sourceType)
    const freshFailure = failure && Date.now() - failure.at < 5 * 60 * 1000
    const notSupported = Boolean(definition.notSupported)
    const available = !notSupported && configured && !freshFailure
    return {
      sourceType: definition.sourceType,
      available,
      state: notSupported ? 'not_supported' : freshFailure ? failure.state : available ? 'enabled' : 'authentication_required',
      reason: notSupported
        ? 'Planned source adapter is not implemented in this release.'
        : freshFailure
          ? failure.reason
          : configured
            ? undefined
            : 'SCRAPEBADGER_API_KEY is not configured on the server.',
      supportsDateRange: definition.supportsDateRange,
      supportsPagination: definition.supportsPagination,
      supportsEngagement: definition.supportsEngagement
    }
  })
}

export function getCapability(sourceType) {
  return getSourceCapabilities().find(capability => capability.sourceType === sourceType)
}

export function getScrapeBadgerClient() {
  return client
}
