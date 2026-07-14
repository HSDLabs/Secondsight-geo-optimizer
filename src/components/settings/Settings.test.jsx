import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Settings from './Settings'
import { getApiControls } from '../../utils/featureControls'

describe('Settings API usage controls', () => {
  beforeEach(() => {
    localStorage.clear()
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) })
  })

  it('persists section switches for the current browser', async () => {
    const user = userEvent.setup()
    render(<Settings />)
    const crawlerSwitch = screen.getByRole('switch', { name: 'Crawl & Indexability API requests' })
    expect(crawlerSwitch).toHaveAttribute('aria-checked', 'true')
    await user.click(crawlerSwitch)
    await waitFor(() => expect(getApiControls().crawler).toBe(false))
    expect(crawlerSwitch).toHaveAttribute('aria-checked', 'false')
  })
})
