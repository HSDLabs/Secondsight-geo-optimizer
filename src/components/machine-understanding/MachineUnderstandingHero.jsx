import { useState } from 'react'
import { Globe2, Info } from '../icons/heroicons'
import { scoreVerdict } from './utils/analysisViewModel'
import AnalysisModal from './AnalysisModal'
import { UnderstandingIcon } from '../icons'

export default function MachineUnderstandingHero({ score, scoreBreakdown, loading, url }) {
  const hasScore = typeof score === 'number'
  const safeScore = hasScore ? score : 0
  const verdict = scoreVerdict(safeScore)
  const showSkeleton = loading || !hasScore
  const [showDetails, setShowDetails] = useState(false)

  return (
    <>
    <section className="mu-section-enter relative min-w-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]" style={{ '--mu-section-delay': '0ms' }}>
      <div className="relative grid min-w-0 lg:grid-cols-[minmax(0,1.55fr)_minmax(250px,.72fr)_minmax(260px,.78fr)]">
        <div className="flex min-h-44 min-w-0 flex-col justify-center px-5 py-6 sm:px-7">
          <div className="flex min-w-0 flex-nowrap items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-[var(--accent-purple)]/25 bg-[var(--accent-purple)]/10 text-[var(--accent-purple)]"><UnderstandingIcon size={24} strokeWidth={1.8} /></span>
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="text-[1.45rem] font-semibold leading-tight tracking-[-0.03em] text-[var(--text)] sm:text-[1.7rem]">Machine Readability</h1>
              <span className="rounded-full border border-[var(--accent-purple)]/25 bg-[var(--accent-purple)]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--accent-purple)]">Beta</span>
            </div>
          </div>
          <p className="mt-3 text-sm leading-5 text-[var(--text-secondary)]">Can machines reliably extract the structure, content, metadata, and meaning of this page?</p>
          {url && <p className="mt-3 flex min-w-0 items-center gap-2 text-[12px] text-[var(--text-secondary)]"><Globe2 size={16} className="shrink-0 text-[var(--accent-purple)]" /><span className="break-all">{url}</span></p>}
        </div>

        <div className="min-w-0 border-t border-[var(--border)] bg-[var(--panel-soft)] px-5 py-5 lg:border-l lg:border-t-0">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.11em] text-[var(--text-secondary)]">Machine Readability Score <Info size={15} /></div>
          {showSkeleton ? <PendingScore label={loading ? 'Calculating' : 'Not analyzed'} ariaLabel={loading ? 'Calculating machine readability' : 'Awaiting machine-readability analysis'} /> : (
            <>
              <div className="mt-2 flex items-end justify-center gap-2 lg:justify-start"><strong className="mu-score-number text-5xl font-semibold tabular-nums tracking-[-0.05em] text-[var(--good)]">{safeScore}</strong><span className="mb-1.5 text-sm text-[var(--faint)]">/ 100</span></div>
              <Status label={verdict.label} tone={verdict.tone} />
            </>
          )}
          {!showSkeleton && scoreBreakdown?.items?.length > 0 && <button type="button" onClick={() => setShowDetails(true)} className="mt-3 inline-flex min-h-10 items-center gap-2 text-[12px] font-semibold text-[var(--accent)] transition hover:text-[var(--text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]">View score details <span aria-hidden="true">→</span></button>}
        </div>

        <div className="flex min-w-0 flex-col justify-center border-t border-[var(--border)] px-5 py-5 lg:border-l lg:border-t-0 sm:px-6">
          <p className="text-[13px] leading-5 text-[var(--text-secondary)]">Measures how well machines can parse structure, readable content, metadata, and accessible semantics.</p>
          <p className="mt-3 flex items-center gap-2 text-[12px] text-[var(--text-secondary)]"><Info size={15} className="shrink-0" />Does not measure AI rankings.</p>
        </div>
      </div>
    </section>
    <ScoreDetailsModal open={showDetails} onClose={() => setShowDetails(false)} score={safeScore} verdict={verdict} scoreBreakdown={scoreBreakdown} />
    </>
  )
}

function PendingScore({ label, ariaLabel }) {
  return <div className="mt-4" aria-label={ariaLabel}><span className="block text-[10px] font-semibold uppercase tracking-[.1em] text-[var(--text-muted)]">Status</span><div className="mt-2 flex items-center gap-3"><strong className="text-3xl font-semibold text-[var(--text-muted)]">—</strong><span className="text-[12px] font-semibold text-[var(--text-secondary)]">{label}</span></div></div>
}

function Status({ label, tone }) {
  return <span className={`mt-2 inline-flex min-h-8 min-w-32 items-center justify-center rounded-full border px-3 text-[10px] font-medium ${tone}`}>{label}</span>
}

function ScoreDetailsModal({ open, onClose, score, verdict, scoreBreakdown }) {
  return (
    <AnalysisModal open={open} onClose={onClose} title="Machine Readability Score" description="How this page's evidence contributes to its machine-readability result." maxWidth="max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-[190px_minmax(0,1fr)]">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 text-center">
          <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">Overall score</span>
          <div className="mt-3 flex items-end justify-center gap-1.5"><strong className="text-5xl font-semibold tabular-nums tracking-[-0.05em] text-[var(--good)]">{score}</strong><span className="mb-1.5 text-xs text-[var(--faint)]">/ 100</span></div>
          <span className={`mt-3 inline-flex rounded-md border px-3 py-1 text-[10px] font-medium ${verdict.tone}`}>{verdict.label}</span>
        </div>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] p-4">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">Score contribution</h3>
          <dl className="mt-3 grid gap-1">{(scoreBreakdown?.items || []).map(item => {
            const positive = item.value > 0
            const negative = item.value < 0
            return <div key={item.label} className="flex items-center justify-between gap-4 border-b border-[var(--border)] py-2.5 last:border-0"><dt className="text-[11px] text-[var(--text-secondary)]">{item.label}</dt><dd className={`font-mono text-[11px] font-semibold ${positive ? 'text-[var(--status-good)]' : negative ? 'text-[var(--status-danger)]' : 'text-[var(--text-muted)]'}`}>{positive ? '+' : ''}{item.value}</dd></div>
          })}</dl>
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-[var(--accent-purple)]/15 bg-[var(--accent-purple)]/[.055] p-4"><h3 className="text-[12px] font-semibold text-[var(--text)]">What this score means</h3><p className="mt-2 text-[12px] leading-5 text-[var(--text-secondary)]">The score measures how clearly the rendered page exposes structure, accessible semantics, readable content, and extractable signals. It does not measure search position, model preference, or AI rankings.</p></div>
    </AnalysisModal>
  )
}
