# 005-provider-sync-pipeline

## Goal
Build the provider abstraction and sync pipeline needed for fixtures, live scores, results, and essential events.

## Build
1. Define provider interfaces for taxonomy, fixtures, live states, final results, and key match events.
2. Implement the first football adapter with SportsMonks or the selected primary provider while keeping provider selection env-driven through `SPORTS_DATA_PROVIDER`.
3. Create scheduled sync jobs for static reference data, daily fixture updates, and high-frequency live refresh windows.
4. Normalize provider payloads into stable internal read models used by the homepage board, match detail pages, and competition pages.
5. Store sync metadata, stale markers, failure details, and provider capability notes needed for operational visibility.
6. Make provider credentials, auth headers, auth schemes, base URLs, timeouts, fallback chains, and remote asset hosts env-driven.
7. Add cache and revalidation strategy for hot routes such as the homepage board, active match pages, and competition result pages.
8. Design degraded behavior so delayed or partial provider data produces clear empty or stale states instead of broken screens.

## Done When
- Fixtures, live states, results, and essential events ingest successfully.
- Sync failures are visible, retryable, and do not crash public pages.
- The platform can change supported providers without rewriting the main product model.
- Asset host and provider readiness checks can run before release promotion.
