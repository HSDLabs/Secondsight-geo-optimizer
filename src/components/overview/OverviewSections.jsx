import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  ArrowRight,
  Clock,
} from '../icons/heroicons'
import {
  CrawlerIcon,
  FocusIcon,
  IntelligenceIcon,
  QuickWinIcon,
  RecommendationsIcon,
  SuccessIcon,
  UnderstandingIcon,
} from '../../components/icons'
import { toneFor, verdictFor } from './utils/overviewModel'

const pillarMeta = [
  { key: 'crawler', label: 'Crawl & indexability', icon: CrawlerIcon, path: '/crawl-indexability', description: 'Can AI crawlers reach, render, and index your pages?' },
  { key: 'understanding', label: 'Machine understanding', icon: UnderstandingIcon, path: '/ai-understanding', description: 'Can machines extract your structure and meaning?' },
  { key: 'external', label: 'Sources & authority', icon: IntelligenceIcon, path: '/sources-authority', description: 'How the wider web supports your authority.' },
]

const emptyPillars = [
  {
    label: 'Crawl & indexability',
    icon: CrawlerIcon,
    path: '/crawl-indexability',
    description: 'Checks whether crawlers can access, render, and discover important pages.',
    evidence: 'Robots rules, status codes, sitemaps, canonicals, and rendering',
  },
  {
    label: 'Machine understanding',
    icon: UnderstandingIcon,
    path: '/ai-understanding',
    description: 'Checks whether machines can parse the page structure, content, and entities.',
    evidence: 'Semantic structure, readable content, metadata, and accessibility',
  },
  {
    label: 'Sources & authority',
    icon: IntelligenceIcon,
    path: '/sources-authority',
    description: 'Checks the external evidence that supports brand authority and reputation.',
    evidence: 'Available sources, entity associations, and supporting evidence',
  },
]

const panelIconProps = { size: 18, strokeWidth: 1.7 }
const pillarIconProps = { size: 22, strokeWidth: 1.7 }
const quickWinIconProps = { size: 20, strokeWidth: 1.7 }
const focusIconProps = { size: 18, strokeWidth: 1.7 }

export function OverviewEmptyState({ onStart }) {
  return (
    <div className="overview-pre-scan">
      <section className="overview-panel overview-baseline-card" aria-labelledby="overview-baseline-title">
        <div className="overview-baseline-copy">
          <div className="overview-baseline-content">
            <span className="overview-kicker">Visibility baseline</span>
            <h2 id="overview-baseline-title">No baseline yet</h2>
            <p>Run your first scan to establish how prepared this site is for AI discovery.</p>
            <ul>
              <li><CrawlerIcon /> Crawl & indexability</li>
              <li><UnderstandingIcon /> Machine understanding</li>
              <li><IntelligenceIcon /> Sources & authority</li>
            </ul>
            <button type="button" className="overview-start-button" onClick={onStart}>Run first scan <ArrowRight size={14} strokeWidth={1.7} /></button>
          </div>
          <div className="overview-baseline-illustration" aria-hidden="true">
            <img src="/secondsight-radar-illustration.svg" alt="" />
          </div>
        </div>
        <div className="overview-first-scan-value">
          <span className="overview-section-icon"><RecommendationsIcon {...panelIconProps} /></span>
          <div>
            <span className="overview-kicker">What the first scan establishes</span>
            <h3>A useful baseline, not placeholder scores.</h3>
          </div>
          <ul>
            <li><SuccessIcon /> Your strongest and weakest live signal</li>
            <li><SuccessIcon /> High-impact blockers grounded in evidence</li>
            <li><SuccessIcon /> Quick improvements worth addressing first</li>
            <li><SuccessIcon /> The evidence behind every finding</li>
          </ul>
        </div>
      </section>

      <section className="overview-pre-scan-pillars" aria-labelledby="overview-measures-title">
        <div className="overview-pre-scan-heading">
          <span className="overview-kicker">Live analysis areas</span>
          <h2 id="overview-measures-title">What SecondSight measures</h2>
          <p>Each area becomes evidence-backed after the first scan.</p>
        </div>
        <div className="overview-pre-scan-grid">
          {emptyPillars.map(pillar => {
            const Icon = pillar.icon
            return (
              <article key={pillar.label} className="overview-panel overview-pre-scan-pillar">
                <div className="overview-pre-scan-pillar-top"><span className="overview-icon-box"><Icon {...pillarIconProps} /></span><span>Not analyzed</span></div>
                <h3>{pillar.label}</h3>
                <p>{pillar.description}</p>
                <div className="overview-inspects"><strong>Inspects</strong><span>{pillar.evidence}</span></div>
                <NavLink to={pillar.path}>Learn what is checked <ArrowRight size={13} strokeWidth={1.7} /></NavLink>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}

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
            <NavLink key={`${issue.title}-${index}`} to={issue.category === 'Technical' ? '/crawl-indexability' : '/ai-understanding'} className="overview-issue-row">
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
        action={hasResults && <NavLink to="/opportunities" className="overview-text-action">All recommendations <ArrowRight size={13} strokeWidth={1.7} /></NavLink>}
      />
      {wins.length ? (
        <div className="overview-win-list">
          {wins.map((win, index) => (
            <NavLink key={`${win.action}-${index}`} to={win.category === 'Technical' ? '/crawl-indexability' : '/ai-understanding'} className="overview-win-row">
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

export function FocusPanel({ weakest, issues }) {
  const labels = { crawler: 'Crawl & indexability', understanding: 'Machine understanding', external: 'Sources & authority' }
  const focusLabel = weakest ? labels[weakest[0]] : 'Run your first scan'

  return (
    <section className="overview-panel overview-focus-panel">
      <PanelHeader icon={FocusIcon} title="What to focus on next" description="A short path toward the next score tier." />
      <div className="overview-focus-list">
        <NavLink to={weakest?.[0] === 'crawler' ? '/crawl-indexability' : '/ai-understanding'}>
          <span className="tone-warning"><FocusIcon {...focusIconProps} /></span><strong>Improve {focusLabel}</strong><small>{weakest ? `Currently your lowest live pillar at ${Math.round(weakest[1])}.` : 'Establish a baseline before prioritizing work.'}</small><ArrowRight size={13} strokeWidth={1.7} />
        </NavLink>
        <NavLink to="/ai-understanding"><span className="tone-good"><SuccessIcon {...focusIconProps} /></span><strong>Resolve high-impact issues</strong><small>{issues.length ? `${issues.length} prioritized issue groups are ready to review.` : 'High-impact issues will be grouped here.'}</small><ArrowRight size={13} strokeWidth={1.7} /></NavLink>
        <NavLink to="/opportunities"><span className="tone-accent"><QuickWinIcon {...focusIconProps} /></span><strong>Implement quick wins</strong><small>Apply focused fixes, then scan again to verify the result.</small><ArrowRight size={13} strokeWidth={1.7} /></NavLink>
      </div>
    </section>
  )
}
