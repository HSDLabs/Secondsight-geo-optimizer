import { chromium } from 'playwright'

const NAVIGATION_TIMEOUT = 45000
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

async function gotoPage(page, url) {
  try {
    return await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT })
  } catch (err) {
    if (!String(err.message).includes('ERR_CONNECTION_TIMED_OUT')) throw err

    return page.goto(url, { waitUntil: 'load', timeout: NAVIGATION_TIMEOUT })
  }
}

export async function renderPage(url) {
  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    userAgent: USER_AGENT
  })
  await gotoPage(page, url)
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(700)
  const html = await page.content()
  const viewport = page.viewportSize()
  const screenshot = (await page.screenshot({ type: 'png' })).toString('base64')
  const fullPageScreenshot = (await page.screenshot({ type: 'png', fullPage: true })).toString('base64')
  const pageMetrics = await page.evaluate(() => ({
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    document: {
      width: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0),
      height: Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0)
    }
  }))
  const title = await page.title()

  return {
    page,
    browser,
    html,
    screenshot,
    screenshots: {
      viewport: screenshot,
      fullPage: fullPageScreenshot
    },
    screenshotMeta: {
      viewport: pageMetrics.viewport || viewport,
      fullPage: pageMetrics.document
    },
    title
  }
}

export async function renderInspectionPage(url) {
  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    userAgent: USER_AGENT
  })

  try {
    const response = await gotoPage(page, url)
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {})
    const html = await page.content()
    const bodyText = await page.locator('body').innerText().catch(() => '')
    const redirects = []
    let request = response?.request()
    while (request?.redirectedFrom()) {
      const previous = request.redirectedFrom()
      redirects.unshift({ from: previous.url(), to: request.url() })
      request = previous
    }

    return {
      html,
      bodyText,
      status: response?.status() || 0,
      finalUrl: page.url(),
      redirects,
      headers: response ? await response.allHeaders() : {},
      error: null
    }
  } catch (error) {
    return { html: '', bodyText: '', status: 0, finalUrl: url, redirects: [], headers: {}, error: error.message }
  } finally {
    await browser.close()
  }
}
