import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, ChevronDown, Info, RotateCw, ShieldAlert } from '../icons/heroicons'
import {
  COVERAGE_PRESENTATION,
  CRAWLER_BY_ID,
  CRAWLER_CATALOG,
  normalizeCoverage,
  presentMatchedRule
} from './utils/crawlerUtils'
import CrawlerLogo from './CrawlerLogo'

const badgeTone = {
  good: 'border-[var(--accent-teal)]/20 bg-[var(--accent-teal)]/10 text-[var(--status-good)]',
  warning: 'border-[var(--accent-amber)]/20 bg-[var(--accent-amber)]/10 text-[var(--status-warning)]',
  danger: 'border-[var(--accent-red)]/20 bg-[var(--accent-red)]/10 text-[var(--status-danger)]',
  neutral: 'border-[var(--border-strong)] bg-[var(--panel-raised)] text-[var(--text-secondary)]'
}

export default function CrawlerPermissions({ initialInspection, origin, onInspectionIssues, onShowIssue }) {
  const [selectedBotId, setSelectedBotId] = useState(CRAWLER_CATALOG[0].id)
  const [urlInput, setUrlInput] = useState(() => displayUrl(initialInspection?.url, origin) || '/')
  const [cache, setCache] = useState(() => initialInspection?.url ? { [normalizeUrl(initialInspection.url)]: initialInspection } : {})
  const [activeUrl, setActiveUrl] = useState(initialInspection?.url || '')
  const [testing, setTesting] = useState(false)
  const [requestError, setRequestError] = useState('')
  const requestRef = useRef('')

  const resolved = useMemo(() => resolveInput(urlInput, origin), [urlInput, origin])
  const currentInspection = activeUrl ? cache[normalizeUrl(activeUrl)] : null
  const tableInspection = currentInspection || initialInspection
  const selectedBot = CRAWLER_BY_ID[selectedBotId]
  const selectedResult = currentInspection?.bots?.[selectedBotId] || tableInspection?.bots?.[selectedBotId]

  const commitUrl = async () => {
    if (!resolved.url || resolved.error || testing) return
    const key = normalizeUrl(resolved.url)
    if (cache[key]) {
      setActiveUrl(cache[key].url)
      setRequestError('')
      onInspectionIssues?.(cache[key].issues || [], cache[key].url)
      return
    }
    if (requestRef.current === key) return
    requestRef.current = key
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
      const resultKey = normalizeUrl(result.url)
      setCache(current => ({ ...current, [resultKey]: result }))
      setActiveUrl(result.url)
      onInspectionIssues?.(result.issues || [], result.url)
    } catch (error) {
      setRequestError(error.message)
    } finally {
      requestRef.current = ''
      setTesting(false)
    }
  }

  const handleKeyDown = event => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    event.currentTarget.blur()
  }

  return (
    <section className="mt-4 min-w-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)]" aria-labelledby="crawler-access-title">
      <SectionHeader
        eyebrow="Diagnostic layer"
        title="Crawler Permissions"
        description="See how each search and AI crawler is treated for the inspected URL."
        id="crawler-access-title"
      />

      <div className="grid min-w-0 items-stretch xl:grid-cols-[minmax(0,1.72fr)_minmax(320px,.9fr)]">
        <div className="min-w-0 overflow-x-auto xl:border-r xl:border-[var(--border)]">
          <div className="hidden min-w-[720px] md:block">
            <div className="grid grid-cols-[minmax(150px,1.15fr)_minmax(130px,.95fr)_76px_108px_minmax(150px,1fr)_38px] gap-2 border-b border-[var(--border)] bg-[var(--bg-darker)]/45 px-3 py-2.5 text-[10px] font-bold uppercase tracking-[.07em] text-[var(--text-secondary)]">
              <span>Crawler</span><span>Purpose</span><span>Access</span><span>Coverage</span><span>Rule matched</span><span className="text-right">Line</span>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {CRAWLER_CATALOG.map(crawler => <PermissionRow key={crawler.id} crawler={crawler} result={tableInspection?.bots?.[crawler.id]} onShowIssue={onShowIssue} />)}
            </div>
          </div>
          <div className="divide-y divide-[var(--border)] md:hidden">
            {CRAWLER_CATALOG.map(crawler => <PermissionCard key={crawler.id} crawler={crawler} result={tableInspection?.bots?.[crawler.id]} onShowIssue={onShowIssue} />)}
          </div>
          <footer className="flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--border)] px-4 py-3 text-[10px] text-[var(--text-secondary)]">
            <Legend tone="bg-emerald-500" label="Allowed" detail="URL permitted" />
            <Legend tone="bg-amber-500" label="Partial" detail="Some site paths blocked" />
            <Legend tone="bg-rose-500" label="Blocked" detail="URL denied" />
            <Legend tone="bg-slate-500" label="Unknown" detail="Policy unavailable" />
          </footer>
        </div>

        <aside className="min-w-0 border-t border-[var(--border)] p-4 xl:border-t-0" aria-labelledby="bot-inspector-title">
          <div className="flex items-center justify-between gap-3">
            <h3 id="bot-inspector-title" className="m-0 text-[11px] font-bold uppercase tracking-[.09em] text-[var(--text)]">URL + Bot Inspector</h3>
            <details className="relative text-[10px] text-[var(--text-secondary)]">
              <summary className="cursor-pointer list-none font-semibold text-[var(--accent-blue)]">How it works</summary>
              <p className="absolute right-0 top-6 z-20 w-64 rounded-lg border border-[var(--border)] bg-[var(--panel-raised)] p-3 leading-4 shadow-xl">URL evidence is fetched on blur or Enter. Bot changes reuse the precomputed policy matrix and never impersonate crawler-vendor requests.</p>
            </details>
          </div>

          <label className="mt-4 block text-[10px] font-semibold text-[var(--text-secondary)]" htmlFor="crawler-test-url">URL</label>
          <div className="relative mt-1.5">
            <input id="crawler-test-url" value={urlInput} onChange={event => { setUrlInput(event.target.value); setRequestError('') }} onBlur={commitUrl} onKeyDown={handleKeyDown} className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-darker)] px-3 py-2.5 pr-9 text-xs text-[var(--text)] outline-none transition placeholder:text-[var(--faint)] focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10" placeholder="/products/example" />
            {testing && <RotateCw size={14} className="absolute right-3 top-3 animate-spin text-[var(--accent-blue)]" />}
          </div>
          {(resolved.error || requestError) && <p role="alert" className="mt-2 text-[11px] leading-4 text-[var(--status-danger)]">{resolved.error || requestError}</p>}

          <label className="mt-3 block text-[10px] font-semibold text-[var(--text-secondary)]" htmlFor="crawler-test-bot">Bot</label>
          <div className="relative mt-1.5 h-10">
            <span className="pointer-events-none absolute left-2 top-2 z-20"><CrawlerLogo company={selectedBot.company} size="sm" label={`${selectedBot.company} logo`} /></span>
            <select id="crawler-test-bot" value={selectedBotId} onChange={event => setSelectedBotId(event.target.value)} className="absolute inset-0 z-10 w-full cursor-pointer appearance-none rounded-md border border-[var(--border)] bg-transparent py-2.5 pl-10 pr-9 text-xs font-semibold text-[var(--text)] outline-none focus:border-sky-400/50 focus:ring-2 focus:ring-sky-400/10">
              {CRAWLER_CATALOG.map(crawler => <option key={crawler.id} value={crawler.id} className="bg-[#111721]">{crawler.name}</option>)}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-2.5 text-[var(--faint)]" />
          </div>

          {testing ? <InspectorSkeleton /> : selectedResult ? (
            <InspectorResult crawler={selectedBot} result={selectedResult} shared={(currentInspection || tableInspection)?.shared} onShowIssue={onShowIssue} />
          ) : <div className="mt-4 rounded-lg border border-dashed border-[var(--border)] p-4 text-center text-[11px] leading-5 text-[var(--text-secondary)]">Enter a same-site URL to inspect policy and page evidence.</div>}
        </aside>
      </div>
    </section>
  )
}

