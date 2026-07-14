import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, Bot, Check, CheckCircle2, ChevronDown, Clock, ExternalLink,
  Globe2, Info, MessageSquareText, Search, Sparkles, X
} from '../../components/icons/heroicons'

const TABS = ['Overview', 'Prompts', 'Answers', 'Competitors', 'Citations', 'Why', 'History']
const ENGINE_LABELS = { openai: 'ChatGPT', gemini: 'Gemini', claude: 'Claude' }
const TERMINAL = ['completed', 'completed_degraded', 'failed']

function formatPercent(value) {
  return Number.isFinite(value) ? `${value}%` : '—'
}

function EmptyMessage({ icon: Icon = Info, title, children, action }) {
  return (
    <div className="aiv-empty">
      <span className="aiv-empty__icon"><Icon size={22} /></span>
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  )
}

function Badge({ tone = 'neutral', children }) {
  return <span className={`aiv-badge aiv-badge--${tone}`}>{children}</span>
}

function statusTone(status) {
  if (['complete', 'completed', 'confirmed', 'supported', 'available'].includes(status)) return 'good'
  if (['failed', 'rejected', 'unsupported', 'unavailable'].includes(status)) return 'bad'
  if (['completed_degraded', 'pending', 'partially_supported', 'running', 'analyzing', 'queued'].includes(status)) return 'warning'
  return 'neutral'
}

export function PageHeader({ brandName, domain, engines, canGenerate, canRun, generating, running, onGenerate, onOpenRun }) {
  const configured = engines.filter(engine => engine.available)
  return (
    <header className="aiv-header">
      <div>
        <p className="aiv-eyebrow">{brandName ? `${brandName} · ${domain}` : 'AI answer monitoring'}</p>
        <h1>AI Visibility</h1>
        <p className="aiv-header__copy">Measure how leading AI systems mention, recommend, and cite your brand across real customer prompts.</p>
        <div className="aiv-engine-status" aria-label="Provider availability">
          {engines.map(engine => (
            <span key={engine.id} title={engine.reason || engine.model || ''}>
              <i className={engine.available ? 'is-online' : ''} />
              {ENGINE_LABELS[engine.id] || engine.id}
              {!engine.available && <small>Unavailable</small>}
            </span>
          ))}
          {!engines.length && <span><i /> Loading providers…</span>}
        </div>
      </div>
      <div className="aiv-header__actions">
        <button className="aiv-button aiv-button--secondary" disabled={!canGenerate || generating || running} onClick={onGenerate}>
          <Sparkles size={17} /> {generating ? 'Generating…' : 'Generate prompts'}
        </button>
        <button className="aiv-button aiv-button--primary" disabled={!canRun || !configured.length || running} onClick={onOpenRun}>
          <Bot size={17} /> {running ? 'Run in progress' : 'Run visibility check'}
        </button>
      </div>
    </header>
  )
}

export function TabBar({ active, onChange }) {
  return (
    <nav className="aiv-tabs" aria-label="AI Visibility sections">
      {TABS.map(tab => <button key={tab} className={active === tab ? 'is-active' : ''} aria-current={active === tab ? 'page' : undefined} onClick={() => onChange(tab)}>{tab}</button>)}
    </nav>
  )
}

