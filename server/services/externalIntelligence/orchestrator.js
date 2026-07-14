import { createSourceAdapters, collectAdaptiveSource } from './adapters.js'
import { classifySourceError, getCapability, getSourceCapabilities, SOURCE_DEFINITIONS } from './capabilities.js'
import { buildEntityProfile, deduplicateAndCluster } from './evidence.js'
import { buildIssues, buildOpportunities, generateIntelligenceSection, PROMPT_TEMPLATE_VERSION } from './intelligence.js'
import { computeSignalSummary } from './scoring.js'
import { assertPublicHttpUrl } from './security.js'
import { externalRunStore } from './store.js'

const adapters = createSourceAdapters()
const abortControllers = new Map()
const LIVE_SOURCES = ['reddit', 'news', 'x', 'youtube']
const SECTION_ORDER = ['summary', 'associations', 'themes', 'risks', 'issues', 'opportunities']

function emptyCounts() {
  return { found: 0, relevant: 0, duplicate: 0, clustered: 0, retained: 0 }
}

function initialPipeline() {
  return [
    { id: 'resolving_entity', label: 'Resolving entity', state: 'queued' },
    { id: 'collecting', label: 'Collecting external sources', state: 'queued' },
    { id: 'deduplicating', label: 'Removing duplicates and clustering', state: 'queued' },
    { id: 'checking_relevance', label: 'Checking entity relevance', state: 'queued' },
    { id: 'extracting', label: 'Extracting associations, themes, and risks', state: 'queued' },
    { id: 'generating', label: 'Generating intelligence sections', state: 'queued' }
  ]
}

function updateStep(run, stepId, state, detail) {
  return {
    pipeline: run.pipeline.map(step => step.id === stepId ? { ...step, state, detail, updatedAt: new Date().toISOString() } : step)
  }
}

function sourceSummary(sourceType, capability) {
  const definition = SOURCE_DEFINITIONS[sourceType]
  return {
    sourceType,
    role: definition?.role,
    state: capability?.available ? 'queued' : capability?.state || 'unavailable',
    reason: capability?.reason,
    counts: emptyCounts(),
    actualRange: null,
    stoppedReason: null,
    supportsDateRange: capability?.supportsDateRange,
    supportsPagination: capability?.supportsPagination,
    supportsEngagement: capability?.supportsEngagement
  }
}

function aggregateCounts(sources) {
  return sources.reduce((totals, source) => {
    for (const key of Object.keys(totals)) totals[key] += Number(source.counts?.[key] || 0)
    return totals
  }, emptyCounts())
}

function sectionState() {
  return Object.fromEntries(SECTION_ORDER.map(section => [section, { state: 'queued', href: null }]))
}

function isDegraded(run) {
  return run.sourceSummaries.some(source => ['failed', 'rate_limited', 'authentication_required', 'unavailable'].includes(source.state))
    || Object.values(run.sectionStatuses).some(section => ['failed', 'unavailable'].includes(section.state))
}

function retainedDiagnosticsOnly(runId) {
  externalRunStore.update(runId, { diagnosticsOnly: true })
}

async function collectOne(runId, sourceType, controller) {
  const run = externalRunStore.get(runId)
  const capability = getCapability(sourceType)
  if (!capability?.available || !adapters[sourceType]) return { items: [], summary: sourceSummary(sourceType, capability) }
  externalRunStore.update(runId, current => ({
    sourceSummaries: current.sourceSummaries.map(source => source.sourceType === sourceType ? { ...source, state: 'collecting', startedAt: new Date().toISOString() } : source)
  }))
  try {
    const result = await collectAdaptiveSource({
      adapter: adapters[sourceType],
      entity: run.entity,
      configuration: run.configuration,
      signal: controller.signal,
      onProgress: counts => externalRunStore.update(runId, current => ({
        sourceSummaries: current.sourceSummaries.map(source => source.sourceType === sourceType ? { ...source, counts: { ...source.counts, ...counts }, actualRange: counts.actualRange } : source)
      }))
    })
    const state = result.cancelled ? 'unavailable' : result.items.length ? 'complete' : 'complete_empty'
    return { items: result.items, summary: { ...sourceSummary(sourceType, capability), state, counts: result.counts, actualRange: result.actualRange, stoppedReason: result.stoppedReason, durationMs: result.durationMs } }
  } catch (error) {
    return {
      items: [],
      summary: {
        ...sourceSummary(sourceType, capability),
        state: classifySourceError(error),
        reason: String(error.message || 'Collection failed').slice(0, 240),
        counts: { ...emptyCounts(), found: error.partialDiagnostics?.found || 0, relevant: error.partialDiagnostics?.relevant || 0, retained: error.partialDiagnostics?.retained || 0 },
        actualRange: error.partialDiagnostics?.actualRange,
        durationMs: error.partialDiagnostics?.durationMs
      }
    }
  }
}

