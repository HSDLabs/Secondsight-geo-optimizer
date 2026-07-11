import { useMemo, useState } from 'react'
import { Check, Clipboard, ScanLine } from 'lucide-react'
import SectionShell from './SectionShell'
import { getExtractionQuality, getExtractionTabs } from './analysisViewModel'

export default function ExtractionInspector({ data, progressState }) {
  const tabs = useMemo(() => getExtractionTabs(data, progressState), [data, progressState])
  const [activeId, setActiveId] = useState('markdown')
  const [copied, setCopied] = useState(false)
  const active = tabs.find(tab => tab.id === activeId) || tabs[0]
  const quality = useMemo(() => getExtractionQuality(data), [data])

  async function copyContent() {
    await navigator.clipboard?.writeText(active.content)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <SectionShell id="extraction-inspector" number="3" title="Extraction Inspector" description="The actual content and machine-readable data produced by this scan.">
      <div className="p-3 sm:p-4">
        <div className="flex gap-1 overflow-x-auto rounded-lg border border-slate-700/40 bg-[#090f18]/70 p-1" role="tablist" aria-label="Extraction formats">
          {tabs.map(tab => <button key={tab.id} id={`tab-${tab.id}`} type="button" role="tab" aria-selected={activeId === tab.id} aria-controls={`panel-${tab.id}`} onClick={() => setActiveId(tab.id)} className={`relative whitespace-nowrap rounded-md px-3 py-2 text-[11px] font-medium transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 ${activeId === tab.id ? 'bg-violet-400/10 text-violet-200 shadow-[inset_0_0_0_1px_rgba(167,139,250,.18),0_5px_15px_rgba(0,0,0,.12)]' : 'text-slate-500 hover:bg-white/[.025] hover:text-slate-300'}`}>{tab.label}{activeId === tab.id && <span className="mu-tab-indicator absolute inset-x-3 -bottom-1 h-px bg-violet-400" />}</button>)}
        </div>
        <div className="mu-stagger-grid mu-no-sheen mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_250px]">
          <div className="relative overflow-hidden rounded-lg border border-slate-700/50 bg-[#070c14] shadow-[inset_0_1px_rgba(255,255,255,.015)]">
            <div className="flex items-center justify-between border-b border-slate-700/40 px-4 py-2.5"><span className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.1em] text-violet-300"><ScanLine size={12} />{active.label} extraction</span><button type="button" onClick={copyContent} className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] transition ${copied ? 'border-emerald-400/20 bg-emerald-400/5 text-emerald-300' : 'border-slate-700/60 text-slate-400 hover:border-violet-400/25 hover:text-violet-200'}`}>{copied ? <Check size={12} /> : <Clipboard size={12} />}{copied ? 'Copied' : 'Copy'}</button></div>
            <pre id={`panel-${active.id}`} role="tabpanel" aria-labelledby={`tab-${active.id}`} tabIndex="0" className="mu-tab-panel max-h-[500px] min-h-72 overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-[11px] leading-[1.75] text-slate-300 selection:bg-violet-400/25">{active.content}</pre>
          </div>
          <aside className="rounded-lg border border-violet-400/10 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,.07),transparent_60%),rgba(9,15,24,.72)] p-4">
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-600">Extraction quality</span>
            <strong className="mt-2 block text-lg font-semibold tracking-[-0.02em] text-violet-200">{quality.label}</strong>
            <p className="mt-1 text-[10px] leading-4 text-slate-500">{quality.passed}/{quality.checks.length} direct extraction checks available.</p>
            <div className="mt-5 grid gap-3">{quality.checks.map(([label, passed]) => <div key={label} className="flex items-start gap-2"><span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full ${passed ? 'bg-emerald-400/10 text-emerald-300' : 'bg-slate-700/30 text-slate-600'}`}>{passed ? <Check size={10} /> : '—'}</span><span className={`text-[10px] leading-4 ${passed ? 'text-slate-300' : 'text-slate-600'}`}>{label}</span></div>)}</div>
          </aside>
        </div>
      </div>
    </SectionShell>
  )
}
