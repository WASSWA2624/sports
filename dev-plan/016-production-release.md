# 016-production-release

## Goal
Deploy the Flashscore-style app safely to production with rollback readiness and monetization safety.

## Build
1. Promote the release from staging to production using versioned build artifacts.
2. Run DB migrations with tested backup and rollback procedures.
3. Configure production secrets, selected-provider keys, provider auth settings, asset remote hosts, odds licensing, affiliate links, bookmaker geos, rate limits, cache controls, monitoring alerts, analytics sinks, and feature flags.
4. Run release preflight checks that validate selected-provider readiness, credential namespace alignment, and asset-host configuration before promotion.
5. Execute smoke tests for scores home, date filtering, competition page, match center, team page, news, search, favorites, admin access, and the major odds or affiliate CTA surfaces.
6. Monitor the first-hour stability window for sync lag, page errors, cache misses, live data correctness, outbound CTA health, and core analytics-event delivery.
7. Publish release notes with known limitations, support ownership, rollback criteria, and geo or compliance notes for regulated content.

## Done When
- Production is live and stable.
- Rollback is documented and verified.
- Release ownership and post-launch monitoring are explicit.
- Monetization surfaces are working without destabilizing the core live product.
- Selected-provider and asset-host configuration is validated before cutover.
