# 005-sync

## Goal
Integrate SportsMonks through a provider abstraction and sync jobs.

## Build
1. Create `sportsProvider` interface (`fetchFixtures`, `fetchLivescores`, `fetchStandings`, `fetchOdds`, `fetchTeams`).
2. Implement SportsMonks adapter and payload normalizers.
3. Build scheduled jobs for static-ish, daily, and high-frequency buckets.
4. Persist sync metadata/checkpoints and job outcomes.
5. Add graceful fallback states for missing/plan-limited data.
6. Add cache layer for league/match read paths.

## Done When
- Fixtures/live/tables/odds ingest successfully.
- Sync failures are visible and recoverable.
- Provider abstraction allows future provider swap.
