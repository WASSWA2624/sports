# 005-provider-sync-pipeline

## Goal

Build the provider abstraction and sync pipeline needed for Flashscore-style live coverage, odds comparison, and monetized data surfaces.

## Build

1. Define provider interfaces for taxonomy, fixtures, live states, standings, odds, news, media metadata, and any bookmaker or prediction-enrichment hooks needed by the product.
2. Implement the first football adapter with SportsMonks while keeping room for additional sport-specific, odds-specific, and backup-feed adapters, all selected through `SPORTS_DATA_PROVIDER` plus provider-specific env namespaces.
3. Create scheduled sync jobs for static reference data, daily fixture updates, high-frequency live refresh windows, and slower bookmaker or promo catalog refreshes where applicable.
4. Normalize provider payloads into stable internal read models and snapshot tables used by scores board, match center, competition pages, search, odds modules, and predictions surfaces.
5. Store sync metadata, checkpoints, stale markers, licensing metadata, geo restrictions, and failure details for observability and compliance.
6. Make provider credentials, auth headers, auth schemes, base URLs, timeouts, fallback chains, and remote asset hosts env-driven so a supported provider swap does not require code edits.
7. Add provider catalog metadata for capability coverage, adapter-family readiness, and fallback roles so release tooling and control-plane views can distinguish cataloged feeds from implemented ones.
8. Add cache and revalidation strategy for hot pages such as scores board, match center, competition summary, standings, and high-traffic monetization modules.

## Done When

- Fixtures, live states, standings, and supported odds ingest successfully.
- Sync failures are visible, retryable, and do not crash public pages.
- The platform can add more providers or feeds without rewriting the app domain layer.
- The active provider, its auth strategy, and its remote asset hosts can be switched through env configuration and release preflight checks.
- Cataloged but unimplemented providers fail clearly instead of partially syncing.

