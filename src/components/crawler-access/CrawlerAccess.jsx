import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import './styles/CrawlerAccess.css'

import { AI_CRAWLERS, getBotStatusLabel, getIssuePriority } from './utils/crawlerUtils'
import CrawlerHealthOverview from './CrawlerHealthOverview'
import CrawlerPermissions from './CrawlerPermissions'
import PolicyGuidanceFiles from './PolicyGuidanceFiles'
import SitemapDiscovery from './SitemapDiscovery'
import CrawlerIssues from './CrawlerIssues'
import CrawlerEmptyState from './CrawlerEmptyState'
import { groupCrawlerIssues } from './utils/issueGrouping'

export default function CrawlerAccess() {
  const { loading: showLoading, error: parentError, crawlerData, data, externalData, reanalyze } = useOutletContext()
  const [expandedIssues, setExpandedIssues] = useState({})
  const [inspectionState, setInspectionState] = useState({ analysisUrl: '', issues: [] })

  const issueModel = useMemo(() => {
    const combined = [...(crawlerData?.issues || []), ...(inspectionState.issues || [])]
    return groupCrawlerIssues(combined)
  }, [crawlerData?.issues, inspectionState])

  const sortedIssues = useMemo(() => {
    const weights = { critical: 4, medium: 3, low: 2, opportunity: 1 }
    return [...issueModel.groupedIssues].sort((a, b) => weights[getIssuePriority(b)] - weights[getIssuePriority(a)])
  }, [issueModel.groupedIssues])

  const origin = crawlerData?.origin || ''
  const robots = crawlerData?.robots || { aiCrawlerPermissions: {}, rules: [], crawlDelays: {} }
  const sitemaps = crawlerData?.sitemaps || { discovered: [], urls: [], errors: [] }
  const isAwaiting = !crawlerData
  const botsAllowedCount = AI_CRAWLERS.filter(bot => getBotStatusLabel(robots, bot.ua) === 'Allowed').length
  const botsLimitedCount = AI_CRAWLERS.filter(bot => getBotStatusLabel(robots, bot.ua) === 'Limited').length
  const botsBlockedCount = AI_CRAWLERS.filter(bot => getBotStatusLabel(robots, bot.ua) === 'Blocked').length
  const sitemapsData = sitemaps?.discovered || []
  const parsedSitemapsCount = sitemapsData.filter(item => item.ok).length
  const criticalIssuesCount = issueModel.groupedIssues.filter(issue => issue.severity === 'critical').length

  const showIssue = issueId => {
    const groupId = issueModel.issueIdToGroupId.get(issueId) || issueId
    setExpandedIssues(current => ({ ...current, [groupId]: true }))
    requestAnimationFrame(() => [...document.querySelectorAll('[data-crawler-issue]')].find(element => element.dataset.crawlerIssue === groupId && element.offsetParent !== null)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }

  return <div className="flex flex-col gap-4 animate-[fadeIn_400ms_cubic-bezier(0.16,1,0.3,1)] motion-reduce:animate-none">
    {parentError && <div className="error-banner">{parentError}</div>}
    <CrawlerHealthOverview score={crawlerData?.score || 0} scoreBreakdown={crawlerData?.scoreBreakdown || []} botsAllowedCount={botsAllowedCount} botsBlockedCount={botsBlockedCount} botsLimitedCount={botsLimitedCount} sitemaps={sitemaps} parsedSitemapsCount={parsedSitemapsCount} totalSitemapsCount={sitemapsData.length} criticalIssuesCount={criticalIssuesCount} url={crawlerData?.url} loading={showLoading} isAwaiting={isAwaiting} />
    {isAwaiting && <CrawlerEmptyState loading={showLoading} />}
    {!isAwaiting && <div className={showLoading ? 'pointer-events-none opacity-60 transition-opacity' : 'transition-opacity'}>
      <CrawlerPermissions key={crawlerData?.analyzedAt || 'awaiting-crawler-analysis'} initialInspection={crawlerData?.urlInspection} origin={origin} onInspectionIssues={(nextIssues, inspectionUrl) => setInspectionState({ analysisUrl: inspectionUrl || crawlerData?.url || '', issues: nextIssues })} onShowIssue={showIssue} />
      <PolicyGuidanceFiles robots={robots} sitemaps={sitemaps} origin={origin} llmsTxt={crawlerData?.llmsTxt} analysisUrl={crawlerData?.url} analysisData={data} crawlerData={crawlerData} externalData={externalData} />
      <SitemapDiscovery crawlerData={crawlerData} />
      <CrawlerIssues sortedIssues={sortedIssues} expandedIssues={expandedIssues} setExpandedIssues={setExpandedIssues} onRetest={reanalyze} loading={showLoading} />
    </div>}
  </div>
}
