export default function missingH1(element, context) {
  const inferredText = context || 'Page Title'
  const confidence = context ? 'High' : 'Medium'
  
  const before = element || '<title>Page Title</title>'
  const after = `${before}\n<h1>${inferredText}</h1>`
  
  return {
    before,
    after,
    why: context ? 'Derived from page <title>' : 'Page level recommendation',
    confidence
  }
}
