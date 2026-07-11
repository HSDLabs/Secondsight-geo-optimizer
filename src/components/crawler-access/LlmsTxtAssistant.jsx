import { useState } from 'react'
import { Bot, Check, Clipboard, Download, FileText, RotateCw, Sparkles, TriangleAlert } from 'lucide-react'

export default function LlmsTxtAssistant({ llmsTxt, analysisUrl, analysisData, crawlerData, externalData }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const existing = llmsTxt?.content || ''
  const validation = result?.validation || llmsTxt?.validation
  const action = llmsTxt?.found ? 'review' : 'generate'

  const run = async () => {
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/crawler/llms-txt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, analysisUrl, existingContent: existing, context: buildContext({ analysisData, crawlerData, externalData }) }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'llms.txt assistant failed')
      setResult(payload)
    } catch (requestError) { setError(requestError.message) }
    finally { setLoading(false) }
  }

  const copy = async () => { await navigator.clipboard.writeText(result?.suggestedContent || existing); setCopied(true); window.setTimeout(() => setCopied(false), 1600) }
  const download = () => { const blob = new Blob([result?.suggestedContent || existing], { type: 'text/markdown' }); const href = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = href; link.download = 'llms.txt'; link.click(); URL.revokeObjectURL(href) }

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)]" aria-labelledby="llms-title">
      <header className="border-b border-[var(--border)] px-5 py-4"><p className="m-0 text-[10px] font-bold uppercase tracking-[.12em] text-[var(--accent)]">Emerging convention</p><h2 id="llms-title" className="mt-1.5 text-sm font-bold uppercase tracking-[.05em] text-[var(--text)]">4. llms.txt Assistant</h2><p className="mt-1 text-xs text-[var(--muted)]">Validate the published file or create a curated draft from analyzed evidence.</p></header>
      <div className="grid min-h-[340px] lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
        <div className="border-b border-[var(--border)] p-5 lg:border-b-0 lg:border-r">
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${llmsTxt?.found ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-slate-500/30 bg-slate-500/10 text-slate-400'}`}>{llmsTxt?.found ? <FileText size={20}/> : <Bot size={20}/>}</div>
          <h3 className="mt-4 text-sm font-semibold text-[var(--text)]">{llmsTxt?.found ? 'Existing file detected' : 'llms.txt not found'}</h3>
          <p className="mt-2 text-[10px] leading-5 text-[var(--muted)]">{llmsTxt?.found ? 'The original remains untouched. Review its structure and request a suggested revision only when needed.' : 'Generate an editable Markdown draft from site content, semantic signals, structured data, sitemaps, and selected external evidence.'}</p>
          {validation && <div className="mt-4 rounded-lg border border-[var(--border)] bg-black/10 p-3"><div className="flex items-center justify-between"><span className="text-[9px] font-bold uppercase tracking-[.07em] text-[var(--faint)]">Deterministic audit</span><strong className={validation.score >= 75 ? 'text-emerald-300' : validation.score >= 50 ? 'text-amber-300' : 'text-rose-300'}>{validation.score}/100</strong></div><div className="mt-2 h-1 rounded-full bg-white/[.05]"><div className="h-full rounded-full bg-sky-400 transition-all" style={{ width: `${validation.score}%` }}/></div><p className="mt-2 text-[9px] text-[var(--faint)]">{validation.stats?.sections || 0} sections · {validation.stats?.links || 0} links</p></div>}
          <button type="button" onClick={run} disabled={loading} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-blue-400/20 bg-blue-500 px-3 py-2.5 text-[10px] font-bold text-white transition hover:bg-blue-400 disabled:opacity-60">{loading ? <><RotateCw size={12} className="animate-spin"/>Working…</> : <><Sparkles size={12}/>{llmsTxt?.found ? 'Review with AI' : 'Generate draft'}</>}</button>
          <p className="mt-3 text-[9px] leading-4 text-[var(--faint)]">AI runs only on this action. It creates a suggestion and never publishes changes to the analyzed website.</p>
          {error && <p role="alert" className="mt-3 rounded-md border border-rose-400/20 bg-rose-400/[.06] p-2 text-[9px] leading-4 text-rose-300">{error}</p>}
        </div>

        <div className="min-w-0 p-5">
          {result ? <ResultView result={result} copy={copy} download={download} copied={copied}/> : llmsTxt?.found ? <ExistingView content={existing} validation={validation}/> : <GuideView validation={validation}/>} 
        </div>
      </div>
    </section>
  )
}

