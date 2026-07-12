import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  ArrowRight,
  Clock,
  LockKeyhole,
} from '../icons/heroicons'
import {
  CitationIcon,
  ContentGapsIcon,
  CrawlerIcon,
  FocusIcon,
  IntelligenceIcon,
  QuickWinIcon,
  RecommendationsIcon,
  RetrievalIcon,
  SuccessIcon,
  TrendIcon,
  UnderstandingIcon,
} from '../../components/icons'
import { toneFor, verdictFor } from './utils/overviewModel'

const pillarMeta = [
  { key: 'crawler', label: 'Crawler access', icon: CrawlerIcon, path: '/crawler-access', description: 'Can AI crawlers reach and render your pages?' },
  { key: 'understanding', label: 'Machine understanding', icon: UnderstandingIcon, path: '/ai-understanding', description: 'Can machines extract your structure and meaning?' },
  { key: 'external', label: 'External intelligence', icon: IntelligenceIcon, path: '/content-intelligence', description: 'How the wider web supports your authority.' },
]

const futurePillars = [
  { label: 'Retrieval readiness', icon: RetrievalIcon },
  { label: 'Citation readiness', icon: CitationIcon },
  { label: 'Content gaps', icon: ContentGapsIcon },
]

const panelIconProps = { size: 18, strokeWidth: 1.7 }
const pillarIconProps = { size: 22, strokeWidth: 1.7 }
const quickWinIconProps = { size: 20, strokeWidth: 1.7 }
const focusIconProps = { size: 18, strokeWidth: 1.7 }

