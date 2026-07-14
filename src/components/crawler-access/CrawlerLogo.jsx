const tileTone = {
  openai: 'border-[var(--accent-blue)]/25 bg-[var(--accent-blue)]/10 text-[var(--status-info)]',
  anthropic: 'border-[var(--accent-amber)]/25 bg-[var(--accent-amber)]/10 text-[var(--status-warning)]',
  google: 'border-[var(--accent-blue)]/25 bg-[var(--accent-blue)]/10 text-[var(--status-info)]',
  microsoft: 'border-[var(--accent-teal)]/25 bg-[var(--accent-teal)]/10 text-[var(--status-good)]',
  perplexity: 'border-[var(--accent-purple)]/25 bg-[var(--accent-purple)]/10 text-[var(--status-purple)]'
}

const publicLogo = {
  openai: '/chatgpt-icon.svg',
  anthropic: '/claude-ai-icon.svg',
  google: '/google-gemini-icon.svg',
  perplexity: '/perplexity-ai-icon.svg'
}

export default function CrawlerLogo({ company, size = 'md', label }) {
  const dimensions = size === 'sm' ? 'size-6 rounded' : 'size-8 rounded-md'
  const imageDimensions = size === 'sm' ? 'size-4' : 'size-5'
  const logo = publicLogo[company]
  return (
    <span className={`grid shrink-0 place-items-center border ${dimensions} ${tileTone[company] || tileTone.openai}`}>
      {logo ? <img src={logo} alt={label || `${company} logo`} className={`${imageDimensions} object-contain`} /> : <svg viewBox="0 0 24 24" className={size === 'sm' ? 'size-3.5' : 'size-[18px]'} fill="none" aria-label={label || `${company} logo`}>
        <MicrosoftMark />
      </svg>}
    </span>
  )
}

function MicrosoftMark() {
  return <><path d="M4 4h7v7H4V4Z" fill="#f35325" /><path d="M13 4h7v7h-7V4Z" fill="#81bc06" /><path d="M4 13h7v7H4v-7Z" fill="#05a6f0" /><path d="M13 13h7v7h-7v-7Z" fill="#ffba08" /></>
}
