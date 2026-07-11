export function getInterpretationCards(data, progressState) {
  const stages = Object.fromEntries((progressState?.stages || []).map(stage => [stage.id, stage]))
  const stats = data?.a11y?.stats || {}
  const issues = data?.a11y?.issues || []
  const finding = (stage, id) => stages[stage]?.findings?.find(item => item.id === id)
  const knowledge = (stages.knowledge?.findings || [])
    .filter(item => item.status === 'success' && item.value)
    .map(item => ({ label: item.label, value: item.value }))
  const hasIssue = prefix => issues.some(issue => issue.type?.startsWith(prefix))
  const stageConfidence = stageId => calculateStageConfidence(stages[stageId]?.findings)
  const industry = finding('identity', 'industry')?.value
  const audience = finding('identity', 'audience')?.value

  return [
    {
      id: 'identity',
      title: 'Identity',
      certainty: 'Inferred',
      confidence: stageConfidence('identity'),
      items: [
        ['Primary entity', finding('identity', 'brand-name')?.value || data?.title || 'Not determined'],
        ['Website type', finding('identity', 'page-type')?.value || 'Not determined'],
        ['Industry', industry || 'Not determined'],
        ['Audience', audience || 'Not determined']
      ]
    },
    {
      id: 'structure',
      title: 'Structure',
      certainty: 'Observed',
      confidence: calculateStructureConfidence(data),
      items: [
        ['Heading outline', stats.headings ? `${stats.headings} headings` : 'Not detected'],
        ['Landmarks', stats.landmarks ? `${stats.landmarks} detected` : 'Not detected'],
        ['Navigation', hasRole(data, 'nav') ? 'Detected' : 'Not detected'],
        ['Main content', hasRole(data, 'main') ? 'Detected' : 'Not detected'],
        ['Hierarchy', hasIssue('Missing H1') || hasIssue('Multiple H1') ? 'Needs attention' : 'No H1 issue detected'],
        ['ARIA snapshot', data?.a11y?.ariaSnapshot ? 'Captured by Playwright' : 'Unavailable']
      ]
    },
    {
      id: 'content',
      title: 'Content',
      certainty: finding('content', 'primary-intent') ? 'Inferred' : 'Observed',
      confidence: calculateContentConfidence(data, stages.content?.findings),
      items: [
        ['Primary intent', finding('content', 'primary-intent')?.value || 'Not determined'],
        ['Content depth', contentDepth(data?.readable?.wordCount)],
        ['Readability', readabilityLabel(data?.readable?.wordCount)],
        ['Extracted words', formatNumber(data?.readable?.wordCount)]
      ]
    },
    {
      id: 'knowledge',
      title: 'Knowledge',
      certainty: 'Inferred',
      confidence: stageConfidence('knowledge'),
      groups: knowledge,
      empty: 'No stable entity groups were inferred from the extracted text.'
    },
    {
      id: 'accessibility',
      title: 'Accessibility',
      certainty: 'Observed',
      confidence: calculateAccessibilityConfidence(data),
      items: [
        ['Alt coverage', stats.altCoverage == null ? 'No content images' : `${stats.altCoverage}%`],
        ['Heading hierarchy', hasIssue('Missing H1') || hasIssue('Multiple H1') ? 'Needs attention' : 'No H1 issue detected'],
        ['Control labels', stats.controls == null ? 'Not available' : `${stats.labeledControls}/${stats.controls}`],
        ['Landmark quality', stats.landmarks ? `${stats.landmarks} regions exposed` : 'No landmarks detected'],
        ['Warnings', String(issues.length)]
      ]
    }
  ]
}

