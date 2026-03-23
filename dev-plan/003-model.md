# 003-model

## Goal
Implement the core schema for a multi-sport live scores and news product.

## Build
1. Model identity and preferences: User, Session, Account, UserPreference, FavoriteEntity, NotificationSubscription, RecentView.
2. Model taxonomy: Sport, Country, Competition, Season, Stage, Round.
3. Model participants: Team, Player, Official, Venue.
4. Model live data: Fixture, FixtureParticipant, ScoreSnapshot, Incident, Lineup, Statistic, Standing, H2HSnapshot, BroadcastChannel.
5. Model odds and editorial data: OddsMarket, OddsSelection, NewsArticle, NewsCategory, ArticleEntityLink.
6. Model operations: SourceProvider, SyncJob, SyncCheckpoint, FeatureFlag, AuditLog.
7. Add indexes for hot paths such as fixtures by sport and kickoff time, incidents by fixture and minute, standings by competition and season, and articles by entity and publish date.

## Done When
- Migrations apply cleanly on an empty DB.
- Seed data can boot a usable dev shell with sample competitions and matches.
- Core reads for scores, match pages, and competition pages are performant locally.
