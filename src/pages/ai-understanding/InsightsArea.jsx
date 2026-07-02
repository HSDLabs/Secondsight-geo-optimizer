import InsightCard from '../overview/InsightCard'

function getStructureInsight(tree) {
  const childCount = tree?.children?.length ?? 0
  if (childCount >= 4) {
    return {
      status: 'good',
      description: 'The page exposes several meaningful semantic regions for automated systems to traverse.'
    }
  }
  if (childCount > 0) {
    return {
      status: 'warning',
      description: 'Some structure is visible, but the page may need clearer landmarks or sectioning.'
    }
  }
  return {
    status: 'poor',
    description: 'The semantic outline is too thin for reliable machine interpretation.'
  }
}

function getAccessibilityInsight(issueCount) {
  if (issueCount === 0) {
    return {
      status: 'good',
      description: 'No high-signal accessibility issues were detected in the current checks.'
    }
  }
  if (issueCount <= 4) {
    return {
      status: 'warning',
      description: 'A small set of accessibility issues may reduce clarity for assistive tech and AI agents.'
    }
  }
  return {
    status: 'poor',
    description: 'Repeated accessibility gaps can make page purpose and controls harder to understand.'
  }
}

function getContentInsight(wordCount) {
  if (wordCount >= 500) {
    return {
      status: 'good',
      description: 'Readable extraction found enough content for summarization and topic inference.'
    }
  }
  if (wordCount >= 150) {
    return {
      status: 'warning',
      description: 'The extracted text is usable, but may not provide much depth for LLM answers.'
    }
  }
  return {
    status: 'poor',
    description: 'Very little readable content was extracted, which limits AI understanding.'
  }
}

export default function InsightsArea({ data, score, issueCount, scoreBreakdown }) {
  const structure = getStructureInsight(data?.a11y?.snapshot)
  const accessibility = getAccessibilityInsight(issueCount)
  const content = getContentInsight(data?.readable?.wordCount ?? 0)
  const visibilityStatus = score >= 80 ? 'good' : score >= 55 ? 'warning' : 'poor'

  return (
    <section className="section-block" aria-labelledby="insights-title">
      <div className="section-header">
        <div>
          <p className="eyebrow">Insights</p>
          <h2 id="insights-title">What affects AI visibility</h2>
        </div>
      </div>

      <div className="insights-grid">
        <InsightCard
          title="Structure"
          status={structure.status}
          description={structure.description}
        />
        <InsightCard
          title="Accessibility"
          status={accessibility.status}
          description={accessibility.description}
        />
        <InsightCard
          title="Content Depth"
          status={content.status}
          description={content.description}
        />
        <InsightCard
          title="AI Visibility"
          status={visibilityStatus}
          value={`${score}/100`}
          description="A combined read on semantic clarity, extracted content depth, and detected blockers."
        />
      </div>

      <div className="score-breakdown">
        <div>
          <h3>Score Breakdown</h3>
          <p>Transparent heuristic, not a final GEO model.</p>
        </div>
        <div className="breakdown-list">
          {scoreBreakdown?.items?.map(item => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong className={item.value < 0 ? 'negative' : 'positive'}>
                {formatDelta(item.value)}
              </strong>
            </div>
          ))}
          <div className="final-score">
            <span>Final Score</span>
            <strong>{score}/100</strong>
          </div>
        </div>
      </div>

      <div className="geo-placeholders">
        <h3>Reserved GEO Layers</h3>
        <div>
          {scoreBreakdown?.placeholders?.map(layer => (
            <span key={layer}>{layer}</span>
          ))}
        </div>
      </div>
    </section>
  )
}

function formatDelta(value) {
  if (value > 0) return `+${value}`
  return String(value)
}