# 007-live-scores-board

## Goal
Implement the daily scores board, live match experience, and homepage-level conversion or retention surfaces with a mobile-first, low-friction UI.

## Build
1. Build the main scores board with `All`, `LIVE`, `Finished`, and `Scheduled` filters plus date navigation, keeping filter and date actions efficient on mobile.
2. Group matches by country and competition with collapse, expand, and pin controls.
3. Build compact match rows with favorite toggle, status, timer, teams, score, cards, incident indicators, and quick-entry links into match center.
4. Implement live-refresh behavior with controlled polling or streaming for active fixtures.
5. Add live standings and result-freeze logic so completed fixtures remain stable after final whistle.
6. Add loading, skeleton, empty, stale, and degraded-provider states for all live surfaces.
7. Add the homepage and board monetization units from `app-write-up.md`: top picks, best odds or value-bet widgets, inline affiliate CTAs, Telegram or WhatsApp banners, ad inserts between competition sections, and the visible community slips hub as a repeat-visit module while preserving usability.
8. Ensure primary board actions like filter, date switch, favorite, and opening match center are achievable in 1 to 2 taps, fully translated, and visually strong in both dark and light themes.

## Done When
- Users can browse the board like a Flashscore-style live center.
- Live scores update predictably without manual refresh.
- Finished match states stay consistent after settlement.
- Board-level monetization and community-retention surfaces are present, measurable, and do not overpower the core score UX.
- The board remains fast, 100% responsive, and easy to use across mobile and desktop.
