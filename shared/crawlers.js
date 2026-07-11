export const CRAWLER_CATALOG = [
  { id: 'oai-searchbot', token: 'OAI-SearchBot', name: 'OAI-SearchBot', company: 'openai', purpose: 'ChatGPT search discovery', category: 'search', description: 'Discovers public pages for ChatGPT search results and citations.' },
  { id: 'gptbot', token: 'GPTBot', name: 'GPTBot', company: 'openai', purpose: 'OpenAI model training', category: 'training', description: 'Collects public web content that may be used to improve OpenAI models.' },
  { id: 'chatgpt-user', token: 'ChatGPT-User', name: 'ChatGPT-User', company: 'openai', purpose: 'User-requested ChatGPT fetch', category: 'user', description: 'Fetches a page when a ChatGPT user explicitly requests it.' },
  { id: 'claudebot', token: 'ClaudeBot', name: 'ClaudeBot', company: 'anthropic', purpose: 'Anthropic model training', category: 'training', description: 'Collects public content that may contribute to Anthropic model training.' },
  { id: 'claude-user', token: 'Claude-User', name: 'Claude-User', company: 'anthropic', purpose: 'User-requested Claude fetch', category: 'user', description: 'Retrieves pages in response to an explicit Claude user request.' },
  { id: 'claude-searchbot', token: 'Claude-SearchBot', name: 'Claude-SearchBot', company: 'anthropic', purpose: 'Claude search discovery', category: 'search', description: 'Crawls public pages to improve Claude search relevance and accuracy.' },
  { id: 'googlebot', token: 'Googlebot', name: 'Googlebot', company: 'google', purpose: 'Google Search indexing', category: 'search', description: 'Google’s primary crawler for Search, Discover, and related search features.' },
  { id: 'google-extended', token: 'Google-Extended', name: 'Google-Extended', company: 'google', purpose: 'Gemini usage control', category: 'control', description: 'A robots.txt control token for Gemini-related use, not a separate HTTP crawler identity.' },
  { id: 'bingbot', token: 'bingbot', name: 'Bingbot', company: 'microsoft', purpose: 'Bing Search indexing', category: 'search', description: 'Microsoft Bing’s standard crawler for discovering and indexing web pages.' },
  { id: 'perplexitybot', token: 'PerplexityBot', name: 'PerplexityBot', company: 'perplexity', purpose: 'Perplexity search discovery', category: 'search', description: 'Indexes public pages for Perplexity search answers and citations.' }
]

export const CRAWLER_BY_ID = Object.fromEntries(CRAWLER_CATALOG.map(crawler => [crawler.id, crawler]))
export const CRAWLER_BY_TOKEN = Object.fromEntries(CRAWLER_CATALOG.map(crawler => [crawler.token.toLowerCase(), crawler]))

