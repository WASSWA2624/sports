# Technical Handoff

- Date: March 24, 2026
- Scope: `dev-plan/017-handoff-and-maintenance.md`
- Audience: engineering owners for platform, data feeds, and web product delivery

## System Overview

The shipped platform is a modular monolith built on:

- Next.js App Router for public pages, localized routing, and API handlers
- Prisma + MySQL for canonical storage
- server-side read models in `src/lib/coreui/*` and `src/lib/sports/*`
- operational control-plane services in `src/lib/control-plane.js` and `src/lib/operations.js`
- provider-backed sync jobs in `src/lib/sync/jobs.js`

### Runtime Layers

| Layer | Primary files | Responsibility |
| --- | --- | --- |
| App shell and routes | `src/app`, `src/components/coreui` | localized pages, API endpoints, admin/editorial entry points |
| Public read models | `src/lib/coreui/read.js`, `src/lib/coreui/news-read.js`, `src/lib/sports/read.js` | shape DB data into page-ready responses |
| Data safety and telemetry | `src/lib/data-access.js`, `src/lib/operations.js` | fail-fast timeouts, degraded fallbacks, latency/search/cache telemetry |
| Control plane | `src/lib/control-plane.js`, `src/app/api/admin/*` | provider controls, drills, cache revalidation, ops issues, feature flags |
| Sync pipeline | `src/lib/sync/jobs.js`, `src/lib/sync/service.js`, `src/lib/sync/backpressure.js` | ingestion cadence, checkpoints, live-window pressure management |
| Persistence | `prisma/schema.prisma`, `src/lib/sports/repository.js` | normalized storage and write-side persistence |

## Schema Domain Map

The Prisma schema currently defines 45 models. Treat them as six operating domains:

| Domain | Key models | Notes |
| --- | --- | --- |
| Identity and access | `User`, `Session`, `Account`, `Role`, `Permission`, `UserRole`, `RolePermission` | supports guest, registered, editor, and admin roles |
| Preferences and engagement | `UserPreference`, `FavoriteEntity`, `NotificationSubscription`, `RecentView` | powers favorites, alert settings, and personalization |
| Sports taxonomy | `SourceProvider`, `Sport`, `Country`, `Competition`, `League`, `Season`, `Team`, `Venue`, `Player`, `Official` | provider-normalized graph for multi-sport expansion |
| Fixture state | `Fixture`, `Standing`, `OddsMarket`, `OddsSelection`, `ResultSnapshot`, `FixtureParticipant`, `Incident`, `Lineup`, `Statistic`, `H2HSnapshot`, `BroadcastChannel` | live scores, match detail, standings, odds, and broadcast surfaces |
| Editorial | `NewsCategory`, `NewsArticle`, `ArticleEntityLink` | supports draft, published, and archived newsroom workflow |
| Operations and control | `AuditLog`, `FeatureFlag`, `SyncJob`, `SyncCheckpoint`, `ShellModule`, `AdSlot`, `ConsentText`, `RouteErrorEvent`, `OperationalEvent`, `OpsIssue` | release safety, telemetry, drills, and incident tracking |

## Route Map

### Public Page Surface

- `/`
- `/profile`
- `/{locale}`
- `/{locale}/live`
- `/{locale}/fixtures`
- `/{locale}/results`
- `/{locale}/tables`
- `/{locale}/leagues`
- `/{locale}/leagues/[leagueCode]`
- `/{locale}/sports/[sportSlug]`
- `/{locale}/sports/[sportSlug]/countries/[countrySlug]`
- `/{locale}/teams`
- `/{locale}/teams/[teamId]`
- `/{locale}/match/[fixtureRef]`
- `/{locale}/news`
- `/{locale}/news/[slug]`
- `/{locale}/search`
- `/{locale}/favorites`
- `/{locale}/admin`
- `/{locale}/news/manage`
- `/robots.txt`
- `/sitemap.xml`

### API Surface

| Group | Routes |
| --- | --- |
| Auth and protected access | `/api/auth/*`, `/api/protected/*` |
| User preferences | `/api/favorites`, `/api/alerts`, `/api/recent-views`, `/api/profile/*` |
| Public product APIs | `/api/search`, `/api/health`, `/api/news/articles*`, `/api/odds/*`, `/api/broadcast/fixtures/[fixtureRef]` |
| Analytics and telemetry | `/api/analytics/*`, `/api/telemetry/route-errors` |
| Admin control plane | `/api/admin/control-plane`, `/api/admin/providers/*`, `/api/admin/sync/*`, `/api/admin/issues*`, `/api/admin/feature-flags*`, `/api/admin/modules/*`, `/api/admin/ad-slots/*`, `/api/admin/consent/*`, `/api/admin/cache/revalidate`, `/api/admin/drills/*`, `/api/admin/users/*` |

## Provider Adapter Contract

`src/lib/sports/provider.js` enforces a single contract for every provider descriptor:

- `fetchTaxonomy`
- `fetchFixtures`
- `fetchLivescores`
- `fetchFixtureDetail`
- `fetchStandings`
- `fetchOdds`
- `fetchTeams`
- `fetchNews`
- `fetchMediaMetadata`

