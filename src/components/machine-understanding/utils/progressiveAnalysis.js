const STAGE_BLUEPRINTS = [
  {
    id: 'identity',
    index: 1,
    title: 'Identity',
    subtitle: 'Brand, page type and primary entity.',
    accent: 'var(--good)',
    importance: 1,
    findings: [
      finding('brand-name', 'Brand Name', 'Nike', 'Known', 'High', 'success', 'Page title + metadata', 'LLM Extraction', 'The title, URL, and hero content all point to the same brand identity.', [
        action('brand-evidence', 'View Evidence', 'scroll-raw', { panel: 'human' }),
        action('brand-metadata', 'Jump to Metadata', 'focus-raw', { panel: 'llm' })
      ]),
      finding('primary-topic', 'Primary Topic', 'Athletic shoes and apparel', 'Inferred', 'High', 'success', 'Hero copy + page title', 'Human View', 'The page is framed around products and shopping intent instead of editorial or support content.', [
        action('topic-evidence', 'View Evidence', 'scroll-raw', { panel: 'llm' })
      ]),
      finding('page-type', 'Page Type', 'Homepage', 'Inferred', 'High', 'success', 'URL pattern + layout structure', 'Machine Structure', 'The structure and navigation pattern match a brand landing page rather than a deep content page.', [
        action('page-type-structure', 'Jump to Structure', 'focus-raw', { panel: 'structure' })
      ]),
      finding('organization-schema', 'Organization Schema', 'Missing', 'Unknown', 'Medium', 'warning', 'Metadata inspection', 'LLM Extraction', 'Structured organization data would make the entity model more explicit for AI systems.', [
        action('org-view-metadata', 'View Evidence', 'focus-raw', { panel: 'llm' }),
        action('org-create-issue', 'Create Issue', 'create-issue', { issueType: 'Organization schema missing' })
      ], { issueType: 'Organization schema missing', severity: 'warning' })
    ]
  },
  {
    id: 'structure',
    index: 2,
    title: 'Structure',
    subtitle: 'Document hierarchy and key regions.',
    accent: 'var(--accent)',
    importance: 1,
    findings: [
      finding('main-content', 'Main Content', 'Identified', 'Known', 'High', 'success', 'Semantic tree', 'Machine Structure', 'A clear main region gives AI a dependable anchor for the core content.', [
        action('main-to-structure', 'Jump to Tree', 'focus-raw', { panel: 'structure' }),
        action('main-locate', 'Locate in Tree', 'locate-tree', { nodeHint: 'main' })
      ]),
      finding('navigation', 'Navigation', 'Detected', 'Known', 'High', 'success', 'Semantic tree', 'Machine Structure', 'The navigation region helps AI understand how users move through the site.', [
        action('nav-locate', 'Locate in Tree', 'locate-tree', { nodeHint: 'nav' })
      ]),
      finding('sectioning', 'Clear Sectioning', 'Visible', 'Known', 'High', 'success', 'DOM landmarks + sectioning', 'Machine Structure', 'The page is broken into readable regions, which helps machines form a stable outline.', [
        action('sectioning-structure', 'Jump to Structure', 'focus-raw', { panel: 'structure' })
      ]),
      finding('multiple-h1', 'Multiple H1 Tags', '2 detected', 'Known', 'Medium', 'warning', 'Heading hierarchy', 'Machine Structure', 'Multiple top-level headings can blur the primary topic signal for AI systems.', [
        action('h1-view-tree', 'Locate in Tree', 'locate-tree', { nodeHint: 'h1' }),
        action('h1-create-issue', 'Create Issue', 'create-issue', { issueType: 'Multiple H1s' })
      ], { issueType: 'Multiple H1s', severity: 'warning' })
    ]
  },
  {
    id: 'content',
    index: 3,
    title: 'Content Understanding',
    subtitle: 'Readable text and page intent.',
    accent: 'var(--warning)',
    importance: 1,
    findings: [
      finding('content-extractable', 'Content Extractable', 'Yes', 'Known', 'High', 'success', 'Readable extraction', 'LLM Extraction', 'Readable content is available for summarization and downstream language tasks.', [
        action('content-llm', 'Jump to LLM Extraction', 'focus-raw', { panel: 'llm' })
      ]),
      finding('summary-generated', 'Summary Generated', 'Ready', 'Known', 'High', 'success', 'Readable summary', 'LLM Extraction', 'AI can compress the page into a short, useful summary without losing the core intent.', [
        action('summary-evidence', 'View Evidence', 'scroll-raw', { panel: 'llm' })
      ]),
      finding('primary-intent', 'Primary Intent', 'E-commerce', 'Inferred', 'High', 'success', 'Hero copy + content patterns', 'Human View', 'The site is clearly trying to sell products and move users toward shopping flows.', [
        action('intent-humans', 'View Evidence', 'scroll-raw', { panel: 'human' })
      ]),
      finding('main-topics', 'Main Topics', 'Products, promotions, membership', 'Inferred', 'High', 'success', 'Readable content', 'LLM Extraction', 'The text clusters around shopping, offers, and loyalty, which helps AI infer what the page is about.', [
        action('topics-llm', 'Jump to LLM Extraction', 'focus-raw', { panel: 'llm' })
      ]),
      finding('faq-section', 'FAQ Section', 'Not detected', 'Unknown', 'Low', 'warning', 'Content scan', 'LLM Extraction', 'An FAQ would add structured answers that are easy for AI systems to reuse and cite.', [
        action('faq-create-issue', 'Create Issue', 'create-issue', { issueType: 'FAQ not detected' })
      ], { issueType: 'FAQ not detected', severity: 'warning' })
    ]
  },
  {
    id: 'knowledge',
    index: 4,
    title: 'Knowledge Extraction',
    subtitle: 'Entities detected.',
    accent: 'var(--good)',
    importance: 1.22,
    findings: [
      finding('products', 'Products', 'Shoes, clothing, accessories', 'Known', 'High', 'success', 'Readable text + nav labels', 'LLM Extraction', 'AI can extract a clear product catalog from the page language and navigation.', [
        action('products-tree', 'Locate in Tree', 'locate-tree', { nodeHint: 'product' })
      ]),
      finding('brands', 'Brands', 'Nike, Jordan, Air Max', 'Known', 'High', 'success', 'Readable extraction', 'LLM Extraction', 'The brand family is obvious enough for AI to separate product lines from the parent brand.', [
        action('brands-llm', 'View Evidence', 'focus-raw', { panel: 'llm' })
      ]),
      finding('locations', 'Locations', 'India, global', 'Inferred', 'Medium', 'success', 'Readable content', 'LLM Extraction', 'Regional availability is visible, but the location model is not fully explicit.', [
        action('locations-evidence', 'View Evidence', 'scroll-raw', { panel: 'llm' })
      ]),
      finding('services', 'Services', 'Returns, shipping, membership', 'Known', 'High', 'success', 'Readable content', 'LLM Extraction', 'The site exposes the support and fulfillment language that helps AI answer practical questions.', [
        action('services-evidence', 'View Evidence', 'scroll-raw', { panel: 'llm' })
      ]),
      finding('contact-info', 'Contact Info', 'Not explicit', 'Unknown', 'Low', 'warning', 'Content scan', 'LLM Extraction', 'Direct contact details are helpful for entity resolution and trust, but they are not surfaced clearly here.', [
        action('contact-create', 'Create Issue', 'create-issue', { issueType: 'Contact information missing' })
      ], { issueType: 'Contact information missing', severity: 'warning' })
    ]
  },
  {
    id: 'accessibility',
    index: 5,
    title: 'Accessibility Validation',
    subtitle: 'Reliability of machine interpretation.',
    accent: 'var(--accent)',
    importance: 1,
    findings: [
      finding('button-labels', 'Accessible Names for Buttons', 'Present', 'Known', 'High', 'success', 'Accessibility tree', 'Machine Structure', 'Labeled controls improve both assistive tech and automated interpretation.', [
        action('buttons-tree', 'Locate in Tree', 'locate-tree', { nodeHint: 'button' })
      ]),
      finding('alt-text', 'Image Alt Text', 'Mostly present', 'Known', 'High', 'success', 'Accessibility tree', 'Machine Structure', "Most images are labeled clearly enough for the page's visuals to remain machine-readable.", [
        action('alt-tree', 'Locate in Tree', 'locate-tree', { nodeHint: 'img' })
      ]),
      finding('landmarks', 'Landmark Usage', 'Clear', 'Known', 'High', 'success', 'Semantic tree', 'Machine Structure', 'Landmarks help AI separate navigation, content, and supporting areas.', [
        action('landmark-structure', 'Jump to Tree', 'focus-raw', { panel: 'structure' })
      ]),
      finding('color-contrast', 'Color Contrast', 'Good', 'Inferred', 'High', 'success', 'Visual inspection', 'Human View', 'Readable contrast reduces ambiguity and improves comprehension for both humans and machines.', [
        action('contrast-human', 'View Evidence', 'scroll-raw', { panel: 'human' })
      ]),
      finding('empty-links', 'Empty Links', '2 detected', 'Known', 'Medium', 'warning', 'Issue list', 'Machine Structure', 'Empty link text creates noise for AI systems and makes navigation harder to explain.', [
        action('empty-links-open', 'Open Issue', 'open-issue', { issueType: 'Empty link' }),
        action('empty-links-tree', 'Locate in Tree', 'locate-tree', { nodeHint: 'link' })
      ], { issueType: 'Empty link', severity: 'warning' })
    ]
  }
]

