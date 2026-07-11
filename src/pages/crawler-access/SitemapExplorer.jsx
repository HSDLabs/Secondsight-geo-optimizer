import { useMemo, useState } from 'react'
import { AlertCircle, ExternalLink, Search, ShieldX } from 'lucide-react'

const statusTone = {
  indexable: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  noindex: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  blocked: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
  error: 'border-red-400/20 bg-red-400/10 text-red-300',
  unverified: 'border-slate-500/30 bg-slate-500/10 text-slate-400'
}

export default function SitemapExplorer({ sitemaps }) {
  const [activeSitemap, setActiveSitemap] = useState('all')
  const [status, setStatus] = useState('all')
  const [query, setQuery] = useState('')
  const [visible, setVisible] = useState(20)
  const urls = useMemo(() => sitemaps?.urls || [], [sitemaps?.urls])
  const validSitemaps = (sitemaps?.discovered || []).filter(item => item.ok)
  const summary = sitemaps?.summary || { total: urls.length, indexable: 0, noindex: 0, blocked: 0, errors: 0, unverified: urls.length, inspected: 0, inspectedPercentage: 0 }
  const filtered = useMemo(() => urls.filter(item => (activeSitemap === 'all' || item.source === activeSitemap) && (status === 'all' || item.classification === status) && (!query || item.loc.toLowerCase().includes(query.toLowerCase()))), [urls, activeSitemap, status, query])

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)]" aria-labelledby="sitemap-explorer-title">
      <header className="border-b border-[var(--border)] px-5 py-4"><p className="m-0 text-[10px] font-bold uppercase tracking-[.12em] text-[var(--accent)]">Discovery inventory</p><h2 id="sitemap-explorer-title" className="mt-1.5 text-sm font-bold uppercase tracking-[.05em] text-[var(--text)]">3. Sitemap Explorer</h2><p className="mt-1 text-xs text-[var(--muted)]">Filter discovered URLs and separate verified page signals from uninspected entries.</p></header>

      {validSitemaps.length === 0 ? <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center"><ShieldX size={28} className="text-[var(--faint)]"/><h3 className="mt-3 text-sm font-semibold text-[var(--text)]">No valid sitemap found</h3><p className="mt-1 max-w-md text-xs leading-5 text-[var(--muted)]">Add a sitemap and reference it from robots.txt so important pages can be discovered consistently.</p></div> : <>
        <div className="flex gap-2 overflow-x-auto border-b border-[var(--border)] px-4 py-3">
          <SitemapTab active={activeSitemap === 'all'} onClick={() => { setActiveSitemap('all'); setVisible(20) }} label={`All sitemaps (${validSitemaps.length})`}/>
          {validSitemaps.map(item => <SitemapTab key={item.url} active={activeSitemap === item.url} onClick={() => { setActiveSitemap(item.url); setVisible(20) }} label={shortPath(item.url)} detail={`${item.urlCount ?? item.childCount ?? 0}`}/>) }
        </div>

        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1"><span className="sr-only">Search sitemap URLs</span><Search size={13} className="absolute left-3 top-2.5 text-[var(--faint)]"/><input value={query} onChange={event => { setQuery(event.target.value); setVisible(20) }} placeholder="Search discovered URLs" className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-darker)] py-2 pl-9 pr-3 text-[10px] text-[var(--text)] outline-none focus:border-sky-400/50"/></label>
          <select value={status} onChange={event => { setStatus(event.target.value); setVisible(20) }} className="rounded-md border border-[var(--border)] bg-[var(--bg-darker)] px-3 py-2 text-[10px] text-[var(--text)] outline-none focus:border-sky-400/50"><option value="all">All statuses</option><option value="indexable">Indexable</option><option value="noindex">Noindex</option><option value="blocked">Blocked</option><option value="error">Error</option><option value="unverified">Unverified</option></select>
        </div>

        <div className="max-h-[390px] overflow-auto">
          <div className="hidden min-w-[650px] grid-cols-[minmax(260px,1fr)_60px_90px_78px_minmax(140px,.7fr)] gap-3 border-b border-[var(--border)] bg-black/10 px-4 py-2.5 text-[9px] font-bold uppercase tracking-[.07em] text-[var(--faint)] md:grid"><span>URL</span><span>HTTP</span><span>Status</span><span>Robots</span><span>Canonical</span></div>
          <div className="divide-y divide-[var(--border)]">
            {filtered.slice(0, visible).map(item => <SitemapRow key={`${item.source}-${item.loc}`} item={item}/>) }
            {!filtered.length && <p className="m-0 px-5 py-10 text-center text-xs text-[var(--faint)]">No URLs match the current filters.</p>}
          </div>
        </div>
        {visible < filtered.length && <div className="border-t border-[var(--border)] p-3 text-center"><button type="button" onClick={() => setVisible(value => value + 30)} className="rounded-md border border-[var(--border)] px-4 py-2 text-[10px] font-semibold text-sky-300 hover:bg-white/[.03]">Show 30 more</button></div>}

        <div className="border-t border-[var(--border)] bg-black/[.08] p-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Total URLs" value={summary.total} percent={100} color="bg-sky-400"/><Metric label="Indexable" value={summary.indexable} percent={percentage(summary.indexable, summary.total)} color="bg-emerald-400"/><Metric label="Noindex" value={summary.noindex} percent={percentage(summary.noindex, summary.total)} color="bg-amber-400"/><Metric label="Blocked" value={summary.blocked} percent={percentage(summary.blocked, summary.total)} color="bg-rose-400"/></div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[9px] text-[var(--faint)]"><span>{summary.inspected?.toLocaleString()} of {summary.total?.toLocaleString()} URLs classified ({summary.inspectedPercentage}%). {summary.unverified?.toLocaleString()} remain unverified.</span>{sitemaps?.responseCapped && <span className="inline-flex items-center gap-1 text-amber-300"><AlertCircle size={10}/>Table response capped at 500 rows</span>}</div>
        </div>
      </>}
    </section>
  )
}

