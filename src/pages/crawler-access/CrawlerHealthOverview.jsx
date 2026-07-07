import { getScoreTone, AI_CRAWLERS } from './crawlerUtils'

export default function CrawlerHealthOverview({ score, botsAllowedCount, botsBlockedCount, botsLimitedCount, sitemaps, parsedSitemapsCount, totalSitemapsCount, criticalIssuesCount, loading, isAwaiting }) {
  const showSkeleton = loading || isAwaiting
  
  return (
    <section className={`health-overview-grid ${loading ? 'is-loading' : ''} ${isAwaiting ? 'is-awaiting' : ''}`} aria-label="Crawlability health overview">
      <div className="health-card">
        <span className="health-card-label">Overall Crawlability</span>
        <div className={`health-card-value ${showSkeleton ? 'skeleton-text' : getScoreTone(score)}`} style={{ width: showSkeleton ? '60px' : 'auto' }}>
          {!showSkeleton && (
            <>
              {score}
              <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--muted)', marginLeft: '4px' }}>/100</span>
            </>
          )}
        </div>
        <span className="health-card-subtext">{showSkeleton ? 'Awaiting analysis' : 'Overall visibility score'}</span>
      </div>

      <div className="health-card">
        <span className="health-card-label">Bots Allowed</span>
        <div className={`health-card-value ${showSkeleton ? 'skeleton-text' : ''}`} style={{ width: showSkeleton ? '80px' : 'auto' }}>
          {!showSkeleton && (
            <>
              {botsAllowedCount}
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--faint)' }}> / {AI_CRAWLERS.length}</span>
            </>
          )}
        </div>
        <span className="health-card-subtext">
          {showSkeleton ? 'Awaiting analysis' : `${botsBlockedCount} blocked, ${botsLimitedCount} limited`}
        </span>
      </div>

      <div className="health-card">
        <span className="health-card-label">Pages Discoverable</span>
        <div className={`health-card-value ${showSkeleton ? 'skeleton-text' : 'good'}`} style={{ width: showSkeleton ? '50px' : 'auto' }}>
          {!showSkeleton && (sitemaps?.totalUrls || 0)}
        </div>
        <span className="health-card-subtext">
          {showSkeleton ? 'Awaiting analysis' : `Found in ${parsedSitemapsCount} of ${totalSitemapsCount} sitemaps`}
        </span>
      </div>

      <div className="health-card">
        <span className="health-card-label">Critical Issues</span>
        <div className={`health-card-value ${showSkeleton ? 'skeleton-text' : (criticalIssuesCount > 0 ? 'poor' : 'good')}`} style={{ width: showSkeleton ? '40px' : 'auto' }}>
          {!showSkeleton && criticalIssuesCount}
        </div>
        <span className="health-card-subtext">{showSkeleton ? 'Awaiting analysis' : 'Blockers requiring action'}</span>
      </div>
    </section>
  )
}
