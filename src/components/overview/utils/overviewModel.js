import { computeExternalScore, computeOverallScore } from '../../../utils/scoring'

const severityRank = { critical: 3, warning: 2, notice: 1 }

export function toneFor(score) {
  if (score == null) return 'muted'
  if (score >= 80) return 'good'
  if (score >= 55) return 'warning'
  return 'poor'
}

export function verdictFor(score) {
  if (score == null) return 'Awaiting scan'
  if (score >= 80) return 'Strong'
  if (score >= 55) return 'Needs attention'
  return 'At risk'
}

function groupIssues(issues = []) {
  const groups = new Map()

  issues.forEach(issue => {
    const title = issue.type || 'Unclassified issue'
    const current = groups.get(title) || { title, count: 0, severity: 'notice' }
    current.count += 1
    if ((severityRank[issue.severity] || 0) > (severityRank[current.severity] || 0)) {
      current.severity = issue.severity
    }
    groups.set(title, current)
  })

  return [...groups.values()].sort(
    (a, b) => severityRank[b.severity] - severityRank[a.severity] || b.count - a.count,
  )
}

function getCategory(title) {
  if (/robot|crawl|index|status/i.test(title)) return 'Technical'
  if (/link|alt|heading|meta|button/i.test(title)) return 'Content'
  return 'Structure'
}

export function buildOverviewModel({ data, crawlerData, externalData, visibilityScore }) {
  const crawlerScore = crawlerData?.score ?? null
  const externalScore = externalData ? computeExternalScore(externalData) : null
  const overallScore = data
    ? computeOverallScore(visibilityScore, crawlerScore, externalScore)
    : null

  const issues = groupIssues(data?.a11y?.issues).map(issue => ({
    ...issue,
    category: getCategory(issue.title),
    impact: issue.severity === 'critical' ? 'High' : issue.severity === 'warning' ? 'Medium' : 'Low',
    detail: issue.count === 1
      ? 'One affected element is weakening machine readability.'
      : `${issue.count} affected elements are weakening machine readability.`,
  }))

  if (crawlerScore != null && crawlerScore < 70) {
    issues.unshift({
      title: 'Improve AI crawler access',
      count: 1,
      severity: 'critical',
      category: 'Technical',
      impact: 'High',
      detail: 'Crawler restrictions can keep otherwise useful pages out of AI answers.',
    })
  }

  if (externalScore != null && externalScore < 55) {
    issues.push({
      title: 'Strengthen external authority signals',
      count: 1,
      severity: 'warning',
      category: 'Authority',
      impact: 'Medium',
      detail: 'Limited third-party evidence makes the site harder to trust and cite.',
    })
  }

  const quickWins = issues.slice(0, 3).map(issue => ({
    ...issue,
    effort: issue.category === 'Content' ? 'Low effort' : 'Review required',
    action: issue.title.startsWith('Improve') ? issue.title : `Fix ${issue.title.toLowerCase()}`,
  }))

  const scores = { crawler: crawlerScore, understanding: visibilityScore, external: externalScore }
  const strongest = Object.entries(scores)
    .filter(([, score]) => score != null)
    .sort(([, a], [, b]) => b - a)[0]
  const weakest = Object.entries(scores)
    .filter(([, score]) => score != null)
    .sort(([, a], [, b]) => a - b)[0]

  return {
    overallScore,
    scores,
    issues: issues.slice(0, 5),
    quickWins,
    strongest,
    weakest,
    signalCount: Object.values(scores).filter(score => score != null).length,
  }
}
