import { useOutletContext } from 'react-router-dom'
import './styles/ExternalIntelligence.css'
import ExternalEmptyState from './ExternalEmptyState'
import ExternalAnalysisProgress from './ExternalAnalysisProgress'
import ExternalResults from './ExternalResults'

const TERMINAL = new Set(['completed', 'completed_degraded', 'failed', 'superseded'])

export default function ExternalIntelligence() {
  const {
    data,
    externalRun,
    publishedExternalRun,
    externalCapabilities,
    externalError,
    retryExternalCapabilities,
    startExternalRun,
    loadExternalRun,
    setExternalError
  } = useOutletContext()
  const published = externalRun?.publishable && externalRun?.publishedExternalRunId === externalRun.id
    ? externalRun
    : publishedExternalRun
  const active = externalRun && !TERMINAL.has(externalRun.status)

  const start = async overrides => {
    try { return await startExternalRun(overrides) }
    catch (error) { setExternalError(error.message); return null }
  }

  return (
    <div className="ei-page">
      <header className="ei-page-header">
        <div><h1>Sources &amp; Authority</h1><p>Understand how the open web describes, validates, and discusses your brand beyond your own website.</p></div>
        {published && <div className="ei-last-run"><span>{published.status === 'completed_degraded' ? 'Completed with limitations' : 'Analysis complete'}</span><time>{published.completedAt ? new Date(published.completedAt).toLocaleString() : 'In progress'}</time></div>}
      </header>

      {!externalRun && !published && <ExternalEmptyState hasSiteAnalysis={Boolean(data)} capabilities={externalCapabilities} onStart={() => start()} onRetryCapabilities={retryExternalCapabilities} error={externalError} />}
      {externalRun && !published && <ExternalAnalysisProgress run={externalRun} error={externalError} onRetry={() => start({ basedOnRunId: externalRun.id })} />}
      {published && <ExternalResults run={published} replacementRun={externalRun?.id !== published.id ? externalRun : active ? externalRun : null} capabilities={externalCapabilities} onCreateRun={start} onLoadRun={async runId => { try { return await loadExternalRun(runId) } catch (error) { setExternalError(error.message); return null } }} onSetError={setExternalError} />}
    </div>
  )
}
