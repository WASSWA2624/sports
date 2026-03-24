# Scale, Multi-Sport, and Operations Playbook

## Scope

This document closes `014-scale-and-multi-sport` by defining:

- live-window backpressure controls
- observability expectations and SLOs
- provider expansion and backup-feed readiness
- asset and CDN delivery strategy
- failure drills and peak-traffic runbooks

## Live-Window Backpressure

High-frequency sync no longer treats every hot fixture equally.

The runtime now builds a prioritized live-window plan based on:

- fixture status, with `LIVE` fixtures first
- staleness of `lastSyncedAt`
- kickoff proximity

When live volume or staleness crosses the configured threshold, the job switches to `throttled-live-window` mode and reduces these budgets:

- active fixture detail hydration
- odds sync coverage
- broadcast sync coverage

### Control Knobs

- `SPORTS_SYNC_MAX_ACTIVE_FIXTURE_DETAILS`
- `SPORTS_SYNC_MAX_ODDS_FIXTURES`
- `SPORTS_SYNC_MAX_BROADCAST_FIXTURES`
- `SPORTS_SYNC_BACKPRESSURE_LIVE_THRESHOLD`
- `SPORTS_SYNC_STALE_LIVE_GRACE_MINUTES`

### Operator Expectation

Backpressure is a protection mechanism, not a failure. During peak windows it is acceptable for lower-priority scheduled fixtures to refresh more slowly if live fixtures remain inside stale-data budget.

## SLOs

The admin control room and `GET /api/health` should be read against these targets:

| SLO | Target | Source |
| --- | --- | --- |
| Live surface read latency p95 | `< 900ms` | route latency events |
| Search latency p95 | `< 700ms` | search health events |
| Cache hit rate | `>= 72%` | cache access events |
| Live sync lag | `<= 10 min` | `fixtures:live` checkpoint |
| Stale live data rate | `<= 18%` | live fixture freshness check |
| Route errors per hour | `<= 6` | route error telemetry |

## Observability Dashboard

The admin control room now exposes:

- sync lag and job history
- live stale-data counts
- route latency summaries and top slow routes
- cache hit-rate summaries by surface
- search latency, zero-result, and degraded-query signals
- recent failure drill results
- asset coverage and CDN readiness

## Provider Expansion Pattern

The provider layer now uses a registry and env-driven selector instead of a single hard-coded factory.

Activation rules:

- `SPORTS_DATA_PROVIDER` selects the active catalog entry.
- Generic overrides like `SPORTS_PROVIDER_API_KEY` and `SPORTS_PROVIDER_BASE_URL` can be used for fast swaps.
- Provider-specific keys like `API_SPORTS_API_KEY` or `SPORTSMONKS_API_KEY` remain supported for long-lived environments.
- `ASSET_REMOTE_HOSTS` must be updated when a provider introduces different image domains.

Current live adapter family:

- `SPORTSMONKS`
- `SPORTSMONKS_BASKETBALL`
- `SPORTSMONKS_TENNIS`

Cataloged alternatives now prepared for env-based adoption:

- `API_SPORTS`
- `API_FOOTBALL`
- `SPORTSDATAIO`
- `THE_ODDS_API`
- `GOALSERVE`
- `SPORTS_GAME_ODDS`
- `SPORTAPI`
- `JSON_ODDS`
- `ALLSPORTSAPI`
- `SOCCERDATA_API`
- `SPORTS_OPEN_DATA`
- `ODDSJAM`
- `EXEFEED`
- `BETFAIR`
- `SPORTDATAAPI`
- `RAPIDAPI_SPORTS`
- `ERGAST_F1`
- `ESPN_UNOFFICIAL`
- `PINNACLE`
- `SPORTRADAR`
- `STATS_PERFORM`
- `BET365_UNOFFICIAL`
- `FEEDCONSTRUCT`
- `SPORTSCORE`
- `SCOREBOARD_BACKUP`

### Expansion Rule

Do not activate a planned provider until:

1. entity normalization exists for that sport
2. seed and test coverage include that sport
3. the adapter family is marked implemented in the catalog and passes release preflight
4. the admin workspace shows the provider as intentionally enabled

## Asset and CDN Strategy

Asset delivery now flows through a shared asset builder.

### Asset Classes

- competition logos
- team logos
- article hero and share images

### Delivery Rules

- local placeholder assets remain valid fallbacks
- remote provider assets can be delivered directly until a CDN is configured
- when `ASSET_CDN_BASE_URL` is set, remote assets are rewritten through the CDN fetch path
- logo assets should use a long edge TTL
- article media should use a shorter TTL to support editorial updates and social recrops

### Coverage Metrics

The admin workspace reports coverage for:

- competitions with logos
- teams with logos
- published articles with media

## Failure Drills

The admin control room can execute four drill scenarios:

- `provider_outage`
- `delayed_live_feed`
- `search_degradation`
- `cache_invalidation_issue`

Each drill records an operational event with:

- scenario key
- readiness status
- summary
- related measurements

## Peak Traffic Runbooks

## Provider Outage

1. Confirm the failing provider in the admin provider list.
2. Check whether a backup provider slot is marked active and prepared.
3. Leave stale markers visible; do not mask provider lag by manually refreshing unaffected caches only.
4. If the outage is prolonged, disable non-essential live embellishments before removing the core score path.
5. Run the `provider_outage` drill after mitigation and record the result.

## Delayed Live Feed

1. Review `fixtures:live` lag and stale live fixture count.
2. Trigger `high-frequency` sync once after step-up verification.
3. If pressure persists, keep the system in throttled mode and avoid expanding detail or odds budgets.
4. Revalidate core cache tags only after sync success.
5. Run the `delayed_live_feed` drill and confirm stale rate is returning toward budget.

## Search Degradation

1. Check search p95 and degraded/error counts in the admin observability panel.
2. Confirm the API is returning degraded empty responses instead of hard failures.
3. Review DB pressure before increasing query breadth.
4. Keep search usable by preserving top-level shortcuts and recent items in the shell overlay.
5. Run the `search_degradation` drill once latency stabilizes.

## Cache Invalidation Issue

1. Review cache health tags in the admin control room.
2. Compare dependency timestamps to the latest cache revalidation audit entries.
3. Revalidate only the affected tags first; use full-tag refresh only when scope is unclear.
4. Confirm the route latency panel returns to baseline after the refresh.
5. Run the `cache_invalidation_issue` drill and log unresolved tags.

## Peak Match Window Checklist

Use this checklist 30-60 minutes before a heavy slate:

1. Confirm provider chain and active provider states.
2. Confirm live sync lag is inside the target budget.
3. Confirm cache hit rate is above the floor.
4. Confirm route errors are not trending up hour over hour.
5. Confirm article media and logo coverage are acceptable for the featured competitions.
6. Run at least one drill if the window is high-risk or follows a provider incident.
