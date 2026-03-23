# 005-sync

## Goal
Build the provider abstraction and sync pipeline needed for Flashscore-style live coverage.

## Build
1. Define provider interfaces for taxonomy, fixtures, live states, standings, odds, news, and media metadata.
2. Implement the first football adapter with SportsMonks while keeping room for additional sport-specific adapters.
3. Create scheduled sync jobs for static reference data, daily fixture updates, and high-frequency live refresh windows.
4. Normalize provider payloads into stable internal read models and snapshot tables.
5. Store sync metadata, checkpoints, stale markers, and failure details for observability.
6. Add cache strategy for hot pages such as scores board, match center, competition summary, and standings.

## Done When
- Fixtures, live states, standings, and supported odds ingest successfully.
- Sync failures are visible, retryable, and do not crash public pages.
- The platform can add more providers without rewriting the app domain layer.
