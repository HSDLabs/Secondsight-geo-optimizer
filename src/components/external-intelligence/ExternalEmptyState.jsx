import { ArrowRight, Eye, Globe2, Info, Network, RefreshCw, ShieldAlert } from '../icons/heroicons'
import SourceLogo from './SourceLogo'

const promises = [
  { icon: Globe2, title: 'Discover where the brand appears', copy: 'Search supported public sources for relevant mentions.' },
  { icon: Network, title: 'Understand associations and themes', copy: 'See what external evidence connects to the entity.' },
  { icon: Eye, title: 'Inspect supporting evidence', copy: 'Trace every finding back to its source records.' },
  { icon: ShieldAlert, title: 'Find authority gaps and reputation risks', copy: 'Distinguish missing independent coverage from evidence-backed risks.' }
]

const analyzedDetails = [
  'Current live sources and their collection status',
  'Entity matching and identity consistency',
  'Relevance filtering and duplicate removal',
  'Recurring themes and external associations',
  'Independent authority and coverage gaps',
  'Evidence-backed reputation risks'
]

const sourceDefinitions = [
  { sourceType: 'reddit', label: 'Reddit', role: 'Community discussions' },
  { sourceType: 'news', label: 'News', role: 'Independent coverage' },
  { sourceType: 'youtube', label: 'YouTube', role: 'Creator coverage' },
  { sourceType: 'x', label: 'X', role: 'Public social discussion' }
]

export default function ExternalEmptyState({ hasSiteAnalysis, capabilities, onStart, onRetryCapabilities, error }) {
  const sourceByType = new Map((capabilities?.sources || []).map(source => [source.sourceType, source]))
  const capabilityUnavailable = !capabilities && Boolean(error)
  const analysisError = capabilities && error

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)]" aria-labelledby="external-empty-title">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:py-14">
        <div className="max-w-3xl">
          <p className="m-0 text-[11px] font-bold uppercase tracking-[.12em] text-[var(--accent-blue)]">Off-site signals</p>
          <h2 id="external-empty-title" className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text)]">Discover how the open web represents your brand</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">Sources &amp; Authority shows where your brand appears, what the open web associates with it, and the evidence behind each conclusion.</p>
        </div>

        <div className="mt-8 grid gap-3 md:grid-cols-2">
          {promises.map(({ icon: Icon, title, copy }) => (
            <article key={title} className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]"><Icon size={18} /></span>
              <div><h3 className="text-[13px] font-semibold text-[var(--text)]">{title}</h3><p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">{copy}</p></div>
            </article>
          ))}
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(260px,.8fr)_minmax(0,1.2fr)]">
          <details open className="group h-fit rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-semibold text-[var(--text)]">What is analyzed?<ArrowRight size={15} className="text-[var(--text-secondary)] transition group-open:rotate-90" /></summary>
            <ul className="mt-4 space-y-2 border-t border-[var(--border)] pt-4">{analyzedDetails.map(detail => <li key={detail} className="grid grid-cols-[5px_minmax(0,1fr)] gap-3 text-[12px] leading-5 text-[var(--text-secondary)]"><span className="mt-2 size-1.5 rounded-full bg-[var(--accent-blue)]" />{detail}</li>)}</ul>
            <p className="mt-4 border-t border-[var(--border)] pt-4 text-[11px] leading-5 text-[var(--text-secondary)]">This analysis measures off-site evidence. It does not directly measure whether AI engines mention or cite the brand.</p>
          </details>

          <div className="min-w-0">
            <div className="flex flex-wrap items-end justify-between gap-2"><div><h3 className="text-sm font-semibold text-[var(--text)]">Sources available for the next analysis</h3><p className="mt-1 text-[11px] text-[var(--text-secondary)]">Automatic mode confirms availability before collection begins.</p></div>{capabilities && <span className="text-[10px] font-semibold uppercase tracking-[.07em] text-[var(--status-good)]">Capability check complete</span>}</div>

            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {sourceDefinitions.map(definition => <SourceStatus key={definition.sourceType} definition={definition} capability={sourceByType.get(definition.sourceType)} pending={!capabilities} />)}
            </div>

            {capabilityUnavailable && <div role="status" className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--accent-amber)]/25 bg-[var(--accent-amber)]/[.07] p-4"><div className="flex min-w-0 items-start gap-3"><Info size={17} className="mt-0.5 shrink-0 text-[var(--status-warning)]"/><div><strong className="text-[12px] text-[var(--status-warning)]">Source availability is temporarily unavailable.</strong><p className="mt-1 max-w-xl text-[11px] leading-5 text-[var(--text-secondary)]">You can still run the site scan. Available sources will be confirmed before source analysis begins.</p></div></div><button type="button" onClick={onRetryCapabilities} className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-[var(--accent-amber)]/25 px-3 text-[11px] font-semibold text-[var(--status-warning)] transition hover:bg-[var(--accent-amber)]/[.06]"><RefreshCw size={14}/>Retry</button></div>}
          </div>
        </div>

            {analysisError && <div role="status" className="mt-5 flex items-start gap-3 rounded-xl border border-[var(--accent-amber)]/25 bg-[var(--accent-amber)]/[.06] p-4 text-[12px] leading-5 text-[var(--text-secondary)]"><Info size={17} className="mt-0.5 shrink-0 text-[var(--status-warning)]"/><span><strong className="block text-[var(--status-warning)]">Source analysis needs attention</strong>{error}</span></div>}

        <div className="mt-8 rounded-xl border border-[var(--accent-blue)]/15 bg-[var(--accent-blue)]/[.045] p-5">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]"><ArrowRight size={17} className="-rotate-90" /></span><div><h3 className="text-sm font-semibold text-[var(--text)]">Ready to analyze external signals?</h3><p className="mt-1 max-w-2xl text-[12px] leading-5 text-[var(--text-secondary)]">{hasSiteAnalysis ? 'The site scan is ready. Start Sources & Authority to collect supported off-site evidence.' : 'Enter a website above and run the site analysis. Sources & Authority starts automatically after the main scan completes.'}</p></div></div>
            {hasSiteAnalysis && <button type="button" onClick={onStart} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-[var(--accent-blue)] bg-[var(--accent-blue)] px-4 text-[12px] font-bold text-white transition hover:brightness-110">Start source analysis <ArrowRight size={15}/></button>}
          </div>
          <p className="mt-4 flex items-center gap-2 border-t border-[var(--border)] pt-3 text-[10px] text-[var(--text-secondary)]"><Info size={13}/>Information</p>
        </div>
      </div>
    </section>
  )
}

function SourceStatus({ definition, capability, pending }) {
  const enabled = Boolean(capability?.available)
  const label = pending ? 'Availability pending' : enabled ? 'Enabled' : 'Unavailable'
  const tone = pending ? 'bg-[var(--accent-amber)]' : enabled ? 'bg-[var(--accent-teal)]' : 'bg-[var(--text-muted)]'
  const textTone = pending ? 'text-[var(--status-warning)]' : enabled ? 'text-[var(--status-good)]' : 'text-[var(--text-secondary)]'
  return <article className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--panel-soft)] px-3 py-3"><div className="flex min-w-0 items-center gap-3"><SourceLogo sourceType={definition.sourceType} /><div className="min-w-0"><strong className="block text-[12px] text-[var(--text)]">{definition.label}</strong><span className="mt-1 block truncate text-[10px] text-[var(--text-secondary)]">{definition.role}</span></div></div><span className={`inline-flex shrink-0 items-center gap-2 text-[10px] font-semibold ${textTone}`}><i className={`size-1.5 rounded-full ${tone}`}/>{label}</span></article>
}