function SectionHeader({ eyebrow, title, description, id }) {
  return <header className="border-b border-[var(--border)] px-4 py-3.5"><p className="m-0 text-[10px] font-bold uppercase tracking-[.14em] text-[var(--accent-blue)]">{eyebrow}</p><h2 id={id} className="mt-1 text-base font-bold tracking-[-.02em] text-[var(--text)]">{title}</h2><p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">{description}</p></header>
}

function PermissionRow({ crawler, result, onShowIssue }) {
  const coverage = COVERAGE_PRESENTATION[normalizeCoverage(result?.coverage)]
  const rule = presentMatchedRule(result)
  return (
    <div className="grid grid-cols-[minmax(150px,1.15fr)_minmax(130px,.95fr)_76px_108px_minmax(150px,1fr)_38px] items-center gap-2 px-3 py-2 text-[11px] transition hover:bg-white/[.018]">
      <div className="flex min-w-0 items-center gap-2.5"><CrawlerLogo company={crawler.company} size="sm" label={`${crawler.company} logo`} /><strong className="truncate font-semibold text-[var(--text)]">{crawler.name}</strong></div>
      <span className="leading-4 text-[var(--text-secondary)]">{crawler.purpose}</span>
      <AccessBadge result={result} />
      <Pill label={coverage.label} tone={coverage.tone} />
      <button type="button" disabled={!result?.issueIds?.length} onClick={() => onShowIssue?.(result.issueIds[0])} className="min-w-0 text-left disabled:cursor-default"><span className="flex items-center gap-1.5 font-semibold text-[var(--text)]"><RuleIcon state={rule.state} /><span className="truncate">{rule.title}</span></span><span className="mt-0.5 block truncate pl-5 text-[10px] text-[var(--text-secondary)]">{rule.reason}</span></button>
      <span className="text-right font-mono text-[10px] text-[var(--text-secondary)]">{result?.matchedRule?.line || '—'}</span>
    </div>
  )
}

