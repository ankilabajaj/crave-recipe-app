# Testing evidence

## Executed in the cloud workspace (October 29, 2026)

| Check                   | Result               | Scope                                                                                                                                                |
| ----------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency installation | Passed               | npm installed dependencies through the managed proxy with approved execution permissions; lockfile saved                                             |
| Development startup     | Passed               | `npm run dev` starts Vite and Express; local requests verify HTML, proxy, registration, authenticated favorites, logout with a temporary SQLite file |
| Database initialization | Passed               | `npm run db:init` creates schema; local data excluded from Git                                                                                       |
| Production build        | Passed               | `npm run build`; React/CSS/fonts compiled with Vite                                                                                                  |
| Backend                 | 7 test groups passed | Node test runner + Supertest, real SQLite, fixture upstream                                                                                          |
| Frontend                | 9 tests passed       | Vitest + Testing Library, mocked API responses, jsdom                                                                                                |
| Browser                 | 6 tests passed       | Playwright + system Chromium; 375×812, 768×1024, 1440×1000; real React and Express with a test-only recipe fixture                                   |
| GitHub read             | Passed               | `git ls-remote origin HEAD refs/heads/*` confirms main at initial commit; previous feature branch absent remotely                                    |
| Live TheMealDB          | Blocked              | Managed proxy returns 403 for `www.themealdb.com`; domain saved in draft, not applied                                                                |
| GitHub API              | Blocked              | `gh api repos/ankilabajaj/crave-recipe-app` returns Forbidden; `api.github.com` saved in draft                                                       |

No live API success, Lighthouse/WAVE audit, formal WCAG certification, published deployment or individual team testing is claimed. Browser image requests were deliberately aborted in the fixture suite to exercise the designed fallback state; these tests do not validate actual photographs or upstream availability.

## Reproduce

```sh
npm ci
npm run db:init
npm test
npm run build
npm run test:e2e
npm run smoke:live  # requires live TheMealDB access; currently blocked here
```

Node 24+ is required. Browser configuration uses `/usr/bin/chromium` when present, otherwise the Playwright installed browser. Override with `CHROMIUM_PATH` if needed; `npx playwright install chromium` installs it on unrestricted developer machines. This workspace's browser CDN download was denied by network policy, so the already installed system Chromium was used successfully. Restricted command execution can prevent local sockets; backend/browser tests require local server permissions.

## Backend cases (server/app.test.js)

1. Normalize numbered ingredients, trim empties, preserve measurements and original instructions, reject unsafe tutorial URLs.
2. Valid registration; invalid email/name/short or mismatched/overlong passwords; duplicate email; hash storage; invalid/valid login; refresh identity; logout and protected routes.
3. Missing/wrong CSRF token, disallowed Origin, cross-site Fetch Metadata and incorrect content type are rejected; session expiry and Secure/HttpOnly/SameSite cookie attributes.
4. Add and deduplicate favorites; add and replace a planned meal; invalid weekdays/IDs; remove records; second user cannot read or delete first user's records. Reopen an on-disk temporary database, log in again, and verify saved favorite and plan before removal.
5. Search, empty search, categories, category/ingredient filters, random, details and query validation through Express routes.
6. Upstream exceptions/non-OK responses produce safe 502s; absent details produce 404; stack details are not exposed.
7. Repeated detail requests use cache; random requests do not.

## Frontend cases (client/src/App.test.jsx)

Landing sections, menu state and signup navigation; mismatched confirmation and successful registration redirect; guest route protection; name search, category and ingredient filters and empty results; network retry UI; details and favorite state; meal-picker submission; cookbook navigation and removing unavailable saved recipes; seven weekday planner and shopping empty state; reduced-motion reveal visibility.

## Browser workflows (tests/crave.spec.js)

Each viewport runs the complete public → signup → discovery → filters/search → details → favorite → add Friday meal → cookbook → planner → shopping checkbox → replace Friday meal through details/day picker → reload persistence → meal/favorite removal → logout → protected-route redirect sequence. No horizontal overflow is asserted on each page, and uncaught browser errors are collected and must remain empty. A second scenario enables reduced motion, checks revealed sections, and exercises keyboard mobile-menu activation. The upstream fixture exists only in `tests/server.js`; normal server startup never imports it.

## Manual/live checks still required

- Activate `www.themealdb.com` access in environment settings, then retry actual search, category, ingredient, lookup and random operations with an authenticated account.
- Check real image loads, any missing content, video-link behavior and clipboard permission on the deployment origin. Capture screenshots of actual live pages.
- Review headings, keyboard focus order and contrasts with assistive technology; automated semantic checks are useful but not sufficient for certification.
- Test deployed HTTPS cookie behavior and correct `APP_ORIGIN` for the chosen host. Review and back up SQLite persistence on the deployment filesystem.
- Test the GitHub API again after network settings are applied, then open the pull request if still pending.

An early browser rerun exposed transient mobile overflow from intrinsic image widths during loading. Grid tracks/children were constrained and headings made wrap-safe; the corrected six-scenario suite passes. A cookbook outage regression now verifies removal without available upstream details.

The GitHub Actions workflow runs installation, unit/integration tests, production build and browser tests on Node 24. Its presence is not a claim that hosted CI has executed.

Node 24 watch mode produced a native `FSEventWrap::GetInitialized` assertion during SIGINT shutdown in this managed workspace. The development backend script now uses ordinary Node (frontend Vite HMR remains active); restart the command for backend edits. This is a resolved tooling issue, not an application request failure.
