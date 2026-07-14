import { useMemo, useState } from 'react'
import { ArrowRight, Check, ChevronDown, ExternalLink, Info, Search, TriangleAlert, X } from '../icons/heroicons'
import { buildDiscoveryExplorerModel } from './utils/discoveryExplorer'

const PAGE_SIZE = 10

export default function SitemapDiscovery({ crawlerData }) {
  const model = useMemo(() => buildDiscoveryExplorerModel(crawlerData), [crawlerData])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [source, setSource] = useState('all')
  const [indexability, setIndexability] = useState('all')
  const [group, setGroup] = useState('all')
  const [showEmptyGroups, setShowEmptyGroups] = useState(false)
  const [selectedUrl, setSelectedUrl] = useState(model.records[0]?.url || '')
  const [page, setPage] = useState(1)
  const [mobileOpen, setMobileOpen] = useState(false)

  const filtered = useMemo(() => model.records.filter(record => {
    const search = query.trim().toLowerCase()
    const rowStatus = statusFor(record).id
    const rowSource = sourceFor(record).id
    const rowIndexability = indexabilityFor(record).id
    if (search && !`${record.path} ${record.url}`.toLowerCase().includes(search)) return false
    if (group !== 'all' && record.group !== group) return false
    if (status !== 'all' && rowStatus !== status) return false
    if (source !== 'all' && rowSource !== source) return false
    if (indexability !== 'all' && rowIndexability !== indexability) return false
    return true
  }), [group, indexability, model.records, query, source, status])

  const selected = model.records.find(record => record.url === selectedUrl) || model.records[0]
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const metrics = buildMetrics(model)
  const visibleGroups = model.groups.filter(item => item.count > 0)
  const emptyGroups = model.groups.filter(item => item.count === 0)

  const selectRow = record => { setSelectedUrl(record.url); setMobileOpen(true) }

  return <section className="mt-4 min-w-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)]" aria-labelledby="sitemap-discovery-title">
    <header className="border-b border-[var(--border)] px-4 py-3.5"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[var(--accent-blue)]">Discovery inventory</p><h2 id="sitemap-discovery-title" className="mt-1 text-base font-bold text-[var(--text)]">Sitemap &amp; Discovery</h2><p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">Browse discovered URLs and inspect how each page is supported by sitemaps, internal links, and indexability signals.</p></header>

    <div className="grid grid-cols-2 border-b border-[var(--border)] sm:grid-cols-4">
      <Metric label="Discovered URLs" value={model.sampling.returned} tone="text-[var(--status-info)]" />
      <Metric label="Indexable" value={metrics.indexable} tone="text-[var(--status-good)]" />
      <Metric label="Weak discovery paths" value={metrics.weakPaths} tone="text-[var(--status-warning)]" />
      <Metric label="Blocked or excluded" value={metrics.blockedOrExcluded} tone="text-[var(--status-danger)]" />
    </div>
    <p className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-2.5 text-[10px] text-[var(--text-secondary)]"><Info size={14} className="text-[var(--accent-blue)]" />{model.sampling.inspected.toLocaleString()} of {model.sampling.returned.toLocaleString()} pages have complete inspected evidence.</p>

    <div className="border-b border-[var(--border)] p-3">
      <div className="grid gap-2 md:grid-cols-[minmax(220px,1fr)_150px_160px_150px]">
        <label className="relative"><span className="sr-only">Search path or full URL</span><Search size={14} className="absolute left-3 top-3 text-[var(--text-secondary)]" /><input value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} placeholder="Search path or full URL" className="h-10 w-full rounded-md border border-[var(--border)] bg-[var(--bg-darker)] pl-9 pr-3 text-[11px] text-[var(--text)] outline-none focus:border-[var(--accent-blue)]/50" /></label>
        <Filter label="Filter status" value={status} onChange={value => { setStatus(value); setPage(1) }} options={[["all", "All statuses"], ["strong", "Strong"], ["review", "Needs review"], ["inspection", "Needs inspection"], ["blocked", "Blocked"]]} />
        <Filter label="Filter sitemap source" value={source} onChange={value => { setSource(value); setPage(1) }} options={[["all", "All discovery sources"], ["sitemap", "Sitemap"], ["internal", "Internal link"], ["unknown", "Unknown"]]} />
        <Filter label="Filter indexability" value={indexability} onChange={value => { setIndexability(value); setPage(1) }} options={[["all", "All indexability"], ["indexable", "Indexable"], ["unverified", "Unverified"], ["excluded", "Excluded"]]} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2" aria-label="Page type groups">
        <GroupButton active={group === 'all'} label="All" onClick={() => { setGroup('all'); setPage(1) }} />
        {visibleGroups.map(item => <GroupButton key={item.id} active={group === item.id} label={item.label} onClick={() => { setGroup(item.id); setPage(1) }} />)}
        {emptyGroups.length > 0 && <div className="relative"><button type="button" onClick={() => setShowEmptyGroups(value => !value)} className="inline-flex min-h-8 items-center gap-1 rounded-md border border-[var(--border)] px-2.5 text-[10px] text-[var(--text-secondary)]">More filters <ChevronDown size={12} /></button>{showEmptyGroups && <div className="absolute left-0 top-9 z-20 min-w-40 rounded-lg border border-[var(--border)] bg-[var(--panel-raised)] p-2 shadow-xl">{emptyGroups.map(item => <button type="button" key={item.id} onClick={() => { setGroup(item.id); setShowEmptyGroups(false) }} className="block w-full rounded px-2 py-2 text-left text-[10px] text-[var(--text-secondary)] hover:bg-white/[.04]">{item.label} <span className="float-right">0</span></button>)}</div>}</div>}
      </div>
    </div>

    <div className="grid min-w-0 xl:grid-cols-[minmax(0,1.72fr)_minmax(300px,.88fr)]">
      <div className="min-w-0 overflow-x-auto xl:border-r xl:border-[var(--border)]">
        <table className="w-full min-w-[780px] table-fixed border-collapse text-left">
          <colgroup><col className="w-[190px]"/><col className="w-[118px]"/><col className="w-[92px]"/><col className="w-[58px]"/><col className="w-[86px]"/><col className="w-[92px]"/><col className="w-[100px]"/></colgroup>
          <thead><tr className="border-b border-[var(--border)] bg-[var(--bg-darker)]/45 text-[10px] font-bold uppercase tracking-[.05em] text-[var(--text-secondary)]"><Header>Page</Header><Header>Discovery source</Header><Header>Internal links</Header><Header>HTTP</Header><Header>Canonical</Header><Header>Indexability</Header><Header>Status</Header></tr></thead>
          <tbody className="divide-y divide-[var(--border)]">{rows.map(record => <PageRow key={record.url} record={record} selected={selected?.url === record.url} onSelect={() => selectRow(record)} />)}</tbody>
        </table>
        {!rows.length && <div className="grid min-h-40 place-items-center text-center"><div><Search size={22} className="mx-auto text-[var(--text-secondary)]"/><p className="mt-2 text-[12px] font-semibold text-[var(--text)]">No matching pages</p><p className="mt-1 text-[10px] text-[var(--text-secondary)]">Clear a filter to restore the inventory.</p></div></div>}
        <div className="flex items-center justify-between border-t border-[var(--border)] px-3 py-2 text-[10px] text-[var(--text-secondary)]"><span>{filtered.length ? `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length}` : '0 pages'}</span><div className="flex items-center gap-2"><button type="button" disabled={currentPage <= 1} onClick={() => setPage(value => value - 1)} className="rounded border border-[var(--border)] px-2 py-1 disabled:opacity-35">Previous</button><span>{currentPage} / {pageCount}</span><button type="button" disabled={currentPage >= pageCount} onClick={() => setPage(value => value + 1)} className="rounded border border-[var(--border)] px-2 py-1 disabled:opacity-35">Next</button></div></div>
      </div>
      <div className="hidden min-w-0 xl:block">{selected ? <SelectedPageInspector record={selected} crawlerData={crawlerData} /> : <EmptyInspector />}</div>
    </div>

    {mobileOpen && selected && <div className="fixed inset-0 z-50 xl:hidden"><button type="button" aria-label="Close selected page inspector" className="absolute inset-0 bg-black/55" onClick={() => setMobileOpen(false)} /><aside role="dialog" aria-modal="true" aria-label="Selected page inspector" className="absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto border-l border-[var(--border)] bg-[var(--panel)] shadow-2xl"><button type="button" aria-label="Close inspector" onClick={() => setMobileOpen(false)} className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-lg border border-[var(--border)] bg-[var(--panel)]"><X size={16}/></button><SelectedPageInspector record={selected} crawlerData={crawlerData} /></aside></div>}
  </section>
}

