import { useState } from 'react'
import { AlertTriangle, ChevronDown, Code2, Crosshair, Lightbulb } from '../icons/heroicons'
import SectionShell from './SectionShell'
import { generateFix } from './fixes/generateFix'

const descriptions = {
  'Missing alt text': ['Images are harder for machines and assistive technology to understand.', 'Add concise, descriptive alt text.'],
  'Unlabeled button': ['The control purpose cannot be determined reliably.', 'Add visible text or an accessible name.'],
  'Empty link': ['Machines cannot determine the destination or intent of the link.', 'Add descriptive link text or an accessible name.'],
  'Unlabeled input': ['The expected form data is ambiguous.', 'Associate a visible label or aria-label.'],
  'Missing H1': ['The page is missing a strong primary topic signal.', 'Add one descriptive H1 for the page topic.'],
  'Industry signal not explicit': ['Machines cannot confidently place the entity in a market context.', 'State the industry in visible copy or supported organization schema.'],
  'Audience signal not explicit': ['Machines cannot confidently determine who this page is intended for.', 'Add concise audience-focused copy near the primary description.'],
  'Entity relationships are implicit': ['Detected terms do not establish how entities relate to one another.', 'Express important relationships in visible copy or relevant structured data.']
}

export default function ImprovementOpportunities({ issues, semanticIndex }) {
  const [openId, setOpenId] = useState(null)
  return <SectionShell number="4" title="Improvement Opportunities" description="Prioritized changes that can make the page easier for machines to understand."><div className="mu-stagger-grid grid gap-3 p-5">{issues.length === 0 ? <div className="rounded-xl border border-[var(--accent-teal)]/15 bg-[var(--accent-teal)]/[.055] px-5 py-9 text-center"><strong className="text-sm font-semibold text-emerald-100">No machine-understanding blockers detected</strong><p className="mt-2 text-[13px] text-emerald-50/75">Continue monitoring after structural or content changes.</p></div> : issues.map(issue => { const isOpen = openId === issue.id; const [why, recommendation] = issueCopy(issue); const fix = generateFix(issue.type, issue.element, issue.context); const nodes = (issue.nodeIds || []).map(id => semanticIndex[id]).filter(Boolean); return <IssueCard key={issue.id} issue={issue} isOpen={isOpen} why={why} recommendation={recommendation} fix={fix} nodes={nodes} onToggle={() => setOpenId(isOpen ? null : issue.id)} /> })}</div></SectionShell>
}

function IssueCard({ issue, isOpen, why, recommendation, fix, nodes, onToggle }) {
  const critical = issue.severity === 'critical'
  const notice = issue.severity === 'notice'
  const priority = critical ? 'High priority' : notice ? 'Low priority' : 'Medium priority'
  const priorityTone = critical ? 'text-rose-100' : notice ? 'text-blue-100' : 'text-amber-100'
  const iconTone = critical ? 'border-[var(--accent-red)]/20 bg-[var(--accent-red)]/10 text-rose-100' : notice ? 'border-[var(--accent-blue)]/20 bg-[var(--accent-blue)]/10 text-blue-100' : 'border-[var(--accent-amber)]/20 bg-[var(--accent-amber)]/10 text-amber-100'
  return <article className={`overflow-hidden rounded-xl border bg-[var(--bg-darker)]/45 transition duration-200 ${isOpen ? 'border-white/18' : 'border-[var(--border)] hover:-translate-y-0.5 hover:border-white/15'}`}>
    <button type="button" onClick={onToggle} aria-expanded={isOpen} className="grid min-h-[92px] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-4 p-5 text-left sm:grid-cols-[auto_190px_minmax(0,1fr)_minmax(0,1fr)_auto]">
      <span className={`grid size-10 place-items-center rounded-xl border ${iconTone}`}><AlertTriangle size={20} /></span>
      <div className="min-w-0"><span className={`text-[11px] font-semibold uppercase tracking-[0.1em] ${priorityTone}`}>{priority}</span><h3 className="mt-1 break-words text-[14px] font-semibold leading-5 text-[var(--text)]">{issue.type}</h3></div>
      <div className="hidden min-w-0 sm:block"><span className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-secondary)]">Why it matters</span><p className="mt-1 line-clamp-2 text-[12px] leading-5 text-[var(--text-secondary)]">{issue.explanation || why}</p></div>
      <div className="hidden min-w-0 sm:block"><span className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-secondary)]">Suggested fix</span><p className="mt-1 line-clamp-2 text-[12px] leading-5 text-[var(--text)]">{recommendation}</p></div>
      <span className="grid size-10 place-items-center rounded-lg border border-[var(--border)] text-[var(--text-secondary)]"><ChevronDown size={18} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} /></span>
    </button>
    <div className={`mu-issue-details grid transition-[grid-template-rows] duration-300 ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`} aria-hidden={!isOpen}><div className="overflow-hidden"><div className="grid gap-6 border-t border-[var(--border)] bg-[var(--bg-darker)] p-5 lg:grid-cols-2">
      <div><h4 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]"><Crosshair size={16} />Evidence</h4><p className="mt-3 break-words text-[13px] leading-6 text-[var(--text)] [overflow-wrap:anywhere]">{issue.reason || issue.evidence || issue.element || 'Detected during the accessibility and structure scan.'}</p>{nodes.length > 0 && <div className="mt-4 flex flex-wrap gap-2">{nodes.slice(0, 8).map(node => <span key={node.id} className="max-w-full break-words rounded-full border border-[var(--border)] bg-[var(--panel-raised)] px-3 py-1.5 text-[11px] text-[var(--text-secondary)]">{node.type}: {node.label || node.selector}</span>)}</div>}<div className="mt-5 flex items-start gap-3 rounded-xl border border-[var(--accent-blue)]/15 bg-[var(--accent-blue)]/[.055] p-4"><Lightbulb size={18} className="mt-0.5 shrink-0 text-blue-100" /><p className="text-[12px] leading-5 text-blue-50/80">{recommendation}</p></div></div>
      <div><h4 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]"><Code2 size={16} />Suggested change</h4><div className="mt-3 grid gap-3 sm:grid-cols-2"><CodeBlock label="Before" value={fix.before} tone="text-rose-100" /><CodeBlock label="After" value={fix.after} tone="text-emerald-100" /></div></div>
    </div></div></div>
  </article>
}

function CodeBlock({ label, value, tone }) { return <div className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4"><span className={`text-[11px] font-semibold uppercase ${tone}`}>{label}</span><code className="mt-3 block max-h-48 overflow-auto whitespace-pre-wrap break-words text-[12px] leading-5 text-[var(--text-secondary)] [overflow-wrap:anywhere]">{value}</code></div> }
function issueCopy(issue) { const key = Object.keys(descriptions).find(name => issue.type?.startsWith(name)); return descriptions[key] || ['The signal is ambiguous or incomplete for machine interpretation.', 'Make the signal explicit with semantic content or structured data.'] }