export function buildInterpretationOpportunities(data, progressState) {
  const stages = Object.fromEntries((progressState?.stages || []).map(stage => [stage.id, stage]))
  const identityFindings = stages.identity?.findings || []
  const hasIdentityFinding = id => identityFindings.some(item => item.id === id && item.status === 'success' && item.value)
  const knowledgeFindings = (stages.knowledge?.findings || []).filter(item => item.status === 'success' && item.value)
  const opportunities = []

  if (!hasIdentityFinding('industry')) {
    opportunities.push(interpretationOpportunity(
      'identity-industry',
      'identity',
      'Industry signal not explicit',
      'The rendered page did not expose a stable, explicit industry classification.',
      'An explicit industry signal helps machines place the primary entity in the correct market context.',
      'State the industry in descriptive page copy or supported organization schema.'
    ))
  }

  if (!hasIdentityFinding('audience')) {
    opportunities.push(interpretationOpportunity(
      'identity-audience',
      'identity',
      'Audience signal not explicit',
      'The rendered page did not expose a stable, explicit audience definition.',
      'A clear audience helps machines interpret who the products, services, or information are intended for.',
      'Add concise audience-focused copy near the primary page description.'
    ))
  }

  if (knowledgeFindings.length > 0 && knowledgeFindings.every(item => item.certainty !== 'Known')) {
    opportunities.push(interpretationOpportunity(
      'knowledge-implicit-relations',
      'knowledge',
      'Entity relationships are implicit',
      `${knowledgeFindings.length} entity group${knowledgeFindings.length === 1 ? ' was' : 's were'} inferred from content patterns; none was directly established by the scan.`,
      'Machines can identify terms, but may not reliably understand how the entities relate to the primary organization or page topic.',
      'Express important entity relationships in visible copy or relevant structured data.'
    ))
  }

  return data ? opportunities : []
}

export function getMachineSignals(data) {
  const metadata = data?.metadata || {}
  const stats = data?.a11y?.stats || {}
  return [
    ['Readable HTML', Boolean(data?.readable?.html)],
    ['Rendered DOM', Boolean(data)],
    ['ARIA snapshot', Boolean(data?.a11y?.ariaSnapshot)],
    ['Readable content', Boolean(data?.readable?.textContent)],
    ['Metadata', Boolean(metadata.title || metadata.description || metadata.canonical)],
    ['Schema.org', Boolean(metadata.schemas?.length)],
    ['Open Graph', Boolean(Object.keys(metadata.openGraph || {}).length)],
    ['Markdown', Boolean(data?.readable?.markdown)],
    ['Image alt', stats.altCoverage == null ? 'N/A' : `${stats.altCoverage}%`],
    ['JS required', 'Not measured'],
    ['Hidden elements', `${stats.explicitlyHiddenElements ?? 0} explicit`]
  ]
}

export function getExtractionQuality(data) {
  const metadata = data?.metadata || {}
  const checks = [
    ['Main content extracted', Boolean(data?.readable?.textContent)],
    ['Readable HTML available', Boolean(data?.readable?.html)],
    ['Markdown generated', Boolean(data?.readable?.markdown)],
    ['ARIA snapshot captured', Boolean(data?.a11y?.ariaSnapshot)],
    ['Primary metadata found', Boolean(metadata.title || metadata.description)]
  ]
  const passed = checks.filter(([, value]) => value).length
  return {
    label: passed === checks.length ? 'Complete' : passed >= 3 ? 'Strong' : 'Limited',
    checks,
    passed
  }
}

export function getExtractionTabs(data, progressState) {
  const knowledge = progressState?.stages?.find(stage => stage.id === 'knowledge')?.findings || []
  const entities = knowledge
    .filter(item => item.status === 'success')
    .map(item => ({ category: item.label, values: item.value, certainty: 'Inferred' }))
  const metadata = data?.metadata || {}

  return [
    ['markdown', 'Markdown', data?.readable?.markdown || 'No readable Markdown was extracted.'],
    ['plain', 'Plain Text', data?.readable?.textContent || 'No readable plain text was extracted.'],
    ['html', 'HTML', data?.readable?.html || 'No readable HTML was extracted.'],
    ['metadata', 'Metadata', stringify({ title: metadata.title, description: metadata.description, canonical: metadata.canonical, twitterCards: metadata.twitterCards })],
    ['schema', 'Schema', stringify(metadata.schemas || [])],
    ['entities', 'Entities', stringify(entities)],
    ['open-graph', 'Open Graph', stringify(metadata.openGraph || {})]
  ].map(([id, label, content]) => ({ id, label, content }))
}

