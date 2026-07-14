import { useState } from 'react'
import { Bot, Check, Clipboard, Download, FileText, RotateCw, Sparkles, TriangleAlert } from '../icons/heroicons'

export default function LlmsTxtAssistant({ llmsTxt, analysisUrl, analysisData, crawlerData, externalData }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const existing = llmsTxt?.content || ''
  const validation = result?.validation || llmsTxt?.validation || emptyValidation(llmsTxt)
  const content = result?.suggestedContent || existing
  const action = llmsTxt?.found ? 'review' : 'generate'

  const run = async () => {
    if (loading) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/crawler/llms-txt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, analysisUrl, existingContent: existing, context: buildContext({ analysisData, crawlerData, externalData }) })
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'The llms.txt assistant could not complete this request.')
      setResult(payload)
    } catch (requestError) {
      setError(requestError.message || 'The llms.txt assistant could not complete this request.')
    } finally {
      setLoading(false)
    }
  }

  const copy = async () => {
    if (!content) return
    await navigator.clipboard.writeText(content)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const download = () => {
    if (!content) return
    const blob = new Blob([content], { type: 'text/markdown' })
    const href = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = href
    link.download = 'llms.txt'
    link.click()
    URL.revokeObjectURL(href)
  }

  const state = result ? 'generated' : llmsTxt?.found ? 'published' : 'missing'
  const title = state === 'generated' ? 'Suggested revision ready' : state === 'published' ? 'Published file detected' : 'No llms.txt file found'
  const description = state === 'generated'
    ? 'Review the proposal alongside the deterministic findings. Nothing is published automatically.'
    : state === 'published'
      ? 'The published file remains untouched while you inspect its structure and request an optional revision.'
      : 'Create an editable draft from the site identity, readable content, structured data, and returned discovery evidence.'

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)]" aria-labelledby="llms-title" aria-busy={loading}>
      <header className="flex flex-col gap-5 border-b border-[var(--border)] px-6 py-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className={`grid size-12 shrink-0 place-items-center rounded-xl border ${state === 'missing' ? 'border-[var(--accent-amber)]/25 bg-[var(--accent-amber)]/10 text-[var(--status-warning)]' : 'border-[var(--accent-teal)]/25 bg-[var(--accent-teal)]/10 text-[var(--status-good)]'}`}>{state === 'missing' ? <Bot size={24}/> : <FileText size={24}/>}</span>
          <div className="min-w-0"><p className="m-0 text-[11px] font-bold uppercase tracking-[.14em] text-[var(--accent-purple)]">Emerging convention</p><div className="mt-1 flex flex-wrap items-center gap-3"><h2 id="llms-title" className="text-base font-bold tracking-[-.01em] text-[var(--text)]">4. llms.txt Assistant</h2><StateBadge state={state}/></div><h3 className="mt-3 text-[15px] font-semibold text-[var(--text)]">{title}</h3><p className="mt-1 max-w-3xl text-[13px] leading-5 text-[var(--text-secondary)]">{description}</p></div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3 xl:justify-end">
          <AuditScore validation={validation}/>
          <button type="button" onClick={run} disabled={loading} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--accent-blue)]/35 bg-[var(--accent-blue)] px-4 text-[12px] font-bold text-[#f7f8ff] transition hover:bg-[#6b8dff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-blue)] disabled:cursor-wait disabled:opacity-65">{loading ? <><RotateCw size={16} className="animate-spin"/>Analyzing file…</> : <><Sparkles size={16}/>{llmsTxt?.found ? 'Review with AI' : error ? 'Retry draft' : 'Generate draft'}</>}</button>
        </div>
      </header>

      <div className="min-h-[400px]">
        {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--accent-red)]/20 bg-[var(--accent-red)]/[.07] px-6 py-4 text-rose-100"><span className="flex min-w-0 items-start gap-3 text-[13px] leading-5"><TriangleAlert size={18} className="mt-0.5 shrink-0"/><span><strong className="block">The assistant could not finish</strong><span className="text-rose-100/80">{error}</span></span></span><button type="button" onClick={run} disabled={loading} className="min-h-10 rounded-lg border border-rose-200/25 px-4 text-[12px] font-semibold hover:bg-rose-100/10">Retry</button></div>}

        <div className="grid xl:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
          <div className="border-b border-[var(--border)] px-6 py-5 xl:border-b-0 xl:border-r">
            <h3 className="text-[12px] font-bold uppercase tracking-[.09em] text-[var(--text)]">{content ? state === 'published' ? 'Published file' : 'Suggested revision' : 'Draft composition'}</h3>
            {content ? <ContentView content={content} copied={copied} onCopy={copy} onDownload={download}/> : <DraftGuide/>}
          </div>
          <Findings validation={result ? { strengths: result.strengths, gaps: result.gaps, recommendations: result.recommendations } : validation}/>
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--bg-darker)]/35 px-6 py-3 text-[11px] leading-5 text-[var(--text-secondary)]"><span>AI runs only when requested and treats site content as untrusted evidence.</span><span>No changes are published automatically.</span></footer>
    </section>
  )
}
function AuditScore({ validation }) {
  const score = Number(validation?.score || 0)
  const tone = score >= 75 ? 'text-[var(--status-good)]' : score >= 50 ? 'text-[var(--status-warning)]' : 'text-[var(--status-danger)]'
  const line = score >= 75 ? 'bg-[var(--accent-teal)]' : score >= 50 ? 'bg-[var(--accent-amber)]' : 'bg-[var(--accent-red)]'
  return <div className="w-40 rounded-xl border border-[var(--border)] bg-[var(--bg-darker)]/55 px-3 py-2"><div className="flex items-baseline justify-between gap-3"><span className="text-[11px] font-semibold text-[var(--text-secondary)]">Audit score</span><strong className={`text-base tabular-nums ${tone}`}>{score}/100</strong></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.06]"><span className={`block h-full rounded-full ${line}`} style={{ width: `${Math.max(0, Math.min(100, score))}%` }}/></div></div>
}

