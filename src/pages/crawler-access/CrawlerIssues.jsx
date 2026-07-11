import { useState } from 'react'
import { ArrowRight, Check, ChevronDown, Diamond, RotateCw } from 'lucide-react'
import { CRAWLER_BY_TOKEN } from './crawlerUtils'
import { presentIssue } from './issuePresentation'
import CrawlerLogo from './CrawlerLogo'

const severityTone = {
  critical: { badge: 'border-rose-400/20 bg-rose-400/10 text-rose-300', label: 'High' },
  warning: { badge: 'border-amber-400/20 bg-amber-400/10 text-amber-300', label: 'Medium' },
  info: { badge: 'border-sky-400/20 bg-sky-400/10 text-sky-300', label: 'Low' }
}
const effortTone = { Low: 'text-emerald-300', Medium: 'text-amber-300', High: 'text-rose-300' }

export default function CrawlerIssues({ sortedIssues, expandedIssues, setExpandedIssues, onRetest, loading }) {
  const [retestingId, setRetestingId] = useState('')
  const issues = sortedIssues.map(presentIssue)

  const retest = async issue => {
    if (!onRetest || retestingId || loading) return
    setRetestingId(issue.id)
    try { await onRetest(issue) } finally { setRetestingId('') }
  }

  return (
    <section className="mt-4 min-w-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)]" id="crawler-issues" aria-labelledby="crawler-issues-title">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
        <div><p className="m-0 text-[10px] font-bold uppercase tracking-[.12em] text-[var(--accent)]">Crawler Issues</p><h2 id="crawler-issues-title" className="mt-1.5 text-sm font-bold uppercase tracking-[.05em] text-[var(--text)]">6. Deduplicated Action Queue</h2><p className="mt-1 text-xs text-[var(--muted)]">Every captured crawler, policy, sitemap, page, URL-inspection, and llms.txt finding in priority order.</p></div>
        <button type="button" onClick={() => document.getElementById('crawler-issues-table')?.focus()} className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-sky-300 hover:text-sky-200">View all {issues.length} issues <ArrowRight size={11}/></button>
      </header>

      {issues.length ? <>
        <div id="crawler-issues-table" tabIndex="-1" className="hidden min-w-0 overflow-x-auto outline-none lg:block">
          <table className="w-full min-w-[1180px] table-fixed border-collapse text-left">
            <colgroup><col className="w-[86px]"/><col className="w-[210px]"/><col className="w-[190px]"/><col className="w-[180px]"/><col className="w-[220px]"/><col className="w-[90px]"/><col className="w-[74px]"/><col className="w-[86px]"/></colgroup>
            <thead><tr className="border-b border-[var(--border)] bg-black/10 text-[9px] font-bold uppercase tracking-[.07em] text-[var(--faint)]"><Header>Priority</Header><Header>Issue</Header><Header>Evidence</Header><Header>Impact</Header><Header>Recommended fix</Header><Header>Affected</Header><Header>Effort</Header><Header>Re-test</Header></tr></thead>
            <tbody className="divide-y divide-[var(--border)]">{issues.map(issue => <DesktopIssue key={issue.id} issue={issue} expanded={!!expandedIssues[issue.id]} toggle={() => setExpandedIssues(current => ({ ...current, [issue.id]: !current[issue.id] }))} retest={() => retest(issue)} retesting={retestingId === issue.id} disabled={loading}/>)}</tbody>
          </table>
        </div>

        <div className="divide-y divide-[var(--border)] lg:hidden">{issues.map(issue => <MobileIssue key={issue.id} issue={issue} expanded={!!expandedIssues[issue.id]} toggle={() => setExpandedIssues(current => ({ ...current, [issue.id]: !current[issue.id] }))} retest={() => retest(issue)} retesting={retestingId === issue.id} disabled={loading}/>)}</div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-black/[.06] px-5 py-3 text-[9px] text-[var(--faint)]"><span className="inline-flex items-center gap-2"><b className="text-[var(--muted)]">Issue</b><ArrowRight size={9}/><b className="text-[var(--muted)]">Evidence</b><ArrowRight size={9}/><b className="text-[var(--muted)]">Impact</b><ArrowRight size={9}/><b className="text-[var(--muted)]">Fix</b><ArrowRight size={9}/><b className="text-[var(--muted)]">Re-test</b></span><span>{issues.length} deduplicated finding{issues.length === 1 ? '' : 's'}</span></footer>
      </> : <div className="grid place-items-center px-6 py-12 text-center"><span className="grid size-9 place-items-center rounded-full border border-emerald-400/25 bg-emerald-400/10 text-emerald-300"><Check size={18}/></span><h3 className="mt-3 text-sm font-semibold text-[var(--text)]">No crawler issues found</h3><p className="mt-1 max-w-md text-xs leading-5 text-[var(--muted)]">Current policy and page evidence contains no crawler blockers requiring action.</p></div>}
    </section>
  )
}

