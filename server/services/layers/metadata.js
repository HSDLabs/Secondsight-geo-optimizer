import { JSDOM } from 'jsdom'

export function extractMetadata(html, url) {
  const document = new JSDOM(html, { url }).window.document
  const metaContent = selector => document.querySelector(selector)?.getAttribute('content')?.trim() || ''
  const collectProperties = prefix => Object.fromEntries(
    [...document.querySelectorAll(`meta[property^="${prefix}"], meta[name^="${prefix}"]`)]
      .map(element => [
        element.getAttribute('property') || element.getAttribute('name'),
        element.getAttribute('content')?.trim() || ''
      ])
      .filter(([, value]) => value)
  )

  const schemas = [...document.querySelectorAll('script[type="application/ld+json"]')]
    .map((element, index) => {
      const raw = element.textContent?.trim() || ''
      try {
        return { index, valid: true, value: JSON.parse(raw) }
      } catch {
        return { index, valid: false, raw }
      }
    })

  return {
    title: document.title?.trim() || '',
    description: metaContent('meta[name="description"]'),
    canonical: document.querySelector('link[rel="canonical"]')?.href || '',
    openGraph: collectProperties('og:'),
    twitterCards: collectProperties('twitter:'),
    schemas
  }
}
