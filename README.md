# Sports App

Baseline Next.js App Router project for the sports platform roadmap.

## Quick Start

1. Install dependencies:
```bash
npm ci
```
2. Copy environment template and edit values:
```bash
copy .env.example .env
```
3. Run development server:
```bash
npm run dev
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

## Sync Jobs

Configure SportsMonks credentials and tracked IDs in `.env`, then trigger the admin sync endpoint for one of the registered buckets: `static-ish`, `daily`, or `high-frequency`.

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

The admin control room surfaces provider chain readiness, latency/cache/search observability, failure drills, and asset/CDN coverage.

## Database (Prisma + MySQL)

```bash
npm run db:generate
npm run db:migrate
```

Set `DATABASE_URL` in `.env` before running DB commands.

## Operational Health

Public health endpoint: `GET /api/health`

The health response now includes:

- provider chain readiness
- live-data stale rate
- cache hit-rate summary
- search latency summary
- asset coverage and CDN readiness
