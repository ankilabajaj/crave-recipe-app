# Academic report preparation notes

## Abstract

Crave combines recipe discovery with a personal cookbook and reusable weekly meal plan. A React interface communicates asynchronously with an Express backend; SQLite stores accounts, favorites, plans and sessions. Recipes are retrieved from TheMealDB through a backend proxy. A vibrant editorial landing page introduces the application, while authenticated pages focus on practical cooking workflows.

## Problem and objectives

Deciding what to cook, remembering useful recipes, and preparing ingredients can be fragmented across tools. Crave aims to connect discovery, saving and planning in one accessible application. Objectives are six meaningful functions (search, category/ingredient filtering, recipe details, authentication, favorites and meal planning), responsive design, persistent isolated user data and reliable error feedback.

## Architecture and modules

Use the diagram and security explanation in ARCHITECTURE.md. Six page designs: public landing, dual-mode auth, discovery, details, cookbook, planner. Shared navigation, cards, session context and API client reduce repetition. The shopping list is a planner enhancement, not a seventh page. Built-in Node SQLite is the selected reliable SQLite driver.

## Database schema

Summarize users, favorites and meal_plans as the three main tables; sessions is the authentication support table. Include primary keys, unique email, unique user/meal and user/day pairs, weekday checks, foreign keys, timestamps and parameterized queries. Do not include actual account data or password hashes in screenshots.

## Evidence to collect

- Actual screenshots of each page with live recipe content after network access is enabled.
- The same key layouts at 375, 768 and 1440 px, showing the mobile menu and planner.
- Keyboard traversal, visible focus, reduced-motion setting, form error feedback and dialog behavior.
- Build output and exact executed tests from TESTING.md. Separate fixture-based API tests from a future live upstream check.
- Persistence demonstration: save a favorite and plan, log out/in, confirm both; second account should start with neither.

No screenshots, Lighthouse/WAVE scores, usability study, deployment availability, live API success or individual contributions should be invented. Current workspace network restrictions are an environment limitation, not proof of upstream failure.

## Scope and limitations

Free TheMealDB API, single-ingredient queries, one reusable meal/day, no serving conversion, nutrition estimates, allergens, password recovery or email verification. Shopping quantities remain separate. SQLite is a simple single-instance academic choice. See README for deployment precautions and actual validation status.

## Team contributions

Proposed Member 1: discovery, filters, details and TheMealDB/random integration. Proposed Member 2: authentication, database, favorites, planner and shopping list. Shared: landing, design, accessibility, testing and documentation. These are suggestions only. Record actual student review, modifications, tests and presentation contributions in README's template, acknowledging AI assistance. Git history alone does not verify the proposed division.

## References

Cite TheMealDB recipe/photo source, React, Vite, React Router, Tailwind, Express, Node/SQLite, bcryptjs, Lucide, Fontsource/Google Fonts, OWASP and WCAG. Links are in README. Instructor submission target: November 2, 2026; confirm required report formatting separately with the course instructions.
