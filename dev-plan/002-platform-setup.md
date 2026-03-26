# 002-platform-setup

## Goal
Create the runnable platform baseline for a minimal matches and results web app.

## Build
1. Align the Next.js App Router structure around the core routes only: `/`, `/matches/[matchId]`, and `/competitions/[competitionSlug]`.
2. Configure environment templates for DB access, `SPORTS_DATA_PROVIDER`, provider-specific namespaces, generic provider overrides, polling cadence, and remote asset hosts.
3. Add Prisma plus MySQL connection management, migration workflow, and seed bootstrap for competitions, teams, fixtures, scores, and events.
4. Set up linting, test execution, build validation, CI checks, and a health endpoint for the narrowed product.
5. Add app-level error handling, loading states, not-found routing, and request logging for public scores pages.
6. Create shared layout primitives for the header, date navigation, state filters, competition sections, and compact match rows.
7. Set up locale-aware date and time formatting plus a minimal visual token system for score-first public pages.
8. Make remote asset host allowlists env-driven so provider-related logos can change without extra code edits.

## Done When
- A fresh clone can run the minimal app locally without depending on removed features.
- CI validates lint, test, and build health for the core pages.
- The platform foundation supports homepage, match detail, and competition results work without auth, news, or monetization dependencies.
- The selected provider and its asset hosts can be configured from env before first run.
