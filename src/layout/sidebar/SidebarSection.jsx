import SidebarNavItem from './SidebarNavItem'

export default function SidebarSection({ label, items, isCollapsed }) {
  return (
    <section className="sidebar-group" aria-labelledby={isCollapsed ? undefined : `sidebar-${label}`}>
      <h2 id={`sidebar-${label}`} className="sidebar-group-label" aria-hidden={isCollapsed}>{label}</h2>
      <span className="sidebar-group-divider" aria-hidden="true" />
      <div className="sidebar-group-links">
        {items.map(item => <SidebarNavItem key={item.path} item={item} isCollapsed={isCollapsed} />)}
      </div>
    </section>
  )
}