function useAnimatedNumber(value) {
  const [display, setDisplay] = useState(value ?? 0)

  useEffect(() => {
    if (value == null) return
    let frame
    const start = performance.now()
    const from = display
    const tick = now => {
      const progress = Math.min((now - start) / 700, 1)
      setDisplay(Math.round(from + (value - from) * (1 - Math.pow(1 - progress, 4))))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return display
}

export function ScoreRing({ score, loading }) {
  const animated = useAnimatedNumber(score)
  const value = score == null ? 0 : animated

  return (
    <div className={`overview-score-ring tone-${toneFor(score)} ${loading ? 'is-scanning' : ''}`} style={{ '--score': value }}>
      <div>
        <strong>{score == null ? '—' : value}</strong>
        <span>/ 100</span>
      </div>
    </div>
  )
}

export function PanelHeader({ icon: Icon, title, description, action }) {
  return (
    <header className="overview-panel-header">
      <div>
        <div className="overview-panel-title"><span className="overview-section-icon"><Icon {...panelIconProps} /></span><h2>{title}</h2></div>
        {description && <p>{description}</p>}
      </div>
      {action}
    </header>
  )
}

export function LivePillars({ scores, loading = false }) {
  return (
    <section className="overview-live-pillars" aria-label="Live visibility pillars">
      {pillarMeta.map(pillar => {
        const Icon = pillar.icon
        const score = scores[pillar.key]
        return (
          <NavLink key={pillar.key} to={pillar.path} className={`overview-live-pillar pillar-${pillar.key} tone-${toneFor(score)}`}>
            <div className="overview-live-pillar-top">
              <span className="overview-icon-box"><Icon {...pillarIconProps} /></span>
              <span className={`overview-status tone-${toneFor(score)}`}>{loading ? 'Scanning' : verdictFor(score)}</span>
            </div>
            <p className="overview-kicker">{pillar.label}</p>
            <div className="overview-pillar-value"><strong>{score == null ? '—' : Math.round(score)}</strong><span>/ 100</span></div>
            <div className="overview-score-bar"><i style={{ width: `${score ?? 0}%` }} /></div>
            <p className="overview-pillar-description">{pillar.description}</p>
            <span className="overview-inline-link">View details <ArrowRight size={13} strokeWidth={1.7} /></span>
          </NavLink>
        )
      })}
    </section>
  )
}

export function IssuesPanel({ issues, hasResults }) {
  return (
    <section className="overview-panel overview-list-panel">
      <PanelHeader
        icon={RecommendationsIcon}
        title="Top issues"
        description="The blockers with the largest expected visibility impact."
        action={hasResults && <NavLink to="/ai-understanding" className="overview-text-action">View all <ArrowRight size={13} strokeWidth={1.7} /></NavLink>}
      />
      {issues.length ? (
        <div className="overview-issue-table">
          <div className="overview-table-labels"><span>Issue</span><span>Impact</span><span>Affected</span></div>
          {issues.map((issue, index) => (
            <NavLink key={`${issue.title}-${index}`} to={issue.category === 'Technical' ? '/crawler-access' : '/ai-understanding'} className="overview-issue-row">
              <span className="overview-row-number">{index + 1}</span>
              <span className="overview-issue-copy"><strong>{issue.title}</strong><small>{issue.detail}</small></span>
              <span className={`overview-impact tone-${issue.severity}`}>{issue.impact}</span>
              <span className="overview-count">{issue.count}</span>
              <ArrowRight size={13} strokeWidth={1.7} />
            </NavLink>
          ))}
        </div>
      ) : (
        <EmptyState hasResults={hasResults} label={hasResults ? 'No urgent issues found' : 'Issues will appear after your first scan'} />
      )}
    </section>
  )
}

export function QuickWinsPanel({ wins, hasResults }) {
  return (
    <section className="overview-panel overview-list-panel">
      <PanelHeader
        icon={QuickWinIcon}
        title="Quick wins"
        description="Focused actions that can improve visibility with less effort."
        action={hasResults && <NavLink to="/recommendations" className="overview-text-action">All recommendations <ArrowRight size={13} strokeWidth={1.7} /></NavLink>}
      />
      {wins.length ? (
        <div className="overview-win-list">
          {wins.map((win, index) => (
            <NavLink key={`${win.action}-${index}`} to={win.category === 'Technical' ? '/crawler-access' : '/ai-understanding'} className="overview-win-row">
              <span className="overview-win-icon"><FocusIcon {...quickWinIconProps} /></span>
              <span className="overview-issue-copy"><strong>{win.action}</strong><small>{win.detail}</small></span>
              <span className="overview-win-meta"><b>{win.impact} impact</b><small>{win.effort}</small></span>
              <ArrowRight size={14} strokeWidth={1.7} />
            </NavLink>
          ))}
        </div>
      ) : (
        <EmptyState hasResults={hasResults} label={hasResults ? 'No immediate quick wins found' : 'Quick wins will appear after your first scan'} />
      )}
    </section>
  )
}

function EmptyState({ hasResults, label }) {
  return (
    <div className="overview-empty">
      {hasResults ? <SuccessIcon size={20} /> : <Clock size={20} strokeWidth={1.7} />}
      <span>{label}</span>
    </div>
  )
}

export function HistoryPlaceholder() {
  return (
    <section className="overview-panel overview-history">
      <PanelHeader
        icon={TrendIcon}
        title="GEO score history"
        description="Compare scans and measure how fixes affect visibility over time."
        action={<span className="overview-dev-badge"><LockKeyhole size={11} strokeWidth={1.7} /> In development</span>}
      />
      <div className="overview-chart-placeholder" aria-label="Historical tracking placeholder">
        <div className="overview-chart-grid" />
        <div className="overview-chart-line" />
        <div className="overview-chart-lock"><LockKeyhole size={16} strokeWidth={1.7} /><span>Historical tracking becomes available when scan history is supported.</span></div>
      </div>
    </section>
  )
}

export function FocusPanel({ weakest, issues }) {
  const labels = { crawler: 'Crawler access', understanding: 'Machine understanding', external: 'External intelligence' }
  const focusLabel = weakest ? labels[weakest[0]] : 'Run your first scan'

  return (
    <section className="overview-panel overview-focus-panel">
      <PanelHeader icon={FocusIcon} title="What to focus on next" description="A short path toward the next score tier." />
      <div className="overview-focus-list">
        <NavLink to={weakest?.[0] === 'crawler' ? '/crawler-access' : '/ai-understanding'}>
          <span className="tone-warning"><FocusIcon {...focusIconProps} /></span><strong>Improve {focusLabel}</strong><small>{weakest ? `Currently your lowest live pillar at ${Math.round(weakest[1])}.` : 'Establish a baseline before prioritizing work.'}</small><ArrowRight size={13} strokeWidth={1.7} />
        </NavLink>
        <NavLink to="/ai-understanding"><span className="tone-good"><SuccessIcon {...focusIconProps} /></span><strong>Resolve high-impact issues</strong><small>{issues.length ? `${issues.length} prioritized issue groups are ready to review.` : 'High-impact issues will be grouped here.'}</small><ArrowRight size={13} strokeWidth={1.7} /></NavLink>
        <NavLink to="/recommendations"><span className="tone-accent"><QuickWinIcon {...focusIconProps} /></span><strong>Implement quick wins</strong><small>Apply focused fixes, then scan again to verify the result.</small><ArrowRight size={13} strokeWidth={1.7} /></NavLink>
      </div>
    </section>
  )
}

export function FuturePillars() {
  return (
    <div className="overview-future-row" aria-label="Capabilities in development">
      {futurePillars.map(item => {
        const Icon = item.icon
        return <span key={item.label}><Icon size={13} strokeWidth={1.7} />{item.label}<b>Planned</b></span>
      })}
    </div>
  )
}
