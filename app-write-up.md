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
* is mobile-first and 100% responsive across phone, tablet, laptop, and desktop
* keeps primary actions within 1 to 2 clicks or taps wherever possible
* ships with polished dark and light themes that both feel first-class
* fully translates the entire UI, not just the public marketing or content shell

This is not just a data product. It is a **conversion-optimized sports platform**.

---

## 3. Product Vision

Build a web app that feels immediately familiar to a Flashscore user, but optimized for **engagement, usability, speed, and monetization**:

* open the site and instantly see live matches on mobile or desktop
* navigate across sports, countries, competitions, teams, and matches seamlessly
* follow live scores in real time
* access high-value insights (predictions, odds, trends)
* take action (click affiliate links, join channels)
* consume sports news within the same experience
* complete core journeys with minimal friction, ideally in 1 to 2 interactions
* read and use every surface in the selected language and theme without degraded quality

---

## 4. Core Product Principles

### 4.1 Parity Before Originality

Match Flashscore UX and structure before introducing enhancements.

### 4.2 Dense Information Layout, Mobile First

Compact, data-rich UI with:

* left rail navigation on larger screens
* central live board
* optional monetization rail
* minimal whitespace, high signal density
* mobile-first composition so the smallest viewport gets the primary design pass

Desktop should expand the mobile experience, not replace it with a separate product logic.

### 4.3 Live-First Performance

Real-time updates without refresh, with fast initial load, fast filter changes, low layout shift, and strong perceived performance on mobile connections.

### 4.4 One-to-Two-Click UX

Primary actions should happen in 1 to 2 clicks or taps whenever realistically possible:

* open search
* switch date or filter
* favorite a match, team, or competition
* open a match center
* switch major tabs
* reach key monetization or funnel entry points

### 4.5 Navigation Depth

Sport -> Country -> Competition -> Match in minimal steps.

### 4.6 Full Translation Coverage

The UI must be 100% translated across:

* public pages
* auth flows
* favorites and settings
* search
* news
* odds and prediction surfaces
* ads, consent, legal, and regulated copy
* errors, empty states, loading states, stale states, and degraded states
* admin and editorial surfaces

No mixed-language UI is acceptable in shipped surfaces.

### 4.7 Theme Quality in Dark and Light Modes

Dark and light themes must both be production-grade:

* balanced color blending
* strong readability on dense data surfaces
* clear status colors for live, finished, alerts, warnings, and disabled states
* accessible contrast for text, tabs, chips, tables, and CTA components
* monetization modules that feel integrated rather than visually bolted on

### 4.8 SEO at Scale

Template-driven, crawlable pages across all entities.

### 4.9 Conversion-Driven Design

Every high-traffic surface must:

* guide user toward action
* include monetization triggers
* maintain UX balance
* never sacrifice clarity, speed, or ease of use for monetization density

---

## 5. UX and Design Requirements

### 5.1 Mobile-First Layout Rules

* Design starts from the smallest breakpoint first.
* Every major page must work without horizontal scrolling.
* Sticky controls, tabs, filters, and match actions should remain thumb-friendly.
* Desktop layouts may add rails and density, but mobile must still feel complete and primary.

### 5.2 Responsiveness

The UI must be 100% responsive across:

* small phones
* large phones
* tablets
* laptop screens
* large desktop screens

Cards, tables, rows, tabs, rails, and monetization units must reflow cleanly at every supported size.

### 5.3 Interaction Efficiency

The product should feel easy to use immediately:

* 1 to 2 clicks or taps for primary actions
* clear visual hierarchy
* predictable interaction patterns
* minimal modal dependency
* fast return paths back to live scores and favorites

### 5.4 Performance Expectations

The experience should feel fast even on dense pages:

* quick first render
* fast board and tab transitions
* low-friction search
* low-jank live updates
* smooth theme switching
* no noticeable slowdown from translation or monetization modules

### 5.5 Theme System

The design system must support:

* full dark theme
* full light theme
* shared semantic tokens for text, borders, backgrounds, live states, alerts, CTA states, and monetization surfaces
* consistent component behavior across both themes

### 5.6 Translation Requirements

Translation must cover the whole UI, including:

* navigation
* tabs and filters
* match states
* search copy
* article metadata
* favorites and alerts
* auth, settings, and onboarding
* consent, legal, and geo-gated copy
* admin labels and operational messaging

The app should support full-locale rendering rather than partial label substitution.

---

## 6. Primary Navigation Model

The navigation system must preserve Flashscore familiarity while staying mobile-first, responsive, fast, and fully translated.

### 6.1 Header

* logo
* Scores / News switch
* search
* register/login/profile
* utility actions

Header behavior must collapse cleanly on mobile without hiding core actions behind excessive taps.

---

### 6.2 Sports Strip

* Favorites
* Major sports
* More (full list)

Must be touch-friendly, horizontally usable on mobile, and fast to scan.

---

### 6.3 Left Rail

* pinned leagues
* my teams
* country list
* competitions

On mobile, this should become a usable drawer or stacked pattern without losing navigation depth.

---

### 6.4 Center Content

Dynamic:

* scores board
* competition pages
* match center
* team pages
* news
* predictions modules

This is the core speed and usability zone of the product.

---

### 6.5 Right Rail

* ads
* affiliate widgets
* Telegram/WhatsApp CTAs
* promo blocks

On mobile, these modules should stack or inline gracefully without overwhelming primary content.

---

## 7. Core Experiences

Every core experience must be mobile-first, 100% responsive, fully translated, theme-consistent, fast, and efficient to use.

### 7.1 Scores Home

Features:

