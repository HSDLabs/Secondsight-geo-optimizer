import { NavLink } from 'react-router-dom'
import { OverviewIcon } from '../../components/icons'
import { sidebarIcons } from './sidebarIcons'

export default function SidebarNavItem({ item, isCollapsed, disabled = false }) {
  const Icon = sidebarIcons[item.path] || OverviewIcon
  const content = <><span className="sidebar-icon"><Icon /></span><span className="sidebar-link-text" aria-hidden={isCollapsed}>{item.label}</span>{disabled && <span className="sidebar-disabled-label" aria-hidden="true">Off</span>}</>

  if (disabled) {
    return <span className="sidebar-link is-disabled" title={`${item.label} is disabled in Settings`} aria-disabled="true">{content}</span>
  }

  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={({ isActive }) => `sidebar-link${isActive ? ' is-active' : ''}`}
      title={isCollapsed ? item.label : undefined}
      aria-label={isCollapsed ? item.label : undefined}
    >
      {content}
    </NavLink>
  )
}
