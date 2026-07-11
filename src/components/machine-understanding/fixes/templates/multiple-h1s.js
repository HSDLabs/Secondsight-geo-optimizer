export default function multipleH1s(element) {
  const before = element || '<h1>First Topic</h1>\n...\n<h1>Second Topic</h1>'
  let after = before.replace('<h1>Second Topic</h1>', '<h2>Second Topic</h2>')
  if (before === after && before.includes('<h1>')) {
    // just a generic replacement if exact string isn't there
    const parts = before.split('<h1>')
    if (parts.length > 2) {
      after = parts[0] + '<h1>' + parts[1] + '<h2>' + parts.slice(2).join('<h2>')
      after = after.replace(/<\/h1>/g, (match, offset) => offset > after.indexOf('</h1>') ? '</h2>' : match)
    }
  } else {
    after = '<h1>First Topic</h1>\n...\n<h2>Second Topic</h2>'
  }
  
  return {
    before,
    after,
    why: 'Demote secondary H1s to preserve document hierarchy',
    confidence: 'High'
  }
}