async function runGeneratedSection(runId, section) {
  externalRunStore.update(runId, current => ({ sectionStatuses: { ...current.sectionStatuses, [section]: { ...current.sectionStatuses[section], state: 'running', startedAt: new Date().toISOString() } } }))
  const run = externalRunStore.get(runId)
  try {
    const result = await generateIntelligenceSection(section, { entity: run.entity, evidence: run.evidence })
    externalRunStore.update(runId, current => ({
      sectionData: { ...current.sectionData, [section]: result.data },
      sectionStatuses: { ...current.sectionStatuses, [section]: { state: 'complete', href: `/api/external-intelligence/runs/${runId}/sections/${section}`, generatedAt: result.generatedAt, model: result.model, promptTemplateVersion: result.promptTemplateVersion } }
    }))
  } catch (error) {
    externalRunStore.update(runId, current => ({ sectionStatuses: { ...current.sectionStatuses, [section]: { state: 'failed', href: null, reason: String(error.message || 'Generation failed').slice(0, 240) } } }))
  }
}

async function runDependentSections(runId) {
  let run = externalRunStore.get(runId)
  const risks = run.sectionData.risks
  const issues = buildIssues({ entity: run.entity, sourceSummaries: run.sourceSummaries, risks })
  externalRunStore.update(runId, current => ({
    issues,
    sectionData: { ...current.sectionData, issues },
    sectionStatuses: { ...current.sectionStatuses, issues: { state: 'complete', href: `/api/external-intelligence/runs/${runId}/issues`, generatedAt: new Date().toISOString() } }
  }))
  run = externalRunStore.get(runId)
  if (run.sectionStatuses.associations.state === 'complete') {
    const opportunities = buildOpportunities({ issues, associations: run.sectionData.associations })
    externalRunStore.update(runId, current => ({
      sectionData: { ...current.sectionData, opportunities },
      sectionStatuses: { ...current.sectionStatuses, opportunities: { state: 'complete', href: `/api/external-intelligence/runs/${runId}/sections/opportunities`, generatedAt: new Date().toISOString() } }
    }))
  } else {
    externalRunStore.update(runId, current => ({ sectionStatuses: { ...current.sectionStatuses, opportunities: { state: 'unavailable', href: null, reason: 'Associations must complete before opportunities can be generated.' } } }))
  }
}

