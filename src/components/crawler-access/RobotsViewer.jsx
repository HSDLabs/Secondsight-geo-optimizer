import { AlertTriangle, CheckCircle2, ExternalLink, FileCode2 } from '../icons/heroicons'

const lineTone = {
  'user-agent': 'text-sky-300', allow: 'text-emerald-300', disallow: 'text-rose-300',
  sitemap: 'text-violet-300', 'crawl-delay': 'text-amber-300', comment: 'text-slate-500',
  invalid: 'text-rose-300', unknown: 'text-amber-200', blank: 'text-slate-600'
}

export default function RobotsViewer({ robots, onShowIssue }) {
  const analysis = robots?.analysis
  const summary = analysis?.summary || {}
  const lines = analysis?.lines || []

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)]" aria-labelledby="robots-viewer-title">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
        <div><p className="m-0 text-[11px] font-bold uppercase tracking-[.14em] text-[var(--accent-blue)]">Policy source</p><h2 id="robots-viewer-title" className="mt-2 text-base font-bold text-[var(--text)]">2. Robots.txt Analyzer</h2><p className="mt-1 text-[13px] text-[var(--text-secondary)]">Syntax, rule scope, and problems mapped to their source lines.</p></div>
        {robots?.found && <a href={robots.url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 text-[12px] font-semibold text-[var(--accent-blue)] hover:text-blue-200">View full robots.txt <ExternalLink size={15} /></a>}
      </header>

      {!robots?.found ? <EmptyRobots robots={robots} /> : (
        <div className="grid min-w-0 lg:grid-cols-[minmax(0,1.55fr)_minmax(235px,.7fr)]">
          <div className="min-w-0 border-b border-[var(--border)] lg:border-b-0 lg:border-r">
            <div className="max-h-[430px] overflow-auto bg-[var(--bg-darker)] py-3 font-mono text-[12px] leading-6">
              {lines.map(line => <RobotLine key={line.number} line={line} onShowIssue={onShowIssue} />)}
            </div>
            <div className="flex flex-wrap gap-4 border-t border-[var(--border)] px-4 py-3 text-[11px] text-[var(--text-secondary)]">
              <Legend color="bg-emerald-400" label="Allow"/><Legend color="bg-rose-400" label="Disallow"/><Legend color="bg-slate-500" label="Comment"/><Legend color="bg-amber-400" label="Needs attention"/>
            </div>
          </div>
          <aside className="p-5">
            <div className="flex items-center gap-2"><FileCode2 size={14} className="text-sky-300"/><h3 className="m-0 text-[11px] font-bold uppercase tracking-[.08em] text-[var(--text)]">Rules Summary</h3></div>
            <dl className="mt-4 space-y-3">
              <Summary label="Total rules" value={summary.totalRules}/><Summary label="User-agent groups" value={summary.userAgentGroups}/><Summary label="Allow rules" value={summary.allowRules} tone="text-emerald-300"/><Summary label="Disallow rules" value={summary.disallowRules} tone="text-rose-300"/><Summary label="Comments" value={summary.comments}/><Summary label="Sitemap directives" value={summary.sitemapDirectives}/><Summary label="Crawl-delay" value={summary.crawlDelay || 'None'}/><Summary label="Last modified" value={formatDate(summary.lastModified)}/>
            </dl>
            <div className={`mt-5 rounded-lg border p-3 ${analysis.issues?.length ? 'border-amber-400/20 bg-amber-400/[.06]' : 'border-emerald-400/20 bg-emerald-400/[.06]'}`}>
              <div className="flex items-center gap-2">{analysis.issues?.length ? <AlertTriangle size={16} className="text-amber-100"/> : <CheckCircle2 size={16} className="text-emerald-100"/>}<strong className="text-[12px] text-[var(--text)]">{analysis.issues?.length ? `${analysis.issues.length} item${analysis.issues.length === 1 ? '' : 's'} to review` : 'No syntax problems detected'}</strong></div>
              <p className="mt-1 text-[11px] leading-5 text-[var(--text-secondary)]">Warnings are linked to the same grouped issue records used in the action queue.</p>
            </div>
          </aside>
        </div>
      )}
    </section>
  )
}

function RobotLine({ line, onShowIssue }) {
  const hasIssue = line.issueIds?.length > 0
  return <div className={`group grid min-w-max grid-cols-[42px_minmax(430px,1fr)_24px] border-l-2 px-2 ${hasIssue ? line.severity === 'critical' ? 'border-rose-400 bg-rose-400/[.06]' : 'border-amber-400 bg-amber-400/[.05]' : 'border-transparent hover:bg-white/[.02]'}`}><span className="select-none pr-3 text-right text-[var(--text-secondary)]">{line.number}</span><code className={`${lineTone[line.type] || lineTone.unknown} whitespace-pre`}>{line.raw || ' '}</code>{hasIssue ? <button type="button" onClick={() => onShowIssue?.(line.issueIds[0])} title="View related issue" className="self-center text-amber-200 hover:text-amber-100"><AlertTriangle size={14}/></button> : <span/>}</div>
}

function Summary({ label, value, tone = 'text-[var(--text)]' }) { return <div className="flex items-center justify-between gap-3 text-[12px]"><dt className="text-[var(--text-secondary)]">{label}</dt><dd className={`m-0 text-right font-semibold ${tone}`}>{value ?? 0}</dd></div> }
function Legend({ color, label }) { return <span className="inline-flex items-center gap-1.5"><i className={`h-1.5 w-1.5 rounded-full ${color}`}/>{label}</span> }
function formatDate(value) { if (!value) return 'Not provided'; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString() }
function EmptyRobots({ robots }) { return <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center"><FileCode2 size={28} className="text-[var(--faint)]"/><h3 className="mt-3 text-sm font-semibold text-[var(--text)]">robots.txt not available</h3><p className="mt-1 max-w-md text-xs leading-5 text-[var(--muted)]">{robots?.error ? `The file could not be fetched: ${robots.error}. Policy decisions remain unknown.` : 'No robots.txt file was found. Crawlers normally receive default permission, but explicit documentation can make policy clearer.'}</p></div> }
