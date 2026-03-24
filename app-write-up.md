
# Sports App Product and Technical Specification

**Reference product: Flashscore web experience**

---

## 1. Reference Target

* Public reference: `https://www.flashscore.com/`
* Parity target date: March 23, 2026
* Working interpretation of "copy paste": the app should mirror the public Flashscore web product's information architecture, page density, interaction model, and core feature set while using our own branding, legal copy, ad wiring, affiliate integrations, and licensed data feeds

---

## 2. Executive Summary

This application is a **Flashscore-style live scores and sports intelligence platform with integrated monetization**.

The goal is to deliver a dense, fast, real-time sports web app that:

* provides global live scores and sports data
* aggregates sports news
* supports deep navigation across sports ecosystems
* delivers high-intent betting-related insights (non-operational)
* maximizes monetization through affiliate conversion and ad placements

This is not just a data product. It is a **conversion-optimized sports platform**.

---

## 3. Product Vision

Build a web app that feels immediately familiar to a Flashscore user, but optimized for **engagement and monetization**:

* open the site and instantly see live matches
* navigate across sports, countries, competitions, teams, and matches seamlessly
* follow live scores in real time
* access high-value insights (predictions, odds, trends)
* take action (click affiliate links, join channels)
* consume sports news within the same experience

---

## 4. Core Product Principles

### 4.1 Parity Before Originality

Match Flashscore UX and structure before introducing enhancements.

### 4.2 Dense Information Layout

Compact, data-rich UI with:

* left rail navigation
* central live board
* optional monetization rail
* minimal whitespace, high signal density

### 4.3 Live-First Performance

Real-time updates without refresh.

### 4.4 Navigation Depth

Sport → Country → Competition → Match in minimal steps.

### 4.5 SEO at Scale

Template-driven, crawlable pages across all entities.

### 4.6 Conversion-Driven Design (NEW)

Every high-traffic surface must:

* guide user toward action
* include monetization triggers
* maintain UX balance

---

## 5. Primary Navigation Model

### 5.1 Header

* logo
* Scores / News switch
* search
* register/login/profile
* utility actions

---

### 5.2 Sports Strip

* Favorites
* Major sports
* More (full list)

---

### 5.3 Left Rail

* pinned leagues
* my teams
* country list
* competitions

---

### 5.4 Center Content

Dynamic:

* scores board
* competition pages
* match center
* team pages
* news
* predictions modules

---

### 5.5 Right Rail

* ads
* affiliate widgets
* Telegram/WhatsApp CTAs
* promo blocks

---

## 6. Core Experiences

### 6.1 Scores Home

Features:

* date navigation
* filters: All, LIVE, Finished, Scheduled
* grouped competitions
* expandable sections
* favorites & pinning
* compact match rows

#### Monetization Additions

* prediction modules (top of board)
* inline affiliate CTAs
* Telegram/WhatsApp banners
* ad inserts between competitions

---

### 6.2 Sport Landing Pages

Same as scores home, scoped per sport.

Includes:

* prediction widgets
* monetization blocks

---

### 6.3 Country Pages

* competition listing
* drill-down navigation

---

### 6.4 Competition Pages

Tabs:

* Summary
* Odds
* News
* Results
* Fixtures
* Standings
* Archive

#### Monetization Additions

* odds comparison with affiliate CTAs
* prediction modules per round
* sponsored placements (future)

---

### 6.5 Match Center

Tabs:

* Match
* H2H
* Standings
* Video

Includes:

* score, timeline, stats, lineups
* venue, referee, TV info

#### Monetization Additions (CRITICAL)

* odds block (top placement)
* “Best Bet” highlight
* affiliate CTAs (Bet Now)
* Telegram CTA

---

### 6.6 Team Pages

* fixtures
* results
* squad
* linked competitions

---

### 6.7 News Hub

* global news
* sport-specific news
* competition and team linked

#### Monetization Additions

* inline betting CTAs
* related odds widgets
* funnel CTAs

---

### 6.8 Favorites and My Teams

* favorite matches, teams, competitions
* drive personalization and alerts

---

### 6.9 Search

* teams
* competitions
* matches
* articles