function PageRow({ record, selected, onSelect }) {
  const discovery = sourceFor(record)
  const indexability = indexabilityFor(record)
  const status = statusFor(record)
  return <tr onClick={onSelect} className={`cursor-pointer text-[10px] transition hover:bg-white/[.02] ${selected ? 'bg-[var(--accent-blue)]/[.07]' : ''}`}><Cell><button type="button" className="block w-full truncate text-left font-semibold text-[var(--text)]" title={record.url}>{record.path}</button></Cell><Cell>{discovery.label}</Cell><Cell>{record.linkEvidenceInspected ? `${record.incoming.length} inbound` : 'Uninspected'}</Cell><Cell>{record.httpStatus || '—'}</Cell><Cell>{record.canonical ? 'Declared' : 'Missing'}</Cell><Cell>{indexability.label}</Cell><Cell><StatusBadge status={status} /></Cell></tr>
}

function SelectedPageInspector({ record, crawlerData }) {
  const indexability = indexabilityFor(record)
  const status = statusFor(record)
  const initialInspection = crawlerData?.urlInspection
  const renderedWords = normalize(initialInspection?.url) === normalize(record.url) && initialInspection?.shared?.renderedTextAvailable ? `${initialInspection.shared.renderedWordCount.toLocaleString()} rendered words` : 'No rendered evidence yet'
  return <article className="min-w-0 p-4"><p className="text-[9px] font-bold uppercase tracking-[.1em] text-[var(--text-secondary)]">Selected page inspector</p><div className="mt-2 flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="break-all text-[14px] font-bold text-[var(--text)]">{record.path}</h3><a href={record.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 break-all text-[10px] leading-4 text-[var(--accent-blue)]">{record.url}<ExternalLink size={12} className="shrink-0"/></a></div><span className="rounded-full border border-[var(--accent-teal)]/20 bg-[var(--accent-teal)]/10 px-2 py-1 text-[9px] font-bold text-[var(--status-good)]">{indexability.label}</span></div><div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text)]">{status.id === 'strong' ? <Check size={13} className="text-[var(--status-good)]"/> : <TriangleAlert size={13} className="text-[var(--status-warning)]"/>}{status.label} discovery evidence</div><InspectorGroup title="Discovery path"><InspectorLine label="Sitemap" value={record.inSitemap ? `Listed in ${path(record.sitemapSource)}` : 'Not listed'} /><InspectorLine label="Internal links" value={record.linkEvidenceInspected ? `${record.incoming.length} inbound links from inspected pages` : 'Not inspected'} /><InspectorLine label="Access" value={record.httpStatus ? `HTTP ${record.httpStatus}` : 'Not inspected'} /><InspectorLine label="Indexability" value={indexability.reason} /></InspectorGroup><InspectorGroup title="Related diagnostics"><Diagnostic href="/crawl-indexability" label="Crawler Access" value={record.robotsAccess === 'blocked' ? 'Blocked' : 'No blocker'} /><Diagnostic href="/ai-understanding" label="Machine Readability" value={renderedWords} /><Diagnostic href="/ai-understanding" label="Canonical" value={record.canonical ? 'Declared' : 'Missing'} /><Diagnostic href="/ai-visibility" label="AI Visibility" value="No prompt evidence yet" /></InspectorGroup></article>
}

