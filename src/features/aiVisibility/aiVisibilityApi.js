const API_ROOT = '/api/ai-visibility'

async function request(path, options = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    ...options,
    headers: options.body ? { 'Content-Type': 'application/json', ...options.headers } : options.headers
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.error?.message || 'AI Visibility request failed.')
    error.code = payload.error?.code
    error.engine = payload.error?.engine
    error.retryable = Boolean(payload.error?.retryable)
    error.status = response.status
    throw error
  }
  return payload
}

const json = value => JSON.stringify(value)

export const aiVisibilityApi = {
  engines: () => request('/engines'),
  overview: projectId => request(`/projects/${encodeURIComponent(projectId)}/overview`),
  prompts: projectId => request(`/projects/${encodeURIComponent(projectId)}/prompts`),
  generatePrompts: (projectId, input) => request(`/projects/${encodeURIComponent(projectId)}/prompts/generate`, { method: 'POST', body: json(input) }),
  updatePrompt: (promptId, patch) => request(`/prompts/${encodeURIComponent(promptId)}`, { method: 'PATCH', body: json(patch) }),
  createRun: (projectId, input) => request(`/projects/${encodeURIComponent(projectId)}/runs`, { method: 'POST', body: json(input) }),
  run: runId => request(`/runs/${encodeURIComponent(runId)}`),
  responses: projectId => request(`/projects/${encodeURIComponent(projectId)}/responses`),
  response: responseId => request(`/responses/${encodeURIComponent(responseId)}`),
  competitors: projectId => request(`/projects/${encodeURIComponent(projectId)}/competitors`),
  updateCompetitor: (entityId, patch) => request(`/competitors/${encodeURIComponent(entityId)}`, { method: 'PATCH', body: json(patch) }),
  citations: projectId => request(`/projects/${encodeURIComponent(projectId)}/citations`),
  rootCauses: projectId => request(`/projects/${encodeURIComponent(projectId)}/root-causes`)
}

export async function pollVisibilityRun(runId, { onUpdate, signal, interval = 1500 } = {}) {
  while (!signal?.aborted) {
    const run = await aiVisibilityApi.run(runId)
    onUpdate?.(run)
    if (['completed', 'completed_degraded', 'failed'].includes(run.status)) return run
    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, interval)
      signal?.addEventListener('abort', () => {
        clearTimeout(timer)
        reject(new DOMException('Polling stopped.', 'AbortError'))
      }, { once: true })
    })
  }
  return null
}