---

### 6.10 Odds and Betting-Adjacent Surfaces

Supports:

* odds display
* bookmaker labels
* region-based filtering

**Note:** Informational only, not a betting operator.

---

### 6.11 Ads, Consent, and Legal

* banner ads
* inline ads
* right rail ads
* cookie consent
* legal pages

---

## 7. Monetization Strategy (CORE SECTION)

### 7.1 Revenue Streams

1. Betting Affiliate Revenue (Primary)
2. Display Ads (Secondary)
3. Conversion Funnels (Telegram / WhatsApp)
4. Sponsored Placements (Scaling phase)

---

### 7.2 Betting Affiliate System

#### Requirements

* bookmaker entities
* affiliate links
* geo-targeting
* CTA buttons

#### Placement

* match pages
* competition pages
* homepage
* prediction modules

---

### 7.3 Prediction Layer (Conversion Engine)

Add modules:

* Top Picks Today
* Best Odds
* High Odds Matches
* Value Bets

Displayed:

* homepage
* match pages
* competition pages

Each includes:

* odds
* reasoning (optional)
* affiliate CTA

---

### 7.4 Funnel System (MANDATORY)

Channels:

* Telegram
* WhatsApp

#### Entry Points

* banners
* inline CTAs
* match pages
* predictions

#### Flow

User → joins channel → receives tips → clicks affiliate → revenue

---

### 7.5 Advertising

Start with:

* Google AdSense

Expand to:

* Ezoic

#### Placements

* header
* inline
* right rail

---

### 7.6 Sponsored Content

Future support:

* bookmaker promotions
* featured competitions

---

### 7.7 Geo Strategy

Focus:

* Uganda
* Kenya
* Nigeria

Use:

* localized bookmakers
* regional messaging

---

### 7.8 Analytics

Track:

* clicks
* conversions
* funnel flow
* page performance

---

## 8. User Types

### Guest

* full browsing
* limited local favorites

### Registered

* synced favorites
* alerts

### Editor

* manage news

### Admin

* manage system, ads, affiliates

---

## 9. Data Domains

### 9.1 Taxonomy

* Sport, Country, Competition, Season

### 9.2 Participants

* Team, Player, Official, Venue

### 9.3 Match Data

* Fixture, Score, Incident, Stats

### 9.4 Content

* NewsArticle, Category

### 9.5 Personalization

* Favorites, Preferences

### 9.6 Monetization (NEW)

* Bookmaker
* AffiliateLink
* ClickEvent
* ConversionEvent
* FunnelEntry

---

## 10. Technical Architecture

### Stack

* Next.js
* Prisma
* MySQL
* Redux Toolkit
* Styled Components
* i18n

---

### Frontend Structure

```txt
src/
  app/
  components/
  features/
    scores/
    matches/
    competitions/
    news/
    odds/
    affiliates/
    funnel/
    ads/
```

---

### Backend Services

* auth
* sports data
* odds
* affiliates
* analytics
* news
* sync

---

## 11. Data Provider Strategy

* multi-provider architecture
* sports + odds feeds
* real-time sync

---

## 12. API Design

Includes:

* scores
* matches
* teams
* news
* search
* favorites
* affiliates
* analytics

---

## 13. Route Map

```txt
/{locale}
/{locale}/news
/{locale}/{sport}
/{locale}/{sport}/{country}
/{locale}/{sport}/{country}/{competition}
/{locale}/match/{matchRef}
/{locale}/team/{teamRef}
```

---

## 14. Non-Functional Requirements

* real-time updates
* high performance
* SEO coverage
* mobile optimization
* fault tolerance

---

## 15. Explicit Non-Goals

Removed:

* marketplace
* creator economy
* paid subscriptions
* community features

---

## 16. Delivery Phases

### Phase 1

* Flashscore parity (football)

### Phase 2

* multi-sport expansion

### Phase 3

* monetization scaling
* funnel optimization
* sponsored deals

---

## 17. Final Recommendation

This product must be treated as:

> a **conversion-optimized sports data platform**

Success is defined by:

* traffic quality
* conversion rate
* affiliate revenue

---