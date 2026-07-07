import { NavLink, useOutletContext } from 'react-router-dom'
import '../../styles/Overview.css'

import PageOverview from './PageOverview'
import ScoreBar from './ScoreBar'

/* ── SVG Icons for each module ──────────────────────────────── */

const ModuleIcons = {
  'crawler-access': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  'ai-understanding': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93" />
      <path d="M12 2a4 4 0 0 0-4 4c0 1.95 1.4 3.58 3.25 3.93" />
      <path d="M12 10v4" />
      <circle cx="12" cy="18" r="4" />
      <path d="M10 18h4" />
      <path d="M12 16v4" />
      <path d="M4 10l2 2M20 10l-2 2" />
    </svg>
  ),
  'content-intelligence': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  ),
  'retrieval-readiness': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
      <path d="M11 8v6M8 11h6" />
    </svg>
  ),
  'citation-readiness': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 17c-2 0-3-1-3-3V9a3 3 0 0 1 3-3h1l-1 4h2l-1 7" />
      <path d="M15 17c-2 0-3-1-3-3V9a3 3 0 0 1 3-3h1l-1 4h2l-1 7" />
    </svg>
  ),
  'content-gaps': (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20V10M18 20V4M6 20v-4" />
    </svg>
  )
}

/* ── Module catalog for the dashboard ───────────────────────── */

const MODULE_ORDER = [
  {
    key: 'crawler-access',
    path: '/crawler-access',
    label: 'Crawler Access',
    description: 'Whether AI crawlers can fetch and render the page at all — robots rules, status codes, and JavaScript rendering.'
  },
  {
    key: 'ai-understanding',
    path: '/ai-understanding',
    label: 'AI Understanding',
    description: 'How well machines grasp the page structure, semantics, and entities.'
  },
  {
    key: 'content-intelligence',
    path: '/content-intelligence',
    label: 'External Intelligence',
    description: 'Aggregates insights from news, Reddit, forums, and public web discussions.'
  },
  {
    key: 'retrieval-readiness',
    path: '/retrieval-readiness',
    label: 'Retrieval Readiness',
    description: 'Lorem ipsum dolor sit amet, consectetur.'
  },
  {
    key: 'citation-readiness',
    path: '/citation-readiness',
    label: 'Citation Readiness',
    description: 'Lorem ipsum dolor sit amet, consectetur.'
  },
  {
    key: 'content-gaps',
    path: '/content-gaps',
    label: 'Content Gaps',
    description: 'Lorem ipsum dolor sit amet, consectetur.'
  }
]

/* ── Helpers ────────────────────────────────────────────────── */

function getScoreTone(score) {
  if (score >= 80) return 'good'
  if (score >= 55) return 'warning'
  return 'poor'
}

function getScoreVerdict(score) {
  if (score >= 80) return 'Excellent'
  if (score >= 65) return 'Good'
  if (score >= 55) return 'Fair'
  return 'Poor'
}

function getModuleStatus(key, data, score, crawlerData) {
  if (!data) return 'Awaiting Analysis'
  if (key === 'ai-understanding') {
    if (score == null) return 'Awaiting Analysis'
    return getScoreVerdict(score)
  }
  if (key === 'crawler-access') {
    if (!crawlerData) return 'Awaiting Analysis'
    return getScoreVerdict(crawlerData.score)
  }
  return 'In Dev'
}

function groupIssues(issues = []) {
  return issues.reduce((groups, issue) => {
    const key = issue.type || 'Unknown issue'
    if (!groups[key]) {
      groups[key] = { items: [], severity: issue.severity || 'notice' }
    }
    groups[key].items.push(issue)
    const severityRank = { critical: 3, warning: 2, notice: 1 }
    if (severityRank[issue.severity] > severityRank[groups[key].severity]) {
      groups[key].severity = issue.severity
    }
    return groups
  }, {})
}

function getTopIssueGroups(issues = [], count = 3) {
  const grouped = groupIssues(issues)
  const severityRank = { critical: 3, warning: 2, notice: 1 }

  return Object.entries(grouped)
    .sort(([, a], [, b]) => {
      const sevDiff = severityRank[b.severity] - severityRank[a.severity]
      return sevDiff !== 0 ? sevDiff : b.items.length - a.items.length
    })
    .slice(0, count)
    .map(([type, group]) => ({ type, ...group }))
}

function getQuickWins(data) {
  const wins = []
  const issues = data?.a11y?.issues || []
  const readable = data?.readable

  const missingMeta = issues.find(i => i.type === 'Missing H1' || i.type?.includes('meta'))
  if (missingMeta) {
    wins.push({ title: 'Add meta description', desc: 'Improve click-through rate and AI understanding.', impact: 'High' })
  }

  const emptyLinks = issues.filter(i => i.type === 'Empty link')
  if (emptyLinks.length > 0) {
    wins.push({ title: 'Fix empty links', desc: `${emptyLinks.length} link(s) with no text — AI crawlers can't understand where they lead.`, impact: 'High' })
  }

  const missingAlt = issues.filter(i => i.type === 'Missing alt text')
  if (missingAlt.length > 0) {
    wins.push({ title: 'Add image alt text', desc: `${missingAlt.length} image(s) missing alt — reduces content understanding.`, impact: 'Medium' })
  }

  const wc = readable?.wordCount ?? 0
  if (wc < 300) {
    wins.push({ title: 'Add more content', desc: 'Content is too thin for comprehensive AI answers.', impact: 'High' })
  }

  if (wins.length === 0) {
    wins.push({ title: 'Site looks good', desc: 'No critical quick wins identified.', impact: 'Low' })
  }

  return wins.slice(0, 4)
}

function formatDelta(value) {
  if (value > 0) return `+${value}`
  return String(value)
}

