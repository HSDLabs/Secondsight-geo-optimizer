import { describe, expect, it, vi } from 'vitest'
import { waitForCrawlerContext } from './externalRunOrchestration'

describe('Sources & Authority crawler context gate', () => {
  it('uses crawler context when it completes inside the bounded wait', async () => {
    await expect(waitForCrawlerContext(Promise.resolve({ ok: true, data: { score: 80 } }), 7000)).resolves.toEqual({ ok: true, data: { score: 80 } })
  })

  it('starts without crawler context after seven seconds', async () => {
    vi.useFakeTimers()
    const pending = new Promise(() => {})
    const result = waitForCrawlerContext(pending, 7000)
    await vi.advanceTimersByTimeAsync(7000)
    await expect(result).resolves.toEqual({ ok: false, timedOut: true, data: null })
    vi.useRealTimers()
  })
})