export function RunProgress({ run, onRetry }) {
  if (!run) return null
  const progress = run.totalTasks ? Math.round((run.completedTasks / run.totalTasks) * 100) : 0
  const taskError = run.errors?.find(error => error.engine && !error.responseId)
  const failedEngine = taskError?.engine
  const retryWithoutSearch = Boolean(run.webSearchEnabled && (taskError?.status === 429 || /quota|too_many_requests/i.test(taskError?.message || '')))
  const errorSummary = retryWithoutSearch
    ? `${ENGINE_LABELS[failedEngine] || failedEngine} web search quota is exhausted. Retry without web search or check the provider quota.`
    : taskError?.message
  return (
    <section className={`aiv-progress ${TERMINAL.includes(run.status) ? 'is-terminal' : ''}`} aria-live="polite">
      <div className="aiv-progress__top">
        <div><span className="aiv-pulse" /><strong>{run.status.replaceAll('_', ' ')}</strong><span>{run.completedTasks} of {run.totalTasks} tasks complete</span></div>
        <span>{progress}%</span>
      </div>
      <div className="aiv-progress__track"><span style={{ width: `${progress}%` }} /></div>
      {run.errors?.length > 0 && (
        <div className="aiv-error-inline">
          <AlertTriangle size={17} />
          <span>{errorSummary || `${run.errors.length} task or analysis step${run.errors.length === 1 ? '' : 's'} degraded this run. Retained answers remain visible.`}</span>
          {failedEngine && onRetry && <button onClick={() => onRetry(failedEngine, { withoutSearch: retryWithoutSearch })}>Retry {ENGINE_LABELS[failedEngine] || failedEngine}{retryWithoutSearch ? ' without search' : ''}</button>}
        </div>
      )}
    </section>
  )
}

export function LoadingSkeleton() {
  return <div className="aiv-skeleton" aria-label="Loading AI Visibility"><span /><span /><span /><span /></div>
}

function MetricCard({ label, value, context }) {
  return <article className="aiv-metric"><span>{label}</span><strong>{value}</strong><small>{context}</small></article>
}

