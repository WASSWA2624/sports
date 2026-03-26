# Soccer Matches and Results Product and Technical Specification

**Reference product: FotMob web experience**

---

## 1. Reference Target

- Public reference: `https://www.fotmob.com/`
- Parity target date: March 26, 2026
- Working interpretation: build a minimal public web app that mirrors FotMob's fast, match-first browsing model for scores and results while using our own branding and data provider integration

---

## 2. Executive Summary

This application is a **minimal soccer matches and results website**.

The product exists to help a user do three things quickly:

- see today's live matches
- check scheduled fixtures
- check finished results

The site is public, read-only, and intentionally narrow.

It is not a news product, betting product, community product, or general sports portal.

### 2.1 Scope Baseline

The scope in this repository should now be treated as:

- soccer-only public scores home with date navigation
- live, scheduled, and finished filters
- grouped competitions or leagues
- compact match rows with kickoff time, live status, and score
- minimal match detail page with scoreline, status, and essential events
- competition pages focused on fixtures and results only
- mobile-first, responsive delivery

Everything else should be considered removed from scope unless it is added back explicitly later.

---

## 3. Product Vision

Build a web app that feels as fast and obvious as FotMob:

- open the site and immediately see matches
- change date in one tap or click
- switch between live, scheduled, and finished without losing context
- scan leagues quickly
- open a match and understand the result instantly
- return to the main list without friction

---

## 4. Core Product Principles

### 4.1 Matches First

The homepage is the product. No hero sections, no editorial blocks, and no distractions.

### 4.2 Minimal Read-Only Scope

The first release is public and read-only. No login, no profile, no favorites, and no community features.

### 4.3 Dense but Clear Layout

Use compact rows, clear status chips, consistent spacing, and strong score readability.

### 4.4 Mobile First

Design starts on phone and expands to tablet and desktop.

### 4.5 Fast Updates

Live matches should refresh automatically without a full page reload.

### 4.6 Low Click Cost

Primary flows should take 1 to 2 interactions:

- open today's matches
- change date
- filter live, finished, or scheduled
- open a match
- open a competition results page

### 4.7 Scope Discipline

If a feature does not help users find, scan, or understand matches and results, it is out of scope.

### 4.8 Soccer Only

The sport scope is fixed to soccer. Other sports are out of scope for this product direction.

---

## 5. UX and Design Requirements

### 5.1 Main Layout

The default page layout should prioritize:

- top bar with logo and date navigation
- primary filter row: All, LIVE, Finished, Scheduled
- competition-grouped match list
- optional compact footer

Avoid marketing sections, side rails, and promotional modules.

### 5.2 Match Row Design

Each match row should show only the highest-signal data:

- home team
- away team
- kickoff time or live minute and status
- current score or final score
- simple state indicator: scheduled, live, halftime, finished, postponed, canceled

Rows must stay legible on small screens.

### 5.3 Competition Grouping

Matches should be grouped by competition or league, with clear headers and optional collapse and expand behavior.

### 5.4 Match Detail Page

The match page should stay lightweight and result-centered.

Minimum content:

- teams
- score
- kickoff date and time
- match status
- scorers or key events
- basic metadata such as venue when available

Do not add odds, news, comments, or betting CTAs.

### 5.5 Competition Page

Competition pages should focus on fixtures and results only:

- competition header
- current or selected round or matchday
- list of matches
- ability to move between dates or rounds where provider data allows

### 5.6 Responsiveness

The site must work cleanly on:

- small phones
- large phones
- tablets
- laptops
- desktops

### 5.7 Visual Style

Aim for a clean, practical, FotMob-like presentation:

- compact information density
- strong score emphasis
- restrained use of color
- excellent contrast for live states and final scores
- no decorative clutter

---

## 6. Primary Experiences

### 6.1 Scores Home

Core features:

- today by default
- date switching
- filters for all states
- grouped competitions
- live auto-refresh
- compact, scrollable match list

