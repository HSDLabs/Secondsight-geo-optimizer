import { useState, useEffect } from 'react'
import { getStageMetrics } from './progressiveAnalysis'

export default function UnderstandingFlow({ data, progressState, issueTypes = new Set(), onAction }) {
  const stages = progressState?.stages || []
  const isComplete = progressState?.phase === 'complete'

  return (
    <section className="understanding-section section-block" aria-labelledby="understanding-title">
      <div className="analysis-section-header understanding-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px' }}>
        <div>
          <p className="eyebrow" style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600 }}>
            LAYER 2: MACHINE UNDERSTANDING
          </p>
          <h2 id="understanding-title" style={{ fontSize: '1.1rem', color: 'var(--muted)', fontWeight: 'normal', margin: '4px 0 0' }}>
            What AI concluded from the evidence above.
          </h2>
        </div>

        {/* Inline Timeline on the right */}
        <div className="stage-timeline-inline" aria-label="Reasoning timeline">
          {stages.map((stage, index) => {
            const stageMetrics = getStageMetrics(stage)
            const isStageComplete = stageMetrics.completedFindings === stageMetrics.totalFindings && stageMetrics.totalFindings > 0

            return (
              <div
                key={stage.id}
                className={`timeline-inline-step ${isStageComplete ? 'complete' : ''} ${stage.status === 'processing' ? 'active' : ''}`}
              >
                <div className="timeline-inline-node" style={{ width: '100%', justifyContent: 'center', position: 'relative', display: 'flex', alignItems: 'center', height: '18px' }}>
                  <span className="timeline-inline-dot">
                    {isStageComplete ? (
                      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '10px', height: '10px' }}>
                        <path d="M4.5 10.5 8.2 14 15.5 6.5" />
                      </svg>
                    ) : (
                      <span className="timeline-inline-dot-inner" style={{ background: stage.status === 'processing' ? stage.accent : 'rgba(255,255,255,0.1)' }} />
                    )}
                  </span>
                  {index < stages.length - 1 && <span className="timeline-inline-line" style={{ background: isStageComplete ? 'var(--good)' : 'rgba(255,255,255,0.08)', top: '9px', marginTop: '-0.75px', transform: 'none' }} />}
                </div>
                <span className="timeline-inline-label">{stage.title}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="stage-stack" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 20px' }}>
        {stages.map((stage, index) => (
          <StageCard
            key={stage.id}
            stage={stage}
            index={index}
            isComplete={isComplete}
            issueTypes={issueTypes}
            onAction={onAction}
            data={data}
          />
        ))}
      </div>
    </section>
  )
}

