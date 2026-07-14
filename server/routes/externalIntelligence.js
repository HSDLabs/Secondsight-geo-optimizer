import { Router } from 'express'
import { getSourceCapabilities } from '../services/externalIntelligence/capabilities.js'
import { createExternalRun, decideEntity, leanRun, retryIntelligence } from '../services/externalIntelligence/orchestrator.js'
import { externalRunStore } from '../services/externalIntelligence/store.js'

const router = Router()

function getRunOrGone(req, res) {
  const run = externalRunStore.get(req.params.runId)
  if (run) return run
  res.status(410).json({
    error: 'Temporary analysis result is no longer available.',
    code: externalRunStore.missingReason(req.params.runId),
    instanceId: externalRunStore.instanceId
  })
  return null
}

router.get('/capabilities', (_req, res) => {
  res.json({
    instanceId: externalRunStore.instanceId,
    storeMode: 'memory-single-process',
    ttlHours: externalRunStore.ttlMs / 3600000,
    sources: getSourceCapabilities()
  })
})

router.post('/runs', async (req, res) => {
  try {
    const run = await createExternalRun(req.body || {})
    res.status(202).json(leanRun(run))
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

router.get('/runs/:runId', (req, res) => {
  const run = getRunOrGone(req, res)
  if (run) res.json(leanRun(run))
})

router.get('/runs/:runId/evidence', (req, res) => {
  const run = getRunOrGone(req, res)
  if (!run) return
  const page = Math.max(1, Number(req.query.page) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 20))
  const sources = String(req.query.source || '').split(',').filter(Boolean)
  const themes = String(req.query.theme || '').split(',').filter(Boolean)
  const sentiments = String(req.query.sentiment || '').split(',').filter(Boolean)
  const ids = String(req.query.ids || '').split(',').filter(Boolean)
  const association = String(req.query.association || '').toLowerCase()
  const search = String(req.query.search || '').toLowerCase().trim()
  const minRelevance = Number(req.query.minRelevance) || 0
  const minAuthority = Number(req.query.minAuthority) || 0
  const from = req.query.from ? Date.parse(req.query.from) : null
  const to = req.query.to ? Date.parse(req.query.to) : null
  const filtered = run.evidence.filter(item => {
    if (ids.length && !ids.includes(item.id)) return false
    if (sources.length && !sources.includes(item.sourceType)) return false
    if (themes.length && !themes.some(theme => item.themes?.includes(theme))) return false
    if (sentiments.length && !sentiments.includes(item.sentiment)) return false
    if (association && !item.associations?.some(value => value.toLowerCase() === association)) return false
    if (item.relevanceScore < minRelevance || item.authorityScore < minAuthority) return false
    const published = item.publishedAt ? Date.parse(item.publishedAt) : null
    if (from && published && published < from) return false
    if (to && published && published > to) return false
    if (search && !`${item.title} ${item.snippet} ${item.sourceName}`.toLowerCase().includes(search)) return false
    return true
  })
  const start = (page - 1) * pageSize
  res.json({ page, pageSize, total: filtered.length, items: filtered.slice(start, start + pageSize) })
})

router.get('/runs/:runId/issues', (req, res) => {
  const run = getRunOrGone(req, res)
  if (run) res.json({ items: run.issues || [] })
})

router.get('/runs/:runId/sections/:section', (req, res) => {
  const run = getRunOrGone(req, res)
  if (!run) return
  const status = run.sectionStatuses[req.params.section]
  if (!status) return res.status(404).json({ error: 'Unknown intelligence section.' })
  res.json({ section: req.params.section, status, data: run.sectionData[req.params.section] ?? null })
})

router.post('/runs/:runId/entity-decision', async (req, res) => {
  const run = getRunOrGone(req, res)
  if (!run) return
  try {
    const result = await decideEntity(run.id, req.body || {})
    res.status(result.replacementRunCreated ? 202 : 200).json(result)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

router.post('/runs/:runId/intelligence-retries', async (req, res) => {
  const run = getRunOrGone(req, res)
  if (!run) return
  try {
    const result = await retryIntelligence(run.id, req.body?.sections)
    res.status(202).json(result)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

export default router
