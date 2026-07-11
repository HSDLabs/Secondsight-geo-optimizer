import { useState } from 'react'
import { AlertTriangle, ChevronDown, Code2, Crosshair, Lightbulb } from 'lucide-react'
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

  return (
    <SectionShell number="4" title="Improvement Opportunities" description="Prioritized changes that can make the page easier for machines to understand.">
      <div className="mu-stagger-grid grid gap-2.5 p-3 sm:p-4">
        {issues.length === 0 ? <div className="rounded-lg border border-emerald-400/15 bg-emerald-400/5 px-4 py-7 text-center"><strong className="text-xs font-semibold text-emerald-300">No machine-understanding blockers detected</strong><p className="mt-1 text-[10px] text-slate-500">Continue monitoring after structural or content changes.</p></div> : issues.map(issue => {
          const isOpen = openId === issue.id
          const [why, recommendation] = issueCopy(issue)
          const fix = generateFix(issue.type, issue.element, issue.context)
          const nodes = (issue.nodeIds || []).map(id => semanticIndex[id]).filter(Boolean)
          return <IssueCard key={issue.id} issue={issue} isOpen={isOpen} why={why} recommendation={recommendation} fix={fix} nodes={nodes} onToggle={() => setOpenId(isOpen ? null : issue.id)} />
        })}
      </div>
    </SectionShell>
  )
}

function IssueCard({ issue, isOpen, why, recommendation, fix, nodes, onToggle }) {
  const critical = issue.severity === 'critical'
  const notice = issue.severity === 'notice'
  const priority = critical ? 'High priority' : notice ? 'Low priority' : 'Medium priority'
  const priorityTone = critical ? 'text-rose-300' : notice ? 'text-sky-300' : 'text-amber-300'
  const iconTone = critical ? 'bg-rose-400/10 text-rose-300' : notice ? 'bg-sky-400/10 text-sky-300' : 'bg-amber-400/10 text-amber-300'
  return (
    <article className={`overflow-hidden rounded-lg border bg-[#0b121d]/55 transition duration-200 ${isOpen ? 'border-slate-600/75 shadow-[0_16px_35px_rgba(0,0,0,.15)]' : 'border-slate-700/40 hover:-translate-y-0.5 hover:border-slate-600/60'}`}>
      <button type="button" onClick={onToggle} aria-expanded={isOpen} className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 p-4 text-left sm:grid-cols-[auto_180px_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <span className={`grid size-8 place-items-center rounded-md ${iconTone}`}><AlertTriangle size={15} /></span>
        <div className="min-w-0"><span className={`text-[9px] font-semibold uppercase tracking-[0.1em] ${priorityTone}`}>{priority}</span><h3 className="mt-1 truncate text-xs font-semibold text-slate-100">{issue.type}</h3></div>
        <div className="hidden min-w-0 sm:block"><span className="text-[9px] uppercase tracking-[0.1em] text-slate-600">Why it matters</span><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-400">{issue.explanation || why}</p></div>
        <div className="hidden min-w-0 sm:block"><span className="text-[9px] uppercase tracking-[0.1em] text-slate-600">Suggested fix</span><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-300">{recommendation}</p></div>
        <span className="grid size-7 place-items-center rounded-md border border-slate-700/60 text-slate-500"><ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} /></span>
      </button>

      <div className={`mu-issue-details grid transition-[grid-template-rows] duration-300 ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`} aria-hidden={!isOpen}>
        <div className="overflow-hidden"><div className="grid gap-5 border-t border-slate-700/35 bg-[#080d16]/80 p-4 lg:grid-cols-2">
          <div><h4 className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500"><Crosshair size={11} />Evidence</h4><p className="mt-2 text-xs leading-5 text-slate-300">{issue.reason || issue.evidence || issue.element || 'Detected during the accessibility and structure scan.'}</p>{nodes.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{nodes.slice(0, 8).map(node => <span key={node.id} className="rounded-full border border-slate-700/50 bg-slate-800/50 px-2.5 py-1 text-[9px] text-slate-400">{node.type}: {node.label || node.selector}</span>)}</div>}<div className="mt-4 flex items-start gap-2 rounded-md border border-sky-400/10 bg-sky-400/[.035] p-3"><Lightbulb size={13} className="mt-0.5 shrink-0 text-sky-300" /><p className="text-[10px] leading-4 text-slate-400">{recommendation}</p></div></div>
          <div><h4 className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500"><Code2 size={11} />Suggested change</h4><div className="mt-2 grid gap-2 sm:grid-cols-2"><CodeBlock label="Before" value={fix.before} tone="text-rose-300" /><CodeBlock label="After" value={fix.after} tone="text-emerald-300" /></div></div>
        </div></div>
      </div>
    </article>
  )
}

function CodeBlock({ label, value, tone }) {
  return <div className="min-w-0 rounded-md border border-slate-700/50 bg-black/20 p-3"><span className={`text-[9px] font-semibold uppercase ${tone}`}>{label}</span><code className="mt-2 block whitespace-pre-wrap break-all text-[10px] leading-4 text-slate-400">{value}</code></div>
}

function issueCopy(issue) {
  const key = Object.keys(descriptions).find(name => issue.type?.startsWith(name))
  return descriptions[key] || ['The signal is ambiguous or incomplete for machine interpretation.', 'Make the signal explicit with semantic content or structured data.']
}