function DesktopIssue({ issue, expanded, toggle, retest, retesting, disabled }) {
  const tone = severityTone[issue.severity] || severityTone.info
  return <>
    <tr data-crawler-issue={issue.id} className="align-middle transition hover:bg-white/[.015]"><Cell><Priority tone={tone}/></Cell><Cell><button type="button" onClick={toggle} aria-expanded={expanded} className="flex w-full items-center gap-1.5 text-left"><strong className="line-clamp-2 text-[10px] font-semibold leading-4 text-[var(--text)]">{issue.displayTitle}</strong><ChevronDown size={10} className={`shrink-0 text-[var(--faint)] transition ${expanded ? 'rotate-180' : ''}`}/></button></Cell><Cell><Truncated value={issue.displayEvidence}/></Cell><Cell><Truncated value={issue.impact}/></Cell><Cell><Truncated value={issue.recommendation}/></Cell><Cell><span className="text-[9px] text-[var(--muted)]">{issue.affected}</span></Cell><Cell><strong className={`text-[9px] ${effortTone[issue.effort]}`}>{issue.effort}</strong></Cell><Cell><RetestButton onClick={retest} loading={retesting} disabled={disabled}/></Cell></tr>
    {expanded && <tr><td colSpan="8" className="bg-black/10 px-5 py-4"><IssueDetails issue={issue}/></td></tr>}
  </>
}

function MobileIssue({ issue, expanded, toggle, retest, retesting, disabled }) {
  const tone = severityTone[issue.severity] || severityTone.info
  return <article data-crawler-issue={issue.id} className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><Priority tone={tone}/><button type="button" onClick={toggle} aria-expanded={expanded} className="mt-2 flex items-center gap-1.5 text-left"><strong className="text-xs leading-5 text-[var(--text)]">{issue.displayTitle}</strong><ChevronDown size={11} className={`shrink-0 text-[var(--faint)] transition ${expanded ? 'rotate-180' : ''}`}/></button></div><RetestButton onClick={retest} loading={retesting} disabled={disabled}/></div><div className="mt-3 grid grid-cols-[70px_1fr] gap-x-3 gap-y-2 text-[9px]"><dt className="text-[var(--faint)]">Evidence</dt><dd className="m-0 text-[var(--muted)]">{issue.displayEvidence}</dd><dt className="text-[var(--faint)]">Impact</dt><dd className="m-0 text-[var(--muted)]">{issue.impact}</dd><dt className="text-[var(--faint)]">Fix</dt><dd className="m-0 text-[var(--muted)]">{issue.recommendation}</dd><dt className="text-[var(--faint)]">Affected</dt><dd className="m-0 text-[var(--muted)]">{issue.affected} · <span className={effortTone[issue.effort]}>{issue.effort} effort</span></dd></div>{expanded && <div className="mt-4 border-t border-[var(--border)] pt-4"><IssueDetails issue={issue}/></div>}</article>
}

function IssueDetails({ issue }) {
  const crawlers = (issue.crawlerAffected || []).map(token => CRAWLER_BY_TOKEN[token.toLowerCase()]).filter(Boolean)
  return <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px]"><Detail label="Full evidence"><pre className="m-0 max-h-36 overflow-auto whitespace-pre-wrap rounded-md border border-[var(--border)] bg-[var(--bg-darker)] p-3 font-mono text-[9px] leading-4 text-slate-300">{issue.evidence}</pre></Detail><Detail label="Affected URLs"><div className="grid max-h-36 gap-1.5 overflow-auto">{issue.affectedUrls?.length ? issue.affectedUrls.map(url => <span key={url} className="break-all rounded border border-[var(--border)] bg-[var(--panel)] px-2.5 py-2 font-mono text-[9px] text-[var(--muted)]">{url}</span>) : <span className="text-[9px] text-[var(--faint)]">No individual URL recorded.</span>}</div></Detail><Detail label="Affected crawlers"><div className="flex flex-wrap gap-2">{crawlers.length ? crawlers.map(crawler => <span key={crawler.id} className="inline-flex items-center gap-1.5 rounded border border-[var(--border)] px-2 py-1 text-[9px] text-[var(--muted)]"><CrawlerLogo company={crawler.company} size="sm" label={`${crawler.company} logo`}/>{crawler.name}</span>) : <span className="text-[9px] text-[var(--faint)]">All applicable crawlers</span>}</div></Detail></div>
}

function Priority({ tone }) { return <span className={`inline-flex w-fit items-center gap-1 rounded border px-2 py-1 text-[8px] font-bold uppercase tracking-[.04em] ${tone.badge}`}><Diamond size={8}/>{tone.label}</span> }
function RetestButton({ onClick, loading, disabled }) { return <button type="button" onClick={onClick} disabled={disabled || loading} className="inline-flex items-center justify-center gap-1 rounded-md border border-[var(--border)] bg-[var(--panel-raised)] px-2.5 py-1.5 text-[9px] font-semibold text-[var(--muted)] transition hover:border-sky-400/30 hover:text-sky-300 disabled:cursor-wait disabled:opacity-50">{loading && <RotateCw size={9} className="animate-spin"/>}{loading ? 'Testing' : 'Re-test'}</button> }
function Header({ children }) { return <th className="px-3 py-3 font-bold">{children}</th> }
function Cell({ children }) { return <td className="px-3 py-3">{children}</td> }
function Truncated({ value }) { return <p title={value} className="m-0 line-clamp-2 text-[9px] leading-4 text-[var(--muted)]">{value}</p> }
function Detail({ label, children }) { return <div><span className="mb-2 block text-[8px] font-bold uppercase tracking-[.08em] text-[var(--faint)]">{label}</span>{children}</div> }
