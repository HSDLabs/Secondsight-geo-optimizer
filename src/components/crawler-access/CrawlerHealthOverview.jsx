import { useState } from 'react'
import { ArrowRight, Globe2, Info } from '../icons/heroicons'
import { AI_CRAWLERS, getScoreTone } from './utils/crawlerUtils'
import { CrawlerIcon } from '../icons'

const numberFormatter = new Intl.NumberFormat()
const scoreToneClass = {
  good: 'text-[var(--good)]',
  warning: 'text-[var(--warning)]',
  poor: 'text-[var(--poor)]'
}
const verdictToneClass = {
  good: 'border-[rgba(72,199,142,.22)] bg-[rgba(72,199,142,.1)] text-[var(--good)]',
  warning: 'border-[rgba(242,184,75,.24)] bg-[rgba(242,184,75,.12)] text-[var(--warning)]',
  poor: 'border-[rgba(255,107,107,.22)] bg-[rgba(255,107,107,.1)] text-[var(--poor)]'
}
const metricToneClass = {
  good: 'text-[var(--good)]',
  warning: 'text-[var(--warning)]',
  poor: 'text-[var(--poor)]'
}

function getScoreVerdict(score) {
  if (score >= 90) return 'Excellent Access'
  if (score >= 80) return 'Good Access'
  if (score >= 55) return 'Needs Improvement'
  return 'Poor Access'
}

