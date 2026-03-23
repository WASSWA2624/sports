# 003-model

## Goal
Implement core database schema and migrations.

## Build
1. Model identity: User, Session, Account, Role, Permission, UserPreference.
2. Model sports data: League, Season, Team, Fixture, Standing, OddsMarket, OddsSelection, ResultSnapshot.
3. Model community: InsightPost, InsightComment, InsightLike, Report, ModerationAction, CreatorProfile.
4. Model marketplace: BettingSlip, BettingSlipSelection, BettingSlipPrice, BettingSlipPurchase, BettingSlipOutcome.
5. Model ops/commerce: Payment, Order, Invoice, AuditLog, FeatureFlag, SyncJob, SyncCheckpoint.
6. Add indexes for high-read paths: fixtures by status/time, odds by fixture/bookmaker, insights by createdAt, slips by creator/status.
7. Seed minimal data (roles, feature flags, sample league/team).

## Done When
- Migrations apply cleanly on empty DB.
- Seed script creates usable dev data.
- Core reads execute under acceptable local latency.
