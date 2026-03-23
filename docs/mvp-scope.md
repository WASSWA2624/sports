# Parity Scope Sign-Off (Phase 001)

## Purpose

This document locks the implementation scope for the sports app and acts as the single source of truth for Flashscore-style web parity work.

## Reference Target

- Public reference: `https://www.flashscore.com/`
- Parity target date: March 23, 2026
- Interpretation: match the public web experience's structure, layout density, navigation, and feature model while using our own branding, legal copy, and licensed data

## In Scope

- Global shell with `Scores` and `News`
- Horizontal sport navigation plus `More`
- Left rail with pinned leagues, my teams, and countries
- Daily scores board with `All`, `LIVE`, `Finished`, and `Scheduled`
- Date navigation on score boards
- Competition pages: summary, odds, news, results, fixtures, standings, archive
- Match pages: summary, stats, lineups, H2H, standings context, TV info, related media when available
- Team pages
- Search baseline
- Favorites and alert preferences
- Login and account sync for favorites
- News landing and article pages
- Odds surfaces where licensed
- Ad-slot and consent foundation
- Responsive and SEO-ready public routes

## Out of Scope

- Creator marketplace
- Paid betting slips
- User-generated posts or community threads
- Premium content subscriptions
- Fantasy mechanics
- Native mobile apps
- Full bespoke social layer

## Architecture Lock

- Frontend/backend framework: Next.js App Router
- Language: JavaScript
- Database access: Prisma ORM
- Database: MySQL
- Styling: Styled Components
- Client state: Redux Toolkit
- Localization: i18n routing and translation dictionaries
- Data ingestion: provider abstraction with SportsMonks as an initial football adapter, not a permanent single-provider assumption

## User Roles Lock

- Guest
- Registered User
- Editor
- Admin

## Quality Bar for Phase Completion

- Flashscore-style parity goals are explicit enough to guide every later phase
- Old marketplace and community features are clearly removed from active scope
- Route, data, and UI expectations are specific enough for design and engineering sign-off

## Change Control

Any scope change must include:

1. Change request description
2. Impacted phase files in `dev-plan/*`
3. Timeline or complexity impact
4. Explicit approval before implementation

## Sign-Off

- Product Owner: __________________  Date: ______________
- Tech Lead: ______________________  Date: ______________
- Engineering Lead: ________________  Date: ______________
- Operations Lead: _________________  Date: ______________

Status: Pending sign-off
Version: 2.0
Last Updated: 2026-03-23