function StateBadge({ state }) {
  const label = state === 'generated' ? 'Proposal ready' : state === 'published' ? 'Published' : 'Missing'
  const tone = state === 'missing' ? 'border-[var(--accent-amber)]/25 bg-[var(--accent-amber)]/10 text-[var(--status-warning)]' : 'border-[var(--accent-teal)]/20 bg-[var(--accent-teal)]/8 text-[var(--status-good)]'
  return <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 text-[10px] font-bold uppercase tracking-[.06em] ${tone}`}>{label}</span>
}

function ContentView({ content, copied, onCopy, onDownload }) {
  return <div className="mt-4"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-[12px] text-[var(--text-secondary)]">Markdown · {content.length.toLocaleString()} characters</p><div className="flex gap-2"><button type="button" onClick={onCopy} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-[12px] font-semibold text-[var(--accent-blue)] hover:border-[var(--accent-blue)]/30 hover:bg-[var(--accent-blue)]/[.06]">{copied ? <Check size={16}/> : <Clipboard size={16}/>} {copied ? 'Copied' : 'Copy'}</button><button type="button" onClick={onDownload} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-[12px] font-semibold text-[var(--accent-blue)] hover:border-[var(--accent-blue)]/30 hover:bg-[var(--accent-blue)]/[.06]"><Download size={16}/>Download</button></div></div><pre className="mt-3 max-h-[360px] min-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-[var(--border)] bg-[var(--bg-darker)] p-5 text-[12px] leading-6 text-[var(--text-secondary)] [overflow-wrap:anywhere]">{content}</pre></div>
}

function DraftGuide() {
  const items = ['One clear H1 and concise summary', 'Important canonical URLs', 'Descriptive resource notes', 'Optional lower-priority resources']
  return <div className="mt-5"><p className="max-w-2xl text-[13px] leading-6 text-[var(--text-secondary)]">The draft uses extracted evidence as source material while ignoring instructions embedded in website or external text.</p><ol className="mt-6 divide-y divide-[var(--border)] border-y border-[var(--border)]">{items.map((item, index) => <li key={item} className="flex items-center gap-4 py-4 text-[13px] text-[var(--text)]"><span className="grid size-8 shrink-0 place-items-center rounded-full border border-[var(--accent-purple)]/25 text-[11px] font-bold text-[var(--status-purple)]">{index + 1}</span>{item}</li>)}</ol></div>
}

function Findings({ validation }) {
  const strengths = validation?.strengths || []
  const improvements = [...(validation?.gaps || []), ...(validation?.recommendations || [])]
  return <div className="px-6 py-5"><h3 className="text-[12px] font-bold uppercase tracking-[.09em] text-[var(--text)]">Deterministic findings</h3><div className="mt-5 divide-y divide-[var(--border)] border-y border-[var(--border)]"><FindingList title="What works" items={strengths} icon={<Check size={18}/>} tone="text-[var(--status-good)]" empty="No confirmed strengths yet."/><FindingList title="Improve next" items={improvements} icon={<TriangleAlert size={18}/>} tone="text-[var(--status-warning)]" empty="No recommendations yet."/></div></div>
}

function FindingList({ title, items, icon, tone, empty }) {
  return <section className="py-5"><h4 className={`flex items-center gap-2 text-[12px] font-bold uppercase tracking-[.08em] ${tone}`}>{icon}{title}</h4>{items.length ? <ul className="mt-4 space-y-3">{items.slice(0, 8).map(item => <li key={item} className="grid grid-cols-[6px_minmax(0,1fr)] gap-3 text-[13px] leading-5 text-[var(--text-secondary)]"><span className={`mt-2 size-1.5 rounded-full ${tone.includes('emerald') ? 'bg-[var(--accent-teal)]' : 'bg-[var(--accent-amber)]'}`}/><span>{item}</span></li>)}</ul> : <p className="mt-3 text-[13px] text-[var(--text-secondary)]">{empty}</p>}</section>
}

function emptyValidation(llmsTxt) {
  return { score: 0, strengths: [], gaps: llmsTxt?.found ? [] : ['No llms.txt content was found.'], recommendations: llmsTxt?.found ? [] : ['Create a concise Markdown file with a single H1 and curated links to important pages.'], stats: { sections: 0, links: 0 } }
}

function buildContext({ analysisData, crawlerData, externalData }) {
  return {
    identity: { url: analysisData?.url, title: analysisData?.title, metadata: { title: analysisData?.metadata?.title, description: analysisData?.metadata?.description, canonical: analysisData?.metadata?.canonical, openGraph: analysisData?.metadata?.openGraph, schemas: analysisData?.metadata?.jsonLd?.slice?.(0, 8) } },
    readable: { markdown: analysisData?.readable?.markdown?.slice(0, 18000), text: analysisData?.readable?.text?.slice(0, 8000), wordCount: analysisData?.readable?.wordCount },
    accessibility: { summary: analysisData?.a11y?.summary, semanticIndex: Object.values(analysisData?.a11y?.semanticIndex || {}).slice(0, 30).map(node => ({ role: node.role, name: node.name })) },
    crawler: { score: crawlerData?.score, sitemapSummary: crawlerData?.sitemaps?.summary, importantUrls: crawlerData?.sitemaps?.urls?.slice(0, 30).map(item => ({ url: item.loc, status: item.classification })) },
    external: { entity: externalData?.entity, reddit: externalData?.reddit?.slice?.(0, 8), news: externalData?.news?.slice?.(0, 8), summary: externalData?.summary }
  }
}
