# Sports App

Baseline Next.js App Router project for the sports platform roadmap.

## Scope Source Of Truth

The active product contract is locked in [docs/mvp-scope.md](docs/mvp-scope.md).

That scope freezes the app as a Flashscore-style public web product with monetization, affiliate conversion, Telegram/WhatsApp funnel entry, geo-aware betting-adjacent compliance, and provider-agnostic feed architecture. It also explicitly retires marketplace, creator, subscription, and community-product directions.

## Quick Start

Fastest fresh-clone path:
```bash
docker compose up --build
```

Node + local MySQL path:

1. Install dependencies:
```bash
npm ci
```
2. Bootstrap env, Prisma, seed data, and the dev server in one command:
```bash
npm run dev:bootstrap
```

Optional nodemon wrapper:
```bash
npm run dev:nodemon
```

App URL: [http://localhost:3000](http://localhost:3000)  
Health endpoint: [http://localhost:3000/api/health](http://localhost:3000/api/health)

## Quality Gates

```bash
npm run lint
npm run test
npm run build
```

`npm run dev:bootstrap` will:

- create `.env` from `.env.example` if needed
- wait for MySQL when `DATABASE_URL` is reachable
- run Prisma generate, migrate deploy, and seed
- start the Next.js dev server

If MySQL is unavailable, the app still starts in degraded mode so shell, routing, theming, and static platform work remain testable.

Release validation bundle:

```bash
npm run validate:release
RELEASE_PREFLIGHT_MODE=production npm run release:preflight
npm run release:artifact
```

## Sync Jobs

Configure the selected provider credentials and tracked IDs in `.env`, then trigger the admin sync endpoint for one of the registered buckets: `static-ish`, `daily`, or `high-frequency`.

Admin-triggered sync endpoint: `POST /api/admin/sync/[job]`

High-frequency sync now applies live-window backpressure budgets for:

- active fixture detail hydration
- odds pulls
- broadcast pulls

Tune the related caps with:

- `SPORTS_SYNC_MAX_ACTIVE_FIXTURE_DETAILS`
- `SPORTS_SYNC_MAX_ODDS_FIXTURES`
- `SPORTS_SYNC_MAX_BROADCAST_FIXTURES`
- `SPORTS_SYNC_BACKPRESSURE_LIVE_THRESHOLD`
- `SPORTS_SYNC_STALE_LIVE_GRACE_MINUTES`

Prepared provider expansion slots:

- `SPORTSMONKS_BASKETBALL`
- `SPORTSMONKS_TENNIS`
- `SCOREBOARD_BACKUP`

The provider layer is now catalog-driven. To switch the primary feed, update:

- `SPORTS_DATA_PROVIDER`
- the matching `<PROVIDER_CODE>_API_KEY`
- the matching `<PROVIDER_CODE>_BASE_URL`

Optional generic overrides are also supported:

- `SPORTS_PROVIDER_API_KEY`
- `SPORTS_PROVIDER_BASE_URL`
- `SPORTS_PROVIDER_API_HOST`
- `SPORTS_PROVIDER_AUTH_HEADER`
- `SPORTS_PROVIDER_AUTH_SCHEME`

If the new provider serves logos or media from different domains, update `ASSET_REMOTE_HOSTS` before rebuilding so Next image allowlists stay aligned with the feed.

Today the SportsMonks adapter family is implemented end to end. The other listed providers are cataloged and env-configurable now, so adding a new adapter family does not require rewriting the app domain, sync orchestration, or persistence layers.

The admin control room surfaces provider chain readiness, latency/cache/search observability, failure drills, and asset/CDN coverage.

## Database (Prisma + MySQL)

```bash
npm run db:generate
npm run db:migrate
npm run db:migrate:status
npm run db:migrate:deploy
npm run db:backup
```

Set `DATABASE_URL` in `.env` before running DB commands.

## Production Release

Primary production handoff docs:

- `docs/production-release-runbook.md`
- `docs/production-release-2026-03-24.md`

Useful commands:

```bash
RELEASE_PREFLIGHT_MODE=production npm run release:preflight
npm run release:artifact
npm run release:production
BASE_URL=https://sports.example npm run test:smoke
```

`npm run release:artifact` creates a versioned bundle under `build/releases/<release-version>/`.

## Handoff and Maintenance

Primary handoff docs:

- `docs/handoff-technical-2026-03-24.md`
- `docs/handoff-operations-2026-03-24.md`
- `docs/handoff-roadmap-2026-03-24.md`
- `docs/handoff-maintenance-2026-03-24.md`
- `docs/handoff-walkthroughs-2026-03-24.md`
- `docs/baseline-metrics-2026-03-24.md`

Baseline archive command:

```bash
npm run maintenance:baseline
```

The baseline archive is written to `build/baselines/` and is intended to be refreshed during recurring maintenance reviews.

## Operational Health

Public health endpoint: `GET /api/health`

The health response now includes:

- release metadata for the deployed artifact
- provider chain readiness
- live-data stale rate
- cache hit-rate summary
- search latency summary
- asset coverage and CDN readiness
