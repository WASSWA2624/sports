# 006-shell-navigation-ui

## Goal
Build the minimal FotMob-style shell and navigation system for a match-first product.

## Build
1. Implement a lightweight global header with the product brand and the smallest useful set of controls for browsing matches.
2. Build a clear date-navigation control that is easy to use on mobile and desktop.
3. Build a primary filter row for `All`, `LIVE`, `Finished`, and `Scheduled`.
4. Use a match-first main content area with an optional compact competition rail that helps users switch leagues quickly without reintroducing portal-style clutter.
5. Add design tokens and layout primitives for competition headers, compact rows, state chips, score emphasis, and essential empty or error states.
6. Support locale-aware formatting and an optional timezone indicator where it helps users interpret kickoff times.
7. Keep the shell fast to render, free of horizontal overflow, and intentionally sparse.

## Done When
- The shared shell feels close to the FotMob-style browsing model without extra product chrome.
- Navigation actions are easy to reach in 1 to 2 interactions.
- The public layout stays focused on matches and results rather than modules around them.
