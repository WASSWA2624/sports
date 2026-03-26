# MVP Scope Sign-Off (Phase 001)

## Purpose

This document freezes the active product scope for the app and is the repository source of truth for the shipped MVP boundary.

Phase 001 is a scope lock, not a claim that every surface is already implemented. Later phases must execute against this contract unless an approved change request updates it.

## Repository Status

- Scope state: frozen for implementation
- Source-of-truth status: active
- Canonical references:
  - `app-write-up.md` for the product brief
  - `dev-plan/001-parity-scope.md` for phase acceptance criteria
  - this file for the approved implementation boundary inherited by later phases
- Effective date: 2026-03-26
- Reference parity snapshot: public FotMob web experience observed on 2026-03-26

## North Star

Build a minimal FotMob-style public web product for soccer matches and results, with fast browsing, dense but clear score presentation, and low-friction navigation between the homepage, competition pages, and match pages.

The product is explicitly a:

- soccer live scores and results product
- public, read-only web experience
- match-first browsing experience

The product is explicitly not a:

- broad sports portal
- news product
- betting or odds product
- monetization or funnel product
- auth or personalization product
- social or community product

## Locked Product Definition

The app must be treated as a minimal soccer data product whose primary goals are:

- fast live score consumption
- easy browsing of scheduled, live, and finished soccer matches
- clear competition-grouped navigation
- lightweight match pages that explain results quickly
- reliable public access on mobile and desktop without login

## In-Scope MVP Surfaces

The following surfaces are locked into scope for the soccer-only MVP:

- shared public shell with brand, date navigation, and state filters
- dense daily scores board with `All`, `LIVE`, `Finished`, and `Scheduled`
- competition-grouped match lists
- competition pages for fixtures and results
- minimal match detail pages
- public health and degraded-data states

## Locked Page Depth

Later phases should assume the following depth and no more unless scope changes are approved:

- homepage with date navigation, state filters, competition sections, and compact match rows
- competition pages with a header plus fixtures or results for the selected date, round, or matchday
- match pages with teams, score, kickoff time, status, and essential event timeline

## UX Quality Bar

All later phases must satisfy the following quality bar:

- mobile-first design is the default
- the UI is responsive across phones, tablets, laptops, and desktops
- primary actions should complete in 1 to 2 clicks or taps wherever realistic
- the product must feel fast on dense score pages
- layouts should stay compact, readable, and scanable
- empty, error, stale, and degraded states must remain clear

## Provider Strategy Lock

The public product, domain model, and sync orchestration must stay provider-agnostic within the soccer-only scope.

Required guardrails:

- the active soccer feed must be switchable through environment configuration
- provider changes must not require product rewrites
- provider-specific assumptions must stay inside adapters, normalization, and sync boundaries
- public routes and page behavior must remain stable across supported provider swaps
- SportsMonks is the current initial soccer adapter, not a permanent product-level lock

## Locked User Scope

The only user-facing role in scope is:

- guest

Internal operator tooling may exist for sync and production health, but it is not a user-facing product pillar for MVP.

## Explicit Non-Goals

The following directions are out of scope and should not be reintroduced without an approved change request:

- coverage for sports other than soccer
- news and editorial content
- odds, bookmakers, affiliate links, or betting funnels
- ads and sponsorship placements
- login, profiles, favorites, alerts, or personalization flows
- search as a release-blocking requirement
- comments, chat, community posting, or social features
- native mobile apps as a substitute for the web MVP

## Acceptance Definition For Later Phases

Phase 001 is considered satisfied in the repository when:

- later phase plans inherit this file as the scope baseline
- the MVP surface area is explicit and narrow
- removed features and non-goals are documented clearly enough to prevent roadmap drift
- implementation work can be reviewed against this file without reinterpreting the product direction

## Change Control

Any change to this scope must record:

1. a concise description of the proposed scope change
2. the impacted files in `dev-plan/`, `docs/`, or runtime code
3. product and engineering implications
4. explicit approval before implementation proceeds

Until a change request is approved, this file remains the operative scope baseline.

## Sign-Off Record

- Status: active repository sign-off baseline
- Version: 4.0
- Last updated: 2026-03-26
- Formal approver names may be recorded below when needed for external process tracking:
  - Product Owner: __________________  Date: ______________
  - Tech Lead: ______________________  Date: ______________
  - Engineering Lead: ________________  Date: ______________
  - Operations Lead: _________________  Date: ______________
