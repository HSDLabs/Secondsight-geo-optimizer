import { useMemo, useState } from 'react'
import { Check, Clipboard, ScanLine } from '../icons/heroicons'
import SectionShell from './SectionShell'
import { getExtractionQuality, getExtractionTabs } from './utils/analysisViewModel'

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
      <div className="p-5">
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg-darker)] p-1" role="tablist" aria-label="Extraction formats">
          {tabs.map(tab => <button key={tab.id} id={`tab-${tab.id}`} type="button" role="tab" aria-selected={activeId === tab.id} aria-controls={`panel-${tab.id}`} onClick={() => setActiveId(tab.id)} className={`relative min-h-10 whitespace-nowrap rounded-lg px-3 text-[12px] font-medium transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-purple)] ${activeId === tab.id ? 'bg-[var(--accent-purple)]/10 text-[var(--status-purple)] shadow-[inset_0_0_0_1px_rgba(155,109,255,.2)]' : 'text-[var(--text-secondary)] hover:bg-[var(--panel-raised)] hover:text-[var(--text)]'}`}>{tab.label}{activeId === tab.id && <span className="mu-tab-indicator absolute inset-x-3 -bottom-1 h-px bg-[var(--accent-purple)]" />}</button>)}
        </div>
        <div className="mu-stagger-grid mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-darker)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3"><span className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--status-purple)]"><ScanLine size={16} />{active.label} extraction</span><button type="button" onClick={copyContent} className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-[12px] transition ${copied ? 'border-[var(--accent-teal)]/20 bg-[var(--accent-teal)]/[.06] text-[var(--status-good)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent-purple)]/25 hover:text-[var(--status-purple)]'}`}>{copied ? <Check size={16} /> : <Clipboard size={16} />}{copied ? 'Copied' : 'Copy'}</button></div>
            <pre id={`panel-${active.id}`} role="tabpanel" aria-labelledby={`tab-${active.id}`} tabIndex="0" className="mu-tab-panel max-h-[520px] min-h-72 overflow-auto whitespace-pre-wrap break-words p-5 font-mono text-[12px] leading-6 text-[var(--text-secondary)] selection:bg-[var(--accent-purple)]/25 [overflow-wrap:anywhere]">{active.content}</pre>
          </div>
          <aside className="rounded-xl border border-[var(--accent-purple)]/15 bg-[var(--bg-darker)]/55 p-5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">Extraction quality</span>
            <strong className="mt-2 block text-xl font-semibold tracking-[-0.02em] text-[var(--status-purple)]">{quality.label}</strong>
            <p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">{quality.passed}/{quality.checks.length} direct extraction checks available.</p>
            <div className="mt-5 grid gap-3">{quality.checks.map(([label, passed]) => <div key={label} className="flex items-start gap-3"><span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${passed ? 'bg-[var(--accent-teal)]/10 text-[var(--status-good)]' : 'bg-[var(--panel-raised)] text-[var(--text-muted)]'}`}>{passed ? <Check size={14} /> : '—'}</span><span className={`text-[12px] leading-5 ${passed ? 'text-[var(--text)]' : 'text-[var(--text-secondary)]'}`}>{label}</span></div>)}</div>
          </aside>
        </div>
      </div>
    </SectionShell>
  )
}
