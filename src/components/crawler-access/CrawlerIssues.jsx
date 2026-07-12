import { useState } from 'react'
import { ArrowRight, Check, ChevronDown, Diamond, RotateCw } from '../icons/heroicons'
import { CRAWLER_BY_TOKEN } from './utils/crawlerUtils'
import { presentIssue } from './utils/issuePresentation'
import CrawlerLogo from './CrawlerLogo'

const severityTone = {
  critical: { badge: 'border-[var(--accent-red)]/25 bg-[var(--accent-red)]/10 text-rose-100', label: 'High' },
  warning: { badge: 'border-[var(--accent-amber)]/25 bg-[var(--accent-amber)]/10 text-amber-100', label: 'Medium' },
  info: { badge: 'border-[var(--accent-blue)]/25 bg-[var(--accent-blue)]/10 text-blue-100', label: 'Low' }
}
const effortTone = { Low: 'text-emerald-200', Medium: 'text-amber-200', High: 'text-rose-200' }

export default function CrawlerIssues({ sortedIssues, expandedIssues, setExpandedIssues, onRetest, loading }) {
  const [retestingId, setRetestingId] = useState('')
  const issues = sortedIssues.map(presentIssue)

  const retest = async issue => {
    if (!onRetest || retestingId || loading) return
    setRetestingId(issue.id)
    try { await onRetest(issue) } finally { setRetestingId('') }
  }

  const toggle = id => setExpandedIssues(current => ({ ...current, [id]: !current[id] }))

  return (
    <section className="mt-4 min-w-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]" id="crawler-issues" aria-labelledby="crawler-issues-title">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
        <div><p className="m-0 text-[11px] font-bold uppercase tracking-[.14em] text-[var(--accent-blue)]">Crawler issues</p><h2 id="crawler-issues-title" className="mt-2 text-base font-bold text-[var(--text)]">6. Grouped Action Queue</h2><p className="mt-1 text-[13px] leading-5 text-[var(--text-secondary)]">Equivalent findings appear once with every affected URL, crawler, source line, and occurrence.</p></div>
        <button type="button" onClick={() => document.getElementById('crawler-issues-table')?.focus()} className="inline-flex min-h-10 items-center gap-2 text-[12px] font-semibold text-[var(--accent-blue)] hover:text-blue-200">Review {issues.length} group{issues.length === 1 ? '' : 's'} <ArrowRight size={16}/></button>
      </header>

      {issues.length ? <>
        <div id="crawler-issues-table" tabIndex="-1" className="hidden min-w-0 overflow-x-auto outline-none lg:block">
          <table className="w-full min-w-[1180px] table-fixed border-collapse text-left">
            <colgroup><col className="w-[86px]"/><col className="w-[210px]"/><col className="w-[190px]"/><col className="w-[180px]"/><col className="w-[220px]"/><col className="w-[90px]"/><col className="w-[74px]"/><col className="w-[90px]"/></colgroup>
            <thead><tr className="border-b border-[var(--border)] bg-[var(--bg-darker)]/45 text-[11px] font-bold uppercase tracking-[.07em] text-[var(--text-secondary)]"><Header>Priority</Header><Header>Issue</Header><Header>Evidence</Header><Header>Impact</Header><Header>Recommended fix</Header><Header>Affected</Header><Header>Effort</Header><Header>Re-test</Header></tr></thead>
            <tbody className="divide-y divide-[var(--border)]">{issues.map(issue => <DesktopIssue key={issue.id} issue={issue} expanded={!!expandedIssues[issue.id]} toggle={() => toggle(issue.id)} retest={() => retest(issue)} retesting={retestingId === issue.id} disabled={loading}/>)}</tbody>
          </table>
        </div>

        <div className="divide-y divide-[var(--border)] lg:hidden">{issues.map(issue => <MobileIssue key={issue.id} issue={issue} expanded={!!expandedIssues[issue.id]} toggle={() => toggle(issue.id)} retest={() => retest(issue)} retesting={retestingId === issue.id} disabled={loading}/>)}</div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--bg-darker)]/35 px-5 py-3 text-[11px] text-[var(--text-secondary)]"><span className="inline-flex items-center gap-2"><b>Issue</b><ArrowRight size={14}/><b>Evidence</b><ArrowRight size={14}/><b>Impact</b><ArrowRight size={14}/><b>Fix</b><ArrowRight size={14}/><b>Re-test</b></span><span>{issues.length} grouped finding{issues.length === 1 ? '' : 's'}</span></footer>
      </> : <div className="grid place-items-center px-6 py-14 text-center"><span className="grid size-12 place-items-center rounded-full border border-[var(--accent-teal)]/25 bg-[var(--accent-teal)]/10 text-emerald-100"><Check size={24}/></span><h3 className="mt-4 text-base font-semibold text-[var(--text)]">No crawler issues found</h3><p className="mt-2 max-w-md text-[13px] leading-5 text-[var(--text-secondary)]">Current policy and page evidence contains no crawler blockers requiring action.</p></div>}
    </section>
  )
}

