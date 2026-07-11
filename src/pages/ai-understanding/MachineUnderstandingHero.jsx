import { useState } from 'react'
import { Globe2, Info } from 'lucide-react'
import { scoreVerdict } from './analysisViewModel'
import AnalysisModal from './AnalysisModal'
import { UnderstandingIcon } from '../../components/icons'
import { analysisSkeletonClass } from '../../components/analysisSkeleton'

export default function MachineUnderstandingHero({ score, scoreBreakdown, loading, url }) {
  const hasScore = typeof score === 'number'
  const safeScore = hasScore ? score : 0
  const verdict = scoreVerdict(safeScore)
  const showSkeleton = loading || !hasScore
  const [showDetails, setShowDetails] = useState(false)

  return (
    <>
    <section className="mu-section-enter relative min-w-0 overflow-hidden rounded-xl border border-slate-700/50 bg-[#101824]/90 shadow-[0_18px_60px_rgba(0,0,0,.12)]" style={{ '--mu-section-delay': '0ms' }}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(56,189,248,.045),transparent_38%)]" />
      <div className="relative grid min-w-0 lg:grid-cols-[minmax(0,1.55fr)_minmax(250px,.72fr)_minmax(260px,.78fr)]">
        <div className="flex min-h-44 min-w-0 flex-col justify-center px-5 py-6 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-sky-400/20 bg-sky-400/[.06] text-sky-300 shadow-[inset_0_1px_rgba(255,255,255,.025)]"><UnderstandingIcon size={21} strokeWidth={1.8} /></span>
            <h1 className="text-[1.45rem] font-semibold tracking-[-0.03em] text-slate-100 sm:text-[1.7rem]">Machine Understanding</h1>
            <span className="rounded border border-violet-400/25 bg-violet-400/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-violet-300">Beta</span>
          </div>
          <p className="mt-3 text-sm leading-5 text-slate-400">Can machines reliably parse and understand this page?</p>
          {url && <p className="mt-3 flex min-w-0 items-center gap-2 text-[11px] text-slate-500"><Globe2 size={12} className="shrink-0 text-sky-300" /><span className="truncate">{url}</span></p>}
        </div>

        <div className="min-w-0 border-t border-slate-700/40 bg-[#0b121d]/45 px-5 py-5 lg:border-l lg:border-t-0">
          <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.11em] text-slate-400">Machine Readability Score <Info size={11} /></div>
          {showSkeleton ? <div className={`mt-4 h-14 w-28 ${analysisSkeletonClass}`} aria-label={loading ? 'Calculating machine readability' : 'Awaiting machine-understanding analysis'} /> : (
            <>
              <div className="mt-2 flex items-end justify-center gap-2 lg:justify-start"><strong className="mu-score-number text-5xl font-semibold tabular-nums tracking-[-0.05em] text-emerald-300">{safeScore}</strong><span className="mb-1.5 text-sm text-slate-500">/ 100</span></div>
              <Status label={verdict.label} tone={verdict.tone} />
            </>
          )}
          {!showSkeleton && scoreBreakdown?.items?.length > 0 && <button type="button" onClick={() => setShowDetails(true)} className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-medium text-sky-300 transition hover:text-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400">View score details <span aria-hidden="true">→</span></button>}
        </div>

        <div className="flex min-w-0 flex-col justify-center border-t border-slate-700/40 px-5 py-5 lg:border-l lg:border-t-0 sm:px-6">
          <p className="text-xs leading-5 text-slate-400">Measures how well machines can parse structure, readable content, metadata, and accessible semantics.</p>
          <p className="mt-3 flex items-center gap-2 text-[11px] text-slate-500"><Info size={12} className="shrink-0" />Does not measure AI rankings.</p>
        </div>
      </div>
    </section>
    <ScoreDetailsModal open={showDetails} onClose={() => setShowDetails(false)} score={safeScore} verdict={verdict} scoreBreakdown={scoreBreakdown} />
    </>
  )
}

function Status({ label, tone }) {
  return <span className={`mt-2 inline-flex min-w-32 justify-center rounded-md border px-3 py-1 text-[10px] font-medium ${tone}`}>{label}</span>
}

function ScoreDetailsModal({ open, onClose, score, verdict, scoreBreakdown }) {
  return (
    <AnalysisModal open={open} onClose={onClose} title="Machine Readability Score" description="How this page's evidence contributes to its machine-readability result." maxWidth="max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-[190px_minmax(0,1fr)]">
        <div className="rounded-lg border border-slate-700/45 bg-[radial-gradient(circle_at_top,rgba(79,209,161,.07),transparent_65%),#090f18] p-5 text-center">
          <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">Overall score</span>
          <div className="mt-3 flex items-end justify-center gap-1.5"><strong className="text-5xl font-semibold tabular-nums tracking-[-0.05em] text-emerald-300">{score}</strong><span className="mb-1.5 text-xs text-slate-500">/ 100</span></div>
          <span className={`mt-3 inline-flex rounded-md border px-3 py-1 text-[10px] font-medium ${verdict.tone}`}>{verdict.label}</span>
        </div>
        <div className="rounded-lg border border-slate-700/45 bg-[#090f18] p-4">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">Score contribution</h3>
          <dl className="mt-3 grid gap-1">{(scoreBreakdown?.items || []).map(item => {
            const positive = item.value > 0
            const negative = item.value < 0
            return <div key={item.label} className="flex items-center justify-between gap-4 border-b border-slate-700/25 py-2.5 last:border-0"><dt className="text-[11px] text-slate-400">{item.label}</dt><dd className={`font-mono text-[11px] font-semibold ${positive ? 'text-emerald-300' : negative ? 'text-rose-300' : 'text-slate-500'}`}>{positive ? '+' : ''}{item.value}</dd></div>
          })}</dl>
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-sky-400/10 bg-sky-400/[.035] p-4"><h3 className="text-[10px] font-semibold text-slate-300">What this score means</h3><p className="mt-2 text-[11px] leading-5 text-slate-500">The score measures how clearly the rendered page exposes structure, accessible semantics, readable content, and extractable signals. It does not measure search position, model preference, or AI rankings.</p></div>
    </AnalysisModal>
  )
}
