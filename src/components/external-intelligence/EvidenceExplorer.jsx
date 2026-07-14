import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Search, X } from '../icons/heroicons'

export default function EvidenceExplorer({ runId, themes = [], focus, onClearFocus }) {
  const [source, setSource] = useState('')
  const [sentiment, setSentiment] = useState('')
  const [theme, setTheme] = useState('')
  const [dateDays, setDateDays] = useState('')
  const [minRelevance, setMinRelevance] = useState('')
  const [minAuthority, setMinAuthority] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [payload, setPayload] = useState({ items: [], total: 0 })
  const focusIds = useMemo(() => focus?.evidenceIds || [], [focus])

  useEffect(() => {
    if (!runId) return undefined
    let cancelled = false
    const params = new URLSearchParams({ page: String(focusIds.length ? 1 : page), pageSize: '12' })
    if (source) params.set('source', source)
    if (sentiment) params.set('sentiment', sentiment)
    if (theme) params.set('theme', theme)
    if (dateDays) params.set('from', new Date(Date.now() - Number(dateDays) * 86400000).toISOString())
    if (minRelevance) params.set('minRelevance', minRelevance)
    if (minAuthority) params.set('minAuthority', minAuthority)
    if (search) params.set('search', search)
    if (focusIds.length) params.set('ids', focusIds.join(','))
    fetch(`/api/external-intelligence/runs/${runId}/evidence?${params}`)
      .then(response => response.json().then(data => response.ok ? data : Promise.reject(new Error(data.error))))
      .then(data => { if (!cancelled) setPayload(data) })
      .catch(() => { if (!cancelled) setPayload({ items: [], total: 0 }) })
    return () => { cancelled = true }
  }, [dateDays, focusIds, minAuthority, minRelevance, page, runId, search, sentiment, source, theme])

  const pages = Math.max(1, Math.ceil(payload.total / 12))
  return (
    <section className="ei-report-card" id="evidence-explorer">
      <div className="ei-card-heading ei-card-heading-wrap">
        <div><h3>Evidence Explorer</h3><p>Inspect normalized source records and their audit provenance.</p></div>
        <div className="ei-source-tabs" role="tablist" aria-label="Evidence sources">{['', 'reddit', 'news', 'x', 'youtube'].map(value => <button type="button" role="tab" aria-selected={source === value} key={value || 'all'} onClick={() => { setSource(value); setPage(1) }}>{value ? value === 'x' ? 'X' : value : 'All sources'}</button>)}</div>
        <div className="ei-filter-row">
          <select aria-label="Evidence sentiment" value={sentiment} onChange={event => { setSentiment(event.target.value); setPage(1) }}><option value="">All sentiment</option><option value="positive">Positive</option><option value="neutral">Neutral</option><option value="mixed">Mixed</option><option value="negative">Negative</option><option value="unknown">Unknown</option></select>
          <select aria-label="Evidence theme" value={theme} onChange={event => { setTheme(event.target.value); setPage(1) }}><option value="">All themes</option>{themes.map(value => <option key={value} value={value}>{value}</option>)}</select>
          <select aria-label="Evidence date" value={dateDays} onChange={event => { setDateDays(event.target.value); setPage(1) }}><option value="">Actual collected range</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select>
          <select aria-label="Minimum relevance" value={minRelevance} onChange={event => { setMinRelevance(event.target.value); setPage(1) }}><option value="">All relevance</option><option value="50">50%+ relevance</option><option value="75">75%+ relevance</option></select>
          <select aria-label="Minimum authority" value={minAuthority} onChange={event => { setMinAuthority(event.target.value); setPage(1) }}><option value="">All authority</option><option value="50">50%+ authority</option><option value="70">70%+ authority</option></select>
          <label className="ei-search"><Search size={14} /><input value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} placeholder="Search evidence" aria-label="Search evidence" /></label>
        </div>
      </div>
      {focus && <div className="ei-focus-bar"><span>Filtered for: <strong>{focus.label}</strong> · {focusIds.length} supporting items</span><button type="button" onClick={onClearFocus}><X size={14} /> Clear</button></div>}
      <div className="ei-evidence-grid">
        {payload.items.map(item => (
          <article key={item.id} className="ei-evidence-card">
            <div className="flex items-center justify-between gap-3"><span className="ei-source-pill">{item.sourceType === 'x' ? 'X' : item.sourceType}</span><time>{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : 'Date unavailable'}</time></div>
            <div><small>{item.sourceName}</small><h4>{item.title || 'Untitled evidence'}</h4><p>{item.snippet || item.relevanceReason}</p></div>
            <div className="ei-evidence-meta"><span>{item.sentiment}</span><span>{item.relevanceScore}% relevant</span><span>{item.authorityScore}% authority</span></div>
            <details><summary>Why this was included</summary><p>{item.relevanceReason}</p><dl><div><dt>Collector</dt><dd>{item.provenance?.collector}</dd></div><div><dt>Collected</dt><dd>{item.provenance?.collectedAt ? new Date(item.provenance.collectedAt).toLocaleString() : 'Unknown'}</dd></div><div><dt>Content hash</dt><dd>{item.provenance?.contentHash?.slice(0, 16)}</dd></div></dl></details>
            {item.relatedEvidence?.length > 0 && <details><summary>{item.relatedEvidence.length} related publications</summary>{item.relatedEvidence.map(related => <a key={related.id} href={related.url} target="_blank" rel="noreferrer">{related.sourceName}</a>)}</details>}
            {item.url && <a className="ei-evidence-link" href={item.url} target="_blank" rel="noreferrer">Open source <ExternalLink size={14} /></a>}
          </article>
        ))}
        {!payload.items.length && <div className="ei-empty-results">No evidence matches the current filters.</div>}
      </div>
      <div className="ei-pagination"><button type="button" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {page} of {pages} · {payload.total} items</span><button type="button" disabled={page >= pages} onClick={() => setPage(value => value + 1)}>Next</button></div>
    </section>
  )
}