function DesktopIssue({ issue, expanded, toggle, retest, retesting, disabled }) {
  const tone = severityTone[issue.severity] || severityTone.info
  return <>
    <tr data-crawler-issue={issue.id} className="align-middle transition hover:bg-white/[.018]"><Cell><Priority tone={tone}/></Cell><Cell><button type="button" onClick={toggle} aria-expanded={expanded} className="flex min-h-10 w-full items-center gap-2 text-left"><strong className="line-clamp-2 text-[12px] font-semibold leading-5 text-[var(--text)]">{issue.displayTitle}</strong><ChevronDown size={16} className={`shrink-0 text-[var(--text-secondary)] transition ${expanded ? 'rotate-180' : ''}`}/></button></Cell><Cell><Truncated value={issue.displayEvidence}/></Cell><Cell><Truncated value={issue.impact}/></Cell><Cell><Truncated value={issue.recommendation}/></Cell><Cell><span className="text-[11px] text-[var(--text-secondary)]">{issue.affected}</span></Cell><Cell><strong className={`text-[11px] ${effortTone[issue.effort]}`}>{issue.effort}</strong></Cell><Cell><RetestButton onClick={retest} loading={retesting} disabled={disabled}/></Cell></tr>
    {expanded && <tr><td colSpan="8" className="bg-[var(--bg-darker)]/35 px-5 py-5"><IssueDetails issue={issue}/></td></tr>}
  </>
}

function MobileIssue({ issue, expanded, toggle, retest, retesting, disabled }) {
  const tone = severityTone[issue.severity] || severityTone.info
  return <article data-crawler-issue={issue.id} className="p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><Priority tone={tone}/><button type="button" onClick={toggle} aria-expanded={expanded} className="mt-3 flex min-h-10 items-center gap-2 text-left"><strong className="text-[13px] leading-5 text-[var(--text)]">{issue.displayTitle}</strong><ChevronDown size={16} className={`shrink-0 text-[var(--text-secondary)] transition ${expanded ? 'rotate-180' : ''}`}/></button></div><RetestButton onClick={retest} loading={retesting} disabled={disabled}/></div><dl className="mt-4 grid grid-cols-[80px_1fr] gap-x-3 gap-y-3 text-[12px]"><dt className="text-[var(--text-secondary)]">Evidence</dt><dd className="m-0 text-[var(--text-secondary)]">{issue.displayEvidence}</dd><dt className="text-[var(--text-secondary)]">Impact</dt><dd className="m-0 text-[var(--text-secondary)]">{issue.impact}</dd><dt className="text-[var(--text-secondary)]">Fix</dt><dd className="m-0 text-[var(--text-secondary)]">{issue.recommendation}</dd><dt className="text-[var(--text-secondary)]">Affected</dt><dd className="m-0 text-[var(--text-secondary)]">{issue.affected} · <span className={effortTone[issue.effort]}>{issue.effort} effort</span></dd></dl>{expanded && <div className="mt-5 border-t border-[var(--border)] pt-5"><IssueDetails issue={issue}/></div>}</article>
}

function IssueDetails({ issue }) {
  const crawlers = (issue.crawlerAffected || []).map(token => CRAWLER_BY_TOKEN[token.toLowerCase()]).filter(Boolean)
  const occurrenceCount = issue.occurrences?.length || 1
  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_240px]"><Detail label={`Evidence · ${occurrenceCount} occurrence${occurrenceCount === 1 ? '' : 's'}`}><pre className="m-0 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-[var(--border)] bg-[var(--bg-darker)] p-4 font-mono text-[11px] leading-5 text-[var(--text-secondary)] [overflow-wrap:anywhere]">{issue.evidence}</pre></Detail><Detail label="Affected URLs"><div className="grid max-h-48 gap-2 overflow-auto">{issue.affectedUrls?.length ? issue.affectedUrls.map(url => <span key={url} className="break-all rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-[11px] leading-5 text-[var(--text-secondary)]">{url}</span>) : <span className="text-[12px] text-[var(--text-secondary)]">No individual URL recorded.</span>}</div></Detail><Detail label="Affected crawlers"><div className="flex flex-wrap gap-2">{crawlers.length ? crawlers.map(crawler => <span key={crawler.id} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[var(--border)] px-2.5 text-[11px] text-[var(--text-secondary)]"><CrawlerLogo company={crawler.company} size="sm" label={`${crawler.company} logo`}/>{crawler.name}</span>) : <span className="text-[12px] text-[var(--text-secondary)]">All applicable crawlers</span>}</div>{issue.lines?.length > 0 && <p className="mt-4 text-[11px] leading-5 text-[var(--text-secondary)]">Source lines: {issue.lines.join(', ')}</p>}</Detail></div>
}

function Priority({ tone }) { return <span className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.04em] ${tone.badge}`}><Diamond size={12}/>{tone.label}</span> }
function RetestButton({ onClick, loading, disabled }) { return <button type="button" onClick={onClick} disabled={disabled || loading} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel-raised)] px-3 text-[11px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent-blue)]/30 hover:text-[var(--accent-blue)] disabled:cursor-wait disabled:opacity-50">{loading && <RotateCw size={14} className="animate-spin"/>}{loading ? 'Testing' : 'Re-test'}</button> }
function Header({ children }) { return <th className="px-3 py-3 font-bold">{children}</th> }
function Cell({ children }) { return <td className="px-3 py-3">{children}</td> }
function Truncated({ value }) { return <p title={value} className="m-0 line-clamp-2 text-[11px] leading-5 text-[var(--text-secondary)]">{value}</p> }
function Detail({ label, children }) { return <div className="min-w-0"><span className="mb-2 block text-[11px] font-bold uppercase tracking-[.08em] text-[var(--text-secondary)]">{label}</span>{children}</div> }
