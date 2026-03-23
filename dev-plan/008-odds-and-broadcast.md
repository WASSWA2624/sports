# 008-odds-and-broadcast

## Goal
Release odds and broadcast surfaces on competition and match pages.

## Build
1. Expose public odds APIs and normalized client read models.
2. Render competition-level odds tabs and match-level odds modules with bookmaker source labels.
3. Add stale, unavailable, and region-restricted states that are explicit in the UI.
4. Add TV or streaming channel blocks where coverage exists for a fixture.
5. Add age gating and legal copy hooks for betting-adjacent content.
6. Track odds and broadcast module engagement for analytics.

## Done When
- Odds appear on supported competition and match pages.
- TV or streaming info can be shown when provided by the feed.
- Regulated or missing data is handled cleanly.
