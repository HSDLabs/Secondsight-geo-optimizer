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
  { label: 'Machine Understanding', isReal: true },
  { label: 'External Intelligence' }
]

function ScoreGauge({ score, isAwaiting, loading }) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const normalizedScore = Math.max(0, Math.min(100, score || 0))
  const isReal = !isAwaiting && !loading && score != null
  const scoreColor = isReal ? getScoreColor(normalizedScore) : 'var(--border-strong)'
  const scoreLabel = isReal ? getScoreLabel(normalizedScore) : (loading ? 'Analyzing...' : 'Awaiting')

  useEffect(() => {
    let frame
    const start = performance.now()
    const duration = 1000

    function animate(now) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 5) // ease-out-quint
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
  const offset = isReal ? (circumference - (animatedScore / 100) * circumference) : circumference

  return (
    <div className="hero-gauge">
      <p className="eyebrow">SecondSight GEO Score (Beta)</p>
      <div className="gauge-container">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="gauge-ring">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={scoreColor} strokeWidth={strokeWidth}
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.23, 1, 0.32, 1)' }}
          />
        </svg>
        <div className="gauge-label">
          <span className="gauge-number" style={{ color: isReal ? scoreColor : 'var(--muted)' }}>
            {isReal ? animatedScore : '-'}
          </span>
          <span className="gauge-max">/100</span>
        </div>
      </div>
      <div className="gauge-verdict" style={{ color: isReal ? scoreColor : 'var(--muted)' }}>{scoreLabel}</div>
      <p className="gauge-desc">
        {!isReal
          ? (loading ? 'Building visibility score...' : 'Enter a URL above to calculate the GEO Score.')
          : (normalizedScore >= 65
            ? 'Your site has good foundation for AI visibility.'
            : 'Needs improvement to reach AI visibility.')}
      </p>
    </div>
  )
}

function PerspectiveThumbnail({ screenshot, url }) {
  const [isHovered, setIsHovered] = useState(false)

  if (!screenshot) {
    return (
      <div className="hero-perspective-frame skeleton-frame">
        <div className="perspective-stage skeleton-stage">
          <div className="skeleton-image" style={{ width: '100%', height: '120px', background: 'var(--border)', borderRadius: '6px', opacity: 0.5 }} />
        </div>
      </div>
    )
  }

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

export default function PageOverview({ data, loading, crawlerScore, score, aiScore, externalScore, analyzedAt }) {
  const screenshot = data?.screenshots?.viewport || data?.screenshot
  const title = data?.title || data?.readable?.title || (loading ? 'Analyzing page...' : 'Ready for Analysis')
  const url = data?.url || (loading ? 'Scanning target...' : 'Enter a public URL to get started.')
  const isAwaiting = !data && !loading

  return (
    <section className={`overview-card overview-hero ${loading ? 'is-loading' : ''} ${isAwaiting ? 'is-awaiting' : ''}`} aria-labelledby="overview-title">
      <PerspectiveThumbnail screenshot={screenshot} url={url} />

      <div className="hero-meta">
        <h2 id="overview-title" className={loading && !data ? 'skeleton-text' : ''} style={{ width: loading && !data ? '200px' : 'auto', color: isAwaiting ? 'var(--muted)' : 'inherit' }}>{title}</h2>
        <div className="hero-meta-row">
          <a href={url} target="_blank" rel="noreferrer" className="hero-url" style={{ pointerEvents: isAwaiting || loading ? 'none' : 'auto', opacity: isAwaiting || loading ? 0.5 : 1 }}>
            {formatUrl(url)}
            {!isAwaiting && !loading && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
              </svg>
            )}
          </a>
        </div>
        {analyzedAt && !isAwaiting && !loading && (
          <p className="hero-last-analyzed">
            Analyzed on {formatAnalyzedAt(analyzedAt)}
          </p>
        )}
      </div>

      <ScoreGauge score={score} isAwaiting={isAwaiting} loading={loading} />

      <div className="hero-pillar-list" aria-label="Pillar scores">
        <div className="pillar-list-header">
          <span className="pillar-list-title">Pillar Scores</span>
          <NavLink className="pillar-view-link">View details →</NavLink>
        </div>
        {PILLAR_MODULES.map(module => {
          const isReal = (module.label === 'Machine Understanding' && !isAwaiting && (aiScore != null || loading)) ||
            (module.label === 'Crawler Access' && crawlerScore != null) ||
            (module.label === 'External Intelligence' && externalScore != null)

          let val = 0;
          if (module.label === 'Machine Understanding') val = aiScore ?? 0;
          if (module.label === 'Crawler Access') val = crawlerScore ?? 0;
          if (module.label === 'External Intelligence') val = externalScore ?? 0;

          const tone = isReal ? getTone(val) : 'muted'

          let label = 'In Dev'
          if (loading) {
            label = 'Analyzing...'
          } else if (isAwaiting) {
            label = 'Awaiting'
          } else if (isReal) {
            label = getScoreLabel(val)
          }

          return (
            <div key={module.label} className="pillar-row">
              <span className="pillar-row-label">{module.label}</span>
              <div className="pillar-row-bar">
                <div
                  className={`pillar-row-fill tone-${tone}`}
                  style={{ width: `${isReal ? val : 0}%` }}
                />
              </div>
              <span className="pillar-row-value">{isReal ? val : '-'}</span>
              <span className={`pillar-row-status tone-${tone}`}>{label}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function NavLink({ className, children }) {
  return <span className={className}>{children}</span>
}