import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, Check, ExternalLink, Info, Network, Search } from '../icons/heroicons'
import { buildDiscoveryExplorerModel, filterDiscoveryRecords } from './utils/discoveryExplorer'

const PAGE_SIZE = 8
const FILTERS = [
  ['all', 'All discovery states'],
  ['blocked', 'Blocked by robots'],
  ['no-links', 'No inspected inbound links'],
  ['noindex', 'Noindex'],
  ['redirected', 'Redirected'],
  ['errors', 'HTTP errors'],
  ['in-sitemap', 'In sitemap']
]

const statusTone = {
  indexable: 'border-[var(--accent-teal)]/25 bg-[var(--accent-teal)]/10 text-[var(--accent-teal)]',
  noindex: 'border-[var(--accent-amber)]/25 bg-[var(--accent-amber)]/10 text-[var(--status-warning)]',
  blocked: 'border-[var(--accent-red)]/25 bg-[var(--accent-red)]/10 text-[var(--status-danger)]',
  error: 'border-[var(--accent-red)]/25 bg-[var(--accent-red)]/10 text-[var(--status-danger)]',
  redirect: 'border-[var(--accent-blue)]/25 bg-[var(--accent-blue)]/10 text-[var(--status-info)]',
  unverified: 'border-white/10 bg-white/[.035] text-[var(--text-secondary)]'
}

