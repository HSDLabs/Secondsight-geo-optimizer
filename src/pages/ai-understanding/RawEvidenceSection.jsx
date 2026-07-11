import { useMemo, useState } from 'react'
import { Accessibility, AlertTriangle, Check, CodeXml, ExternalLink, FileText, Image, Info } from 'lucide-react'
import SectionShell from './SectionShell'
import AnalysisModal from './AnalysisModal'
import TreeNode from './TreeNode'
import { findNodePath } from './analysisViewModel'

const cardClass = 'flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-slate-700/45 bg-[#0b121d]/70 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-slate-600/70 hover:shadow-[0_14px_35px_rgba(0,0,0,.14)]'
const rowClass = 'grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-700/25 py-2 text-[11px] last:border-0'
const actionClass = 'inline-flex items-center gap-1.5 self-start text-[10px] font-medium text-sky-300 transition-colors hover:text-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400'

export default function RawEvidenceSection({ data, selectedNodeId, onSelectNode }) {
  const [showTree, setShowTree] = useState(false)
  const [treeMode, setTreeMode] = useState('outline')
  const stats = data?.a11y?.stats || {}
  const readable = data?.readable || {}
  const metadata = data?.metadata || {}
  const screenshot = data?.screenshots?.viewport || data?.screenshot
  const fullPage = data?.screenshots?.fullPage || screenshot
  const selectedPath = useMemo(() => findNodePath(data?.a11y?.snapshot, selectedNodeId), [data, selectedNodeId])
  const schemaTypes = getSchemaTypes(metadata.schemas)

  function openFullScreenshot() {
    if (!fullPage) return
    const win = window.open()
    if (win) win.document.write(`<title>Full page capture</title><img alt="Full page capture" style="max-width:100%;height:auto" src="data:image/png;base64,${fullPage}">`)
  }

  return (
    <>
      <SectionShell id="raw-evidence" number="1" title="Raw Evidence" description="The machine-readable signals found on this page.">
        <div className="mu-stagger-grid grid items-stretch gap-3 p-3 sm:p-4 md:grid-cols-2 xl:grid-cols-4">
          <article className={`${cardClass} border-sky-400/15 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,.055),transparent_60%),rgba(11,18,29,.82)]`}>
            <CardTitle icon={Image}>Human View</CardTitle>
            <div className="mt-4 h-44 overflow-hidden rounded-md border border-slate-600/50 bg-black/40 shadow-[0_14px_32px_rgba(0,0,0,.22)]">
              {screenshot ? <img className="h-full w-full object-cover object-top" src={`data:image/png;base64,${screenshot}`} alt="Analyzed page screenshot" /> : <Empty>Screenshot unavailable</Empty>}
            </div>
            <div className="mt-auto grid justify-items-start gap-4 pt-3">
              <span className="rounded-md border border-slate-700/60 bg-slate-800/50 px-2.5 py-1.5 text-[10px] text-slate-300">Desktop · {data?.screenshotMeta?.viewport?.width || 1280}px</span>
              <button type="button" onClick={openFullScreenshot} disabled={!fullPage} className={`${actionClass} disabled:text-slate-600`}>Open full page <ExternalLink size={10} /></button>
            </div>
          </article>

          <article className={cardClass}>
            <CardTitle icon={Accessibility}>Accessibility Tree</CardTitle>
            <MetricRows rows={[
              ['Landmarks', stats.landmarks],
              ['Headings', stats.headings],
              ['Links', stats.links],
              ['Buttons', stats.buttons],
              ['Forms', stats.forms],
              ['Images', stats.images]
            ]} />
            <div className="mt-auto pt-4"><p className="text-[10px] text-slate-500"><strong className="font-semibold text-slate-300">{stats.totalNodes ?? 0}</strong> total nodes</p><button type="button" onClick={() => setShowTree(true)} className={`${actionClass} mt-4`}>View tree <ExternalLink size={10} /></button></div>
          </article>

          <article className={cardClass}>
            <CardTitle icon={FileText}>Readable Content</CardTitle>
            <MetricRows rows={[
              ['Words', readable.wordCount],
              ['Reading time', readable.readingTimeMinutes ? `${readable.readingTimeMinutes} min` : 0],
              ['Paragraphs', readable.paragraphs],
              ['Headings', readable.headings],
              ['Lists', readable.lists],
              ['Tables', readable.tables]
            ]} />
            <div className="mt-auto pt-4"><div className="flex items-center justify-between gap-3"><span className="text-[10px] text-slate-500">Readability</span><strong className={`rounded px-2 py-1 text-[9px] font-medium ${readable.textContent ? 'bg-emerald-400/8 text-emerald-300' : 'bg-amber-400/10 text-amber-300'}`}>{readable.textContent ? 'Excellent' : 'Issue'}</strong></div><button type="button" onClick={() => document.getElementById('extraction-inspector')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className={`${actionClass} mt-4`}>View extracted text <ExternalLink size={10} /></button></div>
          </article>

          <article className={cardClass}>
            <CardTitle icon={CodeXml}>Metadata &amp; Signals</CardTitle>
            <StatusRows rows={[
              ['Title', Boolean(metadata.title)],
              ['Meta Description', Boolean(metadata.description)],
              ['Canonical URL', Boolean(metadata.canonical)],
              ['Open Graph', Object.keys(metadata.openGraph || {}).length > 0],
              ['Twitter Cards', Object.keys(metadata.twitterCards || {}).length > 0],
              ['Schema.org', schemaTypes.length > 0, schemaTypes.join(', ')]
            ]} />
            <MetadataFooter metadata={metadata} schemaTypes={schemaTypes} />
          </article>

          <article className={`${cardClass} md:col-span-2 xl:col-span-4`}>
            <CardTitle icon={CodeXml}>Other Signals</CardTitle>
            <div className="mt-3 flex flex-wrap gap-2">
              <Signal label="Readable HTML" value={readable.html ? 'Available' : 'Unavailable'} good={Boolean(readable.html)} />
              <Signal label="Rendered DOM" value="Captured" good />
              <Signal label="ARIA snapshot" value={data?.a11y?.ariaSnapshot ? 'Captured' : 'Unavailable'} good={Boolean(data?.a11y?.ariaSnapshot)} />
              <Signal label="Alt coverage" value={stats.altCoverage == null ? 'N/A' : `${stats.altCoverage}%`} good={stats.altCoverage === 100} />
              <Signal label="Markdown" value={readable.markdown ? 'Available' : 'Unavailable'} good={Boolean(readable.markdown)} />
              <Signal label="Schema" value={metadata.schemas?.length ? `${metadata.schemas.length} block${metadata.schemas.length > 1 ? 's' : ''}` : 'None'} good={Boolean(metadata.schemas?.length)} />
              <Signal label="JS required" value="Not measured" />
              <Signal label="Hidden elements" value={`${stats.explicitlyHiddenElements ?? 0} explicit`} />
            </div>
          </article>
        </div>
      </SectionShell>

      <TreeDialog open={showTree} data={data} treeMode={treeMode} setTreeMode={setTreeMode} selectedNodeId={selectedNodeId} selectedPath={selectedPath} onSelectNode={onSelectNode} onClose={() => setShowTree(false)} />
    </>
  )
}

function TreeDialog({ open, data, treeMode, setTreeMode, selectedNodeId, selectedPath, onSelectNode, onClose }) {
  return (
    <AnalysisModal open={open} onClose={onClose} title="Accessibility tree" description="Inspect the linked DOM outline or Playwright's native ARIA snapshot.">
      <div className="mb-4 flex w-fit rounded-md border border-slate-700/60 bg-slate-900/50 p-1"><button type="button" onClick={() => setTreeMode('outline')} className={`rounded px-3 py-1.5 text-[10px] ${treeMode === 'outline' ? 'bg-sky-400/10 text-sky-300' : 'text-slate-500'}`}>DOM outline</button><button type="button" onClick={() => setTreeMode('aria')} disabled={!data?.a11y?.ariaSnapshot} className={`rounded px-3 py-1.5 text-[10px] disabled:text-slate-700 ${treeMode === 'aria' ? 'bg-violet-400/10 text-violet-300' : 'text-slate-500'}`}>ARIA snapshot</button></div>
      <div className="tree-shell min-h-72 overflow-auto rounded-lg border border-slate-700/40 bg-[#090f18] p-4">{treeMode === 'aria' ? <pre className="whitespace-pre-wrap font-mono text-[11px] leading-5 text-slate-300">{data?.a11y?.ariaSnapshot}</pre> : <TreeNode node={data?.a11y?.snapshot} screenshotMeta={data?.screenshotMeta} selectedNodeId={selectedNodeId} selectedPath={selectedPath} onSelectNode={onSelectNode} isFocused />}</div>
    </AnalysisModal>
  )
}

function CardTitle({ icon: Icon, children }) {
  return <h3 className="flex items-center gap-2 text-[11px] font-semibold text-slate-200"><span className="grid size-7 shrink-0 place-items-center rounded-md border border-slate-700/50 bg-slate-800/40 text-sky-300"><Icon size={14} strokeWidth={1.7} /></span><span className="truncate">{children}</span><Info size={11} className="shrink-0 text-slate-600" /></h3>
}

function MetricRows({ rows }) {
  return <dl className="mt-3 mb-3 min-w-0">{rows.map(([label, value]) => <div key={label} className={rowClass}><dt className="min-w-0 truncate text-slate-400">{label}</dt><dd className="shrink-0 font-medium tabular-nums text-slate-200">{value ?? 0}</dd></div>)}</dl>
}

function StatusRows({ rows }) {
  return <dl className="mt-3 mb-3 min-w-0">{rows.map(([label, present, detail]) => <div key={label} className={rowClass}><dt className="min-w-0 truncate text-slate-400">{label}</dt><dd className="flex min-w-0 items-center justify-end">{present && detail ? <span className="max-w-28 truncate text-right text-[10px] font-medium text-emerald-300" title={detail}>{detail}</span> : present ? <Check size={13} strokeWidth={2.4} className="text-emerald-300" /> : <span className="inline-flex items-center gap-1 rounded border border-amber-400/20 bg-amber-400/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.06em] text-amber-300"><AlertTriangle size={8} />Issue</span>}</dd></div>)}</dl>
}

function MetadataFooter({ metadata, schemaTypes }) {
  const checks = [Boolean(metadata.title), Boolean(metadata.description), Boolean(metadata.canonical), Object.keys(metadata.openGraph || {}).length > 0, Object.keys(metadata.twitterCards || {}).length > 0, schemaTypes.length > 0]
  const issueCount = checks.filter(value => !value).length
  return <div className="mt-auto pt-4"><p className={`text-[10px] ${issueCount ? 'text-amber-300' : 'text-slate-500'}`}>{issueCount ? `${issueCount} metadata issue${issueCount > 1 ? 's' : ''} found` : 'All critical metadata found'}</p><button type="button" onClick={() => document.getElementById('extraction-inspector')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className={`${actionClass} mt-4`}>View details <ExternalLink size={10} /></button></div>
}

function Signal({ label, value, good }) {
  return <div className="inline-flex min-w-0 items-center gap-2 rounded-full border border-slate-700/45 bg-slate-900/40 px-3 py-2"><span className={`size-1.5 shrink-0 rounded-full ${good ? 'bg-emerald-400' : 'bg-slate-600'}`} /><span className="text-[10px] text-slate-500">{label}</span><strong className={`text-[10px] font-medium ${good ? 'text-emerald-300' : 'text-slate-300'}`}>{value}</strong></div>
}

function getSchemaTypes(schemas = []) {
  const types = schemas.flatMap(schema => {
    if (!schema.valid) return []
    const value = schema.value
    if (Array.isArray(value)) return value.map(item => item?.['@type'])
    if (value?.['@graph']) return value['@graph'].map(item => item?.['@type'])
    return [value?.['@type']]
  }).flat().filter(Boolean)
  return [...new Set(types)].slice(0, 3)
}

function Empty({ children }) {
  return <span className="grid h-full place-items-center text-xs text-slate-600">{children}</span>
}
