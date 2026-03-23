# 016-ship

## Goal
Deploy the Flashscore-style app safely to production with rollback readiness.

## Build
1. Promote the release from staging to production using versioned build artifacts.
2. Run DB migrations with tested backup and rollback procedures.
3. Configure production secrets, provider keys, rate limits, cache controls, monitoring alerts, and feature flags.
4. Execute smoke tests for scores home, date filtering, competition page, match center, team page, news, search, favorites, and admin access.
5. Monitor the first-hour stability window for sync lag, page errors, cache misses, and live data correctness.
6. Publish release notes with known limitations, support ownership, and rollback criteria.

## Done When
- Production is live and stable.
- Rollback is documented and verified.
- Release ownership and post-launch monitoring are explicit.