async function executeRun(runId) {
  let run = externalRunStore.get(runId)
  if (!run) return
  const controller = abortControllers.get(runId)
  try {
    externalRunStore.update(runId, current => ({ status: 'resolving_entity', ...updateStep(current, 'resolving_entity', 'running') }))
    const entity = buildEntityProfile(run.configuration.url, run.configuration.entityHint, run.configuration.entityOverride)
    externalRunStore.update(runId, current => ({ entity, ...updateStep(current, 'resolving_entity', 'complete', `${entity.name} · ${entity.confidence}% confidence`) }))
    run = externalRunStore.get(runId)

    externalRunStore.update(runId, current => ({ status: 'collecting', ...updateStep(current, 'collecting', 'running') }))
    const collected = await Promise.all(run.configuration.sources.map(source => collectOne(runId, source, controller)))
    const sourceSummaries = collected.map(result => result.summary)
    const rawEvidence = collected.flatMap(result => result.items)
    externalRunStore.update(runId, current => ({ sourceSummaries, aggregateCounts: aggregateCounts(sourceSummaries), ...updateStep(current, 'collecting', 'complete', `${rawEvidence.length} relevant candidates`) }))

    const successfulSources = sourceSummaries.filter(source => ['complete', 'complete_empty'].includes(source.state))
    if (!successfulSources.length) throw new Error('No enabled source completed successfully.')

    externalRunStore.update(runId, current => ({ status: 'deduplicating', ...updateStep(current, 'deduplicating', 'running') }))
    const deduped = deduplicateAndCluster(rawEvidence)
    sourceSummaries.forEach(summary => {
      const retainedForSource = deduped.retained.filter(item => item.sourceType === summary.sourceType).length
      const clusteredForSource = rawEvidence.filter(item => item.sourceType === summary.sourceType).length - retainedForSource
      summary.counts = { ...summary.counts, retained: retainedForSource, clustered: Math.max(0, clusteredForSource), duplicate: summary.counts.duplicate || 0 }
    })
    externalRunStore.update(runId, current => ({ sourceSummaries, aggregateCounts: aggregateCounts(sourceSummaries), ...updateStep(current, 'deduplicating', 'complete', `${deduped.duplicates} duplicates removed; ${deduped.clustered} syndicated items clustered`) }))

    externalRunStore.update(runId, current => ({ status: 'checking_relevance', ...updateStep(current, 'checking_relevance', 'complete', `${deduped.retained.length} retained relevant items`) }))
    const dimensions = computeSignalSummary(deduped.retained, sourceSummaries, [])
    externalRunStore.update(runId, current => ({
      evidence: deduped.retained,
      dimensions,
      publishable: true,
      status: 'extracting',
      ...updateStep(current, 'extracting', 'running')
    }))
    if (!externalRunStore.publishIfActive(run.analysisSessionId, runId)) retainedDiagnosticsOnly(runId)

    externalRunStore.update(runId, current => ({ status: 'generating', ...updateStep(current, 'generating', 'running') }))
    await Promise.all(['summary', 'associations', 'themes', 'risks'].map(section => runGeneratedSection(runId, section)))
    await runDependentSections(runId)
    run = externalRunStore.get(runId)
    const risks = run.sectionData.risks?.items || []
    const evidenceWithLabels = run.evidence.map(item => ({
      ...item,
      associations: (run.sectionData.associations?.items || []).filter(association => association.evidenceIds.includes(item.id)).map(association => association.label),
      themes: (run.sectionData.themes?.items || []).filter(theme => theme.evidenceIds.includes(item.id)).map(theme => theme.label)
    }))
    externalRunStore.update(runId, current => {
      const pipeline = current.pipeline.map(step => ['extracting', 'generating'].includes(step.id) ? { ...step, state: 'complete', updatedAt: new Date().toISOString() } : step)
      const dimensions = computeSignalSummary(evidenceWithLabels, current.sourceSummaries, risks)
      if (current.sectionStatuses.risks.state !== 'complete') {
        const risk = dimensions.find(dimension => dimension.id === 'external-risk')
        Object.assign(risk, { status: 'Unavailable', confidence: 'low', rationale: 'The risk intelligence section did not complete. Negative sentiment was not substituted for supported risk analysis.' })
      }
      return { evidence: evidenceWithLabels, dimensions, pipeline }
    })
    run = externalRunStore.get(runId)
    const status = isDegraded(run) ? 'completed_degraded' : 'completed'
    externalRunStore.update(runId, { status, completedAt: new Date().toISOString() })
  } catch (error) {
    externalRunStore.update(runId, { status: controller?.signal.aborted ? 'superseded' : 'failed', error: String(error.message || 'External analysis failed').slice(0, 300), completedAt: new Date().toISOString() })
  } finally {
    abortControllers.delete(runId)
  }
}

export async function createExternalRun(input) {
  const url = await assertPublicHttpUrl(input.url)
  if (!input.analysisSessionId) throw new TypeError('analysisSessionId is required.')
  const requestedSources = [...new Set((input.sources || LIVE_SOURCES).filter(source => LIVE_SOURCES.includes(source)))]
  if (!requestedSources.length) throw new TypeError('At least one supported source must be selected.')
  if (input.dateMode === 'manual') {
    const from = Date.parse(input.requestedRange?.from)
    const to = Date.parse(input.requestedRange?.to)
    if (!from || !to || from > to || to > Date.now() + 86400000) throw new TypeError('A valid manual date range is required.')
  }
  const capabilities = getSourceCapabilities()
  const configuration = {
    url,
    sources: requestedSources,
    dateMode: input.dateMode === 'manual' ? 'manual' : 'automatic',
    requestedRange: input.dateMode === 'manual' ? input.requestedRange || null : null,
    entityHint: input.entityHint || {},
    entityOverride: input.entityOverride || null,
    basedOnRunId: input.basedOnRunId || null,
    sourceTargets: Object.fromEntries(requestedSources.map(source => [source, { softTarget: SOURCE_DEFINITIONS[source].softTarget, rawCeiling: SOURCE_DEFINITIONS[source].rawCeiling }])),
    collectorVersions: Object.fromEntries(requestedSources.map(source => [source, SOURCE_DEFINITIONS[source].parserVersion])),
    promptTemplateVersion: PROMPT_TEMPLATE_VERSION
  }
  const previousSession = externalRunStore.getSession(input.analysisSessionId)
  const previous = previousSession?.activeExternalRunId ? externalRunStore.get(previousSession.activeExternalRunId) : null
  const run = externalRunStore.create({
    analysisSessionId: input.analysisSessionId,
    status: 'queued',
    configuration,
    entity: null,
    pipeline: initialPipeline(),
    sourceSummaries: requestedSources.map(source => sourceSummary(source, capabilities.find(capability => capability.sourceType === source))),
    aggregateCounts: emptyCounts(),
    sectionStatuses: sectionState(),
    sectionData: {},
    issues: [],
    evidence: [],
    dimensions: [],
    publishable: false,
    diagnosticsOnly: false
  })
  if (previous && !['completed', 'completed_degraded', 'failed', 'superseded'].includes(previous.status)) {
    externalRunStore.update(previous.id, { status: 'superseded', supersededByRunId: run.id, supersededAt: new Date().toISOString() })
    abortControllers.get(previous.id)?.abort()
  }
  externalRunStore.setActive(input.analysisSessionId, run.id)
  const controller = new AbortController()
  abortControllers.set(run.id, controller)
  queueMicrotask(() => executeRun(run.id))
  return run
}

