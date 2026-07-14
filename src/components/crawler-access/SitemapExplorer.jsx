import { useMemo, useState } from 'react'
import { AlertCircle, ArrowRight, ExternalLink, Search, ShieldX } from '../icons/heroicons'

const PAGE_SIZE = 10

const statusTone = {
  indexable: 'border-[var(--accent-teal)]/25 bg-[var(--accent-teal)]/10 text-emerald-100',
  noindex: 'border-[var(--accent-amber)]/25 bg-[var(--accent-amber)]/10 text-amber-100',
  blocked: 'border-[var(--accent-red)]/25 bg-[var(--accent-red)]/10 text-rose-100',
  error: 'border-[var(--accent-red)]/25 bg-[var(--accent-red)]/10 text-rose-100',
  unverified: 'border-white/10 bg-white/[.035] text-[var(--text-secondary)]'
}

export default function SitemapExplorer({ sitemaps }) {
  const [activeSitemap, setActiveSitemap] = useState('all')
  const [status, setStatus] = useState('all')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const urls = useMemo(() => sitemaps?.urls || [], [sitemaps?.urls])
  const validSitemaps = (sitemaps?.discovered || []).filter(item => item.ok)
  const summary = sitemaps?.summary || { total: urls.length, indexable: 0, noindex: 0, blocked: 0, errors: 0, unverified: urls.length, inspected: 0, inspectedPercentage: 0 }
  const filtered = useMemo(() => urls.filter(item => (activeSitemap === 'all' || item.source === activeSitemap) && (status === 'all' || item.classification === status) && (!query || item.loc.toLowerCase().includes(query.toLowerCase()))), [urls, activeSitemap, status, query])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const updateFilter = setter => event => { setter(event.target.value); setPage(1) }

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]" aria-labelledby="sitemap-explorer-title">
      <header className="relative border-b border-[var(--border)] px-5 py-4 2xl:pr-36"><div><p className="m-0 text-[11px] font-bold uppercase tracking-[.14em] text-[var(--accent-blue)]">Discovery inventory</p><h2 id="sitemap-explorer-title" className="mt-2 text-base font-bold text-[var(--text)]">Sitemap Explorer</h2><p className="mt-1 text-[13px] leading-5 text-[var(--text-secondary)]">Browse returned URLs in a bounded, scrollable inventory; each page contains up to {PAGE_SIZE} records.</p></div>{validSitemaps.length > 0 && <span className="mt-3 inline-flex rounded-full border border-emerald-300/20 bg-emerald-300/[.07] px-3 py-2 text-[10px] font-bold uppercase tracking-[.06em] text-emerald-100 2xl:absolute 2xl:right-5 2xl:top-4 2xl:mt-0">{validSitemaps.length} valid sitemap{validSitemaps.length === 1 ? '' : 's'}</span>}</header>

      {validSitemaps.length === 0 ? <div className="flex min-h-72 flex-1 flex-col items-center justify-center px-6 text-center"><ShieldX size={36} className="text-[var(--text-muted)]"/><h3 className="mt-4 text-base font-semibold text-[var(--text)]">No valid sitemap found</h3><p className="mt-2 max-w-md text-[13px] leading-5 text-[var(--text-secondary)]">Create a sitemap that lists canonical, indexable pages and reference it from robots.txt so crawlers can discover it consistently.</p></div> : <div className="flex flex-1 flex-col">
        <div className="grid gap-3 border-b border-[var(--border)] p-4 md:grid-cols-[minmax(0,1fr)_170px] 2xl:grid-cols-[minmax(150px,1fr)_125px_185px]">
          <label className="relative min-w-0"><span className="sr-only">Search sitemap URLs</span><Search size={17} className="absolute left-3 top-3 text-[var(--text-secondary)]"/><input value={query} onChange={updateFilter(setQuery)} placeholder="Search returned URLs" className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-darker)] pl-10 pr-3 text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent-blue)]/50 focus:ring-2 focus:ring-[var(--accent-blue)]/10"/></label>
          <select aria-label="Filter sitemap status" value={status} onChange={updateFilter(setStatus)} className="h-11 rounded-lg border border-[var(--border)] bg-[var(--bg-darker)] px-3 text-[13px] text-[var(--text)] outline-none focus:border-[var(--accent-blue)]/50"><option value="all">All statuses</option><option value="indexable">Indexable</option><option value="noindex">Noindex</option><option value="blocked">Blocked</option><option value="error">Error</option><option value="unverified">Unverified</option></select>
          <label className="min-w-0 md:col-span-2 2xl:col-span-1"><span className="sr-only">Sitemap source</span><select id="sitemap-source" aria-label="Sitemap source" value={activeSitemap} onChange={updateFilter(setActiveSitemap)} className="h-11 w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--bg-darker)] px-3 text-[12px] text-[var(--text)] outline-none focus:border-[var(--accent-blue)]/50"><option value="all">All sitemaps · {validSitemaps.length}</option>{validSitemaps.map(item => <option key={item.url} value={item.url}>{shortPath(item.url)} · {(item.urlCount ?? item.childCount ?? 0).toLocaleString()} URLs</option>)}</select></label>
        </div>

        <div className="max-h-[260px] overflow-y-auto overscroll-contain bg-[var(--panel)] 2xl:max-h-[200px]">
          <div className="sticky top-0 z-10 hidden grid-cols-[minmax(0,1fr)_48px_88px_72px] gap-3 border-b border-[var(--border)] bg-[var(--bg-darker)] px-5 py-3 text-[10px] font-bold uppercase tracking-[.07em] text-[var(--text-secondary)] sm:grid"><span>URL and canonical</span><span>HTTP</span><span>Status</span><span>Robots</span></div>
          <div className="divide-y divide-[var(--border)]">{pageRows.map(item => <SitemapRow key={`${item.source}-${item.loc}`} item={item}/>)}{!filtered.length && <p className="m-0 px-5 py-12 text-center text-[13px] text-[var(--text-secondary)]">No URLs match the current filters.</p>}</div>
        </div>

        {filtered.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-3 text-[11px] text-[var(--text-secondary)]"><span>Showing {((currentPage - 1) * PAGE_SIZE + 1).toLocaleString()}–{Math.min(currentPage * PAGE_SIZE, filtered.length).toLocaleString()} of {filtered.length.toLocaleString()}</span><div className="flex items-center gap-2"><button type="button" onClick={() => setPage(value => Math.max(1, value - 1))} disabled={currentPage === 1} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[var(--border)] px-3 font-semibold text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-35"><ArrowRight size={14} className="rotate-180"/>Previous</button><span className="min-w-16 text-center">{currentPage} / {pageCount}</span><button type="button" onClick={() => setPage(value => Math.min(pageCount, value + 1))} disabled={currentPage === pageCount} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-[var(--border)] px-3 font-semibold text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-35">Next<ArrowRight size={14}/></button></div></div>}

        <div className="border-t border-[var(--border)] bg-[var(--bg-darker)]/35 p-4"><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Total URLs" value={summary.total} percent={100} color="bg-[var(--accent-blue)]"/><Metric label="Indexable" value={summary.indexable} percent={percentage(summary.indexable, summary.total)} color="bg-[var(--accent-teal)]"/><Metric label="Noindex" value={summary.noindex} percent={percentage(summary.noindex, summary.total)} color="bg-[var(--accent-amber)]"/><Metric label="Blocked" value={summary.blocked} percent={percentage(summary.blocked, summary.total)} color="bg-[var(--accent-red)]"/></div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-secondary)]"><span>{summary.inspected?.toLocaleString()} of {summary.total?.toLocaleString()} URLs classified ({summary.inspectedPercentage}%). {summary.unverified?.toLocaleString()} remain unverified.</span>{sitemaps?.responseCapped && <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-[var(--accent-amber)]/25 bg-[var(--accent-amber)]/10 px-3 text-amber-100"><AlertCircle size={15}/>Returned list capped at 500 URLs</span>}</div></div>
      </div>}
    </section>
  )
}

