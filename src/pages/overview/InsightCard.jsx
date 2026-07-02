const toneLabels = {
  good: 'Good',
  warning: 'Warning',
  poor: 'Poor'
}

export default function InsightCard({ title, status, value, description }) {
  return (
    <article className={`insight-card ${status}`}>
      <div className="insight-heading">
        <h3>{title}</h3>
        <span>{toneLabels[status] || status}</span>
      </div>
      {value && <strong>{value}</strong>}
      <p>{description}</p>
    </article>
  )
}