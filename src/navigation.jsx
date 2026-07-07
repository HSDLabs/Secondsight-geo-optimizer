import Overview from './pages/overview/Overview'
import AIUnderstanding from './pages/ai-understanding/AIUnderstanding'
import CrawlerAccess from './pages/crawler-access/CrawlerAccess'
import Settings from './pages/settings/Settings'

// Single source of truth for the app's navigation.
// Both the Sidebar (grouped NavLinks) and the router (<Routes>) consume this list,
// so adding a real section later is just swapping its `element`.
//
// Sections map to the GEO pipeline: Access -> Understand -> Content ->
// Retrieval -> Citation, followed by synthesized outputs, a tool, and settings.
export const NAV_GROUPS = ['Overview', 'Diagnostics', 'Insights', 'Tools', 'Settings']

export const navItems = [
  {
    path: '/',
    label: 'Overview',
    group: 'Overview',
    description: 'Executive summary comparing the human, machine, and LLM views of the page.',
    element: <Overview />
  },
  {
    path: '/ai-understanding',
    label: 'Machine Understanding',
    group: 'Diagnostics',
    description: 'How well machines grasp the page structure, semantics, and entities.',
    element: <AIUnderstanding />
  },
  {
    path: '/crawler-access',
    label: 'Crawler Access',
    group: 'Diagnostics',
    description: 'Whether AI crawlers can fetch and render the page at all — robots rules, status codes, and JavaScript rendering.',
    element: <CrawlerAccess />
  },
  {
    path: '/content-intelligence',
    label: 'External Intelligence',
    group: 'Diagnostics',
    description: 'Aggregates insights from news, Reddit, forums, and public web discussions.'
  },
  {
    path: '/content-gaps',
    label: 'Content Gaps',
    group: 'Insights',
    description: 'What the page is missing compared to what an AI system expects to find.'
  },
  {
    path: '/recommendations',
    label: 'Recommendations',
    group: 'Insights',
    description: 'Prioritized, actionable fixes derived from the diagnostics above.'
  },
  {
    path: '/prompt-simulator',
    label: 'Prompt Simulator',
    group: 'Tools',
    description: 'Interactively ask an LLM about the analyzed page and inspect how it answers.'
  },
  {
    path: '/settings',
    label: 'Settings',
    group: 'Settings',
    description: 'Configure analysis behavior and preferences.',
    element: <Settings />
  }
]
