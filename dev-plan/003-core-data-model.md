# 003-core-data-model

## Goal
Implement the core schema for a multi-sport live scores, news, monetization, and community-prediction platform.

## Build
1. Model identity and preferences: User, Session, Account, UserPreference, FavoriteEntity, NotificationSubscription, RecentView.
2. Model taxonomy: Sport, Country, Competition, Season, Stage, Round, and the relations needed to move from sport to country to competition to match.
3. Model participants: Team, Player, Official, Venue.
4. Model live data: Fixture, FixtureParticipant, ScoreSnapshot, Incident, Lineup, Statistic, Standing, H2HSnapshot, BroadcastChannel.
5. Model odds and editorial data: OddsMarket, OddsSelection, NewsArticle, NewsCategory, ArticleEntityLink, and any joins required to connect articles and odds to sports entities.
6. Model monetization and prediction data: Bookmaker, AffiliateLink, ClickEvent, ConversionEvent, FunnelEntry, PredictionRecommendation, and placement metadata for homepage, competition, and match surfaces.
7. Model community prediction data: CommunitySlip, CommunitySlipSelection, CommunitySlipLike, per-pick reasoning, featured state, visibility, settlement state, and the relations needed for public author-history reads.
8. Model operations and control: SourceProvider, SyncJob, SyncCheckpoint, FeatureFlag, ShellModule, AdSlot, ConsentText, AuditLog, and the operational entities needed to govern revenue and community surfaces safely.
9. Ensure provider-linked entities persist normalized external references, source-provider codes, role or tier metadata, fallback relationships, and enough metadata to support multiple feed families without schema rewrites.
10. Add indexes for hot read paths such as fixtures by sport and kickoff time, incidents by fixture and minute, standings by competition and season, articles by entity and publish date, public community slips by author or fixture, and click or conversion events by partner, geo, and surface.

## Done When
- Migrations apply cleanly on an empty DB.
- Seed data can boot a usable dev shell with sample competitions, matches, bookmakers, monetized placements, and public or draft community slips.
- Core reads for scores, match pages, competition pages, and monetization modules are performant locally.
- The schema can absorb additional provider families without renaming or reshaping the main domain models.
