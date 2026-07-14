import { useState } from 'react'
import { Check, ChevronDown, Diamond, RotateCw } from '../icons/heroicons'
import { CRAWLER_BY_TOKEN, getIssuePriority, ISSUE_PRIORITY_PRESENTATION } from './utils/crawlerUtils'
import { presentIssue } from './utils/issuePresentation'
import CrawlerLogo from './CrawlerLogo'

const priorityTone = {
  danger: 'border-[var(--accent-red)]/25 bg-[var(--accent-red)]/10 text-[var(--status-danger)]',
  warning: 'border-[var(--accent-amber)]/25 bg-[var(--accent-amber)]/10 text-[var(--status-warning)]',
  info: 'border-[var(--accent-blue)]/25 bg-[var(--accent-blue)]/10 text-[var(--status-info)]',
  opportunity: 'border-[var(--accent-purple)]/20 bg-[var(--accent-purple)]/[.07] text-[var(--status-purple)]'
}
const effortTone = { Low: 'text-[var(--status-good)]', Medium: 'text-[var(--status-warning)]', High: 'text-[var(--status-danger)]' }

export default function CrawlerIssues({ sortedIssues, expandedIssues, setExpandedIssues, onRetest, loading }) {
  const [retestingId, setRetestingId] = useState('')
  const issues = sortedIssues.map(presentIssue)
  const toggle = id => setExpandedIssues(current => ({ ...current, [id]: !current[id] }))
  const retest = async issue => {
    if (!onRetest || retestingId || loading) return
    setRetestingId(issue.id)
    try { await onRetest(issue) } finally { setRetestingId('') }
  }

  return <section className="mt-4 min-w-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)]" id="crawler-issues" aria-labelledby="crawler-issues-title">
    <header className="border-b border-[var(--border)] px-4 py-3.5"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[var(--accent-blue)]">Action layer</p><h2 id="crawler-issues-title" className="mt-1 text-base font-bold text-[var(--text)]">Issues &amp; Actions</h2><p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">Prioritized crawl and discovery problems, grouped with every affected page and available re-test action.</p></header>
    {issues.length ? <>
      <div id="crawler-issues-table" tabIndex="-1" className="hidden overflow-x-auto outline-none lg:block"><table className="w-full min-w-[1120px] table-fixed border-collapse text-left"><colgroup><col className="w-[86px]"/><col className="w-[190px]"/><col className="w-[180px]"/><col className="w-[170px]"/><col className="w-[220px]"/><col className="w-[82px]"/><col className="w-[70px]"/><col className="w-[88px]"/></colgroup><thead><tr className="border-b border-[var(--border)] bg-[var(--bg-darker)]/45 text-[10px] font-bold uppercase tracking-[.05em] text-[var(--text-secondary)]"><Header>Priority</Header><Header>Issue</Header><Header>Evidence</Header><Header>Impact</Header><Header>Recommended fix</Header><Header>Affected</Header><Header>Effort</Header><Header>Re-test</Header></tr></thead><tbody className="divide-y divide-[var(--border)]">{issues.map(issue => <IssueRows key={issue.id} issue={issue} expanded={!!expandedIssues[issue.id]} onToggle={() => toggle(issue.id)} onRetest={() => retest(issue)} retesting={retestingId === issue.id} disabled={loading} />)}</tbody></table></div>
      <div className="divide-y divide-[var(--border)] lg:hidden">{issues.map(issue => <MobileIssue key={issue.id} issue={issue} expanded={!!expandedIssues[issue.id]} onToggle={() => toggle(issue.id)} onRetest={() => retest(issue)} retesting={retestingId === issue.id} disabled={loading} />)}</div>
      <footer className="border-t border-[var(--border)] bg-[var(--bg-darker)]/35 px-4 py-2.5 text-[10px] text-[var(--text-secondary)]">{issues.length} grouped finding{issues.length === 1 ? '' : 's'}</footer>
    </> : <div className="grid place-items-center px-6 py-12 text-center"><span className="grid size-10 place-items-center rounded-full border border-[var(--accent-teal)]/25 bg-[var(--accent-teal)]/10 text-[var(--status-good)]"><Check size={20}/></span><h3 className="mt-3 text-sm font-semibold text-[var(--text)]">No crawler issues found</h3><p className="mt-1 text-[11px] text-[var(--text-secondary)]">Current policy and page evidence contains no crawler blockers requiring action.</p></div>}
  </section>
}

