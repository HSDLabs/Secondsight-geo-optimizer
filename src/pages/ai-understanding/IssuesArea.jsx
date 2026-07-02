const SEVERITY_CONFIG = {
  critical: { label: 'Critical', color: 'var(--poor)', icon: '✕', bg: 'rgba(255, 107, 107, 0.1)' },
  warning: { label: 'Warning', color: 'var(--warning)', icon: '⚠', bg: 'rgba(242, 184, 75, 0.1)' },
  notice: { label: 'Notice', color: 'var(--accent)', icon: 'ℹ', bg: 'rgba(77, 163, 255, 0.1)' }
}

const CONFIDENCE_CONFIG = {
  High: { color: 'var(--good)', label: 'High Confidence' },
  Medium: { color: 'var(--warning)', label: 'Medium Confidence' },
  Low: { color: 'var(--muted)', label: 'Low Confidence' }
}

function getIssueDescription(type, count) {
  const descriptions = {
    'Missing alt text': `${count} image${count > 1 ? 's' : ''} missing alt text — AI systems and screen readers can't understand ${count > 1 ? 'these images' : 'this image'}. This directly hurts your page's ability to be cited in AI answers.`,
    'Unlabeled button': `${count} button${count > 1 ? 's' : ''} without accessible labels — machines see ${count > 1 ? 'these' : 'this'} as unknown interactive ${count > 1 ? 'elements' : 'element'}. AI agents can't describe your page's functionality.`,
    'Empty link': `${count} link${count > 1 ? 's' : ''} with no text — AI crawlers can't understand where ${count > 1 ? 'these links' : 'this link'} lead. Navigation becomes a black box for machines.`,
    'Unlabeled input': `${count} form input${count > 1 ? 's' : ''} without labels — automated systems can't determine what data ${count > 1 ? 'these fields' : 'this field'} expect. This breaks AI form comprehension.`,
    'Missing H1': 'No H1 heading found on the page — this is the strongest topical signal for AI systems. Without it, your page topic is ambiguous to machines.',
  }

  if (type.startsWith('Multiple H1s')) {
    return `${type} found — having more than one H1 dilutes the primary topic signal. AI systems may not know which heading defines the page.`
  }

  return descriptions[type] || `${count} instance${count > 1 ? 's' : ''} of "${type}" detected — this may reduce how well AI systems understand your page.`
}

function groupIssues(issues) {
  return issues.reduce((groups, issue) => {
    const key = issue.type || 'Unknown issue'
    groups[key] = groups[key] || []
    groups[key].push(issue)
    return groups
  }, {})
}

export default function IssuesArea({
  issues = [],
  semanticIndex = {},
  selectedIssue,
  selectedNodeId,
  onSelectIssue,
  onSelectNode
}) {
  const groupedIssues = groupIssues(issues)
  const issueTypes = Object.keys(groupedIssues)

  const criticalCount = issues.filter(i => i.severity === 'critical').length
  const warningCount = issues.filter(i => i.severity === 'warning').length

  return (
    <>
      <section className="section-block issues-section" aria-labelledby="issues-title">
        <div className="section-header">
          <div>
            <p className="eyebrow">Issues</p>
            <h2 id="issues-title">Visibility Blockers</h2>
          </div>
          <div className="issues-summary-badges">
            {criticalCount > 0 && (
              <span className="issue-badge issue-badge-critical">
                {criticalCount} critical
              </span>
            )}
            {warningCount > 0 && (
              <span className="issue-badge issue-badge-warning">
                {warningCount} warning{warningCount > 1 ? 's' : ''}
              </span>
            )}
            {issues.length === 0 && (
              <span className="issue-badge issue-badge-good">
                ✓ Clean
              </span>
            )}
          </div>
        </div>

        {issueTypes.length === 0 ? (
          <div className="issues-clean-state">
            <div className="clean-icon">✓</div>
            <h3>No visibility blockers detected</h3>
            <p>Your page structure is clean for AI systems. Continue monitoring as content changes.</p>
          </div>
        ) : (
          <div className="issues-list">
            {issueTypes.map(type => {
              const items = groupedIssues[type]
              const isSelected = selectedIssue === type
              const affectedNodes = getAffectedNodes(items, semanticIndex)
              const severity = items[0]?.severity || 'notice'
              const confidence = items[0]?.confidence || 'Medium'
              const sevConfig = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.notice
              const confConfig = CONFIDENCE_CONFIG[confidence] || CONFIDENCE_CONFIG.Medium

              return (
                <article
                  className={`issue-card-v2 ${isSelected ? 'selected' : ''}`}
                  key={type}
                  style={{ '--severity-color': sevConfig.color }}
                >
                  <div className="issue-severity-stripe" style={{ background: sevConfig.color }} />

                  <div className="issue-card-content">
                    <button
                      className="issue-header-btn"
                      type="button"
                      onClick={() => onSelectIssue(type)}
                    >
                      <div className="issue-header-left">
                        <span className="issue-severity-badge" style={{ color: sevConfig.color, background: sevConfig.bg }}>
                          <span className="severity-icon">{sevConfig.icon}</span>
                          {sevConfig.label}
                        </span>
                        <span className="issue-confidence-badge" style={{ color: confConfig.color }}>
                          {confConfig.label}
                        </span>
                      </div>
                      <span className="issue-count-pill">{items.length}</span>
                    </button>

                    <div className="issue-body">
                      <h3 className="issue-title">{type}</h3>
                      <p className="issue-description">
                        {getIssueDescription(type, items.length)}
                      </p>
                    </div>

                    {affectedNodes.length > 0 && (
                      <div className="issue-affected">
                        <small className="affected-label">Affected Elements</small>
                        <div className="affected-chips">
                          {affectedNodes.slice(0, 6).map(node => (
                            <button
                              className={`affected-chip ${selectedNodeId === node.id ? 'active' : ''}`}
                              key={node.id}
                              type="button"
                              onClick={() => {
                                onSelectIssue(type)
                                onSelectNode(node.id)
                              }}
                            >
                              <span className="chip-role">{humanize(node.type || 'Node')}</span>
                              <span className="chip-label">{getNodeLabelText(node)}</span>
                              {node.context && <span className="chip-context">in {node.context}</span>}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </>
  )
}

function humanize(value = '') {
  return value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase())
}

function getNodeLabelText(node) {
  return node?.label || node?.name || node?.text || node?.type || 'Node'
}

function getAffectedNodes(items, semanticIndex) {
  const nodeIds = [...new Set(items.flatMap(issue => issue.nodeIds || []))]
  return nodeIds
    .map(id => semanticIndex[id])
    .filter(Boolean)
}