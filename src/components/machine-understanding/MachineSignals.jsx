import { Check, Minus } from '../icons/heroicons'
import { getMachineSignals } from './utils/analysisViewModel'

export default function MachineSignals({ data }) {
  return (
    <section className="mu-section-enter rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6" style={{ '--mu-section-delay': '350ms' }}>
      <div><h2 className="text-base font-semibold text-[var(--text)]">Machine Signals</h2><p className="mt-1 text-[13px] text-[var(--text-secondary)]">Compact source summary for this analysis.</p></div>
      <div className="mu-stagger-grid mt-5 flex flex-wrap gap-2.5">{getMachineSignals(data).map(([label, value]) => {
        const positive = value === true
        const negative = value === false
        return <span key={label} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-darker)]/45 px-3 text-[12px] text-[var(--text-secondary)]"><span className={positive ? 'text-[var(--accent-teal)]' : 'text-[var(--text-muted)]'}>{positive ? <Check size={16} /> : <Minus size={16} />}</span>{label}{typeof value !== 'boolean' && <strong className="font-medium text-[var(--text)]">{value}</strong>}{negative && <strong className="font-medium text-[var(--text-muted)]">Unavailable</strong>}</span>
      })}</div>
    </section>
  )
}
