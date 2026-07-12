const SEVERITY_WEIGHT = { critical: 3, warning: 2, info: 1, notice: 0 }
const CONFIDENCE_WEIGHT = { definite: 4, high: 3, medium: 2, low: 1 }

/** @typedef {{ id: string, type: string, recommendation: string, severity: string, confidence: string, affectedUrls: string[], crawlerAffected: string[], lines: number[], evidence: string, occurrences: object[], originalIds: string[] }} GroupedCrawlerIssue */

export function groupCrawlerIssues(issues = []) {
  const groups = new Map()
  const issueIdToGroupId = new Map()

  for (const issue of issues) {
    const key = `${normalize(issue.type || issue.title || 'crawler-issue')}|${normalize(issue.recommendation || '')}`
    if (!groups.has(key)) {
      groups.set(key, {
        ...issue,
        id: `issue-group-${stableHash(key)}`,
        affectedUrls: [],
        crawlerAffected: [],
        lines: [],
        originalIds: [],
        evidenceItems: [],
        occurrences: []
      })
    }
    const group = groups.get(key)
    group.occurrences.push(issue)
    group.originalIds.push(issue.id)
    group.affectedUrls.push(...(issue.affectedUrls || []))
    group.crawlerAffected.push(...(issue.crawlerAffected || []))
    group.lines.push(...(issue.lines || []), ...(issue.line ? [issue.line] : []))
    if (issue.evidence) group.evidenceItems.push(issue.evidence)
    if ((SEVERITY_WEIGHT[issue.severity] || 0) > (SEVERITY_WEIGHT[group.severity] || 0)) group.severity = issue.severity
    if ((CONFIDENCE_WEIGHT[issue.confidence] || 0) > (CONFIDENCE_WEIGHT[group.confidence] || 0)) group.confidence = issue.confidence
  }

  const groupedIssues = [...groups.values()].map(group => {
    group.affectedUrls = unique(group.affectedUrls)
    group.crawlerAffected = unique(group.crawlerAffected)
    group.lines = unique(group.lines).sort((a, b) => a - b)
    group.originalIds = unique(group.originalIds)
    group.evidenceItems = unique(group.evidenceItems)
    group.evidence = group.evidenceItems.join('\n\n')
    for (const id of group.originalIds) issueIdToGroupId.set(id, group.id)
    return group
  })

  return { groupedIssues, issueIdToGroupId }
}

function normalize(value) {
  return String(value).trim().toLowerCase().replace(/\s+/g, ' ')
}

function unique(values) {
  return [...new Set(values.filter(value => value !== undefined && value !== null && value !== ''))]
}

function stableHash(value) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

