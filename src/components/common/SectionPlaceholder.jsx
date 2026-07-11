export default function SectionPlaceholder({ label }) {
  return (
    <section className="section-block section-placeholder empty-hero w-screen" aria-labelledby="placeholder-title" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center', margin: '0 auto', maxWidth: '1400px' }}>
      <div className="empty-hero-icon" style={{ marginBottom: '24px' }}>
        <svg viewBox="0 0 24 24" width="32" height="32" stroke="currentColor" strokeWidth="1.5" fill="none">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
        </svg>
      </div>
      <h2 id="placeholder-title" style={{ margin: '0 0 12px', fontSize: '1.5rem', color: 'var(--text)' }}>
        Currently working on {label}
      </h2>
      <p style={{ margin: 0, color: 'var(--muted)', maxWidth: '400px', fontSize: '0.95rem', lineHeight: 1.5 }}>
        We are actively building this module. Check back soon for updates.
      </p>
    </section>
  )
}
