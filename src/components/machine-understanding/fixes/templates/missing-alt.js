export default function missingAlt(element, context) {
  const inferredLabel = context || 'Image description'
  const confidence = context ? 'Medium' : 'Low'
  
  const before = element || '<img>'
  
  // simple replace or append
  let after
  if (before.includes('<img')) {
    after = before.replace('<img', `<img alt="${inferredLabel}"`)
  } else {
    after = `<img alt="${inferredLabel}" />`
  }
  
  return {
    before,
    after,
    why: context ? `Inferred from nearest heading: "${context}"` : 'Fallback generic suggestion',
    confidence
  }
}
