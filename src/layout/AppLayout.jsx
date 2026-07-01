import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import URLInput from '../components/URLInput'

// Shared layout: persistent sidebar + a global header hosting the URL input,
// with the active section rendered in the Outlet. It owns no state — the
// analysis state is passed down from App and forwarded to pages via Outlet
// context, so one analysis stays live as the user moves between sections.
export default function AppLayout({ url, setUrl, analyze, loading, outletContext }) {
  return (
    <div className="app-layout">
      <Sidebar />

      <div className="app-main">
        <header className="app-topbar">
          <URLInput
            value={url}
            onChange={setUrl}
            onAnalyze={analyze}
            loading={loading}
          />
        </header>

        <main className="app-content">
          <Outlet context={outletContext} />
        </main>
      </div>
    </div>
  )
}
