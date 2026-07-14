import { Accessibility, AlertTriangle, Boxes, Check, Eye, FileSearch, Fingerprint, Network, Sparkles } from '../icons/heroicons'
import SectionShell from './SectionShell'
import { getInterpretationCards } from './utils/analysisViewModel'

const cardConfig = {
  identity: { icon: Fingerprint, iconTone: 'border-[var(--accent-amber)]/25 bg-[var(--accent-amber)]/10 text-[var(--status-warning)]' },
  structure: { icon: Network, iconTone: 'border-[var(--accent-purple)]/25 bg-[var(--accent-purple)]/10 text-[var(--status-purple)]' },
  content: { icon: FileSearch, iconTone: 'border-[var(--accent-blue)]/25 bg-[var(--accent-blue)]/10 text-[var(--status-info)]' },
  knowledge: { icon: Boxes, iconTone: 'border-[var(--accent-purple)]/25 bg-[var(--accent-purple)]/10 text-[var(--status-purple)]' },
  accessibility: { icon: Accessibility, iconTone: 'border-[var(--accent-teal)]/25 bg-[var(--accent-teal)]/10 text-[var(--status-good)]' }
}

export default function InterpretationSection({ data, progressState, issues = [] }) {
  const cards = getInterpretationCards(data, progressState)
  const action = <button type="button" onClick={() => document.getElementById('extraction-inspector')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="inline-flex min-h-10 items-center gap-2 text-[12px] font-semibold text-[var(--accent-blue)] transition hover:text-blue-200">View details <span aria-hidden="true">→</span></button>

  return (
    <SectionShell icon={Network} title="Interpretation" description="What these signals indicate about the page." action={action}>
      <div className="mu-stagger-grid grid items-stretch gap-4 p-5 md:grid-cols-2 min-[1440px]:grid-cols-3">
        {cards.map(card => <InterpretationCard key={card.id} card={card} issues={issues.filter(issue => issue.stageId === card.id)} />)}
      </div>
    </SectionShell>
  )
}

function InterpretationCard({ card, issues }) {
  const config = cardConfig[card.id]
  const Icon = config.icon
  return (
    <article className="mu-hover-card flex min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-darker)]/45 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-white/15">
      <header className="flex min-w-0 items-center gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl border ${config.iconTone}`}><Icon size={20} strokeWidth={1.8} /></span>
        <h3 className="min-w-0 text-[14px] font-semibold leading-5 tracking-[-0.01em] text-[var(--text)]">{card.title}</h3>
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
    <div className="grid min-w-0 grid-cols-[96px_minmax(0,1fr)] items-start gap-3">
      <dt className="min-w-0 text-[12px] leading-5 text-[var(--text-secondary)]">{label}</dt>
      <dd className={`flex min-w-0 items-start justify-end gap-1.5 text-right text-[13px] font-medium leading-5 ${status.tone}`} title={String(value)}>
        {status.icon === 'check' && <Check size={12} strokeWidth={2.5} className="shrink-0" />}
        {status.icon === 'warning' && <AlertTriangle size={11} strokeWidth={2} className="shrink-0" />}
        {status.display && <span className="min-w-0 break-words [overflow-wrap:anywhere]">{status.display}</span>}
      </dd>
    </div>
  )
}

function KnowledgeGroups({ groups, empty }) {
  return (
    <div className="mt-5 grid min-w-0 gap-4">
      {groups.length ? groups.map(group => (
        <div key={group.label} className="min-w-0">
          <span className="block text-[12px] font-medium text-[var(--text-secondary)]">{group.label}</span>
          <div className="mt-2 flex flex-wrap gap-2">{String(group.value).split(',').map(value => <span key={value} className="max-w-full break-words rounded-lg border border-[var(--border)] bg-[var(--panel-raised)]/55 px-2.5 py-1.5 text-[11px] text-[var(--text)]">{value.trim()}</span>)}</div>
        </div>
      )) : <p className="text-[13px] leading-5 text-[var(--text-secondary)]">{empty}</p>}
    </div>
  )
}

function ConfidenceFooter({ certainty, confidence, issueCount }) {
  const observed = certainty === 'Observed'
  const hasIssues = issueCount > 0
  const badgeTone = hasIssues
    ? 'bg-[var(--accent-amber)]/10 text-[var(--status-warning)]'
    : observed ? 'bg-[var(--accent-teal)]/10 text-[var(--status-good)]' : 'bg-[var(--accent-purple)]/10 text-[var(--status-purple)]'
  const barTone = hasIssues ? 'bg-[var(--accent-amber)]' : observed ? 'bg-[var(--accent-teal)]' : 'bg-[var(--accent-purple)]'
  return (
    <div className="mt-auto border-t border-[var(--border)] pt-4" title="Evidence confidence reflects the coverage and provenance of scan inputs, not page quality.">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-[var(--text-secondary)]">Evidence confidence</span>
        <strong className="text-[11px] font-semibold tabular-nums text-[var(--text)]">{confidence}%</strong>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border border-current/15 px-2.5 text-[10px] font-medium ${badgeTone}`}>
          {hasIssues ? <AlertTriangle size={14} /> : observed ? <Eye size={14} /> : <Sparkles size={14} />}
          {hasIssues ? `${issueCount} issue${issueCount === 1 ? '' : 's'}` : certainty}
        </span>
        {hasIssues && <span className={`text-[10px] ${observed ? 'text-[var(--status-good)]' : 'text-[var(--status-purple)]'}`}>{certainty}</span>}
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--panel-raised)]"><span className={`block h-full rounded-full transition-[width] duration-500 ${barTone}`} style={{ width: `${confidence}%` }} /></div>
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

  if (unavailable) return { display: text, tone: 'text-[var(--text-secondary)]' }
  if (warning || attention) return { display: text, tone: 'text-[var(--status-warning)]', icon: 'warning' }
  if (checkState) return { display: '', tone: 'text-[var(--status-good)]', icon: 'check' }
  if (cardId === 'structure' && label === 'Hierarchy') return { display: 'Pass', tone: 'text-[var(--status-good)]' }
  if (cardId === 'structure' && label === 'ARIA snapshot') return { display: 'Captured', tone: 'text-[var(--status-good)]' }
  if (passState) return { display: 'Pass', tone: 'text-[var(--status-good)]' }
  if (label === 'Warnings' && Number(value) === 0) return { display: '0', tone: 'text-[var(--status-good)]' }
  return { display: text, tone: 'text-[var(--status-good)]' }
}
