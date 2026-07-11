import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import '../../styles/AIUnderstanding.css'
import MachineUnderstandingHero from './MachineUnderstandingHero'
import RawEvidenceSection from './RawEvidenceSection'
import InterpretationSection from './InterpretationSection'
import ExtractionInspector from './ExtractionInspector'
import ImprovementOpportunities from './ImprovementOpportunities'
import MachineSignals from './MachineSignals'
import { buildCanonicalIssues } from './progressiveAnalysis'
import { buildInterpretationOpportunities } from './analysisViewModel'
import { analysisSkeletonClass } from '../../components/analysisSkeleton'

export default function AIUnderstanding() {
  const {
    data,
    loading,
    error,
    scoreBreakdown,
    selectedNodeId,
    setSelectedNodeId,
    analysisProgress
  } = useOutletContext()

  const issues = useMemo(() => {
    const canonical = buildCanonicalIssues(data, analysisProgress)
    const existingTypes = new Set(canonical.map(issue => issue.type))
    const interpretation = buildInterpretationOpportunities(data, analysisProgress)
      .filter(issue => !existingTypes.has(issue.type))
    return [...canonical, ...interpretation]
  }, [data, analysisProgress])
  const score = data ? scoreBreakdown?.score : null

  return (
    <div className="mu-page grid min-w-0 gap-5 md:gap-6">
      {error && <div role="alert" className="rounded-lg border border-rose-400/25 bg-rose-400/8 px-4 py-3 text-sm text-rose-200">{error}</div>}

      <MachineUnderstandingHero score={score} scoreBreakdown={scoreBreakdown} loading={loading} url={data?.url} />

      {!data && !error && <LoadingWorkspace loading={loading} />}

      {data && (
        <>
          <RawEvidenceSection data={data} selectedNodeId={selectedNodeId} onSelectNode={setSelectedNodeId} />
          <InterpretationSection data={data} progressState={analysisProgress} issues={issues} />
          <ExtractionInspector data={data} progressState={analysisProgress} />
          <ImprovementOpportunities issues={issues} semanticIndex={data?.a11y?.semanticIndex || {}} />
          <MachineSignals data={data} />
        </>
      )}
    </div>
  )
}

function LoadingWorkspace({ loading }) {
  return (
    <section aria-live="polite" className="rounded-xl border border-sky-400/15 bg-[#111927]/60 p-5">
      <div className="flex items-center gap-3"><span className={`${loading ? 'mu-scan-pulse bg-sky-400' : 'bg-slate-600'} size-2 rounded-full`} /><div><h2 className="text-xs font-semibold text-slate-200">{loading ? 'Building the evidence map' : 'Machine evidence workspace'}</h2><p className="mt-1 text-[11px] text-slate-500">{loading ? 'Rendering the page, extracting semantics, and preparing readable content.' : 'Analyze a URL to populate the evidence cards below.'}</p></div></div>
      <div className="mu-stagger-grid mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{['Human view', 'Accessibility tree', 'Readable content', 'Metadata'].map(label => <div key={label} className="flex min-h-[112px] flex-col rounded-lg border border-slate-700/45 bg-[#0b121d]/70 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-slate-600/70 hover:shadow-[0_14px_35px_rgba(0,0,0,.14)]"><span className="text-[10px] font-semibold uppercase tracking-[.07em] text-slate-500">{label}</span><span className={`mt-3 block h-9 w-20 ${analysisSkeletonClass}`}/><span className="mt-auto pt-3 text-[10px] text-slate-600">{loading ? 'Analyzing signals' : 'Awaiting analysis'}</span></div>)}</div>
    </section>
  )
}
