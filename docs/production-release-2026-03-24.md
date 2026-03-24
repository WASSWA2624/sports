# Production Release Package

- Date: March 24, 2026
- Scope: `dev-plan/016-production-release.md`
- Status: Release package prepared for production handoff

## What Was Added

- Versioned production artifact bundling via `npm run release:artifact`
- Production preflight validation via `npm run release:preflight`
- DB backup automation via `npm run db:backup`
- Production release orchestration via `npm run release:production`
- Expanded smoke validation for scores home, date filtering, competition, match center, team, news, search, favorites, health, and admin access
- Release metadata surfaced in `GET /api/health`
- Production runbook and rollback criteria stored in repo docs

## Release Ownership

- Release commander: platform engineer running deploy and go/no-go
- Data/API owner: sports feed and DB owner validating migrations, sync lag, and provider health
- Editorial owner: newsroom/admin owner validating news and takedown-sensitive surfaces
- Support owner: first-hour on-call support rotation handling triage and rollback escalation

## Promotion Commands

1. `npm run validate:release`
2. `RELEASE_PREFLIGHT_MODE=production npm run release:preflight`
3. `npm run release:artifact`
4. `npm run db:backup`
5. `npm run db:migrate:status`
6. `npm run db:migrate:deploy`
7. Promote `build/releases/<release-version>/`
8. `BASE_URL=https://sports.example npm run test:smoke`

## First-Hour Watch

Watch:

- `/api/health`
- admin control room
- sync lag
- page/API errors
- cache misses
- live score correctness
- feature-flag and shell-module state

Stability window:

- minimum 60 minutes
- no blocker or high-severity incidents
- smoke suite passes on the promoted build

## Known Limitations

- Final production go/no-go still depends on a connected production-like environment with healthy DB and provider data.
- Authenticated admin smoke checks require `SMOKE_ADMIN_EMAIL` and `SMOKE_ADMIN_PASSWORD`.
- DB backup execution depends on a production dump binary such as `mysqldump`, or an equivalent binary provided via `DB_DUMP_BINARY`.
- Release notes URL, support owner, alert webhook, and edge/rate-limit values must be supplied by the deploy environment before final production cutover.

## Rollback Criteria

Rollback or contain immediately when any of the following occurs:

- sync lag stays above threshold for more than 10 minutes
- route errors or page failures breach the configured release budget
- live match, competition, or news data is materially incorrect on core surfaces
- migrations fail or corrupt critical reads
- provider readiness drops without a working failover path

## Rollback Steps

1. Disable affected public modules or feature flags when the fault is isolated.
2. Redeploy the previous artifact bundle.
3. Restore the latest verified DB backup if the incident is database-related.
4. Revalidate caches.
5. Re-run smoke checks and confirm `/api/health` returns to a stable state.
