import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, ExternalLink, Info, RefreshCw, Settings, X } from '../icons/heroicons'
import EvidenceExplorer from './EvidenceExplorer'
import SourceLogo from './SourceLogo'

const SOURCE_LABELS = { reddit: 'Reddit', news: 'News', x: 'X', youtube: 'YouTube', linkedin: 'LinkedIn', review: 'Review platforms' }

function useRunSections(run) {
  const [sections, setSections] = useState({})
  useEffect(() => {
    if (!run?.id) return undefined
    let cancelled = false
    const available = Object.entries(run.sectionStatuses || {}).filter(([, status]) => status.state === 'complete').map(([section]) => section)
    Promise.all(available.map(section => fetch(`/api/external-intelligence/runs/${run.id}/sections/${section}`).then(response => response.json()).then(payload => [section, payload.data])))
      .then(entries => { if (!cancelled) setSections(Object.fromEntries(entries)) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [run?.id, run?.updatedAt, run?.sectionStatuses])
  return sections
}

function EvidenceDrawer({ runId, focus, onClose }) {
  const [items, setItems] = useState([])
  useEffect(() => {
    if (!focus?.evidenceIds?.length) return undefined
    let cancelled = false
    const params = new URLSearchParams({ ids: focus.evidenceIds.join(','), pageSize: '4' })
    fetch(`/api/external-intelligence/runs/${runId}/evidence?${params}`)
      .then(response => response.json())
      .then(payload => { if (!cancelled) setItems(payload.items || []) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [focus, runId])
  if (!focus) return null
  return (
    <aside className="ei-evidence-drawer" aria-label={`Evidence for ${focus.label}`}>
      <div className="flex items-start justify-between gap-3"><div><small>Supporting evidence</small><h3>{focus.label}</h3></div><button type="button" aria-label="Close evidence drawer" onClick={onClose}><X size={16} /></button></div>
      <div className="mt-4 space-y-2">{items.map(item => <a key={item.id} href={item.url} target="_blank" rel="noreferrer"><span>{SOURCE_LABELS[item.sourceType]}</span><strong>{item.title}</strong><ExternalLink size={13} /></a>)}</div>
      <button type="button" className="ei-secondary-button mt-4 w-full" onClick={() => document.getElementById('evidence-explorer')?.scrollIntoView({ behavior: 'smooth' })}>View all filtered evidence</button>
    </aside>
  )
}

function MetricDialog({ metric, onClose }) {
  if (!metric) return null
  return (
    <div className="ei-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <section className="ei-modal" role="dialog" aria-modal="true" aria-labelledby="metric-dialog-title">
        <div className="flex items-start justify-between gap-4"><div><p className="ei-eyebrow">Dimension details</p><h2 id="metric-dialog-title">{metric.label}</h2></div><button type="button" aria-label="Close" onClick={onClose}><X size={18} /></button></div>
        <div className="ei-metric-dialog-status"><strong>{metric.status}</strong><span>{metric.confidence} confidence</span></div>
        <p>{metric.rationale}</p>
        <dl><div><dt>Analyzed items</dt><dd>{metric.analyzedItems}</dd></div><div><dt>Contributing sources</dt><dd>{metric.contributingSources?.join(', ') || 'None'}</dd></div>{metric.classifiedItems !== undefined && <div><dt>Sentiment-confident</dt><dd>{metric.classifiedItems}</dd></div>}</dl>
        {metric.distribution && <div className="ei-distribution">{Object.entries(metric.distribution).map(([label, value]) => <div key={label}><span className="capitalize">{label}</span><strong>{value}%</strong></div>)}</div>}
        <ul>{metric.gates?.map(gate => <li key={gate}>{gate}</li>)}</ul>
      </section>
    </div>
  )
}

function SourceManager({ run, capabilities, onClose, onApply }) {
  const [draft, setDraft] = useState(run.configuration.sources)
  const [dateMode, setDateMode] = useState(run.configuration.dateMode || 'automatic')
  const [from, setFrom] = useState(run.configuration.requestedRange?.from || '')
  const [to, setTo] = useState(run.configuration.requestedRange?.to || '')
  const [applying, setApplying] = useState(false)
  const sources = capabilities?.sources || []
  const toggle = source => setDraft(current => current.includes(source) ? current.filter(value => value !== source) : [...current, source])
  return (
    <div className="ei-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <section className="ei-modal" role="dialog" aria-modal="true" aria-labelledby="sources-dialog-title">
        <div className="flex items-start justify-between gap-4"><div><p className="ei-eyebrow">Run configuration</p><h2 id="sources-dialog-title">Manage Sources</h2><p>Changes remain a draft until you start a replacement analysis.</p></div><button type="button" aria-label="Close" onClick={onClose}><X size={18} /></button></div>
        <div className="ei-source-options">
          {sources.map(source => <label key={source.sourceType} className={!source.available ? 'is-disabled' : ''}><input type="checkbox" checked={draft.includes(source.sourceType)} disabled={!source.available} onChange={() => toggle(source.sourceType)} /><SourceLogo sourceType={source.sourceType} /><span><strong>{SOURCE_LABELS[source.sourceType] || source.sourceType}</strong><small>{source.available ? 'Available' : source.state === 'not_supported' ? 'Planned' : source.reason}</small></span></label>)}
        </div>
        <div className="ei-date-options"><label><span>Date mode</span><select value={dateMode} onChange={event => setDateMode(event.target.value)}><option value="automatic">Adaptive recent evidence</option><option value="manual">Manual range</option></select></label>{dateMode === 'manual' && <><label><span>From</span><input required type="date" value={from} onChange={event => setFrom(event.target.value)} /></label><label><span>To</span><input required type="date" value={to} onChange={event => setTo(event.target.value)} /></label></>}</div>
        <div className="flex justify-end gap-2"><button type="button" className="ei-secondary-button" onClick={onClose}>Cancel</button><button type="button" className="ei-primary-button" disabled={!draft.length || applying || (dateMode === 'manual' && (!from || !to))} onClick={async () => { setApplying(true); try { await onApply({ sources: draft, dateMode, requestedRange: dateMode === 'manual' ? { from, to } : null }) } finally { setApplying(false) } }}>{applying ? 'Starting…' : 'Apply and start new analysis'}</button></div>
      </section>
    </div>
  )
}

function EntityCorrection({ run, onClose, onReplacement }) {
  const [name, setName] = useState(run.entity.name)
  const [canonicalUrl, setCanonicalUrl] = useState(run.entity.canonicalUrl)
  const [error, setError] = useState('')
  return (
    <div className="ei-modal-backdrop" role="presentation">
      <form className="ei-modal" role="dialog" aria-modal="true" aria-labelledby="entity-dialog-title" onSubmit={async event => {
        event.preventDefault(); setError('')
        const response = await fetch(`/api/external-intelligence/runs/${run.id}/entity-decision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision: 'correct', entity: { name, canonicalUrl } }) })
        const payload = await response.json()
        if (!response.ok) return setError(payload.error || 'Could not correct the entity.')
        onReplacement(payload.runId)
      }}>
        <div className="flex items-start justify-between gap-4"><div><p className="ei-eyebrow">Correct entity</p><h2 id="entity-dialog-title">Who should this evidence represent?</h2><p>The corrected identity starts a new external-only run.</p></div><button type="button" aria-label="Close" onClick={onClose}><X size={18} /></button></div>
        <label className="ei-field"><span>Entity name</span><input required value={name} onChange={event => setName(event.target.value)} maxLength={120} /></label>
        <label className="ei-field"><span>Official canonical URL</span><input required type="url" value={canonicalUrl} onChange={event => setCanonicalUrl(event.target.value)} /></label>
        {error && <p className="ei-inline-error">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" className="ei-secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="ei-primary-button">Correct and start new analysis</button></div>
      </form>
    </div>
  )
}

function FindingList({ title, items, empty, onEvidence }) {
  return <div><h4>{title}</h4>{items?.length ? <ul>{items.map(item => <li key={item.id}><span>{item.statement || item.label}</span><button type="button" onClick={() => onEvidence(item.statement || item.label, item.evidenceIds)}>View evidence · {item.evidenceIds?.length || 0}</button></li>)}</ul> : <p className="ei-section-empty">{empty}</p>}</div>
}

export default function ExternalResults({ run, replacementRun, capabilities, onCreateRun, onLoadRun, onSetError }) {
  const sections = useRunSections(run)
  const [metric, setMetric] = useState(null)
  const [manageSources, setManageSources] = useState(false)
  const [correctEntity, setCorrectEntity] = useState(false)
  const [evidenceFocus, setEvidenceFocus] = useState(null)
  const summaryClaims = sections.summary?.claims || []
  const associations = sections.associations?.items || []
  const themes = sections.themes?.items || []
  const risks = sections.risks?.items || []
  const issues = sections.issues || []
  const opportunities = sections.opportunities || []
  const replacementActive = replacementRun && replacementRun.id !== run.id && !['completed', 'completed_degraded', 'failed', 'superseded'].includes(replacementRun.status)
  const replacementFailed = replacementRun && replacementRun.id !== run.id && replacementRun.status === 'failed'

  const viewEvidence = (label, evidenceIds) => {
    setEvidenceFocus({ label, evidenceIds: evidenceIds || [] })
  }
  const retrySection = async section => {
    const response = await fetch(`/api/external-intelligence/runs/${run.id}/intelligence-retries`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sections: [section] }) })
    const payload = await response.json()
    if (!response.ok) onSetError(payload.error || 'Could not retry the intelligence section.')
    else onLoadRun(run.id)
  }

  return (
    <div className="ei-results">
      {replacementActive && <div className="ei-replacement-banner"><RefreshCw size={16} className="ei-spin" /><span>A replacement analysis is running. The previous completed result remains visible until new evidence is usable.</span></div>}
      {replacementFailed && <div className="ei-replacement-banner is-failed"><AlertTriangle size={16} /><span>The replacement analysis failed. The previous completed result remains visible.</span></div>}

      <section className="ei-report-card ei-entity-signals">
        <div className="ei-entity-profile">
          <div className="ei-entity-logo">{run.entity?.name?.slice(0, 1)?.toUpperCase()}</div>
          <div className="min-w-0"><p className="ei-eyebrow">Entity Profile</p><h2>{run.entity?.name}</h2><a href={run.entity?.canonicalUrl} target="_blank" rel="noreferrer">{run.entity?.domain} <ExternalLink size={13} /></a><p>{run.entity?.description || 'No source-backed entity description was available.'}</p></div>
          <dl><div><dt>Entity type</dt><dd>{run.entity?.entityType}</dd></div><div><dt>Primary category</dt><dd>{run.entity?.primaryCategory}</dd></div><div><dt>Entity confidence</dt><dd>{run.entity?.confidence}%</dd></div></dl>
          <div className="ei-entity-confirm">{run.entityConfirmedAt ? <><CheckCircle2 size={15} /><span>Entity confirmed</span></> : <><span>We identified this website as {run.entity?.name}. Is this correct?</span><button type="button" onClick={async () => { const response = await fetch(`/api/external-intelligence/runs/${run.id}/entity-decision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision: 'confirm' }) }); if (response.ok) onLoadRun(run.id) }}>Yes</button><button type="button" onClick={() => setCorrectEntity(true)}>No</button></>}</div>
        </div>
        <div className="ei-signal-summary"><div className="ei-card-heading"><div><h3>External Signal Summary</h3><p>Four separate dimensions; no overall score.</p></div></div><div className="ei-signal-grid">{run.dimensions?.map(dimension => <button type="button" key={dimension.id} onClick={() => setMetric(dimension)}><Info size={15} /><span>{dimension.label}<strong>{dimension.status}</strong><small>{dimension.confidence} confidence</small></span></button>)}</div></div>
      </section>

      <section className="ei-report-card">
        <div className="ei-card-heading"><div><h3>Internet Intelligence Summary</h3><p>Structured findings generated from retained evidence.</p></div></div>
        <div className="ei-summary-grid">
          <FindingList title="Dominant associations" items={summaryClaims.filter(item => item.category === 'association')} empty="No association claims available." onEvidence={viewEvidence} />
          <FindingList title="Reputation strengths" items={summaryClaims.filter(item => item.category === 'strength')} empty="No supported strengths available." onEvidence={viewEvidence} />
          <FindingList title="Reputation risks" items={risks} empty="No supported risks available." onEvidence={viewEvidence} />
          <FindingList title="Entity gaps & conflicts" items={summaryClaims.filter(item => ['entity-conflict', 'coverage-gap'].includes(item.category))} empty="No supported gaps available." onEvidence={viewEvidence} />
        </div>
        {run.sectionStatuses?.summary?.state === 'failed' && <button type="button" className="ei-retry-section" onClick={() => retrySection('summary')}>Retry summary · {run.sectionStatuses.summary.reason}</button>}
        {run.sectionStatuses?.risks?.state === 'failed' && <button type="button" className="ei-retry-section" onClick={() => retrySection('risks')}>Retry risks · {run.sectionStatuses.risks.reason}</button>}
      </section>

      <section className="ei-report-card">
        <div className="ei-card-heading"><div><h3>Source Coverage</h3><p>Found, relevant, clustered, and retained counts remain separate.</p></div><button type="button" className="ei-secondary-button" onClick={() => setManageSources(true)}><Settings size={15} /> Manage Sources</button></div>
        <div className="ei-source-grid">{(capabilities?.sources || []).map(capability => {
          const source = run.sourceSummaries?.find(item => item.sourceType === capability.sourceType)
          return <article key={capability.sourceType} className={`is-${source?.state || capability.state}`}><div className="flex items-start justify-between gap-2"><div className="flex min-w-0 items-center gap-2.5"><SourceLogo sourceType={capability.sourceType} /><h4>{SOURCE_LABELS[capability.sourceType]}</h4></div>{source?.state === 'complete' || source?.state === 'complete_empty' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}</div><strong>{source ? `${source.counts?.retained || 0} retained` : capability.state === 'not_supported' ? 'Planned' : 'Not enabled'}</strong><p>{source?.reason || (source?.state === 'complete_empty' ? 'Successfully searched; no relevant items found.' : source ? `${source.counts?.found || 0} found · ${source.counts?.relevant || 0} relevant · ${source.counts?.clustered || 0} clustered` : capability.reason)}</p><small>{source?.actualRange ? `${source.actualRange.from} to ${source.actualRange.to}` : source?.state?.replaceAll('_', ' ') || capability.state.replaceAll('_', ' ')}</small></article>
        })}</div>
      </section>

      <div className="ei-two-column">
        <section className="ei-report-card"><div className="ei-card-heading"><div><h3>Entity Associations</h3><p>Grouped as core, emerging, or risk associations.</p></div></div><div className="ei-table-list">{associations.map(item => <button type="button" key={item.id} onClick={() => viewEvidence(item.label, item.evidenceIds)}><span><strong>{item.label}</strong><small>{item.group} · {item.confidence} confidence</small></span><span>{item.strength}<small>{item.evidenceIds.length} items</small></span></button>)}</div>{run.sectionStatuses?.associations?.state === 'failed' && <button type="button" className="ei-retry-section" onClick={() => retrySection('associations')}>Retry associations</button>}</section>
        <section className="ei-report-card"><div className="ei-card-heading"><div><h3>Conversation Themes</h3><p>Current period vs previous period—not persistent history.</p></div></div><div className="ei-table-list">{themes.map(item => <button type="button" key={item.id} onClick={() => viewEvidence(item.label, item.evidenceIds)}><span><strong>{item.label}</strong><small>{item.sentiment} sentiment · {item.confidence} confidence</small></span><span className="capitalize">{item.comparison}<small>{item.evidenceIds.length} items</small></span></button>)}</div>{run.sectionStatuses?.themes?.state === 'failed' && <button type="button" className="ei-retry-section" onClick={() => retrySection('themes')}>Retry themes</button>}</section>
      </div>

      <EvidenceExplorer runId={run.id} themes={themes.map(theme => theme.label)} focus={evidenceFocus} onClearFocus={() => setEvidenceFocus(null)} />

      <section className="ei-report-card">
        <div className="ei-card-heading"><div><h3>Issues & Opportunities</h3><p>Actionable findings connected to evidence and confidence.</p></div></div>
        <div className="ei-issues-table">{issues.map(issue => {
          const opportunity = opportunities.find(item => item.basedOnIssueId === issue.id)
          return <article key={issue.id}><span className={`ei-severity is-${issue.severity}`}>{issue.severity}</span><div><h4>{issue.finding}</h4><p><strong>Impact:</strong> {issue.impact}</p><p><strong>Recommendation:</strong> {opportunity?.statement || issue.recommendation}</p></div><div><span>{issue.confidence} confidence</span><button type="button" onClick={() => viewEvidence(issue.finding, issue.evidenceIds)} disabled={!issue.evidenceIds?.length}>View evidence · {issue.evidenceIds?.length || 0}</button></div></article>
        })}</div>
      </section>

      <p className="ei-temporary-note">Temporary analysis results are available for up to 24 hours. They are stored by one API process and are not monitoring history.</p>
      <EvidenceDrawer runId={run.id} focus={evidenceFocus} onClose={() => setEvidenceFocus(null)} />
      <MetricDialog metric={metric} onClose={() => setMetric(null)} />
      {manageSources && <SourceManager run={run} capabilities={capabilities} onClose={() => setManageSources(false)} onApply={async configuration => { const replacement = await onCreateRun({ url: run.configuration.url, ...configuration, basedOnRunId: run.id }); setManageSources(false); return replacement }} />}
      {correctEntity && <EntityCorrection run={run} onClose={() => setCorrectEntity(false)} onReplacement={async runId => { setCorrectEntity(false); await onLoadRun(runId) }} />}
    </div>
  )
}
