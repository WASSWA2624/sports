# 007-live-scores-board

## Goal
Implement the homepage scores board and live results experience with a mobile-first, low-friction UI.

## Build
1. Build the main scores board with `All`, `LIVE`, `Finished`, and `Scheduled` filters plus date navigation.
2. Group matches by competition, with optional country context where it improves scanability.
3. Build compact match rows with team names, kickoff time or live minute, match status, and current or final score.
4. Link match rows directly to minimal match detail pages and competition result pages.
5. Implement controlled polling or refresh behavior for active fixtures so live matches update without full-page reloads.
6. Add loading, skeleton, empty, stale, and degraded-provider states for the board.
7. Freeze finished results cleanly after final whistle so users see stable outcomes.
8. Keep primary board actions such as date switch, state filter, and match open within 1 to 2 interactions.

## Done When
- Users can browse the board like a minimal FotMob-style live center.
- Live scores update predictably without manual refresh.
- Finished results remain stable and easy to scan.
- The homepage stays fast and responsive without extra modules competing for attention.
