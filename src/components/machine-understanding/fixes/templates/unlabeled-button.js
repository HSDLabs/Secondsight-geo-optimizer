export default function unlabeledButton(element, context) {
  const inferredLabel = context || 'Action'
  const confidence = context ? 'Medium' : 'Low'
  
  const before = element || '<button></button>'
  
  let after
  if (before.includes('<button')) {
    after = before.replace('<button', `<button aria-label="${inferredLabel}"`)
  } else {
    after = `<button aria-label="${inferredLabel}"></button>`
  }
  
  return {
    before,
    after,
    why: context ? `Inferred from nearby heading: "${context}"` : 'Fallback generic suggestion',
    confidence
  }
}
