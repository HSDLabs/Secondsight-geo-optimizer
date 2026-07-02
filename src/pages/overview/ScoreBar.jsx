export default function ScoreBar({ score }) {
  const normalizedScore = Math.max(0, Math.min(100, Number(score) || 0))

  return (
    <div className="score-bar" aria-label={`AI Visibility score ${normalizedScore} out of 100`}>
      <span style={{ width: `${normalizedScore}%` }} />
    </div>
  )
}