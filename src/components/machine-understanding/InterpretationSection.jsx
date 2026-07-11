import { Accessibility, AlertTriangle, Boxes, Check, Eye, FileSearch, Fingerprint, Network, Sparkles } from 'lucide-react'
import SectionShell from './SectionShell'
import { getInterpretationCards } from './utils/analysisViewModel'

const cardConfig = {
  identity: { icon: Fingerprint, iconTone: 'border-amber-400/20 bg-amber-400/10 text-amber-300' },
  structure: { icon: Network, iconTone: 'border-indigo-400/20 bg-indigo-400/10 text-indigo-300' },
  content: { icon: FileSearch, iconTone: 'border-sky-400/20 bg-sky-400/10 text-sky-300' },
  knowledge: { icon: Boxes, iconTone: 'border-violet-400/20 bg-violet-400/10 text-violet-300' },
  accessibility: { icon: Accessibility, iconTone: 'border-purple-400/20 bg-purple-400/10 text-purple-300' }
}

export default function InterpretationSection({ data, progressState, issues = [] }) {
  const cards = getInterpretationCards(data, progressState)
  const action = <button type="button" onClick={() => document.getElementById('extraction-inspector')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="inline-flex items-center gap-1 text-[10px] font-medium text-sky-300 transition hover:text-sky-200">View details <span aria-hidden="true">→</span></button>

  return (
    <SectionShell number="2" title="Interpretation" description="What these signals indicate about the page." action={action}>
      <div className="mu-stagger-grid grid items-stretch gap-3 p-3 sm:p-4 md:grid-cols-2 xl:grid-cols-5">
        {cards.map(card => <InterpretationCard key={card.id} card={card} issues={issues.filter(issue => issue.stageId === card.id)} />)}
      </div>
    </SectionShell>
  )
}

function InterpretationCard({ card, issues }) {
  const config = cardConfig[card.id]
  const Icon = config.icon
  return (
    <article className="flex min-h-[330px] min-w-0 flex-col overflow-hidden rounded-lg border border-slate-700/45 bg-[#0b121d]/70 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-slate-600/70 hover:shadow-[0_14px_35px_rgba(0,0,0,.14)]">
      <header className="flex min-w-0 items-center gap-2.5">
        <span className={`grid size-8 shrink-0 place-items-center rounded-lg border ${config.iconTone}`}><Icon size={16} strokeWidth={1.8} /></span>
        <h3 className="min-w-0 text-[12px] font-semibold leading-4 tracking-[-0.01em] text-slate-100">{card.title}</h3>
      </header>

      {card.items && <dl className="mt-5 grid min-w-0 gap-3.5">{card.items.map(([label, value]) => <InterpretationRow key={label} cardId={card.id} label={label} value={value} />)}</dl>}
      {card.groups && <KnowledgeGroups groups={card.groups} empty={card.empty} />}

      <ConfidenceFooter certainty={card.certainty} confidence={card.confidence} issueCount={issues.length} />
    </article>
  )
}

function InterpretationRow({ cardId, label, value }) {
  const status = getValueStatus(cardId, label, value)
  return (
    <div className="grid min-w-0 grid-cols-[70px_minmax(0,1fr)] items-start gap-2">
      <dt className="min-w-0 text-[10px] leading-4 text-slate-500">{label}</dt>
      <dd className={`flex min-w-0 items-center justify-end gap-1 overflow-hidden text-right text-[10px] font-medium leading-4 ${status.tone}`} title={String(value)}>
        {status.icon === 'check' && <Check size={12} strokeWidth={2.5} className="shrink-0" />}
        {status.icon === 'warning' && <AlertTriangle size={11} strokeWidth={2} className="shrink-0" />}
        {status.display && <span className="min-w-0 truncate">{status.display}</span>}
      </dd>
    </div>
  )
}

function KnowledgeGroups({ groups, empty }) {
  return (
    <div className="mt-5 grid min-w-0 gap-4">
      {groups.length ? groups.map(group => (
        <div key={group.label} className="min-w-0">
          <span className="block text-[10px] font-medium text-slate-500">{group.label}</span>
          <div className="mt-2 flex flex-wrap gap-1.5">{String(group.value).split(',').map(value => <span key={value} className="max-w-full truncate rounded-md border border-slate-700/55 bg-slate-800/65 px-2 py-1 text-[9px] text-slate-300" title={value.trim()}>{value.trim()}</span>)}</div>
        </div>
      )) : <p className="text-[10px] leading-4 text-slate-600">{empty}</p>}
    </div>
  )
}

function ConfidenceFooter({ certainty, confidence, issueCount }) {
  const observed = certainty === 'Observed'
  const hasIssues = issueCount > 0
  const badgeTone = hasIssues
    ? 'bg-amber-400/8 text-amber-300'
    : observed ? 'bg-emerald-400/8 text-emerald-300' : 'bg-violet-400/8 text-violet-300'
  const barTone = hasIssues ? 'bg-amber-400' : observed ? 'bg-emerald-400' : 'bg-violet-400'
  return (
    <div className="mt-auto border-t border-slate-700/25 pt-4" title="Evidence confidence reflects the coverage and provenance of scan inputs, not page quality.">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-slate-500">Evidence confidence</span>
        <strong className="text-[10px] font-semibold tabular-nums text-slate-200">{confidence}%</strong>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[9px] font-medium ${badgeTone}`}>
          {hasIssues ? <AlertTriangle size={10} /> : observed ? <Eye size={10} /> : <Sparkles size={10} />}
          {hasIssues ? `${issueCount} issue${issueCount === 1 ? '' : 's'}` : certainty}
        </span>
        {hasIssues && <span className={`text-[9px] ${observed ? 'text-emerald-300' : 'text-violet-300'}`}>{certainty}</span>}
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-800"><span className={`block h-full rounded-full transition-[width] duration-500 ${barTone}`} style={{ width: `${confidence}%` }} /></div>
    </div>
  )
}

function getValueStatus(cardId, label, value) {
  const text = String(value)
  const lower = text.toLowerCase()
  const unavailable = ['not determined', 'not tracked', 'not available', 'unavailable', 'not detected'].some(item => lower.includes(item))
  const warning = lower.includes('needs attention') || lower.includes('limited') || lower.includes('thin') || (label === 'Warnings' && Number(value) > 0)
  const checkState = cardId === 'structure' && ['Heading outline', 'Landmarks', 'Navigation', 'Main content'].includes(label) && !warning && !unavailable
  const passState = cardId === 'accessibility' && ['Heading hierarchy', 'Landmark quality'].includes(label) && !warning && !unavailable
  const attention = cardId === 'content' && label === 'Content depth' && ['light', 'thin'].includes(lower)

  if (unavailable) return { display: text, tone: 'text-slate-600' }
  if (warning || attention) return { display: label === 'Warnings' ? text : text, tone: 'text-amber-300', icon: 'warning' }
  if (checkState) return { display: '', tone: 'text-emerald-300', icon: 'check' }
  if (cardId === 'structure' && label === 'Hierarchy') return { display: 'Pass', tone: 'text-emerald-300' }
  if (cardId === 'structure' && label === 'ARIA snapshot') return { display: 'Captured', tone: 'text-emerald-300' }
  if (passState) return { display: 'Pass', tone: 'text-emerald-300' }
  if (label === 'Warnings' && Number(value) === 0) return { display: '0', tone: 'text-emerald-300' }
  return { display: text, tone: 'text-emerald-300' }
}
