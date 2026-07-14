const SOURCE_LOGOS = {
  reddit: { label: 'Reddit', src: '/bxl-reddit.svg', background: 'bg-[#ff4500]' },
  news: { label: 'News', src: '/bx-news.svg', background: 'bg-[#2563eb]' },
  youtube: { label: 'YouTube', src: '/bxl-youtube.svg', background: 'bg-[#ff0000]' },
  x: { label: 'X', mark: 'X', background: 'bg-black' },
  linkedin: { label: 'LinkedIn', mark: 'in', background: 'bg-[#0a66c2]' },
  review: { label: 'Reviews', mark: '★', background: 'bg-slate-600' }
}

const SIZE_CLASSES = {
  sm: 'size-8 rounded-lg',
  md: 'size-10 rounded-xl'
}

export default function SourceLogo({ sourceType, size = 'sm' }) {
  const source = SOURCE_LOGOS[sourceType] || {
    label: sourceType,
    mark: sourceType?.slice(0, 1)?.toUpperCase() || '?',
    background: 'bg-slate-600'
  }

  return (
    <div
      aria-hidden="true"
      data-source-logo={sourceType}
      title={`${source.label} logo`}
      className={`grid shrink-0 place-items-center border border-white/10 shadow-[0_5px_14px_rgba(0,0,0,.2)] ${SIZE_CLASSES[size] || SIZE_CLASSES.sm} ${source.background}`}
    >
      {source.src
        ? <img src={source.src} alt="" className="size-5" />
        : <span className="text-[12px] font-bold leading-none tracking-[-.04em] text-white">{source.mark}</span>}
    </div>
  )
}
