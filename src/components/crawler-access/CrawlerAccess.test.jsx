import { render, screen } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import CrawlerAccess from './CrawlerAccess'

function renderPage(context) {
  return render(
    <MemoryRouter initialEntries={['/crawl-indexability']}>
      <Routes>
        <Route element={<Outlet context={context} />}>
          <Route path="/crawl-indexability" element={<CrawlerAccess />} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('Crawl & Indexability empty state', () => {
  it('shows an intentional crawler evidence workspace before analysis', () => {
    renderPage({
      loading: false,
      error: null,
      crawlerData: null,
      data: null,
      externalData: null,
      reanalyze: vi.fn()
    })

    expect(screen.getByRole('heading', { name: 'Crawl & Indexability' })).toBeInTheDocument()
    expect(screen.getByText('Not analyzed')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Crawler evidence workspace' })).toBeInTheDocument()
    expect(screen.getAllByText('Available after analysis')).toHaveLength(4)
    expect(screen.getByText('Crawler permissions')).toBeInTheDocument()
    expect(screen.getByText('Robots.txt policy')).toBeInTheDocument()
    expect(screen.getByText('Sitemap inventory')).toBeInTheDocument()
    expect(screen.getByText('Discovery paths')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '1. Crawler Permissions' })).not.toBeInTheDocument()
  })

  it('uses honest progress language while the first analysis is running', () => {
    renderPage({
      loading: true,
      error: null,
      crawlerData: null,
      data: null,
      externalData: null,
      reanalyze: vi.fn()
    })

    expect(screen.getByRole('heading', { name: 'Preparing crawler evidence' })).toBeInTheDocument()
    expect(screen.getAllByText('Checking evidence')).toHaveLength(4)
    expect(screen.getByText('Checking access')).toBeInTheDocument()
  })
})
