import { useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import '../../styles/AIUnderstanding.css'
import VisibilityLayer from './VisibilityLayer'
import IssuesArea from './IssuesArea'
import UnderstandingFlow from './UnderstandingFlow'
import { getFindingIssues, buildCanonicalIssues } from './progressiveAnalysis'

export default function AIUnderstanding() {
  const {
    data,
    loading,
    error,
    visibilityScore,
    scoreBreakdown,

    selectedNode,
    selectedNodeId,
    setSelectedNodeId,
    selectedIssue,
    selectIssueGroup,
    analysisProgress
  } = useOutletContext()

  const [focusPanel, setFocusPanel] = useState(null)
  const hasResults = Boolean(data && !error)
  const findingIssues = useMemo(() => getFindingIssues(analysisProgress), [analysisProgress])
  const issueTypes = useMemo(() => (
    new Set([
      ...(data?.a11y?.issues || []).map(issue => issue.type),
      ...findingIssues.map(issue => issue.type)
    ].filter(Boolean))
  ), [data, findingIssues])
  const combinedIssues = useMemo(() => {
    return buildCanonicalIssues(data, analysisProgress)
  }, [data, analysisProgress])

  const understandingActions = useMemo(() => ({
    'scroll-raw': action => {
      setFocusPanel(action.panel || null)
      document.getElementById('raw-analysis')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    'focus-raw': action => {
      setFocusPanel(action.panel || null)
      document.getElementById('raw-analysis')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    'highlight-raw': action => {
      setFocusPanel(action.panel || null)
    },
    'locate-tree': action => {
      setFocusPanel('structure')

      const semanticIndex = data?.a11y?.semanticIndex || {}
      const match = Object.values(semanticIndex).find(node => {
        const haystacks = [node?.role, node?.type, node?.label, node?.name, node?.text]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return haystacks.includes((action.nodeHint || '').toLowerCase())
      })

      if (match?.id) setSelectedNodeId(match.id)
      document.getElementById('raw-analysis')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    'create-issue': action => {
      if (action.issueId) {
        selectIssueGroup(action.issueId)
      } else if (action.issueType) {
        selectIssueGroup(action.issueType) // Fallback
      }
      document.getElementById('visibility-issues')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    'open-issue': action => {
      if (action.issueId) {
        selectIssueGroup(action.issueId)
      } else if (action.issueType) {
        selectIssueGroup(action.issueType) // Fallback
      }
      document.getElementById('visibility-issues')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }), [data, selectIssueGroup, setSelectedNodeId])

  function handleUnderstandingAction(action) {
    const handler = understandingActions[action.kind]
    if (handler) handler(action)
  }

  return (
    <div className="ai-understanding-page">
      {error && <div className="error-banner">{error}</div>}

      <section className="analysis-flow" aria-label="AI Understanding workflow">
        <section
          id="raw-analysis"
          className="flow-section raw-analysis-section section-block"
          aria-labelledby="raw-analysis-title"
        >
          <div className="analysis-section-header">
            <div>
              <p className="eyebrow">Raw Analysis</p>
              <h2 id="raw-analysis-title">Evidence first</h2>
              <p className="analysis-section-lead">
                These are the raw signals AI sees before it reaches a conclusion. They stay at the top because they are the evidence layer.
              </p>
            </div>
            <span className="flow-step-label">Layer 1</span>
          </div>

          <VisibilityLayer
            data={data}
            score={visibilityScore}
            scoreBreakdown={scoreBreakdown}
            selectedNode={selectedNode}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            screenshotMeta={data?.screenshotMeta}
            focusPanel={loading ? null : focusPanel}
            loading={loading && !hasResults}
          />
        </section>

        <UnderstandingFlow
              data={data}
              progressState={analysisProgress}
              issueTypes={issueTypes}
              onAction={handleUnderstandingAction}
            />

        <section
          id="visibility-issues"
          className="flow-section section-block issues-workflow"
          aria-labelledby="issues-workflow-title"
        >
          <div className="analysis-section-header">
            <div>
              <p className="eyebrow">Visibility Issues</p>
              <h2 id="issues-workflow-title">What should the user improve?</h2>
              <p className="analysis-section-lead">
                This is the action layer. Findings from understanding can turn into issues or evidence-driven follow-up.
              </p>
            </div>
            <span className="flow-step-label">Layer 3</span>
          </div>

          {hasResults ? (
            <IssuesArea
              issues={combinedIssues}
              semanticIndex={data?.a11y?.semanticIndex || {}}
              selectedIssue={selectedIssue}
              selectedNodeId={selectedNodeId}
              onSelectIssue={selectIssueGroup}
              onSelectNode={setSelectedNodeId}
              onIssueAction={handleUnderstandingAction}
            />
          ) : (
            <div className="issues-placeholder">
              Issues will appear after AI builds the understanding layer.
            </div>
          )}
        </section>
      </section>
    </div>
  )
}