function action(id, label, kind, extras = {}) {
  return { id, label, kind, ...extras }
}

function finding(id, label, value, certainty, confidence, finalStatus, evidence, sourcePanel, explanation, actions, extras = {}) {
  return {
    id,
    label,
    value,
    certainty,
    confidence,
    explanation,
    evidence,
    sourcePanel,
    finalStatus,
    actions,
    severity: finalStatus === 'warning' ? 'warning' : 'notice',
    ...extras
  }
}

function createFinding(baseFinding) {
  return {
    ...baseFinding,
    status: 'waiting'
  }
}

function createStage(stage) {
  return {
    id: stage.id,
    index: stage.index,
    title: stage.title,
    subtitle: stage.subtitle,
    summary: stage.summary,
    accent: stage.accent,
    importance: stage.importance,
    status: 'waiting',
    findings: stage.findings.map(createFinding)
  }
}

function safeHost(url) {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

export function createInitialAnalysisProgressState(url = '') {
  return {
    phase: 'idle',
    url,
    host: safeHost(url),
    startedAt: null,
    completedAt: null,
    errorMessage: null,
    stages: STAGE_BLUEPRINTS.map(createStage)
  }
}

function getStageStatus(stage) {
  const statuses = stage.findings.map(finding => finding.status)

  if (statuses.some(status => status === 'processing')) return 'processing'
  if (statuses.some(status => status === 'failed')) return 'failed'
  if (statuses.some(status => status === 'warning')) return 'warning'
  if (statuses.every(status => status === 'success')) return 'success'
  if (statuses.every(status => status === 'waiting')) return 'waiting'
  return 'processing'
}

function deriveState(state) {
  const stages = state.stages.map(stage => ({
    ...stage,
    status: getStageStatus(stage)
  }))

  return {
    ...state,
    stages,
    host: state.host || safeHost(state.url)
  }
}

function updateFinding(stage, findingEvent) {
  return stage.findings.map(finding => {
    if (finding.id !== findingEvent.findingId) return finding

    return {
      ...finding,
      status: findingEvent.status,
      value: findingEvent.value ?? finding.value,
      confidence: findingEvent.confidence ?? finding.confidence,
      certainty: findingEvent.certainty ?? finding.certainty,
      explanation: findingEvent.explanation ?? finding.explanation,
      evidence: findingEvent.evidence ?? finding.evidence,
      sourcePanel: findingEvent.sourcePanel ?? finding.sourcePanel
    }
  })
}

export function analysisProgressReducer(state, actionEvent) {
  switch (actionEvent.type) {
    case 'analysis/start':
      return createInitialAnalysisProgressState(actionEvent.url)

    case 'analysis/stage-started':
      return deriveState({
        ...state,
        phase: 'processing',
        startedAt: state.startedAt || actionEvent.at || Date.now(),
        stages: state.stages.map(stage => (
          stage.id === actionEvent.stageId ? { ...stage, status: 'processing' } : stage
        ))
      })

    case 'analysis/finding-updated':
      return deriveState({
        ...state,
        phase: state.phase === 'idle' ? 'processing' : state.phase,
        stages: state.stages.map(stage => (
          stage.id === actionEvent.stageId ? { ...stage, findings: updateFinding(stage, actionEvent) } : stage
        ))
      })

    case 'analysis/completed':
      return {
        ...deriveState(state),
        phase: 'complete',
        completedAt: actionEvent.at || Date.now(),
        errorMessage: null
      }

    case 'analysis/hydrate':
      return {
        ...deriveState({
          ...state,
          url: actionEvent.url || state.url,
          stages: buildAdaptiveStages(actionEvent.data, actionEvent.url || state.url)
        }),
        phase: 'complete',
        completedAt: actionEvent.at || Date.now(),
        errorMessage: null
      }

    case 'analysis/failed':
      return {
        ...state,
        phase: 'error',
        errorMessage: actionEvent.errorMessage || 'Analysis failed.'
      }

    default:
      return state
  }
}

export function buildSimulatedProgressPlan(url) {
  const plan = []
  let cursor = 0

  for (const stage of STAGE_BLUEPRINTS) {
    plan.push({
      delay: cursor,
      event: {
        type: 'analysis/stage-started',
        stageId: stage.id,
        at: cursor,
        url
      }
    })

    let findingCursor = cursor + 180

    stage.findings.forEach((baseFinding, index) => {
      plan.push({
        delay: findingCursor,
        event: {
          type: 'analysis/finding-updated',
          stageId: stage.id,
          findingId: baseFinding.id,
          status: 'processing',
          url
        }
      })

      findingCursor += 260 + (index % 2) * 80

      plan.push({
        delay: findingCursor,
        event: {
          type: 'analysis/finding-updated',
          stageId: stage.id,
          findingId: baseFinding.id,
          status: baseFinding.finalStatus,
          value: baseFinding.value,
          confidence: baseFinding.confidence,
          certainty: baseFinding.certainty,
          explanation: baseFinding.explanation,
          evidence: baseFinding.evidence,
          sourcePanel: baseFinding.sourcePanel,
          url
        }
      })

      findingCursor += 140
    })

    cursor = findingCursor + 260
  }

  plan.push({
    delay: cursor,
    event: {
      type: 'analysis/completed',
      url
    }
  })

  return plan
}

export function getProgressMetrics(progressState) {
  const stages = progressState?.stages || []
  const findings = stages.flatMap(stage => stage.findings || [])
  const totalFindings = findings.length
  const completedFindings = findings.filter(isFindingSettled).length
  const processingFindings = findings.filter(finding => finding.status === 'processing').length
  const warningFindings = findings.filter(finding => finding.status === 'warning').length
  const failedFindings = findings.filter(finding => finding.status === 'failed').length
  const waitingFindings = findings.filter(finding => finding.status === 'waiting').length
  const completion = totalFindings === 0 ? 0 : Math.round((completedFindings / totalFindings) * 100)
  const understandingScore = calculateUnderstandingScore(progressState)
  const verdict = getScoreVerdict(understandingScore)

  let overallStatus = 'waiting'
  if (progressState?.phase === 'error' || failedFindings > 0) {
    overallStatus = 'failed'
  } else if (processingFindings > 0) {
    overallStatus = 'processing'
  } else if (completedFindings === totalFindings && totalFindings > 0) {
    overallStatus = warningFindings > 0 ? 'warning' : 'success'
  }

  return {
    totalFindings,
    completedFindings,
    processingFindings,
    warningFindings,
    failedFindings,
    waitingFindings,
    completion,
    understandingScore,
    verdict,
    overallStatus,
    activeStage: stages.find(stage => stage.status === 'processing') || null,
    activeFinding: findings.find(finding => finding.status === 'processing') || null
  }
}

function calculateUnderstandingScore(progressState) {
  const stages = progressState?.stages || []
  const settledFindings = stages.flatMap(stage => (
    (stage.findings || [])
      .filter(isFindingSettled)
      .map(finding => ({ ...finding, stageImportance: stage.importance || 1 }))
  ))

  if (settledFindings.length === 0) return 0

  const totalWeight = settledFindings.reduce((sum, finding) => sum + getFindingWeight(finding), 0)
  const earned = settledFindings.reduce((sum, finding) => {
    const weight = getFindingWeight(finding)
    if (finding.status === 'success') return sum + weight
    if (finding.status === 'warning') return sum + weight * 0.32
    return sum
  }, 0)
  const warnings = settledFindings.filter(finding => finding.status === 'warning').length
  const critical = settledFindings.filter(finding => finding.status === 'failed' || finding.severity === 'critical').length
  
  const criticalPenalty = critical > 0 ? 12 + Math.min(15, (critical - 1) * 6) : 0;
  const warningPenalty = warnings > 0 ? 4 + Math.min(10, (warnings - 1) * 3) : 0;
  const penalty = criticalPenalty + warningPenalty;

  return Math.max(0, Math.min(100, Math.round((earned / totalWeight) * 100 - penalty)))
}

function getScoreVerdict(score) {
  if (score >= 90) return { label: 'Excellent', status: 'excellent', color: '#48c78e' }
  if (score >= 75) return { label: 'Good', status: 'good', color: '#48c78e' }
  if (score >= 55) return { label: 'Needs Improvement', status: 'warning', color: '#f2b84b' }
  return { label: 'At Risk', status: 'critical', color: '#ff6b6b' }
}

function getFindingIssues(progressState) {
  return (progressState?.stages || []).flatMap(stage => (
    (stage.findings || [])
      .filter(finding => finding.issueType && (finding.status === 'warning' || finding.status === 'failed'))
      .map(finding => ({
        type: finding.issueType,
        severity: finding.severity || 'warning',
        confidence: finding.confidence || 'Medium',
        stageId: stage.id,
        stageTitle: stage.title,
        findingId: finding.id,
        findingLabel: finding.label,
        evidence: finding.evidence,
        sourcePanel: finding.sourcePanel,
        explanation: finding.explanation,
        actions: finding.actions || [],
        nodeIds: []
      }))
  ))
}

export function buildCanonicalIssues(data, progressState) {
  const rawIssues = data?.a11y?.issues || []
  const rawTypes = new Set(rawIssues.map(issue => issue.type))
  const derivedIssues = getFindingIssues(progressState).filter(issue => !rawTypes.has(issue.type))
  
  // Assign stable IDs
  const allIssues = [...rawIssues, ...derivedIssues].map((issue, index) => {
    const findingId = issue.findingId || slug(issue.type)
    const stageId = issue.stageId || 'accessibility'
    // Guarantee uniqueness by using the map index
    const issueId = `issue-${stageId}-${findingId}-${index}`
    
    return {
      ...issue,
      id: issueId,
      findingId,
      stageId,
      sourcePanel: issue.sourcePanel || 'Machine Structure'
    }
  })

  // Compute recovery once
  const currentScore = calculateUnderstandingScore(progressState)
  
  return allIssues.map(issue => {
    const recovery = computeIssueRecovery(data, progressState, currentScore, issue.id)
    return { ...issue, recovery }
  }).sort((a, b) => b.recovery - a.recovery)
}

function computeIssueRecovery(data, progressState, currentScore, issueIdToRemove) {
  if (!data || !progressState) return 0
  
  // Create a version of the raw issues without this issue
  const simulatedRawIssues = (data.a11y?.issues || []).map((issue, index) => {
    const findingId = slug(issue.type)
    const stageId = 'accessibility'
    const computedId = `issue-${stageId}-${findingId}-${index}`
    return { ...issue, id: computedId }
  }).filter(issue => issue.id !== issueIdToRemove)
  
  const simulatedData = {
    ...data,
    a11y: {
      ...(data.a11y || {}),
      issues: simulatedRawIssues
    }
  }

  // Also remove from derived issues in progress state
  const simulatedStages = buildAdaptiveStages(simulatedData, data.url)
  // But wait, buildAdaptiveStages relies on findings that were already resolved in progressState?
  // We need to keep the status of the simulated stages aligned with the current progressState
  const simulatedProgressState = {
    ...progressState,
    stages: simulatedStages.map(simStage => {
      const origStage = progressState.stages.find(s => s.id === simStage.id)
      if (!origStage) return simStage
      return {
        ...simStage,
        findings: simStage.findings.map(simFinding => {
          const origFinding = origStage.findings.find(f => f.id === simFinding.id)
          // If finding was removed by our issue removal, it won't be here.
          // For derived findings (e.g. from missing organization schema), if we removed it, 
          // wait, buildAdaptiveStages creates the blueprint findings. 
          // We can just simulate the finding status as success if it matches the findingId to remove.
          
          let status = origFinding ? origFinding.status : simFinding.status
          if (origFinding && origFinding.issueType) {
            // Is this finding the one that maps to the issue we are removing?
            // Since derived issues map 1:1 to findings:
            const findingIssueId = `issue-${origStage.id}-${origFinding.id}-${0}` // The index would be 0
            if (findingIssueId === issueIdToRemove) {
               status = 'success'
            }
          }
          return { ...simFinding, status }
        })
      }
    })
  }

  const simulatedScore = calculateUnderstandingScore(simulatedProgressState)
  return Math.max(0, simulatedScore - currentScore)
}

function isFindingSettled(finding) {
  return finding.status === 'success' || finding.status === 'warning' || finding.status === 'failed'
}

function getFindingWeight(finding) {
  const certaintyWeight = finding.certainty === 'Unknown' ? 1.16 : finding.certainty === 'Inferred' ? 1.05 : 1
  return (finding.stageImportance || 1) * certaintyWeight
}

function buildAdaptiveStages(data, url = '') {
  if (!data) return STAGE_BLUEPRINTS.map(createStage)

  const pageText = getPageText(data)
  const host = safeHost(url || data.url)
  const title = data.title || data.readable?.title || host || 'Untitled page'
  const issues = data.a11y?.issues || []
  const semanticIndex = data.a11y?.semanticIndex || {}
  const nodes = Object.values(semanticIndex)
  const wordCount = data.readable?.wordCount || countWords(pageText)
  const hasMain = nodes.some(node => matchesNode(node, ['main']))
  const navCount = nodes.filter(node => matchesNode(node, ['nav', 'navigation'])).length
  const missingH1 = issues.some(issue => issue.type === 'Missing H1')
  const multipleH1 = issues.find(issue => issue.type?.startsWith('Multiple H1'))
  const extracted = extractKnowledgeCategories(pageText, title, host)

  const adaptive = [
    stageFrom('identity', [
      finding('brand-name', 'Primary Entity', cleanBrand(title, host), 'Known', 'High', 'success', 'Title, URL, and readable text', 'LLM Extraction', 'AI can anchor the page to a named entity.', [
        action('brand-evidence', 'View Evidence', 'scroll-raw', { panel: 'llm' })
      ]),
      finding('page-type', 'Page Type', inferPageType(url, pageText), 'Inferred', 'High', 'success', 'URL pattern and content shape', 'Human View', 'The page has a recognizable intent, which gives later findings a stable frame.', [
        action('page-type-evidence', 'View Evidence', 'scroll-raw', { panel: 'human' })
      ]),
      ...(!host ? [warningFinding('identity-url', 'URL identity unclear', 'Unknown host', 'URL parsing', 'Raw Analysis', 'AI could not reliably resolve a domain identity.', 'Primary entity unclear')] : [])
    ]),
    stageFrom('structure', [
      ...(hasMain ? [finding('main-content', 'Main Region', 'Identified', 'Known', 'High', 'success', 'Semantic tree', 'Machine Structure', 'A main content region gives AI a dependable anchor for the core content.', [
        action('main-structure', 'Jump to Tree', 'focus-raw', { panel: 'structure' })
      ])] : [warningFinding('missing-main', 'Main Region Missing', 'Not detected', 'Semantic tree', 'Machine Structure', 'Without a clear main region, AI has to infer which content matters most.', 'Main content landmark missing')]),
      ...(navCount > 0 ? [finding('navigation', 'Navigation', `${navCount} region${navCount > 1 ? 's' : ''}`, 'Known', 'High', 'success', 'Semantic tree', 'Machine Structure', 'Navigation is machine-readable enough to explain site movement.', [
        action('nav-structure', 'Locate in Tree', 'locate-tree', { nodeHint: 'nav' })
      ])] : []),
      ...(missingH1 ? [warningFinding('missing-h1', 'Missing H1', 'Not detected', 'Heading hierarchy', 'Machine Structure', 'The page lacks one of the clearest topic anchors for AI systems.', 'Missing H1')] : []),
      ...(multipleH1 ? [warningFinding('multiple-h1', 'Multiple H1 Tags', multipleH1.message || 'Multiple detected', 'Heading hierarchy', 'Machine Structure', 'Multiple top-level headings can blur the primary topic signal.', multipleH1.type)] : []),
      ...(nodes.length > 40 ? [finding('semantic-depth', 'Semantic Depth', `${nodes.length} machine-readable nodes`, 'Known', 'High', 'success', 'Accessibility tree', 'Machine Structure', 'The page exposes enough structure for AI to build a useful outline.', [
        action('depth-structure', 'Jump to Structure', 'focus-raw', { panel: 'structure' })
      ])] : [])
    ]),
    stageFrom('content', [
      ...(wordCount > 80 ? [finding('content-extractable', 'Readable Content', `${wordCount} words extracted`, 'Known', wordCount > 250 ? 'High' : 'Medium', 'success', 'Readable extraction', 'LLM Extraction', 'The text layer is available for summarization and retrieval.', [
        action('content-llm', 'Jump to LLM Extraction', 'focus-raw', { panel: 'llm' })
      ])] : [warningFinding('thin-content', 'Thin Extractable Content', `${wordCount} words extracted`, 'Readable extraction', 'LLM Extraction', 'AI has limited text to use when explaining or citing the page.', 'Thin readable content')]),
      finding('primary-intent', 'Primary Intent', inferIntent(pageText, url), 'Inferred', 'High', 'success', 'Copy patterns and page structure', 'Human View', 'The visible language points to a specific user intent.', [
        action('intent-human', 'View Evidence', 'scroll-raw', { panel: 'human' })
      ]),
      ...(hasPattern(pageText, ['faq', 'questions', 'answers']) ? [finding('answers', 'Answer Content', 'Detected', 'Known', 'Medium', 'success', 'Readable text', 'LLM Extraction', 'Question-oriented content can be reused by AI answer systems.', [
        action('answers-llm', 'View Evidence', 'focus-raw', { panel: 'llm' })
      ])] : [])
    ]),
    stageFrom('knowledge', extracted.map(category => (
      finding(category.id, category.label, category.value, category.certainty, category.confidence, 'success', category.evidence, 'LLM Extraction', category.explanation, [
        action(`${category.id}-evidence`, 'View Evidence', 'focus-raw', { panel: 'llm' })
      ])
    ))),
    stageFrom('accessibility', [
      ...buildAccessibilityFindings(issues),
      ...(issues.length === 0 ? [finding('a11y-clear', 'Accessibility Blockers', 'None detected', 'Known', 'High', 'success', 'Accessibility checks', 'Machine Structure', 'No critical machine-readable blockers were detected in the accessibility pass.', [
        action('a11y-structure', 'View Structure', 'focus-raw', { panel: 'structure' })
      ])] : [])
    ])
  ]

  return adaptive.map(stage => ({
    ...stage,
    status: getStageStatus(stage)
  }))
}

function stageFrom(id, findings) {
  const blueprint = STAGE_BLUEPRINTS.find(stage => stage.id === id)
  return {
    ...blueprint,
    findings: compactFindings(findings.length > 0 ? findings : [
      finding(`${id}-no-signal`, 'Signal Sparse', 'No strong signal detected', 'Unknown', 'Low', 'warning', 'Analyzer output', 'Raw Analysis', 'AI did not find enough evidence to build this part of the model confidently.', [
        action(`${id}-raw`, 'View Raw Source', 'scroll-raw', { panel: 'llm' })
      ], { issueType: `${blueprint.title} signal sparse`, severity: 'warning' })
    ])
  }
}

function compactFindings(findings) {
  return findings.map(item => ({
    ...item,
    status: item.finalStatus
  }))
}

function warningFinding(id, label, value, evidence, sourcePanel, explanation, issueType) {
  return finding(id, label, value, 'Unknown', 'Medium', 'warning', evidence, sourcePanel, explanation, [
    action(`${id}-issue`, 'Open Issue', 'create-issue', { issueType }),
    action(`${id}-source`, 'Raw Source', 'focus-raw', { panel: sourcePanel === 'Machine Structure' ? 'structure' : 'llm' })
  ], { issueType, severity: 'warning' })
}

function buildAccessibilityFindings(issues) {
  const grouped = issues.reduce((groups, issue) => {
    const key = issue.type || 'Accessibility issue'
    groups[key] = groups[key] || []
    groups[key].push(issue)
    return groups
  }, {})

  return Object.entries(grouped).map(([type, items]) => {
    const severity = items.some(i => i.severity === 'critical') ? 'critical' : 'warning';
    const hasHighConf = items.some(i => i.confidence === 'High');
    const confidence = hasHighConf ? 'High' : 'Medium';
    const status = severity === 'critical' ? 'failed' : 'warning';

    return finding(
      `a11y-${slug(type)}`,
      type,
      `${items.length} instance${items.length > 1 ? 's' : ''}`,
      'Known',
      confidence,
      status,
      'Accessibility issue list',
      'Machine Structure',
      'This issue can make the page harder for AI and assistive systems to interpret reliably.',
      [
        action(`a11y-${slug(type)}-issue`, 'Open Issue', 'create-issue', { issueType: type }),
        action(`a11y-${slug(type)}-source`, 'Raw Source', 'focus-raw', { panel: 'structure' })
      ],
      { issueType: type, severity }
    );
  });
}

function extractKnowledgeCategories(pageText, title, host) {
  const text = pageText.toLowerCase()
  const catalog = [
    ['products', 'Products', ['shoe', 'shoes', 'apparel', 'collection', 'product', 'gear', 'shop', 'cart'], 'Product and shopping language is visible.'],
    ['collections', 'Collections', ['collection', 'featured', 'new arrivals', 'bestseller', 'sale'], 'The page exposes grouped offerings rather than isolated items.'],
    ['athletes', 'Athletes', ['athlete', 'runner', 'basketball', 'football', 'training', 'sport'], 'Sports and athlete language gives the entity graph a performance context.'],
    ['sports', 'Sports', ['running', 'basketball', 'football', 'training', 'yoga', 'soccer'], 'Sport categories are extractable from the page vocabulary.'],
    ['artists', 'Artists', ['artist', 'artists', 'portfolio', 'studio', 'tattooer'], 'The page identifies creative providers as first-class entities.'],
    ['tattoo-styles', 'Tattoo Styles', ['tattoo', 'blackwork', 'fine line', 'realism', 'traditional', 'piercing'], 'Style language gives AI a more specific service model.'],
    ['appointments', 'Appointments', ['appointment', 'booking', 'book now', 'consultation', 'schedule'], 'Booking language helps AI understand conversion intent.'],
    ['services', 'Services', ['service', 'services', 'consulting', 'agency', 'design', 'development', 'returns', 'shipping'], 'Service or support language is present enough to extract.'],
    ['locations', 'Locations', ['location', 'address', 'near', 'city', 'india', 'global', 'studio'], 'Geographic or place cues are available for entity grounding.'],
    ['brands', 'Brands', ['brand', 'nike', 'jordan', 'vercel', 'partner'], 'Brand names and related entities are visible in the text.'],
    ['technology', 'Technology', ['api', 'deploy', 'frontend', 'cloud', 'framework', 'developer', 'platform'], 'Technical terms form a distinct knowledge category.'],
    ['pricing', 'Pricing', ['pricing', 'plans', 'quote', 'free', 'trial', 'membership'], 'Commercial terms help AI understand how the offering is packaged.']
  ]

  const matches = catalog
    .map(([id, label, terms, explanation]) => {
      const hits = terms.filter(term => text.includes(term))
      return {
        id,
        label,
        hits,
        score: hits.length,
        explanation
      }
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)

  const fallback = cleanBrand(title, host)
  return (matches.length > 0 ? matches : [{
    id: 'core-entity',
    label: 'Core Entity',
    hits: [fallback],
    score: 1,
    explanation: 'The page exposes a primary entity, but few specialized categories were detected.'
  }]).map(item => ({
    id: item.id,
    label: item.label,
    value: summarizeHits(item.hits),
    certainty: item.score >= 3 ? 'Known' : 'Inferred',
    confidence: item.score >= 3 ? 'High' : 'Medium',
    evidence: `${item.score} matching signal${item.score > 1 ? 's' : ''}`,
    explanation: item.explanation
  }))
}

function getPageText(data) {
  return [
    data?.title,
    data?.readable?.title,
    data?.readable?.excerpt,
    data?.readable?.textContent,
    data?.readable?.markdown
  ].filter(Boolean).join(' ')
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function cleanBrand(title, host) {
  const fromTitle = String(title || '').split(/[|-]/)[0].trim()
  if (fromTitle) return fromTitle
  return host ? host.replace(/^www\./, '') : 'Primary entity'
}

function inferPageType(url = '', text = '') {
  const combined = `${url} ${text}`.toLowerCase()
  if (hasPattern(combined, ['pricing', 'plans'])) return 'Pricing page'
  if (hasPattern(combined, ['blog', 'article', 'news'])) return 'Editorial page'
  if (hasPattern(combined, ['shop', 'cart', 'product'])) return 'Commerce page'
  if (hasPattern(combined, ['service', 'agency', 'consulting'])) return 'Service page'
  if (hasPattern(combined, ['appointment', 'booking', 'studio'])) return 'Local business page'
  return 'Homepage or landing page'
}

function inferIntent(text = '', url = '') {
  const combined = `${url} ${text}`.toLowerCase()
  if (hasPattern(combined, ['buy', 'shop', 'cart', 'sale'])) return 'Sell products'
  if (hasPattern(combined, ['book', 'appointment', 'consultation'])) return 'Generate appointments'
  if (hasPattern(combined, ['deploy', 'developer', 'api', 'platform'])) return 'Explain a technical platform'
  if (hasPattern(combined, ['service', 'agency', 'quote'])) return 'Generate service leads'
  return 'Explain the site offering'
}

function hasPattern(text, terms) {
  return terms.some(term => text.includes(term))
}

function matchesNode(node, terms) {
  const haystack = [node?.role, node?.type, node?.label, node?.name, node?.text]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return terms.some(term => haystack.includes(term))
}

function summarizeHits(hits) {
  return [...new Set(hits)].slice(0, 5).map(term => (
    term.replace(/\b\w/g, char => char.toUpperCase())
  )).join(', ')
}

function slug(value = '') {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
