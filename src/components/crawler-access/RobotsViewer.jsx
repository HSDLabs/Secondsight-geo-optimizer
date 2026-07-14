import { useMemo, useState } from 'react'
import { AlertTriangle, Check, CheckCircle2, Download, ExternalLink, FileCode2, Info } from '../icons/heroicons'

const lineTone = {
  'user-agent': 'text-sky-300', allow: 'text-emerald-300', disallow: 'text-rose-300',
  sitemap: 'text-violet-300', 'crawl-delay': 'text-amber-300', comment: 'text-slate-500',
  invalid: 'text-rose-300', unknown: 'text-amber-200', blank: 'text-slate-600'
}

export default function RobotsViewer({ robots, sitemaps, origin, onShowIssue }) {
  const analysis = robots?.analysis
  const summary = analysis?.summary || {}
  const lines = analysis?.lines || []

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)]" aria-labelledby="robots-viewer-title">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
        <div><p className="m-0 text-[11px] font-bold uppercase tracking-[.14em] text-[var(--accent-blue)]">Policy source</p><h2 id="robots-viewer-title" className="mt-2 text-base font-bold text-[var(--text)]">2. Robots.txt Analyzer</h2><p className="mt-1 text-[13px] text-[var(--text-secondary)]">See crawler rules, their scope, and source-line problems without reading raw policy unaided.</p></div>
        {robots?.found && <a href={robots.url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 text-[12px] font-semibold text-[var(--accent-blue)] hover:text-blue-200">View full robots.txt <ExternalLink size={15} /></a>}
      </header>

      {!robots?.found ? <EmptyRobots robots={robots} sitemaps={sitemaps} origin={origin} /> : (
        <div className="grid min-w-0 lg:grid-cols-[minmax(0,1.55fr)_minmax(220px,.7fr)]">
          <div className="min-w-0 border-b border-[var(--border)] lg:border-b-0 lg:border-r">
            <div className="max-h-[430px] overflow-auto bg-[var(--bg-darker)] py-3 font-mono text-[12px] leading-6">
              {lines.map(line => <RobotLine key={line.number} line={line} onShowIssue={onShowIssue} />)}
            </div>
            <div className="flex flex-wrap gap-4 border-t border-[var(--border)] px-4 py-3 text-[11px] text-[var(--text-secondary)]">
              <Legend color="bg-emerald-400" label="Allow"/><Legend color="bg-rose-400" label="Disallow"/><Legend color="bg-slate-500" label="Comment"/><Legend color="bg-amber-400" label="Needs attention"/>
            </div>
          </div>
          <aside className="p-5">
            <div className="flex items-center gap-2"><FileCode2 size={14} className="text-sky-300"/><h3 className="m-0 text-[11px] font-bold uppercase tracking-[.08em] text-[var(--text)]">Rules Summary</h3></div>
            <dl className="mt-4 space-y-3">
              <Summary label="Total rules" value={summary.totalRules}/><Summary label="User-agent groups" value={summary.userAgentGroups}/><Summary label="Allow rules" value={summary.allowRules} tone="text-emerald-300"/><Summary label="Disallow rules" value={summary.disallowRules} tone="text-rose-300"/><Summary label="Comments" value={summary.comments}/><Summary label="Sitemap directives" value={summary.sitemapDirectives}/><Summary label="Crawl-delay" value={summary.crawlDelay || 'None'}/><Summary label="Last modified" value={formatDate(summary.lastModified)}/>
            </dl>
            <div className={`mt-5 rounded-lg border p-3 ${analysis.issues?.length ? 'border-amber-400/20 bg-amber-400/[.06]' : 'border-emerald-400/20 bg-emerald-400/[.06]'}`}>
              <div className="flex items-center gap-2">{analysis.issues?.length ? <AlertTriangle size={16} className="text-amber-100"/> : <CheckCircle2 size={16} className="text-emerald-100"/>}<strong className="text-[12px] text-[var(--text)]">{analysis.issues?.length ? `${analysis.issues.length} item${analysis.issues.length === 1 ? '' : 's'} to review` : 'No syntax problems detected'}</strong></div>
              <p className="mt-1 text-[11px] leading-5 text-[var(--text-secondary)]">Warnings are linked to the same grouped issue records used in the action queue.</p>
            </div>
          </aside>
        </div>
      )}
    </section>
  )
}

