import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

const disabledOptionalFeatures = JSON.stringify({ crawler: false, sources: false, aiVisibility: false })

describe('API usage controls', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('secondsight-api-controls', disabledOptionalFeatures)
    globalThis.fetch = vi.fn()
    HTMLElement.prototype.scrollTo = vi.fn()
  })

  it('does not mount or request a directly opened disabled AI Visibility page', () => {
    render(<MemoryRouter initialEntries={['/ai-visibility']}><App /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'AI Visibility is disabled' })).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('skips crawler and sources requests during core analysis', async () => {
    fetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Test stopped after the core request.' }) })
    render(<MemoryRouter><App /></MemoryRouter>)
    fireEvent.change(screen.getByRole('textbox', { name: 'Website URL to analyze' }), { target: { value: 'https://example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Analyze website' }))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
    expect(fetch.mock.calls[0][0]).toBe('/api/analyze')
  })
})