function SitemapRow({ item }) { return <div className="grid gap-3 px-5 py-4 text-[12px] sm:grid-cols-[minmax(0,1fr)_48px_88px_72px] sm:items-center"><div className="min-w-0"><a href={item.loc} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 text-[var(--text)] hover:text-[var(--accent-blue)]"><span className="truncate" title={item.loc}>{shortPath(item.loc)}</span><ExternalLink size={14} className="shrink-0 opacity-60"/></a><p className="mt-1 truncate text-[10px] text-[var(--text-secondary)]" title={item.canonical || ''}>Canonical: {item.canonical ? shortPath(item.canonical) : 'Not declared'}</p></div><div className="flex items-center justify-between gap-3 sm:block"><span className="text-[10px] font-semibold uppercase text-[var(--text-secondary)] sm:hidden">HTTP</span><span className="text-[var(--text-secondary)]">{item.httpStatus || '—'}</span></div><div className="flex items-center justify-between gap-3 sm:block"><span className="text-[10px] font-semibold uppercase text-[var(--text-secondary)] sm:hidden">Status</span><span className={`inline-flex rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.04em] ${statusTone[item.classification] || statusTone.unverified}`}>{item.classification || 'unverified'}</span></div><div className="flex items-center justify-between gap-3 sm:block"><span className="text-[10px] font-semibold uppercase text-[var(--text-secondary)] sm:hidden">Robots</span><span className={item.robotsAccess === 'blocked' ? 'text-rose-200' : 'text-[var(--text-secondary)]'}>{item.robotsAccess || 'unknown'}</span></div></div> }
function Metric({ label, value = 0, percent = 0, color }) { return <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3"><div className="flex items-end justify-between gap-2"><div><span className="text-[9px] font-bold uppercase tracking-[.06em] text-[var(--text-secondary)]">{label}</span><strong className="mt-1 block text-lg text-[var(--text)]">{value.toLocaleString()}</strong></div><span className="text-[10px] font-semibold text-[var(--text-secondary)]">{percent}%</span></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[.05]"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, percent)}%` }}/></div></div> }
function percentage(value = 0, total = 0) { return total ? Math.round((value / total) * 1000) / 10 : 0 }
function shortPath(value) { try { const url = new URL(value); return `${url.pathname}${url.search}` || '/' } catch { return value } }
