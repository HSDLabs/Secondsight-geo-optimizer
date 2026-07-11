import { Bot, FileSearch, Globe2, Radar, ScanSearch } from 'lucide-react'

const scanSignals = [
  { label: 'Crawler access', icon: Globe2 },
  { label: 'Page structure', icon: FileSearch },
  { label: 'Machine understanding', icon: Bot },
  { label: 'External authority', icon: Radar },
]

export default function URLInput({ value, onChange, onAnalyze, loading = false }) {
  function handleSubmit(event) {
    event.preventDefault()
    if (loading) return
    const targetUrl = value.trim() || 'https://example.com'
    if (!value.trim()) onChange(targetUrl)
    onAnalyze(targetUrl)
  }

  return (
    <form className={`url-input ${loading ? 'is-analyzing' : ''}`} onSubmit={handleSubmit}>
      <div className="url-input-main">
        <span className="url-input-icon" aria-hidden="true"><Globe2 size={16} /></span>
        <label className="sr-only" htmlFor="analysis-url">Website URL to analyze</label>
        <input
          id="analysis-url"
          value={value}
          onChange={event => onChange(event.target.value)}
          placeholder="Enter Website URL"
          inputMode="url"
          autoComplete="url"
          readOnly={loading}
          aria-describedby={loading ? 'analysis-status' : undefined}
        />
        <button type="submit" disabled={loading}>
          {loading ? <span className="url-button-loader" aria-hidden="true"><i /><i /><i /></span> : <ScanSearch size={16} />}
          <span>{loading ? 'Analyzing site' : 'Analyze website'}</span>
        </button>
      </div>

      <div id="analysis-status" className="url-analysis-stage" aria-live="polite" aria-hidden={!loading}>
        <div className="url-analysis-copy">
          <span className="url-analysis-pulse" />
          <strong>Building your visibility map</strong>
          <small>Evaluating live signals across the site</small>
        </div>
        <div className="url-signal-pipeline">
          {scanSignals.map(({ label, icon: Icon }, index) => (
            <div key={label} className="url-signal" style={{ '--signal-index': index }}>
              <span><Icon size={13} /></span>
              <small>{label}</small>
            </div>
          ))}
        </div>
        <div className="url-scan-track"><i /></div>
      </div>
    </form>
  )
}
