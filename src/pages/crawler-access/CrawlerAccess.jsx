import { useState, useEffect, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import '../../styles/CrawlerAccess.css'

import { AI_CRAWLERS, getBotStatusLabel } from './crawlerUtils'
import CrawlerHealthOverview from './CrawlerHealthOverview'
import CrawlerPermissions from './CrawlerPermissions'
import RobotsViewer from './RobotsViewer'
import SitemapExplorer from './SitemapExplorer'
import DiscoveryGraph from './DiscoveryGraph'
import CrawlerIssues from './CrawlerIssues'

export default function CrawlerAccess() {
  const { data: mainData, loading: showLoading, error: parentError, crawlerData } = useOutletContext()
  const mainError = parentError;
  const error = null;

  // UI Interactive States
  const [expandedSitemaps, setExpandedSitemaps] = useState({})
  const [sitemapsPageSize, setSitemapsPageSize] = useState({})
  const [expandedIssues, setExpandedIssues] = useState({})
  const [activeGraphNode, setActiveGraphNode] = useState(null)

  const issues = useMemo(() => crawlerData?.issues || [], [crawlerData?.issues])

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
  const isAwaiting = !mainData && !crawlerData

  // Summary Metrics calculations
  const botsAllowedCount = AI_CRAWLERS.filter(bot => getBotStatusLabel(robots, bot.ua) === 'Allowed').length
  const botsLimitedCount = AI_CRAWLERS.filter(bot => getBotStatusLabel(robots, bot.ua) === 'Limited').length
  const botsBlockedCount = AI_CRAWLERS.filter(bot => getBotStatusLabel(robots, bot.ua) === 'Blocked').length

  const sitemapsData = sitemaps?.discovered || []
  const totalSitemapsCount = sitemapsData.length
  const parsedSitemapsCount = sitemapsData.filter(s => s.ok).length
  const criticalIssuesCount = issues.filter(i => i.severity === 'critical').length

  // Toggle Sitemap Node Expanded
  const toggleSitemap = (sUrl) => {
    setExpandedSitemaps(prev => ({
      ...prev,
      [sUrl]: !prev[sUrl]
    }))
  }

  // Increase Page size for Sitemap Node
  const loadMoreSitemapUrls = (sUrl, totalCount) => {
    setSitemapsPageSize(prev => ({
      ...prev,
      [sUrl]: Math.min(totalCount, (prev[sUrl] || 15) + 30)
    }))
  }

  return (
    <div className={`crawler-access-page ${showLoading ? 'is-loading' : ''} ${isAwaiting ? 'is-awaiting' : ''}`}>
      {mainError && <div className="error-banner">{mainError}</div>}
      {error && <div className="error-banner">{error}</div>}

      {/* 1. Crawler Health Overview */}
      <CrawlerHealthOverview
        score={score}
        botsAllowedCount={botsAllowedCount}
        botsBlockedCount={botsBlockedCount}
        botsLimitedCount={botsLimitedCount}
        sitemaps={sitemaps}
        parsedSitemapsCount={parsedSitemapsCount}
        totalSitemapsCount={totalSitemapsCount}
        criticalIssuesCount={criticalIssuesCount}
        loading={showLoading}
        isAwaiting={isAwaiting}
      />

      <div style={{ opacity: isAwaiting ? 0.6 : 1, pointerEvents: isAwaiting || showLoading ? 'none' : 'auto', transition: 'opacity 0.3s' }}>
        {/* 2. Crawler Access List */}
        <CrawlerPermissions
          robots={robots}
        />

        {/* 3. robots.txt Interactive Viewer */}
        <RobotsViewer
          robots={robots}
          sitemaps={sitemaps}
        />

        {/* 4. Sitemap Explorer */}
        <SitemapExplorer
          sitemaps={sitemaps}
          origin={origin}
          issues={issues}
          expandedSitemaps={expandedSitemaps}
          sitemapsPageSize={sitemapsPageSize}
          toggleSitemap={toggleSitemap}
          loadMoreSitemapUrls={loadMoreSitemapUrls}
        />

        {/* 5. Discovery Graph */}
        <DiscoveryGraph
          crawlerData={crawlerData}
          activeGraphNode={activeGraphNode}
          setActiveGraphNode={setActiveGraphNode}
        />

        {/* 6. Crawler Issues Accordion (Action Queue) */}
        <CrawlerIssues
          sortedIssues={sortedIssues}
          expandedIssues={expandedIssues}
          setExpandedIssues={setExpandedIssues}
        />
      </div>
    </div>
  )
}
