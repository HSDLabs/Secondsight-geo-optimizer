import { useState, useEffect } from 'react'

function formatUrl(url) {
  try {
    const parsed = new URL(url)
    return parsed.href
  } catch {
    return url
  }
}

function formatAnalyzedAt(iso) {
  if (!iso) return null
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) +
      '  •  ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function getScoreColor(score) {
  if (score >= 80) return '#48c78e'
  if (score >= 55) return '#f2b84b'
  return '#ff6b6b'
}

function getScoreLabel(score) {
  if (score >= 80) return 'Excellent'
  if (score >= 65) return 'Good'
  if (score >= 55) return 'Moderate'
  if (score >= 40) return 'Fair'
  return 'Poor'
}

function getTone(score) {
  if (score >= 80) return 'good'
  if (score >= 55) return 'warning'
  return 'poor'
}

const PILLAR_MODULES = [
  { label: 'Crawler Access' },
  { label: 'AI Understanding', isReal: true },
  { label: 'Retrieval Readiness' },
  { label: 'Citation Readiness' },
  { label: 'Content Quality' }
]

/* ── Animated donut gauge ── */

function ScoreGauge({ score }) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const normalizedScore = Math.max(0, Math.min(100, score || 0))
  const scoreColor = getScoreColor(normalizedScore)
  const scoreLabel = getScoreLabel(normalizedScore)

  useEffect(() => {
    let frame
    const start = performance.now()
    const duration = 1000

    function animate(now) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setAnimatedScore(Math.round(eased * normalizedScore))
      if (progress < 1) frame = requestAnimationFrame(animate)
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [normalizedScore])

  const size = 128
  const strokeWidth = 10
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (animatedScore / 100) * circumference

  return (
    <div className="hero-gauge">
      <p className="eyebrow" style={{ textAlign: 'center' }}>SecondSight GEO Score (Beta)</p>
      <div className="gauge-container">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="gauge-ring">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={scoreColor} strokeWidth={strokeWidth}
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ filter: `drop-shadow(0 0 8px ${scoreColor}66)`, transition: 'stroke-dashoffset 0.3s ease' }}
          />
        </svg>
        <div className="gauge-label">
          <span className="gauge-number" style={{ color: scoreColor }}>{animatedScore}</span>
          <span className="gauge-max">/100</span>
        </div>
      </div>
      <div className="gauge-verdict" style={{ color: scoreColor }}>{scoreLabel}</div>
      <p className="gauge-desc">
        {normalizedScore >= 65
          ? 'Your site has good foundation for AI visibility.'
          : 'Needs improvement to reach AI visibility.'}
      </p>
    </div>
  )
}

/* ── 3D Perspective Thumbnail ── */

function PerspectiveThumbnail({ screenshot, url }) {
  const [isHovered, setIsHovered] = useState(false)

  if (!screenshot) return null

  return (
    <div
      className="hero-perspective-frame"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`perspective-stage ${isHovered ? 'flat' : ''}`}>
        <div className="browser-chrome">
          <div className="chrome-dots">
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
          </div>
          <div className="chrome-url-bar">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span>{url || 'Page Preview'}</span>
          </div>
        </div>
        <div className="browser-viewport">
          <img
            src={`data:image/png;base64,${screenshot}`}
            alt="Analyzed page"
            draggable="false"
          />
        </div>
      </div>
    </div>
  )
}

/* ── Main PageOverview ── */

export default function PageOverview({ data, score, analyzedAt }) {
  const screenshot = data?.screenshots?.viewport || data?.screenshot
  const title = data?.title || data?.readable?.title || 'Untitled page'

  return (
    <section className="overview-card overview-hero" aria-labelledby="overview-title">
      {/* Left: 3D perspective thumbnail */}
      <PerspectiveThumbnail screenshot={screenshot} url={data.url} />

      {/* Center: Page info */}
      <div className="hero-meta">
        <h2 id="overview-title">{title}</h2>
        <div className="hero-meta-row">
          <a href={data.url} target="_blank" rel="noreferrer" className="hero-url">
            {formatUrl(data.url)}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
            </svg>
          </a>
        </div>
        {analyzedAt && (
          <p className="hero-last-analyzed">
            Analyzed on {formatAnalyzedAt(analyzedAt)}
          </p>
        )}
      </div>

      {/* Right-center: Donut gauge */}
      <ScoreGauge score={score} />

      {/* Far right: Pillar scores */}
      <div className="hero-pillar-list" aria-label="Pillar scores">
        <div className="pillar-list-header">
          <span className="pillar-list-title">Pillar Scores</span>
          <NavLink className="pillar-view-link">View details →</NavLink>
        </div>
        {PILLAR_MODULES.map(module => {
          const isReal = module.isReal && score != null
          const val = isReal ? score : 0
          const tone = isReal ? getTone(val) : 'muted'
          const label = isReal ? getScoreLabel(val) : 'Coming'
          return (
            <div key={module.label} className="pillar-row">
              <span className="pillar-row-label">{module.label}</span>
              <div className="pillar-row-bar">
                <div
                  className={`pillar-row-fill tone-${tone}`}
                  style={{ width: `${val}%` }}
                />
              </div>
              <span className="pillar-row-value">{val}</span>
              <span className={`pillar-row-status tone-${tone}`}>{label}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* NavLink placeholder for pillar detail (not used yet) */
function NavLink({ className, children }) {
  return <span className={className}>{children}</span>
}
