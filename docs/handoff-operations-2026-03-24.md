# Operations Handoff

- Date: March 24, 2026
- Scope: `dev-plan/017-handoff-and-maintenance.md`
- Audience: engineering, editorial, product, and operations owners

## Ownership Matrix

| Function | Primary owner | Backup owner | Core responsibilities |
| --- | --- | --- | --- |
| Platform and release | engineering owner | support/on-call owner | deploy, migrations, rollback, cache refresh, auth and admin access |
| Sports data and sync | data/feed owner | engineering owner | provider health, sync lag, stale-data triage, backpressure tuning |
| Editorial and news | editorial owner | product owner | publish/archive workflow, takedowns, entity linking, homepage news quality |
| Product parity roadmap | product owner | engineering owner | prioritize parity gaps, additional sports, richer alerts, KPI reviews |
| Operational watch | operations owner | engineering owner | incident intake, `/api/health` review, issue queue, drill evidence |

These roles are explicit in the repo. If named people are assigned later, keep the same responsibility boundaries.

## Daily Operator Start

Review these first:

1. `GET /api/health`
2. admin control room at `/{locale}/admin`
3. latest `SyncCheckpoint` states and failed jobs
4. open `OpsIssue` entries
5. recent drill results and route-error counts

Escalate immediately if:

- live sync lag is above budget
- stale live fixture rate is rising
- route errors spike
- search is returning degraded responses
- provider chain loses its primary without a usable backup path

## Incident Response Flow

### Severity Guide

| Severity | Example | Initial owner | Target response |
| --- | --- | --- | --- |
| Sev 1 | home, live, match, or news hub broadly unavailable; destructive migration issue | engineering owner | immediate containment and rollback decision |
| Sev 2 | stale or incorrect live scores in high-traffic competitions; search degraded; editorial takedown failure | data/feed or editorial owner | triage within 15 minutes |
| Sev 3 | isolated page regression, missing assets, one failing module or ad slot | owning function | triage in the current business day |

### Standard Triage

1. Confirm whether the user-facing symptom reproduces on a public route and in the admin control room.
2. Check `/api/health` for release metadata, provider chain, stale-data summary, search latency, cache hit rate, and asset coverage.
3. Open or update an `OpsIssue` if user-facing data is wrong or editorial content must be tracked.
4. Contain with the smallest safe lever first:
   - disable a shell module
   - disable a feature flag
   - revalidate affected cache tags
   - rerun the relevant sync job
5. Roll back the release artifact if containment cannot restore a healthy user journey.

## Provider Outage Playbook

Use when upstream provider calls fail, the live checkpoint stops advancing, or the control plane shows provider readiness loss.

1. Check the provider list in the admin control room and confirm which `SourceProvider` is active.
2. Confirm whether `SPORTS_SYNC_FAILOVER_PROVIDERS` includes a prepared fallback.
3. Keep stale indicators visible. Do not hide uncertainty by forcing blind cache refreshes.
4. Reduce non-core surfaces first if necessary:
   - fixture odds
   - competition odds
   - fixture broadcast
   - right-rail shell modules
5. Trigger or rerun the `provider_outage` drill and preserve the result in incident notes.
6. If the outage is prolonged and no backup is connected, communicate degraded live coverage and prepare a release rollback only if the deployed change caused the issue.

## Stale-Data Triage

Use when scores are late, match states are wrong, or `staleLiveFixtureCount` rises.

1. Inspect the `fixtures:live` and `fixtures:active-detail` checkpoints.
2. Compare live sync lag and stale live rate against the target budget.
3. Trigger `POST /api/admin/sync/high-frequency` after admin step-up verification.
4. If the system is under pressure, keep the smaller backpressure budgets in place. Do not widen detail, odds, or broadcast caps during peak load.
5. Revalidate only the related cache tags after a successful sync refresh.
6. If the stale rate does not recover, open an `OpsIssue` tied to the affected fixture or competition and escalate to the data/feed owner.

## Editorial Workflow

### Publish Path

1. Create or edit content through `/{locale}/news/manage` or `/api/news/articles`.
2. Attach sport, country, competition, team, and fixture links where possible.
3. Publish with final `status`, `publishedAt`, and hero/homepage metadata.
4. Confirm cache revalidation occurred for `news:hub`, `news:articles`, `news:homepage`, and `news:latest`.
5. Verify the article appears on:
   - `/en/news`
   - any linked competition/team modules
   - the homepage module if flagged for placement

### Takedown or Correction Path

1. Move the article to `ARCHIVED` or update it with moderation notes.
2. Capture the reason in metadata and, if needed, in an `OpsIssue`.
3. Re-check linked public surfaces after revalidation.
4. If the issue is legal or safety-sensitive, involve product and operations owners before republishing.

## Release and Recovery

Primary release procedures are already in:

- `docs/production-release-runbook.md`
- `docs/production-release-2026-03-24.md`

Operational release checklist:

1. `npm run validate:release`
2. `RELEASE_PREFLIGHT_MODE=production npm run release:preflight`
3. `npm run release:artifact`
4. `npm run db:backup`
5. `npm run db:migrate:status`
6. `npm run db:migrate:deploy`
7. promote the versioned artifact
8. `BASE_URL=https://sports.example npm run test:smoke`
9. hold the first-hour watch window

Rollback criteria:

- sync lag stays above the release threshold for more than 10 minutes
- route errors or page failures breach the configured budget
- critical live, competition, or news data is materially wrong
- migrations fail or corrupt reads
- provider readiness is lost without a viable containment path

## Control Levers

Use these in order from least disruptive to most disruptive:

1. feature flags
2. shell module emergency disable
3. targeted cache revalidation
4. sync rerun
5. provider activation/deactivation
6. artifact rollback
7. DB restore after verified backup

## Evidence To Preserve

For every Sev 1 or Sev 2 issue, capture:

- incident time window
- release version and commit SHA from `/api/health`
- affected route or fixture/article reference
- screenshots or copied control-plane values
- drills run and their result
- rollback or containment actions taken
