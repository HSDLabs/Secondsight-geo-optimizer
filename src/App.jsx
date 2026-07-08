import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import './styles/App.css'
import './styles/VisibilityLayer.css'
import './styles/Layout.css'
import AppLayout from './layout/AppLayout'
import SectionPlaceholder from './pages/SectionPlaceholder'
import { navItems } from './navigation'
import { useProgressiveAnalysis } from './hooks/useProgressiveAnalysis'
import { getProgressMetrics } from './pages/ai-understanding/progressiveAnalysis'

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
    // Light mode temporarily disabled by request
    document.documentElement.setAttribute('data-theme', 'dark')
    
    /*
    const theme = localStorage.getItem('secondsight-theme') || 'system'
    
    const applyTheme = (t) => {
      if (t === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
      } else {
        document.documentElement.setAttribute('data-theme', t)
      }
    }

    applyTheme(theme)

    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = () => {
      if ((localStorage.getItem('secondsight-theme') || 'system') === 'system') {
        applyTheme('system')
      }
    }
    
    mql.addEventListener('change', listener)
    
    // Also listen for changes from Settings page
    const storageListener = () => {
      applyTheme(localStorage.getItem('secondsight-theme') || 'system')
    }
    window.addEventListener('storage', storageListener)
    
    return () => {
      mql.removeEventListener('change', listener)
      window.removeEventListener('storage', storageListener)
    }
    */
  }, [])

  async function analyze() {
    if (!url.trim()) return

    const trimmedUrl = url.trim()

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

  // Shared analysis state passed down to every section via the layout's
  // Outlet context. Because it lives here (above the router outlet), one
  // analysis stays live as the user navigates between sections.
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
    externalData
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
