import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import '../../styles/CrawlerAccess.css'

import { AI_CRAWLERS, getBotStatusLabel } from './crawlerUtils'
import CrawlerHealthOverview from './CrawlerHealthOverview'
import CrawlerPermissions from './CrawlerPermissions'
import RobotsViewer from './RobotsViewer'
import SitemapExplorer from './SitemapExplorer'
import DiscoveryGraph from './DiscoveryGraph'
import CrawlerIssues from './CrawlerIssues'
import LlmsTxtAssistant from './LlmsTxtAssistant'

export default function CrawlerAccess() {
  const { loading: showLoading, error: parentError, crawlerData, data, externalData, reanalyze } = useOutletContext()
  const mainError = parentError

  // UI Interactive States
  const [expandedIssues, setExpandedIssues] = useState({})
  const [activeGraphNode, setActiveGraphNode] = useState(null)
  const [inspectionState, setInspectionState] = useState({ analysisUrl: '', issues: [] })

  const issues = useMemo(() => {
    const combined = [...(crawlerData?.issues || []), ...(inspectionState.issues || [])]
    return [...new Map(combined.map(issue => [issue.id, issue])).values()]
  }, [crawlerData?.issues, inspectionState])

  // ── Action Queue Issues (sorted by impact severity) ──
  const sortedIssues = useMemo(() => {
    const severityWeights = { critical: 3, warning: 2, info: 1 }
    return [...issues].sort((a, b) => {
      const weightA = severityWeights[a.severity] || 0
      const weightB = severityWeights[b.severity] || 0
      return weightB - weightA
    })
  }, [issues])

  // Computed Fallbacks for Empty/Loading States
  const origin = crawlerData?.origin || ''
  const robots = crawlerData?.robots || { aiCrawlerPermissions: {}, rules: [], crawlDelays: {} }
  const sitemaps = crawlerData?.sitemaps || { discovered: [], urls: [], errors: [] }
  const score = crawlerData?.score || 0
  const isAwaiting = !crawlerData

  // Summary Metrics calculations
  const botsAllowedCount = AI_CRAWLERS.filter(bot => getBotStatusLabel(robots, bot.ua) === 'Allowed').length
  const botsLimitedCount = AI_CRAWLERS.filter(bot => getBotStatusLabel(robots, bot.ua) === 'Limited').length
  const botsBlockedCount = AI_CRAWLERS.filter(bot => getBotStatusLabel(robots, bot.ua) === 'Blocked').length

  const sitemapsData = sitemaps?.discovered || []
  const totalSitemapsCount = sitemapsData.length
  const parsedSitemapsCount = sitemapsData.filter(s => s.ok).length
  const criticalIssuesCount = issues.filter(i => i.severity === 'critical').length

  const showIssue = issueId => {
    setExpandedIssues(current => ({ ...current, [issueId]: true }))
    requestAnimationFrame(() => [...document.querySelectorAll('[data-crawler-issue]')].find(element => element.dataset.crawlerIssue === issueId && element.offsetParent !== null)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }

  return (
    <div className="flex flex-col gap-8 animate-[fadeIn_400ms_cubic-bezier(0.16,1,0.3,1)] motion-reduce:animate-none">
      {mainError && <div className="error-banner">{mainError}</div>}

      {/* 1. Crawler Health Overview */}
      <CrawlerHealthOverview
        score={score}
        scoreBreakdown={crawlerData?.scoreBreakdown || []}
        botsAllowedCount={botsAllowedCount}
        botsBlockedCount={botsBlockedCount}
        botsLimitedCount={botsLimitedCount}
        sitemaps={sitemaps}
        parsedSitemapsCount={parsedSitemapsCount}
        totalSitemapsCount={totalSitemapsCount}
        criticalIssuesCount={criticalIssuesCount}
        url={crawlerData?.url}
        loading={showLoading}
        isAwaiting={isAwaiting}
      />

      <div style={{ opacity: isAwaiting ? 0.6 : 1, pointerEvents: isAwaiting || showLoading ? 'none' : 'auto', transition: 'opacity 0.3s' }}>
        {/* 2. Crawler Access List */}
        <CrawlerPermissions
          key={crawlerData?.analyzedAt || 'awaiting-crawler-analysis'}
          initialInspection={crawlerData?.urlInspection}
          origin={origin}
          onInspectionIssues={(nextIssues, inspectionUrl) => setInspectionState({ analysisUrl: inspectionUrl || crawlerData?.url || '', issues: nextIssues })}
          onShowIssue={showIssue}
        />

        <div className="mt-4 grid min-w-0 items-stretch gap-4 2xl:grid-cols-2">
          <RobotsViewer robots={robots} onShowIssue={showIssue} />
          <SitemapExplorer sitemaps={sitemaps} />
        </div>

        <div className="mt-4 grid min-w-0 items-stretch gap-4 2xl:grid-cols-[minmax(330px,.72fr)_minmax(0,1.28fr)]">
          <LlmsTxtAssistant llmsTxt={crawlerData?.llmsTxt} analysisUrl={crawlerData?.url} analysisData={data} crawlerData={crawlerData} externalData={externalData} />
          <DiscoveryGraph crawlerData={crawlerData} activeGraphNode={activeGraphNode} setActiveGraphNode={setActiveGraphNode} />
        </div>

        {/* 6. Crawler Issues Accordion (Action Queue) */}
        <CrawlerIssues
          sortedIssues={sortedIssues}
          expandedIssues={expandedIssues}
          setExpandedIssues={setExpandedIssues}
          onRetest={reanalyze}
          loading={showLoading}
        />
      </div>
    </div>
  )
}