Current registry state:

| Provider code | Role | Tier | Sports | Status |
| --- | --- | --- | --- | --- |
| `SPORTSMONKS` | primary | live | football | connected |
| `SPORTSMONKS_BASKETBALL` | expansion | planned | basketball | prepared, not normalized |
| `SPORTSMONKS_TENNIS` | expansion | planned | tennis | prepared, not normalized |
| `SCOREBOARD_BACKUP` | backup | prepared | football, basketball, tennis | reserved failover slot, not connected |

### SportsMonks Adapter Notes

- Implementation: `src/lib/sports/providers/sportsmonks.js`
- Fixture list pulls use `fixtures/between/...` with summary includes
- Live pulls use `livescores/inplay` with detail includes
- Detail hydration uses `fixtures/{fixtureExternalRef}`
- Standings, odds, teams, and TV metadata each have dedicated endpoint mappings
- `fetchTaxonomy` and `fetchNews` are still stubs and should be completed before broader provider expansion

## Sync Schedules and Checkpoints

`src/lib/sync/jobs.js` defines three registered jobs:

| Job | Data covered | Intended cadence | Key checkpoints |
| --- | --- | --- | --- |
| `static-ish` | taxonomy snapshot, fixture window, tracked seasons | bootstraps and operator-triggered refresh | `taxonomy:snapshot`, `fixtures:window`, `season:*` |
| `daily` | taxonomy snapshot, fixture window, tracked seasons | daily or twice-daily | `taxonomy:snapshot`, `fixtures:window`, `season:*` |
| `high-frequency` | livescores, active fixture detail, odds, broadcasts | every few minutes during live windows | `fixtures:live`, `fixtures:active-detail`, `odds:*`, `broadcast:*` |

Backpressure guardrails are configured through:

- `SPORTS_SYNC_MAX_ACTIVE_FIXTURE_DETAILS`
- `SPORTS_SYNC_MAX_ODDS_FIXTURES`
- `SPORTS_SYNC_MAX_BROADCAST_FIXTURES`
- `SPORTS_SYNC_BACKPRESSURE_LIVE_THRESHOLD`
- `SPORTS_SYNC_STALE_LIVE_GRACE_MINUTES`

Checkpoint health in the control plane treats these as the practical freshness budgets:

- live checkpoints: 10 minutes
- active fixture detail: 10 minutes
- odds checkpoints: 20 minutes
- broadcast checkpoints: 12 hours
- fixture window: 12 hours
- everything else: 36 hours

## Caching and Revalidation

### Known Cache Tags

- `coreui:home`
- `coreui:live`
- `coreui:fixtures`
- `coreui:results`
- `coreui:tables`
- `coreui:leagues`
- `coreui:teams`
- `coreui:shell`
- `news:hub`
- `news:articles`
- `news:homepage`
- `news:latest`
- `feature-flags`

### Default Revalidation Windows

| Surface | Tag | Revalidate |
| --- | --- | --- |
| home snapshot | `coreui:home` | 120 seconds |
| live board | `coreui:live` | 30 seconds |
| fixtures board | `coreui:fixtures` | 120 seconds |
| results board | `coreui:results` | 180 seconds |
| tables overview | `coreui:tables` | 300 seconds |
| league directory | `coreui:leagues` | 300 seconds |
| team directory | `coreui:teams` | 300 seconds |
| shell chrome and discovery | `coreui:shell` | 300 seconds |
| news hub and modules | `news:*` | 300 seconds |
| public surface flags | `feature-flags`, `coreui:shell` | 300 seconds |

Manual revalidation flows through `revalidateTagsWithAudit` in `src/lib/cache.js`, which:

- revalidates the affected tag
- writes an `AuditLog` event with source metadata
- supports admin-driven cache refresh via `/api/admin/cache/revalidate`

## Search Architecture

Global search lives in `src/lib/coreui/search.js` and `/api/search`.

The current behavior is:

1. Normalize and tokenize the query.
2. Query five sections in parallel: competitions, teams, matches, players, and articles.
3. Score results with exact, prefix, and token matches plus light freshness/status bonuses.
4. Return a merged `topResults` list and per-section buckets.
5. Fail fast through `withDataAccessTimeout` and return a degraded empty result instead of hanging.

Search telemetry is written to `OperationalEvent` with:

- latency
- degraded/error counts
- total result count
- zero-result frequency

## Build, Run, and Extend

Core commands:

- `npm ci`
- `npm run dev`
- `npm run lint`
- `npm run test`
- `npm run build`

Before extending the platform, the expected sequence is:

1. add or update schema support in `prisma/schema.prisma`
2. persist provider-normalized data in `src/lib/sports/repository.js`
3. expose read models in `src/lib/coreui/*` or `src/lib/sports/*`
4. register cache tags or telemetry only where the surface becomes operationally important
5. extend smoke coverage and baseline archive output

## Primary References

- `README.md`
- `docs/release-validation-2026-03-24.md`
- `docs/production-release-runbook.md`
- `docs/ops-scale-and-multi-sport.md`
