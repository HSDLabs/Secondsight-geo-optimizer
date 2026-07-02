import { useEffect, useRef, useState, useMemo } from 'react'
import TreeNode from './TreeNode'

/**
 * VisibilityLayer – The polished "Layer 1 – Visibility Overview"
 *
 * A single, viewport-height section that combines:
 * 1. Human View   – 3D perspective website preview
 * 2. Machine Structure – Compact semantic tree
 * 3. LLM Extraction – Content summary + inline stats
 * 4. AI Visibility Score – Animated donut gauge
 *
 * Everything fits in one view without excessive scrolling.
 */

export default function VisibilityLayer({
  data,
  score,
  selectedNodeId,
  onSelectNode,
  screenshotMeta
}) {
  if (!data) return null

  const screenshot = data.screenshots?.viewport || data.screenshot
  const fullPageScreenshot = data.screenshots?.fullPage
  const snapshot = data.a11y?.snapshot
  const readable = data.readable

  return (
    <section className="visibility-layer" aria-labelledby="layer-1-title">
      <div className="layer-header">
        <p className="eyebrow">Layer 1 – Visibility Overview</p>
      </div>

      <div className="layer-grid">
        <HumanViewCompact
          screenshot={screenshot}
          fullPageScreenshot={fullPageScreenshot}
          screenshotMeta={screenshotMeta}
        />

        <MachineStructureCompact
          snapshot={snapshot}
          screenshotMeta={screenshotMeta}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
        />

        <LLMExtractionCompact readable={readable} />

        <ScoreGauge score={score} />
      </div>
    </section>
  )
}