export default function DiscoveryExplorer({ crawlerData }) {
  const model = useMemo(() => buildDiscoveryExplorerModel(crawlerData), [crawlerData])
  const [group, setGroup] = useState('all')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [selectedUrl, setSelectedUrl] = useState('')
  const filtered = useMemo(() => filterDiscoveryRecords(model.records, { group, query, filters: filter === 'all' ? [] : [filter] }), [model.records, group, query, filter])
  const selected = model.records.find(record => record.url === selectedUrl && filtered.some(item => item.url === record.url)) || filtered[0] || null
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const metrics = useMemo(() => buildExplorerMetrics(model), [model])

  const updateGroup = value => { setGroup(value); setSelectedUrl(''); setPage(1) }
  const updateFilter = value => { setFilter(value); setSelectedUrl(''); setPage(1) }

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]" aria-labelledby="discovery-explorer-title">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
        <div className="min-w-0"><p className="m-0 text-[11px] font-bold uppercase tracking-[.14em] text-[var(--accent-blue)]">Discovery audit</p><h2 id="discovery-explorer-title" className="mt-2 text-base font-bold tracking-[-.01em] text-[var(--text)]">Discovery Explorer</h2><p className="mt-1 max-w-3xl text-[13px] leading-5 text-[var(--text-secondary)]">Find pages crawlers may miss, then see whether each page is supported by a sitemap, inspected internal links, and indexable access.</p></div>
        <SamplingBadge sampling={model.sampling} />
      </header>

      <div className="grid gap-px border-b border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Returned pages" value={model.sampling.returned} note={`of ${model.sampling.total.toLocaleString()} discovered`} tone="text-[var(--accent-blue)]" />
        <Metric label="Inspected evidence" value={`${metrics.inspectedPercentage}%`} note={`${model.sampling.inspected.toLocaleString()} pages checked`} tone="text-[var(--accent-teal)]" />
        <Metric label="Weak discovery paths" value={metrics.weakPaths} note="no sitemap or inspected inbound link" tone="text-[var(--accent-amber)]" />
        <Metric label="Blocked or excluded" value={metrics.blockedOrExcluded} note="robots, noindex, or response failures" tone="text-[var(--accent-red)]" />
      </div>

      <details className="group border-b border-[var(--border)] bg-sky-300/[.025] px-5 py-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-[11px] font-semibold text-[var(--accent-blue)]"><Info size={15}/>How to use this explorer <ArrowRight size={14} className="transition group-open:rotate-90"/></summary>
        <p className="mt-3 max-w-4xl text-[12px] leading-5 text-[var(--text-secondary)]">Choose a page from the inventory. The audit explains its strongest discovery path, separates verified evidence from sampled or uninspected data, and gives one next action. Use filters to find blocked, noindex, error, or weakly linked pages first.</p>
      </details>

      {!model.records.length ? <EmptyInventory /> : <><div className="border-b border-[var(--border)] p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_210px]">
          <label className="relative min-w-0"><span className="sr-only">Search discovered pages</span><Search size={18} className="absolute left-3 top-3 text-[var(--text-secondary)]"/><input value={query} onChange={event => { setQuery(event.target.value); setSelectedUrl(''); setPage(1) }} placeholder="Search a path or full URL" className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-darker)] pl-10 pr-3 text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent-blue)]/50 focus:ring-2 focus:ring-[var(--accent-blue)]/10"/></label>
          <select aria-label="Filter discovery state" value={filter} onChange={event => updateFilter(event.target.value)} className="h-11 rounded-lg border border-[var(--border)] bg-[var(--bg-darker)] px-3 text-[12px] text-[var(--text)] outline-none focus:border-[var(--accent-blue)]/50">{FILTERS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6" aria-label="Page type groups">
          <GroupButton active={group === 'all'} label="All pages" count={model.sampling.returned} onClick={() => updateGroup('all')} />
          {model.groups.map(item => <GroupButton key={item.id} active={group === item.id} label={item.label} count={item.count} onClick={() => updateGroup(item.id)} />)}
        </div>
      </div>

      <div className="grid min-w-0 xl:grid-cols-[minmax(320px,.72fr)_minmax(0,1.28fr)]">
        <div className="min-w-0 border-b border-[var(--border)] xl:border-b-0 xl:border-r">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3 text-[11px] text-[var(--text-secondary)]"><span><strong className="text-[var(--text)]">{filtered.length.toLocaleString()}</strong> matching pages</span><span>{filtered.length ? `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)}` : '0'} shown</span></div>
          <div>{pageRows.map(record => <PageRow key={record.url} record={record} selected={record.url === selected?.url} onSelect={() => setSelectedUrl(record.url)} />)}{!filtered.length && <EmptyResults />}</div>
          {filtered.length > 0 && <Pagination page={currentPage} pageCount={pageCount} onChange={setPage} />}
        </div>

        <div className="min-w-0 bg-[var(--bg-darker)]/20">
          {selected ? <PageAudit record={selected} onSelect={setSelectedUrl} /> : <EmptyResults />}
        </div>
      </div></>}

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--bg-darker)]/35 px-5 py-3 text-[11px] text-[var(--text-secondary)]"><span>{model.sampling.inspected.toLocaleString()} records inspected from {model.sampling.returned.toLocaleString()} returned.</span><span>Internal-link evidence reflects inspected pages only.</span></footer>
    </section>
  )
}

