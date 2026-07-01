import { useOutletContext } from 'react-router-dom'

// One reusable, data-aware stub for every section that is not yet built.
// It shows the section's purpose and an honest state — an empty-state before
// analysis and a "reserved layer" note after — without inventing any numbers.
export default function SectionPlaceholder({ label, description }) {
  const { data } = useOutletContext()

  return (
    <section className="section-block section-placeholder" aria-labelledby="placeholder-title">
      <div className="section-header">
        <div>
          <p className="eyebrow">Reserved GEO Layer</p>
          <h2 id="placeholder-title">{label}</h2>
        </div>
      </div>

      <p className="placeholder-lead">{description}</p>

      {data ? (
        <div className="placeholder-note">
          <p>
            This section is reserved. The current analysis has run, but{' '}
            <strong>{label}</strong> does not yet compute its own signals — it will build on the
            existing page data in a later step.
          </p>
        </div>
      ) : (
        <div className="placeholder-note">
          <p>Analyze a URL from the header to populate this section.</p>
        </div>
      )}
    </section>
  )
}
