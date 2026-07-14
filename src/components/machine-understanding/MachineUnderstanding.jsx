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
  { label: 'Human view', description: 'Rendered screenshot used to compare visible content with what machines can extract.', icon: Image, tone: 'text-[var(--accent-blue)] bg-[var(--accent-blue)]/[.07]' },
  { label: 'Accessibility tree', description: 'Landmarks, roles, headings, labels, and semantic relationships exposed by the browser.', icon: Network, tone: 'text-[var(--accent-teal)] bg-[var(--accent-teal)]/[.07]' },
  { label: 'Readable content', description: 'Main text, headings, links, and page intent available in the readable extraction.', icon: FileText, tone: 'text-[var(--accent-purple)] bg-[var(--accent-purple)]/[.07]' },
  { label: 'Metadata', description: 'Title, description, canonical URL, social metadata, and structured-data signals.', icon: Diamond, tone: 'text-[var(--accent-amber)] bg-[var(--accent-amber)]/[.07]' }
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
    <section aria-live="polite" className="mu-section-enter rounded-xl border border-[var(--accent-purple)]/15 bg-[var(--panel)] p-4 sm:p-5" style={{ '--mu-section-delay': '70ms' }}>
      <div className="flex items-start gap-3"><span className={`mt-1 size-2 shrink-0 rounded-full ${loading ? 'bg-[var(--accent-purple)]' : 'bg-[var(--text-muted)]'}`} /><div><h2 className="text-[14px] font-semibold text-[var(--text)]">{loading ? 'Preparing machine evidence' : 'Machine evidence workspace'}</h2><p className="mt-1 max-w-3xl text-[13px] leading-5 text-[var(--text-secondary)]">{loading ? 'The report will populate when the rendered evidence is ready.' : 'Run an analysis to compare what people see with the structure and content exposed to machines.'}</p></div></div>
      <div className="mu-stagger-grid mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{pendingEvidence.map(({ label, description, icon: Icon, tone }) => <article key={label} className="mu-hover-card flex min-w-0 flex-col rounded-lg border border-[var(--border)] bg-[var(--panel-raised)] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-white/15"><div className="flex items-center gap-3"><span className={`grid size-9 shrink-0 place-items-center rounded-lg ${tone}`}><Icon size={18}/></span><strong className="text-[13px] font-semibold text-[var(--text)]">{label}</strong></div><p className="mt-3 text-[12px] leading-5 text-[var(--text-secondary)]">{description}</p><span className="mt-auto pt-3 text-[11px] font-medium text-[var(--text-muted)]">{loading ? 'Preparing evidence' : 'Available after analysis'}</span></article>)}</div>
    </section>
  )
}
