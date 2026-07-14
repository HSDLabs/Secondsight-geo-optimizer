import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { OverviewEmptyState } from './OverviewSections'

describe('Overview empty state', () => {
  it('teaches the live analysis model without presenting result-like metrics', async () => {
    const onStart = vi.fn()
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <OverviewEmptyState onStart={onStart} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'No baseline yet' })).toBeInTheDocument()
    expect(screen.getAllByText('Crawl & indexability')).toHaveLength(2)
    expect(screen.getAllByText('Machine understanding')).toHaveLength(2)
    expect(screen.getAllByText('Sources & authority')).toHaveLength(2)
    expect(screen.queryByText('/ 100')).not.toBeInTheDocument()
    expect(screen.queryByText('GEO score history')).not.toBeInTheDocument()
    expect(screen.queryByText('Planned')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /run first scan/i }))
    expect(onStart).toHaveBeenCalledOnce()
  })
})
