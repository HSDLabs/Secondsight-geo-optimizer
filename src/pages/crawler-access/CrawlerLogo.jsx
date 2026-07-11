const tileTone = {
  openai: 'border-sky-400/20 bg-sky-400/10 text-sky-300',
  anthropic: 'border-lime-400/20 bg-lime-400/10 text-lime-300',
  google: 'border-blue-400/20 bg-blue-400/10 text-blue-300',
  microsoft: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-300',
  perplexity: 'border-teal-400/20 bg-teal-400/10 text-teal-300'
}

export default function CrawlerLogo({ company, size = 'md', label }) {
  const dimensions = size === 'sm' ? 'size-6 rounded' : 'size-8 rounded-md'
  return (
    <span className={`grid shrink-0 place-items-center border ${dimensions} ${tileTone[company] || tileTone.openai}`} role="img" aria-label={label || `${company} logo`}>
      <svg viewBox="0 0 24 24" className={size === 'sm' ? 'size-3.5' : 'size-[18px]'} fill="none" aria-hidden="true">
        {company === 'openai' && <OpenAIMark />}
        {company === 'anthropic' && <AnthropicMark />}
        {company === 'google' && <GoogleMark />}
        {company === 'microsoft' && <MicrosoftMark />}
        {company === 'perplexity' && <PerplexityMark />}
      </svg>
    </span>
  )
}

function OpenAIMark() {
  return <path d="M12 3.2a4.1 4.1 0 0 1 3.65 2.22 4.1 4.1 0 0 1 3.12 6.15 4.1 4.1 0 0 1-3.12 6.15A4.1 4.1 0 0 1 9.4 19.5a4.1 4.1 0 0 1-5.25-4.53A4.1 4.1 0 0 1 7.28 8.8 4.1 4.1 0 0 1 12 3.2Zm0 3.2L7.2 9.18v5.55L12 17.5l4.8-2.77V9.18L12 6.4Zm0 3 2.22 1.28v2.56L12 14.52l-2.22-1.28v-2.56L12 9.4Z" fill="currentColor" fillRule="evenodd" />
}

function AnthropicMark() {
  return <path d="M4 19 9.15 5h3.05l5.2 14h-3l-1.08-3.25H8L6.92 19H4Zm4.82-5.7h3.7l-1.85-5.55-1.85 5.55ZM18.2 5H21v14h-2.8V5Z" fill="currentColor" />
}

function GoogleMark() {
  return <><path d="M20.3 12.2c0-.7-.06-1.22-.18-1.78H12v3.2h4.76a4.2 4.2 0 0 1-1.76 2.7l2.78 2.15c1.62-1.5 2.52-3.7 2.52-6.29Z" fill="#4285F4" /><path d="M12 20.6c2.32 0 4.26-.76 5.68-2.08l-2.78-2.15c-.78.52-1.77.88-2.9.88-2.24 0-4.14-1.51-4.82-3.55l-2.87 2.2A8.58 8.58 0 0 0 12 20.6Z" fill="#34A853" /><path d="M7.18 13.7A5.18 5.18 0 0 1 6.9 12c0-.59.1-1.17.28-1.7L4.3 8.1A8.53 8.53 0 0 0 3.4 12c0 1.4.33 2.73.9 3.9l2.88-2.2Z" fill="#FBBC05" /><path d="M12 6.75c1.27 0 2.4.44 3.3 1.29l2.46-2.47A8.28 8.28 0 0 0 12 3.4 8.58 8.58 0 0 0 4.31 8.1l2.87 2.2C7.86 8.26 9.76 6.75 12 6.75Z" fill="#EA4335" /></>
}

function MicrosoftMark() {
  return <><path d="M4 4h7v7H4V4Z" fill="#f35325" /><path d="M13 4h7v7h-7V4Z" fill="#81bc06" /><path d="M4 13h7v7H4v-7Z" fill="#05a6f0" /><path d="M13 13h7v7h-7v-7Z" fill="#ffba08" /></>
}

function PerplexityMark() {
  return <path d="m12 3 3.2 4.1H20v9.8h-4.8L12 21l-3.2-4.1H4V7.1h4.8L12 3Zm0 3.2v11.6m-6-8.7 6 4.3 6-4.3M6 15l6-4.4 6 4.4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
}
