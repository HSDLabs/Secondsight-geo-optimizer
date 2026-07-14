import { CRAWLER_CATALOG, CRAWLER_BY_ID, CRAWLER_BY_TOKEN } from '../../../../shared/crawlers.js'

export { CRAWLER_CATALOG, CRAWLER_BY_ID, CRAWLER_BY_TOKEN }
export const AI_CRAWLERS = CRAWLER_CATALOG.map(crawler => ({ ...crawler, ua: crawler.token, desc: crawler.description }))
export const getScoreTone = value => value >= 80 ? 'good' : value >= 55 ? 'warning' : 'poor'

/** @typedef {'full'|'partial'|'blocked'|'unknown'} CoverageState */
/** @typedef {'implicit_allow_missing'|'allowed_by_default'|'explicit_allow'|'explicit_disallow'} RuleMatchedState */
/** @typedef {'critical'|'medium'|'low'|'opportunity'} IssuePriority */

export const COVERAGE_PRESENTATION = {
  full: { label: 'Full site', tone: 'good' },
  partial: { label: 'Partial paths', tone: 'warning' },
  blocked: { label: 'Blocked', tone: 'danger' },
  unknown: { label: 'Unknown', tone: 'neutral' }
}

export const ISSUE_PRIORITY_PRESENTATION = {
  critical: { label: 'High', tone: 'danger' },
  medium: { label: 'Medium', tone: 'warning' },
  low: { label: 'Low', tone: 'info' },
  opportunity: { label: 'Opportunity', tone: 'opportunity' }
}

/** @returns {CoverageState} */
export function normalizeCoverage(value) {
  if (value === 'none' || value === 'blocked') return 'blocked'
  if (value === 'full' || value === 'partial') return value
  return 'unknown'
}

/** @returns {{ state: RuleMatchedState, title: string, reason: string }} */
export function presentMatchedRule(result) {
  const rule = result?.matchedRule
  if (rule?.type === 'allow') return { state: 'explicit_allow', title: `Allow: ${rule.path}`, reason: `robots.txt line ${rule.line}` }
  if (rule?.type === 'disallow') return { state: 'explicit_disallow', title: `Disallow: ${rule.path}`, reason: `robots.txt line ${rule.line}` }
  if (result?.ruleSource === 'missing') return { state: 'implicit_allow_missing', title: 'Implicit allow', reason: 'robots.txt not found' }
  if (result?.ruleSource === 'unreachable') return { state: 'allowed_by_default', title: 'Policy unavailable', reason: 'robots.txt could not be evaluated' }
  return { state: 'allowed_by_default', title: 'Allowed by default', reason: 'No matching rule' }
}

/** @returns {IssuePriority} */
export function getIssuePriority(issue) {
  if (issue?.type === 'llms-txt-missing' || issue?.type === 'llms-txt-needs-improvement') return 'opportunity'
  if (issue?.type === 'canonical-missing' || issue?.severity === 'info') return 'low'
  if (issue?.type === 'robots-not-found' || issue?.severity === 'warning') return 'medium'
  return 'critical'
}

export function getBotStatusLabel(robots, botUa) {
  const status = robots.aiCrawlerPermissions?.[botUa] || robots.aiCrawlerPermissions?.['*'] || 'allowed'
  return status === 'blocked' ? 'Blocked' : status === 'partially-blocked' ? 'Limited' : 'Allowed'
}
