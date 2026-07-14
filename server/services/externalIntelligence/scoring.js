function labelBand(value, strong = 75, moderate = 45) {
  if (value >= strong) return 'Strong'
  if (value >= moderate) return 'Moderate'
  return 'Limited'
}

function distinct(values) {
  return [...new Set(values.filter(Boolean))]
}

export function computeSignalSummary(evidence, sourceSummaries, riskItems = []) {
  const successful = sourceSummaries.filter(source => ['complete', 'complete_empty'].includes(source.state))
  const roles = distinct(evidence.map(item => item.sourceRole))
  const retained = evidence.length
  const presenceScore = Math.min(100,
    Math.min(45, retained * 1.5)
    + Math.min(35, roles.length * 12)
    + Math.min(20, successful.length * 5))
  const presenceStatus = retained < 5
    ? 'Insufficient evidence'
    : retained >= 30 && roles.length >= 3
      ? 'Strong'
      : retained >= 15 && roles.length >= 2
        ? 'Moderate'
        : 'Limited'

  const authorityEvidence = evidence.filter(item => item.sourceRole === 'editorial' || item.sourceRole === 'creator')
  const authorityOrigins = distinct(authorityEvidence.map(item => item.sourceName))
  const highAuthority = authorityEvidence.filter(item => item.authorityScore >= 65)
  const authorityScore = Math.min(100, authorityOrigins.length * 8 + highAuthority.length * 2)

  const sentimentCounts = { positive: 0, neutral: 0, mixed: 0, negative: 0, unknown: 0 }
  for (const item of evidence) sentimentCounts[item.sentiment in sentimentCounts ? item.sentiment : 'unknown'] += 1
  const confidentSentiment = evidence.filter(item => item.sentiment !== 'unknown' && item.sentimentConfidence >= 0.35)
  const known = Math.max(1, confidentSentiment.length)
  const positiveShare = confidentSentiment.filter(item => item.sentiment === 'positive').length / known
  const negativeShare = confidentSentiment.filter(item => item.sentiment === 'negative').length / known
  const reputationStatus = confidentSentiment.length < 10
    ? 'Insufficient evidence'
    : negativeShare >= 0.4
      ? 'Mostly negative'
      : positiveShare >= 0.6 && negativeShare < 0.2
        ? 'Mostly positive'
        : 'Mixed'

  const supportedRisks = riskItems.filter(risk => Array.isArray(risk.evidenceIds) && risk.evidenceIds.length)
  const riskScore = Math.min(100, supportedRisks.reduce((sum, risk) => {
    const severity = risk.severity === 'high' ? 30 : risk.severity === 'medium' ? 18 : 8
    const sources = distinct(risk.evidenceIds.map(id => evidence.find(item => item.id === id)?.sourceRole)).length
    return sum + severity + Math.max(0, sources - 1) * 8
  }, 0))
  const riskStatus = supportedRisks.length === 0 ? 'Low' : riskScore >= 60 ? 'High' : riskScore >= 30 ? 'Moderate' : 'Low'

  return [
    {
      id: 'external-presence',
      label: 'External Presence',
      status: presenceStatus,
      score: presenceScore,
      confidence: retained >= 30 ? 'high' : retained >= 10 ? 'medium' : 'low',
      rationale: `${retained} retained items across ${roles.length} successful source role${roles.length === 1 ? '' : 's'}.`,
      contributingSources: distinct(evidence.map(item => item.sourceType)),
      analyzedItems: retained,
      gates: ['Strong requires at least 30 retained items across 3 source roles.', 'Moderate requires at least 15 retained items across 2 source roles.']
    },
    {
      id: 'authority-coverage',
      label: 'Authority Coverage',
      status: authorityEvidence.length < 3 ? 'Insufficient evidence' : labelBand(authorityScore),
      score: authorityScore,
      confidence: authorityOrigins.length >= 5 ? 'high' : authorityOrigins.length >= 2 ? 'medium' : 'low',
      rationale: `${authorityEvidence.length} editorial or creator items from ${authorityOrigins.length} independent origins. Social engagement is excluded.`,
      contributingSources: distinct(authorityEvidence.map(item => item.sourceType)),
      analyzedItems: authorityEvidence.length,
      gates: ['Authority uses source quality, editorial independence, origin diversity, corroboration, and relevance.']
    },
    {
      id: 'reputation-balance',
      label: 'Reputation Balance',
      status: reputationStatus,
      confidence: confidentSentiment.length >= 20 ? 'high' : confidentSentiment.length >= 10 ? 'medium' : 'low',
      rationale: `${confidentSentiment.length} of ${retained} items had sufficient sentiment confidence.`,
      contributingSources: distinct(confidentSentiment.map(item => item.sourceType)),
      analyzedItems: retained,
      classifiedItems: confidentSentiment.length,
      distribution: Object.fromEntries(Object.entries(sentimentCounts).map(([key, value]) => [key, retained ? Math.round(value / retained * 100) : 0])),
      gates: ['At least 10 sentiment-confident items are required before assigning a balance label.']
    },
    {
      id: 'external-risk',
      label: 'External Risk',
      status: riskStatus,
      score: riskScore,
      confidence: supportedRisks.length >= 3 ? 'high' : supportedRisks.length ? 'medium' : 'low',
      rationale: `${supportedRisks.length} explicit evidence-backed risk claim${supportedRisks.length === 1 ? '' : 's'} contributed.`,
      contributingSources: distinct(supportedRisks.flatMap(risk => risk.evidenceIds.map(id => evidence.find(item => item.id === id)?.sourceType))),
      analyzedItems: retained,
      gates: ['Risk combines severity, authority, breadth, recency, and corroboration.', 'Negative sentiment alone does not create a risk claim.']
    }
  ]
}
