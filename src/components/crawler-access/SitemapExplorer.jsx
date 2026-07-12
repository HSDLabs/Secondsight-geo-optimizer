import { useMemo, useState } from 'react'
import { AlertCircle, ExternalLink, Search, ShieldX } from '../icons/heroicons'

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
  const [visible, setVisible] = useState(50)
  const urls = useMemo(() => sitemaps?.urls || [], [sitemaps?.urls])
  const validSitemaps = (sitemaps?.discovered || []).filter(item => item.ok)
  const summary = sitemaps?.summary || { total: urls.length, indexable: 0, noindex: 0, blocked: 0, errors: 0, unverified: urls.length, inspected: 0, inspectedPercentage: 0 }
  const filtered = useMemo(() => urls.filter(item => (activeSitemap === 'all' || item.source === activeSitemap) && (status === 'all' || item.classification === status) && (!query || item.loc.toLowerCase().includes(query.toLowerCase()))), [urls, activeSitemap, status, query])

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]" aria-labelledby="sitemap-explorer-title">
      <header className="border-b border-[var(--border)] px-6 py-5"><p className="m-0 text-[11px] font-bold uppercase tracking-[.14em] text-[var(--accent-blue)]">Discovery inventory</p><h2 id="sitemap-explorer-title" className="mt-2 text-base font-bold text-[var(--text)]">3. Sitemap Explorer</h2><p className="mt-1 text-[13px] leading-5 text-[var(--text-secondary)]">Filter returned URLs and separate verified page signals from uninspected entries.</p></header>

      {validSitemaps.length === 0 ? <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center"><ShieldX size={36} className="text-[var(--text-muted)]"/><h3 className="mt-4 text-base font-semibold text-[var(--text)]">No valid sitemap found</h3><p className="mt-2 max-w-md text-[13px] leading-5 text-[var(--text-secondary)]">Add a sitemap and reference it from robots.txt so important pages can be discovered consistently.</p></div> : <>
        <div className="border-b border-[var(--border)] px-5 py-4">
          <label htmlFor="sitemap-source" className="mb-2 block text-[11px] font-semibold uppercase tracking-[.07em] text-[var(--text-secondary)]">Sitemap source</label>
          <div className="relative max-w-2xl"><select id="sitemap-source" value={activeSitemap} onChange={event => { setActiveSitemap(event.target.value); setVisible(50) }} className="h-11 w-full appearance-none rounded-lg border border-[var(--border)] bg-[var(--bg-darker)] px-3 pr-10 text-[13px] text-[var(--text)] outline-none focus:border-[var(--accent-blue)]/50 focus:ring-2 focus:ring-[var(--accent-blue)]/10"><option value="all">All returned sitemaps · {validSitemaps.length}</option>{validSitemaps.map(item => <option key={item.url} value={item.url}>{shortPath(item.url)} · {(item.urlCount ?? item.childCount ?? 0).toLocaleString()} URLs</option>)}</select><span className="pointer-events-none absolute right-3 top-3 text-[var(--text-secondary)]">⌄</span></div>
        </div>

        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1"><span className="sr-only">Search sitemap URLs</span><Search size={17} className="absolute left-3 top-3 text-[var(--text-secondary)]"/><input value={query} onChange={event => { setQuery(event.target.value); setVisible(50) }} placeholder="Search returned URLs" className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-darker)] pl-10 pr-3 text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent-blue)]/50 focus:ring-2 focus:ring-[var(--accent-blue)]/10"/></label>
          <select aria-label="Filter sitemap status" value={status} onChange={event => { setStatus(event.target.value); setVisible(50) }} className="h-11 rounded-lg border border-[var(--border)] bg-[var(--bg-darker)] px-3 text-[13px] text-[var(--text)] outline-none focus:border-[var(--accent-blue)]/50"><option value="all">All statuses</option><option value="indexable">Indexable</option><option value="noindex">Noindex</option><option value="blocked">Blocked</option><option value="error">Error</option><option value="unverified">Unverified</option></select>
        </div>

        <div className="max-h-[430px] overflow-auto">
          <div className="hidden min-w-[720px] grid-cols-[minmax(280px,1fr)_65px_100px_88px_minmax(160px,.7fr)] gap-3 border-b border-[var(--border)] bg-[var(--bg-darker)]/45 px-5 py-3 text-[11px] font-bold uppercase tracking-[.07em] text-[var(--text-secondary)] md:grid"><span>URL</span><span>HTTP</span><span>Status</span><span>Robots</span><span>Canonical</span></div>
          <div className="divide-y divide-[var(--border)]">{filtered.slice(0, visible).map(item => <SitemapRow key={`${item.source}-${item.loc}`} item={item}/>)}{!filtered.length && <p className="m-0 px-5 py-12 text-center text-[13px] text-[var(--text-secondary)]">No URLs match the current filters.</p>}</div>
        </div>
        {visible < filtered.length && <div className="border-t border-[var(--border)] p-3 text-center"><button type="button" onClick={() => setVisible(value => value + 50)} className="min-h-10 rounded-lg border border-[var(--border)] px-4 text-[12px] font-semibold text-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/[.06]">Load 50 more</button></div>}

        <div className="border-t border-[var(--border)] bg-[var(--bg-darker)]/35 p-5"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Total URLs" value={summary.total} percent={100} color="bg-[var(--accent-blue)]"/><Metric label="Indexable" value={summary.indexable} percent={percentage(summary.indexable, summary.total)} color="bg-[var(--accent-teal)]"/><Metric label="Noindex" value={summary.noindex} percent={percentage(summary.noindex, summary.total)} color="bg-[var(--accent-amber)]"/><Metric label="Blocked" value={summary.blocked} percent={percentage(summary.blocked, summary.total)} color="bg-[var(--accent-red)]"/></div><div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-secondary)]"><span>{summary.inspected?.toLocaleString()} of {summary.total?.toLocaleString()} URLs classified ({summary.inspectedPercentage}%). {summary.unverified?.toLocaleString()} remain unverified.</span>{sitemaps?.responseCapped && <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-[var(--accent-amber)]/25 bg-[var(--accent-amber)]/10 px-3 text-amber-100"><AlertCircle size={15}/>Response capped at 500 rows</span>}</div></div>
      </>}
    </section>
  )
}

