# MVP Scope Sign-Off (Phase 001)

## Purpose

This document freezes the active product scope for the sports app and is the repository source of truth for parity, monetization, UX, compliance, geo, and provider-flexibility decisions.

Phase 001 is a scope lock, not a claim that every surface is already implemented. Later phases must execute against this contract unless an approved change request updates it.

## Repository Status

- Scope state: frozen for implementation
- Source-of-truth status: active
- Canonical references:
  - `app-write-up.md` for the full product and monetization brief
  - `dev-plan/001-parity-scope.md` for phase acceptance criteria
  - this file for the approved implementation boundary inherited by later phases
- Effective date: 2026-03-24
- Reference parity snapshot: public Flashscore web experience observed on 2026-03-23

## North Star

Build a Flashscore-style public web product with one-to-one parity ambition for information architecture, page density, navigation logic, and core interaction patterns, while using our own branding, legal copy, advertising, affiliate wiring, analytics, and licensed data providers.

The product is explicitly a:

- live scores platform
- sports news platform
- betting-adjacent odds and prediction insight platform
- conversion-optimized affiliate and funnel platform

The product is explicitly not a:

- marketplace
- creator tool
- subscription product
- community or social-post product
- betting operator

## Locked Product Definition

The app must be treated as a conversion-optimized sports data platform whose primary goals are:

- fast live score consumption
- deep sports navigation across sport, country, competition, team, and match entities
- low-friction discovery of news, odds, and predictions
- monetization through affiliate conversion, display ads, and messaging-channel funnels
- retention through favorites, alerts, personalization, and recurring visit loops

## In-Scope Parity Surfaces

The following surfaces are locked into scope for Flashscore-style public web parity and later delivery phases must assume they are required:

- shared shell with `Scores` and `News`
- sports strip with `Favorites`, major sports, and `More`
- responsive left rail for pinned leagues, teams, countries, and competitions
- dense daily scores board with date navigation and `All`, `LIVE`, `Finished`, and `Scheduled` filters
- sport landing pages
- country pages
- competition pages
- match center pages
- team pages
- news landing and article pages
- favorites and my teams experiences
- search across matches, teams, competitions, and articles
- odds and bookmaker comparison surfaces where licensed
- prediction surfaces
- ad placements, consent modules, and legal pages
- Telegram and WhatsApp funnel entry points

## Locked Match, Competition, and Content Expectations

Parity means later phases should plan for the following surface depth:

- competition pages with `Summary`, `Odds`, `News`, `Results`, `Fixtures`, `Standings`, and `Archive`
- match center with `Match`, `H2H`, `Standings`, and `Video` tabs plus score, incidents, stats, lineups, venue, referee, and TV information when available
- team pages with fixtures, results, squad, and linked competitions
- news hub with global, sport, competition, and team-linked discovery paths

## Locked Monetization and Conversion Model

Monetization is core scope, not a stretch goal. Later phases must preserve these revenue assumptions:

- primary revenue: betting affiliate conversion
- secondary revenue: display advertising
- mandatory conversion funnels: Telegram and WhatsApp channel entry
- future scaling support: sponsored placements

Required monetization surfaces include:

- homepage and board prediction modules
- inline affiliate CTAs
- bookmaker comparison modules
- match-page top-slot odds block and best-bet presentation
- Telegram and WhatsApp banners or inline prompts
- ad inserts in header, inline content zones, and right rail modules

Required analytics coverage includes:

- CTA clicks
- affiliate traffic handoff events
- funnel entry events
- conversion events where partner reporting supports them
- page performance and interaction-efficiency signals

## UX Quality Bar

All later phases must satisfy the following quality bar:

- mobile-first design is the default, not a responsive afterthought
- the UI is 100% responsive across phones, tablets, laptops, and desktops
- primary actions should complete in 1 to 2 clicks or taps wherever realistic
- the product must feel fast on dense pages and mobile connections
- dark and light themes must both be production-grade
- the entire shipped UI must be translated, including auth, admin, legal, consent, empty, error, loading, and degraded states
- monetization modules must feel integrated instead of bolted onto the product shell

## Compliance and Regulatory Frame

Betting-adjacent surfaces are informational only. The app is not a sportsbook and must not behave like one.

Required guardrails:

- explicit geo-aware behavior for regulated surfaces
- explicit age gating for betting-adjacent or affiliate CTA surfaces
- legal and consent copy on monetized and regulated surfaces
- region-aware bookmaker and messaging copy
- UX patterns that preserve clarity and do not hide the informational-only nature of odds or predictions

## Locked Go-To-Market Geos

The target launch and monetization design geos are:

- Uganda
- Kenya
- Nigeria

Later phases must assume bookmaker selection, affiliate copy, consent flows, legal disclosures, and funnel messaging are geo-aware for those markets first.

## Locked Technical Stack

The approved stack for this product direction is:

- Next.js App Router
- JavaScript
- Prisma
- MySQL
- Styled Components
- Redux Toolkit
- i18n routing and translation dictionaries

Implementation note:

- the repository may still contain transitional styling patterns from earlier groundwork
- later phases should align execution to the approved stack without changing the scope contract defined here

## Provider Strategy Lock

The public product, domain model, and sync orchestration must stay provider-agnostic.

Required guardrails:

- the active sports feed must be switchable through environment configuration
- provider changes must not require product rewrites
- provider-specific assumptions must stay inside adapters, normalization, and sync boundaries
- public routes, page types, analytics, monetization modules, and translation behavior must remain stable across provider swaps
- SportsMonks is the current initial football adapter, not a permanent product-level lock

## Locked User Roles

The operating roles in scope are:

- guest
- registered user
- editor
- admin

## Explicit Non-Goals

The following directions are out of scope and should not be reintroduced without an approved change request:

- marketplace experiences
- creator economy tooling
- paid subscriptions or premium membership gating
- user-generated community posting or threads
- fantasy products
- betting-slip execution or operator flows
- native mobile apps as a substitute for the web parity baseline

## Acceptance Definition For Later Phases

Phase 001 is considered satisfied in the repository when:

- later phase plans inherit this file as the scope baseline
- product, revenue, UX, compliance, geo, and provider-flexibility assumptions are explicit
- removed features and non-goals are documented clearly enough to prevent roadmap drift
- implementation work can be reviewed against this file without needing to reinterpret `app-write-up.md`

## Change Control

Any change to this scope must record:

1. a concise description of the proposed scope change
2. the impacted files in `dev-plan/`, `docs/`, or runtime code
3. product, engineering, legal, revenue, or geo implications
4. explicit approval before implementation proceeds

Until a change request is approved, this file remains the operative scope baseline.

## Sign-Off Record

- Status: active repository sign-off baseline
- Version: 3.0
- Last updated: 2026-03-24
- Formal approver names may be recorded below when needed for external process tracking:
  - Product Owner: __________________  Date: ______________
  - Tech Lead: ______________________  Date: ______________
  - Engineering Lead: ________________  Date: ______________
  - Operations Lead: _________________  Date: ______________
