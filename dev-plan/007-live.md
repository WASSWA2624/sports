# 007-live

## Goal
Implement the daily scores board and live match experience.

## Build
1. Build the main scores board with `All`, `LIVE`, `Finished`, and `Scheduled` filters plus date navigation.
2. Group matches by country and competition with collapse, expand, and pin controls.
3. Build compact match rows with favorite toggle, status, timer, teams, score, cards, and incident indicators.
4. Implement live-refresh behavior with controlled polling or streaming for active fixtures.
5. Add live standings and result-freeze logic so completed fixtures remain stable after final whistle.
6. Add loading, skeleton, empty, stale, and degraded-provider states for all live surfaces.

## Done When
- Users can browse the board like a Flashscore-style live center.
- Live scores update predictably without manual refresh.
- Finished match states stay consistent after settlement.
