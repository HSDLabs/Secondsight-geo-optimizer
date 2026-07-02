import { useOutletContext } from 'react-router-dom'
import VisibilityLayer from './VisibilityLayer'
import InsightsArea from './InsightsArea'
import IssuesArea from './IssuesArea'

export default function AIUnderstanding() {
  const {
    data,
    loading,
    error,
    visibilityScore,
    issueCount,
    scoreBreakdown,
    selectedNode,
    selectedNodeId,
    setSelectedNodeId,
    selectedIssue,
    selectIssueGroup
  } = useOutletContext()

  if (!data && !loading && !error) {
    return (
      <section className="section-block section-placeholder" aria-labelledby="ai-understanding-title">
        <div className="section-header">
          <div>
            <p className="eyebrow">Diagnostics</p>
            <h2 id="ai-understanding-title">AI Understanding</h2>
          </div>
        </div>
        <p className="placeholder-lead">
          Run an analysis from the top bar to bring back the layered visibility view for the page.
        </p>
      </section>
    )
  }

  return (
    <div className="ai-understanding-page">
      {error && <div className="error-banner">{error}</div>}

      {loading && (
        <section className="empty-hero loading-state">
          <div className="empty-hero-content">
            <div className="loading-spinner" />
            <h2>Analyzing page…</h2>
            <p>Rebuilding the human, machine, and LLM view of the page.</p>
          </div>
        </section>
      )}

      {data && !loading && (
        <>
          <VisibilityLayer
            data={data}
            score={visibilityScore}
            scoreBreakdown={scoreBreakdown}
            selectedNode={selectedNode}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            screenshotMeta={data?.screenshotMeta}
          />

          <InsightsArea
            data={data}
            score={visibilityScore}
            issueCount={issueCount}
            scoreBreakdown={scoreBreakdown}
          />

          <IssuesArea
            issues={data?.a11y?.issues || []}
            semanticIndex={data?.a11y?.semanticIndex || {}}
            selectedIssue={selectedIssue}
            selectedNodeId={selectedNodeId}
            onSelectIssue={selectIssueGroup}
            onSelectNode={setSelectedNodeId}
          />
        </>
      )}
    </div>
  )
}