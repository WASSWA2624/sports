# Sports App Product and Technical Specification

**Reference product: Flashscore web experience**

## 1. Reference Target

- Public reference: `https://www.flashscore.com/`
- Parity target date: March 23, 2026
- Working interpretation of "copy paste": the app should mirror the public Flashscore web product's information architecture, page density, interaction model, and core feature set while using our own branding, legal copy, ad wiring, and licensed data feeds

## 2. Executive Summary

This application is no longer a sports marketplace or creator platform. It is a Flashscore-style live scores and sports news product.

The goal is to deliver a dense, fast, real-time sports web app with:

- a global scores hub
- a top-level news hub
- sport navigation across many sports
- left-rail country and competition browsing
- pinned leagues and favorite teams
- competition pages with summary, odds, news, results, fixtures, standings, and archive
- match centers with timeline, stats, lineups, H2H, standings, TV info, and related media
- team pages
- search
- account-backed favorites and alerts
- SEO-heavy public pages

The current technical direction remains a full-stack Next.js application with Prisma, MySQL, Styled Components, Redux Toolkit, and i18n support, but the product scope shifts to multi-sport live coverage instead of community monetization.

## 3. Product Vision

Build a web app that feels immediately familiar to a Flashscore user:

- open the site and see live and scheduled matches without friction
- move between sports, countries, competitions, teams, and matches in one or two clicks
- follow live scores without manual refresh
- save favorite teams, matches, and competitions
- read linked sports news from the same shell
- inspect match detail pages that are deep, data-dense, and fast

## 4. Core Product Principles

### 4.1 Parity Before Originality

Product decisions should prefer one-to-one parity with the reference experience before custom invention.

### 4.2 Dense Information Layout

The UI should be compact and information-rich, especially on desktop:

- persistent left rail
- central live board
- optional right-rail ad or supporting widgets
- compact rows, tabs, pills, and grouped tables

### 4.3 Live-First Performance

Scores, statuses, and match incidents must update quickly and predictably without the user refreshing the page.

### 4.4 Navigation Depth

Users must be able to drill from sport to country to competition to match or team with minimal friction.

### 4.5 SEO at Scale

Public pages must be crawlable, structured, and template-driven across sports, countries, competitions, teams, matches, standings, results, fixtures, and news.

## 5. Primary Navigation Model

### 5.1 Header

The global header should include:

- brand logo
- top-level switch between `Scores` and `News`
- search trigger
- login/profile entry
- menu or utility actions

### 5.2 Sports Strip

The horizontal sport selector should follow the Flashscore pattern:

- `Favorites`
- major sports directly visible
- `More` entry for the full sports catalog

Initial visible sports should match the reference pattern as closely as our feed coverage allows, starting with sports such as:

- Football
- Tennis
- Basketball
- Hockey
- Golf
- Baseball
- Snooker
- Volleyball

### 5.3 Left Rail

The left rail should support:

- pinned leagues
- my teams
- country list
- competition lists within a selected country
- quick links to major competitions

### 5.4 Center Content

The center pane changes by route but is primarily:

- daily scores board
- competition hub
- match center
- team page
- news listing
- article page

### 5.5 Right Rail

The right rail can contain:

- ad slots
- supporting promo blocks
- secondary widgets

The layout must still work without ads.

## 6. Core Experiences

### 6.1 Scores Home

The homepage should function as the central scores board for the selected sport.

Required behavior:

- date navigation with previous and next controls
- filter tabs for `All`, `LIVE`, `Finished`, and `Scheduled`
- grouped competitions by country and tournament
- expandable and collapsible competition sections
- favorite and pin actions on competitions and matches
- compact match rows with status, score, cards, incidents, and secondary indicators
- inline ad cards where configured
- no hard page reload for live data changes

### 6.2 Sport Landing Pages

Each sport should have its own landing page with the same layout model as football:

- daily board
- pinned competitions
- country navigation
- results and fixtures access

### 6.3 Country Pages

Country pages should list competitions for the selected sport and allow the user to drill into league and cup pages.