function HumanViewCompact({ screenshot, fullPageScreenshot, screenshotMeta }) {
  const [mode, setMode] = useState('viewport')
  const [isHovered, setIsHovered] = useState(false)
  const frameRef = useRef(null)
  const activeScreenshot = mode === 'fullPage' ? fullPageScreenshot : screenshot
  const dimensions = screenshotMeta?.viewport
    ? `${screenshotMeta.viewport.width} × ${screenshotMeta.viewport.height}`
    : null

  return (
    <div className="layer-card human-card">
      <div className="layer-card-header">
        <div>
          <p className="card-eyebrow">What humans see</p>
          <h3>Human View</h3>
        </div>
        <span className="card-meta">{dimensions || ''}</span>
      </div>

      <div
        className="perspective-frame"
        ref={frameRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {activeScreenshot ? (
          <div className={`perspective-stage ${isHovered ? 'flat' : ''}`}>
            <div className="browser-chrome">
              <div className="chrome-dots">
                <span className="dot red" />
                <span className="dot yellow" />
                <span className="dot green" />
              </div>
              <div className="chrome-url-bar">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L12 12M12 12L8 8M12 12L16 8" />
                </svg>
                <span>{screenshotMeta?.url || 'Page Preview'}</span>
              </div>
            </div>
            <div className="browser-viewport">
              <img
                src={`data:image/png;base64,${activeScreenshot}`}
                alt="Analyzed page"
                draggable="false"
              />
            </div>
          </div>
        ) : (
          <div className="empty-preview">No screenshot captured.</div>
        )}
      </div>

      <div className="mode-bar">
        <button
          className={mode === 'viewport' ? 'active' : ''}
          type="button"
          onClick={() => setMode('viewport')}
        >
          Viewport
        </button>
        <button
          className={mode === 'fullPage' ? 'active' : ''}
          type="button"
          onClick={() => setMode('fullPage')}
        >
          Full Page
        </button>
      </div>
    </div>
  )
}

function MachineStructureCompact({ snapshot, screenshotMeta, selectedNodeId, onSelectNode }) {
  const selectedPath = useMemo(() => findNodePath(snapshot, selectedNodeId), [snapshot, selectedNodeId])
  const stats = useMemo(() => getTreeStats(snapshot), [snapshot])

  return (
    <div className="layer-card structure-card">
      <div className="layer-card-header">
        <div>
          <p className="card-eyebrow">What machines understand</p>
          <h3>Machine Structure</h3>
        </div>
        <span className="card-meta">Semantic tree</span>
      </div>

      <div className="structure-stats">
        {stats.map(([role, count]) => (
          <div key={role} className="struct-stat">
            <span className="struct-label">{role}</span>
            <span className="struct-value">{count}</span>
          </div>
        ))}
      </div>

      <div className="compact-tree">
        {snapshot && (
          <TreeNode
            node={snapshot}
            screenshotMeta={screenshotMeta}
            selectedNodeId={selectedNodeId}
            selectedPath={selectedPath}
            onSelectNode={onSelectNode}
          />
        )}
      </div>

      <button className="view-raw-btn" type="button" onClick={() => {}}>
        View raw structure
      </button>
    </div>
  )
}

function LLMExtractionCompact({ readable }) {
  const [activeTab, setActiveTab] = useState('summary')
  const summary = useMemo(() => summarizeReadable(readable), [readable])

  return (
    <div className="layer-card llm-card">
      <div className="layer-card-header">
        <div>
          <p className="card-eyebrow">What AI systems extract</p>
          <h3>LLM Extraction</h3>
        </div>
        <span className="card-meta">{readable?.wordCount ?? 0} words</span>
      </div>

      <div className="llm-tabs">
        {[['summary', 'Summary'], ['metadata', 'Metadata'], ['raw', 'Raw Extraction']].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={activeTab === id ? 'active' : ''}
            onClick={() => setActiveTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="llm-body">
        {activeTab === 'summary' && (
          <>
            <p className="llm-excerpt">{summary.overview}</p>

            <div className="llm-metrics">
              <div>
                <span>Words</span>
                <strong>{(readable?.wordCount ?? 0).toLocaleString()}</strong>
              </div>
              <div>
                <span>Headings</span>
                <strong>{summary.headings.length}</strong>
              </div>
              <div>
                <span>Signals</span>
                <strong>{summary.signalCount}</strong>
              </div>
            </div>
          </>
        )}

        {activeTab === 'metadata' && (
          <div className="llm-metadata">
            <div><span>Title</span><strong>{readable?.title || 'Not extracted'}</strong></div>
            <div><span>Excerpt</span><strong>{readable?.excerpt || 'Not extracted'}</strong></div>
            <div><span>Word count</span><strong>{(readable?.wordCount ?? 0).toLocaleString()}</strong></div>
          </div>
        )}

        {activeTab === 'raw' && (
          <div className="llm-raw">
            <pre>{readable?.markdown || 'No readable content extracted.'}</pre>
          </div>
        )}
      </div>

      <button className="view-raw-btn" type="button" onClick={() => setActiveTab('raw')}>
        View extracted content
      </button>
    </div>
  )
}

function ScoreGauge({ score }) {
  const gaugeRef = useRef(null)
  const [animatedScore, setAnimatedScore] = useState(0)
  const normalizedScore = Math.max(0, Math.min(100, score || 0))

  const scoreColor = normalizedScore >= 80
    ? '#48c78e'
    : normalizedScore >= 55
    ? '#f2b84b'
    : '#ff6b6b'

  const scoreLabel = normalizedScore >= 80
    ? 'Good'
    : normalizedScore >= 55
    ? 'Fair'
    : 'Poor'

  const scoreDescription = normalizedScore >= 80
    ? 'Strong AI visibility with solid content signals.'
    : normalizedScore >= 55
    ? 'Moderate visibility. Some improvements recommended.'
    : 'Low visibility. Significant improvements needed.'

  useEffect(() => {
    let frame
    const start = performance.now()
    const duration = 1200

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
    <div className="layer-card score-card">
      <p className="card-eyebrow center">AI Visibility Score</p>

      <div className="gauge-container" ref={gaugeRef}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="gauge-ring"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={scoreColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{
              filter: `drop-shadow(0 0 8px ${scoreColor}66)`,
              transition: 'stroke-dashoffset 0.3s ease'
            }}
          />
        </svg>

        <div className="gauge-label">
          <span className="gauge-number" style={{ color: scoreColor }}>
            {animatedScore}
          </span>
          <span className="gauge-max">/100</span>
        </div>
      </div>

      <div className="score-verdict" style={{ color: scoreColor }}>
        {scoreLabel}
      </div>
      <p className="score-desc">{scoreDescription}</p>

      <button
        className="view-raw-btn"
        type="button"
        onClick={() => {
          // Could open a modal or scroll to breakdown
        }}
      >
        View score breakdown
      </button>
    </div>
  )
}

function findNodePath(node, nodeId, path = []) {
  if (!node || !nodeId) return []
  const nextPath = [...path, node.id]
  if (node.id === nodeId) return nextPath
  for (const child of node.children || []) {
    const childPath = findNodePath(child, nodeId, nextPath)
    if (childPath.length) return childPath
  }
  return []
}

function getTreeStats(snapshot) {
  if (!snapshot) return []
  const counts = countAllRoles(snapshot)
  const order = [
    ['links', 'a'],
    ['images', 'img'],
    ['buttons', 'button'],
    ['inputs', 'input'],
    ['sections', 'section'],
    ['headings', ['h1', 'h2', 'h3']]
  ]

  return order
    .map(([label, roles]) => {
      const count = Array.isArray(roles)
        ? roles.reduce((sum, r) => sum + (counts[r] || 0), 0)
        : counts[roles] || 0
      return [label, count]
    })
    .filter(([, count]) => count > 0)
    .slice(0, 4)
}

function countAllRoles(node) {
  const acc = {}
  function walk(n) {
    if (!n) return
    const role = n.role || 'node'
    acc[role] = (acc[role] || 0) + 1
    for (const child of n.children || []) walk(child)
  }
  walk(node)
  return acc
}

function summarizeReadable(readable) {
  const markdown = readable?.markdown || ''
  const text = markdown.replace(/[#*_`[\]()]/g, ' ')
  const headings = [...markdown.matchAll(/^#{1,3}\s+(.+)$/gm)]
    .map(match => clean(match[1]))
    .filter(Boolean)
    .slice(0, 8)
  const entities = getEntities(text)
  const contact = getContactSignals(text)
  const business = getBusinessSignals(text)

  return {
    overview: readable?.excerpt || firstSentence(text) || 'No readable summary could be extracted.',
    headings,
    entities,
    contact,
    business,
    signalCount: entities.length + contact.length + business.length
  }
}

function getEntities(text) {
  const matches = text.match(/\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,3}\b/g) || []
  return unique(matches.map(clean))
    .filter(item => !/^(Read More|Learn More|Privacy Policy|Terms Conditions)$/i.test(item))
    .slice(0, 8)
}

function getContactSignals(text) {
  const signals = []
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]
  const phone = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]
  const address = text.match(/\b\d{2,6}\s+[A-Za-z0-9.,\s-]+(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Drive|Dr|Boulevard|Blvd)\b/i)?.[0]

  if (email) signals.push(email)
  if (phone) signals.push(clean(phone))
  if (address) signals.push(clean(address))

  return unique(signals).slice(0, 5)
}

function getBusinessSignals(text) {
  const lines = text
    .split(/\n+/)
    .map(clean)
    .filter(line => /\b(pricing|services|products|customers|locations|hours|booking|demo|support|about)\b/i.test(line))

  return unique(lines).slice(0, 6)
}

function firstSentence(text) {
  return clean(text).split(/(?<=[.!?])\s+/)[0]?.slice(0, 220)
}

function unique(items) {
  return [...new Set(items.filter(Boolean))]
}

function clean(value = '') {
  return value.replace(/\s+/g, ' ').trim()
}