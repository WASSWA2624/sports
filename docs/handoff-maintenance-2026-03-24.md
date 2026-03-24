# Maintenance Program

- Date: March 24, 2026
- Scope: recurring care plan for the shipped live scores platform

## Cadence Overview

| Cadence | Owner | Task | Evidence |
| --- | --- | --- | --- |
| Twice weekly | data/feed owner | review provider states, sync checkpoints, stale-data counts, and failed jobs in the admin control room | ops note or issue if thresholds are breached |
| Weekly | engineering owner | run dependency review with `npm outdated` and `npm audit --omit=dev`; patch safe updates | dependency PR or tracking issue |
| Weekly | editorial owner | verify `/en/news`, top linked articles, article image coverage, and takedown workflow readiness | editorial checklist note |
| Weekly | product owner | review parity backlog priority and unresolved gaps against the reference target | prioritized backlog update |
| Weekly | engineering owner | run `npm run validate:release` in the current branch head | CI/job output |
| Biweekly | engineering + operations | review `/api/health`, route p95, search p95, cache hit rate, route errors, and drill freshness | baseline archive and ops summary |
| Monthly | engineering owner | run `RELEASE_PREFLIGHT_MODE=production npm run release:preflight` and `npm run release:artifact` against production-like config | preflight JSON and artifact bundle |
| Monthly | engineering + operations | refresh the baseline archive with `npm run maintenance:baseline` | `build/baselines/*.json` |
| Quarterly | engineering + operations | rehearse rollback and DB restore path, including backup validation and drill execution | drill log and restore notes |

## Dependency Updates

Expected workflow:

1. inspect `npm outdated`
2. patch low-risk dependencies first
3. rerun `npm run lint`, `npm run test`, and `npm run build`
4. rerun `npm run test:smoke` for anything touching runtime behavior
5. update the baseline archive if user-facing behavior or performance changed

## Feed Audits

Sample the following during each audit:

- one live fixture in a priority competition
- one scheduled fixture
- one finished fixture
- one competition standings table
- one news-linked entity surface

Check:

- score correctness
- kickoff time accuracy
- team and competition identity correctness
- odds/broadcast availability where expected
- freshness of `lastSyncedAt` and checkpoint lag

Create an `OpsIssue` for any user-facing data discrepancy that cannot be fixed immediately.

## SEO Checks

Review:

- `/robots.txt`
- `/sitemap.xml`
- localized pages in at least `en`, `fr`, and `sw`
- search results page meta behavior
- article page titles, descriptions, and share images

Use:

- `npm run test:smoke`
- `src/app/__tests__/seo.test.js`
- manual browser spot checks for canonical and noindex behavior

## Performance Reviews

The recurring review should compare the latest numbers against:

- route latency p95 target: `< 900ms`
- search p95 target: `< 700ms`
- cache hit-rate target: `>= 72%`
- live sync lag target: `<= 10 min`
- stale live-data target: `<= 18%`
- route errors target: `<= 6 per hour`

If any metric trends into attention state for two consecutive reviews:

1. open a tracking issue
2. assign an owner
3. record the baseline file or health snapshot that triggered the escalation

## Required Commands

- `npm run validate:release`
- `RELEASE_PREFLIGHT_MODE=production npm run release:preflight`
- `npm run release:artifact`
- `npm run db:backup`
- `npm run maintenance:baseline`

## Maintenance Exit Criteria

The handoff is being honored correctly when:

- dependency work is visible and time-boxed
- feed audits happen before users report major stale-data issues
- SEO regressions are caught in weekly review instead of post-release
- performance data is archived often enough to detect drift
