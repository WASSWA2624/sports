# 008-odds-and-broadcast

## Goal

Release odds, prediction, affiliate, and broadcast surfaces on competition and match pages.

## Build

1. Expose public odds APIs, bookmaker entities, affiliate-link resolution, and geo-targeted CTA configuration.
2. Render competition-level odds tabs and match-level odds modules with bookmaker source labels, comparison states, and regulated copy hooks.
3. Add prediction surfaces required by `app-write-up.md`: top picks, best odds, high-odds matches, value bets, and match-level `Best Bet` highlights with optional reasoning.
4. Gate odds and broadcast surfaces by selected-provider capabilities so unsupported feeds degrade intentionally instead of rendering broken modules.
5. Make odds, prediction, CTA, and broadcast modules mobile-first, 100% responsive, fully translated, and visually balanced in both dark and light themes.
6. Add stale, unavailable, region-restricted, and age-gated states that remain explicit in the UI.
7. Add TV or streaming channel blocks where coverage exists for a fixture.
8. Track impressions, clicks, and downstream conversion events for odds, predictions, bookmaker CTAs, and related broadcast modules.
9. Keep primary monetization and broadcast actions reachable in 1 to 2 interactions without crowding the core match or competition content.

## Done When

- Odds appear on supported competition and match pages.
- Prediction and affiliate CTA modules can be rendered safely on the major monetization surfaces.
- TV or streaming info can be shown when provided by the feed.
- Regulated or missing data is handled cleanly.
- Unsupported provider capability combinations are hidden or marked unavailable without destabilizing the page.
- Odds and broadcast surfaces remain responsive, fully translated, and easy to use on mobile and desktop.