function SitemapRow({ item }) { return <div className="grid gap-2 px-4 py-3 text-[10px] md:min-w-[650px] md:grid-cols-[minmax(260px,1fr)_60px_90px_78px_minmax(140px,.7fr)] md:items-center md:gap-3"><a href={item.loc} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-1.5 truncate text-[var(--text)] hover:text-sky-300"><span className="truncate">{shortPath(item.loc)}</span><ExternalLink size={9} className="shrink-0 opacity-50"/></a><span className="text-[var(--muted)]">{item.httpStatus || '—'}</span><span className={`w-fit rounded-full border px-2 py-1 text-[8px] font-bold uppercase tracking-[.04em] ${statusTone[item.classification] || statusTone.unverified}`}>{item.classification || 'unverified'}</span><span className={item.robotsAccess === 'blocked' ? 'text-rose-300' : 'text-[var(--muted)]'}>{item.robotsAccess || 'unknown'}</span><span className="truncate text-[var(--faint)]" title={item.canonical || ''}>{item.canonical ? shortPath(item.canonical) : 'Not declared'}</span></div> }
function SitemapTab({ active, onClick, label, detail }) { return <button type="button" onClick={onClick} className={`shrink-0 rounded-md border px-3 py-2 text-[9px] font-semibold ${active ? 'border-sky-400/30 bg-sky-400/10 text-sky-300' : 'border-[var(--border)] text-[var(--muted)] hover:bg-white/[.03]'}`}>{label}{detail && <span className="ml-2 text-[var(--faint)]">{detail}</span>}</button> }
function Metric({ label, value = 0, percent = 0, color }) { return <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3"><div className="flex items-end justify-between gap-2"><div><span className="text-[9px] font-bold uppercase tracking-[.06em] text-[var(--faint)]">{label}</span><strong className="mt-1 block text-lg text-[var(--text)]">{value.toLocaleString()}</strong></div><span className="text-[10px] font-semibold text-[var(--muted)]">{percent}%</span></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[.05]"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, percent)}%` }}/></div></div> }
function percentage(value = 0, total = 0) { return total ? Math.round((value / total) * 1000) / 10 : 0 }
function shortPath(value) { try { const url = new URL(value); return `${url.pathname}${url.search}` || '/' } catch { return value } }
