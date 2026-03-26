# 003-core-data-model

## Goal
Define the minimal local data model for a soccer matches and results platform.

## Build
1. Define a soccer-only taxonomy for the shipped UI: League, Country, Season, Round or Matchday, Team, Venue, Fixture, ScoreSnapshot, and Event.
2. Keep the match shape small and UI-driven so homepage, competition pages, and match detail can all read from the same local source.
3. Include only the fields needed to render the product: kickoff time, live or final status, score, essential event timeline, lineups when present, and league metadata.
4. Provide stable fixture and competition references so routes such as `/[locale]/match/[fixtureRef]` and `/[locale]/leagues/[leagueCode]` stay predictable.
5. Add lightweight search support through normalized values for league name, team names, and kickoff time buckets.
6. Keep standings depth, player databases, editorial entities, odds, affiliate objects, and operations tables out of the shipped MVP.
7. Avoid any required database schema, migrations, or persistence layer for the public app path.

## Done When
- The local data module can power homepage, league, and match pages directly.
- Sample fixtures cover live, upcoming, and finished states for realistic UI testing.
- Search by league and or time works from the same shared match model.
- The read model stays small and focused on data the UI actually renders in MVP.
