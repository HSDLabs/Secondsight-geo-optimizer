import { useState } from 'react'
import { ArrowRight, Globe2, Info } from 'lucide-react'
import { AI_CRAWLERS, getScoreTone } from './crawlerUtils'
import { CrawlerIcon } from '../../components/icons'
import { analysisSkeletonClass } from '../../components/analysisSkeleton'

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
  good: 'text-[var(--good)] [text-shadow:0_0_10px_rgba(72,199,142,.15)]',
  warning: 'text-[var(--warning)] [text-shadow:0_0_10px_rgba(242,184,75,.15)]',
  poor: 'text-[var(--poor)] [text-shadow:0_0_10px_rgba(255,107,107,.15)]'
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
      <div className="relative grid min-h-44 min-w-0 grid-cols-1 overflow-hidden rounded-xl border border-slate-700/50 bg-[#101824]/90 shadow-[0_18px_60px_rgba(0,0,0,.12)] lg:[grid-template-columns:minmax(0,1.4fr)_300px_minmax(240px,.7fr)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,rgba(56,189,248,.045),transparent_38%)]" />
        <div className="relative flex min-h-44 min-w-0 flex-col justify-center px-5 py-5 sm:px-7">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-sky-400/20 bg-sky-400/[.06] text-sky-300 shadow-[inset_0_1px_rgba(255,255,255,.025)]"><CrawlerIcon size={21} strokeWidth={1.8}/></span>
            <h1 className="m-0 text-[1.45rem] font-semibold tracking-[-.03em] text-slate-100 sm:text-[1.65rem]">Crawler Access</h1>
            <span className="rounded border border-violet-400/25 bg-violet-400/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[.12em] text-violet-300">Beta</span>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-5 text-slate-400">Can search engines, AI crawlers, and retrieval systems reliably discover this site?</p>
          {url && <p className="mt-3 flex min-w-0 items-center gap-2 text-[11px] text-slate-500"><Globe2 size={12} className="shrink-0 text-sky-300"/><span className="truncate">{url}</span></p>}
        </div>

        <div className="relative flex min-w-0 flex-col items-start justify-center border-t border-slate-700/40 bg-[#0b121d]/45 px-5 py-5 text-left lg:border-l lg:border-t-0">
          <span className="inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[.11em] text-slate-400">Crawler Access Score <Info size={11} aria-hidden="true" /></span>
          {showSkeleton ? (
            <div className={`mt-4 h-14 w-28 ${analysisSkeletonClass}`} aria-label="Awaiting crawler analysis" />
          ) : (
            <>
              <div className="mt-2 flex items-end gap-2">
                <strong className={`text-[2.8rem] font-semibold leading-none tabular-nums tracking-[-.05em] ${scoreToneClass[scoreTone]}`}>{score}</strong>
                <span className="mb-1 text-sm text-slate-500">/ 100</span>
              </div>
              <div className="mt-2.5 flex flex-nowrap items-center gap-2">
                <span className={`inline-flex min-w-24 justify-start rounded-md border px-3 py-1 text-[10px] font-medium ${verdictToneClass[scoreTone]}`}>{getScoreVerdict(score)}</span>
                <button type="button" className="group inline-flex whitespace-nowrap items-center gap-1 text-[10px] font-medium text-sky-300 transition hover:text-sky-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400" aria-expanded={showBreakdown} aria-controls="crawler-score-breakdown" onClick={() => setShowBreakdown(current => !current)}>
                  {showBreakdown ? 'Hide score details' : 'View score details'}
                  <ArrowRight size={11} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5"/>
                </button>
              </div>
            </>
          )}
        </div>

        <div className="relative flex min-w-0 flex-col justify-center border-t border-slate-700/40 px-5 py-5 sm:px-6 lg:border-l lg:border-t-0">
          <p className="m-0 text-xs leading-5 text-slate-400">Measures published crawler policy, sitemap discovery, HTTP availability, and access to important pages.</p>
          <p className="mt-3 flex items-start gap-2 text-[11px] leading-4 text-slate-500"><Info size={12} className="mt-0.5 shrink-0"/>Policy-based score; it does not impersonate crawler-vendor requests.</p>
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

      <div className="mu-stagger-grid grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(metric => (
          <article className="flex min-h-[112px] min-w-0 flex-col justify-between overflow-hidden rounded-lg border border-slate-700/45 bg-[#0b121d]/70 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-slate-600/70 hover:shadow-[0_14px_35px_rgba(0,0,0,.14)]" key={metric.label}>
            <span className="text-[10px] font-semibold uppercase tracking-[.07em] text-slate-400">{metric.label}</span>
            <div className={showSkeleton ? `my-2.5 h-9 w-[72px] ${analysisSkeletonClass}` : `my-2.5 min-h-9 text-[1.9rem] font-bold leading-[1.1] ${metricToneClass[metric.tone]}`}>
              {!showSkeleton && <>{metric.value}{metric.suffix && <span className="ml-1.5 text-sm font-semibold text-[var(--faint)]">{metric.suffix}</span>}</>}
            </div>
            <span className="text-[10px] leading-4 text-slate-500">{showSkeleton ? 'Awaiting analysis' : metric.detail}</span>
          </article>
        ))}
      </div>
    </section>
  )
}
