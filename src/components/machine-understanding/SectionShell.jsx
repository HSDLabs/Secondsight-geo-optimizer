export default function SectionShell({ number, title, description, action, children, id }) {
  const delay = number ? `${Number(number) * 70}ms` : '0ms'
  return (
    <section id={id} className="mu-section-enter min-w-0 rounded-xl border border-slate-700/50 bg-[#111927]/80 shadow-[0_18px_60px_rgba(0,0,0,0.12)]" style={{ '--mu-section-delay': delay }}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-700/30 bg-white/[.008] px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          {number && <span className="grid size-6 shrink-0 place-items-center rounded-md border border-slate-700/50 bg-slate-900/50 text-[9px] font-semibold text-slate-500">{number}</span>}
          <div>
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-200">{title}</h2>
          {description && <p className="mt-1.5 text-[11px] leading-4 text-slate-500">{description}</p>}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}
