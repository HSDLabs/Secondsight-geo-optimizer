import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { aiVisibilityApi, pollVisibilityRun } from '../features/aiVisibility/aiVisibilityApi'
import {
  AnswersView, CitationsView, CompetitorsView, EmptyMessage, HistoryView, LoadingSkeleton,
  OverviewView, PageHeader, PromptsView, RunConfigModal, RunProgress, TabBar, WhyView
} from '../features/aiVisibility/AIVisibilityComponents'
import { AlertTriangle, RefreshCw, Sparkles } from '../components/icons/heroicons'
import '../features/aiVisibility/aiVisibility.css'

function websiteDomain(value) {
  try { return new URL(value).hostname.replace(/^www\./, '') } catch { return '' }
}

function titleBrand(data) {
  const title = data?.title || data?.metadata?.title || ''
  const candidate = title.split(/\s+[|–—-]\s+/)[0]?.trim()
  return candidate || websiteDomain(data?.url).split('.')[0] || ''
}

function schemaTypes(data) {
  return data?.metadata?.schemas?.filter(schema => schema.valid).flatMap(schema => {
    const values = Array.isArray(schema.value) ? schema.value : [schema.value]
    return values.map(value => value?.['@type']).flat().filter(Boolean)
  }) || []
}

function buildProjectInput(data) {
  const brandName = titleBrand(data)
  const types = schemaTypes(data)
  return {
    website: data.url,
    brandName,
    brandAliases: [],
    businessCategory: types[0] || 'Website',
    productsServices: [],
    targetAudience: `People researching ${brandName}`,
    targetCountry: 'Global',
    language: document.documentElement.lang || 'English',
    knownCompetitors: []
  }
}

function text(value, max) {
  return String(value || '').slice(0, max)
}

function compactIssues(issues, limit) {
  return (issues || []).slice(0, limit).map(issue => ({
    id: text(issue.id, 200),
    type: text(issue.type, 200),
    title: text(issue.title, 500),
    severity: text(issue.severity, 50),
    evidence: text(issue.evidence || issue.reason, 1000),
    affectedUrls: (issue.affectedUrls || []).slice(0, 3).map(url => text(url, 500))
  }))
}

function compactAnalysisSnapshot(value) {
  if (!value) return null
  return {
    url: text(value.url, 2000),
    title: text(value.title, 500),
    metadata: {
      title: text(value.metadata?.title, 500),
      description: text(value.metadata?.description, 2000),
      canonical: text(value.metadata?.canonical, 2000)
    },
    readable: {
      title: text(value.readable?.title, 500),
      excerpt: text(value.readable?.excerpt, 2000),
      textContent: text(value.readable?.textContent || value.readable?.text, 12000),
      wordCount: Number(value.readable?.wordCount || 0)
    },
    a11y: { issues: compactIssues(value.a11y?.issues, 20) }
  }
}

function compactCrawlerSnapshot(value) {
  if (!value) return null
  return {
    url: text(value.url, 2000),
    origin: text(value.origin, 2000),
    analyzedAt: text(value.analyzedAt, 100),
    issues: compactIssues(value.issues, 30)
  }
}

