# 001-parity-scope

## Goal
Lock the app to the minimal FotMob-style matches and results scope defined in `app-write-up.md`.

## Build
1. Freeze the north star as a public, read-only soccer matches and results site modeled on the FotMob web experience observed on March 26, 2026.
2. Lock the MVP surfaces to the homepage scores board, date navigation, `All` or `LIVE` or `Finished` or `Scheduled` filters, competition-grouped match lists, minimal match detail pages, and competition fixtures or results pages.
3. Confirm the product is not a broad sports portal. News, odds, betting funnels, ads, auth, favorites, alerts, social features, community prediction surfaces, and coverage for other sports are out of MVP scope.
4. Lock the UX bar around speed, scanability, dense but clear match rows, mobile-first layouts, and primary actions completed in 1 to 2 interactions.
5. Lock the data focus to soccer fixtures, live states, final results, and essential match events only.
6. Keep the technical stack grounded in the current repo: Next.js App Router, Prisma, MySQL, and provider-driven sync jobs.
7. Keep the domain model provider-agnostic so supported feed changes remain env-driven instead of requiring product rewrites.
8. Treat `app-write-up.md` as the source of truth for scope and keep later phases aligned to that narrower product.

## Done When
- The team has one clear definition of the product: a minimal matches and results site.
- All later plan files assume the same reduced scope.
- Removed features are explicitly marked as out of MVP rather than implied or left ambiguous.
