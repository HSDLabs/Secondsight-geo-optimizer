import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import AppLayout from './layout/AppLayout'
import SectionPlaceholder from './components/common/SectionPlaceholder'
import { navItems } from './navigation'
import { useProgressiveAnalysis } from './hooks/useProgressiveAnalysis'
import { getProgressMetrics } from './components/machine-understanding/utils/progressiveAnalysis'
import { computeVisibilityBreakdown } from './utils/scoring'

export default function App() {
  const [url, setUrl] = useState('')
  const [data, setData] = useState(null)
  const [crawlerData, setCrawlerData] = useState(null)
  const [externalData, setExternalData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [analyzedAt, setAnalyzedAt] = useState(null)
  const [selectedIssue, setSelectedIssue] = useState(null)
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const {
    progressState: analysisProgress,
    startAnalysisProgress,
    applyProgressEvent,
    clearAnalysisProgress
  } = useProgressiveAnalysis()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
  }, [])

  async function analyze(targetUrl) {
    const trimmedUrl = (typeof targetUrl === 'string' ? targetUrl : url).trim()
    if (!trimmedUrl) return

    if (trimmedUrl !== url) setUrl(trimmedUrl)

    setLoading(true)
    setError(null)
    setSelectedIssue(null)
    setSelectedNodeId(null)
    setData(null)
    setCrawlerData(null)
    setExternalData(null)
    setAnalyzedAt(null)
    startAnalysisProgress(trimmedUrl)

    try {
      const [analyzeRes, crawlerRes, externalRes] = await Promise.allSettled([
        fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: trimmedUrl })
        }),
        fetch('/api/crawler', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: trimmedUrl })
        }),
        fetch('/api/externalWeb/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: trimmedUrl })
        })
      ])

      let mainJson = null
      let crawlerJson = null
      let externalJson = null

      if (analyzeRes.status === 'fulfilled' && analyzeRes.value.ok) {
        mainJson = await analyzeRes.value.json()
      } else {
        const errMsg = analyzeRes.status === 'fulfilled'
          ? (await analyzeRes.value.json()).error
          : (analyzeRes.reason?.message || 'Main analysis request failed')
        throw new Error(errMsg)
      }

      if (crawlerRes.status === 'fulfilled' && crawlerRes.value.ok) {
        crawlerJson = await crawlerRes.value.json()
      } else {
        console.warn('Crawler analysis failed silently during parallel fetch')
      }

      if (externalRes.status === 'fulfilled' && externalRes.value.ok) {
        externalJson = await externalRes.value.json()
      } else {
        console.warn('External analysis failed silently during parallel fetch')
      }

      setData(mainJson)
      setCrawlerData(crawlerJson)
      setExternalData(externalJson)
      setAnalyzedAt(new Date().toISOString())
      setSelectedNodeId(null)
      clearAnalysisProgress()
      applyProgressEvent({ type: 'analysis/hydrate', url: trimmedUrl, data: mainJson, at: Date.now() })
    } catch (e) {
      setError(e.message)
      applyProgressEvent({ type: 'analysis/failed', errorMessage: e.message })
      clearAnalysisProgress()
    } finally {
      setLoading(false)
    }
  }

  const issueCount = data?.a11y?.issues?.length ?? 0
  const scoreBreakdown = computeVisibilityBreakdown(data)
  const progressMetrics = getProgressMetrics(analysisProgress)
  
  const isAwaiting = !data && !loading && (!analysisProgress?.phase || analysisProgress.phase === 'idle')
  const visibilityScore = isAwaiting
    ? null
    : (analysisProgress?.phase && analysisProgress.phase !== 'idle'
      ? progressMetrics.understandingScore
      : scoreBreakdown.score)
  const selectedNode = selectedNodeId ? data?.a11y?.semanticIndex?.[selectedNodeId] : null

  function selectIssueGroup(type) {
    setSelectedIssue(type)

    const linkedNodeId = data?.a11y?.issues
      ?.filter(issue => issue.type === type)
      .flatMap(issue => issue.nodeIds || [])
      .find(Boolean)

    if (linkedNodeId) setSelectedNodeId(linkedNodeId)
  }

  const outletContext = {
    data,
    loading,
    error,
    visibilityScore,
    issueCount,
    scoreBreakdown,
    analyzedAt,
    selectedNode,
    selectedNodeId,
    setSelectedNodeId,
    selectedIssue,
    selectIssueGroup,
    analysisProgress,
    crawlerData,
    externalData,
    reanalyze: () => analyze(url)
  }

  return (
    <Routes>
      <Route
        element={
          <AppLayout
            url={url}
            setUrl={setUrl}
            analyze={analyze}
            loading={loading}
            outletContext={outletContext}
          />
        }
      >
        {navItems.map(item => (
          <Route
            key={item.path}
            path={item.path}
            element={
              item.element ?? (
                <SectionPlaceholder label={item.label} description={item.description} />
              )
            }
          />
        ))}
      </Route>
    </Routes>
  )
}
