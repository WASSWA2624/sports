# 002-setup

## Goal
Create the runnable platform baseline for a Flashscore-style web app.

## Build
1. Bootstrap or align the Next.js App Router project structure for scores, competitions, matches, teams, news, favorites, search, settings, and admin.
2. Configure environment templates for DB access, provider keys, search, analytics, notifications, ads, consent, and auth secrets.
3. Add Prisma plus MySQL connection management and migration pipeline.
4. Set up linting, formatting, build validation, and test runner execution in CI.
5. Add app-level error handling, not-found route, request logging, health endpoint, and feature-flag bootstrap.
6. Create route-safe locale handling and shared shell layout primitives.

## Done When
- Fresh clone runs locally with one command.
- CI validates lint, test, and build health.
- Baseline app shell and DB connection are working.
