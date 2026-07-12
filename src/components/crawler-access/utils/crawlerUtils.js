import { CRAWLER_CATALOG, CRAWLER_BY_ID, CRAWLER_BY_TOKEN } from '../../../../shared/crawlers.js'

export { CRAWLER_CATALOG, CRAWLER_BY_ID, CRAWLER_BY_TOKEN }
export const AI_CRAWLERS = CRAWLER_CATALOG.map(crawler => ({ ...crawler, ua: crawler.token, desc: crawler.description }))
export const getScoreTone = value => value >= 80 ? 'good' : value >= 55 ? 'warning' : 'poor'

export function getBotStatusLabel(robots, botUa) {
  const status = robots.aiCrawlerPermissions?.[botUa] || robots.aiCrawlerPermissions?.['*'] || 'allowed'
  return status === 'blocked' ? 'Blocked' : status === 'partially-blocked' ? 'Limited' : 'Allowed'
}
