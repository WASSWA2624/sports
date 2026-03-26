# 003-core-data-model

## Goal
Implement the core schema for a minimal matches and results platform.

## Build
1. Model the taxonomy needed for the MVP around soccer only: Country, Competition, Season, Stage, and Round or Matchday. If a `Sport` entity remains for provider compatibility, keep it fixed to a single `soccer` value.
2. Model participants required for the shipped UI: Team and Venue, with room for officials or player data only if the feed makes them trivial to carry.
3. Model match data: Fixture, home and away participants, kickoff time, MatchStatus, ScoreSnapshot, and Event.
4. Model provider linkage through normalized external references, source-provider codes, and enough metadata to support provider swaps without changing the core read model.
5. Model operations support tables such as SourceProvider, SyncJob, SyncCheckpoint, and feed-health or stale-data markers.
6. Keep standings, lineups, player stats, editorial content, odds, affiliate, and community entities out of the MVP schema unless they are already present and harmlessly isolated.
7. Add indexes for hot reads such as fixtures by date and status, fixtures by competition and kickoff time, and events by fixture and minute.

## Done When
- Migrations apply cleanly on an empty database.
- Seed data can boot a usable dev experience with competitions, teams, fixtures, scores, and key events.
- Core reads for homepage, match detail, and competition pages are performant locally.
- The schema stays small and focused on data the UI actually renders in MVP.
