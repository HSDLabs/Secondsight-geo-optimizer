export function waitForCrawlerContext(crawlerResultPromise, timeoutMs = 7000) {
  return Promise.race([
    crawlerResultPromise,
    new Promise(resolve => setTimeout(() => resolve({ ok: false, timedOut: true, data: null }), timeoutMs))
  ])
}
