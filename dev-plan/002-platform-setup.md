# 002-platform-setup

## Goal
Create the runnable platform baseline for a Flashscore-style, mobile-first, conversion-ready sports web app.

## Build
1. Bootstrap or align the Next.js App Router project structure for scores, competitions, matches, teams, news, favorites, search, odds, predictions, affiliates, funnels, ads, settings, and admin.
2. Configure environment templates for DB access, `SPORTS_DATA_PROVIDER`, provider-specific namespaces, generic provider overrides, odds feeds, affiliate partners, bookmaker geos, search, analytics, notifications, ads, consent, auth secrets, and Telegram/WhatsApp CTA destinations.
3. Add Prisma plus MySQL connection management, migration workflow, and seed bootstrap for both core sports data and monetization-aware sample content.
4. Set up linting, build validation, test runner execution, and CI checks that cover app runtime plus baseline analytics/event bootstrapping.
5. Add app-level error handling, not-found routing, request logging, health endpoint, feature-flag bootstrap, and event-capture scaffolding for product and conversion analytics.
6. Create locale-safe and geo-safe routing primitives plus shared shell layout slots for left rail, center content, and monetization rail modules.
7. Set up app-wide i18n architecture, translation inventory, theme tokens, dark/light theme switching, and responsive design primitives for both public and admin surfaces.
8. Make remote asset host allowlists and CDN settings env-driven so provider-related image domains can change without additional app code edits.

## Done When
- Fresh clone runs locally with one command.
- CI validates lint, test, and build health.
- Baseline app shell, DB connection, event/feature-flag foundations, theme system, and translation foundations are working.
- The selected provider and its asset hosts can be configured from env before first run.