export function findNodePath(node, nodeId, path = []) {
  if (!node || !nodeId) return []
  const nextPath = [...path, node.id]
  if (node.id === nodeId) return nextPath
  for (const child of node.children || []) {
    const result = findNodePath(child, nodeId, nextPath)
    if (result.length) return result
  }
  return []
}

export function scoreVerdict(score) {
  if (score >= 90) return { label: 'Highly parseable', tone: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20' }
  if (score >= 75) return { label: 'Parseable', tone: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20' }
  if (score >= 55) return { label: 'Needs improvement', tone: 'text-amber-300 bg-amber-400/10 border-amber-400/20' }
  return { label: 'Difficult to parse', tone: 'text-rose-300 bg-rose-400/10 border-rose-400/20' }
}

function hasRole(data, role) {
  return Object.values(data?.a11y?.semanticIndex || {}).some(node => node.type === role)
}

function calculateStageConfidence(findings = []) {
  const settled = findings.filter(item => ['success', 'warning', 'failed'].includes(item.status))
  if (!settled.length) return 0
  const confidenceWeight = { High: 95, Medium: 75, Low: 50 }
  const certaintyWeight = { Known: 1, Inferred: 0.82, Unknown: 0.55 }
  const total = settled.reduce((sum, item) => {
    const evidence = item.evidence ? 1 : 0.85
    return sum + (confidenceWeight[item.confidence] || 50) * (certaintyWeight[item.certainty] || 0.55) * evidence
  }, 0)
  return Math.round(total / settled.length)
}

function calculateStructureConfidence(data) {
  const stats = data?.a11y?.stats
  if (!stats) return 0
  const checks = [
    Number.isFinite(stats.headings),
    Number.isFinite(stats.landmarks),
    Boolean(data?.a11y?.semanticIndex),
    Array.isArray(data?.a11y?.headingOutline),
    Array.isArray(data?.a11y?.issues),
    Boolean(data?.a11y?.ariaSnapshot)
  ]
  return percentage(checks)
}

function calculateContentConfidence(data, findings = []) {
  const extractionChecks = [
    Boolean(data?.readable?.textContent),
    Boolean(data?.readable?.html),
    Boolean(data?.readable?.markdown),
    Number.isFinite(data?.readable?.wordCount)
  ]
  const extractionConfidence = percentage(extractionChecks)
  const interpretationConfidence = calculateStageConfidence(findings)
  return Math.round((extractionConfidence * 0.6) + (interpretationConfidence * 0.4))
}

function calculateAccessibilityConfidence(data) {
  const stats = data?.a11y?.stats
  if (!stats) return 0
  return percentage([
    Number.isFinite(stats.images),
    stats.altCoverage != null || stats.images === 0,
    Number.isFinite(stats.controls),
    Number.isFinite(stats.labeledControls),
    Number.isFinite(stats.landmarks),
    Array.isArray(data?.a11y?.issues)
  ])
}

function percentage(checks) {
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

function interpretationOpportunity(id, stageId, type, evidence, explanation, recommendation) {
  return {
    id: `issue-${id}`,
    type,
    stageId,
    severity: 'notice',
    confidence: 'Medium',
    evidence,
    reason: evidence,
    explanation,
    recommendation,
    sourcePanel: 'Interpretation',
    nodeIds: []
  }
}

function contentDepth(words = 0) {
  if (words >= 800) return 'Deep'
  if (words >= 250) return 'Moderate'
  if (words >= 100) return 'Light'
  return words ? 'Thin' : 'Not detected'
}

function readabilityLabel(words = 0) {
  if (words >= 250) return 'Substantial extraction'
  if (words >= 100) return 'Usable extraction'
  return words ? 'Limited extraction' : 'Not available'
}

function formatNumber(value) {
  return typeof value === 'number' ? value.toLocaleString() : 'Not available'
}

function stringify(value) {
  return JSON.stringify(value, null, 2)
}
