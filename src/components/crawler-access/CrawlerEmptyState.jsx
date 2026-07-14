import { Bot, FileCode2, Files, Info, Network } from '../icons/heroicons'

const pendingEvidence = [
  {
    label: 'Crawler permissions',
    description: 'Compare how supported search and AI crawler tokens are treated by the published robots policy.',
    icon: Bot,
    tone: 'bg-sky-400/[.08] text-sky-300'
  },
  {
    label: 'Robots.txt policy',
    description: 'Review matched rules, source lines, conflicts, missing directives, and policy warnings.',
    icon: FileCode2,
    tone: 'bg-violet-400/[.08] text-violet-300'
  },
  {
    label: 'Sitemap inventory',
    description: 'Inspect discovered URLs, sampled page status, indexability, noindex signals, and crawl blocks.',
    icon: Files,
    tone: 'bg-emerald-400/[.08] text-emerald-300'
  },
  {
    label: 'Discovery paths',
    description: 'Trace sitemap entries, inspected internal links, redirects, canonicals, and weak discovery routes.',
    icon: Network,
    tone: 'bg-amber-400/[.08] text-amber-300'
  }
]

export default function CrawlerEmptyState({ loading }) {
  return (
    <section aria-live="polite" aria-labelledby="crawler-workspace-title" className="rounded-xl border border-sky-400/15 bg-[var(--panel)] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className={`mt-1 size-2 shrink-0 rounded-full ${loading ? 'animate-pulse bg-sky-300' : 'bg-[var(--text-muted)]'}`} />
        <div>
          <h2 id="crawler-workspace-title" className="text-[14px] font-semibold text-[var(--text)]">{loading ? 'Preparing crawler evidence' : 'Crawler evidence workspace'}</h2>
          <p className="mt-1 max-w-3xl text-[13px] leading-5 text-[var(--text-secondary)]">{loading ? 'The report will populate as crawler policy, sitemap, page, and discovery checks complete.' : 'Run an analysis to see whether crawlers can access, discover, and index the site’s important pages.'}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {pendingEvidence.map(({ label, description, icon: Icon, tone }) => (
          <article key={label} className="flex min-w-0 flex-col rounded-lg border border-[var(--border)] bg-[var(--panel-raised)] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-white/15 hover:shadow-[0_14px_35px_rgba(0,0,0,.14)]">
            <div className="flex items-center gap-3">
              <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${tone}`}><Icon size={18} /></span>
              <strong className="text-[13px] font-semibold text-[var(--text)]">{label}</strong>
            </div>
            <p className="mt-3 text-[12px] leading-5 text-[var(--text-secondary)]">{description}</p>
            <span className="mt-auto pt-3 text-[11px] font-medium text-[var(--text-muted)]">{loading ? 'Checking evidence' : 'Available after analysis'}</span>
          </article>
        ))}
      </div>

      <p className="mt-4 flex items-start gap-2 border-t border-[var(--border)] pt-3 text-[11px] leading-5 text-[var(--text-secondary)]"><Info size={14} className="mt-0.5 shrink-0" />Results describe published policy and sampled page evidence. They do not impersonate requests from crawler vendors.</p>
    </section>
  )
}
