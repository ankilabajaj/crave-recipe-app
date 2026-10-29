# Crave

**Discover what you love. Cook what you crave.**

Crave is a two-member ICT 3131 Web Technologies academic mini-project: a warm, editorial recipe discovery and reusable weekly meal-planning application. It addresses the everyday problem of deciding what to cook, remembering favorite dishes, and organizing ingredients.

## Features

- Three-section, scroll-animated public landing page with reduced-motion support.
- Signup, login, persistent cookie sessions, and logout.
- Recipe search by name; real TheMealDB category and single-ingredient filters.
- Recipe details with measured ingredients, cooking checklist, instructions, and available video link.
- Personal SQLite-backed favorites and cookbook.
- Personal seven-day plan: add, replace, remove; each change saves immediately.
- Random recipe discovery and a copyable/printable shopping checklist. Quantities from separate meals are deliberately kept separate.
- Six page designs, mobile navigation, semantic forms, visible keyboard focus, loading/error/retry/empty states, and image fallbacks.

## Stack and architecture

React 19, Vite, React Router, Tailwind CSS 4, custom CSS, Lucide icons, self-hosted DM Sans / DM Serif Display; Node.js 24+, Express 5, built-in `node:sqlite`, bcryptjs, and TheMealDB free v1 API. Node's SQLite driver avoids native third-party compilation. CSS and Intersection Observer provide lightweight animations; no Motion dependency is necessary.

Browser → same-origin `/api` → Express → SQLite for accounts/personal records or TheMealDB for recipes. Production Express serves the compiled React application; Vite proxies `/api` during development. No cross-origin CORS is enabled. See [architecture](docs/ARCHITECTURE.md).

## Local installation

Requires **Node.js 24+**, npm, and Internet access to `registry.npmjs.org` and `www.themealdb.com`.

```sh
npm ci
cp .env.example .env
npm run db:init
npm run dev
```

Vite runs on port **5173**, Express on **3001**. Vite hot-reloads frontend edits; restart `npm run dev` after backend changes. The backend uses a plain Node process to avoid a Node watch-mode shutdown crash observed in the managed workspace. Open the Vite address in your own local browser. Use the hostname matching `APP_ORIGIN` exactly; `localhost` and `127.0.0.1` are different origins. No API key is needed for the free academic development API. The schema initializes automatically on server startup; `db:init` explicitly initializes it too.

## Environment

| Variable        | Default                                                                       | Purpose                                                    |
| --------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `PORT`          | `3001`                                                                        | Express listening port                                     |
| `DATABASE_PATH` | `./server/database/crave.sqlite`                                              | Persistent SQLite file, relative to repository root        |
| `APP_ORIGIN`    | `http://localhost:5173` in development; `http://localhost:3001` in production | Exact permitted browser origin for mutations               |
| `NODE_ENV`      | unset/development                                                             | Production enables Secure cookies and serves `client/dist` |

Do not commit `.env`, databases, dependencies, or generated builds. There is no session-signing secret: opaque cryptographically random 256-bit session IDs are stored as SHA-256 hashes in SQLite, not in browser storage. Sessions last seven days; logout deletes the server record.

## Production build and startup

```sh
npm run build
APP_ORIGIN=https://your-crave-domain.example npm start
```

Deploy behind HTTPS, set the real origin in `.env` or process configuration, and retain the database on persistent storage. Production cookies are Secure: local HTTP production serving can validate HTML, but browser authentication should use the development server or HTTPS. `npm start` explicitly selects production mode. Run commands from the repository root.

## API integration

Express proxies `https://www.themealdb.com/api/json/v1/1/` using a ten-second timeout and bounded five-minute in-memory cache. Random responses are not cached. Filter results sometimes lack category/cuisine; full details are fetched by ID. The free API supports one main ingredient, not multi-ingredient queries. No recipe catalog is copied into SQLite. Only recipe IDs are stored with favorites and planned days. External failures return a retryable 502; saved IDs remain intact.

Authentication endpoints: `POST /api/auth/register`, `/login`, `/logout`; `GET /api/auth/me`. Recipe endpoints: `GET /api/recipes/search?q=`, `/categories`, `/filter?category=` or `?ingredient=`, `/random`, `/:id`. Favorites: `GET/POST /api/favorites`, `DELETE /api/favorites/:mealId`. Planner: `GET /api/planner`, `PUT/DELETE /api/planner/:day`. See [features](docs/FEATURES.md) for behaviors.

## Tests

