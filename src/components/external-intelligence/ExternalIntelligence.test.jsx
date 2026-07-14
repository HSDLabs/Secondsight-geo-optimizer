import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import ExternalIntelligence from './ExternalIntelligence'

const capabilities = {
  sources: [
    { sourceType: 'reddit', available: true, state: 'enabled' },
    { sourceType: 'news', available: true, state: 'enabled' },
    { sourceType: 'x', available: false, state: 'authentication_required', reason: 'Authentication required' },
    { sourceType: 'youtube', available: true, state: 'enabled' },
    { sourceType: 'linkedin', available: false, state: 'not_supported' },
    { sourceType: 'review', available: false, state: 'not_supported' }
  ]
}

function renderPage(context) {
  return render(
    <MemoryRouter initialEntries={['/sources-authority']}>
      <Routes>
        <Route element={<Outlet context={context} />}>
          <Route path="/sources-authority" element={<ExternalIntelligence />} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('Sources & Authority states', () => {
  it('shows a concise capability-driven empty state and starts manually', async () => {
    const startExternalRun = vi.fn().mockResolvedValue({ id: 'run-1' })
    const { container } = renderPage({ data: { url: 'https://example.com' }, externalRun: null, publishedExternalRun: null, externalCapabilities: capabilities, startExternalRun, loadExternalRun: vi.fn(), setExternalError: vi.fn() })
    expect(screen.getByRole('heading', { name: 'Sources & Authority' })).toBeInTheDocument()
    expect(screen.getByText('Discover where the brand appears')).toBeInTheDocument()
    expect(screen.getAllByText('Enabled')).toHaveLength(3)
    expect(screen.getByText('Unavailable')).toBeInTheDocument()
    expect(screen.getByText('What is analyzed?').closest('details')).toHaveAttribute('open')
    expect(container.querySelector('[data-source-logo="reddit"]')).toBeInTheDocument()
    expect(container.querySelector('[data-source-logo="youtube"]')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Start source analysis/ }))
    expect(startExternalRun).toHaveBeenCalled()
  })

  it('degrades capability failures without presenting a critical page error', async () => {
    const retryExternalCapabilities = vi.fn().mockResolvedValue(null)
    renderPage({ data: null, externalRun: null, publishedExternalRun: null, externalCapabilities: null, externalError: 'Could not load source capabilities.', retryExternalCapabilities, startExternalRun: vi.fn(), loadExternalRun: vi.fn(), setExternalError: vi.fn() })

    expect(screen.getByText('Source availability is temporarily unavailable.')).toBeInTheDocument()
    expect(screen.getAllByText('Availability pending')).toHaveLength(4)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(retryExternalCapabilities).toHaveBeenCalledTimes(1)
  })

  it('distinguishes successfully empty sources from unavailable collection', () => {
    renderPage({
      data: { url: 'https://example.com' },
      externalCapabilities: capabilities,
      externalError: null,
      publishedExternalRun: null,
      startExternalRun: vi.fn(),
      loadExternalRun: vi.fn(),
      setExternalError: vi.fn(),
      externalRun: {
        id: 'run-1', status: 'collecting', pipeline: [{ id: 'collecting', label: 'Collecting external sources', state: 'running' }],
        sourceSummaries: [
          { sourceType: 'reddit', state: 'complete_empty', counts: { found: 0, retained: 0 } },
          { sourceType: 'x', state: 'authentication_required', reason: 'Authentication required', counts: { found: 0, retained: 0 } }
        ]
      }
    })
    expect(screen.getByText('Successfully searched; no relevant items found.')).toBeInTheDocument()
    expect(screen.getByText('Authentication required')).toBeInTheDocument()
  })
})
