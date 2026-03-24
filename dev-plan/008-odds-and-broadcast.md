# 008-odds-and-broadcast

## Goal

Release odds, prediction, affiliate, broadcast, and adjacent community-betting surfaces on the major monetization pages.

## Build

1. Expose public odds APIs, bookmaker entities, affiliate-link resolution, and geo-targeted CTA configuration.
2. Render competition-level odds tabs and match-level odds modules with bookmaker source labels, comparison states, and regulated copy hooks.
3. Add prediction surfaces required by `app-write-up.md`: top picks, best odds, high-odds matches, value bets, match-level `Best Bet` highlights with optional reasoning, and community-slip modules with per-pick reasons and predictor history where those surfaces are in scope.
4. Gate odds and broadcast surfaces by selected-provider capabilities so unsupported feeds degrade intentionally instead of rendering broken modules.
5. Make odds, prediction, CTA, and broadcast modules mobile-first, 100% responsive, fully translated, and visually balanced in both dark and light themes.
6. Add stale, unavailable, region-restricted, and age-gated states that remain explicit in the UI.
7. Add TV or streaming channel blocks where coverage exists for a fixture.
8. Track impressions, clicks, and downstream conversion events for odds, predictions, bookmaker CTAs, related broadcast modules, and community-slip engagement actions.
9. Keep primary monetization, broadcast, and community prediction actions reachable in 1 to 2 interactions without crowding the core match, homepage, or competition content.

## Done When

- Odds appear on supported competition and match pages.
- Prediction, affiliate CTA, and community prediction modules can be rendered safely on the major monetization surfaces.
- TV or streaming info can be shown when provided by the feed.
- Regulated or missing data is handled cleanly.
- Unsupported provider capability combinations are hidden or marked unavailable without destabilizing the page.
- Odds and broadcast surfaces remain responsive, fully translated, and easy to use on mobile and desktop.
