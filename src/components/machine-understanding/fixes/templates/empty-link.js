export default function emptyLink(element, context) {
  const inferredText = context || 'Link text'
  const confidence = context ? 'Medium' : 'Low'
  
  const before = element || '<a></a>'
  
  let after
  if (before.includes('</a>')) {
    after = before.replace('</a>', `${inferredText}</a>`)
  } else {
    after = `<a href="#">${inferredText}</a>`
  }
  
  return {
    before,
    after,
    why: context ? `Inferred from parent context: "${context}"` : 'Fallback generic suggestion',
    confidence
  }
}
