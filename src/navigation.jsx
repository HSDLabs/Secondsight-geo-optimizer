import Overview from './components/overview/Overview'
import MachineUnderstanding from './components/machine-understanding/MachineUnderstanding'
import CrawlerAccess from './components/crawler-access/CrawlerAccess'
import Settings from './components/settings/Settings'
import ExternalIntelligence from './components/external-intelligence/ExternalIntelligence'
import AIVisibilityPage from './pages/AIVisibilityPage'

export const NAV_GROUPS = ['Pre-build', 'Diagnostics', '', 'Tools', 'Settings']

export const navItems = [
  {
    path: '/',
    label: 'Overview',
    group: 'Pre-build',
    description: 'Executive summary comparing the human, machine, and LLM views of the page.',
    element: <Overview />
  },
  {
    path: '/ai-understanding',
    label: 'Machine Readability',
    group: 'Pre-build',
    futureGroup: 'Site Readiness',
    description: 'How clearly machines can extract the page structure, content, metadata, semantics, and entities.',
    element: <MachineUnderstanding />
  },
  {
    path: '/crawl-indexability',
    featureKey: 'crawler',
    legacyPaths: ['/crawler-access'],
    label: 'Crawl & Indexability',
    group: 'Pre-build',
    futureGroup: 'Site Readiness',
    description: 'Whether AI crawlers can fetch and render the page at all — robots rules, status codes, and JavaScript rendering.',
    element: <CrawlerAccess />
  },
  {
    path: '/sources-authority',
    featureKey: 'sources',
    legacyPaths: ['/content-intelligence'],
    label: 'Sources & Authority',
    group: 'Pre-build',
    productArea: 'AI Visibility',
    description: 'Shows where a brand appears, what external sources associate with it, and the evidence behind authority and reputation findings.',
    element: <ExternalIntelligence />
  },
  {
    path: '/ai-visibility',
    featureKey: 'aiVisibility',
    legacyPaths: ['/aiVisibility'],
    label: 'AI Visibility',
    group: 'Pre-build',
    description: 'How leading AI systems mention, recommend, and cite the analyzed brand.',
    element: <AIVisibilityPage />
  },
  {
    path: '/opportunities',
    label: 'Recommendation',
    group: 'Pre-build',
    description: 'Prioritized, actionable fixes derived from the diagnostics above.'
  },
  // {
  //   path: '/prompt-simulator',
  //   label: 'Prompt Simulator',
  //   group: 'Tools',
  //   description: 'Interactively ask an LLM about the analyzed page and inspect how it answers.'
  // },
  {
    path: '/settings',
    label: 'Settings',
    group: 'Settings',
    description: 'Configure analysis behavior and preferences.',
    element: <Settings />
  }
]
