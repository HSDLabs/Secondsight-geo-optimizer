export async function extractAccessibility(page) {
  const [domAnalysis, ariaSnapshot] = await Promise.all([
    page.evaluate(() => {
    const importantTags = [
      'header',
      'nav',
      'main',
      'section',
      'article',
      'footer',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'button',
      'a',
      'img',
      'form',
      'input'
    ]

    const semanticIndex = {}
    const nodeIssues = new Map()
    const nodeIds = new WeakMap()
    const issues = []
    let nodeCounter = 0
    let issueCounter = 0

    function flattenNodes(nodes) {
      return nodes.reduce((acc, node) => {
        if (!node) return acc

        if (Array.isArray(node)) {
          acc.push(...flattenNodes(node))
          return acc
        }

        acc.push(node)
        return acc
      }, [])
    }

    function getAccessibleName(element) {
      const ariaLabel = element.getAttribute('aria-label')?.trim()
      if (ariaLabel) return ariaLabel

      const labelledBy = element.getAttribute('aria-labelledby')
      if (labelledBy) {
        const label = labelledBy
          .split(/\s+/)
          .map(id => document.getElementById(id)?.textContent?.trim())
          .filter(Boolean)
          .join(' ')

        if (label) return label
      }

      const alt = element.getAttribute('alt')?.trim()
      if (alt) return alt

      const title = element.getAttribute('title')?.trim()
      if (title) return title

      const heading = element.matches('section, article, main, header, footer, nav')
        ? element.querySelector('h1, h2, h3')?.textContent?.trim()
        : ''
      if (heading) return heading

      return (
        element.innerText?.trim() ||
        element.textContent?.trim() ||
        ''
      ).slice(0, 60)
    }

    function getSelector(element) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) return ''
      if (element.id) return `#${CSS.escape(element.id)}`

      const parts = []
      let current = element

      while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
        const tag = current.tagName.toLowerCase()
        const className = [...current.classList].slice(0, 2).map(item => `.${CSS.escape(item)}`).join('')
        let part = `${tag}${className}`
        const siblings = [...current.parentElement?.children || []]
          .filter(child => child.tagName === current.tagName)

        if (siblings.length > 1) {
          part += `:nth-of-type(${siblings.indexOf(current) + 1})`
        }

        parts.unshift(part)
        current = current.parentElement
      }

      return parts.length ? parts.join(' > ') : element.tagName.toLowerCase()
    }

    function getBox(element) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) return null

      const style = window.getComputedStyle(element)
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return null

      const rect = element.getBoundingClientRect()
      if (rect.width <= 5 || rect.height <= 5) return null

      const docWidth = Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0)
      const docHeight = Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0)

      if (rect.right < 0 || rect.bottom < 0 || rect.left > docWidth || rect.top > docHeight) return null

      return {
        x: Math.round(rect.left + window.scrollX),
        y: Math.round(rect.top + window.scrollY),
        w: Math.round(rect.width),
        h: Math.round(rect.height)
      }
    }

    function getElementContext(element) {
      if (!element || !element.parentElement) return ''
      let current = element.parentElement
      while (current && current !== document.body && current !== document.documentElement) {
        const tag = current.tagName.toLowerCase()
        if (['nav', 'header', 'footer', 'main', 'article', 'section', 'aside', 'form', 'ul', 'ol'].includes(tag)) {
          const role = current.getAttribute('role') || tag
          const ariaLabel = current.getAttribute('aria-label')
          const id = current.getAttribute('id')
          const className = typeof current.className === 'string' ? current.className.split(' ')[0] : ''
          
          let identifier = ariaLabel || id || className
          let humanRole = role.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          
          if (identifier && typeof identifier === 'string') {
             identifier = identifier.replace(/[-_.]/g, ' ').trim().replace(/\b\w/g, c => c.toUpperCase())
             return `${humanRole} (${identifier})`.trim()
          }
          return humanRole
        }
        current = current.parentElement
      }
      return ''
    }

    function getNodeId(element) {
      if (nodeIds.has(element)) return nodeIds.get(element)

      nodeCounter += 1
      const id = `node_${String(nodeCounter).padStart(4, '0')}`
      const type = element.getAttribute('role') || element.tagName.toLowerCase()
      const label = getAccessibleName(element)
      const selector = getSelector(element)
      const bbox = getBox(element)
      const context = getElementContext(element)

      nodeIds.set(element, id)
      nodeIssues.set(id, [])
      semanticIndex[id] = {
        id,
        type,
        label,
        selector,
        context,
        bbox,
        issues: []
      }

      return id
    }

    function getValidSemanticParent(element) {
      let current = element
      while (current && current !== document.body) {
        if (getBox(current)) {
          const tag = current.tagName.toLowerCase()
          if (importantTags.includes(tag) || current.getAttribute('role')) {
            return current
          }
        }
        current = current.parentElement
      }
      return element
    }

    function addIssue({ type, element, severity, confidence, reason, targetElements = [] }) {
      issueCounter += 1
      
      const adjustedTargets = targetElements.map(target => {
        if (!getBox(target)) {
          return getValidSemanticParent(target)
        }
        return target
      })

      const nodeIdList = adjustedTargets.map(target => getNodeId(target))
      const id = `issue_${String(issueCounter).padStart(4, '0')}`
      const issue = {
        id,
        type,
        element,
        severity,
        confidence,
        reason,
        nodeIds: nodeIdList
      }

      nodeIdList.forEach(nodeId => {
        const issueList = nodeIssues.get(nodeId) || []
        issueList.push(id)
        nodeIssues.set(nodeId, issueList)
        semanticIndex[nodeId].issues = issueList
      })

      issues.push(issue)
    }

    document.querySelectorAll('img').forEach(img => {
      const role = img.getAttribute('role')
      const ariaHidden = img.getAttribute('aria-hidden') === 'true'
      const alt = img.getAttribute('alt')
      
      if (ariaHidden || role === 'presentation' || role === 'none' || alt === '') return
      
      const rect = img.getBoundingClientRect()
      if (rect.width < 24 || rect.height < 24) return
      
      const style = window.getComputedStyle(img)
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return

      if (alt === null || alt.trim() === '') {
        const isLarge = rect.width > 200 && rect.height > 200
        addIssue({
          type: 'Missing alt text',
          element: img.outerHTML.slice(0, 80),
          severity: 'critical',
          confidence: isLarge ? 'High' : 'Medium',
          reason: isLarge 
            ? `Visible image larger than ${Math.round(rect.width)}x${Math.round(rect.height)} with no alt text.`
            : `Visible image lacking alt text.`,
          targetElements: [img]
        })
      }
    })

    document.querySelectorAll('button').forEach(button => {
      const name = getAccessibleName(button)
      const hasSvg = button.querySelector('svg')
      const hasImg = button.querySelector('img')

      if (name) return
      
      const style = window.getComputedStyle(button)
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return

      addIssue({
        type: 'Unlabeled button',
        element: button.outerHTML.slice(0, 80),
        severity: 'critical',
        confidence: (hasSvg || hasImg) ? 'Medium' : 'High',
        reason: (hasSvg || hasImg)
          ? 'No visible label detected but element contains SVG or image.'
          : 'Button contains no text, aria-label, or meaningful content.',
        targetElements: [button]
      })
    })

    document.querySelectorAll('a').forEach(link => {
      const name = getAccessibleName(link)
      const hasSvg = link.querySelector('svg')
      const hasImg = link.querySelector('img')

      if (name) return
      
      const style = window.getComputedStyle(link)
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return

      addIssue({
        type: 'Empty link',
        element: link.outerHTML.slice(0, 80),
        severity: 'warning',
        confidence: (hasSvg || hasImg) ? 'Medium' : 'High',
        reason: (hasSvg || hasImg)
          ? 'No visible label detected but element contains SVG or image.'
          : 'Link contains no text, aria-label, or meaningful content.',
        targetElements: [link]
      })
    })

    document.querySelectorAll('input:not([type="hidden"])').forEach(input => {
      const name = getAccessibleName(input)
      const hasLabel =
        input.id &&
        document.querySelector(`label[for="${CSS.escape(input.id)}"]`)

      if (name || hasLabel) return

      const style = window.getComputedStyle(input)
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return

      addIssue({
        type: 'Unlabeled input',
        element: input.outerHTML.slice(0, 80),
        severity: 'critical',
        confidence: 'High',
        reason: 'Input field has no associated label or aria-label.',
        targetElements: [input]
      })
    })

    const h1s = [...document.querySelectorAll('h1')]

    if (h1s.length === 0) {
      issues.push({
        id: `issue_${String(++issueCounter).padStart(4, '0')}`,
        type: 'Missing H1',
        element: 'page',
        severity: 'critical',
        confidence: 'High',
        reason: 'No H1 tags found on the entire document.',
        nodeIds: ['node_0000']
      })
    }

    if (h1s.length > 1) {
      addIssue({
        type: `Multiple H1s (${h1s.length})`,
        element: 'page',
        severity: 'warning',
        confidence: 'High',
        reason: 'Multiple H1 tags found, which can confuse document structure.',
        targetElements: h1s
      })
    }

    function buildTree(element, depth = 0) {
      if (!element || depth > 6) return null

      const tag = element.tagName.toLowerCase()
      const isImportant =
        importantTags.includes(tag) ||
        element.getAttribute('role')

      if (!isImportant) {
        return flattenNodes(
          [...element.children].map(child => buildTree(child, depth))
        ).filter(Boolean)
      }

      if (!getBox(element)) {
        return flattenNodes(
          [...element.children].map(child => buildTree(child, depth))
        ).filter(Boolean)
      }

      const id = getNodeId(element)
      const metadata = semanticIndex[id]
      const children = prioritizeNodes(flattenNodes(
        [...element.children].map(child => buildTree(child, depth + 1))
      ).filter(Boolean))
        .slice(0, 18)

      return {
        id,
        role: metadata.type,
        name: metadata.label,
        selector: metadata.selector,
        bbox: metadata.bbox,
        issues: metadata.issues,
        children
      }
    }

    function countDescendants(node) {
      return (node.children || []).reduce(
        (total, child) => total + 1 + countDescendants(child),
        0
      )
    }

    function prioritizeNodes(nodes) {
      return [...nodes].sort((a, b) => {
        const aSignal = (a.issues?.length || 0) * 10 + structuralWeight(a.role) + countDescendants(a)
        const bSignal = (b.issues?.length || 0) * 10 + structuralWeight(b.role) + countDescendants(b)
        return bSignal - aSignal
      })
    }

    function structuralWeight(role) {
      const weights = {
        header: 8,
        nav: 8,
        main: 7,
        section: 6,
        article: 6,
        footer: 5,
        h1: 5,
        h2: 4,
        h3: 3,
        form: 5,
        button: 3,
        a: 2,
        img: 2,
        input: 2
      }

      return weights[role] || 1
    }

    const snapshot = {
      id: 'node_0000',
      role: 'document',
      name: document.title || '',
      selector: 'document',
      bbox: {
        x: 0,
        y: 0,
        w: Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0),
        h: Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0)
      },
      issues: issues
        .filter(issue => issue.nodeIds.includes('node_0000'))
        .map(issue => issue.id),
      children: prioritizeNodes(flattenNodes(
        [...document.body.children].map(child => buildTree(child, 1))
      ).filter(Boolean))
        .slice(0, 20)
    }

    semanticIndex.node_0000 = {
      id: 'node_0000',
      type: 'document',
      label: document.title || '',
      selector: 'document',
      bbox: snapshot.bbox,
      issues: snapshot.issues
    }

    const allImages = [...document.querySelectorAll('img')]
    const contentImages = allImages.filter(img => {
      const role = img.getAttribute('role')
      return img.getAttribute('aria-hidden') !== 'true' && role !== 'presentation' && role !== 'none'
    })
    const imagesWithAlt = contentImages.filter(img => Boolean(img.getAttribute('alt')?.trim())).length
    const labeledControls = [...document.querySelectorAll('button, input:not([type="hidden"]), select, textarea')]
      .filter(element => Boolean(getAccessibleName(element))).length
    const counts = selector => document.querySelectorAll(selector).length
    const landmarkRoles = ['header', 'nav', 'main', 'aside', 'footer']
    const landmarkBreakdown = Object.fromEntries(landmarkRoles.map(role => [
      role,
      counts(`${role}, [role="${role === 'header' ? 'banner' : role === 'nav' ? 'navigation' : role === 'aside' ? 'complementary' : role === 'footer' ? 'contentinfo' : role}"]`)
    ]))
    const headingOutline = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')]
      .map(heading => ({
        level: Number(heading.tagName.slice(1)),
        text: heading.textContent?.replace(/\s+/g, ' ').trim().slice(0, 120) || '',
        id: heading.id || ''
      }))
      .filter(heading => heading.text)
      .slice(0, 40)
    const hiddenElements = [...document.querySelectorAll('[hidden], [aria-hidden="true"]')]
      .filter(element => element.textContent?.trim() || element.querySelector('img, svg, video')).length

    return {
      snapshot,
      issues,
      semanticIndex,
      stats: {
        landmarks: counts('header, nav, main, aside, footer, [role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"]'),
        headings: counts('h1, h2, h3, h4, h5, h6'),
        links: counts('a'),
        buttons: counts('button'),
        forms: counts('form'),
        images: contentImages.length,
        totalNodes: Object.keys(semanticIndex).length,
        landmarkBreakdown,
        headingOutline,
        controls: counts('button, input:not([type="hidden"]), select, textarea'),
        labeledControls,
        imagesWithAlt,
        altCoverage: contentImages.length ? Math.round((imagesWithAlt / contentImages.length) * 100) : null,
        explicitlyHiddenElements: hiddenElements
      }
    }
    }),
    page.locator('body').ariaSnapshot().catch(() => '')
  ])

  return {
    ...domAnalysis,
    ariaSnapshot
  }
}
