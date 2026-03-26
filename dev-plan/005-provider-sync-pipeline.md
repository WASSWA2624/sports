# 005-provider-sync-pipeline

## Goal
Define the lightweight match-feed layer needed for fixtures, live scores, results, and essential events without a database.

## Build
1. Build a local match-feed module that returns leagues, fixtures, score snapshots, timelines, and lineups in one stable shape.
2. Support live, scheduled, and finished match states from the same read model used by the homepage board, match detail pages, and competition pages.
3. Include deterministic sample data for today, previous results, and upcoming fixtures so the UI can be verified without remote dependencies.
4. Expose filter-ready values for date, league, text query, and kickoff time windows.
5. Provide refresh metadata so live pages can poll safely even when the underlying source is local for now.
6. Keep any future remote provider adapter optional and isolated behind the same feed shape.
7. Avoid credentials, sync jobs, checkpoints, or stale-data persistence in the shipped MVP.
8. Design empty and degraded behavior so a missing local feed or future adapter issue still produces a readable screen.

## Done When
- Fixtures, live states, results, and essential events render from the local feed successfully.
- Homepage filters, league pages, and match pages all read the same shared feed shape.
- The app can stay useful with zero database setup and zero external provider configuration.
- A future adapter could replace the local source without rewriting the main product model.
