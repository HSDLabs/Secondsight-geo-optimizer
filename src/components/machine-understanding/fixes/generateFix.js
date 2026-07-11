import missingAlt from './templates/missing-alt'
import emptyLink from './templates/empty-link'
import missingH1 from './templates/missing-h1'
import multipleH1s from './templates/multiple-h1s'
import unlabeledButton from './templates/unlabeled-button'

const TEMPLATES = {
  'Missing alt text': missingAlt,
  'Empty link': emptyLink,
  'Missing H1': missingH1,
  'Multiple H1s': multipleH1s,
  'Unlabeled button': unlabeledButton
}

export function generateFix(type, element = '', context = '') {
  const templateKey = Object.keys(TEMPLATES).find(key => type.startsWith(key))
  const template = templateKey ? TEMPLATES[templateKey] : null
  
  if (template) {
    return template(element, context)
  }

  // Fallback for unknown/generic issues
  return {
    before: element || 'No specific element',
    after: 'Make the signal explicit in visible text, semantic markup, or structured data.',
    why: 'General best practice recommendation',
    confidence: 'Low'
  }
}