/* ── Page component ─────────────────────────────────────────── */

export default function Overview() {
  const {
    data,
    loading,
    error,
    visibilityScore,
    issueCount,
    scoreBreakdown,
    analyzedAt,
    crawlerData
  } = useOutletContext()

  const modules = MODULE_ORDER.map(({ key, path, label, description }, idx) => ({
    key,
    number: idx + 1,
    path,
    label,
    description,
    icon: ModuleIcons[key],
    status: getModuleStatus(key, data, visibilityScore, crawlerData),
    isScoreReal: (key === 'ai-understanding' && data != null) || (key === 'crawler-access' && crawlerData != null)
  }))

  const topIssues = getTopIssueGroups(data?.a11y?.issues, 3)
  const quickWins = data ? getQuickWins(data) : []

  const availableScores = []
  if (data && visibilityScore != null) availableScores.push(visibilityScore)
  if (crawlerData && crawlerData.score != null) availableScores.push(crawlerData.score)

  const overallScore = availableScores.length > 0
    ? Math.round(availableScores.reduce((a, b) => a + b, 0) / availableScores.length)
    : null

  const scoreTone = getScoreTone(overallScore || 0)

  return (
    <div className="overview-dashboard">
      {error && <div className="error-banner">{error}</div>}

      <PageOverview
        data={data}
        loading={loading}
        crawlerData={crawlerData}
        score={overallScore}
        aiScore={visibilityScore}
        issueCount={data ? issueCount : null}
        analyzedAt={analyzedAt}
      />

      <section className="geo-overview-section" aria-labelledby="geo-overview-title">
        <h2 id="geo-overview-title" className="section-title">
          <span className="eyebrow">GEO Overview</span>
        </h2>

        <div className="geo-overview-grid">
          {modules.map(module => {
            const scoreDisplay = module.key === 'ai-understanding'
              ? visibilityScore
              : (module.key === 'crawler-access' && crawlerData ? crawlerData.score : 0)
            const tone = module.isScoreReal ? getScoreTone(scoreDisplay) : 'muted'
            return (
              <NavLink
                key={module.key}
                to={module.path}
                className={`geo-module-card ${module.isScoreReal ? 'has-data' : ''}`}
              >
                <div className="module-card-top">
                  <span className="module-number">{module.number}.</span>
                  <span className="module-icon" aria-hidden="true">
                    {module.icon}
                  </span>
                  <span className="module-name">{module.label}</span>
                </div>

                <div className="module-score">
                  <strong>{module.isScoreReal ? scoreDisplay : '-'}</strong>
                  <span>/100</span>
                </div>

                <ScoreBar score={module.isScoreReal ? scoreDisplay : 0} />

                <span className={`module-verdict tone-${tone}`}>
                  {module.status}
                </span>

                <p className="module-desc">{module.description}</p>

                <span className="module-link">
                  View details
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              </NavLink>
            )
          })}
        </div>
      </section>

      <section className="executive-summary-section" aria-labelledby="executive-title">
        <div className="executive-summary-grid">
          <div className="es-card es-card-trend">
            <div className="es-card-header">
              <h3>AI Visibility Trend</h3>
            </div>
            <div className="trend-score">
              <strong style={{ color: `var(--${scoreTone})` }}>{visibilityScore}</strong>
              <span>/ 100</span>
            </div>
            <ScoreBar score={visibilityScore} />
            <p className="es-muted">
              Score is calculated based on our AI SEO framework across 6 pillars.
            </p>
            <div className="breakdown-mini">
              {scoreBreakdown?.items?.map(item => (
                <div key={item.label}>
                  <span>{item.label}</span>
                  <strong className={item.value < 0 ? 'negative' : 'positive'}>
                    {formatDelta(item.value)}
                  </strong>
                </div>
              ))}
            </div>
          </div>

          <div className="es-card es-card-issues">
            <div className="es-card-header">
              <h3>Top Issues</h3>
              <NavLink to="/ai-understanding" className="es-view-all">
                View all issues →
              </NavLink>
            </div>
            {topIssues.length > 0 ? (
              <div className="top-issues-list">
                {topIssues.map(issue => (
                  <div key={issue.type} className="top-issue-item">
                    <span className={`issue-severity-tag ${issue.severity}`}>
                      {issue.severity}
                    </span>
                    <div className="top-issue-body">
                      <span className="top-issue-name">{issue.type}</span>
                    </div>
                    <span className="top-issue-count">{issue.items.length}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="issues-clean-inline">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--good)" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <p>No visibility blockers detected.</p>
              </div>
            )}
          </div>

          <div className="es-card es-card-wins">
            <div className="es-card-header">
              <h3>Quick Wins</h3>
              <span className="es-view-all">View all →</span>
            </div>
            <div className="quick-wins-list">
              {quickWins.map((win, i) => (
                <div key={i} className="quick-win-item">
                  <svg className="qw-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4l3 3" />
                  </svg>
                  <div className="qw-body">
                    <span className="qw-title">{win.title}</span>
                    <span className="qw-desc">{win.desc}</span>
                  </div>
                  <span className={`qw-impact impact-${win.impact.toLowerCase()}`}>
                    {win.impact} Impact
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="module-status-bar" aria-label="Module status">
        {modules.map(module => (
          <NavLink key={module.key} to={module.path} className="status-pill">
            <span className="status-pill-icon" aria-hidden="true">
              {module.icon}
            </span>
            <strong>{module.label}</strong>
            <span
              className={`status-pill-tag tone-${module.isScoreReal ? getScoreTone(visibilityScore) : 'muted'
                }`}
            >
              {module.status}
            </span>
          </NavLink>
        ))}
      </div>
    </div>
  )
}