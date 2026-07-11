import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function AnalysisModal({ open, onClose, title, description, children, maxWidth = 'max-w-4xl' }) {
  useEffect(() => {
    if (!open) return undefined
    const previousOverflow = document.body.style.overflow
    const handleKeyDown = event => {
      if (event.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="mu-modal-backdrop fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm" role="presentation" onMouseDown={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="analysis-modal-title" onMouseDown={event => event.stopPropagation()} className={`mu-modal-panel my-auto flex max-h-[min(88vh,820px)] w-full ${maxWidth} flex-col overflow-hidden rounded-xl border border-slate-600/60 bg-[#0d1521] shadow-[0_30px_90px_rgba(0,0,0,.55)]`}>
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-700/50 bg-white/[.012] px-5 py-4">
          <div><h2 id="analysis-modal-title" className="text-sm font-semibold text-slate-100">{title}</h2>{description && <p className="mt-1 text-[11px] leading-4 text-slate-500">{description}</p>}</div>
          <button type="button" onClick={onClose} aria-label={`Close ${title}`} className="grid size-8 shrink-0 place-items-center rounded-md border border-slate-700 text-slate-400 transition hover:border-slate-600 hover:bg-slate-800/60 hover:text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-400"><X size={15} /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>
      </section>
    </div>,
    document.body
  )
}
