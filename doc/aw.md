# Crawler Access implementation notes

## Overview and styling

- `CrawlerHealthOverview` explains the crawler-access score and its deductions.
- The page uses TailwindCSS for component layout, spacing, colors, responsive behavior, and interaction states. `CrawlerAccess.css` contains keyframe-based entrance/loading transitions only.
- The two desktop cards in `CrawlerPermissions` use the same stretched grid row and `h-full`, so Crawler Permissions and URL + Bot Inspector remain equal height. On mobile they stack at their natural heights.
- The Crawler Access hero follows the same compact three-part hierarchy as Machine Understanding: crawler logo/title/Beta and analyzed URL on the left, a left-aligned score/verdict with **View score details** in the center, and a short scope explanation on the right.
- Both diagnostic heroes reserve the same 178px desktop height in awaiting, loading, and completed states, preventing route changes or score hydration from shifting the page shell.
- Crawler Access and Machine Understanding use the shared `analysisSkeletonClass` and `analysis-skeleton` keyframe for score and card placeholders. Machine Understanding now shows the same shimmer workspace before analysis and while evidence is being built instead of switching to an unrelated empty-state treatment.
- The four overview metric cards reuse the Machine Understanding Raw Evidence staggered entrance and hover sheen, lift, border, and shadow behavior through the shared `mu-stagger-grid` animation utility. Their content and color tones remain crawler-specific.

## Supported crawlers and permissions

`shared/crawlers.js` is the browser/server catalog for OAI-SearchBot, GPTBot, ChatGPT-User, ClaudeBot, Claude-User, Claude-SearchBot, Googlebot, Google-Extended, bingbot, and PerplexityBot. `CrawlerLogo` renders local company SVG marks. Google-Extended is labeled as a robots control token rather than a separately verifiable HTTP crawler.

- **Access** is the robots.txt decision for the inspected URL.
- **Coverage** describes whether the crawler has full, partial, no, or unknown site-policy coverage.
- Rules use RFC-style longest matching, wildcard/end anchors, query matching, percent normalization, repeated matching groups, and Allow-wins ties.
- Permission-row warnings and robots source warnings share stable issue IDs with Crawler Issues.

### How to use URL + Bot Inspector

1. Select a crawler to swap its already-computed policy result without another request.
2. Enter a relative URL or same-origin absolute URL. Cross-origin URLs are rejected in the browser and server.
3. Choose **Test Access** after editing the URL. The button becomes **Testing access…** and then **Results current**.
4. Read **Bot-specific policy** for robots permission and **Shared URL evidence** for HTTP, sitemap, canonical, noindex, and rendered-content signals.

This is a neutral policy inspection. It does not impersonate a crawler, verify crawler-vendor IP addresses, or test crawler-specific CDN/WAF behavior.

## Robots.txt Analyzer

`robotsAnalyzer.js` converts the fetched source into line records and a summary. Each line retains its number, raw text, directive type, value, applicable agents, severity, and related issue IDs.

- Colors distinguish User-agent, Allow, Disallow, Sitemap, Crawl-delay, comments, and unknown/invalid directives.
- Inline markers cover malformed directives, rules outside groups, duplicate and conflicting rules, root blocks, invalid/high crawl delays, unknown directives, and failed sitemap references.
- The Rules Summary reports total rules, unique user-agent groups, Allow/Disallow counts, comments, sitemap directives, crawl delay, and Last-Modified metadata.
- Selecting a warning scrolls to the matching normalized Crawler Issues card.

## Sitemap Explorer

`sitemapSummary.js` classifies sitemap URLs from robots policy plus bounded page probes. The old UI bug that passed sitemap data into page-detail lookup is removed.

Status precedence is exclusive: **Blocked → Noindex → Error → Indexable → Unverified**. Indexable requires a successful inspected response, robots permission, and no effective noindex signal. Unverified means discovered but not deeply fetched.