```sh
npm test                 # backend integration + frontend interaction tests
npm run build
npm run test:e2e         # Playwright; system Chromium at /usr/bin/chromium
npm run smoke:live       # real API check with a temporary in-memory account
```

For another Chromium installation, set `CHROMIUM_PATH=/absolute/path/to/chromium`. Alternatively run `npx playwright install chromium`; the configuration uses Playwright’s bundled browser automatically when system Chromium is absent. Browser download hosts may need network permission in managed environments.

Tests use explicitly isolated recipe fixtures; they do not replace the runtime API. Backend tests reopen a temporary database to verify actual persistence. Browser tests run a test-only Express server with an in-memory database and real React production assets. See [testing evidence and manual checks](docs/TESTING.md).

## Security and accessibility

Passwords use bcrypt cost 12; registration enforces matching passwords, minimum eight characters and bcrypt's 72-byte maximum. Parameterized queries and foreign keys enforce data ownership and uniqueness. HTTP-only, SameSite=Lax cookies, server-side session rotation, authenticated CSRF tokens, JSON-only mutations, origin checks and Fetch Metadata checks protect state changes. A bounded per-IP authentication throttle limits attempts. API responses omit stacks and disable caching. Production uses a restrictive content security policy and frame protection.

Keyboard navigation, skip link, native modal focus handling, labelled inputs, status/error feedback, semantic headings, large touch targets and reduced motion are implemented. These measures are not a certification of WCAG conformance; no Lighthouse or WAVE score is claimed.

## Known limitations and validation status

- Live TheMealDB access in the managed workspace is currently blocked by its network allowlist (403). The required `www.themealdb.com` and PR-related `api.github.com` additions are saved in the environment draft; it has not been applied or published by the agent. Live upstream behavior and food photography remain unverified here.
- External recipe availability and completeness can change. Missing upstream records remain saved by ID and can still be removed.
- Shopping checkmarks and ingredient checkmarks last only while their page is mounted. Plans are reusable weekdays, not dated calendars; one recipe per day.
- No password recovery, email verification, dietary/allergen guarantees, nutrition estimates, serving scaling, or unit conversion.
- The in-process auth throttle is suitable for this single-process academic app; a public high-traffic deployment needs additional perimeter controls. Protect and back up the local database; avoid shared account credentials.

## Screenshots to capture

Place actual screenshots in `docs/screenshots/` after a live-data review. Pending: landing (desktop/mobile), signup/login, search and filters, recipe detail, saved cookbook, weekly planner and shopping list at 375/768/1440 px. No screenshot placeholders are presented as evidence of completed captures.

## Team review and contribution template

This is a **proposed** division, not verified individual authorship. Implementation includes AI assistance; students should review, understand, modify, test and present their actual work.

| Member          | Proposed module                                               | Actual review/modifications | Tests personally run | Presentation responsibility | Commit/reference |
| --------------- | ------------------------------------------------------------- | --------------------------- | -------------------- | --------------------------- | ---------------- |
| Member 1 (name) | Discovery, filters, details, API, surprise                    | To record                   | To record            | To record                   | To record        |
| Member 2 (name) | Auth, cookbook, planner, SQLite, shopping                     | To record                   | To record            | To record                   | To record        |
| Shared          | Landing, design, responsiveness, accessibility, documentation | To record                   | To record            | To record                   | To record        |

## Project documentation

[Architecture](docs/ARCHITECTURE.md) · [Features](docs/FEATURES.md) · [Testing](docs/TESTING.md) · [Course alignment](docs/COURSE_ALIGNMENT.md) · [Report notes](docs/REPORT_NOTES.md)

## References and attribution

- [TheMealDB](https://www.themealdb.com/api.php): recipe content, instructions, categories and photography. Free development key `1` is for academic development, not a private credential; confirm provider terms before public/commercial use.
- [React](https://react.dev/), [Vite](https://vite.dev/), [React Router](https://reactrouter.com/), [Tailwind CSS](https://tailwindcss.com/), [Express](https://expressjs.com/), [Node SQLite](https://nodejs.org/api/sqlite.html), [SQLite](https://sqlite.org/).
- [Lucide](https://lucide.dev/) icons (ISC); [DM Sans / DM Serif Display](https://fonts.google.com/) via Fontsource (SIL Open Font License; bundled package licenses apply).
- [OWASP CSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

Academic submission target: November 2, 2026, ICT 3131. PHP, XML and XSLT are not used or claimed.
