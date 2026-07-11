import { Readability } from '@mozilla/readability'
import { JSDOM } from 'jsdom'
import TurndownService from 'turndown'

export function extractReadable(html, url) {
  const dom = new JSDOM(html, { url })
  const article = new Readability(dom.window.document).parse()
  const content = article?.content || ''
  const contentDom = new JSDOM(`<main>${content}</main>`)
  const root = contentDom.window.document.querySelector('main')
  const markdown = content ? new TurndownService().turndown(content) : ''
  const textContent = article?.textContent?.replace(/\s+/g, ' ').trim() || ''
  const wordCount = textContent.split(/\s+/).filter(Boolean).length

  return {
    title: article?.title || '',
    excerpt: article?.excerpt || '',
    html: content,
    textContent,
    markdown,
    wordCount,
    readingTimeMinutes: wordCount ? Math.max(1, Math.ceil(wordCount / 200)) : 0,
    paragraphs: root?.querySelectorAll('p').length || 0,
    headings: root?.querySelectorAll('h1, h2, h3, h4, h5, h6').length || 0,
    lists: root?.querySelectorAll('ul, ol').length || 0,
    tables: root?.querySelectorAll('table').length || 0
  }
}