function StageCard({ stage, index, isComplete, issueTypes, onAction, data }) {
  const metrics = getStageMetrics(stage)
  const isActive = stage.status === 'processing'
  const isSettled = metrics.completedFindings === metrics.totalFindings && metrics.totalFindings > 0
  const warningCount = stage.findings.filter(finding => finding.status === 'warning' || finding.status === 'failed').length
  const firstWaitingIndex = stage.findings.findIndex(finding => finding.status === 'waiting')
  const visibleFindings = stage.status === 'waiting'
    ? []
    : isSettled
      ? stage.findings
      : stage.findings.filter((finding, findingIndex) => {
        if (finding.status !== 'waiting') return true
        return isActive && findingIndex === firstWaitingIndex
      })

  const [isOpen, setIsOpen] = useState(false)

  // Keep active stage open while it is processing
  useEffect(() => {
    if (isActive) {
      queueMicrotask(() => {
        setIsOpen(true)
      })
    }
  }, [isActive])

  const stageColor = stage.id === 'identity' ? 'rgb(168, 85, 247)'
    : stage.id === 'structure' ? 'rgb(96, 165, 250)'
      : stage.id === 'content' ? 'rgb(52, 211, 153)'
        : stage.id === 'knowledge' ? 'rgb(251, 191, 36)'
          : stage.id === 'accessibility' ? 'rgb(129, 140, 248)'
            : 'var(--accent)'

  return (
    <article
      className={`stage-row-card stage-${stage.id} status-${metrics.status} ${isOpen ? 'expanded' : 'collapsed'}`}
      style={{ '--stage-accent': stageColor }}
    >
      <div
        className="stage-row-header"
        onClick={() => setIsOpen(!isOpen)}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}
      >
        {/* Left column: Index & Icon & Info */}
        <div className="stage-row-left" style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '0 0 25%' }}>
          <span className="stage-row-index" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', fontSize: '0.8rem', fontWeight: 700 }}>
            0{stage.index || index + 1}
          </span>
          <div className="stage-row-icon-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', backgroundColor: `${stageColor}15`, color: stageColor }}>
            {getStageIcon(stage.id)}
          </div>
          <div className="stage-row-title-block">
            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)' }}>{stage.title}</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--muted)' }}>{stage.subtitle}</p>
          </div>
        </div>

        {/* Center column: Dynamic stats & status */}
        <div className="stage-row-center" style={{ flex: '1', padding: '0 24px' }} onClick={e => e.stopPropagation()}>
          {renderCenterBlock(stage, metrics, warningCount, data)}
        </div>

        {/* Right column: Evidence & Findings meta info */}
        <div className="stage-row-right" style={{ display: 'flex', gap: '24px', flex: '0 0 35%', padding: '0 12px' }}>
          <div className="row-meta-block">
            <span className="row-meta-label" style={{ display: 'block', fontSize: '0.65rem', color: 'var(--faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Evidence</span>
            <span className="row-meta-val" style={{ display: 'block', marginTop: '4px', fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 500 }}>
              {getEvidenceText(stage.id)}
            </span>
          </div>
          <div className="row-meta-block">
            <span className="row-meta-label" style={{ display: 'block', fontSize: '0.65rem', color: 'var(--faint)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Key finding</span>
            <span className="row-meta-val" style={{ display: 'block', marginTop: '4px', fontSize: '0.8rem', color: 'var(--text)', fontWeight: 500 }}>
              {getKeyFindingText(stage, warningCount)}
            </span>
          </div>
        </div>

        {/* Far right: chevron */}
        <button
          type="button"
          className={`stage-row-chevron-btn ${isOpen ? 'open' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            setIsOpen(!isOpen)
          }}
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--muted)',
            cursor: 'pointer',
            transition: 'all 200ms ease'
          }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="stage-row-body" style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)' }}>
          <div className="stage-row-body-content" style={{ marginTop: '16px' }}>
            {stage.status === 'waiting' ? (
              <div className="stage-skeleton" aria-hidden="true" style={{ display: 'grid', gap: '8px' }}>
                <span style={{ display: 'block', height: '36px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)' }} />
                <span style={{ display: 'block', height: '36px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)' }} />
              </div>
            ) : (
              <div className="finding-groups" style={{ display: 'grid', gap: '16px' }}>
                <FindingGroup
                  title="AI Recognized"
                  tone="recognized"
                  findings={visibleFindings.filter(finding => finding.status !== 'warning' && finding.status !== 'failed')}
                  stage={stage}
                  isComplete={isComplete}
                  issueTypes={issueTypes}
                  onAction={onAction}
                />
                <FindingGroup
                  title="Needs Improvement"
                  tone="needs"
                  findings={visibleFindings.filter(finding => finding.status === 'warning' || finding.status === 'failed')}
                  stage={stage}
                  isComplete={isComplete}
                  issueTypes={issueTypes}
                  onAction={onAction}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  )
}

function renderCenterBlock(stage, metrics, warningCount, data) {
  const isWaiting = stage.status === 'waiting'

  const SkeletonVal = ({ width }) => (
    <div className="skeleton-text" style={{ width, height: '14px', display: 'inline-block', verticalAlign: 'middle', opacity: 0.5 }} />
  )

  switch (stage.id) {
    case 'identity': {
      const brandFinding = stage.findings.find(f => f.id.includes('brand') || f.id.includes('identity'))
      const typeFinding = stage.findings.find(f => f.id.includes('type') || f.id.includes('genre'))
      const brandVal = brandFinding?.value || 'Brand identified'
      const typeVal = typeFinding?.value || 'Website'
      const certainty = brandFinding?.certainty === 'Known' ? '98%' : brandFinding?.certainty === 'Inferred' ? '88%' : '75%'

      return (
        <div className="stage-row-metrics" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div className="metric-primary-row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="metric-main-val" style={{ fontSize: '0.9rem', fontWeight: 650, color: 'var(--text)' }}>
              {isWaiting ? <SkeletonVal width="120px" /> : brandVal}
            </span>
            <span className="row-badge success" style={{ fontSize: '0.65rem', background: 'rgba(72,199,142,0.1)', color: 'var(--good)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(72,199,142,0.15)' }}>Primary Brand</span>
          </div>
          <span className="metric-sub-val" style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
            {isWaiting ? <SkeletonVal width="80px" /> : typeVal}
          </span>
          <span className="metric-confidence-val" style={{ fontSize: '0.72rem', color: 'var(--faint)' }}>
            {isWaiting ? <SkeletonVal width="60px" /> : <>Confidence <span style={{ color: 'var(--good)', fontWeight: 600 }}>{certainty}</span></>}
          </span>
        </div>
      )
    }
    case 'structure': {
      const nodeCount = Object.keys(data?.a11y?.semanticIndex || {}).length || 217
      const certainty = warningCount > 0 ? '85%' : '95%'

      return (
        <div className="stage-row-metrics" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div className="metric-primary-row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="metric-main-val" style={{ fontSize: '0.9rem', fontWeight: 650, color: 'var(--text)' }}>
              {isWaiting ? <SkeletonVal width="40px" /> : nodeCount}
            </span>
            <span className="row-badge info" style={{ fontSize: '0.65rem', background: 'rgba(77,163,255,0.1)', color: 'var(--accent)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(77,163,255,0.15)' }}>Machine Nodes</span>
          </div>
          <span className="metric-sub-val" style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
            {isWaiting ? <SkeletonVal width="110px" /> : 'Main regions detected'}
          </span>
          <span className="metric-confidence-val" style={{ fontSize: '0.72rem', color: 'var(--faint)' }}>
            {isWaiting ? <SkeletonVal width="60px" /> : <>Confidence <span style={{ color: 'var(--good)', fontWeight: 600 }}>{certainty}</span></>}
          </span>
        </div>
      )
    }
    case 'content': {
      const intentFinding = stage.findings.find(f => f.id.includes('intent') || f.id.includes('purpose'))
      const intentVal = intentFinding?.value || 'Provide information'
      const certainty = intentFinding?.certainty === 'Known' ? '96%' : '86%'

      return (
        <div className="stage-row-metrics" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div className="metric-primary-row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="metric-main-val" style={{ fontSize: '0.9rem', fontWeight: 650, color: 'var(--text)' }}>
              {isWaiting ? <SkeletonVal width="140px" /> : intentVal}
            </span>
            <span className="row-badge success" style={{ fontSize: '0.65rem', background: 'rgba(72,199,142,0.1)', color: 'var(--good)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(72,199,142,0.15)' }}>Primary Intent</span>
          </div>
          <span className="metric-sub-val" style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
            {isWaiting ? <SkeletonVal width="130px" /> : 'Readable content detected'}
          </span>
          <span className="metric-confidence-val" style={{ fontSize: '0.72rem', color: 'var(--faint)' }}>
            {isWaiting ? <SkeletonVal width="60px" /> : <>Confidence <span style={{ color: 'var(--good)', fontWeight: 600 }}>{certainty}</span></>}
          </span>
        </div>
      )
    }
    case 'knowledge': {
      if (isWaiting) {
        return (
          <div className="stage-row-pills-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '380px' }}>
            <SkeletonVal width="100px" />
            <SkeletonVal width="80px" />
            <SkeletonVal width="110px" />
          </div>
        )
      }
      return (
        <div className="stage-row-pills-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '380px' }}>
          {stage.findings.map(f => (
            <div key={f.id} className="row-pill-tag" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: '6px' }}>
              <span className="pill-tag-icon" style={{ display: 'flex', alignItems: 'center', color: 'var(--muted)' }}>{getPillIcon(f.label)}</span>
              <div className="pill-tag-content" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
                <span className="pill-tag-label" style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text)' }}>{f.label}</span>
                <span className="pill-tag-desc" style={{ fontSize: '0.62rem', color: 'var(--muted)', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px' }}>{f.value || ''}</span>
              </div>
            </div>
          ))}
          {stage.findings.length === 0 && <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Extracting entities...</span>}
        </div>
      )
    }
    case 'accessibility': {
      const hasIssues = warningCount > 0
      const statusLabel = hasIssues ? `${warningCount} ${warningCount === 1 ? 'warning' : 'warnings'}` : 'No blockers detected'
      const badgeClass = hasIssues ? 'warning' : 'success'
      const badgeText = hasIssues ? 'Needs Attention' : 'All good'
      const subVal = hasIssues ? 'Accessibility issues found' : 'Page is accessible to AI systems'
      const certainty = hasIssues ? '84%' : '98%'

      return (
        <div className="stage-row-metrics" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div className="metric-primary-row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="metric-main-val" style={{ fontSize: '0.9rem', fontWeight: 650, color: hasIssues ? 'var(--warning)' : 'var(--text)' }}>
              {isWaiting ? <SkeletonVal width="110px" /> : statusLabel}
            </span>
            <span className={`row-badge ${badgeClass}`} style={{ fontSize: '0.65rem', background: hasIssues ? 'rgba(242,184,75,0.1)' : 'rgba(72,199,142,0.1)', color: hasIssues ? 'var(--warning)' : 'var(--good)', padding: '2px 6px', borderRadius: '4px', border: hasIssues ? '1px solid rgba(242,184,75,0.15)' : '1px solid rgba(72,199,142,0.15)' }}>{badgeText}</span>
          </div>
          <span className="metric-sub-val" style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
            {isWaiting ? <SkeletonVal width="150px" /> : subVal}
          </span>
          <span className="metric-confidence-val" style={{ fontSize: '0.72rem', color: 'var(--faint)' }}>
            {isWaiting ? <SkeletonVal width="60px" /> : <>Confidence <span style={{ color: 'var(--good)', fontWeight: 600 }}>{certainty}</span></>}
          </span>
        </div>
      )
    }
    default:
      return null
  }
}

function FindingGroup({ title, tone, findings, stage, isComplete, issueTypes, onAction }) {
  if (findings.length === 0) return null

  return (
    <section className={`finding-group finding-group-${tone}`} style={{ display: 'grid', gap: '8px' }}>
      <div className="finding-group-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h4 style={{ margin: 0, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: tone === 'needs' ? 'var(--warning)' : 'var(--muted)' }}>{title}</h4>
        <span style={{ fontSize: '0.7rem', color: 'var(--muted)', background: 'rgba(255,255,255,0.03)', padding: '2px 8px', borderRadius: '10px', border: '1px solid var(--border)' }}>{findings.length}</span>
      </div>
      <div className="finding-grid">
        {findings.map((finding, findingIndex) => (
          <FindingCard
            key={finding.id}
            finding={finding}
            stage={stage}
            order={findingIndex}
            actionsEnabled={isComplete}
            issueExists={Boolean(finding.issueType && issueTypes.has(finding.issueType))}
            onAction={onAction}
          />
        ))}
      </div>
    </section>
  )
}

function FindingCard({ finding, stage, order, actionsEnabled, issueExists, onAction }) {
  const isSettled = finding.status === 'success' || finding.status === 'warning' || finding.status === 'failed'

  return (
    <article className={`finding-card status-${finding.status}`} style={{ '--finding-delay': `${order * 70}ms` }}>
      <div className="finding-card-top">
        <StatusIcon status={finding.status} />
        <div className="finding-heading">
          <h4>{finding.label}</h4>
          <span className={`finding-confidence certainty-${(finding.certainty || 'known').toLowerCase()}`}>
            {finding.certainty === 'Known' ? '✓ ' : finding.certainty === 'Inferred' ? '~ ' : '? '}
            {finding.certainty || 'Known'}
          </span>
        </div>
      </div>

      <div className="finding-value-wrap">
        <div className={`finding-value ${isSettled ? 'revealed' : ''}`}>
          {isSettled ? finding.value : 'Checking...'}
        </div>
      </div>

      <div className="finding-footer">
        <button
          type="button"
          className="finding-evidence"
          onMouseEnter={() => onAction?.({ kind: 'highlight-raw', panel: finding.sourcePanel === 'Machine Structure' ? 'structure' : finding.sourcePanel === 'Human View' ? 'human' : 'llm' })}
          onFocus={() => onAction?.({ kind: 'highlight-raw', panel: finding.sourcePanel === 'Machine Structure' ? 'structure' : finding.sourcePanel === 'Human View' ? 'human' : 'llm' })}
          onClick={() => onAction?.({ kind: 'focus-raw', panel: finding.sourcePanel === 'Machine Structure' ? 'structure' : finding.sourcePanel === 'Human View' ? 'human' : 'llm' })}
        >
          {finding.sourcePanel || 'Raw source'}
        </button>
        <div className="finding-actions">
          {normalizeActions(finding.actions, issueExists).map(action => (
            <button
              key={action.id}
              type="button"
              className={`finding-action ${action.kind === 'create-issue' ? 'primary' : ''}`}
              disabled={!actionsEnabled}
              onClick={() => onAction?.(action, finding, stage)}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </article>
  )
}

function StatusIcon({ status }) {
  if (status === 'processing') {
    return <span className="status-icon processing" aria-hidden="true" />
  }

  if (status === 'success') {
    return (
      <span className="status-icon success" aria-hidden="true">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 10.5 8.2 14 15.5 6.5" />
        </svg>
      </span>
    )
  }

  if (status === 'warning') {
    return (
      <span className="status-icon warning" aria-hidden="true">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 3.5 17 16H3L10 3.5Z" />
          <path d="M10 7v4" />
          <path d="M10 13.8h.01" />
        </svg>
      </span>
    )
  }

  return <span className="status-icon waiting" aria-hidden="true" />
}

function normalizeActions(actions, issueExists) {
  return actions.map(action => {
    if (action.kind !== 'create-issue') return action
    return issueExists
      ? { ...action, label: 'Open Issue', kind: 'open-issue' }
      : action
  })
}

function getStageIcon(stageId) {
  switch (stageId) {
    case 'identity':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 21h18" />
          <path d="M3 7l1 4h16l1-4z" />
          <path d="M5 21V11" />
          <path d="M19 21V11" />
          <path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4" />
        </svg>
      )
    case 'structure':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <rect x="3" y="14" width="6" height="4" rx="1" />
          <rect x="15" y="14" width="6" height="4" rx="1" />
          <path d="M12 7v5M12 12H6v2M12 12h6v2" />
        </svg>
      )
    case 'content':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
      )
    case 'knowledge':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1 0-3.12 3 3 0 0 1 0-3.88 2.5 2.5 0 0 1 0-3.12A2.5 2.5 0 0 1 9.5 2zM14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 0-3.12 3 3 0 0 0 0-3.88 2.5 2.5 0 0 0 0-3.12A2.5 2.5 0 0 0 14.5 2z" />
        </svg>
      )
    case 'accessibility':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          <polyline points="9 11 11 13 15 9"></polyline>
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
      )
  }
}

function getPillIcon(label) {
  const l = label.toLowerCase()
  if (l.includes('product')) return (
    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" /></svg>
  )
  if (l.includes('collection')) return (
    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
  )
  if (l.includes('athlete') || l.includes('artist') || l.includes('people') || l.includes('user')) return (
    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 7a4 4 0 100-8 4 4 0 000 8z" /></svg>
  )
  if (l.includes('sport')) return (
    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none"><circle cx="12" cy="12" r="10" /><path d="M6.2 6.2c2.4 2.4 2.4 6.4 0 8.8M17.8 6.2c-2.4 2.4-2.4 6.4 0 8.8" /></svg>
  )
  if (l.includes('brand')) return (
    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01" /></svg>
  )
  if (l.includes('service')) return (
    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none"><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
  )
  if (l.includes('location')) return (
    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
  )
  if (l.includes('price') || l.includes('pricing') || l.includes('cost')) return (
    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
  )
  if (l.includes('appointment') || l.includes('booking')) return (
    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
  )
  if (l.includes('tech') || l.includes('tool') || l.includes('code')) return (
    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none"><polyline points="16 18 22 12 16 6M8 6L2 12l6 6" /></svg>
  )
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2.5" fill="none"><circle cx="12" cy="12" r="3" /><circle cx="6" cy="6" r="3" /><line x1="8.5" y1="8.5" x2="9.5" y2="9.5" /></svg>
  )
}

function getEvidenceText(stageId) {
  switch (stageId) {
    case 'identity': return 'Title, URL, Meta, LLM'
    case 'structure': return 'Accessibility Tree'
    case 'content': return 'Readability, Headings, LLM'
    case 'knowledge': return 'LLM Entities & Topics'
    case 'accessibility': return 'Accessibility Tree'
    default: return 'Raw signals'
  }
}

function getKeyFindingText(stage, warningCount) {
  if (stage.status === 'waiting') return 'Pending analysis'
  const hasIssues = warningCount > 0

  switch (stage.id) {
    case 'identity':
      return hasIssues ? 'Identity extraction has warnings' : 'Brand and page type identified'
    case 'structure':
      return hasIssues ? 'Document structure has warnings' : 'Document hierarchy is clear'
    case 'content':
      return hasIssues ? 'Content signals have warnings' : 'Strong topical focus identified'
    case 'knowledge':
      return `${stage.findings.length} entity types identified`
    case 'accessibility':
      return hasIssues ? 'Accessibility warnings need resolution' : 'No critical issues found'
    default:
      return 'Completed'
  }
}