### 6.2 Results View

Finished matches must be easy to isolate through:

- Finished filter
- date navigation
- competition grouping

### 6.3 Match Detail

Users can open a match to see:

- current or final score
- status
- essential event timeline
- competition and kickoff context

### 6.4 Competition Results

Users can browse a single competition's fixtures and results without leaving the same visual model used on the homepage.

---

## 7. Information Architecture

### 7.1 Header

- logo
- date navigation
- optional timezone indicator if useful

### 7.2 Main Content

- state filters
- competition sections
- match rows

### 7.3 Footer

- lightweight legal or about links only if needed

---

## 8. User Types

### Guest

- browse all available matches and results

There are no registered-user features in the minimal scope.

---

## 9. Data Domains

### 9.1 Taxonomy

- Sport scope fixed to soccer
- Country
- Competition
- Season
- Round or Matchday

### 9.2 Participants

- Team
- Venue

### 9.3 Match Data

- Fixture
- Score
- MatchStatus
- Event
- KickoffTime

Only data that directly supports listing matches or explaining results is required for MVP.

---

## 10. Technical Architecture

### Stack

- Next.js App Router
- Prisma
- MySQL
- React
- CSS Modules or the existing styling system
- provider sync jobs for fixtures and scores

### Frontend Responsibilities

The frontend should support:

- server-rendered match lists for fast first paint
- client refresh or polling for live score updates
- responsive match list and detail pages
- clean loading, empty, and error states

### Suggested Frontend Structure

```txt
src/
  app/
    page.tsx
    matches/[matchId]/page.tsx
    competitions/[competitionSlug]/page.tsx
  components/
    match-row/
    match-list/
    competition-section/
    date-nav/
    state-filter/
  features/
    scores/
    matches/
    competitions/
```

### Backend Responsibilities

- ingest fixture and result data from provider APIs
- normalize competition, team, match, and event data
- cache or persist match lists for fast reads
- refresh live matches on a tighter schedule than scheduled or finished matches

---

## 11. Data Provider Strategy

- provider-agnostic architecture is acceptable, but the product scope stays minimal
- prioritize reliable soccer fixtures, live scores, and final results
- richer feeds such as news, odds, standings, transfers, or social content are not required

---

## 12. API Design

Includes only the endpoints needed for the minimal product:

- match lists by date and state
- match detail
- competition fixtures and results
- health and status endpoints

---

## 13. Route Map

```txt
/
/?date=YYYY-MM-DD&state=all|live|finished|scheduled
/matches/[matchId]
/competitions/[competitionSlug]
/competitions/[competitionSlug]?date=YYYY-MM-DD
```

---

## 14. Non-Functional Requirements

- fast initial page load
- automatic live updates
- stable layout with low shift
- responsive across supported viewports
- graceful degraded mode when provider data is delayed
- accessible contrast and touch targets
- clear empty and error states

---

## 15. Explicit Non-Goals

Out of scope for this write-up:

- news and editorial content
- odds, bookmakers, affiliate links, or betting funnels
- ads and sponsorship placements
- authentication, profiles, or saved favorites
- comments, chat, community slips, or social features
- broad CMS or admin product ambitions beyond basic operational sync control
- multi-surface SEO expansion beyond the core matches and results pages
- coverage for sports other than soccer

---

## 16. Delivery Phases

### Phase 1

- soccer matches homepage
- date navigation
- live, scheduled, and finished filters
- competition grouping
- minimal match detail page

### Phase 2

- competition-specific fixtures and results pages
- better live refresh behavior
- polish for edge states such as postponed or abandoned matches

### Phase 3

- optional expansion to richer soccer match detail or deeper competition coverage, only if it does not break the minimal product focus

---

## 17. Final Recommendation

This product should be treated as:

> a **minimal FotMob-style soccer matches and results site**

Success is defined by:

- speed
- clarity
- scanability
- reliable live updates
- easy results browsing on mobile and desktop
