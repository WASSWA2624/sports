# Production Release Runbook

## Scope

This runbook covers the production promotion flow for the Flashscore-style sports app after staging validation passes.

Primary references:

- `docs/release-validation-2026-03-24.md`
- `docs/production-release-2026-03-24.md`

## Release Owners

- Release commander: platform engineer owning the deploy window and go/no-go call
- Data owner: sports data/operator owner for provider health, sync lag, and DB migration approval
- Editorial owner: editor/admin owner for news, takedown readiness, and homepage/news correctness
- Support owner: on-call support rotation watching first-hour incidents and rollback triggers

## Promotion Order

1. Re-run the full release gate in staging:
   - `npm run validate:release`
2. Validate production inputs:
   - `RELEASE_PREFLIGHT_MODE=production npm run release:preflight`
3. Freeze the release version metadata:
   - set `RELEASE_VERSION`
   - set `RELEASE_CHANNEL=production`
   - set `RELEASE_COMMIT_SHA`
   - set `RELEASE_NOTES_URL`
4. Build the versioned artifact bundle:
   - `npm run release:artifact`
5. Take the production DB backup immediately before migration:
   - `npm run db:backup`
6. Confirm migration state and apply production migrations:
   - `npm run db:migrate:status`
   - `npm run db:migrate:deploy`
7. Promote the versioned bundle from `build/releases/<release-version>/`.
8. Run production smoke validation:
   - `BASE_URL=https://sports.example npm run test:smoke`
9. Start the first-hour watch window and hold the release commander on point until exit criteria are met.

## Required Production Inputs

Core:

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXT_PUBLIC_SITE_URL` or `SITE_URL`

Release metadata:

- `RELEASE_VERSION`
- `RELEASE_CHANNEL=production`
- `RELEASE_COMMIT_SHA`
- `RELEASE_NOTES_URL`
- `RELEASE_SUPPORT_OWNER`
- `RELEASE_SUPPORT_CHANNEL`

Provider and runtime:

- `SPORTS_DATA_PROVIDER`
- `SPORTSMONKS_API_KEY`
- `SPORTS_SYNC_FAILOVER_PROVIDERS`
- `SPORTS_DATA_ACCESS_TIMEOUT_MS`

Monitoring and release gates:

- `OPS_ALERT_WEBHOOK_URL`
- `OPS_MONITOR_WINDOW_MINUTES`
- `OPS_RELEASE_SYNC_LAG_THRESHOLD_MINUTES`
- `OPS_RELEASE_SEARCH_P95_THRESHOLD_MS`
- `OPS_RELEASE_CACHE_HIT_RATE_MIN`
- `OPS_RELEASE_ROUTE_ERRORS_PER_HOUR_MAX`

Rate limits and edge policy:

- `AUTH_RATE_LIMIT_WINDOW_MS`
- `AUTH_RATE_LIMIT_MAX_REQUESTS`
- `SEARCH_RATE_LIMIT_WINDOW_MS`
- `SEARCH_RATE_LIMIT_MAX_REQUESTS`
- `ADMIN_RATE_LIMIT_WINDOW_MS`
- `ADMIN_RATE_LIMIT_MAX_REQUESTS`
- `EDGE_PUBLIC_S_MAXAGE_SECONDS`
- `EDGE_PUBLIC_STALE_WHILE_REVALIDATE_SECONDS`
- `EDGE_LIVE_S_MAXAGE_SECONDS`
- `EDGE_LIVE_STALE_WHILE_REVALIDATE_SECONDS`
- `EDGE_NEWS_S_MAXAGE_SECONDS`
- `EDGE_PRIVATE_NO_STORE=true`

## Smoke Coverage

`npm run test:smoke` now checks:

- scores home
- live date filtering
- competition page
- team page
- match center
- news hub
- search page and search API
- favorites page
- admin access
- `robots.txt`
- `sitemap.xml`
- `/api/health`

Optional authenticated admin checks run when both of these are present:

- `SMOKE_ADMIN_EMAIL`
- `SMOKE_ADMIN_PASSWORD`

## First-Hour Monitoring

Watch `GET /api/health` and the admin control room for:

- live sync lag at or below the release threshold
- search p95 at or below the release threshold
- cache hit rate at or above the release threshold
- route errors per hour at or below the release threshold
- provider chain readiness and fallback slot availability
- stale live-data counts and fixture correctness
- cache attention items
- ads/consent shell readiness and feature-flag state

Exit the watch window only when:

- smoke tests pass against production
- no blocker or high-severity issue is open
- health is stable for the full watch window

## Rollback Plan

Immediate containment:

1. Disable risky feature surfaces first if the issue is isolated:
   - news modules
   - odds surfaces
   - broadcast surfaces
   - shell modules
2. If containment is insufficient, redeploy the previous release artifact.
3. Restore the most recent verified DB backup if the incident is migration or data-corruption related.
4. Revalidate caches after the rollback or restore.
5. Re-run smoke checks and confirm `/api/health` stabilizes.

Rollback criteria:

- sync lag exceeds the release threshold for more than 10 minutes
- repeated page/API failures or route errors breach the release threshold
- corrupted match, competition, or news data appears on critical user journeys
- migrations fail or introduce destructive regressions
- admin control room shows loss of provider readiness with no usable fallback

## Release Notes Checklist

Publish release notes before production cutover with:

- release version and commit SHA
- scope of shipped changes
- known limitations
- support owner and escalation channel
- rollback criteria
- post-launch monitoring window
