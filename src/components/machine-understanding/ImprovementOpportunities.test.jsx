import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import ImprovementOpportunities from './ImprovementOpportunities'

const issues = Array.from({ length: 12 }, (_, index) => ({
  id: `issue-${index + 1}`,
  type: `Issue ${index + 1}`,
  severity: 'warning',
  evidence: `Evidence ${index + 1}`
}))

describe('Improvement Opportunities pagination', () => {
  it('shows five issues by default and supports paging and page-size changes', async () => {
    const user = userEvent.setup()
    render(<ImprovementOpportunities issues={issues} semanticIndex={{}} />)

    expect(screen.getByText('Issue 1')).toBeInTheDocument()
    expect(screen.getByText('Issue 5')).toBeInTheDocument()
    expect(screen.queryByText('Issue 6')).not.toBeInTheDocument()
    expect(screen.getByText((_, element) => element.tagName === 'P' && element.textContent === 'Showing 1–5 of 12 opportunities')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByText('Issue 6')).toBeInTheDocument()
    expect(screen.queryByText('Issue 1')).not.toBeInTheDocument()
    expect(screen.getByText((_, element) => element.tagName === 'P' && element.textContent === 'Showing 6–10 of 12 opportunities')).toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: 'Opportunities per page' }), '20')
    expect(screen.getByText('Issue 12')).toBeInTheDocument()
    expect(screen.getByText((_, element) => element.tagName === 'P' && element.textContent === 'Showing 1–12 of 12 opportunities')).toBeInTheDocument()
  })
})
