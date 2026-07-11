# Repository Guidelines

## Project Structure & Module Organization

SecondSight GEO Optimizer is a Vite + React frontend with a Node/Express API.

- `src/components` — shared UI components
- `src/layout` — layout shell
- `src/pages` — route views (keep page-specific modules and styles colocated here)
- `src/hooks` — custom hooks
- `src/utils` — utilities
- `src/styles` — global CSS (plus page-specific styles alongside their pages)
- `public/` — static assets
- `server/index.js` — backend entrypoint
- `server/routes/` — API routes
- `server/services/` — crawler, intelligence, and page-analysis logic

## Build, Test, and Development Commands

- `npm install` — install dependencies from `package-lock.json`
- `npm run dev:all` — run Vite client + nodemon API server together
- `npm run dev` — frontend only, `http://localhost:5173`
- `npm run server` — backend only, nodemon on port `3001`
- `npm run build` — production frontend build in `dist/`
- `npm run preview` — preview the production build locally
- `npm run lint` — run ESLint across the repo

No `npm test` script exists yet. Validate changes with linting, a build check, and manual smoke testing of the affected page or route.

## Coding Style & Naming Conventions

- Modern ES modules throughout.
- React components: PascalCase filenames/exports (e.g. `CrawlerAccess.jsx`).
- Hooks: `useSomething` naming.
- Plain helpers: camelCase.
- Keep page-specific modules and styles under their route folder in `src/pages`.
- Keep service functions in `server/services` small and focused; route handlers in `server/routes` thin.
- Styling: Tailwind for component structure/layout, plain CSS for animations.
- Two-space indentation for JSON and JSX, matching existing formatting.
- Run `npm run lint` before handing off any change.
- Write the minimum code needed to solve the task — no speculative abstractions. Reuse existing components, hooks, and utilities before creating new ones. Optimize for a developer reading the code later, not for cleverness.

## Testing Guidelines

No formal test framework is configured.
- Frontend changes: run `npm run dev:all` and manually exercise the affected page.
- Backend/crawler changes: smoke test the relevant route and check server logs.
- If tests are added later, colocate them with the code they cover, using descriptive names like `crawlerUtils.test.js` or `sitemapParser.test.js`.

## Commit & Pull Request Guidelines

- Use clear, imperative commit messages (e.g. `Add combined dev script`, `Fix crawler settings fallback`) instead of vague ones like `fixed bugs`.
- PRs should include: a concise description, testing performed, linked issues where relevant, and screenshots for visible UI changes.

## Documentation Rule

At the end of every task, update docs  to reflect what changed:
- If the task touched an existing page/feature, update that page's existing `.md` file. example page machine undersatanding page has `docs/mu.md`
- If the task introduced a new page or standalone feature, create a new `.md` file for it, colocated with the code it documents.
- Keep docs short and current — describe what was built and why, not a session log.

## Security & Configuration Tips

- Environment variables are read from `.env` and `server/.env`.
- Never commit API keys or secrets.
- When adding or changing configuration, document the required variables and keep local-dev defaults safe.