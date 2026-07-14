import crypto from 'node:crypto'

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000
const DEFAULT_MAX_RUNS = 100

export function assertSingleProcessMemoryStore() {
  const workerCount = Number(process.env.WEB_CONCURRENCY || 1)
  const clustered = workerCount > 1 || process.env.NODE_UNIQUE_ID !== undefined || Number(process.env.NODE_APP_INSTANCE || 0) > 0
  if (clustered) {
    throw new Error('The in-memory external intelligence run store requires exactly one API process. Configure a shared store before enabling multiple workers.')
  }
}

export class ExternalRunStore {
  create() { throw new Error('Not implemented') }
  get() { throw new Error('Not implemented') }
  update() { throw new Error('Not implemented') }
}

export class InMemoryExternalRunStore extends ExternalRunStore {
  constructor({ ttlMs = Number(process.env.EXTERNAL_RUN_TTL_MS) || DEFAULT_TTL_MS, maxRuns = DEFAULT_MAX_RUNS } = {}) {
    super()
    this.ttlMs = ttlMs
    this.maxRuns = maxRuns
    this.instanceId = crypto.randomBytes(6).toString('hex')
    this.runs = new Map()
    this.sessions = new Map()
    this.tombstones = new Map()
  }

  create(run) {
    this.prune()
    const id = `run_${this.instanceId}_${crypto.randomUUID()}`
    const createdAt = new Date().toISOString()
    const record = { ...run, id, instanceId: this.instanceId, createdAt, updatedAt: createdAt, expiresAt: new Date(Date.now() + this.ttlMs).toISOString() }
    this.runs.set(id, record)
    this.prune()
    return record
  }

  get(id) {
    const run = this.runs.get(id)
    if (!run) return null
    if (Date.parse(run.expiresAt) <= Date.now()) {
      this.runs.delete(id)
      this.tombstones.set(id, { reason: 'expired', at: Date.now() })
      return null
    }
    return run
  }

  missingReason(id) {
    if (this.tombstones.has(id)) return this.tombstones.get(id).reason
    const match = /^run_([^_]+)_/.exec(String(id || ''))
    return match && match[1] !== this.instanceId ? 'instance_replaced' : 'run_unavailable'
  }

  update(id, updater) {
    const current = this.get(id)
    if (!current) return null
    const patch = typeof updater === 'function' ? updater(current) : updater
    const next = { ...current, ...patch, updatedAt: new Date().toISOString() }
    this.runs.set(id, next)
    return next
  }

  setActive(sessionId, runId) {
    const session = this.sessions.get(sessionId) || { analysisSessionId: sessionId, activeExternalRunId: null, publishedExternalRunId: null }
    session.activeExternalRunId = runId
    this.sessions.set(sessionId, session)
    return session
  }

  publishIfActive(sessionId, runId) {
    const session = this.sessions.get(sessionId)
    if (!session || session.activeExternalRunId !== runId) return false
    session.publishedExternalRunId = runId
    this.sessions.set(sessionId, session)
    return true
  }

  getSession(sessionId) {
    return this.sessions.get(sessionId) || null
  }

  isActive(sessionId, runId) {
    return this.sessions.get(sessionId)?.activeExternalRunId === runId
  }

  prune() {
    const now = Date.now()
    for (const [id, run] of this.runs) {
      if (Date.parse(run.expiresAt) <= now) {
        this.runs.delete(id)
        this.tombstones.set(id, { reason: 'expired', at: now })
      }
    }
    while (this.runs.size > this.maxRuns) {
      const oldest = [...this.runs.values()].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))[0]
      this.runs.delete(oldest.id)
      this.tombstones.set(oldest.id, { reason: 'expired', at: now })
    }
    for (const [id, tombstone] of this.tombstones) if (now - tombstone.at > this.ttlMs) this.tombstones.delete(id)
  }
}

export const externalRunStore = new InMemoryExternalRunStore()
