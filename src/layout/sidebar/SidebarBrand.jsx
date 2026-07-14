export default function SidebarBrand({ isCollapsed }) {
  return (
    <div className="sidebar-brand">
      <span className="sidebar-logo-wrap">
        <img src="/logo.svg" alt="" className="sidebar-logo" />
      </span>
      <div className="sidebar-brand-copy" aria-hidden={isCollapsed}>
          <span>SecondSight</span>
          <strong>AEO Optimizer</strong>
      </div>
    </div>
  )
}
