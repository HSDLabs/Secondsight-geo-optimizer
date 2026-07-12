import { useMemo, useState } from 'react'
import { Accessibility, AlertTriangle, Check, CodeXml, ExternalLink, FileText, Image, Info } from '../icons/heroicons'
import SectionShell from './SectionShell'
import AnalysisModal from './AnalysisModal'
import TreeNode from './TreeNode'
import { findNodePath } from './utils/analysisViewModel'

const cardClass = 'flex min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-darker)]/45 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-white/15'
const rowClass = 'grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-[var(--border)] py-2.5 text-[13px] last:border-0'
const actionClass = 'inline-flex min-h-10 items-center gap-2 self-start text-[12px] font-semibold text-[var(--accent-blue)] transition-colors hover:text-blue-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent-blue)]'

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
        <div className="mu-stagger-grid grid items-stretch gap-4 p-5 md:grid-cols-2 min-[1440px]:grid-cols-3 min-[1680px]:grid-cols-4">
          <article className={`${cardClass} border-sky-400/15 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,.055),transparent_60%),rgba(11,18,29,.82)]`}>
            <CardTitle icon={Image}>Human View</CardTitle>
            <div className="mt-5 h-52 overflow-hidden rounded-lg border border-[var(--border-strong)] bg-[var(--bg-darker)]">
              {screenshot ? <img className="h-full w-full object-cover object-top" src={`data:image/png;base64,${screenshot}`} alt="Analyzed page screenshot" /> : <Empty>Screenshot unavailable</Empty>}
            </div>
            <div className="mt-auto grid justify-items-start gap-4 pt-3">
              <span className="rounded-lg border border-[var(--border)] bg-[var(--panel-raised)] px-3 py-2 text-[11px] text-[var(--text-secondary)]">Desktop · {data?.screenshotMeta?.viewport?.width || 1280}px</span>
              <button type="button" onClick={openFullScreenshot} disabled={!fullPage} className={`${actionClass} disabled:text-[var(--text-muted)]`}>Open full page <ExternalLink size={15} /></button>
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
            <div className="mt-auto pt-4"><p className="text-[12px] text-[var(--text-secondary)]"><strong className="font-semibold text-[var(--text)]">{stats.totalNodes ?? 0}</strong> total nodes</p><button type="button" onClick={() => setShowTree(true)} className={`${actionClass} mt-3`}>View tree <ExternalLink size={15} /></button></div>
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
            <div className="mt-auto pt-4"><div className="flex items-center justify-between gap-3"><span className="text-[12px] text-[var(--text-secondary)]">Readability</span><strong className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${readable.textContent ? 'border-[var(--accent-teal)]/20 bg-[var(--accent-teal)]/8 text-emerald-100' : 'border-[var(--accent-amber)]/25 bg-[var(--accent-amber)]/10 text-amber-100'}`}>{readable.textContent ? 'Excellent' : 'Issue'}</strong></div><button type="button" onClick={() => document.getElementById('extraction-inspector')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className={`${actionClass} mt-3`}>View extracted text <ExternalLink size={15} /></button></div>
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

          <article className={`${cardClass} md:col-span-2 min-[1440px]:col-span-3 min-[1680px]:col-span-4`}>
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
      <div className="mb-4 flex w-fit rounded-lg border border-[var(--border)] bg-[var(--bg-darker)] p-1"><button type="button" onClick={() => setTreeMode('outline')} className={`min-h-10 rounded-md px-3 text-[12px] ${treeMode === 'outline' ? 'bg-[var(--accent-blue)]/10 text-blue-100' : 'text-[var(--text-secondary)]'}`}>DOM outline</button><button type="button" onClick={() => setTreeMode('aria')} disabled={!data?.a11y?.ariaSnapshot} className={`min-h-10 rounded-md px-3 text-[12px] disabled:text-[var(--text-muted)] ${treeMode === 'aria' ? 'bg-[var(--accent-purple)]/10 text-purple-100' : 'text-[var(--text-secondary)]'}`}>ARIA snapshot</button></div>
      <div className="tree-shell max-h-[620px] min-h-72 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--bg-darker)] p-5">{treeMode === 'aria' ? <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-6 text-[var(--text-secondary)] [overflow-wrap:anywhere]">{data?.a11y?.ariaSnapshot}</pre> : <TreeNode node={data?.a11y?.snapshot} screenshotMeta={data?.screenshotMeta} selectedNodeId={selectedNodeId} selectedPath={selectedPath} onSelectNode={onSelectNode} isFocused />}</div>
    </AnalysisModal>
  )
}

function CardTitle({ icon: Icon, children }) {
  return <h3 className="flex items-center gap-3 text-[14px] font-semibold text-[var(--text)]"><span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[var(--accent-blue)]/20 bg-[var(--accent-blue)]/[.07] text-blue-100"><Icon size={20} strokeWidth={1.7} /></span><span className="min-w-0 break-words">{children}</span><Info size={15} className="shrink-0 text-[var(--text-secondary)]" /></h3>
}

function MetricRows({ rows }) {
  return <dl className="mt-4 mb-4 min-w-0">{rows.map(([label, value]) => <div key={label} className={rowClass}><dt className="min-w-0 text-[var(--text-secondary)]">{label}</dt><dd className="shrink-0 font-medium tabular-nums text-[var(--text)]">{value ?? 0}</dd></div>)}</dl>
}

function StatusRows({ rows }) {
  return <dl className="mt-4 mb-4 min-w-0">{rows.map(([label, present, detail]) => <div key={label} className={rowClass}><dt className="min-w-0 text-[var(--text-secondary)]">{label}</dt><dd className="flex min-w-0 items-center justify-end">{present && detail ? <span className="max-w-36 truncate text-right text-[11px] font-medium text-emerald-100" title={detail}>{detail}</span> : present ? <Check size={17} strokeWidth={2.2} className="text-[var(--accent-teal)]" /> : <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-amber)]/25 bg-[var(--accent-amber)]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-amber-100"><AlertTriangle size={13} />Issue</span>}</dd></div>)}</dl>
}

function MetadataFooter({ metadata, schemaTypes }) {
  const checks = [Boolean(metadata.title), Boolean(metadata.description), Boolean(metadata.canonical), Object.keys(metadata.openGraph || {}).length > 0, Object.keys(metadata.twitterCards || {}).length > 0, schemaTypes.length > 0]
  const issueCount = checks.filter(value => !value).length
  return <div className="mt-auto pt-4"><p className={`text-[12px] ${issueCount ? 'text-amber-100' : 'text-[var(--text-secondary)]'}`}>{issueCount ? `${issueCount} metadata issue${issueCount > 1 ? 's' : ''} found` : 'All critical metadata found'}</p><button type="button" onClick={() => document.getElementById('extraction-inspector')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className={`${actionClass} mt-3`}>View details <ExternalLink size={15} /></button></div>
}

function Signal({ label, value, good }) {
  return <div className="inline-flex min-w-0 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel-raised)]/50 px-3 py-2.5"><span className={`size-2 shrink-0 rounded-full ${good ? 'bg-[var(--accent-teal)]' : 'bg-[var(--text-muted)]'}`} /><span className="text-[11px] text-[var(--text-secondary)]">{label}</span><strong className={`text-[11px] font-medium ${good ? 'text-emerald-100' : 'text-[var(--text)]'}`}>{value}</strong></div>
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
