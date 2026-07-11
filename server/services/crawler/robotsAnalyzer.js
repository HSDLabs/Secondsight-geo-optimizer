const SUPPORTED_DIRECTIVES = new Set(['user-agent', 'allow', 'disallow', 'sitemap', 'crawl-delay', 'host'])

export function analyzeRobotsTxt(raw, { sitemapErrors = [], lastModified = null } = {}) {
  const sourceLines = String(raw || '').replace(/^\uFEFF/, '').split(/\r?\n/)
  const lines = []
  const issues = []
  const issueById = new Map()
  const seenRules = new Map()
  const rulesByScope = new Map()
  let currentAgents = []
  let groupHasRules = false

  const addIssue = (issue, lineNumber) => {
    if (!issueById.has(issue.id)) {
      issueById.set(issue.id, issue)
      issues.push(issue)
    }
    if (lineNumber) issueById.get(issue.id).lines = [...new Set([...(issueById.get(issue.id).lines || []), lineNumber])]
    return issue.id
  }

  sourceLines.forEach((rawLine, index) => {
    const number = index + 1
    const trimmed = rawLine.trim()
    const commentIndex = rawLine.indexOf('#')
    const content = (commentIndex >= 0 ? rawLine.slice(0, commentIndex) : rawLine).trim()
    const comment = commentIndex >= 0 ? rawLine.slice(commentIndex + 1).trim() : ''
    const entry = { number, raw: rawLine, type: trimmed ? 'unknown' : 'blank', value: '', userAgents: [...currentAgents], severity: null, issueIds: [] }

    if (!content) {
      entry.type = comment ? 'comment' : 'blank'
      entry.value = comment
      lines.push(entry)
      return
    }

    const colonIndex = content.indexOf(':')
    if (colonIndex < 0) {
      entry.type = 'invalid'
      entry.severity = 'warning'
      entry.issueIds.push(addIssue(makeIssue(`robots-malformed-${number}`, 'Malformed robots.txt directive', 'warning', `Line ${number} does not contain a colon.`, 'Use the format “Directive: value”.'), number))
      lines.push(entry)
      return
    }

    const directive = content.slice(0, colonIndex).trim().toLowerCase()
    const value = content.slice(colonIndex + 1).trim()
    entry.type = SUPPORTED_DIRECTIVES.has(directive) ? directive : 'unknown'
    entry.value = value

    if (directive === 'user-agent') {
      if (groupHasRules) {
        currentAgents = []
        groupHasRules = false
      }
      if (value) currentAgents.push(value)
      else {
        entry.severity = 'warning'
        entry.issueIds.push(addIssue(makeIssue(`robots-empty-agent-${number}`, 'Empty user-agent directive', 'warning', `Line ${number} has no crawler token.`, 'Add a crawler token such as * or Googlebot.'), number))
      }
      entry.userAgents = [...currentAgents]
    } else if (directive === 'allow' || directive === 'disallow') {
      groupHasRules = true
      entry.userAgents = [...currentAgents]
      if (!currentAgents.length) {
        entry.severity = 'warning'
        entry.issueIds.push(addIssue(makeIssue(`robots-rule-outside-group-${number}`, 'Rule outside a user-agent group', 'warning', `Line ${number} is ignored because it has no preceding User-agent.`, 'Move the rule below the intended User-agent directive.'), number))
      }
      if (!value) {
        entry.severity = entry.severity || 'info'
      } else {
        const scope = currentAgents.map(agent => agent.toLowerCase()).sort().join(',') || 'none'
        const exactKey = `${scope}|${directive}|${value}`
        if (seenRules.has(exactKey)) {
          entry.severity = 'info'
          entry.issueIds.push(addIssue(makeIssue(`robots-duplicate-${seenRules.get(exactKey)}-${number}`, 'Duplicate robots.txt rule', 'info', `Line ${number} duplicates line ${seenRules.get(exactKey)}.`, 'Remove the duplicate to keep the policy easier to audit.'), number))
        } else seenRules.set(exactKey, number)

        const conflictKey = `${scope}|${value}`
        const previous = rulesByScope.get(conflictKey)
        if (previous && previous.directive !== directive) {
          const id = `robots-conflict-${previous.line}-${number}`
          entry.severity = 'warning'
          entry.issueIds.push(addIssue(makeIssue(id, 'Conflicting robots.txt rules', 'warning', `Lines ${previous.line} and ${number} use Allow and Disallow for the same pattern. RFC 9309 resolves the tie in favor of Allow.`, 'Remove the contradictory rule or make the intended rule more specific.'), number))
          addIssue(issueById.get(id), previous.line)
        } else rulesByScope.set(conflictKey, { directive, line: number })

        if (directive === 'disallow' && value === '/') {
          const label = currentAgents.length ? currentAgents.join(', ') : 'an unspecified crawler'
          entry.severity = 'critical'
          entry.issueIds.push(addIssue(makeIssue(`robots-root-block-${number}`, 'Crawler access fully blocked', 'critical', `Disallow: / fully blocks ${label}.`, 'Remove the blanket block or add narrowly scoped rules where appropriate.'), number))
        }
      }
    } else if (directive === 'crawl-delay') {
      const delay = Number(value)
      if (!Number.isFinite(delay) || delay < 0) {
        entry.severity = 'warning'
        entry.issueIds.push(addIssue(makeIssue(`robots-invalid-delay-${number}`, 'Invalid crawl-delay', 'warning', `Line ${number} does not contain a valid non-negative delay.`, 'Use a numeric crawl delay or remove the directive.'), number))
      } else if (delay >= 10) {
        entry.severity = 'warning'
        entry.issueIds.push(addIssue(makeIssue(`robots-high-delay-${number}`, 'Crawl delay may slow discovery', 'warning', `A ${delay}-second crawl delay can substantially slow discovery.`, 'Reduce the delay if server capacity allows.'), number))
      }
    } else if (directive === 'sitemap') {
      const failure = sitemapErrors.find(error => error.url === value)
      if (failure) {
        entry.severity = 'critical'
        entry.issueIds.push(addIssue(makeIssue(`robots-sitemap-error-${number}`, 'Referenced sitemap is unavailable', 'critical', failure.error || `The sitemap at line ${number} could not be parsed.`, 'Fix the sitemap response or update the Sitemap directive.'), number))
      }
    } else if (!SUPPORTED_DIRECTIVES.has(directive)) {
      entry.severity = 'info'
      entry.issueIds.push(addIssue(makeIssue(`robots-unknown-${number}`, 'Unknown robots.txt directive', 'info', `“${directive}” is not interpreted by this analyzer.`, 'Confirm that the directive is supported by the crawlers you target.'), number))
    }

    lines.push(entry)
  })

  const count = type => lines.filter(line => line.type === type).length
  return {
    summary: {
      totalRules: count('allow') + count('disallow'),
      userAgentGroups: new Set(lines.filter(line => line.type === 'user-agent').flatMap(line => line.userAgents.map(agent => agent.toLowerCase()))).size,
      allowRules: count('allow'),
      disallowRules: count('disallow'),
      comments: lines.filter(line => line.type === 'comment' || line.raw.includes('#')).length,
      sitemapDirectives: count('sitemap'),
      crawlDelay: lines.find(line => line.type === 'crawl-delay')?.value || null,
      lastModified
    },
    lines,
    issues
  }
}

function makeIssue(id, title, severity, evidence, recommendation) {
  return { id, type: 'robots-analysis', title, severity, confidence: 'definite', affectedUrls: [], evidence, recommendation, crawlerAffected: ['all'], source: 'robots.txt', lines: [] }
}
