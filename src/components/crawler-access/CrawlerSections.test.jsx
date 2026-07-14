import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RobotsViewer from './RobotsViewer'
import SitemapExplorer from './SitemapExplorer'
import DiscoveryExplorer from './DiscoveryExplorer'

describe('crawler analysis sections', () => {
  it('offers a local robots.txt starter when the file is missing', async () => {
    const user = userEvent.setup()
    render(<RobotsViewer robots={{ found: false, status: 404 }} origin="https://example.test" sitemaps={{ discovered: [{ ok: true, url: 'https://example.test/sitemap.xml' }] }} />)

    await user.click(screen.getByRole('button', { name: 'Create starter draft' }))

    expect(screen.getByText('Starter robots.txt')).toBeInTheDocument()
    expect(screen.getByText(/Sitemap: https:\/\/example\.test\/sitemap\.xml/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument()
  })

  it('paginates sitemap rows instead of placing them in a scroll box', async () => {
    const user = userEvent.setup()
    const urls = Array.from({ length: 12 }, (_, index) => ({
      loc: `https://example.test/page-${index + 1}`,
      source: 'https://example.test/sitemap.xml',
      classification: 'indexable',
      robotsAccess: 'allowed',
      httpStatus: 200,
      verified: true
    }))
    render(<SitemapExplorer sitemaps={{ discovered: [{ ok: true, url: 'https://example.test/sitemap.xml', urlCount: 12 }], urls, summary: { total: 12, indexable: 12, noindex: 0, blocked: 0, inspected: 12, inspectedPercentage: 100, unverified: 0 } }} />)

    expect(screen.getByText('/page-1')).toBeInTheDocument()
    expect(screen.queryByText('/page-11')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('/page-11')).toBeInTheDocument()
    expect(screen.getByText('2 / 2')).toBeInTheDocument()
  })

  it('selects the first discovery result and explains its evidence automatically', () => {
    render(<DiscoveryExplorer crawlerData={{
      origin: 'https://example.test',
      sitemaps: { summary: { total: 1 }, urls: [{ loc: 'https://example.test/', source: 'https://example.test/sitemap.xml', classification: 'indexable', robotsAccess: 'allowed', httpStatus: 200, verified: true }] },
      pages: { totalDiscovered: 1, sampleSize: 1, probed: [{ url: 'https://example.test/', finalUrl: 'https://example.test/', status: 200 }], pageSignals: [{ url: 'https://example.test/', internalLinks: [] }] },
      issues: []
    }} />)

    expect(screen.getByText('Strong discovery evidence')).toBeInTheDocument()
    expect(screen.getByText('Why crawlers can—or cannot—find it')).toBeInTheDocument()
    expect(screen.getByText('Recommended next step')).toBeInTheDocument()
  })
})
