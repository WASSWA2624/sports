# 016-production-release

## Goal
Deploy the minimal matches and results app safely to production with rollback readiness.

## Build
1. Promote the release using versioned build artifacts and a repeatable deployment path.
2. Run DB migrations with tested backup and rollback procedures.
3. Configure production secrets for the selected provider, provider auth settings, asset remote hosts, cache controls, monitoring alerts, and any minimal analytics sinks that remain in scope.
4. Run release preflight checks that validate selected-provider readiness and asset-host configuration before promotion.
5. Execute smoke tests for the homepage board, date filtering, state filtering, match detail, competition page, and public health endpoint across representative mobile and desktop layouts.
6. Monitor the first-hour stability window for sync lag, page errors, cache misses, stale data, and live-score correctness.
7. Publish release notes with known limitations, rollback criteria, and ownership for post-launch monitoring.

## Done When
- Production is live and stable on the shipped routes.
- Rollback is documented and verified.
- Release ownership and post-launch monitoring are explicit.
- Provider and asset-host configuration is validated before cutover.