function EmptyRobots({ robots, sitemaps, origin }) {
  const [draftVisible, setDraftVisible] = useState(false)
  const [copied, setCopied] = useState(false)
  const draft = useMemo(() => buildStarterRobots(origin, sitemaps), [origin, sitemaps])
  const fetchFailed = Boolean(robots?.error || (robots?.status && robots.status !== 404))

  const copyDraft = async () => {
    await navigator.clipboard.writeText(draft)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const downloadDraft = () => {
    const url = URL.createObjectURL(new Blob([draft], { type: 'text/plain;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'robots.txt'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return <div>
    <div className="grid gap-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(260px,.9fr)]">
      <div className="border-b border-[var(--border)] p-6 lg:border-b-0 lg:border-r">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl border border-amber-300/20 bg-amber-300/[.07] text-amber-200"><FileCode2 size={20}/></span><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold text-[var(--text)]">{fetchFailed ? 'robots.txt could not be verified' : 'No robots.txt file found'}</h3><span className="rounded-full border border-amber-300/20 bg-amber-300/[.08] px-2 py-1 text-[9px] font-bold uppercase tracking-[.08em] text-amber-100">{fetchFailed ? 'Unavailable' : 'Missing'}</span></div><p className="mt-2 max-w-xl text-[12px] leading-5 text-[var(--text-secondary)]">{fetchFailed ? `The policy request failed${robots?.error ? `: ${robots.error}` : ''}. Crawler access remains unknown until the file can be fetched.` : 'Without this file, crawlers normally receive default permission. A small explicit policy can document access and point crawlers to verified sitemaps.'}</p></div></div>
          <button type="button" onClick={() => setDraftVisible(value => !value)} className="min-h-10 shrink-0 rounded-lg bg-[var(--accent-blue)] px-4 text-[12px] font-semibold text-white transition hover:brightness-110">{draftVisible ? 'Hide starter draft' : 'Create starter draft'}</button>
        </div>
        <div className="mt-5 flex items-start gap-2 rounded-lg border border-sky-300/15 bg-sky-300/[.045] p-3 text-[11px] leading-5 text-[var(--text-secondary)]"><Info size={16} className="mt-0.5 shrink-0 text-sky-300"/><p>This creates a local draft only. Review it with the site owner and publish it at <strong className="text-[var(--text)]">/robots.txt</strong>; SecondSight never changes the website.</p></div>
      </div>
      <div className="p-6"><p className="text-[11px] font-bold uppercase tracking-[.08em] text-[var(--text)]">Recommended starting point</p><ol className="mt-4 space-y-3 text-[12px] leading-5 text-[var(--text-secondary)]"><Step number="1" text="Allow public content unless there is a deliberate policy reason to restrict it."/><Step number="2" text="Add only verified sitemap URLs; do not advertise missing files."/><Step number="3" text="Review private, account, checkout, and search-result paths before publishing."/></ol></div>
    </div>
    {draftVisible && <div className="border-t border-[var(--border)] bg-[var(--bg-darker)]/45 p-5 animate-[slideDown_180ms_ease-out] motion-reduce:animate-none"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-[12px] font-bold uppercase tracking-[.08em] text-[var(--text)]">Starter robots.txt</h3><p className="mt-1 text-[11px] text-[var(--text-secondary)]">Generated deterministically from verified sitemap results.</p></div><div className="flex gap-2"><button type="button" onClick={copyDraft} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-[12px] font-semibold text-[var(--text)] hover:bg-white/[.03]">{copied ? <Check size={15} className="text-emerald-300"/> : <FileCode2 size={15}/>} {copied ? 'Copied' : 'Copy'}</button><button type="button" onClick={downloadDraft} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-[12px] font-semibold text-[var(--text)] hover:bg-white/[.03]"><Download size={15}/>Download</button></div></div><pre className="mt-4 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--bg-darker)] p-4 font-mono text-[12px] leading-6 text-[var(--text)]">{draft}</pre></div>}
  </div>
}

function RobotLine({ line, onShowIssue }) {
  const hasIssue = line.issueIds?.length > 0
  return <div className={`group grid min-w-max grid-cols-[42px_minmax(430px,1fr)_24px] border-l-2 px-2 ${hasIssue ? line.severity === 'critical' ? 'border-rose-400 bg-rose-400/[.06]' : 'border-amber-400 bg-amber-400/[.05]' : 'border-transparent hover:bg-white/[.02]'}`}><span className="select-none pr-3 text-right text-[var(--text-secondary)]">{line.number}</span><code className={`${lineTone[line.type] || lineTone.unknown} whitespace-pre`}>{line.raw || ' '}</code>{hasIssue ? <button type="button" onClick={() => onShowIssue?.(line.issueIds[0])} title="View related issue" className="self-center text-amber-200 hover:text-amber-100"><AlertTriangle size={14}/></button> : <span/>}</div>
}

function Summary({ label, value, tone = 'text-[var(--text)]' }) { return <div className="flex items-center justify-between gap-3 text-[12px]"><dt className="text-[var(--text-secondary)]">{label}</dt><dd className={`m-0 text-right font-semibold ${tone}`}>{value ?? 0}</dd></div> }
function Legend({ color, label }) { return <span className="inline-flex items-center gap-1.5"><i className={`h-1.5 w-1.5 rounded-full ${color}`}/>{label}</span> }
function Step({ number, text }) { return <li className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full border border-[var(--border)] text-[10px] font-bold text-[var(--text)]">{number}</span><span>{text}</span></li> }
function formatDate(value) { if (!value) return 'Not provided'; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString() }
function buildStarterRobots(origin, sitemaps) {
  const validSitemaps = (sitemaps?.discovered || []).filter(item => item.ok && item.url).map(item => item.url).slice(0, 5)
  const lines = ['# Review before publishing', 'User-agent: *', 'Allow: /']
  if (validSitemaps.length) lines.push('', ...validSitemaps.map(url => `Sitemap: ${url}`))
  else if (origin) lines.push('', `# Add a verified sitemap when available, for example:`, `# Sitemap: ${origin}/sitemap.xml`)
  return `${lines.join('\n')}\n`
}
