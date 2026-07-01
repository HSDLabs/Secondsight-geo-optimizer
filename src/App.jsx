import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import './styles/App.css'
import './styles/VisibilityLayer.css'
import './styles/Layout.css'
import AppLayout from './layout/AppLayout'
import SectionPlaceholder from './pages/SectionPlaceholder'
import { navItems } from './navigation'

function calculateVisibilityBreakdown(data) {
  if (!data) {
    return {
      score: 0,
      items: []
    }
  }

  const wordCount = data.readable?.wordCount ?? 0
  const issues = data.a11y?.issues || []
  const structureCount = data.a11y?.snapshot?.children?.length ?? 0
  const semanticNodeCount = Object.keys(data.a11y?.semanticIndex || {}).length

  const structure = Math.min(20, structureCount * 3 + Math.min(8, Math.round(semanticNodeCount / 15)))

  const criticalIssues = issues.filter(issue => issue.severity === 'critical')
  const warningIssues = issues.filter(issue => issue.severity === 'warning')
  const criticalPenalty = criticalIssues.length > 0
    ? 4 + Math.min(8, (criticalIssues.length - 1) * 2)
    : 0
  const warningPenalty = warningIssues.length > 0
    ? 2 + Math.min(4, warningIssues.length - 1)
    : 0
  const accessibility = -Math.min(16, criticalPenalty + warningPenalty)

  const contentDepth = wordCount >= 800 ? 20
    : wordCount >= 500 ? 16
    : wordCount >= 250 ? 10
    : wordCount >= 100 ? 4
    : -8

  const extractability = data.readable?.markdown ? 12 : -6

  const h1Issues = issues.filter(issue => issue.type === 'Missing H1' || issue.type?.startsWith('Multiple H1'))
  const headingBonus = h1Issues.length === 0 ? 8 : 0

  const base = 40
  const score = Math.max(0, Math.min(100, base + structure + accessibility + contentDepth + extractability + headingBonus))

  return {
    score,
    items: [
      { label: 'Base', value: base },
      { label: 'Structure', value: structure },
      { label: 'Accessibility', value: accessibility },
      { label: 'Content Depth', value: contentDepth },
      { label: 'Extractability', value: extractability },
      { label: 'Heading Structure', value: headingBonus > 0 ? headingBonus : -(h1Issues.length * 3) }
    ],
    placeholders: [
      'Crawler Access',
      'Entity Understanding',
      'Retrieval Readiness',
      'Citation Readiness'
    ]
  }
}

export default function App() {
  const [url, setUrl] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [analyzedAt, setAnalyzedAt] = useState(null)
  const [selectedIssue, setSelectedIssue] = useState(null)
  const [selectedNodeId, setSelectedNodeId] = useState(null)

  async function analyze() {
    if (!url.trim()) return

    setLoading(true)
    setError(null)
    setSelectedIssue(null)
    setSelectedNodeId(null)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json)
      setAnalyzedAt(new Date().toISOString())
      setSelectedNodeId(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const issueCount = data?.a11y?.issues?.length ?? 0
  const scoreBreakdown = calculateVisibilityBreakdown(data)
  const visibilityScore = scoreBreakdown.score
  const selectedNode = selectedNodeId ? data?.a11y?.semanticIndex?.[selectedNodeId] : null

  function selectIssueGroup(type) {
    setSelectedIssue(type)

    const linkedNodeId = data?.a11y?.issues
      ?.filter(issue => issue.type === type)
      .flatMap(issue => issue.nodeIds || [])
      .find(Boolean)

    if (linkedNodeId) setSelectedNodeId(linkedNodeId)
  }

  // Shared analysis state passed down to every section via the layout's
  // Outlet context. Because it lives here (above the router outlet), one
  // analysis stays live as the user navigates between sections.
  const outletContext = {
    data,
    loading,
    error,
    visibilityScore,
    issueCount,
    scoreBreakdown,
    analyzedAt,
    selectedNode,
    selectedNodeId,
    setSelectedNodeId,
    selectedIssue,
    selectIssueGroup
  }

  return (
    <Routes>
      <Route
        element={
          <AppLayout
            url={url}
            setUrl={setUrl}
            analyze={analyze}
            loading={loading}
            outletContext={outletContext}
          />
        }
      >
        {navItems.map(item => (
          <Route
            key={item.path}
            path={item.path}
            element={
              item.element ?? (
                <SectionPlaceholder label={item.label} description={item.description} />
              )
            }
          />
        ))}
      </Route>
    </Routes>
  )
}