- Summary cards show Total, Indexable, Noindex, and Blocked counts and percentages.
- Inspection coverage and the unverified remainder are always visible; sampled results are never presented as a complete crawl.
- Users can select a sitemap, search URLs, filter status, and progressively reveal rows.
- The API returns at most 500 URL rows and marks `responseCapped`; aggregate counts are calculated before that response cap.

## llms.txt Assistant

The crawler fetches `/llms.txt` and runs deterministic validation without an AI request. Validation checks the H1, blockquote summary, H2 resource sections, Markdown links, duplicates, resolvable URLs, and excessive size.

- When missing, **Generate draft** creates an editable suggestion.
- When present, the original is shown unchanged with strengths, gaps, recommendations, and **Review with AI**.
- AI is user-triggered only. The assistant never writes to or publishes on the analyzed website; users can copy or download the proposal.
- Context is bounded to selected site identity, readable content, semantic/accessibility summaries, metadata, sitemap signals, and selected external intelligence. Scripts are removed and all site/external text is treated as untrusted evidence, not instructions.
- `POST /api/crawler/llms-txt` uses the OpenAI Responses API. Configure `OPENAI_API_KEY` (preferred) or the compatible `CHATGPT_API_KEY`; set `OPENAI_LLMSTXT_MODEL` to override the default `gpt-5.6` model.

The feature treats llms.txt as an emerging optional convention and does not promise ranking or citation benefits.

## Discovery Graph

The graph reuses the existing SVG surface but no longer invents a folder hierarchy from path segments. `pageProber.js` extracts up to 100 normalized same-origin links per fetched page. The graph builds typed edges for site-to-sitemap discovery, sitemap entries, internal links, redirects, and canonicals.

- Green nodes are verified indexable, amber are noindex, red are blocked/failed, blue are redirects, and gray are unverified.
- Edge filters distinguish sitemap, internal-link, redirect, and canonical relationships.
- Keyboard or pointer selection opens persistent evidence with URL, source, status, incoming/outgoing edges, and canonical data.
- Node/edge limits keep the view usable. A **Sampled graph** label appears when only part of the discovered site was probed or returned.

## API data flow and issues

- `POST /api/crawler` returns robots analysis, classified sitemap summary, page link signals, initial ten-bot inspection, llms.txt inspection, score, and normalized issues.
- `POST /api/crawler/test-access` performs a same-origin URL policy inspection.
- `POST /api/crawler/llms-txt` accepts `generate` or `review` plus bounded analyzed context and returns a proposed file and audit. API keys stay server-side.
- Custom URL issues are deduplicated with baseline issues but do not alter the baseline crawler score.

## Deduplicated Action Queue

Crawler Issues is the final normalized inventory for robots syntax, crawler permissions, sitemaps, HTTP/page signals, URL inspections, and llms.txt findings. Stable IDs prevent repeated findings from accumulating when the same result is returned again.

- Desktop uses a reference-style table with Priority, Issue, Evidence, Impact, Recommended fix, Affected, Effort, and Re-test columns. Mobile uses stacked cards with the same information.
- Priority comes from the normalized severity. Effort is a separate estimate, so a high-impact issue can still have a low-effort fix.
- Selecting an issue expands its complete evidence, affected URLs, and affected crawler logos without hiding any other findings.
- **Re-test** reruns the current site analysis and replaces stale baseline and temporary inspection findings with the latest results.
- Missing or weak llms.txt files are listed as informational findings because the convention is optional and does not affect the crawler score.
- Source-line warning links from the robots analyzer and row warnings from Crawler Permissions locate and expand the matching queue entry.

## Verification

- `robotsParser.test.mjs` covers RFC policy resolution and catalog behavior.
- `urlInspector.test.mjs` covers same-origin inspection, redirects, canonicals, noindex, sitemap membership, rendered content, and the ten-bot matrix.
- `crawlerAnalysis.test.mjs` covers robots line annotations, sitemap classification precedence, llms.txt validation, same-origin link extraction, and X-Robots noindex.
- Run `npm run test:crawler`, `npm run lint`, and `npm run build`, then check the page at desktop and mobile widths.