export default function CrawlerHealthOverview({
  score,
  scoreBreakdown,
  botsAllowedCount,
  botsBlockedCount,
  botsLimitedCount,
  sitemaps,
  parsedSitemapsCount,
  totalSitemapsCount,
  criticalIssuesCount,
  url,
  loading,
  isAwaiting
}) {
  const [showBreakdown, setShowBreakdown] = useState(false)
  const showSkeleton = loading || isAwaiting
  const unavailableBots = botsBlockedCount + botsLimitedCount
  const sitemapIssueCount = Math.max(0, totalSitemapsCount - parsedSitemapsCount)
  const pagesDiscoverable = sitemaps?.totalUrls || 0
  const scoreTone = getScoreTone(score)

  const metrics = [
    {
      label: 'Bots Allowed',
      value: botsAllowedCount,
      suffix: `/ ${AI_CRAWLERS.length}`,
      tone: botsBlockedCount > 0 ? 'poor' : botsLimitedCount > 0 ? 'warning' : 'good',
      detail: unavailableBots > 0 ? `Limited access for ${unavailableBots} bots` : 'All tracked bots can crawl'
    },
    {
      label: 'Pages Discoverable',
      value: numberFormatter.format(pagesDiscoverable),
      tone: pagesDiscoverable > 0 ? 'good' : 'warning',
      detail: pagesDiscoverable > 0 ? 'Known URLs found through sitemaps' : 'No sitemap pages discovered'
    },
    {
      label: 'Sitemaps Found',
      value: totalSitemapsCount,
      tone: totalSitemapsCount === 0 ? 'poor' : sitemapIssueCount > 0 ? 'warning' : 'good',
      detail: totalSitemapsCount > 0
        ? `${parsedSitemapsCount} valid · ${sitemapIssueCount} with issues`
        : 'No sitemap files found'
    },
    {
      label: 'Critical Issues',
      value: criticalIssuesCount,
      tone: criticalIssuesCount > 0 ? 'poor' : 'good',
      detail: criticalIssuesCount > 0 ? 'Require immediate attention' : 'No critical blockers detected'
    }
  ]

  return (
    <section className="grid gap-4" aria-label="Crawler access health overview">
      <div className="relative grid min-h-44 min-w-0 grid-cols-1 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)] lg:[grid-template-columns:minmax(0,1.4fr)_300px_minmax(240px,.7fr)]">
        <div className="relative flex min-h-44 min-w-0 flex-col justify-center px-5 py-5 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-[var(--accent-blue)]/25 bg-[var(--accent-blue)]/10 text-[var(--accent-blue)]"><CrawlerIcon size={24} strokeWidth={1.8}/></span>
            <h1 className="m-0 text-[1.45rem] font-semibold tracking-[-.03em] text-[var(--text)] sm:text-[1.65rem]">Crawl &amp; Indexability</h1>
            <span className="rounded-full border border-[var(--accent-purple)]/25 bg-[var(--accent-purple)]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--accent-purple)]">Beta</span>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-5 text-[var(--text-secondary)]">Can search engines, AI crawlers, and retrieval systems reliably discover this site?</p>
          {url && <p className="mt-3 flex min-w-0 items-center gap-2 text-[12px] text-[var(--text-secondary)]"><Globe2 size={16} className="shrink-0 text-[var(--accent-blue)]"/><span className="break-all">{url}</span></p>}
        </div>

        <div className="relative flex min-w-0 flex-col items-start justify-center border-t border-[var(--border)] bg-[var(--panel-soft)] px-5 py-5 text-left lg:border-l lg:border-t-0">
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.11em] text-[var(--text-secondary)]">Crawl &amp; Indexability Score <Info size={15} aria-hidden="true" /></span>
          {showSkeleton ? (
            <PendingCrawlerScore loading={loading} />
          ) : (
            <>
              <div className="mt-2 flex items-end gap-2">
                <strong className={`text-[2.8rem] font-semibold leading-none tabular-nums tracking-[-.05em] ${scoreToneClass[scoreTone]}`}>{score}</strong>
                <span className="mb-1 text-sm text-[var(--faint)]">/ 100</span>
              </div>
              <div className="mt-2.5 flex flex-nowrap items-center gap-2">
                <span className={`inline-flex min-h-8 min-w-24 items-center justify-start rounded-full border px-3 text-[10px] font-medium ${verdictToneClass[scoreTone]}`}>{getScoreVerdict(score)}</span>
                <button type="button" className="group inline-flex min-h-10 whitespace-nowrap items-center gap-2 text-[12px] font-semibold text-[var(--accent)] transition hover:text-[var(--text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)]" aria-expanded={showBreakdown} aria-controls="crawler-score-breakdown" onClick={() => setShowBreakdown(current => !current)}>
                  {showBreakdown ? 'Hide score details' : 'View score details'}
                  <ArrowRight size={16} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5"/>
                </button>
              </div>
            </>
          )}
        </div>

        <div className="relative flex min-w-0 flex-col justify-center border-t border-[var(--border)] px-5 py-5 sm:px-6 lg:border-l lg:border-t-0">
          <p className="m-0 text-xs leading-5 text-[var(--text-secondary)]">Measures published crawler policy, sitemap discovery, HTTP availability, and access to important pages.</p>
          <p className="mt-3 flex items-start gap-2 text-[12px] leading-5 text-[var(--text-secondary)]"><Info size={15} className="mt-0.5 shrink-0"/>Policy-based score; it does not impersonate crawler-vendor requests.</p>
        </div>
      </div>

      {showBreakdown && !showSkeleton && (
        <div id="crawler-score-breakdown" className="grid animate-[slideDown_180ms_ease-out] grid-cols-1 gap-7 rounded-[10px] border border-[var(--border)] bg-[var(--panel-soft)] px-6 py-5 motion-reduce:animate-none sm:[grid-template-columns:minmax(220px,.72fr)_minmax(300px,1fr)]">
          <div>
            <span className="inline-flex text-[.68rem] font-bold uppercase tracking-[.075em] text-[var(--muted)]">How the score is calculated</span>
            <p className="mt-2 text-[.78rem] leading-[1.65] text-[var(--muted)]">The score starts at 100, then applies deductions for crawler blocks, sitemap problems, and inaccessible pages.</p>
          </div>
          <dl className="m-0 grid">
            {(scoreBreakdown?.length ? scoreBreakdown : [{ label: 'No crawlability deductions', value: 0 }]).map(item => (
              <div className="flex justify-between gap-6 border-b border-[var(--border)] py-2 text-[.78rem] text-[var(--muted)] last:border-0" key={item.label}>
                <dt>{item.label}</dt>
                <dd className={`m-0 font-mono font-bold ${item.value < 0 ? 'text-[var(--poor)]' : 'text-[var(--good)]'}`}>{item.value > 0 ? '+' : ''}{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {!isAwaiting && <div className="mu-stagger-grid grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(metric => (
          <article className="flex min-h-[112px] min-w-0 flex-col justify-between overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[var(--border-strong)]" key={metric.label}>
            <span className="text-[11px] font-semibold uppercase tracking-[.07em] text-[var(--text-secondary)]">{metric.label}</span>
            <div className={showSkeleton ? 'my-2.5 min-h-9 text-[1.9rem] font-semibold leading-[1.1] text-[var(--text-muted)]' : `my-2.5 min-h-9 text-[1.9rem] font-bold leading-[1.1] ${metricToneClass[metric.tone]}`}>
              {showSkeleton ? '—' : <>{metric.value}{metric.suffix && <span className="ml-1.5 text-sm font-semibold text-[var(--faint)]">{metric.suffix}</span>}</>}
            </div>
            <span className="text-[12px] leading-5 text-[var(--text-secondary)]">{showSkeleton ? 'Awaiting analysis' : metric.detail}</span>
          </article>
        ))}
      </div>}
    </section>
  )
}

function PendingCrawlerScore({ loading }) {
  return <div className="mt-4 inline-flex min-h-14 min-w-32 items-center gap-3 rounded-lg border border-[var(--accent-blue)]/15 bg-[var(--accent-blue)]/[.045] px-4" aria-label="Awaiting crawler analysis"><strong className="text-3xl font-semibold text-[var(--text-secondary)]">—</strong><span className="text-[11px] font-semibold uppercase tracking-[.06em] text-[var(--text-secondary)]">{loading ? 'Checking access' : 'Not analyzed'}</span></div>
}
