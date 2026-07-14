export default function SectionShell({ icon: Icon, title, description, action, children, id }) {
  return (
    <section id={id} className="mu-section-enter min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--panel)]">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
        <div className="flex items-start gap-4">
          {Icon && <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-[var(--accent-purple)]/20 bg-[var(--accent-purple)]/[.07] text-[var(--status-purple)]"><Icon size={18} strokeWidth={1.8} /></span>}
          <div>
          <h2 className="text-base font-semibold text-[var(--text)]">{title}</h2>
          {description && <p className="mt-1 text-[13px] leading-5 text-[var(--text-secondary)]">{description}</p>}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}
