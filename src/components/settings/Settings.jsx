import { useState, useEffect } from 'react'
import { getApiControls, setApiControl, subscribeToApiControls } from '../../utils/featureControls'

const API_CONTROLS = [
  ['crawler', 'Crawl & Indexability', 'Stops crawler analysis and crawler page requests.'],
  ['sources', 'Sources & Authority', 'Stops capability checks, searches, runs, and polling.'],
  ['aiVisibility', 'AI Visibility', 'Stops all AI Visibility provider and results requests.']
]

const BracesIcon = () => (
  <span style={{ fontFamily: 'monospace', color: 'var(--muted)', fontSize: '1rem', marginRight: '12px', opacity: 0.7 }}>
    {`{}`}
  </span>
)

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

const PencilIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
  </svg>
)


const EnvVarRow = ({ name, value, description, onSave }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [isVisible, setIsVisible] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(name, editValue)
      setIsEditing(false)
    } catch (e) {
      console.error(e)
      // Error handling can go here
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditValue(value)
    setIsEditing(false)
  }

  const displayValue = isVisible 
    ? (value || 'Not set') 
    : (value ? '********' : 'Not set')

  return (
    <div title={description} style={{
      display: 'flex', 
      alignItems: 'center', 
      padding: '12px 16px', 
      borderBottom: '1px solid var(--border)',
      position: 'relative'
    }}>
      {/* Key Column */}
      <div style={{ flex: '0 0 280px', display: 'flex', alignItems: 'center' }}>
        <BracesIcon />
        <span style={{ 
          fontFamily: 'var(--font-mono)', 
          fontSize: '0.85rem', 
          color: 'var(--text)',
          fontWeight: 500,
          letterSpacing: '0.5px'
        }}>
          {name}
        </span>
        
      </div>

      {/* Value Column */}
      <div style={{ flex: '1', display: 'flex', alignItems: 'center', paddingRight: '16px', minWidth: 0 }}>
        {isEditing ? (
          <div style={{ display: 'flex', width: '100%', gap: '8px' }}>
            <input 
              autoFocus
              type="text"
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              placeholder="Enter value..."
              style={{
                flex: 1,
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                padding: '6px 12px',
                borderRadius: '4px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.85rem',
                outline: 'none'
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
            />
            <button 
              onClick={handleSave} 
              disabled={isSaving}
              style={{
                background: 'var(--good)',
                color: '#000',
                border: 'none',
                padding: '0 12px',
                borderRadius: '4px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: isSaving ? 'wait' : 'pointer'
              }}
            >
              {isSaving ? '...' : 'Save'}
            </button>
            <button 
              onClick={handleCancel}
              style={{
                background: 'transparent',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                padding: '0 12px',
                borderRadius: '4px',
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <span style={{ 
            fontFamily: isVisible ? 'var(--font-mono)' : 'monospace',
            fontSize: isVisible ? '0.85rem' : '1rem',
            color: value ? 'var(--text)' : 'var(--muted)',
            letterSpacing: isVisible ? 'normal' : '2px',
            opacity: value ? 0.9 : 0.5,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'block',
            width: '100%'
          }}>
            {displayValue}
          </span>
        )}
      </div>

      {/* Actions Column */}
      {!isEditing && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setIsVisible(!isVisible)}
            title={isVisible ? "Hide Value" : "Reveal Value"}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              transition: 'color 0.2s, background 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--panel-soft)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'transparent' }}
          >
            {isVisible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
          <button 
            onClick={() => setIsEditing(true)}
            title="Edit Value"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              transition: 'color 0.2s, background 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--panel-soft)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'transparent' }}
          >
            <PencilIcon />
          </button>
        </div>
      )}
    </div>
  )
}

export default function Settings() {
  const [theme, setTheme] = useState(() => localStorage.getItem('secondsight-theme') === 'dark' ? 'dark' : 'light')
  const [apiControls, setApiControls] = useState(getApiControls)
  const [env, setEnv] = useState({
    GOOGLE_API_KEY: '',
    SCRAPEBADGER_API_KEY: '',
    OPENAI_API_KEY: '',
    CHATGPT_API_KEY: ''
  })
  const [isLoadingEnv, setIsLoadingEnv] = useState(true)

  useEffect(() => {
    localStorage.setItem('secondsight-theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => subscribeToApiControls(setApiControls), [])

  useEffect(() => {
    fetch('/api/settings/env')
      .then(res => res.json())
      .then(data => {
        setEnv(data)
        setIsLoadingEnv(false)
      })
      .catch(err => {
        console.error('Failed to load env vars', err)
        setIsLoadingEnv(false)
      })
  }, [])

  const handleSaveEnv = async (key, value) => {
    const res = await fetch('/api/settings/env', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value })
    })
    if (!res.ok) throw new Error('Failed to save')
    setEnv(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div style={{ padding: '32px 48px', maxWidth: '900px', margin: '0 auto', width: '100%', paddingBottom: '100px' }}>
      <h2 style={{ fontSize: '1.75rem', color: 'var(--text)', marginBottom: '32px', fontWeight: 600 }}>Settings</h2>
      
      <section className="section-block" style={{ padding: '28px', marginBottom: '32px' }}>
        <h3 style={{ fontSize: '1.1rem', color: 'var(--text)', margin: '0 0 16px', fontWeight: 600 }}>Appearance</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ color: 'var(--faint)', fontSize: '0.95rem', margin: '0', lineHeight: 1.5 }}>
            Light is the default appearance. You can switch to dark mode when needed.
          </p>
          
          <div style={{ 
            display: 'inline-flex', 
            background: 'var(--bg)', 
            padding: '4px', 
            borderRadius: '10px', 
            border: '1px solid var(--border)',
            alignSelf: 'flex-start'
          }}>
            {['light', 'dark'].map(t => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                style={{
                  background: theme === t ? 'var(--panel-soft)' : 'transparent',
                  border: 'none',
                  color: theme === t ? 'var(--text)' : 'var(--muted)',
                  padding: '8px 24px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: theme === t ? 600 : 500,
                  textTransform: 'capitalize',
                  transition: 'all 0.2s cubic-bezier(0.23, 1, 0.32, 1)',
                  boxShadow: theme === t ? '0 1px 3px rgba(var(--overlay-rgb), 0.05), 0 0 0 1px var(--border)' : 'none'
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="section-block mb-8 overflow-hidden p-0">
        <div className="px-7 pb-5 pt-7">
          <h3 className="m-0 text-[1.1rem] font-semibold text-[var(--text)]">API Usage Controls</h3>
          <p className="mb-0 mt-2 text-sm leading-6 text-[var(--faint)]">Disable unused sections while developing or testing. Changes apply to this browser and stop new requests.</p>
        </div>
        <div className="border-t border-[var(--border)] bg-[var(--bg)]">
          {API_CONTROLS.map(([key, label, description]) => (
            <div className="flex items-center justify-between gap-5 border-b border-[var(--border)] px-7 py-4 last:border-b-0" key={key}>
              <div>
                <strong className="block text-sm font-semibold text-[var(--text)]">{label}</strong>
                <span className="mt-1 block text-xs leading-5 text-[var(--faint)]">{description}</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={apiControls[key]}
                aria-label={`${label} API requests`}
                onClick={() => setApiControl(key, !apiControls[key])}
                className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${apiControls[key] ? 'border-blue-400/40 bg-blue-500' : 'border-[var(--border-strong)] bg-[var(--panel-raised)]'}`}
              >
                <span className={`absolute left-1 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow-sm transition-transform ${apiControls[key] ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="section-block" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '28px 28px 20px' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text)', margin: '0 0 8px', fontWeight: 600 }}>Environment Variables</h3>
          <p style={{ color: 'var(--faint)', fontSize: '0.9rem', margin: '0', lineHeight: 1.5 }}>
            Manage the external API keys required for SecondSight GEO Optimizer services. Variables are applied instantly to the server.
          </p>
        </div>
        
        {isLoadingEnv ? (
          <div style={{ padding: '20px 28px', color: 'var(--muted)' }}>Loading variables...</div>
        ) : (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            background: 'var(--bg)', // Darker background similar to Railway
            borderTop: '1px solid var(--border)'
          }}>
            <EnvVarRow 
              name="GOOGLE_API_KEY"
              value={env.GOOGLE_API_KEY}
              onSave={handleSaveEnv}
              description="Used by Sources & Authority to query supported public sources through server-side collectors."
            />
            
            <EnvVarRow 
              name="SCRAPEBADGER_API_KEY"
              value={env.SCRAPEBADGER_API_KEY}
              onSave={handleSaveEnv}
              description="Provides robust, proxy-backed cloud headless browsing. Used by Crawl & Indexability to test how various AI bots render and parse your site."
            />

            <EnvVarRow
              name="OPENAI_API_KEY"
              value={env.OPENAI_API_KEY}
              onSave={handleSaveEnv}
              description="Used server-side by the llms.txt assistant through the OpenAI Responses API."
            />

            <EnvVarRow 
              name="CHATGPT_API_KEY"
              value={env.CHATGPT_API_KEY}
              onSave={handleSaveEnv}
              description="Used by Machine Readability and by Sources & Authority for evidence-backed structured intelligence."
            />
          </div>
        )}
      </section>
    </div>
  )
}
