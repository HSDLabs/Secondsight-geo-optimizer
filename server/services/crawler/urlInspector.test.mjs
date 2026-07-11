import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { analyzeStandaloneInspection } from './urlInspector.js'

test('builds one shared page inspection and a precomputed bot matrix', async t => {
  let origin = ''
  const server = http.createServer((request, response) => {
    if (request.url === '/robots.txt') {
      response.setHeader('content-type', 'text/plain')
      response.end(`User-agent: GPTBot\nDisallow: /private\n\nUser-agent: OAI-SearchBot\nAllow: /\n\nSitemap: ${origin}/sitemap.xml`)
      return
    }
    if (request.url === '/sitemap.xml') {
      response.setHeader('content-type', 'application/xml')
      response.end(`<?xml version="1.0"?><urlset><url><loc>${origin}/private</loc></url></urlset>`)
      return
    }
    if (request.url === '/private') {
      response.writeHead(302, { location: '/private-final' })
      response.end()
      return
    }
    if (request.url === '/private-final') {
      response.setHeader('content-type', 'text/html')
      response.end('<html><head><link rel="canonical" href="/canonical"><meta name="robots" content="noindex"></head><body>Rendered crawler inspection content.</body></html>')
      return
    }
    response.writeHead(404)
    response.end('Not found')
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => server.close())
  origin = `http://127.0.0.1:${server.address().port}`

  const result = await analyzeStandaloneInspection({ url: `${origin}/private`, expectedOrigin: origin })
  assert.equal(result.mode, 'policy')
  assert.equal(Object.keys(result.bots).length, 10)
  assert.equal(result.bots.gptbot.access, 'blocked')
  assert.equal(result.bots['oai-searchbot'].access, 'allowed')
  assert.equal(result.shared.httpStatus, 200)
  assert.equal(result.shared.redirects.length, 1)
  assert.equal(result.shared.canonical, `${origin}/canonical`)
  assert.equal(result.shared.noindex, true)
  assert.equal(result.shared.inSitemap, true)
  assert.equal(result.shared.renderedTextAvailable, true)
  assert.ok(result.shared.renderedWordCount >= 4)
  assert.ok(result.issues.some(issue => issue.type === 'ai-crawler-partial'))
  assert.ok(result.issues.some(issue => issue.type === 'noindex-detected'))
})

test('rejects a URL outside the analyzed origin before inspection', async () => {
  await assert.rejects(
    analyzeStandaloneInspection({ url: 'https://different.example/page', expectedOrigin: 'https://example.com' }),
    /analyzed site origin/
  )
})