### 6.4 Competition Pages

Competition pages should mirror the Flashscore tab model:

- Summary
- Odds
- News
- Results
- Fixtures
- Standings
- Archive

Required competition content:

- season selector
- competition identity block
- scheduled matches
- latest scores
- standings access
- linked news
- archive of previous seasons

### 6.5 Match Center

The match page is a core parity target.

Primary tabs:

- Match
- H2H
- Standings
- Video when available

Inside the Match tab, support sub-tabs such as:

- Summary
- Stats
- Lineups

Required match content:

- kickoff date and time
- team identities with logos
- live or final score state
- match status
- timeline of incidents
- goals, cards, substitutions, VAR, injuries, and period markers
- stats such as xG, possession, shots, corners, fouls, and other sport-specific metrics when available
- lineups and benches
- H2H table
- competition standings context
- TV or streaming channel list when feed data exists
- venue, referee, and capacity when available
- related highlights or video links when available

### 6.6 Team Pages

Team pages should provide:

- identity header
- fixtures
- results
- form view
- squad or roster when feed support exists
- linked competition pages
- linked news and media where available

### 6.7 News Hub

The app must have a top-level `News` mode rather than treating news as a secondary blog.

Required news surfaces:

- global news landing
- sport-specific news pages
- competition-linked news modules
- team-linked news modules
- article pages with related entities

### 6.8 Favorites and My Teams

Favorites are a first-class feature, not an afterthought.

Users should be able to favorite:

- matches
- teams
- competitions

Favorites should drive:

- left-rail `My Teams`
- favorites page
- notification preferences
- homepage prioritization

### 6.9 Search

Search should return matches for:

- teams
- competitions
- players where coverage exists
- matches
- articles

### 6.10 Odds and Betting-Adjacent Surfaces

The Flashscore reference includes odds surfaces and betting-adjacent modules. Our app should support:

- competition odds tab
- match odds blocks
- bookmaker labels
- stale and unavailable states
- region and age gating where legally required

This remains an informational product, not a betting operator.

### 6.11 Ads, Consent, and Legal Surfaces

The reference product includes visible ad placements and consent flows. The app should therefore plan for:

- top banner ads
- inline board ads
- right-rail ads
- cookie consent
- privacy, terms, and contact pages
- legal gating for regulated content

## 7. User Types

### 7.1 Guest

- browse all public sports pages
- search
- view scores, news, standings, fixtures, results, and match pages
- store some favorites locally

### 7.2 Registered User

- sync favorites across devices
- manage alerts
- customize sport and competition preferences
- maintain recent teams and competitions

### 7.3 Editor

- manage news content
- curate homepage modules
- review article associations

### 7.4 Admin

- manage data providers, sync jobs, feature flags, ad slots, and operational controls

## 8. Data Domains

The data model must support a broad live-scores product rather than a football-only content marketplace.

### 8.1 Taxonomy

- Sport
- Country
- Competition
- Season
- Stage
- Round

### 8.2 Participants

- Team
- Player
- Official
- Venue

### 8.3 Match Data

- Fixture
- FixtureParticipant
- ScoreSnapshot
- Incident
- Lineup
- Statistic
- Standing
- H2HSnapshot
- BroadcastChannel
- OddsMarket
- OddsSelection

### 8.4 Content

- NewsArticle
- NewsCategory
- ArticleEntityLink

### 8.5 Personalization

- UserPreference
- FavoriteEntity
- NotificationSubscription
- RecentView

### 8.6 Operations

- SourceProvider
- SyncJob
- SyncCheckpoint
- FeatureFlag
- AuditLog

## 9. Technical Architecture

### 9.1 Stack

- Next.js App Router
- JavaScript
- Prisma ORM
- MySQL
- Styled Components
- Redux Toolkit
- i18n routing and translation dictionaries

### 9.2 Frontend Shape

Suggested feature modules:

```txt
src/
  app/
  components/
  features/
    shell/
    scores/
    competitions/
    matches/
    teams/
    news/
    favorites/
    search/
    odds/
    settings/
    admin/
  lib/
  services/
  store/
  styles/
  i18n/
  types/
```