export function OverviewView({ overview, responses, citations, competitors, prompts, brandName, onTab, onSelectPrompt }) {
  if (!overview || overview.status === 'empty') {
    return <EmptyMessage icon={Sparkles} title={prompts.length ? 'Prompts are ready for review' : 'No visibility run yet'}>{prompts.length ? 'Approve the prompts you trust, then configure your first visibility run.' : 'Generate reviewable prompts from the current website analysis to begin.'}</EmptyMessage>
  }
  if (overview.status === 'running') return <EmptyMessage icon={Clock} title="Visibility check running">Results appear here as soon as the provider tasks finish.</EmptyMessage>

  const analyzed = responses.filter(response => response.analysis)
  const ranked = analyzed.filter(response => Number.isFinite(response.analysis.mentionPosition))
  const firstPartyResponses = responses.filter(response => response.citations?.some(citation => citation.sourceType === 'first_party'))
  const confirmedAppeared = competitors.filter(entity => entity.confirmed && entity.mentionCount > 0)
  const metrics = overview.metrics || {}
  const comparison = overview.answerComparison
  const citationSources = groupCitationSources(citations, responses)

  return (
    <div className="aiv-stack aiv-enter">
      <section className="aiv-metrics" aria-label="AI visibility metrics">
        <MetricCard label="Brand mention rate" value={formatPercent(metrics.mentionRate)} context={`${analyzed.filter(item => item.analysis.brandMentioned).length} of ${analyzed.length} analyzed answers`} />
        <MetricCard label="Recommendation rate" value={formatPercent(metrics.recommendationRate)} context={`${analyzed.filter(item => ['recommended', 'strongly_recommended'].includes(item.analysis.recommendation)).length} positive recommendations`} />
        <MetricCard label="First-party citation rate" value={formatPercent(metrics.firstPartyCitationRate)} context={`${firstPartyResponses.length} of ${responses.length} successful answers`} />
        <MetricCard label="Average position" value={metrics.averagePosition ?? '—'} context={`${ranked.length} defensible ranked mention${ranked.length === 1 ? '' : 's'}`} />
        <MetricCard label="Competitors detected" value={metrics.competitorsDetected ?? 0} context={`${confirmedAppeared.length} confirmed and observed`} />
      </section>

      <div className="aiv-grid aiv-grid--wide">
        <section className="aiv-panel">
          <div className="aiv-panel__heading"><div><p className="aiv-kicker">By provider</p><h2>Engine breakdown</h2></div><Badge tone="neutral">Successful answers only</Badge></div>
          <div className="aiv-engine-table">
            {overview.engineBreakdown?.map(row => (
              <div key={row.engine}>
                <span className={`aiv-engine-mark aiv-engine-mark--${row.engine}`}>{(ENGINE_LABELS[row.engine] || row.engine).slice(0, 1)}</span>
                <strong>{ENGINE_LABELS[row.engine] || row.engine}</strong>
                <span>{row.responseCount} answers</span>
                <span><b>{formatPercent(row.mentionRate)}</b> mentions</span>
                <span><b>{formatPercent(row.recommendationRate)}</b> recommends</span>
              </div>
            ))}
            {!overview.engineBreakdown?.length && <p className="aiv-muted">No successful engine responses yet.</p>}
          </div>
        </section>
        <section className="aiv-panel">
          <div className="aiv-panel__heading"><div><p className="aiv-kicker">Observed entities</p><h2>Top competitors</h2></div><button className="aiv-link-button" onClick={() => onTab('Competitors')}>Review all</button></div>
          <div className="aiv-compact-list">
            {overview.topCompetitors?.slice(0, 5).map(entity => <div key={entity.id}><span className="aiv-avatar">{entity.name.slice(0, 2).toUpperCase()}</span><strong>{entity.name}</strong><span>{entity.mentionCount} answer{entity.mentionCount === 1 ? '' : 's'}</span></div>)}
            {!overview.topCompetitors?.length && <p className="aiv-muted">No confirmed competitors appeared.</p>}
          </div>
        </section>
      </div>

      <section className="aiv-panel">
        <div className="aiv-panel__heading"><div><p className="aiv-kicker">Source mix</p><h2>Top citation sources</h2></div><button className="aiv-link-button" onClick={() => onTab('Citations')}>Open citations</button></div>
        <div className="aiv-source-grid">
          {citationSources.slice(0, 6).map(source => <article key={source.domain}><Globe2 size={18} /><strong>{source.domain}</strong><span>{source.count} citations · {source.prompts.size} prompts</span><Badge tone={source.types.has('first_party') ? 'good' : source.types.has('competitor') ? 'warning' : 'neutral'}>{[...source.types].join(', ').replaceAll('_', ' ')}</Badge></article>)}
          {!citationSources.length && <p className="aiv-muted">Providers returned no normalized citations.</p>}
        </div>
      </section>

      {comparison && <AnswerComparison comparison={comparison} competitors={competitors} brandName={brandName} onSelect={() => { onSelectPrompt(comparison.prompt.id); onTab('Answers') }} />}

      <section className="aiv-panel">
        <div className="aiv-panel__heading"><div><p className="aiv-kicker">Evidence-backed diagnostics</p><h2>Why AI visibility may be limited</h2></div><button className="aiv-link-button" onClick={() => onTab('Why')}>View evidence</button></div>
        <div className="aiv-cause-preview">
          {overview.rootCausePreview?.slice(0, 3).map(cause => <article key={cause.id}><Badge tone={cause.severity === 'high' ? 'bad' : cause.severity === 'medium' ? 'warning' : 'neutral'}>{cause.severity}</Badge><div><strong>{cause.title}</strong><p>{cause.description}</p></div></article>)}
          {!overview.rootCausePreview?.length && <p className="aiv-muted">No evidence-backed root cause records are available yet.</p>}
        </div>
      </section>
    </div>
  )
}