function SitemapRow({ item }) { return <div className="grid gap-2 px-5 py-4 text-[12px] md:min-w-[720px] md:grid-cols-[minmax(280px,1fr)_65px_100px_88px_minmax(160px,.7fr)] md:items-center md:gap-3"><a href={item.loc} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 text-[var(--text)] hover:text-[var(--accent-blue)]"><span className="truncate" title={item.loc}>{shortPath(item.loc)}</span><ExternalLink size={15} className="shrink-0 opacity-60"/></a><span className="text-[var(--text-secondary)]">{item.httpStatus || '—'}</span><span className={`w-fit rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.04em] ${statusTone[item.classification] || statusTone.unverified}`}>{item.classification || 'unverified'}</span><span className={item.robotsAccess === 'blocked' ? 'text-rose-200' : 'text-[var(--text-secondary)]'}>{item.robotsAccess || 'unknown'}</span><span className="truncate text-[var(--text-secondary)]" title={item.canonical || ''}>{item.canonical ? shortPath(item.canonical) : 'Not declared'}</span></div> }
function Metric({ label, value = 0, percent = 0, color }) { return <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4"><div className="flex items-end justify-between gap-2"><div><span className="text-[11px] font-bold uppercase tracking-[.06em] text-[var(--text-secondary)]">{label}</span><strong className="mt-1 block text-xl text-[var(--text)]">{value.toLocaleString()}</strong></div><span className="text-[11px] font-semibold text-[var(--text-secondary)]">{percent}%</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[.05]"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, percent)}%` }}/></div></div> }
function percentage(value = 0, total = 0) { return total ? Math.round((value / total) * 1000) / 10 : 0 }
function shortPath(value) { try { const url = new URL(value); return `${url.pathname}${url.search}` || '/' } catch { return value } }