### 9.3 Backend Shape

Use a modular monolith with clear service boundaries:

- auth
- sports taxonomy
- fixtures and live states
- standings
- odds
- news
- favorites and alerts
- search
- admin and sync ops

### 9.4 Rendering Strategy

Server-render:

- sport pages
- competition pages
- team pages
- match pages
- standings
- results
- fixtures
- news articles

Client-enhance:

- live score updates
- favorite toggles
- date board filters
- pinned leagues
- search overlays
- alert controls

## 10. Data Provider Strategy

Flashscore-level breadth cannot depend on a single football feed. The app must support a provider abstraction with sport-specific adapters.

### 10.1 Provider Requirements

- sports taxonomy
- fixtures and live states
- standings
- lineups
- match stats
- odds where licensed
- news or editorial ingest hooks

### 10.2 Initial Direction

SportsMonks can remain the first football adapter, but the architecture must assume more providers are needed for wider Flashscore-style parity across sports.

### 10.3 Sync Buckets

- low-frequency: sports, countries, competitions, seasons, teams, venues
- daily: fixtures, standings, competition metadata
- high-frequency: live scores, incidents, match stats, odds
- editorial cadence: news ingestion and homepage curation

### 10.4 Read Strategy

- normalized source tables for ingestion
- denormalized read models for hot pages
- cache-first public page delivery
- short TTL or streaming updates for live states

## 11. API Design

Representative route groups:

- `GET /api/scores`
- `GET /api/sports/:sportSlug`
- `GET /api/competitions/:competitionSlug`
- `GET /api/competitions/:competitionSlug/standings`
- `GET /api/matches/:matchRef`
- `GET /api/matches/:matchRef/stats`
- `GET /api/matches/:matchRef/lineups`
- `GET /api/teams/:teamSlug`
- `GET /api/news`
- `GET /api/news/:articleSlug`
- `GET /api/search`
- `POST /api/favorites`
- `DELETE /api/favorites/:id`
- `POST /api/alerts`
- `GET /api/admin/sync-jobs`

## 12. Route Map

Suggested public route model:

```txt
/{locale}
/{locale}/news
/{locale}/{sport}
/{locale}/{sport}/{country}
/{locale}/{sport}/{country}/{competition}
/{locale}/{sport}/{country}/{competition}/odds
/{locale}/{sport}/{country}/{competition}/news
/{locale}/{sport}/{country}/{competition}/results
/{locale}/{sport}/{country}/{competition}/fixtures
/{locale}/{sport}/{country}/{competition}/standings
/{locale}/{sport}/{country}/{competition}/archive
/{locale}/match/{matchRef}
/{locale}/team/{teamRef}
/{locale}/favorites
/{locale}/search
/{locale}/settings
/{locale}/admin
```

## 13. Non-Functional Requirements

- real-time updates on live boards and match pages
- excellent perceived performance on low bandwidth
- mobile support without losing the dense data feel
- consistent timezone and locale formatting
- accessible navigation and color contrast
- high SEO coverage for public routes
- graceful degraded states when providers fail
- clear stale-data markers
- observability for sync lag, cache health, and route performance

## 14. Explicit Non-Goals

The app is no longer scoped around:

- user-generated sports posts
- creator profiles
- betting slip builders
- paid marketplace content
- subscriptions for premium picks
- community discussion features

Those features should be removed from planning unless separately re-approved.

## 15. Delivery Direction

### Phase 1

Replicate the public Flashscore football experience end to end:

- shell
- scores board
- competition pages
- match center
- team pages
- news
- favorites

### Phase 2

Expand parity across additional sports and deepen live match detail.

### Phase 3

Harden scale, search, alerts, ads, SEO coverage, and operational tooling.

## 16. Final Recommendation

The correct target for this app is a Flashscore-style live scores product with public web parity as of March 23, 2026, not a sports marketplace.

Every roadmap decision should now be judged against one question:

`Does this move the app closer to Flashscore-style page, data, and interaction parity?`
