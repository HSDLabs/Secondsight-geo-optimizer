export function computeExternalScore(externalData) {
  if (!externalData) return null;
  const reddit = externalData.reddit || [];
  const news = externalData.news || [];
  
  if (reddit.length === 0 && news.length === 0) return 50;
  
  const mentions = reddit.length + news.length;
  const totalScore = reddit.reduce((a, p) => a + (p.score || 0), 0);
  const totalComments = reddit.reduce((a, p) => a + (p.numComments || p.comments || p.num_comments || 0), 0);
  const reach = totalScore + totalComments;
  const engagement = totalComments;
  
  let score = 50;
  score += Math.min(mentions * 1, 20);
  score += Math.min(Math.floor(reach / 500), 20);
  score += Math.min(Math.floor(engagement / 100), 10);
  
  return Math.min(score, 100);
}

export function computeExternalReputation(externalData) {
  const score = computeExternalScore(externalData) ?? 0;
  
  const reddit = externalData?.reddit || [];
  const news = externalData?.news || [];
  const mentions = reddit.length + news.length;
  const totalScore = reddit.reduce((a, p) => a + (p.score || 0), 0);
  const totalComments = reddit.reduce((a, p) => a + (p.numComments || p.comments || p.num_comments || 0), 0);
  
  let label = 'Poor';
  if (score >= 80) label = 'Excellent';
  else if (score >= 65) label = 'Good';
  else if (score >= 50) label = 'Moderate';
  
  return { 
    score, 
    label, 
    mentions, 
    reach: totalScore + totalComments, 
    engagement: totalComments 
  };
}

export function computeVisibilityBreakdown(data) {
  if (!data) {
    return {
      score: 0,
      items: []
    }
  }

  const wordCount = data.readable?.wordCount ?? 0
  const issues = data.a11y?.issues || []
  const structureCount = data.a11y?.snapshot?.children?.length ?? 0
  const semanticNodeCount = Object.keys(data.a11y?.semanticIndex || {}).length

  const structure = Math.min(20, structureCount * 3 + Math.min(8, Math.round(semanticNodeCount / 15)))

  const criticalIssues = issues.filter(issue => issue.severity === 'critical')
  const warningIssues = issues.filter(issue => issue.severity === 'warning')
  const criticalPenalty = criticalIssues.length > 0
    ? 4 + Math.min(8, (criticalIssues.length - 1) * 2)
    : 0
  const warningPenalty = warningIssues.length > 0
    ? 2 + Math.min(4, warningIssues.length - 1)
    : 0
  const accessibility = -Math.min(16, criticalPenalty + warningPenalty)

  const contentDepth = wordCount >= 800 ? 20
    : wordCount >= 500 ? 16
    : wordCount >= 250 ? 10
    : wordCount >= 100 ? 4
    : -8

  const extractability = data.readable?.markdown ? 12 : -6

  const h1Issues = issues.filter(issue => issue.type === 'Missing H1' || issue.type?.startsWith('Multiple H1'))
  const headingBonus = h1Issues.length === 0 ? 8 : 0

  const base = 40
  const score = Math.max(0, Math.min(100, base + structure + accessibility + contentDepth + extractability + headingBonus))

  return {
    score,
    items: [
      { label: 'Base', value: base },
      { label: 'Structure', value: structure },
      { label: 'Accessibility', value: accessibility },
      { label: 'Content Depth', value: contentDepth },
      { label: 'Extractability', value: extractability },
      { label: 'Heading Structure', value: headingBonus > 0 ? headingBonus : -(h1Issues.length * 3) }
    ],
    placeholders: [
      'Crawler Access',
      'Entity Understanding',
      'Retrieval Readiness',
      'Citation Readiness'
    ]
  }
}

export function computeOverallScore(visibilityScore, crawlerScore, externalScore) {
  const availableScores = [];
  if (visibilityScore != null) availableScores.push(visibilityScore);
  if (crawlerScore != null) availableScores.push(crawlerScore);
  if (externalScore != null) availableScores.push(externalScore);

  if (availableScores.length === 0) return null;
  return Math.round(availableScores.reduce((a, b) => a + b, 0) / availableScores.length);
}
