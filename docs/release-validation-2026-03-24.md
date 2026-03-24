# Release Validation Report

- Date: March 24, 2026
- Scope: `dev-plan/015-release-validation.md`
- Status: Conditional sign-off

## What Ran

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run test:smoke`
- `npm run validate:release`

## Validation Coverage Added During This Pass

- Shared fail-fast data access timeout guard for public, search, sitemap, personalization, and admin reads.
- API contract tests for `/api/search` and `/api/health`.
- SEO and localization tests for metadata, `robots.txt`, and `sitemap.xml`.
- Control-plane module tests covering ad-slot and consent-module enable/disable behavior.
- Odds and broadcast regression coverage extended for disabled surfaces and territory resolution.
- Built-app smoke runner for public routes, localized routes, `robots.txt`, `sitemap.xml`, `/api/search`, and `/api/health`.

## Results

- Lint: pass
- Unit/integration/API tests: pass
  - 12 files
  - 40 tests
- Production build: pass
- Built-app smoke validation: pass for static and index routes
  - `200`: `/en`, `/en/live`, `/en/fixtures`, `/en/results`, `/en/tables`, `/en/teams`, `/en/news`, `/en/favorites`, `/en/admin`, `/fr`, `/sw/news`, `/en/search?q=arsenal`, `/api/search`
  - `200`: `/robots.txt`, `/sitemap.xml`
  - `503`: `/api/health` in local environment, returning degraded status rather than hanging

## Issues Found And Fixed

1. Slow or unavailable data access could cause public pages and APIs to hang instead of returning degraded states.
   - Fix: added `src/lib/data-access.js` and wired timeout-backed fallbacks into public read paths, search, sitemap, personalization, health, and admin reads.

2. Release validation was missing rerunnable end-to-end smoke automation.
   - Fix: added `scripts/release-smoke.mjs` and `npm run test:smoke`, plus `npm run validate:release`.

3. Public degraded-search messaging was not localized consistently.
   - Fix: added localized `searchDegradedMessage` dictionary entries and replaced hard-coded English usage.

4. Homepage filter copy used a hard-coded English `All` label.
   - Fix: switched to dictionary-backed copy.

## Known Limitations

- The local runtime environment used for this validation did not expose dynamic sitemap detail entries for league, team, match, or news-article routes, so those built-app smoke checks were skipped.
- `/api/health` returned `503 degraded` after the configured runtime data timeout, which indicates the app now fails fast correctly but also indicates this environment does not have healthy live data dependencies attached for full release simulation.
- `/en`, `/fr`, `/en/search`, and `/api/search` completed in roughly 4 seconds during smoke validation, aligning with the new timeout guard and confirming degraded fallback behavior rather than healthy connected-data behavior.
- French and Swahili dictionaries still contain older English fallback copy in some non-release-blocking editorial/admin strings outside the changes made in this pass.

## Sign-Off

- Code readiness: pass
- Release validation automation readiness: pass
- Environment readiness for production-style dynamic data validation: pending

Final sign-off is conditional: the codebase is ready for release promotion workflow review, but a final production go/no-go should only be granted after rerunning `npm run validate:release` in a connected staging environment with healthy database content and provider-backed dynamic routes.
