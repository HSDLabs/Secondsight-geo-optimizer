import { useEffect, useRef, useState } from 'react'

export default function TreeNode({
  node,
  level = 0,
  screenshotMeta,
  selectedNodeId,
  selectedPath = [],
  onSelectNode,
  isFocused
}) {
  const isInSelectedPath = selectedPath.includes(node?.id)
  const isSelected = node?.id === selectedNodeId
  const [userOpen, setUserOpen] = useState(null)
  const open = isInSelectedPath || (userOpen ?? level < 1)
  const rowRef = useRef(null)

  useEffect(() => {
    if (!isSelected || !isFocused) return

    rowRef.current?.scrollIntoView({
      block: 'center',
      behavior: 'smooth'
    })
  }, [isSelected, isFocused])

  if (!node) return null

  const hasChildren = node.children?.length > 0
  const label = getLabel(node.role)
  const name = cleanName(node.name, label)
  const summary = getSummary(node)

  let viewportVisible = false
  if (node?.bbox && screenshotMeta?.viewport?.height) {
    const { y, h } = node.bbox
    const vh = screenshotMeta.viewport.height
    if (y < vh && (y + h) > 0) {
      viewportVisible = true
    }
  }

  return (
    <div className="tree-node" style={{ '--level': level }}>
      <div
        ref={rowRef}
        className={`tree-node-label ${isSelected ? 'selected' : ''} ${node.issues?.length ? 'has-issues' : ''}`}
      >
        <button
          className="tree-caret"
          type="button"
          disabled={!hasChildren}
          onClick={() => hasChildren && setUserOpen(!open)}
          aria-label={open ? `Collapse ${label}` : `Expand ${label}`}
          aria-expanded={hasChildren ? open : undefined}
        >
          {hasChildren ? (open ? 'v' : '>') : '-'}
        </button>
        <button
          className="tree-node-main"
          type="button"
          onClick={() => onSelectNode?.(node.id)}
        >
          <span className="tree-role">{label}</span>
          {name && <span className="tree-name">{name}</span>}
          {summary && !isSelected && <span className="tree-summary">{summary}</span>}
        </button>
      </div>

      {isSelected && (
        <div className="tree-node-debug" style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', backgroundColor: 'var(--bg-surface-2)', borderLeft: '2px solid var(--accent-1)', margin: '0.25rem 0 0.5rem 1.5rem', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          <div><strong>ID:</strong> {node.id}</div>
          <div><strong>Role:</strong> {node.role || 'none'}</div>
          <div><strong>Label:</strong> {node.name || 'none'}</div>
          <div><strong>Selector:</strong> {node.selector || 'none'}</div>
          <div><strong>BBox:</strong> {node.bbox ? `x=${node.bbox.x} y=${node.bbox.y} w=${node.bbox.w} h=${node.bbox.h}` : 'none'}</div>
          <div><strong>DOM Visible:</strong> {node.bbox ? 'true' : 'false'}</div>
          <div><strong>Viewport Visible:</strong> {viewportVisible ? 'true' : 'false'}</div>
        </div>
      )}

      {open &&
        node.children?.map((child, idx) => (
          <TreeNode
            key={child.id || `${child.role || 'node'}-${idx}`}
            node={child}
            level={level + 1}
            screenshotMeta={screenshotMeta}
            selectedNodeId={selectedNodeId}
            selectedPath={selectedPath}
            onSelectNode={onSelectNode}
            isFocused={isFocused}
          />
        ))}
    </div>
  )
}

function getLabel(role = '') {
  const labels = {
    document: 'Document',
    header: 'Header',
    nav: 'Navigation',
    main: 'Main Content',
    section: 'Section',
    article: 'Article',
    footer: 'Footer',
    h1: 'Heading 1',
    h2: 'Heading 2',
    h3: 'Heading 3',
    a: 'Link',
    button: 'Button',
    img: 'Image',
    form: 'Form',
    input: 'Input'
  }

  return labels[role] || humanize(role || 'Node')
}

function humanize(value) {
  return value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase())
}

function cleanName(value = '', label) {
  const squashed = value.replace(/\s+/g, ' ').trim()
  if (!squashed || squashed.toLowerCase() === label.toLowerCase()) return ''
  if (squashed.length <= 42) return squashed
  return `${squashed.slice(0, 39).trim()}...`
}

function getSummary(node) {
  const counts = countRoles(node)
  const childCount = (node.children || []).length
  if (!childCount) return ''

  const issueCount = countIssues(node)
  const usefulCounts = [
    ['nav', 'navigation'],
    ['section', 'sections'],
    ['a', 'links'],
    ['img', 'images'],
    ['button', 'buttons'],
    ['input', 'inputs']
  ]
    .filter(([role]) => counts[role])
    .map(([role, label]) => `${counts[role]} ${label}`)

  if (issueCount) usefulCounts.push(`${issueCount} issues`)
  if (usefulCounts.length) return usefulCounts.slice(0, 3).join(' / ')

  return `${childCount} children`
}

function countRoles(node) {
  return (node.children || []).reduce((acc, child) => {
    const role = child.role || 'node'
    acc[role] = (acc[role] || 0) + 1

    const childCounts = countRoles(child)
    Object.entries(childCounts).forEach(([childRole, count]) => {
      acc[childRole] = (acc[childRole] || 0) + count
    })

    return acc
  }, {})
}

function countIssues(node) {
  return (node.children || []).reduce(
    (total, child) => total + (child.issues?.length || 0) + countIssues(child),
    node.issues?.length || 0
  )
}