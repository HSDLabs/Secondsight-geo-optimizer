import { describe, expect, it } from 'vitest'
import { navItems } from './navigation'

describe('canonical product navigation', () => {
  it('uses renamed canonical routes and retains compatibility redirects as metadata', () => {
    const sources = navItems.find(item => item.label === 'Sources & Authority')
    const crawl = navItems.find(item => item.label === 'Crawl & Indexability')
    expect(sources.path).toBe('/sources-authority')
    expect(sources.legacyPaths).toContain('/content-intelligence')
    expect(crawl.path).toBe('/crawl-indexability')
    expect(crawl.legacyPaths).toContain('/crawler-access')
    expect(crawl.featureKey).toBe('crawler')
    expect(sources.featureKey).toBe('sources')
    const visibility = navItems.find(item => item.path === '/ai-visibility')
    expect(visibility.element).toBeTruthy()
    expect(visibility.legacyPaths).toContain('/aiVisibility')
    expect(visibility.featureKey).toBe('aiVisibility')
    expect(crawl.futureGroup).toBe('Site Readiness')
  })
})