function Filter({ label, value, onChange, options }) { return <select aria-label={label} value={value} onChange={event => onChange(event.target.value)} className="h-10 rounded-md border border-[var(--border)] bg-[var(--bg-darker)] px-3 text-[10px] text-[var(--text)] outline-none focus:border-[var(--accent-blue)]/50">{options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select> }
function GroupButton({ active, label, onClick }) { return <button type="button" aria-pressed={active} onClick={onClick} className={`min-h-8 rounded-md border px-3 text-[10px] font-semibold ${active ? 'border-[var(--accent-blue)]/40 bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}>{label}</button> }
function Metric({ label, value, tone }) { return <div className="border-r border-b border-[var(--border)] px-4 py-3 last:border-r-0 sm:border-b-0"><p className="text-[9px] font-semibold uppercase tracking-[.06em] text-[var(--text-secondary)]">{label}</p><strong className={`mt-1 block text-xl font-bold ${tone}`}>{value.toLocaleString()}</strong></div> }
function Header({ children }) { return <th className="px-2.5 py-2.5 font-bold">{children}</th> }
function Cell({ children }) { return <td className="px-2.5 py-2.5 text-[var(--text-secondary)]">{children}</td> }
function StatusBadge({ status }) { const tone = status.id === 'strong' ? 'border-[var(--accent-teal)]/20 bg-[var(--accent-teal)]/10 text-[var(--status-good)]' : status.id === 'blocked' ? 'border-[var(--accent-red)]/20 bg-[var(--accent-red)]/10 text-[var(--status-danger)]' : 'border-[var(--accent-amber)]/20 bg-[var(--accent-amber)]/10 text-[var(--status-warning)]'; return <span className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-semibold ${tone}`}>{status.label}</span> }
function InspectorGroup({ title, children }) { return <section className="mt-3 rounded-lg border border-[var(--border)] p-3"><h4 className="text-[10px] font-bold text-[var(--text)]">{title}</h4><dl className="mt-2 grid gap-2">{children}</dl></section> }
function InspectorLine({ label, value }) { return <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-2 text-[10px]"><dt className="text-[var(--text-secondary)]">{label}</dt><dd className="m-0 text-[var(--text)]">{value}</dd></div> }
function Diagnostic({ href, label, value }) { return <a href={href} className="grid grid-cols-[110px_minmax(0,1fr)_14px] items-center gap-2 text-[10px]"><span className="inline-flex items-center gap-1.5 font-semibold text-[var(--text)]"><span className="size-1.5 rounded-full bg-[var(--status-good)]" />{label}</span><span className="truncate text-[var(--text-secondary)]">{value}</span><ArrowRight size={12} className="text-[var(--text-secondary)]" /></a> }
function EmptyInspector() { return <div className="grid min-h-56 place-items-center text-[11px] text-[var(--text-secondary)]">Select a page to inspect its discovery evidence.</div> }

function buildMetrics(model) { return { indexable: model.records.filter(record => indexabilityFor(record).id === 'indexable').length, weakPaths: model.records.filter(record => record.inspected && !record.inSitemap && record.linkEvidenceInspected && record.incoming.length === 0).length, blockedOrExcluded: model.records.filter(record => indexabilityFor(record).id === 'excluded').length } }
function sourceFor(record) { if (record.inSitemap) return { id: 'sitemap', label: 'Sitemap' }; if (record.incoming.length > 0) return { id: 'internal', label: 'Internal link' }; return { id: 'unknown', label: 'Unknown' } }
function indexabilityFor(record) { if (!record.inspected) return { id: 'unverified', label: 'Unverified', reason: 'Page evidence has not been inspected.' }; if (record.noindex || record.robotsAccess === 'blocked' || record.httpStatus >= 400) return { id: 'excluded', label: 'Excluded', reason: record.noindex ? 'A noindex directive was found.' : record.robotsAccess === 'blocked' ? 'robots.txt blocks access.' : `HTTP ${record.httpStatus} prevents indexing.` }; return { id: 'indexable', label: 'Indexable', reason: 'No robots or noindex blocker found.' } }
function statusFor(record) { if (record.health === 'blocked' || indexabilityFor(record).id === 'excluded') return { id: 'blocked', label: 'Blocked' }; if (!record.inspected) return { id: 'inspection', label: 'Needs inspection' }; if (record.inSitemap || record.incoming.length > 0) return { id: 'strong', label: 'Strong' }; return { id: 'review', label: 'Needs review' } }
function path(value) { try { const url = new URL(value); return `${url.pathname}${url.search}` } catch { return value || 'sitemap' } }
function normalize(value) { try { const url = new URL(value); return `${url.origin}${url.pathname.replace(/\/+$/, '') || '/'}${url.search}` } catch { return value || '' } }
