import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import AppLayout from './AppLayout'

describe('AppLayout route navigation', () => {
  it('resets the report scroll container on pathname changes', async () => {
    const scrollTo = vi.fn()
    HTMLElement.prototype.scrollTo = scrollTo
    const user = userEvent.setup()
    render(<MemoryRouter initialEntries={['/']}><Routes><Route path="/" element={<AppLayout url="" setUrl={() => {}} analyze={() => {}} loading={false} outletContext={{}}/>}><Route index element={<div>Overview content</div>}/><Route path="crawler-access" element={<div>Crawler content</div>}/></Route></Routes></MemoryRouter>)
    scrollTo.mockClear()
    await user.click(screen.getByRole('link', { name: 'Crawler Access' }))
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' })
  })
})

