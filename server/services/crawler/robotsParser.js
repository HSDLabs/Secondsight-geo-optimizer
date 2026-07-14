import { CRAWLER_CATALOG } from '../../../shared/crawlers.js'

export function parseRobotsTxt(raw) {
  const lines = String(raw || '').replace(/^\uFEFF/, '').split(/\r?\n/)
  const groups = []
  const sitemapReferences = []
  const crawlDelays = {}
  let currentAgents = []
  let currentRules = []

  const flushGroup = () => {
    if (currentAgents.length === 0) return
    for (const userAgent of currentAgents) {
      groups.push({ userAgent, rules: currentRules.map(rule => ({ ...rule })) })
      if (currentRules.crawlDelay != null) crawlDelays[userAgent] = currentRules.crawlDelay
    }
    currentAgents = []
    currentRules = []
  }

  lines.forEach((rawLine, index) => {
    const withoutComment = rawLine.split('#', 1)[0].trim()
    if (!withoutComment) return
    const colonIndex = withoutComment.indexOf(':')
    if (colonIndex < 0) return
    const directive = withoutComment.slice(0, colonIndex).trim().toLowerCase()
    const value = withoutComment.slice(colonIndex + 1).trim()

    if (directive === 'user-agent') {
      if (currentRules.length > 0) flushGroup()
      if (value) currentAgents.push(value)
      return
    }
    if (directive === 'sitemap') {
      if (value) sitemapReferences.push(value)
      return
    }
    if (directive === 'crawl-delay') {
      const delay = Number.parseFloat(value)
      if (Number.isFinite(delay)) {
        for (const agent of currentAgents.length ? currentAgents : ['*']) crawlDelays[agent] = delay
      }
      return
    }
    if ((directive === 'allow' || directive === 'disallow') && currentAgents.length > 0 && value) {
      currentRules.push({ type: directive, path: value, line: index + 1 })
    }
  })
  flushGroup()

  const aiCrawlerPermissions = Object.fromEntries(CRAWLER_CATALOG.map(crawler => {
    const result = evaluateCrawler(groups, crawler.token, '/')
    return [crawler.token, result.coverage === 'none' ? 'blocked' : result.coverage === 'partial' ? 'partially-blocked' : 'allowed']
  }))

  return { raw, groups, sitemapReferences: [...new Set(sitemapReferences)], crawlDelays, aiCrawlerPermissions }
}

export function evaluateCrawler(groups, userAgent, urlOrPath, robotsState = 'available') {
  if (robotsState === 'unreachable') {
    return { access: 'unknown', coverage: 'unknown', ruleSource: 'unreachable', matchedRule: null, effectiveRules: [] }
  }

  const token = userAgent.toLowerCase()
  const specificGroups = groups.filter(group => group.userAgent.toLowerCase() === token)
  const wildcardGroups = groups.filter(group => group.userAgent === '*')
  const selectedGroups = specificGroups.length ? specificGroups : wildcardGroups
  const effectiveRules = selectedGroups.flatMap(group => group.rules.map(rule => ({ ...rule, userAgent: group.userAgent })))
  const ruleSource = specificGroups.length ? 'specific' : wildcardGroups.length ? 'wildcard' : robotsState === 'missing' ? 'missing' : 'default'
  const disallows = effectiveRules.filter(rule => rule.type === 'disallow')
  const coverage = disallows.length === 0 ? 'full' : isEntireSiteBlocked(effectiveRules) ? 'none' : 'partial'
  const target = normalizeTarget(urlOrPath)
  const matches = effectiveRules
    .map(rule => ({ rule, matchLength: matchRule(target, rule.path) }))
    .filter(match => match.matchLength >= 0)
    .sort((a, b) => b.matchLength - a.matchLength || (a.rule.type === 'allow' ? -1 : 1))
  const matchedRule = matches[0]?.rule || null

  return {
    access: matchedRule?.type === 'disallow' ? 'blocked' : 'allowed',
    coverage,
    ruleSource,
    matchedRule,
    effectiveRules
  }
}

export function isPathAllowed(groups, userAgent, path) {
  return evaluateCrawler(groups, userAgent, path).access === 'allowed'
}

function isEntireSiteBlocked(rules) {
  if (rules.some(rule => rule.type === 'allow')) return false
  const root = rules
    .map(rule => ({ rule, matchLength: matchRule('/', rule.path) }))
    .filter(match => match.matchLength >= 0)
    .sort((a, b) => b.matchLength - a.matchLength || (a.rule.type === 'allow' ? -1 : 1))[0]
  return root?.rule.type === 'disallow'
}

function normalizeTarget(value) {
  try {
    const url = new URL(value, 'https://robots.invalid')
    return normalizeOctets(`${url.pathname}${url.search}`)
  } catch {
    return normalizeOctets(String(value || '/').startsWith('/') ? String(value || '/') : `/${value}`)
  }
}

function normalizeOctets(value) {
  return encodeURI(decodeURI(value)).replace(/%([0-9a-f]{2})/gi, (_, hex) => {
    const char = String.fromCharCode(Number.parseInt(hex, 16))
    return /[A-Za-z0-9\-._~]/.test(char) ? char : `%${hex.toUpperCase()}`
  })
}

function matchRule(target, rawPattern) {
  const normalized = normalizeOctets(rawPattern)
  const anchored = normalized.endsWith('$')
  const pattern = anchored ? normalized.slice(0, -1) : normalized
  const expression = pattern.split('*').map(escapeRegExp).join('.*')
  const regex = new RegExp(`^${expression}${anchored ? '$' : ''}`)
  return regex.test(target) ? pattern.replace(/\*/g, '').length : -1
}

function escapeRegExp(value) {
  return value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
}
