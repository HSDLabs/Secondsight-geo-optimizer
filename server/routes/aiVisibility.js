import { Router } from 'express'
import { aiVisibilityService } from '../services/aiVisibilityService.js'

const router = Router()

function sendError(res, error) {
  const normalized = aiVisibilityService.normalizeServiceError(error)
  res.status(normalized.status || 500).json({
    error: {
      code: normalized.code || 'AI_VISIBILITY_ERROR',
      message: normalized.message,
      ...(normalized.engine ? { engine: normalized.engine } : {}),
      retryable: Boolean(normalized.retryable)
    }
  })
}

function route(handler) {
  return async (req, res) => {
    try { await handler(req, res) } catch (error) { sendError(res, error) }
  }
}

router.get('/engines', route(async (_req, res) => {
  res.json({ engines: aiVisibilityService.engineStatus() })
}))

router.post('/projects/:projectId/prompts/generate', route(async (req, res) => {
  res.status(201).json(await aiVisibilityService.generatePrompts(req.params.projectId, req.body || {}))
}))

router.get('/projects/:projectId/prompts', route(async (req, res) => {
  res.json({ items: await aiVisibilityService.listPrompts(req.params.projectId) })
}))

router.patch('/prompts/:promptId', route(async (req, res) => {
  res.json(await aiVisibilityService.updatePrompt(req.params.promptId, req.body || {}))
}))

router.post('/projects/:projectId/runs', route(async (req, res) => {
  res.status(202).json(await aiVisibilityService.createRun(req.params.projectId, req.body || {}))
}))

router.get('/runs/:runId', route(async (req, res) => {
  res.json(await aiVisibilityService.getRun(req.params.runId))
}))

router.get('/projects/:projectId/overview', route(async (req, res) => {
  res.json(await aiVisibilityService.overview(req.params.projectId))
}))

router.get('/projects/:projectId/responses', route(async (req, res) => {
  res.json({ items: await aiVisibilityService.projectResponses(req.params.projectId, req.query) })
}))

router.get('/responses/:responseId', route(async (req, res) => {
  res.json(await aiVisibilityService.responseDetail(req.params.responseId))
}))

router.get('/projects/:projectId/competitors', route(async (req, res) => {
  res.json({ items: await aiVisibilityService.listCompetitors(req.params.projectId) })
}))

router.patch('/competitors/:entityId', route(async (req, res) => {
  res.json(await aiVisibilityService.updateCompetitor(req.params.entityId, req.body || {}))
}))

router.get('/projects/:projectId/citations', route(async (req, res) => {
  res.json({ items: await aiVisibilityService.listCitations(req.params.projectId) })
}))

router.get('/projects/:projectId/root-causes', route(async (req, res) => {
  res.json({ items: await aiVisibilityService.listRootCauses(req.params.projectId) })
}))

export default router
