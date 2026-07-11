import assert from 'node:assert/strict'
import { extractMetadata } from './metadata.js'
import { extractReadable } from './readability.js'

const html = `
  <html>
    <head>
      <title>Test</title>
      <meta name="description" content="Description">
      <meta property="og:title" content="Open Graph title">
      <link rel="canonical" href="/page">
      <script type="application/ld+json">{"@type":"Article"}</script>
    </head>
    <body>
      <main>
        <h1>Title</h1>
        <p>This is readable sample content with enough words for extraction and verification.</p>
        <p>Second paragraph.</p>
      </main>
    </body>
  </html>
`

const metadata = extractMetadata(html, 'https://example.com')
const readable = extractReadable(html, 'https://example.com')

assert.equal(metadata.title, 'Test')
assert.equal(metadata.description, 'Description')
assert.equal(metadata.canonical, 'https://example.com/page')
assert.equal(metadata.openGraph['og:title'], 'Open Graph title')
assert.equal(metadata.schemas.length, 1)
assert.equal(metadata.schemas[0].valid, true)
assert.ok(readable.html)
assert.ok(readable.textContent)
assert.ok(readable.wordCount > 0)
assert.equal(readable.paragraphs, 2)
assert.equal(typeof readable.headings, 'number')

console.log('Layer extractor smoke test passed.')
