import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, Check, ExternalLink, Network, Search } from '../icons/heroicons'
import { buildDiscoveryExplorerModel, buildLocalGraph, filterDiscoveryRecords } from './utils/discoveryExplorer'

const FILTERS = [
  ['blocked', 'Blocked'],
  ['no-links', 'No inspected internal links'],
  ['noindex', 'Noindex'],
  ['redirected', 'Redirected'],
  ['errors', 'Errors'],
  ['in-sitemap', 'In sitemap']
]

const statusTone = {
  indexable: 'border-[var(--accent-teal)]/25 bg-[var(--accent-teal)]/10 text-[var(--accent-teal)]',
  noindex: 'border-[var(--accent-amber)]/25 bg-[var(--accent-amber)]/10 text-amber-200',
  blocked: 'border-[var(--accent-red)]/25 bg-[var(--accent-red)]/10 text-rose-200',
  error: 'border-[var(--accent-red)]/25 bg-[var(--accent-red)]/10 text-rose-200',
  redirect: 'border-[var(--accent-blue)]/25 bg-[var(--accent-blue)]/10 text-blue-200',
  unverified: 'border-white/10 bg-white/[.035] text-[var(--text-secondary)]'
}

export default function DiscoveryExplorer({ crawlerData }) {
  const model = useMemo(() => buildDiscoveryExplorerModel(crawlerData), [crawlerData])
  const [group, setGroup] = useState('home')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState([])
  const [visible, setVisible] = useState(50)
  const [selectedUrl, setSelectedUrl] = useState('')
  const selected = model.records.find(record => record.url === selectedUrl) || null
  const filtered = useMemo(() => filterDiscoveryRecords(model.records, { group, query, filters }), [model.records, group, query, filters])
  const localGraph = useMemo(() => buildLocalGraph(model, selectedUrl), [model, selectedUrl])

  const selectGroup = next => {
    setGroup(next)
    setSelectedUrl('')
    setVisible(50)
  }
  const toggleFilter = id => {
    setFilters(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])
    setVisible(50)
  }

  return (
    <section className="flex h-[680px] min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]" aria-labelledby="discovery-explorer-title">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
        <div className="min-w-0">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[.14em] text-[var(--accent-blue)]">Investigation workspace</p>
          <h2 id="discovery-explorer-title" className="mt-2 text-base font-bold tracking-[-.01em] text-[var(--text)]">5. Discovery Explorer</h2>
          <p className="mt-1 max-w-2xl text-[13px] leading-5 text-[var(--text-secondary)]">Trace why a page is or is not discoverable without rendering the entire website as a network.</p>
        </div>
        <SamplingBadge sampling={model.sampling} />
      </header>

      <div className="grid grid-cols-5 border-b border-[var(--border)] bg-[var(--bg-darker)]/45" aria-label="Discovery groups">
        {model.groups.map(item => (
          <button key={item.id} type="button" aria-pressed={group === item.id} onClick={() => selectGroup(item.id)} className={`group min-w-0 border-r border-[var(--border)] px-3 py-4 text-left transition last:border-r-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-blue)] ${group === item.id ? 'bg-[var(--panel-raised)] text-[var(--text)]' : 'text-[var(--text-secondary)] hover:bg-white/[.025]'}`}>
            <span className="block truncate text-[11px] font-semibold uppercase tracking-[.08em]">{item.label}</span>
            <span className="mt-2 flex items-baseline gap-2"><strong className="text-xl font-semibold tabular-nums text-[var(--text)]">{item.count.toLocaleString()}</strong><small className="text-[11px] text-[var(--text-secondary)]">{item.inspected} inspected</small></span>
            <span className="mt-2 flex gap-1" aria-label={`${item.healthy} healthy, ${item.attention} need attention, ${item.blocked} blocked or errors`}><i className="h-1 flex-1 rounded-full bg-[var(--accent-teal)]" style={{ opacity: item.healthy ? 1 : .16 }} /><i className="h-1 flex-1 rounded-full bg-[var(--accent-amber)]" style={{ opacity: item.attention ? 1 : .16 }} /><i className="h-1 flex-1 rounded-full bg-[var(--accent-red)]" style={{ opacity: item.blocked ? 1 : .16 }} /></span>
          </button>
        ))}
      </div>

      <div className="border-b border-[var(--border)] px-5 py-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <label className="relative min-w-0 flex-1"><span className="sr-only">Search discovered pages</span><Search size={18} className="absolute left-3 top-3 text-[var(--text-secondary)]"/><input value={query} onChange={event => { setQuery(event.target.value); setVisible(50) }} placeholder="Search paths or URLs" className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-darker)] pl-10 pr-3 text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent-blue)]/50 focus:ring-2 focus:ring-[var(--accent-blue)]/10"/></label>
          <div className="flex flex-wrap gap-2">{FILTERS.map(([id, label]) => <button key={id} type="button" aria-pressed={filters.includes(id)} onClick={() => toggleFilter(id)} className={`min-h-10 rounded-lg border px-3 text-[11px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-blue)] ${filters.includes(id) ? 'border-[var(--accent-blue)]/35 bg-[var(--accent-blue)]/12 text-blue-100' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-white/20 hover:text-[var(--text)]'}`}>{label}</button>)}</div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 min-[1440px]:grid-cols-[minmax(360px,.82fr)_minmax(0,1.18fr)]">
        <div className={`${selected ? 'hidden min-[1440px]:flex' : 'flex'} min-h-0 min-w-0 flex-col border-r-0 border-[var(--border)] min-[1440px]:border-r`}>
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3 text-[11px] text-[var(--text-secondary)]"><span><strong className="text-[var(--text)]">{filtered.length.toLocaleString()}</strong> matching pages</span><span>{Math.min(visible, filtered.length).toLocaleString()} shown</span></div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {filtered.slice(0, visible).map(record => <PageRow key={record.url} record={record} selected={record.url === selectedUrl} onSelect={() => setSelectedUrl(record.url)} />)}
            {!filtered.length && <EmptyResults />}
          </div>
          {visible < filtered.length && <div className="border-t border-[var(--border)] p-3"><button type="button" onClick={() => setVisible(value => value + 50)} className="min-h-10 w-full rounded-lg border border-[var(--border)] text-[12px] font-semibold text-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/[.06]">Load 50 more</button></div>}
        </div>

        <div className={`${selected ? 'flex' : 'hidden min-[1440px]:flex'} min-h-0 min-w-0 flex-col`}>
          {selected ? <DetailsPanel record={selected} graph={localGraph} onBack={() => setSelectedUrl('')} onSelect={setSelectedUrl}/> : <SelectPrompt />}
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--bg-darker)]/35 px-5 py-3 text-[11px] text-[var(--text-secondary)]"><span>{model.sampling.inspected.toLocaleString()} records inspected from {model.sampling.returned.toLocaleString()} returned.</span><span>Relationships reflect inspected internal links only.</span></footer>
    </section>
  )
}

