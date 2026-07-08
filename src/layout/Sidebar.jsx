import { NavLink } from 'react-router-dom'
import { navItems, NAV_GROUPS } from '../navigation'

const SIDEBAR_ICONS = {
  '/': <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  '/ai-understanding': <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93"/><path d="M12 2a4 4 0 0 0-4 4c0 1.95 1.4 3.58 3.25 3.93"/><path d="M12 10v4"/><circle cx="12" cy="18" r="4"/><path d="M10 18h4"/><path d="M12 16v4"/><path d="M4 10l2 2M20 10l-2 2"/></svg>,
  '/crawler-access': <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
  '/content-intelligence': <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>,
  '/retrieval-readiness': <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /><path d="M11 8v6M8 11h6" /></svg>,
  '/citation-readiness': <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 17c-2 0-3-1-3-3V9a3 3 0 0 1 3-3h1l-1 4h2l-1 7" /><path d="M15 17c-2 0-3-1-3-3V9a3 3 0 0 1 3-3h1l-1 4h2l-1 7" /></svg>,
  '/content-gaps': <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10M18 20V4M6 20v-4" /></svg>,
  '/recommendations': <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/><path d="M9 6h12v12"/></svg>,
  '/prompt-simulator': <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  '/settings': <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
}

export default function Sidebar({ isCollapsed, onToggle }) {
  return (
    <aside className="sidebar" aria-label="Primary" style={{ display: 'flex', flexDirection: 'column', height: '100%', paddingBottom: '16px' }}>
      <div>
        <div className="sidebar-brand" style={{ 
          padding: isCollapsed ? '12px 0' : '12px 10px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: isCollapsed ? 'center' : 'space-between',
          minHeight: '60px',
          marginBottom: '8px'
        }}>
          {!isCollapsed && (
            <div className="sidebar-brand-text" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src="/logo.svg" alt="SecondSight Logo" style={{ width: '28px', height: '28px' }} />
              <div>
                <p className="eyebrow" style={{ margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem', color: 'var(--muted)', lineHeight: 1 }}>SecondSight</p>
                <h1 className="sidebar-tagline" style={{ margin: '4px 0 0', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', lineHeight: 1 }}>GEO Optimizer</h1>
              </div>
            </div>
          )}
          
          <button
            onClick={onToggle}
            className="sidebar-toggle-btn top-toggle"
            aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              borderRadius: '6px',
              marginLeft: isCollapsed ? '0' : 'auto',
              marginTop: isCollapsed ? '0' : '6px'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'var(--panel-soft)'
              e.currentTarget.style.color = 'var(--text)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--muted)'
            }}
          >
            {isCollapsed ? (
              <img src="/logo.svg" alt="SecondSight Logo" style={{ width: '28px', height: '28px' }} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            )}
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_GROUPS.map(group => {
            const items = navItems.filter(item => item.group === group)
            if (items.length === 0) return null

            return (
              <div key={group} className="sidebar-group">
                <p className="sidebar-group-label">{group}</p>
                {items.map(item => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      isActive ? 'sidebar-link is-active' : 'sidebar-link'
                    }
                    title={isCollapsed ? item.label : undefined}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', opacity: 0.7 }} className="sidebar-icon">
                      {SIDEBAR_ICONS[item.path] || SIDEBAR_ICONS['/']}
                    </span>
                    <span className="sidebar-link-text">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
