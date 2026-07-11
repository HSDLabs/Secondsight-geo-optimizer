import { useMemo } from 'react'
import { NavLink, useOutletContext } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import { OverviewIcon, RecommendationsIcon, SuccessIcon } from '../../components/icons'
import '../../styles/Overview.css'
import { buildOverviewModel, verdictFor } from './overviewModel'
import {
  FocusPanel,
  FuturePillars,
  HistoryPlaceholder,
  IssuesPanel,
  LivePillars,
  QuickWinsPanel,
  ScoreRing,
} from './OverviewSections'

const pillarLabels = {
  crawler: 'Crawler access',
  understanding: 'Machine understanding',
  external: 'External intelligence',
}

export default function Overview() {
  const context = useOutletContext()
  const { data, loading, error, visibilityScore, issueCount, analyzedAt, crawlerData, externalData } = context
  const model = useMemo(
    () => buildOverviewModel({
      data: loading ? null : data,
      crawlerData: loading ? null : crawlerData,
      externalData: loading ? null : externalData,
      visibilityScore: loading ? null : visibilityScore,
    }),
    [data, crawlerData, externalData, visibilityScore, loading],
  )
  const hasResults = Boolean(data)
  const analyzedLabel = analyzedAt
    ? new Date(analyzedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : null

  const insight = loading
    ? 'SecondSight is evaluating all live signal groups. Scores stay neutral until the scan completes so provisional values are never mistaken for final results.'
    : model.strongest
    ? `${pillarLabels[model.strongest[0]]} is currently your strongest live pillar. ${model.weakest ? `${pillarLabels[model.weakest[0]]} offers the clearest opportunity to improve the overall score.` : ''}`
    : 'Run an analysis to establish a baseline across the live SecondSight visibility pillars.'

  return (
    <div className="overview-page">
      {error && <div className="overview-error">{error}</div>}

      <header className="overview-intro">
        <div>
          <span className="overview-eyebrow"><Sparkles size={13} strokeWidth={1.7} /> AI visibility overview</span>
          <div className="overview-title-row"><span className="overview-title-icon"><OverviewIcon size={21} strokeWidth={1.8} /></span><h1>{hasResults ? 'Your visibility, explained.' : 'Understand how AI sees your site.'}</h1></div>
          <p>{hasResults ? `A prioritized view of the signals shaping ${data?.url || 'your site'} across AI discovery and understanding.` : 'Run a scan to turn technical, content, and authority signals into a clear action plan.'}</p>
        </div>
        {analyzedLabel && <span className="overview-last-scan">Last scan {analyzedLabel}</span>}
      </header>

      <section className="overview-panel overview-score-summary" aria-label="SecondSight GEO score summary">
        <div className="overview-score-zone">
          <span className="overview-kicker">SecondSight GEO score <b>Beta</b></span>
          <ScoreRing score={model.overallScore} loading={loading} />
          <strong className={`overview-score-verdict tone-${model.overallScore == null ? 'muted' : model.overallScore >= 80 ? 'good' : model.overallScore >= 55 ? 'warning' : 'poor'}`}>{loading ? 'Scanning signals' : verdictFor(model.overallScore)}</strong>
          <span className="overview-score-caption">{loading ? 'Scores resolve when analysis completes' : `Based on ${model.signalCount} of 3 live signal groups`}</span>
        </div>

        <div className="overview-insight-zone">
          <div className="overview-insight-heading"><Sparkles size={15} strokeWidth={1.7} /><h2>Score insight</h2></div>
          <p>{insight}</p>
          <div className="overview-insight-list">
            <div><RecommendationsIcon /><span><strong>{loading ? 'Analysis in progress' : model.issues[0]?.title || 'No priority blocker detected'}</strong><small>{loading ? 'Scores and recommendations will appear together when the scan completes.' : model.issues[0]?.detail || 'Keep monitoring the live pillars as your site changes.'}</small></span><NavLink to="/ai-understanding">Review <ArrowRight size={12} strokeWidth={1.7} /></NavLink></div>
            <div><SuccessIcon /><span><strong>{model.strongest ? `Strong ${pillarLabels[model.strongest[0]]}` : 'Baseline pending'}</strong><small>{model.strongest ? `Current live score: ${Math.round(model.strongest[1])}/100.` : 'Your strongest signal will appear after analysis.'}</small></span><NavLink to="/ai-understanding">Details <ArrowRight size={12} strokeWidth={1.7} /></NavLink></div>
            <div><Sparkles size={15} strokeWidth={1.7} /><span><strong>{loading ? 'Results held until complete' : `${issueCount || 0} detected issues`}</strong><small>{loading ? 'This prevents provisional values from appearing as final results.' : 'Use the prioritized lists below to decide what to address first.'}</small></span><NavLink to="/recommendations">Actions <ArrowRight size={12} strokeWidth={1.7} /></NavLink></div>
          </div>
        </div>
      </section>

      <LivePillars scores={model.scores} loading={loading} />

      <div className="overview-two-column">
        <IssuesPanel issues={model.issues} hasResults={hasResults} />
        <QuickWinsPanel wins={model.quickWins} hasResults={hasResults} />
      </div>

      <div className="overview-two-column overview-bottom-grid">
        <HistoryPlaceholder />
        <FocusPanel weakest={model.weakest} issues={model.issues} />
      </div>

      <FuturePillars />
    </div>
  )
}
