import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './layout/AppLayout'
import SectionPlaceholder from './components/common/SectionPlaceholder'
import { navItems } from './navigation'
import { useProgressiveAnalysis } from './hooks/useProgressiveAnalysis'
import { getProgressMetrics } from './components/machine-understanding/utils/progressiveAnalysis'
import { computeVisibilityBreakdown } from './utils/scoring'
import { waitForCrawlerContext } from './utils/externalRunOrchestration'
import { getApiControls, subscribeToApiControls } from './utils/featureControls'

const EXTERNAL_TERMINAL_STATES = ['completed', 'completed_degraded', 'failed', 'superseded']
const LIVE_EXTERNAL_SOURCES = ['reddit', 'news', 'x', 'youtube']

function enabledSources(capabilities) {
  return capabilities?.sources?.filter(source => LIVE_EXTERNAL_SOURCES.includes(source.sourceType) && source.available).map(source => source.sourceType) || []
}

function createSessionId() {
  return `session_${globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(16).slice(2)}`}`
}

function entityHintFromAnalysis(mainJson, crawlerJson) {
  return {
    title: mainJson.title || mainJson.metadata?.title,
    description: mainJson.metadata?.description || mainJson.readable?.excerpt,
    canonicalUrl: mainJson.metadata?.canonical,
    schemaTypes: mainJson.metadata?.schemas
      ?.filter(schema => schema.valid)
      .flatMap(schema => {
        const value = schema.value
        return Array.isArray(value) ? value.map(item => item?.['@type']) : [value?.['@type']]
      })
      .filter(Boolean),
    crawlerSignals: crawlerJson ? {
      canonical: crawlerJson.pageSignals?.canonical,
      llmsTxtFound: crawlerJson.llmsTxt?.found
    } : undefined
  }
}

function DisabledFeature({ label }) {
  return <section className="mx-auto grid min-h-[60vh] max-w-lg place-content-center text-center"><h1 className="text-2xl font-semibold text-[var(--text)]">{label} is disabled</h1><p className="mt-3 text-sm leading-6 text-[var(--muted)]">Enable this section in Settings to use it. No requests are sent while it is disabled.</p></section>
}

export default function App() {
  const [url, setUrl] = useState('')
  const [data, setData] = useState(null)
  const [crawlerData, setCrawlerData] = useState(null)
  const [externalRun, setExternalRun] = useState(null)
  const [publishedExternalRun, setPublishedExternalRun] = useState(null)
  const [externalCapabilities, setExternalCapabilities] = useState(null)
  const [externalError, setExternalError] = useState(null)
  const [analysisSessionId, setAnalysisSessionId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [analyzedAt, setAnalyzedAt] = useState(null)
  const [selectedIssue, setSelectedIssue] = useState(null)
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [apiControls, setApiControls] = useState(getApiControls)
  const analysisSessionRef = useRef(null)
  const {
    progressState: analysisProgress,
    startAnalysisProgress,
    applyProgressEvent,
    clearAnalysisProgress
  } = useProgressiveAnalysis()

  useEffect(() => {
    const theme = localStorage.getItem('secondsight-theme') === 'dark'
      ? 'dark'
      : 'light'
    if (localStorage.getItem('secondsight-theme') === 'system') {
      localStorage.setItem('secondsight-theme', 'light')
    }
    document.documentElement.setAttribute('data-theme', theme)
  }, [])

  useEffect(() => subscribeToApiControls(setApiControls), [])

  const retryExternalCapabilities = useCallback(async () => {
    if (!apiControls.sources) return null
    try {
      const response = await fetch('/api/external-intelligence/capabilities')
      if (!response.ok) throw new Error('Could not load source capabilities.')
      const payload = await response.json()
      setExternalError(null)
      setExternalCapabilities(payload)
      return payload
    } catch (capabilityError) {
      setExternalCapabilities(null)
      setExternalError(capabilityError.message)
      return null
    }
  }, [apiControls.sources])

  useEffect(() => {
    if (!apiControls.sources) return undefined
    let cancelled = false
    fetch('/api/external-intelligence/capabilities')
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Could not load source capabilities.')))
      .then(payload => {
        if (cancelled) return
        setExternalError(null)
        setExternalCapabilities(payload)
      })
      .catch(capabilityError => {
        if (cancelled) return
        setExternalCapabilities(null)
        setExternalError(capabilityError.message)
      })
    return () => { cancelled = true }
  }, [apiControls.sources])

  const loadExternalRun = useCallback(async runId => {
    if (!apiControls.sources) return null
    const response = await fetch(`/api/external-intelligence/runs/${runId}`)
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'External analysis is no longer available.')
    setExternalRun(payload)
    if (payload.publishable && payload.publishedExternalRunId === payload.id) setPublishedExternalRun(payload)
    return payload
  }, [apiControls.sources])

  const startExternalRun = useCallback(async (overrides = {}) => {
    if (!apiControls.sources) throw new Error('Sources & Authority is disabled in Settings.')
    if (!analysisSessionRef.current || !data?.url) throw new Error('Analyze a website before starting Sources & Authority.')
    setExternalError(null)
    let sources = overrides.sources || enabledSources(externalCapabilities)
    if (!sources.length) {
      const capabilityResponse = await fetch('/api/external-intelligence/capabilities')
      if (capabilityResponse.ok) {
        const capabilitySnapshot = await capabilityResponse.json()
        setExternalCapabilities(capabilitySnapshot)
        sources = enabledSources(capabilitySnapshot)
      }
    }
    if (!sources.length) throw new Error('No external source collector is currently available.')
    const response = await fetch('/api/external-intelligence/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        analysisSessionId: analysisSessionRef.current,
        basedOnRunId: overrides.basedOnRunId || externalRun?.id || null,
        url: overrides.url || data.url,
        sources,
        dateMode: overrides.dateMode || 'automatic',
        requestedRange: overrides.requestedRange || null,
        entityHint: overrides.entityHint || entityHintFromAnalysis(data, crawlerData)
      })
    })
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || 'Could not start Sources & Authority analysis.')
    setExternalRun(payload)
    return payload
  }, [apiControls.sources, crawlerData, data, externalCapabilities, externalRun?.id])

  useEffect(() => {
    if (!apiControls.sources) return undefined
    const runId = externalRun?.id
    if (!runId || EXTERNAL_TERMINAL_STATES.includes(externalRun.status)) return undefined
    const timer = window.setInterval(() => {
      loadExternalRun(runId).catch(pollError => setExternalError(pollError.message))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [apiControls.sources, externalRun?.id, externalRun?.status, loadExternalRun])

  async function analyze(targetUrl) {
    const trimmedUrl = (typeof targetUrl === 'string' ? targetUrl : url).trim()
    if (!trimmedUrl) return
    if (trimmedUrl !== url) setUrl(trimmedUrl)

    setLoading(true)
    setError(null)
    setExternalError(null)
    setSelectedIssue(null)
    setSelectedNodeId(null)
    setData(null)
    setCrawlerData(null)
    setExternalRun(null)
    setPublishedExternalRun(null)
    setAnalyzedAt(null)
    startAnalysisProgress(trimmedUrl)
    const sessionId = createSessionId()
    analysisSessionRef.current = sessionId
    setAnalysisSessionId(sessionId)
    let mainCompleted = false

    try {
      const mainPromise = fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmedUrl })
      })
      const crawlerResultPromise = apiControls.crawler ? fetch('/api/crawler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmedUrl })
      })
        .then(async response => response.ok ? { ok: true, data: await response.json() } : { ok: false, data: null })
        .catch(() => ({ ok: false, data: null }))
        .then(result => {
          if (analysisSessionRef.current === sessionId && result.ok) setCrawlerData(result.data)
          return result
        })
        : Promise.resolve({ ok: false, data: null })

      const analyzeResponse = await mainPromise
      if (!analyzeResponse.ok) throw new Error((await analyzeResponse.json()).error || 'Main analysis request failed')
      const mainJson = await analyzeResponse.json()
      if (analysisSessionRef.current !== sessionId) return
      mainCompleted = true
      setData(mainJson)
      setAnalyzedAt(new Date().toISOString())
      clearAnalysisProgress()
      applyProgressEvent({ type: 'analysis/hydrate', url: trimmedUrl, data: mainJson, at: Date.now() })

      const crawlerGate = await waitForCrawlerContext(crawlerResultPromise, 7000)
      if (analysisSessionRef.current !== sessionId) return
      if (crawlerGate.ok) setCrawlerData(crawlerGate.data)
      setLoading(false)

      if (apiControls.sources && (import.meta.env.VITE_EXTERNAL_INTELLIGENCE_START_MODE || 'automatic') === 'automatic') {
        let capabilitySnapshot = externalCapabilities
        if (!capabilitySnapshot) {
          const capabilityResponse = await fetch('/api/external-intelligence/capabilities')
          if (capabilityResponse.ok) {
            capabilitySnapshot = await capabilityResponse.json()
            setExternalCapabilities(capabilitySnapshot)
          }
        }
        const sources = enabledSources(capabilitySnapshot)
        if (!sources.length) throw new Error('No external source collector is currently available. Review server capability configuration.')
        const response = await fetch('/api/external-intelligence/runs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            analysisSessionId: sessionId,
            url: trimmedUrl,
            sources,
            dateMode: 'automatic',
            requestedRange: null,
            entityHint: entityHintFromAnalysis(mainJson, crawlerGate.ok ? crawlerGate.data : null)
          })
        })
        const externalJson = await response.json()
        if (!response.ok) throw new Error(externalJson.error || 'Could not start Sources & Authority analysis.')
        if (analysisSessionRef.current === sessionId) setExternalRun(externalJson)
      }
    } catch (analysisError) {
      if (analysisSessionRef.current !== sessionId) return
      if (mainCompleted) {
        setExternalError(analysisError.message)
      } else {
        setError(analysisError.message)
        applyProgressEvent({ type: 'analysis/failed', errorMessage: analysisError.message })
        clearAnalysisProgress()
      }
    } finally {
      if (analysisSessionRef.current === sessionId) setLoading(false)
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
    analysisSessionId,
    externalRun,
    publishedExternalRun,
    externalCapabilities,
    externalError,
    retryExternalCapabilities,
    startExternalRun,
    loadExternalRun,
    setExternalRun,
    setPublishedExternalRun,
    setExternalError,
    reanalyze: () => analyze(url)
  }

  return (
    <Routes>
      <Route
        element={<AppLayout url={url} setUrl={setUrl} analyze={analyze} loading={loading} outletContext={outletContext} apiControls={apiControls} />}
      >
        {navItems.map(item => (
          <Route
            key={item.path}
            path={item.path}
            element={item.featureKey && !apiControls[item.featureKey] ? <DisabledFeature label={item.label} /> : item.element ?? <SectionPlaceholder label={item.label} description={item.description} />}
          />
        ))}
        {navItems.flatMap(item => (item.legacyPaths || []).map(legacyPath => (
          <Route key={legacyPath} path={legacyPath} element={<Navigate to={item.path} replace />} />
        )))}
      </Route>
    </Routes>
  )
}
