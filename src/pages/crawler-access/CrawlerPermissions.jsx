import { useMemo, useState } from 'react'
import { AlertTriangle, Check, ChevronDown, FlaskConical, RotateCw, ShieldAlert } from 'lucide-react'
import { CRAWLER_BY_ID, CRAWLER_CATALOG } from './crawlerUtils'
import CrawlerLogo from './CrawlerLogo'

const accessTone = {
  allowed: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  blocked: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
  unknown: 'border-slate-500/30 bg-slate-500/10 text-slate-400'
}
const coverageLabel = { full: 'Full', partial: 'Partial', none: 'None', unknown: 'Unknown' }

export default function CrawlerPermissions({ initialInspection, origin, onInspectionIssues, onShowIssue }) {
  const [selectedBotId, setSelectedBotId] = useState(CRAWLER_CATALOG[0].id)
  const [urlInput, setUrlInput] = useState(() => displayUrl(initialInspection?.url, origin))
  const [cache, setCache] = useState(() => initialInspection?.url ? { [normalizeUrl(initialInspection.url)]: initialInspection } : {})
  const [testing, setTesting] = useState(false)
  const [requestError, setRequestError] = useState('')

  const resolved = useMemo(() => resolveInput(urlInput, origin), [urlInput, origin])
  const currentInspection = resolved.url ? cache[normalizeUrl(resolved.url)] : null
  const tableInspection = currentInspection || initialInspection
  const selectedBot = CRAWLER_BY_ID[selectedBotId]
  const selectedResult = currentInspection?.bots?.[selectedBotId]

  const runInspection = async () => {
    if (!resolved.url || resolved.error || testing) return
    setTesting(true)
    setRequestError('')
    try {
      const response = await fetch('/api/crawler/test-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: resolved.url, origin })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'URL inspection failed')
      const key = normalizeUrl(result.url)
      setCache(current => ({ ...current, [key]: result }))
      onInspectionIssues?.(result.issues || [], result.url)
    } catch (error) {
      setRequestError(error.message)
    } finally {
      setTesting(false)
    }
  }

  const handleUrlChange = event => {
    setUrlInput(event.target.value)
    setRequestError('')
    const next = resolveInput(event.target.value, origin)
    const cached = next.url ? cache[normalizeUrl(next.url)] : null
    const isInitial = next.url && normalizeUrl(next.url) === normalizeUrl(initialInspection?.url)
    onInspectionIssues?.(isInitial ? [] : cached?.issues || [], cached?.url || null)
  }

  return (
    <section className="grid min-w-0 items-stretch gap-4 xl:grid-cols-[minmax(0,1.72fr)_minmax(320px,.9fr)]" aria-labelledby="crawler-access-title">
      <div className="h-full min-w-0 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--panel)]">
        <header className="border-b border-[var(--border)] px-5 py-4">
          <p className="m-0 text-[10px] font-bold uppercase tracking-[.12em] text-[var(--accent)]">Diagnostic Layer</p>
          <div className="mt-1.5 flex items-center justify-between gap-4">
            <div>
              <h2 id="crawler-access-title" className="m-0 text-base font-bold tracking-[-.02em] text-[var(--text)]">1. Crawler Permissions</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">How each crawler is treated by robots.txt for the inspected URL.</p>
            </div>
            <span className="shrink-0 rounded-full border border-sky-400/20 bg-sky-400/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.08em] text-sky-300">10 agents</span>
          </div>
        </header>

        <div className="hidden min-w-[630px] md:block">
          <div className="grid grid-cols-[minmax(150px,1.1fr)_minmax(110px,.8fr)_70px_60px_minmax(120px,1fr)_30px] gap-2 border-b border-[var(--border)] bg-black/10 px-3 py-2.5 text-[9px] font-bold uppercase tracking-[.07em] text-[var(--faint)]">
            <span>Crawler</span><span>Purpose</span><span>Access</span><span>Coverage</span><span>Rule matched</span><span className="text-right">Line</span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {CRAWLER_CATALOG.map(crawler => <PermissionRow key={crawler.id} crawler={crawler} result={tableInspection?.bots?.[crawler.id]} onShowIssue={onShowIssue} />)}
          </div>
        </div>

        <div className="divide-y divide-[var(--border)] md:hidden">
          {CRAWLER_CATALOG.map(crawler => <PermissionCard key={crawler.id} crawler={crawler} result={tableInspection?.bots?.[crawler.id]} onShowIssue={onShowIssue} />)}
        </div>

        <footer className="flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--border)] px-4 py-3 text-[10px] text-[var(--faint)]">
          <Legend tone="bg-emerald-400" label="Allowed" detail="URL permitted" />
          <Legend tone="bg-amber-400" label="Partial" detail="Some site paths blocked" />
          <Legend tone="bg-rose-400" label="Blocked" detail="URL denied" />
          <Legend tone="bg-slate-500" label="Unknown" detail="Policy unavailable" />
        </footer>
      </div>

      <aside className="h-full min-w-0 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-5" aria-labelledby="bot-inspector-title">
        <div className="flex items-center gap-2">
          <FlaskConical size={15} className="text-sky-300" />
          <h2 id="bot-inspector-title" className="m-0 text-xs font-bold uppercase tracking-[.08em] text-[var(--text)]">URL + Bot Inspector</h2>
        </div>

        <label className="mt-5 block text-[10px] font-semibold text-[var(--muted)]" htmlFor="crawler-test-url">URL</label>
        <input id="crawler-test-url" value={urlInput} onChange={handleUrlChange} className="mt-2 w-full rounded-md border border-[var(--border)] bg-[var(--bg-darker)] px-3 py-2.5 text-xs text-[var(--text)] outline-none transition placeholder:text-[var(--faint)] focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10" placeholder="/products/example" />
        {(resolved.error || requestError) && <p role="alert" className="mt-2 text-[10px] leading-4 text-rose-300">{resolved.error || requestError}</p>}

        <label className="mt-4 block text-[10px] font-semibold text-[var(--muted)]" htmlFor="crawler-test-bot">Bot</label>
        <div className="relative mt-2 h-10">
          <span className="pointer-events-none absolute left-2 top-2 z-20"><CrawlerLogo company={selectedBot.company} size="sm" label={`${selectedBot.company} logo`} /></span>
          <select id="crawler-test-bot" value={selectedBotId} onChange={event => setSelectedBotId(event.target.value)} className="absolute inset-0 z-10 w-full cursor-pointer appearance-none rounded-md border border-[var(--border)] bg-transparent py-2.5 pl-10 pr-9 text-xs font-semibold text-[var(--text)] outline-none focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10">
            {CRAWLER_CATALOG.map(crawler => <option key={crawler.id} value={crawler.id} className="bg-[#111721]">{crawler.name}</option>)}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-2.5 text-[var(--faint)]" />
        </div>
        <p className="mt-2 text-[10px] leading-4 text-[var(--faint)]">{selectedBot.description}</p>

        <button type="button" onClick={runInspection} disabled={testing || !!currentInspection || !!resolved.error} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-blue-400/20 bg-blue-500 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-blue-400 disabled:cursor-default disabled:border-[var(--border)] disabled:bg-[var(--panel-raised)] disabled:text-[var(--faint)]">
          {testing ? <><RotateCw size={13} className="animate-spin" /> Testing access…</> : currentInspection ? <><Check size={13} /> Results current</> : 'Test Access'}
        </button>

        {testing ? <InspectorSkeleton /> : selectedResult ? (
          <InspectorResult crawler={selectedBot} result={selectedResult} shared={currentInspection.shared} onShowIssue={onShowIssue} />
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-[var(--border)] px-4 py-6 text-center text-[10px] leading-4 text-[var(--faint)]">Run the test to build policy and page evidence for this URL.</div>
        )}

        <details className="mt-4 border-t border-[var(--border)] pt-3 text-[9px] text-[var(--faint)]">
          <summary className="cursor-pointer font-semibold text-sky-300">How to use this inspector</summary>
          <ol className="mt-2 space-y-1.5 pl-4 leading-4"><li>Select a bot to swap its precomputed robots.txt policy instantly.</li><li>Edit the relative or same-origin URL, then choose Test Access.</li><li>Read bot-specific policy separately from shared HTTP, canonical, sitemap, noindex, and content evidence.</li></ol>
          <p className="mt-2 leading-4">This is a policy inspection using a neutral fetch. It does not impersonate or verify a request from the crawler vendor.</p>
        </details>
      </aside>
    </section>
  )
}

function PermissionRow({ crawler, result, onShowIssue }) {
  const matched = formatRule(result?.matchedRule)
  return (
    <div className="grid grid-cols-[minmax(150px,1.1fr)_minmax(110px,.8fr)_70px_60px_minmax(120px,1fr)_30px] items-center gap-2 px-3 py-3 text-[11px] transition hover:bg-white/[.015]">
      <div className="flex min-w-0 items-center gap-2.5"><CrawlerLogo company={crawler.company} size="sm" label={`${crawler.company} logo`} /><div className="min-w-0"><strong className="block truncate font-semibold text-[var(--text)]">{crawler.name}</strong>{crawler.category === 'control' && <span className="text-[8px] uppercase tracking-wide text-amber-300">Control token</span>}</div></div>
      <span className="truncate text-[10px] text-[var(--muted)]">{crawler.purpose}</span>
      <StatusBadge access={result?.access} coverage={result?.coverage} />
      <span className="text-[10px] text-[var(--muted)]">{coverageLabel[result?.coverage] || '—'}</span>
      <button type="button" disabled={!result?.issueIds?.length} onClick={() => onShowIssue?.(result.issueIds[0])} className="flex min-w-0 items-center gap-1.5 truncate text-left font-mono text-[10px] text-[var(--muted)] disabled:cursor-default enabled:text-amber-300 enabled:hover:text-amber-200"><span className="truncate">{matched}</span>{result?.issueIds?.length > 0 && <AlertTriangle size={11} className="shrink-0" />}</button>
      <span className="text-right font-mono text-[10px] text-[var(--faint)]">{result?.matchedRule?.line || '—'}</span>
    </div>
  )
}

function PermissionCard({ crawler, result, onShowIssue }) {
  return <div className="p-4"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><CrawlerLogo company={crawler.company} label={`${crawler.company} logo`} /><div><strong className="text-xs text-[var(--text)]">{crawler.name}</strong><p className="mt-1 text-[10px] text-[var(--muted)]">{crawler.purpose}</p></div></div><StatusBadge access={result?.access} coverage={result?.coverage} /></div><div className="mt-3 grid grid-cols-[70px_1fr] gap-y-1.5 text-[10px]"><span className="text-[var(--faint)]">Coverage</span><span className="text-[var(--muted)]">{coverageLabel[result?.coverage] || '—'}</span><span className="text-[var(--faint)]">Rule</span><button type="button" disabled={!result?.issueIds?.length} onClick={() => onShowIssue?.(result.issueIds[0])} className="truncate text-left font-mono text-[var(--muted)] enabled:text-amber-300">{formatRule(result?.matchedRule)}</button></div></div>
}

function InspectorResult({ crawler, result, shared, onShowIssue }) {
  const allowed = result.access === 'allowed'
  const unknown = result.access === 'unknown'
  const verdict = unknown ? 'Unknown' : allowed ? 'Allowed' : 'Blocked'
  const recommendation = unknown ? 'Retry after robots.txt becomes reachable.' : !allowed ? 'Review the matched Disallow rule.' : shared.noindex ? 'Crawlable, but noindex prevents indexing.' : shared.httpStatus >= 400 ? 'Robots permits access, but the server response needs attention.' : 'Policy and page signals look good.'
  return (
    <div className="mt-4 animate-[slideDown_180ms_ease-out] motion-reduce:animate-none">
      <div className={`rounded-lg border p-3 ${accessTone[result.access] || accessTone.unknown}`}>
        <div className="flex items-center gap-2">{allowed ? <Check size={16} /> : <ShieldAlert size={16} />}<strong className="text-xs uppercase tracking-[.06em]">{verdict}</strong></div>
        <p className="mt-1 text-[10px] opacity-80">{crawler.name} is {unknown ? 'not currently verifiable for' : allowed ? 'permitted to request' : 'blocked from'} this URL by robots.txt.</p>
      </div>
      <div className="mt-3 rounded-lg border border-[var(--border)] bg-black/10 p-3">
        <h3 className="m-0 text-[9px] font-bold uppercase tracking-[.09em] text-[var(--faint)]">Bot-specific policy</h3>
        <dl className="mt-2 grid grid-cols-[90px_minmax(0,1fr)_44px] gap-x-3 gap-y-2 text-[10px]"><dt className="text-[var(--faint)]">Matching rule</dt><dd className="m-0 truncate font-mono text-[var(--text)]">{formatRule(result.matchedRule)}</dd><dd className="m-0 text-right font-mono text-[var(--muted)]">{result.matchedRule?.line || '—'}</dd><dt className="text-[var(--faint)]">Rule source</dt><dd className="col-span-2 m-0 capitalize text-[var(--muted)]">{result.ruleSource}</dd><dt className="text-[var(--faint)]">Site coverage</dt><dd className="col-span-2 m-0 text-[var(--muted)]">{coverageLabel[result.coverage]}</dd></dl>
        {result.issueIds?.length > 0 && <button type="button" onClick={() => onShowIssue?.(result.issueIds[0])} className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-semibold text-amber-300 hover:text-amber-200"><AlertTriangle size={11} /> View related issue</button>}
      </div>
      <div className="mt-3 rounded-lg border border-[var(--border)] p-3">
        <h3 className="m-0 text-[9px] font-bold uppercase tracking-[.09em] text-[var(--faint)]">Shared URL evidence</h3>
        <dl className="mt-2 grid grid-cols-[88px_1fr] gap-y-2 text-[10px]"><Evidence label="HTTP status" value={shared.httpStatus || 'No response'} tone={shared.httpStatus >= 200 && shared.httpStatus < 400 ? 'good' : 'bad'} /><Evidence label="In sitemap" value={shared.inSitemap ? 'Yes' : 'No'} /><Evidence label="Canonical" value={shared.canonical || 'Not declared'} truncate /><Evidence label="noindex" value={shared.noindex ? 'Yes' : 'No'} tone={shared.noindex ? 'bad' : 'good'} /><Evidence label="Rendered text" value={shared.renderedTextAvailable ? `${shared.renderedWordCount.toLocaleString()} words` : 'Unavailable'} tone={shared.renderedTextAvailable ? 'good' : 'bad'} /><Evidence label="Recommendation" value={recommendation} tone={recommendation.includes('good') ? 'good' : undefined} /></dl>
      </div>
    </div>
  )
}

function Evidence({ label, value, tone, truncate }) {
  return <><dt className="text-[var(--faint)]">{label}</dt><dd className={`m-0 ${truncate ? 'truncate' : ''} ${tone === 'good' ? 'text-emerald-300' : tone === 'bad' ? 'text-rose-300' : 'text-[var(--muted)]'}`} title={truncate ? value : undefined}>{value}</dd></>
}

function StatusBadge({ access = 'unknown', coverage }) {
  const label = access === 'unknown' ? 'Unknown' : access === 'blocked' ? 'Blocked' : coverage === 'partial' ? 'Limited' : 'Allowed'
  const tone = access === 'blocked' ? accessTone.blocked : access === 'unknown' ? accessTone.unknown : coverage === 'partial' ? 'border-amber-400/20 bg-amber-400/10 text-amber-300' : accessTone.allowed
  return <span className={`inline-flex w-fit rounded px-2 py-1 text-[8px] font-bold uppercase tracking-[.05em] ${tone}`}>{label}</span>
}

function Legend({ tone, label, detail }) {
  return <span className="inline-flex items-center gap-1.5"><span className={`size-1.5 rounded-full ${tone}`} /><strong className="text-[var(--muted)]">{label}</strong><span>{detail}</span></span>
}

function InspectorSkeleton() {
  return <div className="mt-4 grid animate-pulse gap-3"><div className="h-16 rounded-lg bg-white/[.035]" /><div className="h-28 rounded-lg bg-white/[.035]" /><div className="h-36 rounded-lg bg-white/[.035]" /></div>
}

function formatRule(rule) {
  if (!rule) return 'Allowed by default'
  return `${rule.type === 'allow' ? 'Allow' : 'Disallow'}: ${rule.path}`
}

function displayUrl(url, origin) {
  if (!url) return ''
  try {
    const parsed = new URL(url)
    return parsed.origin === origin ? `${parsed.pathname}${parsed.search}` : parsed.href
  } catch {
    return url
  }
}

function resolveInput(value, origin) {
  if (!value.trim()) return { url: '', error: 'Enter a URL or path to inspect.' }
  try {
    const url = new URL(value.trim(), origin)
    if (url.origin !== origin) return { url: '', error: 'Use a URL on the analyzed site.' }
    if (!['http:', 'https:'].includes(url.protocol)) return { url: '', error: 'Only HTTP and HTTPS URLs can be inspected.' }
    return { url: url.href, error: '' }
  } catch {
    return { url: '', error: 'Enter a valid URL or path.' }
  }
}

function normalizeUrl(value) {
  try {
    const url = new URL(value)
    return `${url.origin}${url.pathname.replace(/\/+$/, '') || '/'}${url.search}`
  } catch {
    return value || ''
  }
}
