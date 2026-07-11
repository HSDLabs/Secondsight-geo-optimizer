import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Check, ExternalLink, RefreshCw, Share2 } from 'lucide-react'
import Sidebar from './Sidebar'
import URLInput from '../components/URLInput'

// Shared layout: persistent sidebar + a global header hosting the URL input,
// with the active section rendered in the Outlet. It owns no state — the
// analysis state is passed down from App and forwarded to pages via Outlet
// context, so one analysis stays live as the user moves between sections.
export default function AppLayout({ url, setUrl, analyze, loading, outletContext }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const data = outletContext?.data
  const analyzedAt = outletContext?.analyzedAt
  const hasData = !!data

  useEffect(() => {
    const handleShortcut = event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        setIsSidebarCollapsed(current => !current)
      }
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'GEO Optimizer Report',
        text: `Check out the GEO Optimizer Report for ${data?.url || url}`,
        url: window.location.href
      }).catch(err => console.error(err))
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Report link copied to clipboard!')
    }
  }

  return (
    <div className={`app-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      <div className="app-main">
        <header className="app-topbar">
          {hasData ? (
            <div className="app-topbar-complete flex-wrap gap-2">
              <div className="app-topbar-left min-w-0 flex-1 flex-wrap">
                <span className="topbar-url max-w-[190px] truncate sm:max-w-none"><span className="topbar-url-mark" />{data.url || url}</span>
                <span className="topbar-badge">
                  <Check size={12} />
                  Analysis complete
                </span>
                <span className="hidden text-[10px] text-slate-500 xl:inline">Rendered page</span>
                {analyzedAt && <time className="hidden text-[10px] text-slate-500 2xl:inline" dateTime={analyzedAt}>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(analyzedAt))}</time>}
              </div>
              <div className="topbar-actions">
                <a className="topbar-source-link" href={data.url || url} target="_blank" rel="noreferrer" aria-label="Open analyzed website"><ExternalLink size={14} /></a>
                <button type="button" aria-label="Re-analyze" className="topbar-share-btn" onClick={() => analyze(data.url || url)} disabled={loading}><RefreshCw size={14} /><span className="hidden sm:inline">Re-analyze</span></button>
                <button type="button" aria-label="Share report" className="topbar-share-btn" onClick={handleShare}><Share2 size={14} /><span className="hidden sm:inline">Share report</span></button>
              </div>
            </div>
          ) : (
            <URLInput
              value={url}
              onChange={setUrl}
              onAnalyze={analyze}
              loading={loading}
            />
          )}
        </header>

        <main className="app-content">
          <Outlet context={outletContext} />
        </main>
      </div>
    </div>
  )
}