* date navigation
* filters: All, LIVE, Finished, Scheduled
* grouped competitions
* expandable sections
* favorites and pinning
* compact match rows
* touch-friendly controls with 1 to 2 tap access to match center and favorite actions

#### Monetization Additions

* prediction modules (top of board)
* inline affiliate CTAs
* Telegram/WhatsApp banners
* ad inserts between competitions

---

### 7.2 Sport Landing Pages

Same as scores home, scoped per sport.

Includes:

* prediction widgets
* monetization blocks

---

### 7.3 Country Pages

* competition listing
* drill-down navigation

Must remain easy to scan and navigate on narrow screens.

---

### 7.4 Competition Pages

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

Tabs and selectors should stay usable, translated, and visually stable across both themes.

---

### 7.5 Match Center

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
* Best Bet highlight
* affiliate CTAs (Bet Now)
* Telegram CTA

The match center is the highest-value action surface and must feel extremely fast and easy to use on mobile.

---

### 7.6 Team Pages

* fixtures
* results
* squad
* linked competitions

---

### 7.7 News Hub

* global news
* sport-specific news
* competition and team linked

#### Monetization Additions

* inline betting CTAs
* related odds widgets
* funnel CTAs

Article discovery, open, and return paths must be low-friction on mobile and desktop.

---

### 7.8 Favorites and My Teams

* favorite matches, teams, competitions
* drive personalization and alerts

Favoriting must feel nearly instant and available from all key surfaces.

---

### 7.9 Search

* teams
* competitions
* matches
* articles

Search should open quickly, show useful results fast, and get the user to the right destination in 1 to 2 interactions.

---

### 7.10 Odds and Betting-Adjacent Surfaces

Supports:

* odds display
* bookmaker labels
* region-based filtering

**Note:** Informational only, not a betting operator.

---

### 7.11 Ads, Consent, and Legal

* banner ads
* inline ads
* right rail ads
* cookie consent
* legal pages

These surfaces must also be fully translated, responsive, theme-aware, and non-disruptive to the core experience.

---

## 8. Monetization Strategy (CORE SECTION)

### 8.1 Revenue Streams

1. Betting Affiliate Revenue (Primary)
2. Display Ads (Secondary)
3. Conversion Funnels (Telegram / WhatsApp)
4. Sponsored Placements (Scaling phase)

---

### 8.2 Betting Affiliate System

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

CTAs must remain clear, efficient, and easy to reach without harming usability.

---

### 8.3 Prediction Layer (Conversion Engine)

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

### 8.4 Funnel System (MANDATORY)

Channels:

* Telegram
* WhatsApp

#### Entry Points

* banners
* inline CTAs
* match pages
* predictions

#### Flow

User -> joins channel -> receives tips -> clicks affiliate -> revenue

---

### 8.5 Advertising

Start with:

* Google AdSense

Expand to:

* Ezoic

#### Placements

* header
* inline
* right rail

---

### 8.6 Sponsored Content

Future support:

* bookmaker promotions
* featured competitions

---

### 8.7 Geo Strategy

Focus:

* Uganda
* Kenya
* Nigeria

Use:

* localized bookmakers
* regional messaging

---

### 8.8 Analytics

Track:

* clicks
* conversions
* funnel flow
* page performance
* click-depth and interaction-efficiency signals where useful

---

## 9. User Types

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

All user types should get a fully translated, responsive, theme-complete experience.

---

## 10. Data Domains

### 10.1 Taxonomy

* Sport, Country, Competition, Season

### 10.2 Participants

* Team, Player, Official, Venue

### 10.3 Match Data

* Fixture, Score, Incident, Stats

### 10.4 Content

* NewsArticle, Category

### 10.5 Personalization

* Favorites, Preferences

### 10.6 Monetization

* Bookmaker
* AffiliateLink
* ClickEvent
* ConversionEvent
* FunnelEntry

---

## 11. Technical Architecture

### Stack

* Next.js
* Prisma
* MySQL
* Redux Toolkit
* Styled Components
* i18n

### Frontend Responsibilities

The frontend architecture must explicitly support:

* mobile-first responsive composition
* full dark and light theme coverage
* complete translation of all user-facing UI
* efficient navigation and 1 to 2 click primary journeys
* fast rendering on dense pages

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

### Backend Services

* auth
* sports data
* odds
* affiliates
* analytics
* news
* sync

---

## 12. Data Provider Strategy

* multi-provider architecture
* sports + odds feeds
* real-time sync

Provider flexibility must never break UI quality, translation coverage, theme behavior, or responsiveness.

---

## 13. API Design

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

## 14. Route Map

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

## 15. Non-Functional Requirements

* real-time updates
* high performance
* mobile-first implementation
* 100% responsiveness across supported viewports
* easy-to-use UI with 1 to 2 click or tap completion for primary actions
* efficient interaction design with minimal friction
* full dark and light theme parity with strong color blending and readable contrast
* 100% translation of the entire UI, including public, auth, admin, consent, legal, empty, error, and degraded states
* SEO coverage
* fault tolerance

---

## 16. Explicit Non-Goals

Removed:

* marketplace
* creator economy
* paid subscriptions
* community features

---

## 17. Delivery Phases

### Phase 1

* Flashscore parity (football)
* mobile-first and translation-complete public product baseline

### Phase 2

* multi-sport expansion
* UX refinement across responsive and theme-heavy surfaces

### Phase 3

* monetization scaling
* funnel optimization
* sponsored deals

---

## 18. Final Recommendation

This product must be treated as:

> a **conversion-optimized sports data platform**

Success is defined by:

* traffic quality
* conversion rate
* affiliate revenue
* speed and ease of use
* mobile usability
* translation completeness
* dark and light theme quality

---
