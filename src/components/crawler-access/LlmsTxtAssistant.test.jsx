import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LlmsTxtAssistant from './LlmsTxtAssistant'

const validation = { score: 68, strengths: ['Clear title'], gaps: ['Missing summary'], recommendations: ['Add curated links'], stats: { sections: 2, links: 3 } }

beforeEach(() => {
  vi.restoreAllMocks()
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } })
  URL.createObjectURL = vi.fn(() => 'blob:llms')
  URL.revokeObjectURL = vi.fn()
  HTMLAnchorElement.prototype.click = vi.fn()
})

describe('llms.txt Assistant', () => {
  it('renders stable missing and published states', () => {
    const { rerender } = render(<LlmsTxtAssistant llmsTxt={{ found: false, validation }} analysisUrl="https://example.test" />)
    expect(screen.getByText('No llms.txt file found')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Generate draft' })).toBeInTheDocument()
    rerender(<LlmsTxtAssistant llmsTxt={{ found: true, content: '# Example\n\n## Pages', validation }} analysisUrl="https://example.test" />)
    expect(screen.getByText('Published file detected')).toBeInTheDocument()
    expect(screen.getByText(/# Example/)).toBeInTheDocument()
  })

  it('shows a recoverable API error and retries', async () => {
    const user = userEvent.setup()
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Service unavailable' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ suggestedContent: '# Recovered', strengths: [], gaps: [], recommendations: [] }) })
    render(<LlmsTxtAssistant llmsTxt={{ found: false, validation }} analysisUrl="https://example.test" />)
    await user.click(screen.getByRole('button', { name: 'Generate draft' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Service unavailable')
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('# Recovered')).toBeInTheDocument()
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
  })

  it('keeps the workspace stable while a draft is loading', async () => {
    const user = userEvent.setup()
    let resolveRequest
    globalThis.fetch = vi.fn(() => new Promise(resolve => { resolveRequest = resolve }))
    render(<LlmsTxtAssistant llmsTxt={{ found: false, validation }} analysisUrl="https://example.test" />)
    await user.click(screen.getByRole('button', { name: 'Generate draft' }))
    expect(screen.getByRole('button', { name: 'Analyzing file…' })).toBeDisabled()
    expect(screen.getByRole('region', { name: '4. llms.txt Assistant' })).toHaveAttribute('aria-busy', 'true')
    resolveRequest({ ok: true, json: async () => ({ suggestedContent: '# Ready', strengths: [], gaps: [], recommendations: [] }) })
    expect(await screen.findByText('# Ready')).toBeInTheDocument()
  })

  it('supports long generated content, copy, and download', async () => {
    const user = userEvent.setup()
    const clipboardWrite = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined)
    const content = `# Example\n\n${'Long resource description. '.repeat(300)}`
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ suggestedContent: content, strengths: ['Clear title'], gaps: [], recommendations: [] }) })
    render(<LlmsTxtAssistant llmsTxt={{ found: false, validation }} analysisUrl="https://example.test" />)
    await user.click(screen.getByRole('button', { name: 'Generate draft' }))
    expect(await screen.findByText((_, element) => element.tagName === 'PRE' && element.textContent === content)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Copy' }))
    await waitFor(() => expect(clipboardWrite).toHaveBeenCalledWith(content))
    await user.click(screen.getByRole('button', { name: 'Download' }))
    expect(URL.createObjectURL).toHaveBeenCalled()
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled()
  })
})
