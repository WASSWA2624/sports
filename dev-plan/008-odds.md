# 008-odds

## Goal
Release odds surfaces for fixtures and match detail.

## Build
1. Expose public odds APIs and client service wrappers.
2. Render core odds markets per match with bookmaker source labels.
3. Add odds refresh cadence separate from live score cadence.
4. Highlight stale/unavailable odds states clearly.
5. Track odds-view engagement analytics events.

## Done When
- Odds appear on key pages for covered matches.
- Stale data handling is explicit.
- Odds reads remain performant under load tests.
