import { useCallback, useMemo, useState } from 'react'
import { FileCode2, FileText } from '../icons/heroicons'
import FileDraftDrawer from './FileDraftDrawer'

export default function PolicyGuidanceFiles({ robots, sitemaps, origin, llmsTxt, analysisUrl, analysisData, crawlerData, externalData }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('robots.txt')
  const [llmsResult, setLlmsResult] = useState(null)
  const [llmsLoading, setLlmsLoading] = useState(false)
  const [llmsError, setLlmsError] = useState('')
  const robotsDraft = useMemo(() => buildStarterRobots(origin, sitemaps), [origin, sitemaps])
  const llmsContent = llmsResult?.suggestedContent || llmsTxt?.content || ''
  const llmsValidation = llmsResult ? { strengths: llmsResult.strengths, gaps: llmsResult.gaps, recommendations: llmsResult.recommendations } : llmsTxt?.validation

  const runLlms = useCallback(async () => {
    if (llmsLoading) return
    setLlmsLoading(true)
    setLlmsError('')
    try {
      const response = await fetch('/api/crawler/llms-txt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: llmsTxt?.found ? 'review' : 'generate', analysisUrl, existingContent: llmsTxt?.content || '', context: buildContext({ analysisData, crawlerData, externalData }) })
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'The llms.txt assistant could not complete this request.')
      setLlmsResult(payload)
    } catch (error) {
      setLlmsError(error.message || 'The llms.txt assistant could not complete this request.')
    } finally {
      setLlmsLoading(false)
    }
  }, [analysisData, analysisUrl, crawlerData, externalData, llmsLoading, llmsTxt])

  const open = (tab, generate = false) => {
    setActiveTab(tab)
    setDrawerOpen(true)
    if (tab === 'llms.txt' && generate) runLlms()
  }

  const regenerate = tab => {
    if (tab === 'llms.txt') runLlms()
  }

  const robotsMissing = !robots?.found
  const drafts = {
    'robots.txt': {
      content: robotsDraft,
      loading: false,
      error: '',
      strengths: [(sitemaps?.discovered || []).some(item => item.ok) ? 'Verified sitemap references are included.' : 'The draft keeps default public access explicit.'],
      improvements: ['Review private, account, checkout, and search-result paths before publishing.'],
      messages: ['Allow public content unless there is a deliberate policy reason to restrict it.', 'Only verified sitemap URLs are included.']
    },
    'llms.txt': {
      content: llmsContent,
      loading: llmsLoading,
      error: llmsError,
      strengths: llmsValidation?.strengths || [],
      improvements: [...(llmsValidation?.gaps || []), ...(llmsValidation?.recommendations || [])],
      messages: llmsTxt?.found ? ['The published file remains untouched while this local revision is reviewed.'] : ['llms.txt is optional and does not control crawler access.', 'Include one clear H1, a concise summary, and curated canonical links.']
    }
  }

  return <section className="mt-4 min-w-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)]" aria-labelledby="policy-guidance-title">
    <header className="border-b border-[var(--border)] px-4 py-3.5"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[var(--accent-blue)]">Site files</p><h2 id="policy-guidance-title" className="mt-1 text-base font-bold text-[var(--text)]">Policy &amp; Guidance Files</h2><p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)]">Review the files that control crawler access and provide optional machine-readable site guidance.</p></header>
    <div className="grid gap-3 p-3 md:grid-cols-2">
      <FileCard icon={<FileCode2 size={18} />} title="robots.txt" status={robotsMissing ? 'Missing' : 'Found'} statusTone={robotsMissing ? 'warning' : 'good'} description={robotsMissing ? 'No robots.txt file was found. Crawlers normally receive default permission, but an explicit file makes site policy easier to audit and can reference verified sitemaps.' : 'A robots.txt policy was found. Review its access rules and verified sitemap references before drafting changes.'} facts={[["Current result", robotsMissing ? 'Implicit allow' : 'Published policy'], ['Crawler impact', robotsMissing ? 'No crawler blocked' : 'Rules evaluated'], ['Sitemap references', robots?.parsed?.sitemapReferences?.length || 'None']]} primary="Create robots.txt draft" secondary="View recommended policy" onPrimary={() => open('robots.txt')} onSecondary={() => open('robots.txt')} />
      <FileCard icon={<FileText size={18} />} title="llms.txt" status={llmsTxt?.found ? 'Found' : 'Not detected'} statusTone="neutral" optional description={llmsTxt?.found ? 'A published llms.txt file was detected. It remains optional guidance and does not control crawler access.' : 'No llms.txt file was found. This file is optional and does not control crawler access, but it may provide a concise, machine-readable summary and curated links.'} facts={[["Current result", llmsTxt?.found ? 'Detected' : 'Not detected'], ['Crawler impact', 'None'], ['Discovery role', 'Optional']]} primary="Generate llms.txt draft" secondary="Learn what it includes" onPrimary={() => open('llms.txt', true)} onSecondary={() => open('llms.txt')} />
    </div>
    <FileDraftDrawer open={drawerOpen} activeTab={activeTab} onTabChange={setActiveTab} onClose={() => setDrawerOpen(false)} drafts={drafts} onRegenerate={regenerate} />
  </section>
}