export async function decideEntity(runId, body) {
  const run = externalRunStore.get(runId)
  if (!run) return null
  if (body.decision === 'confirm') {
    externalRunStore.update(runId, { entityConfirmedAt: new Date().toISOString() })
    return { replacementRunCreated: false, runId }
  }
  if (body.decision !== 'correct' || !body.entity?.name || !body.entity?.canonicalUrl) throw new TypeError('Correction requires an entity name and canonicalUrl.')
  const replacement = await createExternalRun({
    analysisSessionId: run.analysisSessionId,
    basedOnRunId: run.id,
    url: body.entity.canonicalUrl,
    sources: run.configuration.sources,
    dateMode: run.configuration.dateMode,
    requestedRange: run.configuration.requestedRange,
    entityHint: run.configuration.entityHint,
    entityOverride: body.entity
  })
  return { replacementRunCreated: true, runId: replacement.id }
}

export async function retryIntelligence(runId, requestedSections) {
  const run = externalRunStore.get(runId)
  if (!run) return null
  const requested = [...new Set((requestedSections || []).filter(section => ['summary', 'associations', 'themes', 'risks', 'issues', 'opportunities'].includes(section)))]
  const expanded = new Set(requested)
  if (expanded.has('risks')) { expanded.add('issues'); expanded.add('opportunities') }
  if (expanded.has('issues') || expanded.has('associations')) expanded.add('opportunities')
  externalRunStore.update(runId, current => ({
    status: 'generating',
    sectionStatuses: Object.fromEntries(Object.entries(current.sectionStatuses).map(([section, status]) => [section, expanded.has(section) ? { state: 'queued', href: null } : status]))
  }))
  queueMicrotask(async () => {
    for (const section of [...expanded].filter(section => ['summary', 'associations', 'themes', 'risks'].includes(section))) await runGeneratedSection(runId, section)
    if (expanded.has('issues') || expanded.has('opportunities')) await runDependentSections(runId)
    const updated = externalRunStore.get(runId)
    externalRunStore.update(runId, { status: isDegraded(updated) ? 'completed_degraded' : 'completed', completedAt: new Date().toISOString() })
  })
  return { runId, sections: [...expanded] }
}

export function leanRun(run) {
  const session = externalRunStore.getSession(run.analysisSessionId)
  return {
    id: run.id,
    instanceId: run.instanceId,
    status: run.status,
    error: run.error,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
    completedAt: run.completedAt,
    expiresAt: run.expiresAt,
    supersededByRunId: run.supersededByRunId,
    activeExternalRunId: session?.activeExternalRunId,
    publishedExternalRunId: session?.publishedExternalRunId,
    publishable: run.publishable,
    entity: run.entity,
    entityConfirmedAt: run.entityConfirmedAt,
    pipeline: run.pipeline,
    sourceSummaries: run.sourceSummaries,
    aggregateCounts: run.aggregateCounts,
    dimensions: run.dimensions,
    sectionStatuses: run.sectionStatuses,
    configuration: run.configuration,
    temporary: { storeMode: 'memory-single-process', ttlHours: 24 },
    links: {
      evidence: `/api/external-intelligence/runs/${run.id}/evidence`,
      issues: `/api/external-intelligence/runs/${run.id}/issues`
    }
  }
}
