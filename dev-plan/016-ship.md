# 016-ship

## Goal
Deploy safely to production with rollback readiness.

## Build
1. Promote release from staging to production using versioned build artifacts.
2. Run database migrations with backup and rollback plan tested in staging.
3. Configure production secrets, rate limits, monitoring alerts, and feature flags.
4. Execute smoke tests immediately after deploy (auth, live feed, odds, insights, purchase).
5. Monitor first-hour stability window and rollback immediately on SLO breach.
6. Publish release notes with known limitations and support escalation path.

## Done When
- Production release is live and stable.
- Rollback procedure is verified and documented.
- Release notes and on-call ownership are confirmed.
