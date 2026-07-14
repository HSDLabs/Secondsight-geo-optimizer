import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import CrawlerAccess from './CrawlerAccess'
import CrawlerPermissions from './CrawlerPermissions'
import PolicyGuidanceFiles from './PolicyGuidanceFiles'
import SitemapDiscovery from './SitemapDiscovery'
import CrawlerIssues from './CrawlerIssues'
import { CRAWLER_CATALOG, normalizeCoverage, presentMatchedRule } from './utils/crawlerUtils'

const origin = 'https://example.test'

beforeEach(() => {
  vi.restoreAllMocks()
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } })
  URL.createObjectURL = vi.fn(() => 'blob:draft')
  URL.revokeObjectURL = vi.fn()
  HTMLAnchorElement.prototype.click = vi.fn()
})

describe('Crawl & Indexability redesign', () => {
  it('normalizes backend coverage and presents each rule state explicitly', () => {
    expect(normalizeCoverage('none')).toBe('blocked')
    expect(presentMatchedRule({ ruleSource: 'missing' })).toEqual({ state: 'implicit_allow_missing', title: 'Implicit allow', reason: 'robots.txt not found' })
    expect(presentMatchedRule({ ruleSource: 'default' }).title).toBe('Allowed by default')
    expect(presentMatchedRule({ matchedRule: { type: 'allow', path: '/', line: 4 } }).reason).toBe('robots.txt line 4')
    expect(presentMatchedRule({ matchedRule: { type: 'disallow', path: '/private/', line: 8 } }).title).toBe('Disallow: /private/')
  })

  it('commits URL inspections on blur, caches them, and switches bots without another request', async () => {
    const user = userEvent.setup()
    const initial = inspection(`${origin}/`)
    const next = inspection(`${origin}/next`)
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => next })
    render(<CrawlerPermissions initialInspection={initial} origin={origin} />)

    const input = screen.getByLabelText('URL')
    await user.clear(input)
    await user.type(input, '/next')
    await user.tab()
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1))
    expect(screen.getByText(/OAI-SearchBot may request this URL/)).toBeInTheDocument()

    await user.click(input)
    await user.tab()
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    await user.selectOptions(screen.getByLabelText('Bot'), CRAWLER_CATALOG[1].id)
    expect(screen.getByText(/GPTBot may request this URL/)).toBeInTheDocument()
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('uses one tabbed drawer for both local file drafts and removes the llms score treatment', async () => {
    const user = userEvent.setup()
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ suggestedContent: '# Example\n\n## Pages', strengths: ['Clear title'], gaps: [], recommendations: [] }) })
    render(<PolicyGuidanceFiles robots={{ found: false, parsed: {} }} sitemaps={{ discovered: [] }} origin={origin} llmsTxt={{ found: false }} analysisUrl={origin} />)

    expect(screen.queryByText(/Audit score/i)).not.toBeInTheDocument()
    expect(screen.getByText('Optional enhancement')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Create robots.txt draft' }))
    expect(screen.getByRole('dialog', { name: 'Policy & Guidance Files' })).toBeInTheDocument()
    expect(screen.getByText(/never publishes changes automatically/)).toBeInTheDocument()
    expect(screen.getByText(/User-agent: \*/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close drawer' }))

    await user.click(screen.getByRole('button', { name: 'Generate llms.txt draft' }))
    expect(await screen.findByText(/# Example/)).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'llms.txt' })).toHaveAttribute('aria-selected', 'true')
  })

  it('merges discovery data into one filtered inventory and hides empty type chips', async () => {
    const user = userEvent.setup()
    render(<SitemapDiscovery crawlerData={discoveryData()} />)

    expect(screen.getByRole('heading', { name: 'Sitemap & Discovery' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Products' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /More filters/ })).toBeInTheDocument()
    await user.type(screen.getByPlaceholderText('Search path or full URL'), 'gallery')
    expect(screen.getByText('/gallery.html')).toBeInTheDocument()
    expect(screen.queryByText('/', { selector: 'button' })).not.toBeInTheDocument()
  })

  it('renders llms.txt as an opportunity while preserving the re-test action', async () => {
    const user = userEvent.setup()
    const onRetest = vi.fn().mockResolvedValue(undefined)
    render(<CrawlerIssues sortedIssues={[{ id: 'llms-txt-missing', type: 'llms-txt-missing', severity: 'info', evidence: 'Not found', recommendation: 'Create a draft.', affectedUrls: [`${origin}/llms.txt`] }]} expandedIssues={{}} setExpandedIssues={vi.fn()} onRetest={onRetest} />)
    expect(screen.getAllByText('Opportunity').length).toBeGreaterThan(0)
    await user.click(screen.getAllByRole('button', { name: 'Re-test' })[0])
    expect(onRetest).toHaveBeenCalledTimes(1)
  })

  it('shows only the consolidated section headings on an analyzed page', () => {
    const crawlerData = { ...discoveryData(), score: 95, analyzedAt: 'now', robots: { found: false, status: 404, aiCrawlerPermissions: {}, parsed: {} }, llmsTxt: { found: false }, urlInspection: inspection(`${origin}/`), issues: [] }
    render(<MemoryRouter initialEntries={['/crawl-indexability']}><Routes><Route element={<Outlet context={{ loading: false, error: null, crawlerData, data: null, externalData: null, reanalyze: vi.fn() }} />}><Route path="/crawl-indexability" element={<CrawlerAccess />} /></Route></Routes></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Crawler Permissions' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Policy & Guidance Files' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sitemap & Discovery' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Issues & Actions' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Robots.txt Analyzer|llms.txt Assistant|Discovery Explorer|Sitemap Explorer/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/^\d+\./)).not.toBeInTheDocument()
  })
})

function inspection(url) {
  return {
    url,
    shared: { httpStatus: 200, inSitemap: true, canonical: url, noindex: false, renderedTextAvailable: true, renderedWordCount: 80 },
    bots: Object.fromEntries(CRAWLER_CATALOG.map(crawler => [crawler.id, { access: 'allowed', coverage: 'full', ruleSource: 'missing', matchedRule: null, issueIds: [] }])),
    issues: []
  }
}

function discoveryData() {
  return {
    origin,
    url: `${origin}/`,
    sitemaps: {
      discovered: [{ ok: true, url: `${origin}/sitemap.xml` }],
      summary: { total: 2 },
      urls: [
        { loc: `${origin}/`, source: `${origin}/sitemap.xml`, classification: 'indexable', robotsAccess: 'allowed', httpStatus: 200, verified: true },
        { loc: `${origin}/gallery.html`, source: `${origin}/sitemap.xml`, classification: 'indexable', robotsAccess: 'allowed', httpStatus: 200, verified: true }
      ]
    },
    pages: {
      totalDiscovered: 2,
      sampleSize: 2,
      probed: [{ url: `${origin}/`, finalUrl: `${origin}/`, status: 200 }, { url: `${origin}/gallery.html`, finalUrl: `${origin}/gallery.html`, status: 200 }],
      pageSignals: [{ url: `${origin}/`, canonical: `${origin}/`, internalLinks: [`${origin}/gallery.html`] }, { url: `${origin}/gallery.html`, canonical: null, internalLinks: [] }]
    },
    issues: []
  }
}