function SamplingBadge({ sampling }) {
  const label = sampling.responseCapped ? 'Response capped' : sampling.sampled ? 'Sampled evidence' : 'Returned inventory'
  return <span className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-[11px] font-semibold ${sampling.sampled ? 'border-[var(--accent-amber)]/25 bg-[var(--accent-amber)]/10 text-amber-100' : 'border-[var(--accent-teal)]/20 bg-[var(--accent-teal)]/8 text-emerald-100'}`}><span className={`size-2 rounded-full ${sampling.sampled ? 'bg-[var(--accent-amber)]' : 'bg-[var(--accent-teal)]'}`}/>{label}: {sampling.returned.toLocaleString()} of {sampling.total.toLocaleString()}</span>
}

function PageRow({ record, selected, onSelect }) {
  return <button type="button" onClick={onSelect} className={`grid w-full grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-[var(--border)] px-5 py-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--accent-blue)] ${selected ? 'bg-[var(--accent-blue)]/[.07]' : 'hover:bg-white/[.022]'}`}>
    <span className="min-w-0"><strong className="block break-all text-[13px] font-semibold text-[var(--text)]">{record.path}</strong><span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--text-secondary)]"><span>{record.inSitemap ? 'In sitemap' : 'Not in returned sitemap'}</span><span>{record.linkEvidenceInspected ? `${record.incoming.length} inspected inbound` : 'Link evidence not inspected'}</span>{record.issues.length > 0 && <span className="inline-flex items-center gap-1 text-amber-200"><AlertTriangle size={14}/>{record.issues.length} issue{record.issues.length === 1 ? '' : 's'}</span>}</span></span>
    <span className="flex items-center gap-2"><Status status={record.status}/><ArrowRight size={16} className="text-[var(--text-secondary)]"/></span>
  </button>
}

function DetailsPanel({ record, graph, onBack, onSelect }) {
  return <div className="flex min-h-0 flex-1 flex-col">
    <header className="border-b border-[var(--border)] px-5 py-4"><button type="button" onClick={onBack} className="mb-3 inline-flex min-h-10 items-center gap-2 text-[12px] font-semibold text-[var(--accent-blue)] min-[1440px]:hidden"><ArrowRight size={16} className="rotate-180"/>Back to pages</button><div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="break-all text-[15px] font-semibold leading-6 text-[var(--text)]">{record.path}</p><a href={record.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex max-w-full items-center gap-2 break-all text-[12px] leading-5 text-[var(--accent-blue)]">{record.url}<ExternalLink size={15} className="shrink-0"/></a></div><Status status={record.status}/></div></header>
    <div className="min-h-0 flex-1 overflow-y-auto p-5">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4"><Evidence label="Crawl status" value={record.inspected ? record.status : 'Not inspected'} /><Evidence label="In sitemap" value={record.inSitemap ? 'Yes' : 'No'} /><Evidence label="Robots status" value={record.robotsAccess || 'Unknown'} /><Evidence label="HTTP status" value={record.httpStatus || 'Not inspected'} /><Evidence label="Canonical" value={record.canonical || 'Not declared'} wide /><Evidence label="noindex" value={record.inspected ? record.noindex ? 'Yes' : 'No' : 'Not inspected'} /><Evidence label="Redirect destination" value={record.redirected ? record.finalUrl : 'No inspected redirect'} wide /></dl>
      <RelationshipList title="Linked from" items={record.incoming} inspected={record.linkEvidenceInspected} onSelect={onSelect}/>
      <RelationshipList title="Links to" items={record.outgoing} inspected={record.linkEvidenceInspected} onSelect={onSelect}/>
      <LocalGraph graph={graph} selected={record} onSelect={onSelect}/>
      <IssueList issues={record.issues}/>
    </div>
  </div>
}

function Evidence({ label, value, wide }) { return <div className={wide ? 'col-span-2 min-w-0' : 'min-w-0'}><dt className="text-[11px] font-semibold uppercase tracking-[.07em] text-[var(--text-secondary)]">{label}</dt><dd className="mt-1 break-all text-[13px] leading-5 text-[var(--text)]">{String(value)}</dd></div> }

function RelationshipList({ title, items, inspected, onSelect }) {
  return <section className="mt-6 border-t border-[var(--border)] pt-5"><h3 className="text-[12px] font-bold uppercase tracking-[.08em] text-[var(--text)]">{title} <span className="ml-1 font-normal text-[var(--text-secondary)]">{inspected ? items.length : '—'}</span></h3>{!inspected ? <p className="mt-2 text-[13px] text-[var(--text-secondary)]">Link evidence not inspected for this page.</p> : items.length ? <div className="mt-3 grid gap-2">{items.slice(0, 8).map(url => <button type="button" key={url} onClick={() => onSelect(url)} className="flex min-h-10 min-w-0 items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 text-left text-[12px] text-[var(--text-secondary)] hover:border-[var(--accent-blue)]/30 hover:text-[var(--text)]"><span className="truncate">{displayPath(url)}</span><ArrowRight size={15} className="shrink-0"/></button>)}</div> : <p className="mt-2 text-[13px] text-[var(--text-secondary)]">No inspected relationships found.</p>}</section>
}

function LocalGraph({ graph, selected, onSelect }) {
  if (!graph.available) return null
  const neighbors = graph.nodes.filter(node => node.url !== selected.url)
  return <section className="mt-6 border-t border-[var(--border)] pt-5"><div className="flex items-center justify-between gap-3"><h3 className="text-[12px] font-bold uppercase tracking-[.08em] text-[var(--text)]">Local relationship map</h3>{graph.hiddenCount > 0 && <span className="text-[11px] text-[var(--text-secondary)]">+{graph.hiddenCount} more</span>}</div><svg viewBox="0 0 640 220" className="mt-3 h-[220px] w-full rounded-xl border border-[var(--border)] bg-[var(--bg-darker)]" role="img" aria-label="Selected page and its immediate inspected neighbors">{neighbors.map((node, index) => { const point = graphPoint(index, neighbors.length); return <g key={`edge-${node.url}`}><line x1="320" y1="110" x2={point.x} y2={point.y} stroke="var(--border-strong)" strokeWidth="1.5"/></g> })}<circle cx="320" cy="110" r="13" fill="var(--accent-blue)"/><text x="320" y="142" fill="var(--text)" textAnchor="middle" fontSize="12" fontWeight="600">Selected page</text>{neighbors.map((node, index) => { const point = graphPoint(index, neighbors.length); return <g key={node.url} role="button" tabIndex="0" onClick={() => onSelect(node.url)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') onSelect(node.url) }} className="cursor-pointer outline-none"><circle cx={point.x} cy={point.y} r="9" fill={node.health === 'blocked' ? 'var(--accent-red)' : node.health === 'healthy' ? 'var(--accent-teal)' : 'var(--accent-amber)'}/><text x={point.x} y={point.y + (point.y < 110 ? -14 : 24)} fill="var(--text-secondary)" textAnchor="middle" fontSize="10">{truncate(displayPath(node.url), 24)}</text></g> })}</svg></section>
}

function IssueList({ issues }) { return <section className="mt-6 border-t border-[var(--border)] pt-5"><h3 className="text-[12px] font-bold uppercase tracking-[.08em] text-[var(--text)]">Detected issues <span className="ml-1 font-normal text-[var(--text-secondary)]">{issues.length}</span></h3>{issues.length ? <div className="mt-3 grid gap-3">{issues.map(issue => <article key={issue.id} className="rounded-xl border border-[var(--accent-amber)]/18 bg-[var(--accent-amber)]/[.055] p-4"><strong className="flex items-center gap-2 text-[13px] text-amber-100"><AlertTriangle size={16}/>{issue.title || issue.type}</strong><p className="mt-2 whitespace-pre-wrap break-words text-[12px] leading-5 text-amber-50/80">{issue.evidence}</p></article>)}</div> : <p className="mt-2 flex items-center gap-2 text-[13px] text-[var(--text-secondary)]"><Check size={16} className="text-[var(--accent-teal)]"/>No joined issue records for this page.</p>}</section> }

function Status({ status = 'unverified' }) { return <span className={`inline-flex min-h-7 shrink-0 items-center rounded-full border px-2.5 text-[10px] font-bold uppercase tracking-[.05em] ${statusTone[status] || statusTone.unverified}`}>{status}</span> }
function EmptyResults() { return <div className="grid min-h-64 place-items-center px-6 text-center"><div><Search size={26} className="mx-auto text-[var(--text-muted)]"/><h3 className="mt-3 text-sm font-semibold text-[var(--text)]">No matching pages</h3><p className="mt-1 text-[13px] text-[var(--text-secondary)]">Clear a filter or search another path.</p></div></div> }
function SelectPrompt() { return <div className="grid flex-1 place-items-center p-8 text-center"><div><Network size={34} className="mx-auto text-[var(--accent-purple)]"/><h3 className="mt-4 text-base font-semibold text-[var(--text)]">Select a page to investigate</h3><p className="mt-2 max-w-sm text-[13px] leading-5 text-[var(--text-secondary)]">Review crawl evidence, inspected relationships, and joined issues without leaving the returned inventory.</p></div></div> }
function graphPoint(index, total) { const angle = (Math.PI * 2 * index) / Math.max(total, 1) - Math.PI / 2; return { x: 320 + Math.cos(angle) * 245, y: 110 + Math.sin(angle) * 72 } }
function displayPath(value) { try { const url = new URL(value); return `${url.pathname}${url.search}` || '/' } catch { return String(value || '') } }
function truncate(value, length) { return value.length > length ? `${value.slice(0, length - 1)}…` : value }