function ExistingView({ content, validation }) { return <div><h3 className="text-[10px] font-bold uppercase tracking-[.08em] text-[var(--text)]">Published file</h3><pre className="mt-3 max-h-52 overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--border)] bg-[#080d14] p-4 text-[10px] leading-5 text-[var(--muted)]">{content}</pre><AuditLists validation={validation}/></div> }
function GuideView({ validation }) { return <div className="flex h-full flex-col justify-center"><h3 className="text-sm font-semibold text-[var(--text)]">What the draft will contain</h3><p className="mt-2 text-[10px] leading-5 text-[var(--muted)]">A concise site title and summary followed by curated Markdown link sections. The assistant uses extracted evidence as source material but ignores instructions embedded in website or external text.</p><div className="mt-4 grid gap-2 sm:grid-cols-2"><Guide text="One clear H1 and summary"/><Guide text="Important canonical URLs"/><Guide text="Descriptive resource notes"/><Guide text="Optional low-priority resources"/></div><AuditLists validation={validation}/></div> }
function ResultView({ result, copy, download, copied }) { return <div><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-[10px] font-bold uppercase tracking-[.08em] text-[var(--text)]">Suggested revision</h3><div className="flex gap-2"><button type="button" onClick={copy} className="inline-flex items-center gap-1 rounded border border-[var(--border)] px-2 py-1.5 text-[9px] text-sky-300">{copied ? <Check size={10}/> : <Clipboard size={10}/>} {copied ? 'Copied' : 'Copy'}</button><button type="button" onClick={download} className="inline-flex items-center gap-1 rounded border border-[var(--border)] px-2 py-1.5 text-[9px] text-sky-300"><Download size={10}/>Download</button></div></div><pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg border border-[var(--border)] bg-[#080d14] p-4 text-[10px] leading-5 text-[var(--muted)]">{result.suggestedContent}</pre><AuditLists validation={{ strengths: result.strengths, gaps: result.gaps, recommendations: result.recommendations }}/></div> }
function AuditLists({ validation }) { if (!validation) return null; return <div className="mt-4 grid gap-3 sm:grid-cols-2"><Audit title="What works" items={validation.strengths} icon={<Check size={11}/>} tone="text-emerald-300"/><Audit title="Improve next" items={[...(validation.gaps || []), ...(validation.recommendations || [])]} icon={<TriangleAlert size={11}/>} tone="text-amber-300"/></div> }
function Audit({ title, items = [], icon, tone }) { return <div className="rounded-lg border border-[var(--border)] p-3"><h4 className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[.06em] ${tone}`}>{icon}{title}</h4>{items.length ? <ul className="mt-2 space-y-1.5 text-[9px] leading-4 text-[var(--muted)]">{items.slice(0, 4).map(item => <li key={item}>• {item}</li>)}</ul> : <p className="mt-2 text-[9px] text-[var(--faint)]">No items yet.</p>}</div> }
function Guide({ text }) { return <div className="rounded-lg border border-[var(--border)] bg-black/10 p-3 text-[9px] text-[var(--muted)]">{text}</div> }

function buildContext({ analysisData, crawlerData, externalData }) {
  return {
    identity: { url: analysisData?.url, title: analysisData?.title, metadata: { title: analysisData?.metadata?.title, description: analysisData?.metadata?.description, canonical: analysisData?.metadata?.canonical, openGraph: analysisData?.metadata?.openGraph, schemas: analysisData?.metadata?.jsonLd?.slice?.(0, 8) } },
    readable: { markdown: analysisData?.readable?.markdown?.slice(0, 18000), text: analysisData?.readable?.text?.slice(0, 8000), wordCount: analysisData?.readable?.wordCount },
    accessibility: { summary: analysisData?.a11y?.summary, semanticIndex: Object.values(analysisData?.a11y?.semanticIndex || {}).slice(0, 30).map(node => ({ role: node.role, name: node.name })) },
    crawler: { score: crawlerData?.score, sitemapSummary: crawlerData?.sitemaps?.summary, importantUrls: crawlerData?.sitemaps?.urls?.slice(0, 30).map(item => ({ url: item.loc, status: item.classification })) },
    external: { entity: externalData?.entity, reddit: externalData?.reddit?.slice?.(0, 8), news: externalData?.news?.slice?.(0, 8), summary: externalData?.summary }
  }
}