function FileCard({ icon, title, status, statusTone, optional, description, facts, primary, secondary, onPrimary, onSecondary }) {
  const tone = statusTone === 'good' ? 'border-[var(--accent-teal)]/20 bg-[var(--accent-teal)]/10 text-[var(--status-good)]' : statusTone === 'warning' ? 'border-[var(--accent-red)]/18 bg-[var(--accent-red)]/[.07] text-[var(--status-danger)]' : 'border-[var(--border-strong)] bg-[var(--panel-raised)] text-[var(--text-secondary)]'
  return <article className="flex min-h-64 flex-col rounded-xl border border-[var(--border)] bg-[var(--panel-soft)] p-4"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-lg border border-[var(--border)] text-[var(--accent-blue)]">{icon}</span><h3 className="text-[13px] font-bold text-[var(--text)]">{title}</h3></div><div className="flex flex-wrap justify-end gap-1.5">{optional && <span className="rounded-full border border-[var(--accent-purple)]/20 bg-[var(--accent-purple)]/[.07] px-2 py-1 text-[9px] font-semibold text-[var(--status-purple)]">Optional enhancement</span>}<span className={`rounded-full border px-2 py-1 text-[9px] font-bold ${tone}`}>{status}</span></div></div><p className="mt-3 text-[11px] leading-5 text-[var(--text-secondary)]">{description}</p><dl className="mt-3 grid gap-1.5">{facts.map(([label, value]) => <div className="grid grid-cols-[110px_minmax(0,1fr)] text-[10px]" key={label}><dt className="text-[var(--text-secondary)]">{label}</dt><dd className="m-0 text-[var(--text)]">{value}</dd></div>)}</dl><div className="mt-auto pt-4 text-center"><button type="button" onClick={onPrimary} className="min-h-9 w-full rounded-md bg-[var(--accent-blue)] px-3 text-[11px] font-bold text-white transition hover:brightness-110">{primary}</button><button type="button" onClick={onSecondary} className="mt-2 text-[10px] font-semibold text-[var(--accent-blue)] hover:text-[var(--text)]">{secondary}</button></div></article>
}

function buildStarterRobots(origin, sitemaps) {
  const validSitemaps = (sitemaps?.discovered || []).filter(item => item.ok && item.url).map(item => item.url).slice(0, 5)
  const lines = ['# Review before publishing', 'User-agent: *', 'Allow: /']
  if (validSitemaps.length) lines.push('', ...validSitemaps.map(url => `Sitemap: ${url}`))
  else if (origin) lines.push('', '# Add a verified sitemap when available, for example:', `# Sitemap: ${origin}/sitemap.xml`)
  return `${lines.join('\n')}\n`
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
