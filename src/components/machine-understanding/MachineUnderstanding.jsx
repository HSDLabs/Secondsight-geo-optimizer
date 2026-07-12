import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import './styles/MachineUnderstanding.css'
import MachineUnderstandingHero from './MachineUnderstandingHero'
import RawEvidenceSection from './RawEvidenceSection'
import InterpretationSection from './InterpretationSection'
import ExtractionInspector from './ExtractionInspector'
import ImprovementOpportunities from './ImprovementOpportunities'
import MachineSignals from './MachineSignals'
import { buildCanonicalIssues } from './utils/progressiveAnalysis'
import { buildInterpretationOpportunities } from './utils/analysisViewModel'
import { Diamond, FileText, Image, Network } from '../icons/heroicons'

const pendingEvidence = [
  { label: 'Human view', detail: 'Rendered page preview', icon: Image, tone: 'text-[var(--accent-blue)] bg-[var(--accent-blue)]/[.07]' },
  { label: 'Accessibility tree', detail: 'Semantic relationships', icon: Network, tone: 'text-[var(--accent-teal)] bg-[var(--accent-teal)]/[.07]' },
  { label: 'Readable content', detail: 'Extracted page copy', icon: FileText, tone: 'text-[var(--accent-purple)] bg-[var(--accent-purple)]/[.07]' },
  { label: 'Metadata', detail: 'Identity and structured signals', icon: Diamond, tone: 'text-[var(--accent-amber)] bg-[var(--accent-amber)]/[.07]' }
]

export default function MachineUnderstanding() {
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
    <section aria-live="polite" className="rounded-xl border border-[var(--accent-purple)]/15 bg-[var(--panel)] p-5">
      <div className="flex items-center gap-3"><span className={`size-2 rounded-full ${loading ? 'bg-[var(--accent-purple)]' : 'bg-[var(--text-muted)]'}`} /><div><h2 className="text-[14px] font-semibold text-[var(--text)]">{loading ? 'Preparing machine evidence' : 'Machine evidence workspace'}</h2><p className="mt-1 text-[13px] text-[var(--text-secondary)]">{loading ? 'The report will populate when the rendered evidence is ready.' : 'Analyze a URL to populate the evidence cards below.'}</p></div></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 min-[1440px]:grid-cols-3 min-[1680px]:grid-cols-4">{pendingEvidence.map(({ label, detail, icon: Icon, tone }) => <div key={label} className="flex min-h-32 flex-col rounded-lg border border-[var(--border)] bg-[var(--panel-raised)] p-5"><span className={`grid size-10 place-items-center rounded-lg ${tone}`}><Icon size={20}/></span><strong className="mt-4 text-[13px] font-semibold text-[var(--text)]">{label}</strong><span className="mt-1 text-[12px] text-[var(--text-secondary)]">{loading ? detail : 'Available after analysis'}</span></div>)}</div>
    </section>
  )
}
