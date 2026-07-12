import { PanelLeftClose, PanelLeftOpen } from '../../components/icons/heroicons'

export default function SidebarFooter({ isCollapsed, onToggle }) {
  const Icon = isCollapsed ? PanelLeftOpen : PanelLeftClose

  return (
    <div className="sidebar-footer">
      <button type="button" className="sidebar-collapse-button" onClick={onToggle} aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={isCollapsed ? 'Expand sidebar' : undefined}>
        <Icon size={15} strokeWidth={1.7} aria-hidden="true" />
        <span aria-hidden={isCollapsed}>Collapse sidebar</span><kbd aria-hidden={isCollapsed}>Ctrl B</kbd>
      </button>
    </div>
  )
}