function PromptRow({ prompt, selected, onSelect, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(prompt.text)
  async function save() {
    await onUpdate(prompt.id, { text })
    setEditing(false)
  }
  return (
    <article className={`aiv-prompt ${prompt.status === 'approved' ? 'is-approved' : ''}`}>
      <input aria-label={`Select prompt ${prompt.text}`} type="checkbox" checked={selected} onChange={event => onSelect(prompt.id, event.target.checked)} />
      <div>
        {editing ? <textarea value={text} onChange={event => setText(event.target.value)} rows={3} /> : <button className="aiv-prompt__text" onClick={() => setEditing(true)}>{prompt.text}</button>}
        <div className="aiv-prompt__meta"><Badge>{prompt.category}</Badge><span>{prompt.funnelStage}</span><span>{prompt.priority} priority</span><span>{prompt.country} · {prompt.language}</span></div>
      </div>
      <div className="aiv-prompt__actions">
        {editing ? <><button className="aiv-icon-button" aria-label="Save prompt" onClick={save}><Check size={17} /></button><button className="aiv-icon-button" aria-label="Cancel edit" onClick={() => { setText(prompt.text); setEditing(false) }}><X size={17} /></button></> : <Badge tone={prompt.status === 'approved' ? 'good' : prompt.status === 'rejected' ? 'bad' : 'warning'}>{prompt.status}</Badge>}
      </div>
    </article>
  )
}

export function PromptsView({ prompts, onUpdate, onGenerate, generating, onOpenRun }) {
  const [selected, setSelected] = useState(new Set())
  const categories = [...new Set(prompts.map(prompt => prompt.category))]
  async function bulk(status) {
    await Promise.all([...selected].map(promptId => onUpdate(promptId, { status })))
    setSelected(new Set())
  }
  if (!prompts.length) return <EmptyMessage icon={MessageSquareText} title="No prompt candidates"><span>Generate prompts to create a reviewable set. Nothing runs until you approve it.</span><button className="aiv-button aiv-button--primary" onClick={onGenerate} disabled={generating}>{generating ? 'Generating…' : 'Generate prompts'}</button></EmptyMessage>
  return (
    <div className="aiv-stack aiv-enter">
      <div className="aiv-toolbar">
        <div><strong>{prompts.filter(prompt => prompt.status === 'approved').length} approved</strong><span>{prompts.length} total · {categories.length} categories</span></div>
        <div><button disabled={!selected.size} onClick={() => bulk('approved')}>Approve selected</button><button disabled={!selected.size} onClick={() => bulk('rejected')}>Reject selected</button><button className="aiv-button aiv-button--primary" disabled={!prompts.some(prompt => prompt.status === 'approved')} onClick={onOpenRun}>Configure run</button></div>
      </div>
      <div className="aiv-prompt-list">
        {prompts.map(prompt => <PromptRow key={prompt.id} prompt={prompt} selected={selected.has(prompt.id)} onSelect={(id, checked) => setSelected(current => { const next = new Set(current); checked ? next.add(id) : next.delete(id); return next })} onUpdate={onUpdate} />)}
      </div>
    </div>
  )
}

function highlightAnswer(text, names) {
  const escaped = names.filter(Boolean).sort((a, b) => b.length - a.length).map(name => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  if (!escaped.length) return text
  const matcher = new RegExp(`(${escaped.join('|')})`, 'gi')
  return text.split(matcher).map((part, index) => names.some(name => name.toLowerCase() === part.toLowerCase()) ? <mark key={`${part}-${index}`}>{part}</mark> : part)
}

function answerWithCitations(text, names, citations) {
  const markers = citations.filter(citation => Number.isFinite(citation.answerEndIndex) && citation.answerEndIndex > 0 && citation.answerEndIndex <= text.length)
    .sort((a, b) => a.answerEndIndex - b.answerEndIndex)
  if (!markers.length) return highlightAnswer(text, names)
  const output = []
  let cursor = 0
  markers.forEach((citation, index) => {
    output.push(<span key={`text-${index}`}>{highlightAnswer(text.slice(cursor, citation.answerEndIndex), names)}</span>)
    output.push(<sup className="aiv-citation-marker" title={citation.domain || citation.canonicalUrl} key={citation.id}>{index + 1}</sup>)
    cursor = citation.answerEndIndex
  })
  output.push(<span key="text-end">{highlightAnswer(text.slice(cursor), names)}</span>)
  return output
}

function AnswerCard({ response, competitors, brandName, expanded, onToggle }) {
  const analysis = response.analysis
  const names = [brandName, ...competitors.filter(item => item.confirmed).flatMap(item => [item.name, ...(item.aliases || [])])].filter(Boolean)
  return (
    <article className="aiv-answer-card">
      <header><span className={`aiv-engine-mark aiv-engine-mark--${response.engine}`}>{(ENGINE_LABELS[response.engine] || response.engine).slice(0, 1)}</span><div><strong>{ENGINE_LABELS[response.engine] || response.engine}</strong><small>{response.model}</small></div>{analysis && <Badge tone={analysis.brandMentioned ? 'good' : 'neutral'}>{analysis.brandMentioned ? 'Brand mentioned' : 'No brand mention'}</Badge>}</header>
      <div className={`aiv-answer-text ${expanded ? 'is-expanded' : ''}`}>{answerWithCitations(response.rawAnswer, names, response.citations || [])}</div>
      <footer><span>{response.citations?.length || 0} citations</span><span>{response.latencyMs ? `${(response.latencyMs / 1000).toFixed(1)}s` : 'Latency unavailable'}</span><button onClick={onToggle}>{expanded ? 'Collapse' : 'Read full answer'} <ChevronDown size={15} /></button></footer>
    </article>
  )
}

function AnswerComparison({ comparison, competitors, brandName, onSelect }) {
  return (
    <section className="aiv-panel">
      <div className="aiv-panel__heading"><div><p className="aiv-kicker">Same prompt, different models</p><h2>Answer comparison</h2></div><button className="aiv-link-button" onClick={onSelect}>Explore answers</button></div>
      <blockquote className="aiv-comparison-prompt">“{comparison.prompt.text}”</blockquote>
      <div className="aiv-answer-grid">{comparison.responses.map(response => <AnswerCard key={response.id} response={response} competitors={competitors} brandName={brandName} expanded={false} onToggle={onSelect} />)}</div>
    </section>
  )
}

export function AnswersView({ prompts, responses, competitors, brandName, selectedPromptId, onSelectPrompt }) {
  const firstPrompt = selectedPromptId || prompts.find(prompt => responses.some(response => response.promptId === prompt.id))?.id || ''
  const [expanded, setExpanded] = useState(new Set())
  const visible = responses.filter(response => !firstPrompt || response.promptId === firstPrompt)
  if (!responses.length) return <EmptyMessage icon={Bot} title="No provider answers yet">Complete a visibility run to compare unchanged provider answers here.</EmptyMessage>
  return (
    <div className="aiv-stack aiv-enter">
      <label className="aiv-field"><span>Prompt</span><select value={firstPrompt} onChange={event => onSelectPrompt(event.target.value)}>{prompts.filter(prompt => responses.some(response => response.promptId === prompt.id)).map(prompt => <option key={prompt.id} value={prompt.id}>{prompt.text}</option>)}</select></label>
      <div className="aiv-answer-grid">{visible.map(response => <AnswerCard key={response.id} response={response} competitors={competitors} brandName={brandName} expanded={expanded.has(response.id)} onToggle={() => setExpanded(current => { const next = new Set(current); next.has(response.id) ? next.delete(response.id) : next.add(response.id); return next })} />)}</div>
    </div>
  )
}

function CompetitorRow({ entity, onDecision }) {
  const [open, setOpen] = useState(false)
  const [relationship, setRelationship] = useState(entity.relationship || 'other')
  const [aliases, setAliases] = useState((entity.aliases || []).join(', '))
  const [domains, setDomains] = useState((entity.domains || []).join(', '))
  return (
    <article className="aiv-competitor">
      <button className="aiv-competitor__summary" onClick={() => setOpen(value => !value)}><span className="aiv-avatar">{entity.name.slice(0, 2).toUpperCase()}</span><div><strong>{entity.name}</strong><span>{entity.mentionCount} answers · {entity.source === 'project_input' ? 'Known competitor' : 'Detected in answer'}</span></div><Badge tone={statusTone(entity.decision)}>{entity.decision}</Badge><ChevronDown size={17} /></button>
      {open && <div className="aiv-competitor__form"><label>Relationship<select value={relationship} onChange={event => setRelationship(event.target.value)}><option value="direct_competitor">Direct competitor</option><option value="alternative">Alternative</option><option value="marketplace">Marketplace</option><option value="publisher">Publisher</option><option value="other">Other</option></select></label><label>Aliases<input value={aliases} onChange={event => setAliases(event.target.value)} placeholder="Comma separated" /></label><label>Domains<input value={domains} onChange={event => setDomains(event.target.value)} placeholder="example.com, example.org" /></label><div><button className="aiv-button aiv-button--secondary" onClick={() => onDecision(entity.id, 'reject', {})}>Reject</button><button className="aiv-button aiv-button--primary" onClick={() => onDecision(entity.id, 'confirm', { relationship, aliases: aliases.split(',').map(value => value.trim()).filter(Boolean), domains: domains.split(',').map(value => value.trim()).filter(Boolean) })}>Confirm</button></div></div>}
    </article>
  )
}

export function CompetitorsView({ competitors, onDecision }) {
  const [filter, setFilter] = useState('all')
  const visible = competitors.filter(item => filter === 'all' || item.decision === filter)
  if (!competitors.length) return <EmptyMessage title="No competitors detected">Competitors appear only after they occur verbatim in a provider answer.</EmptyMessage>
  return <div className="aiv-stack aiv-enter"><div className="aiv-filter-tabs">{['all', 'pending', 'confirmed', 'rejected'].map(item => <button key={item} className={filter === item ? 'is-active' : ''} onClick={() => setFilter(item)}>{item} <span>{competitors.filter(entity => item === 'all' || entity.decision === item).length}</span></button>)}</div><div className="aiv-competitor-list">{visible.map(entity => <CompetitorRow key={entity.id} entity={entity} onDecision={onDecision} />)}</div></div>
}

function groupCitationSources(citations, responses) {
  const responseMap = new Map(responses.map(response => [response.id, response]))
  const groups = new Map()
  for (const citation of citations) {
    const current = groups.get(citation.domain) || { domain: citation.domain || 'Unknown domain', count: 0, prompts: new Set(), engines: new Set(), types: new Set(), citations: [] }
    const response = responseMap.get(citation.responseId)
    current.count += 1
    if (response?.promptId) current.prompts.add(response.promptId)
    if (response?.engine) current.engines.add(response.engine)
    current.types.add(citation.sourceType || 'third_party')
    current.citations.push(citation)
    groups.set(current.domain, current)
  }
  return [...groups.values()].sort((a, b) => b.count - a.count)
}

export function CitationsView({ citations, responses }) {
  const [mode, setMode] = useState('sources')
  const [query, setQuery] = useState('')
  const sources = useMemo(() => groupCitationSources(citations, responses).filter(item => item.domain.toLowerCase().includes(query.toLowerCase())), [citations, query, responses])
  if (!citations.length) return <EmptyMessage icon={Globe2} title="No citations returned">The successful provider answers did not include normalized citations.</EmptyMessage>
  return (
    <div className="aiv-stack aiv-enter">
      <div className="aiv-toolbar"><div className="aiv-filter-tabs"><button className={mode === 'sources' ? 'is-active' : ''} onClick={() => setMode('sources')}>Sources</button><button className={mode === 'pages' ? 'is-active' : ''} onClick={() => setMode('pages')}>Pages</button></div><label className="aiv-search"><Search size={16} /><input aria-label="Search citation domains" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search domains" /></label></div>
      {mode === 'sources' ? <div className="aiv-table">{sources.map(source => <div className="aiv-table__row" key={source.domain}><Globe2 size={18} /><strong>{source.domain}</strong><span>{source.count} citations</span><span>{source.prompts.size} prompts</span><span>{[...source.engines].map(engine => ENGINE_LABELS[engine] || engine).join(', ')}</span><Badge tone={source.types.has('first_party') ? 'good' : source.types.has('competitor') ? 'warning' : 'neutral'}>{[...source.types].join(', ').replaceAll('_', ' ')}</Badge></div>)}</div> : <div className="aiv-table">{citations.filter(item => item.canonicalUrl.toLowerCase().includes(query.toLowerCase())).map(citation => <div className="aiv-table__row aiv-table__row--page" key={citation.id}><Globe2 size={18} /><a href={citation.canonicalUrl} target="_blank" rel="noreferrer">{citation.title || citation.canonicalUrl}<ExternalLink size={13} /></a><span>{citation.domain}</span><Badge tone={statusTone(citation.supportStatus)}>{citation.supportStatus.replaceAll('_', ' ')}</Badge></div>)}</div>}
    </div>
  )
}

export function WhyView({ rootCauses }) {
  if (!rootCauses.length) return <EmptyMessage icon={CheckCircle2} title="No diagnostic evidence yet">Evidence-backed root causes appear after analyzed provider answers are joined to the stored diagnostics.</EmptyMessage>
  return <div className="aiv-cause-list aiv-enter">{rootCauses.map(cause => <article key={cause.id}><div className="aiv-cause-list__head"><Badge tone={cause.severity === 'high' ? 'bad' : cause.severity === 'medium' ? 'warning' : 'neutral'}>{cause.severity}</Badge><span>{cause.pillar.replaceAll('_', ' ')}</span></div><h2>{cause.title}</h2><p>{cause.description}</p><blockquote>{cause.evidence?.exactText || cause.exactEvidence || 'No exact evidence text was stored.'}</blockquote><dl><div><dt>Source</dt><dd>{cause.evidence?.sourceOrigin || cause.provenance?.sourceOrigin || 'stored diagnostic'}</dd></div><div><dt>Evidence row</dt><dd>{cause.evidence?.sourceId || cause.sourceId || '—'}</dd></div><div><dt>Affected URL</dt><dd>{cause.affectedUrl || '—'}</dd></div></dl>{cause.link?.path && <Link className="aiv-button aiv-button--secondary" to={cause.link.path}>{cause.link.label || 'Inspect evidence'} <ExternalLink size={15} /></Link>}</article>)}</div>
}

export function HistoryView() {
  return <EmptyMessage icon={Clock} title="History is not available yet"><span>AI Visibility data is stored temporarily for up to 24 hours. Durable history, prior-period comparisons, and trend arrows require the planned persistent store.</span></EmptyMessage>
}

export function RunConfigModal({ open, prompts, engines, onClose, onStart }) {
  const approved = prompts.filter(prompt => prompt.status === 'approved')
  const available = engines.filter(engine => engine.available)
  const [selected, setSelected] = useState(() => new Set(available.map(engine => engine.id)))
  const [webSearchEnabled, setWebSearchEnabled] = useState(false)
  if (!open) return null
  const taskCount = approved.length * selected.size
  return (
    <div className="aiv-modal-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className="aiv-modal" role="dialog" aria-modal="true" aria-labelledby="aiv-run-title">
        <header><div><p className="aiv-kicker">Visibility run</p><h2 id="aiv-run-title">Configure provider checks</h2></div><button className="aiv-icon-button" aria-label="Close run configuration" onClick={onClose}><X size={19} /></button></header>
        <div className="aiv-modal__body">
          <div className="aiv-modal__section"><strong>Engines</strong>{engines.map(engine => <label className={!engine.available ? 'is-disabled' : ''} key={engine.id}><input type="checkbox" disabled={!engine.available} checked={selected.has(engine.id)} onChange={event => setSelected(current => { const next = new Set(current); event.target.checked ? next.add(engine.id) : next.delete(engine.id); return next })} /><span>{ENGINE_LABELS[engine.id] || engine.id}<small>{engine.available ? engine.model : engine.reason || 'Provider is not configured'}</small></span><Badge tone={engine.available ? 'good' : 'neutral'}>{engine.available ? 'Available' : 'Unavailable'}</Badge></label>)}</div>
          <label className="aiv-toggle"><span><strong>Web search</strong><small>Allow each selected provider to search the web when supported.</small></span><input type="checkbox" checked={webSearchEnabled} onChange={event => setWebSearchEnabled(event.target.checked)} /></label>
          <div className="aiv-task-summary"><span>{approved.length} approved prompts</span><X size={14} /><span>{selected.size} engines</span><strong>{taskCount} tasks</strong></div>
        </div>
        <footer><button className="aiv-button aiv-button--secondary" onClick={onClose}>Cancel</button><button className="aiv-button aiv-button--primary" disabled={!taskCount} onClick={() => onStart({ promptIds: approved.map(prompt => prompt.id), engines: [...selected], webSearchEnabled })}>Start {taskCount || ''} tasks</button></footer>
      </section>
    </div>
  )
}

export { EmptyMessage }