function PageAudit({ record, onSelect }) {
  const verdict = discoveryVerdict(record)
  return <article>
    <header className="border-b border-[var(--border)] px-5 py-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.09em] text-[var(--text-secondary)]">Selected page</p><h3 className="mt-2 break-all text-[15px] font-semibold leading-6 text-[var(--text)]">{record.path}</h3><a href={record.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex max-w-full items-center gap-2 break-all text-[11px] leading-5 text-[var(--accent-blue)]">{record.url}<ExternalLink size={14} className="shrink-0"/></a></div><Status status={record.status}/></div></header>

    <div className="p-5">
      <div className={`rounded-xl border p-4 ${verdict.panel}`}><p className={`text-[10px] font-bold uppercase tracking-[.08em] ${verdict.tone}`}>Discovery assessment</p><div className="mt-2 flex items-start gap-3"><span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${verdict.iconBg}`}>{verdict.icon}</span><div><h3 className="text-base font-semibold text-[var(--text)]">{verdict.title}</h3><p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">{verdict.explanation}</p></div></div></div>

      <section className="mt-5"><div className="flex flex-wrap items-end justify-between gap-2"><div><h3 className="text-[12px] font-bold uppercase tracking-[.08em] text-[var(--text)]">Why crawlers can—or cannot—find it</h3><p className="mt-1 text-[11px] text-[var(--text-secondary)]">Three independent signals form the discovery path.</p></div></div><div className="mt-3 grid gap-3 md:grid-cols-3"><SignalCard number="1" label="Sitemap entry" value={record.inSitemap ? 'Listed' : 'Not returned'} detail={record.inSitemap ? displayPath(record.sitemapSource) : 'No returned sitemap contains this URL.'} state={record.inSitemap ? 'good' : 'warn'}/><SignalCard number="2" label="Internal links" value={record.linkEvidenceInspected ? `${record.incoming.length} inbound` : 'Not inspected'} detail={linkDetail(record)} state={record.linkEvidenceInspected && record.incoming.length > 0 ? 'good' : 'warn'}/><SignalCard number="3" label="Access and indexability" value={accessLabel(record)} detail={accessDetail(record)} state={record.health === 'blocked' || record.noindex ? 'bad' : record.inspected ? 'good' : 'warn'}/></div></section>

      <section className="mt-5 rounded-xl border border-[var(--accent-blue)]/15 bg-[var(--accent-blue)]/[.045] p-4"><p className="text-[10px] font-bold uppercase tracking-[.08em] text-[var(--status-info)]">Recommended next step</p><p className="mt-2 text-[12px] leading-5 text-[var(--text)]">{nextAction(record)}</p></section>

      <details className="group mt-5 rounded-xl border border-[var(--border)] bg-[var(--panel)] px-4 py-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[11px] font-semibold text-[var(--text)]"><span className="inline-flex items-center gap-2"><Info size={15} className="text-[var(--accent-blue)]"/>Technical evidence and relationships</span><span className="inline-flex items-center gap-2 text-[10px] text-[var(--text-secondary)]">{record.issues.length} issue{record.issues.length === 1 ? '' : 's'}<ArrowRight size={14} className="transition group-open:rotate-90"/></span></summary>
        <div className="mt-4 border-t border-[var(--border)] pt-4"><h3 className="text-[11px] font-bold uppercase tracking-[.08em] text-[var(--text)]">Verified page evidence</h3><dl className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Evidence label="HTTP status" value={record.httpStatus || 'Not inspected'} /><Evidence label="Robots access" value={record.robotsAccess || 'Unknown'} /><Evidence label="Index directive" value={record.inspected ? record.noindex ? 'noindex' : 'index allowed' : 'Not inspected'} /><Evidence label="Canonical" value={record.canonical ? displayPath(record.canonical) : 'Not declared'} wide /><Evidence label="Redirect" value={record.redirected ? displayPath(record.finalUrl) : 'No inspected redirect'} wide /></dl></div>
        <div className="mt-5 grid gap-5 border-t border-[var(--border)] pt-5 lg:grid-cols-2"><RelationshipList title="Linked from" items={record.incoming} inspected={record.linkEvidenceInspected} onSelect={onSelect}/><RelationshipList title="Links to" items={record.outgoing} inspected={record.linkEvidenceInspected} onSelect={onSelect}/></div>
        <IssueList issues={record.issues}/>
      </details>
    </div>
  </article>
}

function SamplingBadge({ sampling }) { const label = sampling.responseCapped ? 'Returned sample' : sampling.sampled ? 'Sampled evidence' : 'Complete returned set'; return <span className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-[11px] font-semibold ${sampling.sampled ? 'border-[var(--accent-amber)]/25 bg-[var(--accent-amber)]/10 text-amber-100' : 'border-[var(--accent-teal)]/20 bg-[var(--accent-teal)]/8 text-emerald-100'}`}><span className={`size-2 rounded-full ${sampling.sampled ? 'bg-[var(--accent-amber)]' : 'bg-[var(--accent-teal)]'}`}/>{label}: {sampling.returned.toLocaleString()} / {sampling.total.toLocaleString()}</span> }
function Metric({ label, value, note, tone }) { return <div className="bg-[var(--panel)] px-5 py-4"><p className="text-[10px] font-bold uppercase tracking-[.08em] text-[var(--text-secondary)]">{label}</p><strong className={`mt-2 block text-2xl font-semibold tabular-nums ${tone}`}>{typeof value === 'number' ? value.toLocaleString() : value}</strong><p className="mt-1 text-[10px] leading-4 text-[var(--text-secondary)]">{note}</p></div> }
function GroupButton({ active, label, count, onClick }) { return <button type="button" aria-pressed={active} onClick={onClick} className={`min-h-10 rounded-lg border px-3 text-left transition ${active ? 'border-[var(--accent-blue)]/35 bg-[var(--accent-blue)]/10 text-blue-100' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-white/20 hover:text-[var(--text)]'}`}><span className="text-[10px] font-semibold uppercase tracking-[.05em]">{label}</span><strong className="ml-2 text-[11px] tabular-nums">{count.toLocaleString()}</strong></button> }
function PageRow({ record, selected, onSelect }) { return <button type="button" onClick={onSelect} className={`grid w-full grid-cols-[minmax(0,1fr)_auto] gap-4 border-b border-[var(--border)] px-5 py-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--accent-blue)] ${selected ? 'bg-[var(--accent-blue)]/[.075]' : 'hover:bg-white/[.022]'}`}><span className="min-w-0"><strong className="block break-all text-[12px] font-semibold text-[var(--text)]">{record.path}</strong><span className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[var(--text-secondary)]"><span>{record.inSitemap ? 'Sitemap' : 'No sitemap'}</span><span>•</span><span>{record.linkEvidenceInspected ? `${record.incoming.length} inbound` : 'Links uninspected'}</span>{record.issues.length > 0 && <span className="inline-flex items-center gap-1 text-amber-200"><AlertTriangle size={12}/>{record.issues.length}</span>}</span></span><span className="flex items-center gap-2"><Status status={record.status}/><ArrowRight size={15} className="text-[var(--text-secondary)]"/></span></button> }
function Pagination({ page, pageCount, onChange }) { return <div className="flex items-center justify-between gap-3 px-5 py-3 text-[11px] text-[var(--text-secondary)]"><button type="button" disabled={page === 1} onClick={() => onChange(value => Math.max(1, value - 1))} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[var(--border)] px-3 font-semibold text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-35"><ArrowRight size={14} className="rotate-180"/>Previous</button><span>{page} / {pageCount}</span><button type="button" disabled={page === pageCount} onClick={() => onChange(value => Math.min(pageCount, value + 1))} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[var(--border)] px-3 font-semibold text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-35">Next<ArrowRight size={14}/></button></div> }
function SignalCard({ number, label, value, detail, state }) { const tone = state === 'good' ? 'border-emerald-300/18 bg-emerald-300/[.045]' : state === 'bad' ? 'border-rose-300/18 bg-rose-300/[.045]' : 'border-amber-300/18 bg-amber-300/[.045]'; return <article className={`rounded-xl border p-4 ${tone}`}><div className="flex items-center gap-2"><span className="grid size-6 place-items-center rounded-full border border-white/10 text-[10px] font-bold text-[var(--text)]">{number}</span><p className="text-[10px] font-bold uppercase tracking-[.07em] text-[var(--text-secondary)]">{label}</p></div><strong className="mt-3 block text-[13px] text-[var(--text)]">{value}</strong><p className="mt-1 break-all text-[10px] leading-4 text-[var(--text-secondary)]">{detail}</p></article> }
function Evidence({ label, value, wide }) { return <div className={wide ? 'min-w-0 lg:col-span-2' : 'min-w-0'}><dt className="text-[10px] font-semibold uppercase tracking-[.07em] text-[var(--text-secondary)]">{label}</dt><dd className="mt-1 break-all text-[12px] leading-5 text-[var(--text)]">{String(value)}</dd></div> }
function RelationshipList({ title, items, inspected, onSelect }) { return <section><h3 className="text-[11px] font-bold uppercase tracking-[.08em] text-[var(--text)]">{title} <span className="ml-1 font-normal text-[var(--text-secondary)]">{inspected ? items.length : '—'}</span></h3>{!inspected ? <p className="mt-2 text-[11px] leading-5 text-[var(--text-secondary)]">This page was not part of the internal-link sample.</p> : items.length ? <div className="mt-3 grid gap-2">{items.slice(0, 5).map(url => <button type="button" key={url} onClick={() => onSelect(url)} className="flex min-h-9 min-w-0 items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 text-left text-[11px] text-[var(--text-secondary)] hover:border-[var(--accent-blue)]/30 hover:text-[var(--text)]"><span className="truncate">{displayPath(url)}</span><ArrowRight size={14} className="shrink-0"/></button>)}</div> : <p className="mt-2 text-[11px] leading-5 text-[var(--text-secondary)]">No relationships were found in inspected pages.</p>}</section> }
function IssueList({ issues }) { return <section className="mt-5 border-t border-[var(--border)] pt-5"><h3 className="text-[11px] font-bold uppercase tracking-[.08em] text-[var(--text)]">Joined crawler issues <span className="ml-1 font-normal text-[var(--text-secondary)]">{issues.length}</span></h3>{issues.length ? <div className="mt-3 grid gap-3">{issues.slice(0, 4).map(issue => <article key={issue.id} className="rounded-xl border border-[var(--accent-amber)]/18 bg-[var(--accent-amber)]/[.055] p-4"><strong className="flex items-center gap-2 text-[12px] text-amber-100"><AlertTriangle size={15}/>{issue.title || issue.type}</strong><p className="mt-2 whitespace-pre-wrap break-words text-[11px] leading-5 text-amber-50/80">{issue.evidence}</p></article>)}</div> : <p className="mt-2 flex items-center gap-2 text-[12px] text-[var(--text-secondary)]"><Check size={15} className="text-[var(--accent-teal)]"/>No joined issue records for this page.</p>}</section> }
function Status({ status = 'unverified' }) { return <span className={`inline-flex min-h-7 shrink-0 items-center rounded-full border px-2.5 text-[9px] font-bold uppercase tracking-[.05em] ${statusTone[status] || statusTone.unverified}`}>{status}</span> }
function EmptyResults() { return <div className="grid min-h-72 place-items-center px-6 text-center"><div><Search size={26} className="mx-auto text-[var(--text-muted)]"/><h3 className="mt-3 text-sm font-semibold text-[var(--text)]">No matching pages</h3><p className="mt-1 text-[12px] text-[var(--text-secondary)]">Clear the search or choose another discovery state.</p></div></div> }
function EmptyInventory() { return <div className="grid min-h-64 place-items-center px-6 text-center"><div><Network size={28} className="mx-auto text-[var(--text-muted)]"/><h3 className="mt-3 text-sm font-semibold text-[var(--text)]">No discovery inventory yet</h3><p className="mt-1 max-w-md text-[12px] leading-5 text-[var(--text-secondary)]">Run an analysis with a reachable page or sitemap to compare sitemap, link, and access evidence.</p></div></div> }

function buildExplorerMetrics(model) { const weakPaths = model.records.filter(record => record.inspected && !record.inSitemap && record.linkEvidenceInspected && record.incoming.length === 0).length; const blockedOrExcluded = model.records.filter(record => record.health === 'blocked' || record.noindex).length; const inspectedPercentage = model.sampling.returned ? Math.round((model.sampling.inspected / model.sampling.returned) * 100) : 0; return { weakPaths, blockedOrExcluded, inspectedPercentage } }
function discoveryVerdict(record) {
  if (!record.inspected) return { title: 'Evidence not yet verified', explanation: 'This URL was returned in the inventory, but page access and indexability were not deeply inspected.', tone: 'text-slate-300', iconBg: 'bg-white/[.06] text-slate-300', panel: 'border-white/10 bg-white/[.025]', icon: <Network size={16}/> }
  if (record.health === 'blocked' || record.status === 'error') return { title: 'Discovery is blocked or failing', explanation: 'Crawler access or the page response prevents dependable discovery.', tone: 'text-rose-200', iconBg: 'bg-rose-300/10 text-rose-200', panel: 'border-rose-300/20 bg-rose-300/[.05]', icon: <AlertTriangle size={16}/> }
  if (record.noindex) return { title: 'Discoverable but excluded from indexing', explanation: 'Crawlers may reach this page, but an effective noindex directive asks search systems not to index it.', tone: 'text-amber-200', iconBg: 'bg-amber-300/10 text-amber-200', panel: 'border-amber-300/20 bg-amber-300/[.05]', icon: <AlertTriangle size={16}/> }
  if (record.redirected) return { title: 'Discovery continues through a redirect', explanation: 'Crawlers reach this URL and are sent to the final destination shown below.', tone: 'text-blue-200', iconBg: 'bg-blue-300/10 text-blue-200', panel: 'border-blue-300/20 bg-blue-300/[.05]', icon: <ArrowRight size={16}/> }
  if (record.inSitemap || record.incoming.length > 0) return { title: 'Strong discovery evidence', explanation: 'The page has at least one clear entry point and no verified access or indexing blocker.', tone: 'text-emerald-200', iconBg: 'bg-emerald-300/10 text-emerald-200', panel: 'border-emerald-300/20 bg-emerald-300/[.05]', icon: <Check size={16}/> }
  return { title: 'Discovery path is weak', explanation: 'The inspected sample found neither a sitemap entry nor an inbound internal link for this page.', tone: 'text-amber-200', iconBg: 'bg-amber-300/10 text-amber-200', panel: 'border-amber-300/20 bg-amber-300/[.05]', icon: <AlertTriangle size={16}/> }
}
function linkDetail(record) { if (!record.linkEvidenceInspected) return 'Internal links were not collected for this URL.'; if (!record.incoming.length) return 'No inspected page linked to this URL.'; return `${record.incoming.length} inspected page${record.incoming.length === 1 ? '' : 's'} provide a path.` }
function accessLabel(record) { if (!record.inspected) return 'Not inspected'; if (record.robotsAccess === 'blocked') return 'Robots blocked'; if (record.noindex) return 'Noindex'; if (record.httpStatus >= 400 || record.error) return `HTTP ${record.httpStatus || 'error'}`; return `Accessible${record.httpStatus ? ` · ${record.httpStatus}` : ''}` }
function accessDetail(record) { if (!record.inspected) return 'HTTP and index directives are unknown.'; if (record.robotsAccess === 'blocked') return 'robots.txt prevents this crawler policy from accessing the URL.'; if (record.noindex) return 'The response asks crawlers not to index this page.'; if (record.httpStatus >= 400 || record.error) return 'The inspected response was unsuccessful.'; return 'No verified robots, response, or noindex blocker was found.' }
function nextAction(record) { if (!record.inspected) return 'Inspect this URL before deciding whether its discovery path is healthy.'; if (record.robotsAccess === 'blocked') return 'Review the matched robots.txt rule and allow the URL only if it should be public.'; if (record.httpStatus >= 400 || record.error) return 'Restore a successful response or remove the broken URL from discovery sources.'; if (record.noindex && record.inSitemap) return 'Remove the URL from the sitemap or remove noindex if the page should appear in search.'; if (record.redirected) return 'Update sitemaps and internal links to point directly to the final canonical destination.'; if (!record.inSitemap && record.linkEvidenceInspected && record.incoming.length === 0) return 'Add the page to a relevant navigation path or sitemap if it is important and indexable.'; if (!record.inSitemap) return 'Consider adding this canonical page to a sitemap if it is important for discovery.'; return 'No immediate discovery fix is indicated; monitor the page after future crawls.' }
function displayPath(value) { try { const url = new URL(value); return `${url.pathname}${url.search}` || '/' } catch { return String(value || '') } }