function IssueRows({ issue, expanded, onToggle, onRetest, retesting, disabled }) {
  return <><tr data-crawler-issue={issue.id} className="align-middle transition hover:bg-white/[.018]"><Cell><Priority issue={issue} /></Cell><Cell><button type="button" onClick={onToggle} aria-expanded={expanded} className="flex min-h-9 w-full items-center gap-2 text-left"><strong className="line-clamp-2 text-[11px] font-semibold leading-4 text-[var(--text)]">{issue.displayTitle}</strong><ChevronDown size={14} className={`shrink-0 text-[var(--text-secondary)] transition ${expanded ? 'rotate-180' : ''}`}/></button></Cell><Cell><Truncated value={issue.displayEvidence}/></Cell><Cell><Truncated value={issue.impact}/></Cell><Cell><Truncated value={issue.recommendation}/></Cell><Cell><span className="text-[10px] text-[var(--text-secondary)]">{issue.affected}</span></Cell><Cell><strong className={`text-[10px] ${effortTone[issue.effort]}`}>{issue.effort}</strong></Cell><Cell><RetestButton onClick={onRetest} loading={retesting} disabled={disabled}/></Cell></tr>{expanded && <tr><td colSpan="8" className="bg-[var(--bg-darker)]/35 px-4 py-4"><IssueDetails issue={issue}/></td></tr>}</>
}

function MobileIssue({ issue, expanded, onToggle, onRetest, retesting, disabled }) {
  return <article data-crawler-issue={issue.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><Priority issue={issue}/><button type="button" onClick={onToggle} aria-expanded={expanded} className="mt-2 flex items-center gap-2 text-left"><strong className="text-[12px] text-[var(--text)]">{issue.displayTitle}</strong><ChevronDown size={14} className={expanded ? 'rotate-180' : ''}/></button></div><RetestButton onClick={onRetest} loading={retesting} disabled={disabled}/></div><dl className="mt-3 grid grid-cols-[72px_1fr] gap-2 text-[10px]"><dt className="text-[var(--text-secondary)]">Evidence</dt><dd className="m-0 text-[var(--text-secondary)]">{issue.displayEvidence}</dd><dt className="text-[var(--text-secondary)]">Fix</dt><dd className="m-0 text-[var(--text-secondary)]">{issue.recommendation}</dd></dl>{expanded && <div className="mt-4 border-t border-[var(--border)] pt-4"><IssueDetails issue={issue}/></div>}</article>
}

function IssueDetails({ issue }) {
  const crawlers = (issue.crawlerAffected || []).map(token => CRAWLER_BY_TOKEN[token.toLowerCase()]).filter(Boolean)
  return <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px]"><Detail label="Evidence"><pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-[var(--border)] bg-[var(--bg-darker)] p-3 font-mono text-[10px] leading-5 text-[var(--text-secondary)]">{issue.evidence}</pre></Detail><Detail label="Affected URLs"><div className="grid max-h-40 gap-2 overflow-auto">{issue.affectedUrls?.length ? issue.affectedUrls.map(url => <span key={url} className="break-all rounded border border-[var(--border)] px-2 py-1.5 text-[10px] text-[var(--text-secondary)]">{url}</span>) : <span className="text-[10px] text-[var(--text-secondary)]">No individual URL recorded.</span>}</div></Detail><Detail label="Affected crawlers"><div className="flex flex-wrap gap-2">{crawlers.length ? crawlers.map(crawler => <span key={crawler.id} className="inline-flex items-center gap-2 rounded border border-[var(--border)] px-2 py-1.5 text-[10px] text-[var(--text-secondary)]"><CrawlerLogo company={crawler.company} size="sm" />{crawler.name}</span>) : <span className="text-[10px] text-[var(--text-secondary)]">All applicable crawlers</span>}</div></Detail></div>
}

function Priority({ issue }) { const presentation = ISSUE_PRIORITY_PRESENTATION[getIssuePriority(issue)]; return <span className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[.03em] ${priorityTone[presentation.tone]}`}><Diamond size={11}/>{presentation.label}</span> }
function RetestButton({ onClick, loading, disabled }) { return <button type="button" onClick={onClick} disabled={disabled || loading} className="inline-flex min-h-8 items-center gap-1 rounded-md border border-[var(--border)] px-2 text-[10px] text-[var(--text-secondary)] disabled:opacity-50">{loading && <RotateCw size={12} className="animate-spin"/>}{loading ? 'Testing' : 'Re-test'}</button> }
function Header({ children }) { return <th className="px-2.5 py-2.5 font-bold">{children}</th> }
function Cell({ children }) { return <td className="px-2.5 py-2.5">{children}</td> }
function Truncated({ value }) { return <p title={value} className="line-clamp-2 text-[10px] leading-4 text-[var(--text-secondary)]">{value}</p> }
function Detail({ label, children }) { return <div className="min-w-0"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[.07em] text-[var(--text-secondary)]">{label}</span>{children}</div> }
