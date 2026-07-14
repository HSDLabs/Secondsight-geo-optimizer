import { describe, expect, it } from 'vitest'
import { buildDiscoveryExplorerModel, buildLocalGraph, classifyDiscoveryUrl, filterDiscoveryRecords } from './discoveryExplorer'
import { groupCrawlerIssues } from './issueGrouping'

const origin = 'https://example.test'

function fixture() {
  return {
    origin,
    sitemaps: {
      responseCapped: true,
      totalUrls: 10000,
      summary: { total: 10000 },
      urls: [
        { loc: `${origin}/`, source: `${origin}/sitemap.xml`, classification: 'indexable', httpStatus: 200, robotsAccess: 'allowed', verified: true },
        { loc: `${origin}/collections/shoes`, source: `${origin}/sitemap.xml`, classification: 'indexable', httpStatus: 200, robotsAccess: 'allowed', verified: true },
        { loc: `${origin}/t/air-max/HF3165-401`, source: `${origin}/sitemap.xml`, classification: 'indexable', httpStatus: 200, robotsAccess: 'allowed', verified: true },
        { loc: `${origin}/help/shipping`, source: `${origin}/sitemap.xml`, classification: 'noindex', httpStatus: 200, noindex: true, robotsAccess: 'allowed', verified: true },
        { loc: `${origin}/private`, source: `${origin}/sitemap.xml`, classification: 'blocked', robotsAccess: 'blocked' },
        { loc: `${origin}/broken`, source: `${origin}/sitemap.xml`, classification: 'error', httpStatus: 500, robotsAccess: 'allowed', verified: true }
      ]
    },
    pages: {
      totalDiscovered: 10000,
      sampleSize: 50,
      probed: [
        { url: `${origin}/`, finalUrl: `${origin}/`, status: 200 },
        { url: `${origin}/collections/shoes`, finalUrl: `${origin}/collections/shoes`, status: 200 },
        { url: `${origin}/t/air-max/HF3165-401`, finalUrl: `${origin}/products/HF3165-401`, status: 301 },
        { url: `${origin}/broken`, finalUrl: `${origin}/broken`, status: 500, error: 'Server error' }
      ],
      pageSignals: [
        { url: `${origin}/`, internalLinks: [`${origin}/collections/shoes`, `${origin}/help/shipping`] },
        { url: `${origin}/collections/shoes`, internalLinks: [`${origin}/t/air-max/HF3165-401`] },
        { url: `${origin}/t/air-max/HF3165-401`, canonical: `${origin}/products/HF3165-401`, internalLinks: [] },
        { url: `${origin}/help/shipping`, noindex: true, internalLinks: [] }
      ]
    },
    issues: [{ id: 'http-broken', type: 'http-error', severity: 'warning', affectedUrls: [`${origin}/broken`], evidence: 'HTTP 500', recommendation: 'Fix the response.' }]
  }
}

describe('Discovery Explorer view model', () => {
  it('classifies normalized URLs deterministically', () => {
    expect(classifyDiscoveryUrl(`${origin}/`, origin)).toBe('home')
    expect(classifyDiscoveryUrl(`${origin}/collections/shoes`, origin)).toBe('categories')
    expect(classifyDiscoveryUrl(`${origin}/t/air-max/HF3165-401`, origin)).toBe('products')
    expect(classifyDiscoveryUrl(`${origin}/help/shipping`, origin)).toBe('articles')
    expect(classifyDiscoveryUrl(`${origin}/about/our-very-long-story`, origin)).toBe('other')
  })

  it('builds groups, sampling, relationships, and joined evidence', () => {
    const model = buildDiscoveryExplorerModel(fixture())
    expect(model.groups.find(group => group.id === 'products')?.count).toBeGreaterThan(0)
    expect(model.sampling).toMatchObject({ returned: 6, total: 10000, responseCapped: true, sampled: true })
    expect(model.relationships).toContainEqual({ source: `${origin}/`, target: `${origin}/collections/shoes`, type: 'internal-link' })
    expect(model.records.find(record => record.url === `${origin}/broken`)?.issues).toHaveLength(1)
  })

  it('applies search and combined filters before pagination', () => {
    const model = buildDiscoveryExplorerModel(fixture())
    expect(filterDiscoveryRecords(model.records, { group: 'all' })).toHaveLength(model.records.length)
    expect(filterDiscoveryRecords(model.records, { group: 'other', filters: ['blocked', 'in-sitemap'] }).map(record => record.path)).toEqual(['/private'])
    expect(filterDiscoveryRecords(model.records, { group: 'articles', query: 'shipping', filters: ['noindex'] })).toHaveLength(1)
    expect(filterDiscoveryRecords(model.records, { group: 'other', filters: ['errors'] }).map(record => record.path)).toContain('/broken')
  })

  it('limits local relationships and withholds an uninspected graph', () => {
    const model = buildDiscoveryExplorerModel(fixture())
    const graph = buildLocalGraph(model, `${origin}/`, 1)
    expect(graph.nodes).toHaveLength(2)
    expect(graph.hiddenCount).toBe(1)
    expect(buildLocalGraph(model, `${origin}/private`).available).toBe(false)
  })
})

describe('crawler issue grouping', () => {
  it('groups equivalent findings and preserves severity and occurrences', () => {
    const { groupedIssues, issueIdToGroupId } = groupCrawlerIssues([
      { id: 'one', type: 'http-error', severity: 'info', confidence: 'medium', recommendation: 'Fix response.', affectedUrls: ['/a'], evidence: 'HTTP 404', crawlerAffected: ['Googlebot'] },
      { id: 'two', type: 'http-error', severity: 'critical', confidence: 'definite', recommendation: ' Fix   response. ', affectedUrls: ['/b'], evidence: 'HTTP 500', crawlerAffected: ['Bingbot'] }
    ])
    expect(groupedIssues).toHaveLength(1)
    expect(groupedIssues[0]).toMatchObject({ severity: 'critical', confidence: 'definite', affectedUrls: ['/a', '/b'] })
    expect(groupedIssues[0].occurrences).toHaveLength(2)
    expect(issueIdToGroupId.get('one')).toBe(groupedIssues[0].id)
    expect(issueIdToGroupId.get('two')).toBe(groupedIssues[0].id)
  })
})
