# 002-setup

## Goal
Create the runnable baseline project and quality gates.

## Build
1. Bootstrap Next.js (App Router) with JavaScript.
2. Configure environment templates for DB, SportsMonks key, payment provider, notifications, auth secrets.
3. Add Prisma + MySQL connection and migration pipeline.
4. Set up linting, formatting, build validation, and test runner in CI.
5. Add folder structure: `src/app`, `components`, `features`, `store`, `services`, `lib`, `styles`, `i18n`, `types`.
6. Add app-level error handling, not-found route, request logging, and health endpoint.

## Done When
- Fresh clone runs locally with one command.
- CI runs lint/test/build validation.
- Baseline app and DB connection are healthy.
