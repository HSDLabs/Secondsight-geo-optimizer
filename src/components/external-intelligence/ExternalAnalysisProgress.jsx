import { AlertTriangle, CheckCircle2, Clock, RefreshCw } from '../icons/heroicons'

const terminal = new Set(['complete', 'complete_empty'])
const failed = new Set(['failed', 'rate_limited', 'authentication_required', 'unavailable', 'not_supported'])

function StateIcon({ state }) {
  if (terminal.has(state)) return <CheckCircle2 size={16} />
  if (failed.has(state)) return <AlertTriangle size={16} />
  if (state === 'collecting' || state === 'running') return <RefreshCw size={16} className="ei-spin" />
  return <Clock size={16} />
}

export default function ExternalAnalysisProgress({ run, error, onRetry }) {
  const statusLabel = run?.status === 'failed' ? 'Analysis could not complete' : run?.status === 'completed_degraded' ? 'Completed with limited intelligence' : 'Analyzing external evidence'
  return (
    <section className="ei-state-panel">
      <div className="mx-auto max-w-5xl px-5 py-9 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="ei-eyebrow">Live pipeline</p><h2 className="mt-2 text-xl font-semibold text-[var(--text)]">{statusLabel}</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">This view reports completed work, current work, waiting stages, and source-level failures directly.</p></div>
          {run?.status === 'failed' && <button type="button" className="ei-secondary-button" onClick={onRetry}><RefreshCw size={15} /> Start a new run</button>}
        </div>
        {(error || run?.error) && <p className="ei-inline-error" role="alert">{error || run.error}</p>}

        <div className="mt-7 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="ei-report-card">
            <div className="ei-card-heading"><div><h3>Analysis pipeline</h3><p>Final metrics remain hidden until evidence is usable.</p></div></div>
            <div className="ei-progress-list">
              {(run?.pipeline || []).map(step => (
                <div key={step.id} className={`ei-progress-row is-${step.state}`}>
                  <StateIcon state={step.state} />
                  <span>{step.label}</span>
                  <small>{step.detail || step.state.replaceAll('_', ' ')}</small>
                </div>
              ))}
            </div>
          </div>
          <div className="ei-report-card">
            <div className="ei-card-heading"><div><h3>Source collection</h3><p>A failed source does not erase successful evidence.</p></div></div>
            <div className="ei-progress-list">
              {(run?.sourceSummaries || []).map(source => (
                <div key={source.sourceType} className={`ei-source-progress is-${source.state}`}>
                  <div className="flex min-w-0 items-center gap-2"><StateIcon state={source.state} /><strong>{source.sourceType === 'x' ? 'X' : source.sourceType}</strong></div>
                  <span>{source.counts?.found || 0} found · {source.counts?.retained || 0} retained</span>
                  <small>{source.reason || (source.state === 'complete_empty' ? 'Successfully searched; no relevant items found.' : source.actualRange ? `${source.actualRange.from} to ${source.actualRange.to}` : source.state.replaceAll('_', ' '))}</small>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-5 text-xs text-[var(--text-secondary)]">Temporary analysis results are available for up to 24 hours.</p>
      </div>
    </section>
  )
}