export default function AIVisibilityPage() {
  const { data, crawlerData, analysisSessionId, publishedExternalRun } = useOutletContext()
  const projectId = analysisSessionId
  const [activeTab, setActiveTab] = useState('Overview')
  const [engines, setEngines] = useState([])
  const [overview, setOverview] = useState(null)
  const [prompts, setPrompts] = useState([])
  const [responses, setResponses] = useState([])
  const [competitors, setCompetitors] = useState([])
  const [citations, setCitations] = useState([])
  const [rootCauses, setRootCauses] = useState([])
  const [run, setRun] = useState(null)
  const [selectedPromptId, setSelectedPromptId] = useState('')
  const [loading, setLoading] = useState(Boolean(projectId))
  const [generating, setGenerating] = useState(false)
  const [runModalOpen, setRunModalOpen] = useState(false)
  const [error, setError] = useState(null)
  const pollController = useRef(null)
  const project = useMemo(() => data?.url ? buildProjectInput(data) : null, [data])

  const loadResults = useCallback(async () => {
    if (!projectId) return
    const [overviewPayload, promptPayload] = await Promise.all([
      aiVisibilityApi.overview(projectId),
      aiVisibilityApi.prompts(projectId).catch(apiError => apiError.status === 404 ? { items: [] } : Promise.reject(apiError))
    ])
    setOverview(overviewPayload)
    setPrompts(promptPayload.items)
    if (overviewPayload.status === 'running') setRun(overviewPayload.run)
    if (overviewPayload.status === 'ready') {
      setRun(overviewPayload.latestRun)
      const [responsePayload, competitorPayload, citationPayload, causePayload] = await Promise.all([
        aiVisibilityApi.responses(projectId), aiVisibilityApi.competitors(projectId),
        aiVisibilityApi.citations(projectId), aiVisibilityApi.rootCauses(projectId)
      ])
      setResponses(responsePayload.items)
      setCompetitors(competitorPayload.items)
      setCitations(citationPayload.items)
      setRootCauses(causePayload.items)
    }
  }, [projectId])

  useEffect(() => {
    let cancelled = false
    aiVisibilityApi.engines()
      .then(payload => { if (!cancelled) setEngines(payload.engines) })
      .catch(apiError => { if (!cancelled) setError(apiError.message) })
    if (projectId) {
      Promise.resolve().then(() => {
        if (!cancelled) setLoading(true)
        return loadResults()
      }).catch(apiError => {
        if (!cancelled) setError(apiError.message)
      }).finally(() => { if (!cancelled) setLoading(false) })
    }
    return () => { cancelled = true }
  }, [loadResults, projectId])

  useEffect(() => () => pollController.current?.abort(), [])

  async function generatePrompts() {
    if (!projectId || !project) return
    setGenerating(true)
    setError(null)
    try {
      const payload = await aiVisibilityApi.generatePrompts(projectId, {
        project,
        diagnostics: {
          analysisSessionId: projectId,
          analysis: compactAnalysisSnapshot(data),
          crawler: compactCrawlerSnapshot(crawlerData),
          externalRunId: publishedExternalRun?.id || null
        }
      })
      setPrompts(payload.prompts)
      setActiveTab('Prompts')
      setOverview(current => ({ ...(current || {}), status: 'empty', persistence: 'temporary', historyAvailable: false, trendsAvailable: false, promptCount: payload.prompts.length }))
    } catch (apiError) {
      setError(apiError.message)
    } finally {
      setGenerating(false)
    }
  }

  async function updatePrompt(promptId, patch) {
    setError(null)
    try {
      const updated = await aiVisibilityApi.updatePrompt(promptId, patch)
      setPrompts(current => current.map(prompt => prompt.id === promptId ? updated : prompt))
      return updated
    } catch (apiError) {
      setError(apiError.message)
      throw apiError
    }
  }

  async function startRun(config) {
    setError(null)
    try {
      pollController.current?.abort()
      const created = await aiVisibilityApi.createRun(projectId, config)
      setRun(created)
      setRunModalOpen(false)
      setActiveTab('Overview')
      const controller = new AbortController()
      pollController.current = controller
      await pollVisibilityRun(created.id, { signal: controller.signal, onUpdate: setRun })
      await loadResults()
    } catch (apiError) {
      if (apiError.name !== 'AbortError') setError(apiError.code === 'RUN_EXPIRED' ? 'This temporary run expired. Start a new visibility check to refresh the results.' : apiError.message)
    }
  }

  async function retryEngine(engine, { withoutSearch = false } = {}) {
    const failedPromptIds = [...new Set((run?.errors || []).filter(item => item.engine === engine && item.promptId && !item.responseId).map(item => item.promptId))]
    const approved = failedPromptIds.filter(promptId => prompts.some(prompt => prompt.id === promptId && prompt.status === 'approved'))
    if (!approved.length) return
    await startRun({ promptIds: approved, engines: [engine], webSearchEnabled: withoutSearch ? false : run.webSearchEnabled })
  }

  async function decideCompetitor(entityId, decision, details) {
    setError(null)
    try {
      await aiVisibilityApi.updateCompetitor(entityId, { decision, ...details })
      await loadResults()
    } catch (apiError) {
      setError(apiError.message)
    }
  }

  const running = run && !['completed', 'completed_degraded', 'failed'].includes(run.status)
  const tabContent = {
    Overview: <OverviewView overview={overview} responses={responses} citations={citations} competitors={competitors} prompts={prompts} brandName={project?.brandName} onTab={setActiveTab} onSelectPrompt={setSelectedPromptId} />,
    Prompts: <PromptsView prompts={prompts} onUpdate={updatePrompt} onGenerate={generatePrompts} generating={generating} onOpenRun={() => setRunModalOpen(true)} />,
    Answers: <AnswersView prompts={prompts} responses={responses} competitors={competitors} brandName={project?.brandName} selectedPromptId={selectedPromptId} onSelectPrompt={setSelectedPromptId} />,
    Competitors: <CompetitorsView competitors={competitors} onDecision={decideCompetitor} />,
    Citations: <CitationsView citations={citations} responses={responses} />,
    Why: <WhyView rootCauses={rootCauses} />,
    History: <HistoryView />
  }

  return (
    <main className="aiv-page">
      <PageHeader brandName={project?.brandName} domain={websiteDomain(project?.website)} engines={engines} canGenerate={Boolean(projectId && project && engines.some(engine => engine.available))} canRun={prompts.some(prompt => prompt.status === 'approved')} generating={generating} running={running} onGenerate={generatePrompts} onOpenRun={() => setRunModalOpen(true)} />
      <TabBar active={activeTab} onChange={setActiveTab} />
      {error && <div className="aiv-alert" role="alert"><AlertTriangle size={18} /><span>{error}</span><button onClick={() => { setError(null); loadResults().catch(apiError => setError(apiError.message)) }}><RefreshCw size={15} /> Retry</button></div>}
      <RunProgress run={run} onRetry={retryEngine} />
      {loading ? <LoadingSkeleton /> : !projectId ? (
        <EmptyMessage icon={Sparkles} title="Analyze a website first">AI Visibility uses the current analysis as the project context and evidence snapshot. Enter a URL in the header to begin.</EmptyMessage>
      ) : tabContent[activeTab]}
      <RunConfigModal key={`${runModalOpen}-${prompts.length}-${engines.length}`} open={runModalOpen} prompts={prompts} engines={engines} onClose={() => setRunModalOpen(false)} onStart={startRun} />
    </main>
  )
}
