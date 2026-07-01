import { NavLink } from 'react-router-dom'
import { navItems, NAV_GROUPS } from '../navigation'

// Persistent sidebar. Renders the nav model grouped by `group`, in the
// declared group order. Group labels are non-interactive headings; only the
// items themselves are links, so navigation stays flat and shallow.
export default function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Primary">
      <div className="sidebar-brand">
        <p className="eyebrow">SecondSight</p>
        <p className="sidebar-tagline">GEO Optimizer</p>
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
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
