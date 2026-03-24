# 001-parity-scope

## Goal
Lock the app to the full Flashscore-style public web target defined in `app-write-up.md`, including monetization, conversion, and bounded community-retention systems.

## Build
1. Freeze the north star as one-to-one parity with the public Flashscore web experience observed on March 23, 2026, plus the monetization, funnel, analytics, and community-retention layers defined in `app-write-up.md`.
2. Confirm the product is a live scores, sports news, odds insight, prediction, affiliate-conversion, and bounded community-prediction platform, not a marketplace, creator payout tool, subscription product, or open social network.
3. Lock core parity surfaces: shell, scores board, sport/country/competition/team/match pages, news, favorites, search, odds, predictions, community slips or predictor-history modules, ads, affiliate CTAs, and Telegram/WhatsApp funnel entry points.
4. Lock the UX quality bar: mobile-first, 100% responsive, fast, easy to use, primary actions completed in 1 to 2 clicks or taps, strong dark and light themes, and 100% translation across the whole UI.
5. Lock the compliance frame: informational-only betting-adjacent content, explicit region and age gating, and legal copy requirements for regulated surfaces.
6. Lock the target go-to-market geos as Uganda, Kenya, and Nigeria so later phases can design geo-aware bookmaker, copy, and funnel behavior correctly.
7. Lock the technical stack: Next.js App Router, JavaScript, Prisma, MySQL, CSS Modules plus selective Styled Components, Redux Toolkit, and i18n.
8. Lock the provider strategy: the public product and domain layer must stay provider-agnostic so the active sports feed can be switched through env configuration instead of feature rewrites.
9. Publish and approve the parity sign-off document in `docs/mvp-scope.md` so every later phase inherits the same product, revenue, UX, and provider-flexibility assumptions.

## Done When
- Scope explicitly targets Flashscore-style product parity plus the monetization model in `app-write-up.md`.
- Removed features, bounded community scope, and non-goals are clearly documented.
- Team has one approved source of truth for product, revenue, UX quality, and provider-flexibility scope.
