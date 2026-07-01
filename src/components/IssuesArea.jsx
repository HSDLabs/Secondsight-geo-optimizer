import { useState, useEffect, useRef } from 'react'

/* ─── Fix Guides ─── */
const FIX_GUIDES = {
  'Missing alt text': {
    title: 'Add Descriptive Alt Text to Images',
    impact: 'Images without alt text are invisible to AI systems, screen readers, and search engines. This is one of the highest-impact accessibility and GEO issues.',
    why: 'When an LLM crawls a page, it cannot "see" images. The alt attribute is the only way for machines to understand image content. Missing alt text means lost context for AI answers, citations, and summaries.',
    steps: [
      'Locate each flagged <img> element in your HTML',
      'Add a descriptive alt attribute that explains the image\'s content or purpose',
      'Keep alt text concise (under 125 characters) but meaningful',
      'For decorative images, use alt="" (empty string) to mark them as decorative',
      'For complex images (charts, infographics), consider adding a longer description nearby'
    ],
    codeBefore: '<img src="product-hero.jpg">',
    codeAfter: '<img src="product-hero.jpg" alt="Premium wireless headphones with noise cancellation in matte black finish">',
    resources: [
      { label: 'W3C Alt Text Decision Tree', url: 'https://www.w3.org/WAI/tutorials/images/decision-tree/' },
      { label: 'WebAIM Alt Text Guide', url: 'https://webaim.org/techniques/alttext/' }
    ]
  },
  'Unlabeled button': {
    title: 'Add Accessible Labels to Buttons',
    impact: 'Buttons without labels are useless to AI agents, assistive tech, and automated tools. They appear as "unnamed interactive element" in machine views.',
    why: 'AI systems trying to understand page interactivity (e.g., "what actions can a user take?") rely on button labels. Unlabeled buttons create gaps in the AI\'s understanding of your page\'s functionality.',
    steps: [
      'Add visible text content inside the button element',
      'For icon-only buttons, add an aria-label attribute',
      'If using SVG icons, add role="img" and aria-label to the SVG, or aria-label to the parent button',
      'Ensure the label describes the action (e.g., "Close menu") not the icon ("X")'
    ],
    codeBefore: '<button class="icon-btn">\n  <svg><!-- hamburger icon --></svg>\n</button>',
    codeAfter: '<button class="icon-btn" aria-label="Open navigation menu">\n  <svg aria-hidden="true"><!-- hamburger icon --></svg>\n</button>',
    resources: [
      { label: 'MDN: Button Accessibility', url: 'https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/button_role' }
    ]
  },
  'Empty link': {
    title: 'Add Meaningful Text to Links',
    impact: 'Empty links are invisible navigation for machines. AI systems cannot recommend, cite, or navigate through links they can\'t label.',
    why: 'When an AI system builds a navigation map of your site, empty links become dead ends. This hurts both citation potential and crawl efficiency.',
    steps: [
      'Add descriptive visible text inside the <a> element',
      'For icon links, add an aria-label describing the destination',
      'Avoid generic text like "click here" — describe where the link goes',
      'If the link wraps an image, ensure the image has alt text'
    ],
    codeBefore: '<a href="/pricing">\n  <svg><!-- arrow icon --></svg>\n</a>',
    codeAfter: '<a href="/pricing" aria-label="View pricing plans">\n  <svg aria-hidden="true"><!-- arrow icon --></svg>\n</a>',
    resources: [
      { label: 'WebAIM: Links and Hypertext', url: 'https://webaim.org/techniques/hypertext/' }
    ]
  },
  'Unlabeled input': {
    title: 'Associate Labels with Form Inputs',
    impact: 'Inputs without labels confuse AI form analysis and break assistive tech. Machines cannot determine what information a field expects.',
    why: 'AI systems analyzing page functionality need to understand form purpose. Unlabeled inputs appear as "unknown data entry" — severely limiting AI\'s ability to describe your page\'s capabilities.',
    steps: [
      'Add a <label> element with a for attribute matching the input\'s id',
      'Alternatively, wrap the input inside a <label> element',
      'For inputs where a visible label isn\'t desired, use aria-label',
      'Add placeholder text as a supplement (not a replacement) for labels'
    ],
    codeBefore: '<input type="email" id="email" placeholder="Enter email">',
    codeAfter: '<label for="email">Email address</label>\n<input type="email" id="email" placeholder="Enter email">',
    resources: [
      { label: 'MDN: Labels', url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/label' }
    ]
  },
  'Missing H1': {
    title: 'Add a Primary H1 Heading',
    impact: 'The H1 is the #1 signal AI systems use to understand page topic. Without it, your page has no clear "title" for machines.',
    why: 'Every major LLM and search engine treats the H1 as the strongest topical signal on a page. Missing H1 means AI systems must guess your page\'s primary topic from context — reducing accuracy and citation likelihood.',
    steps: [
      'Add exactly one <h1> element near the top of your main content',
      'Make it descriptive of the page\'s primary topic or purpose',
      'Keep it concise but specific (e.g., "Enterprise Cloud Security Solutions" not just "Home")',
      'Ensure the H1 is visible and not hidden with CSS'
    ],
    codeBefore: '<main>\n  <div class="hero">\n    <p class="big-text">Welcome to our platform</p>\n  </div>\n</main>',
    codeAfter: '<main>\n  <div class="hero">\n    <h1>AI-Powered Project Management Platform</h1>\n    <p>Welcome to our platform</p>\n  </div>\n</main>',
    resources: [
      { label: 'MDN: Heading Elements', url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements' }
    ]
  }
}

const DEFAULT_GUIDE = {
  title: 'Fix This Accessibility Issue',
  impact: 'Accessibility issues reduce AI visibility by making page content and structure harder for machines to interpret.',
  why: 'AI systems rely on well-structured, labeled HTML to understand page content. Any gap in labeling or structure means lost information.',
  steps: [
    'Review the affected elements listed above',
    'Check the element\'s role, label, and context',
    'Add appropriate ARIA labels or semantic HTML',
    'Re-analyze the page to verify the fix'
  ],
  codeBefore: '<!-- issue-specific example -->',
  codeAfter: '<!-- issue-specific fix -->',
  resources: [
    { label: 'W3C WCAG Quick Reference', url: 'https://www.w3.org/WAI/WCAG21/quickref/' }
  ]
}

/* ─── Severity Config ─── */
const SEVERITY_CONFIG = {
  critical: { label: 'Critical', color: 'var(--poor)', icon: '✕', bg: 'rgba(255, 107, 107, 0.1)' },
  warning: { label: 'Warning', color: 'var(--warning)', icon: '⚠', bg: 'rgba(242, 184, 75, 0.1)' },
  notice: { label: 'Notice', color: 'var(--accent)', icon: 'ℹ', bg: 'rgba(77, 163, 255, 0.1)' }
}

const CONFIDENCE_CONFIG = {
  High: { color: 'var(--good)', label: 'High Confidence' },
  Medium: { color: 'var(--warning)', label: 'Medium Confidence' },
  Low: { color: 'var(--muted)', label: 'Low Confidence' }
}

/* ─── Human-readable descriptions per issue type ─── */
function getIssueDescription(type, count) {
  const descriptions = {
    'Missing alt text': `${count} image${count > 1 ? 's' : ''} missing alt text — AI systems and screen readers can't understand ${count > 1 ? 'these images' : 'this image'}. This directly hurts your page's ability to be cited in AI answers.`,
    'Unlabeled button': `${count} button${count > 1 ? 's' : ''} without accessible labels — machines see ${count > 1 ? 'these' : 'this'} as unknown interactive ${count > 1 ? 'elements' : 'element'}. AI agents can't describe your page's functionality.`,
    'Empty link': `${count} link${count > 1 ? 's' : ''} with no text — AI crawlers can't understand where ${count > 1 ? 'these links' : 'this link'} lead. Navigation becomes a black box for machines.`,
    'Unlabeled input': `${count} form input${count > 1 ? 's' : ''} without labels — automated systems can't determine what data ${count > 1 ? 'these fields' : 'this field'} expect. This breaks AI form comprehension.`,
    'Missing H1': 'No H1 heading found on the page — this is the strongest topical signal for AI systems. Without it, your page topic is ambiguous to machines.',
  }

  // Handle "Multiple H1s" which has dynamic names
  if (type.startsWith('Multiple H1s')) {
    return `${type} found — having more than one H1 dilutes the primary topic signal. AI systems may not know which heading defines the page.`
  }

  return descriptions[type] || `${count} instance${count > 1 ? 's' : ''} of "${type}" detected — this may reduce how well AI systems understand your page.`
}

function groupIssues(issues) {
  return issues.reduce((groups, issue) => {
    const key = issue.type || 'Unknown issue'
    groups[key] = groups[key] || []
    groups[key].push(issue)
    return groups
  }, {})
}

export default function IssuesArea({
  issues = [],
  semanticIndex = {},
  selectedIssue,
  selectedNodeId,
  onSelectIssue,
  onSelectNode
}) {
  const groupedIssues = groupIssues(issues)
  const issueTypes = Object.keys(groupedIssues)
  const [fixModalIssue, setFixModalIssue] = useState(null)

  // Count critical vs warning
  const criticalCount = issues.filter(i => i.severity === 'critical').length
  const warningCount = issues.filter(i => i.severity === 'warning').length

  return (
    <>
      <section className="section-block issues-section" aria-labelledby="issues-title">
        <div className="section-header">
          <div>
            <p className="eyebrow">Issues</p>
            <h2 id="issues-title">Visibility Blockers</h2>
          </div>
          <div className="issues-summary-badges">
            {criticalCount > 0 && (
              <span className="issue-badge issue-badge-critical">
                {criticalCount} critical
              </span>
            )}
            {warningCount > 0 && (
              <span className="issue-badge issue-badge-warning">
                {warningCount} warning{warningCount > 1 ? 's' : ''}
              </span>
            )}
            {issues.length === 0 && (
              <span className="issue-badge issue-badge-good">
                ✓ Clean
              </span>
            )}
          </div>
        </div>

        {issueTypes.length === 0 ? (
          <div className="issues-clean-state">
            <div className="clean-icon">✓</div>
            <h3>No visibility blockers detected</h3>
            <p>Your page structure is clean for AI systems. Continue monitoring as content changes.</p>
          </div>
        ) : (
          <div className="issues-list">
            {issueTypes.map(type => {
              const items = groupedIssues[type]
              const isSelected = selectedIssue === type
              const affectedNodes = getAffectedNodes(items, semanticIndex)
              const severity = items[0]?.severity || 'notice'
              const confidence = items[0]?.confidence || 'Medium'
              const sevConfig = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.notice
              const confConfig = CONFIDENCE_CONFIG[confidence] || CONFIDENCE_CONFIG.Medium

              return (
                <article
                  className={`issue-card-v2 ${isSelected ? 'selected' : ''}`}
                  key={type}
                  style={{ '--severity-color': sevConfig.color }}
                >
                  {/* Severity indicator stripe */}
                  <div className="issue-severity-stripe" style={{ background: sevConfig.color }} />

                  <div className="issue-card-content">
                    {/* Header row */}
                    <button
                      className="issue-header-btn"
                      type="button"
                      onClick={() => onSelectIssue(type)}
                    >
                      <div className="issue-header-left">
                        <span className="issue-severity-badge" style={{ color: sevConfig.color, background: sevConfig.bg }}>
                          <span className="severity-icon">{sevConfig.icon}</span>
                          {sevConfig.label}
                        </span>
                        <span className="issue-confidence-badge" style={{ color: confConfig.color }}>
                          {confConfig.label}
                        </span>
                      </div>
                      <span className="issue-count-pill">{items.length}</span>
                    </button>

                    {/* Issue title & description */}
                    <div className="issue-body">
                      <h3 className="issue-title">{type}</h3>
                      <p className="issue-description">
                        {getIssueDescription(type, items.length)}
                      </p>
                    </div>

                    {/* Affected elements */}
                    {affectedNodes.length > 0 && (
                      <div className="issue-affected">
                        <small className="affected-label">Affected Elements</small>
                        <div className="affected-chips">
                          {affectedNodes.slice(0, 6).map(node => (
                            <button
                              className={`affected-chip ${selectedNodeId === node.id ? 'active' : ''}`}
                              key={node.id}
                              type="button"
                              onClick={() => {
                                onSelectIssue(type)
                                onSelectNode(node.id)
                              }}
                            >
                              <span className="chip-role">{humanize(node.type || 'Node')}</span>
                              <span className="chip-label">{getNodeLabelText(node)}</span>
                              {node.context && <span className="chip-context">in {node.context}</span>}
                            </button>
                          ))}
                          {affectedNodes.length > 6 && (
                            <span className="affected-overflow">+{affectedNodes.length - 6} more</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="issue-actions">
                      <button
                        className="fix-btn"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setFixModalIssue(type)
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                        </svg>
                        How to Fix
                      </button>
                      <button
                        className="locate-btn"
                        type="button"
                        onClick={() => {
                          onSelectIssue(type)
                          if (affectedNodes.length > 0) {
                            onSelectNode(affectedNodes[0].id)
                          }
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        Locate in Tree
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* Fix Guide Modal */}
      {fixModalIssue && (
        <FixModal
          issueType={fixModalIssue}
          guide={getGuideForIssue(fixModalIssue)}
          onClose={() => setFixModalIssue(null)}
        />
      )}
    </>
  )
}


/* ─── Fix Modal ─── */

function FixModal({ issueType, guide, onClose }) {
  const backdropRef = useRef(null)
  const modalRef = useRef(null)

  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => {
      backdropRef.current?.classList.add('visible')
      modalRef.current?.classList.add('visible')
    })

    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    // Lock body scroll
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  function handleBackdropClick(e) {
    if (e.target === backdropRef.current) onClose()
  }

  return (
    <div className="fix-modal-backdrop" ref={backdropRef} onClick={handleBackdropClick}>
      <div className="fix-modal" ref={modalRef} role="dialog" aria-labelledby="fix-modal-title">
        <div className="fix-modal-header">
          <div>
            <p className="fix-modal-eyebrow">Fix Guide</p>
            <h2 id="fix-modal-title">{guide.title}</h2>
          </div>
          <button className="fix-modal-close" type="button" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="fix-modal-body">
          {/* Impact Section */}
          <div className="fix-section fix-impact">
            <div className="fix-section-icon impact-icon">⚡</div>
            <div>
              <h3>Impact on AI Visibility</h3>
              <p>{guide.impact}</p>
            </div>
          </div>

          {/* Why Section */}
          <div className="fix-section fix-why">
            <div className="fix-section-icon why-icon">💡</div>
            <div>
              <h3>Why This Matters</h3>
              <p>{guide.why}</p>
            </div>
          </div>

          {/* Steps */}
          <div className="fix-steps-section">
            <h3>Steps to Fix</h3>
            <ol className="fix-steps">
              {guide.steps.map((step, i) => (
                <li key={i}>
                  <span className="step-number">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Code Example */}
          {guide.codeBefore && guide.codeAfter && (
            <div className="fix-code-section">
              <h3>Code Example</h3>
              <div className="fix-code-compare">
                <div className="fix-code-block bad">
                  <span className="code-label">Before</span>
                  <pre><code>{guide.codeBefore}</code></pre>
                </div>
                <div className="fix-code-arrow">→</div>
                <div className="fix-code-block good">
                  <span className="code-label">After</span>
                  <pre><code>{guide.codeAfter}</code></pre>
                </div>
              </div>
            </div>
          )}

          {/* Resources */}
          {guide.resources?.length > 0 && (
            <div className="fix-resources">
              <h3>Learn More</h3>
              <div className="resource-links">
                {guide.resources.map((res, i) => (
                  <a key={i} href={res.url} target="_blank" rel="noreferrer" className="resource-link">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    {res.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


/* ─── Helpers ─── */

function getGuideForIssue(type) {
  // Try exact match first
  if (FIX_GUIDES[type]) return FIX_GUIDES[type]

  // Handle dynamic issue names like "Multiple H1s (3)"
  if (type.startsWith('Multiple H1s')) {
    return {
      title: 'Use a Single H1 Heading Per Page',
      impact: 'Multiple H1 tags dilute the primary topical signal. AI systems may struggle to identify the main topic.',
      why: 'The H1 is treated as the page\'s "headline" by AI systems. Multiple H1s create ambiguity — which one defines the topic? This reduces citation confidence.',
      steps: [
        'Choose one H1 that best represents the page\'s primary topic',
        'Demote other H1s to H2 or H3 as appropriate',
        'Ensure heading hierarchy flows logically: H1 → H2 → H3',
        'Keep the H1 near the top of main content'
      ],
      codeBefore: '<h1>Our Company</h1>\n...\n<h1>Our Services</h1>\n...\n<h1>Contact Us</h1>',
      codeAfter: '<h1>Our Company — Enterprise Solutions</h1>\n...\n<h2>Our Services</h2>\n...\n<h2>Contact Us</h2>',
      resources: [
        { label: 'MDN: Heading Elements', url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements' }
      ]
    }
  }

  return DEFAULT_GUIDE
}

function getAffectedNodes(items, semanticIndex) {
  const seen = new Set()

  return items
    .flatMap(item => item.nodeIds || [])
    .filter(nodeId => {
      if (seen.has(nodeId)) return false
      seen.add(nodeId)
      return true
    })
    .map(nodeId => semanticIndex[nodeId])
    .filter(Boolean)
}

function getNodeLabelText(node) {
  const label = node.label?.replace(/\s+/g, ' ').trim()
  if (label) {
    return label.length <= 34 ? label : `${label.slice(0, 31).trim()}...`
  }
  if (node.context) {
    return node.context
  }
  return 'Unknown Context'
}

function humanize(value) {
  return value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase())
}
