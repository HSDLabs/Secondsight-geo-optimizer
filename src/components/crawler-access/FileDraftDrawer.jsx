import { useEffect, useRef, useState } from 'react'
import { Check, Clipboard, Download, Info, RotateCw, TriangleAlert, X } from '../icons/heroicons'

export default function FileDraftDrawer({ open, activeTab, onTabChange, onClose, drafts, onRegenerate }) {
  const [copied, setCopied] = useState(false)
  const closeRef = useRef(null)
  const previousFocusRef = useRef(null)
  const draft = drafts[activeTab]

  useEffect(() => {
    if (!open) return undefined
    previousFocusRef.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    const onKeyDown = event => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
      previousFocusRef.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  const copy = async () => {
    if (!draft?.content) return
    await navigator.clipboard.writeText(draft.content)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const download = () => {
    if (!draft?.content) return
    const href = URL.createObjectURL(new Blob([draft.content], { type: 'text/plain;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = href
    link.download = activeTab
    link.click()
    URL.revokeObjectURL(href)
  }

  return <div className="fixed inset-0 z-50" role="presentation">
    <button type="button" aria-label="Close draft drawer" onClick={onClose} className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
    <aside role="dialog" aria-modal="true" aria-labelledby="file-draft-title" className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col border-l border-[var(--border)] bg-[var(--panel)] shadow-2xl animate-[drawerIn_180ms_ease-out] motion-reduce:animate-none">
      <header className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
        <div><p className="text-[10px] font-bold uppercase tracking-[.13em] text-[var(--accent-blue)]">Local draft workspace</p><h2 id="file-draft-title" className="mt-1 text-lg font-bold text-[var(--text)]">Policy &amp; Guidance Files</h2></div>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close drawer" className="grid size-10 place-items-center rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)]"><X size={18} /></button>
      </header>

      <div className="flex border-b border-[var(--border)] px-5" role="tablist" aria-label="Draft file">
        {['robots.txt', 'llms.txt'].map(tab => <button type="button" role="tab" aria-selected={activeTab === tab} key={tab} onClick={() => { setCopied(false); onTabChange(tab) }} className={`min-h-11 border-b-2 px-4 text-[12px] font-semibold ${activeTab === tab ? 'border-[var(--accent-blue)] text-[var(--accent-blue)]' : 'border-transparent text-[var(--text-secondary)]'}`}>{tab}</button>)}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        {draft?.error && <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-[var(--accent-red)]/20 bg-[var(--accent-red)]/[.07] p-3 text-[12px] text-[var(--status-danger)]"><TriangleAlert size={16} className="mt-0.5 shrink-0" />{draft.error}</div>}
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-[12px] font-bold uppercase tracking-[.08em] text-[var(--text)]">Generated draft</h3><p className="mt-1 text-[11px] text-[var(--text-secondary)]">Review before publishing at the site root.</p></div><div className="flex flex-wrap gap-2"><Action onClick={copy} disabled={!draft?.content || draft?.loading} icon={copied ? <Check size={14} /> : <Clipboard size={14} />} label={copied ? 'Copied' : 'Copy'} /><Action onClick={download} disabled={!draft?.content || draft?.loading} icon={<Download size={14} />} label="Download" /><Action onClick={() => onRegenerate(activeTab)} disabled={draft?.loading} icon={<RotateCw size={14} className={draft?.loading ? 'animate-spin' : ''} />} label={draft?.loading ? 'Generating' : 'Regenerate'} primary /></div></div>

        {draft?.loading ? <div className="mt-4 grid min-h-48 place-items-center rounded-xl border border-dashed border-[var(--border)] text-center"><div><RotateCw size={22} className="mx-auto animate-spin text-[var(--accent-blue)]" /><p className="mt-3 text-[12px] text-[var(--text-secondary)]">Preparing {activeTab}…</p></div></div> : <pre className="mt-4 max-h-80 min-h-48 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-[var(--border)] bg-[var(--bg-darker)] p-4 font-mono text-[11px] leading-5 text-[var(--text-secondary)]">{draft?.content || `No ${activeTab} draft has been generated yet.`}</pre>}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <FindingList title="What works" items={draft?.strengths} empty="No confirmed strengths yet." tone="good" />
          <FindingList title="Improve next" items={draft?.improvements} empty="No improvements identified yet." tone="warning" />
        </div>

        <section className="mt-4 rounded-xl border border-[var(--border)] p-4"><h3 className="text-[11px] font-bold uppercase tracking-[.08em] text-[var(--text)]">Validation messages</h3>{draft?.messages?.length ? <ul className="mt-3 space-y-2">{draft.messages.map(message => <li key={message} className="flex gap-2 text-[11px] leading-5 text-[var(--text-secondary)]"><Info size={14} className="mt-0.5 shrink-0 text-[var(--status-info)]" />{message}</li>)}</ul> : <p className="mt-2 text-[11px] text-[var(--text-secondary)]">No validation messages.</p>}</section>
      </div>

      <footer className="border-t border-[var(--border)] bg-[var(--bg-darker)]/35 px-5 py-3 text-[11px] leading-5 text-[var(--text-secondary)]">SecondSight creates a local draft only and never publishes changes automatically.</footer>
    </aside>
  </div>
}

function Action({ onClick, disabled, icon, label, primary }) { return <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${primary ? 'border-[var(--accent-blue)]/35 bg-[var(--accent-blue)] text-white' : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text)]'}`}>{icon}{label}</button> }
function FindingList({ title, items = [], empty, tone }) { const color = tone === 'good' ? 'text-[var(--status-good)]' : 'text-[var(--status-warning)]'; return <section className="rounded-xl border border-[var(--border)] p-4"><h3 className={`text-[11px] font-bold uppercase tracking-[.08em] ${color}`}>{title}</h3>{items.length ? <ul className="mt-3 space-y-2">{items.slice(0, 8).map(item => <li key={item} className="text-[11px] leading-5 text-[var(--text-secondary)]">• {item}</li>)}</ul> : <p className="mt-2 text-[11px] text-[var(--text-secondary)]">{empty}</p>}</section> }
