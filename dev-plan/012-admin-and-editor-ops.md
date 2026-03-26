# 012-admin-and-editor-ops

## Goal
Deliver only the minimal operational control needed to keep provider sync and public scores pages healthy.

## Build
1. Scope internal operations to provider configuration visibility, sync job status, stale-data detection, and health reporting.
2. Build or preserve lightweight operator tools for rerunning sync jobs, checking provider readiness, and reviewing failure details.
3. Expose dashboards or endpoints for sync lag, failed jobs, stale data rates, cache health, and route error spikes.
4. Add emergency controls to pause a broken provider path or hide a failing non-core module without redeploying, if that control already exists or is cheap to support.
5. Keep audit logging focused on operational actions that affect data freshness or production stability.
6. Remove editorial workflows, monetization controls, article management, and community-moderation planning from the active roadmap.
7. If a full admin UI is too heavy for MVP, allow CLI scripts or internal endpoints to satisfy the operational need instead.

## Done When
- Operators can observe feed health and react to sync failures.
- The public scores product is not blocked on a large admin or editorial buildout.
- Internal tools stay focused on reliability rather than removed product areas.
