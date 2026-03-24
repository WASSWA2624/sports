# 001-parity-scope

## Goal
Lock the app to the full Flashscore-style public web target defined in `app-write-up.md`, including the monetization and conversion systems.

## Build
1. Freeze the north star as one-to-one parity with the public Flashscore web experience observed on March 23, 2026, plus the monetization, funnel, and analytics layers defined in `app-write-up.md`.
2. Confirm the product is a live scores, sports news, odds insight, prediction, and affiliate-conversion platform, not a marketplace, creator tool, subscription product, or community app.
3. Lock core parity surfaces: shell, scores board, sport/country/competition/team/match pages, news, favorites, search, odds, predictions, ads, affiliate CTAs, and Telegram/WhatsApp funnel entry points.
4. Lock the compliance frame: informational-only betting-adjacent content, explicit region and age gating, and legal copy requirements for regulated surfaces.
5. Lock the target go-to-market geos as Uganda, Kenya, and Nigeria so later phases can design geo-aware bookmaker, copy, and funnel behavior correctly.
6. Lock the technical stack: Next.js App Router, JavaScript, Prisma, MySQL, Styled Components, Redux Toolkit, and i18n.
7. Publish and approve the parity sign-off document in `docs/mvp-scope.md` so every later phase inherits the same product and revenue assumptions.

## Done When
- Scope explicitly targets Flashscore-style product parity plus the monetization model in `app-write-up.md`.
- Removed features and non-goals are clearly documented.
- Team has one approved source of truth for both product and revenue scope.
