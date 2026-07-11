import { Check, Minus } from 'lucide-react'
import { getMachineSignals } from './analysisViewModel'

export default function MachineSignals({ data }) {
  return (
    <section className="mu-section-enter rounded-xl border border-slate-700/50 bg-[#111927]/80 p-4 sm:p-5" style={{ '--mu-section-delay': '350ms' }}>
      <div><h2 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-slate-200">Machine Signals</h2><p className="mt-1 text-xs text-slate-500">Compact source summary for this analysis.</p></div>
      <div className="mu-stagger-grid mt-4 flex flex-wrap gap-2">{getMachineSignals(data).map(([label, value]) => {
        const positive = value === true
        const negative = value === false
        return <span key={label} className="inline-flex items-center gap-2 rounded-md border border-slate-700/45 bg-[#0b121d]/70 px-2.5 py-2 text-[10px] text-slate-400"><span className={positive ? 'text-emerald-300' : 'text-slate-600'}>{positive ? <Check size={12} /> : <Minus size={12} />}</span>{label}{typeof value !== 'boolean' && <strong className="font-medium text-slate-300">{value}</strong>}{negative && <strong className="font-medium text-slate-600">Unavailable</strong>}</span>
      })}</div>
    </section>
  )
}
