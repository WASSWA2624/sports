# Baseline Metrics

- Date: March 24, 2026
- Scope: handoff baseline for future parity and regression comparisons
- JSON archive: `build/baselines/baseline-0.1.0-20260324-ibp6d68ke8kp-20260324-2026-03-24.json`

## Release Snapshot

| Field | Value |
| --- | --- |
| Service | `sports` |
| App version | `0.1.0` |
| Build ID | `IBP6D68Ke8kPXM4ftRSCL` |
| Release display version | `0.1.0-20260324-IBP6D68Ke8kP` |
| Commit SHA | `117bfb227e4cc6b699cbf04994912461220bdbb1` |
| Archive channel | `production` |

## Validation Results

Validation run completed on March 24, 2026 with:

- `npm run validate:release`: pass
- lint: pass
- tests: 12 files, 40 tests, all passing
- production build: pass
- smoke suite: pass for core public and API routes

Smoke suite notes from this run:

- `/robots.txt`: `200`
- `/sitemap.xml`: `200`
- `/api/search?q=Arsenal&locale=en&limit=6`: `200`
- `/api/search?q=Premier&locale=en&limit=6`: `200`
- `/api/health`: `503 degraded`
- `/en`: `200`
- `/en/live?date=2026-03-24`: `200`
- `/en/news`: `200`
- `/en/search?q=arsenal`: `200`
- `/en/favorites`: `200`
- `/en/admin`: `200`

Dynamic smoke checks for competition, team, match, and article routes were skipped because this local dataset did not expose discoverable dynamic URLs through sitemap or search.

## Inventory Baseline

| Metric | Value |
| --- | --- |
| Prisma models | `45` |
| Prisma enums | `11` |
| Prisma migrations | `4` |
| Public page routes | `22` |
| API routes | `38` |
| Known cache tags | `13` |
| Test files | `12` |

## Runtime Probe Baseline

The archive command started the built app locally on `http://127.0.0.1:3025` and recorded:

| Probe | Status | Duration | Notes |
| --- | --- | --- | --- |
| `/en` | `200` | `4501ms` | public shell rendered successfully |
| `/api/search?q=Arsenal&locale=en&limit=6` | `200` | `4037ms` | degraded response with `0` results |
| `/api/health` | `503` | `4034ms` | degraded health, `providerChainLength=0` |

## Interpretation

This is a valid shipped-code baseline, but it is a disconnected local-environment baseline rather than a healthy provider-backed staging baseline.

Use it for:

- route inventory comparisons
- schema and cache-tag drift detection
- smoke coverage drift
- local degraded-mode regression checks

Do not use it alone for:

- healthy live-data latency targets
- provider readiness assertions
- production go/no-go decisions

## Refresh Procedure

1. `npm run validate:release`
2. `npm run maintenance:baseline`
3. compare the new JSON archive against the March 24, 2026 file above
4. update this document only when the baseline meaningfully changes