function PermissionCard({ crawler, result, onShowIssue }) {
  const coverage = COVERAGE_PRESENTATION[normalizeCoverage(result?.coverage)]
  const rule = presentMatchedRule(result)
  return <article className="p-4"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><CrawlerLogo company={crawler.company} label={`${crawler.company} logo`} /><div><strong className="text-xs text-[var(--text)]">{crawler.name}</strong><p className="mt-1 text-[10px] text-[var(--text-secondary)]">{crawler.purpose}</p></div></div><AccessBadge result={result} /></div><div className="mt-3 flex flex-wrap gap-2"><Pill label={coverage.label} tone={coverage.tone} /><button type="button" disabled={!result?.issueIds?.length} onClick={() => onShowIssue?.(result.issueIds[0])} className="text-left"><span className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text)]"><RuleIcon state={rule.state} />{rule.title}</span><span className="ml-5 block text-[10px] text-[var(--text-secondary)]">{rule.reason}</span></button></div></article>
}

function InspectorResult({ crawler, result, shared = {}, onShowIssue }) {
  const coverage = COVERAGE_PRESENTATION[normalizeCoverage(result.coverage)]
  const rule = presentMatchedRule(result)
  const allowed = result.access === 'allowed'
  const unknown = result.access === 'unknown'
  const verdict = unknown ? 'Unknown' : allowed ? 'Allowed' : 'Blocked'
  const recommendation = unknown ? 'Retry after robots.txt becomes reachable.' : !allowed ? 'Review the matched Disallow rule.' : shared.noindex ? 'Crawlable, but noindex prevents indexing.' : shared.httpStatus >= 400 ? 'Policy allows access, but the page response needs attention.' : 'Policy and page signals look good.'
  return <div className="mt-4 animate-[slideDown_180ms_ease-out] motion-reduce:animate-none"><div className="flex flex-wrap items-center gap-2"><span className="text-[9px] font-bold uppercase tracking-[.08em] text-[var(--text-secondary)]">Current result</span><Pill label={verdict} tone={unknown ? 'neutral' : allowed ? 'good' : 'danger'} /><span className="text-[11px] leading-4 text-[var(--text-secondary)]">{crawler.name} may {allowed ? '' : 'not '}request this URL according to the published robots.txt policy.</span></div><EvidenceGroup title="Policy decision"><Evidence label="Result" value={verdict} /><Evidence label="Matched rule" value={rule.title} /><Evidence label="Policy source" value={result.ruleSource === 'missing' ? 'robots.txt missing' : result.ruleSource} /><Evidence label="Site coverage" value={coverage.label} /></EvidenceGroup><EvidenceGroup title="Page evidence"><Evidence label="HTTP" value={shared.httpStatus ? `${shared.httpStatus} ${shared.httpStatus < 400 ? 'OK' : ''}` : 'No response'} /><Evidence label="In sitemap" value={shared.inSitemap ? 'Yes' : 'No'} /><Evidence label="Canonical" value={shared.canonical || 'Not declared'} truncate /><Evidence label="Indexable" value={shared.noindex ? 'No' : 'Yes'} /><Evidence label="Rendered text" value={shared.renderedTextAvailable ? `${(shared.renderedWordCount || 0).toLocaleString()} words` : 'Unavailable'} /></EvidenceGroup><div className="mt-2 rounded-lg border border-[var(--border)] p-3"><strong className="text-[10px] text-[var(--text)]">Recommendation</strong><p className="mt-1 text-[11px] leading-4 text-[var(--text-secondary)]">{recommendation}</p>{result.issueIds?.length > 0 && <button type="button" onClick={() => onShowIssue?.(result.issueIds[0])} className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-semibold text-[var(--status-warning)]"><AlertTriangle size={12} />View related issue</button>}</div></div>
}

function EvidenceGroup({ title, children }) { return <div className="mt-2 rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-3"><h4 className="m-0 text-[10px] font-bold text-[var(--text)]">{title}</h4><dl className="mt-2 grid grid-cols-[90px_minmax(0,1fr)] gap-y-1.5 text-[10px]">{children}</dl></div> }
function Evidence({ label, value, truncate }) { return <><dt className="text-[var(--text-secondary)]">{label}</dt><dd className={`m-0 text-[var(--text)] ${truncate ? 'truncate' : ''}`} title={truncate ? value : undefined}>{value}</dd></> }
function AccessBadge({ result }) { const tone = result?.access === 'blocked' ? 'danger' : result?.access === 'unknown' ? 'neutral' : 'good'; const label = result?.access === 'blocked' ? 'Blocked' : result?.access === 'unknown' ? 'Unknown' : 'Allowed'; return <Pill label={label} tone={tone} /> }
function Pill({ label, tone = 'neutral' }) { return <span className={`inline-flex min-h-6 w-fit items-center rounded-full border px-2 text-[9px] font-bold ${badgeTone[tone]}`}>{label}</span> }
function RuleIcon({ state }) { return state === 'explicit_disallow' ? <ShieldAlert size={14} className="shrink-0 text-[var(--status-danger)]" /> : state === 'explicit_allow' ? <Check size={14} className="shrink-0 text-[var(--status-good)]" /> : <Info size={14} className="shrink-0 text-[var(--status-info)]" /> }
function Legend({ tone, label, detail }) { return <span className="inline-flex items-center gap-1.5"><span className={`size-1.5 rounded-full ${tone}`} /><strong className="text-[var(--text)]">{label}</strong><span>{detail}</span></span> }
function InspectorSkeleton() { return <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--panel-raised)] p-4"><span className="text-[10px] font-semibold uppercase tracking-[.06em] text-[var(--text-secondary)]">Checking URL evidence</span><p className="mt-2 text-[11px] text-[var(--text-secondary)]">Preparing policy, HTTP, sitemap, canonical, and rendered-text signals.</p></div> }

function displayUrl(url, origin) {
  if (!url) return ''
  try { const parsed = new URL(url); return parsed.origin === origin ? `${parsed.pathname}${parsed.search}` : parsed.href } catch { return url }
}
function resolveInput(value, origin) {
  if (!value.trim()) return { url: '', error: 'Enter a URL or path to inspect.' }
  try { const url = new URL(value.trim(), origin); if (url.origin !== origin) return { url: '', error: 'Use a URL on the analyzed site.' }; if (!['http:', 'https:'].includes(url.protocol)) return { url: '', error: 'Only HTTP and HTTPS URLs can be inspected.' }; return { url: url.href, error: '' } } catch { return { url: '', error: 'Enter a valid URL or path.' } }
}
function normalizeUrl(value) {
  try { const url = new URL(value); return `${url.origin}${url.pathname.replace(/\/+$/, '') || '/'}${url.search}` } catch { return value || '' }
}
