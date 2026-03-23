# Remediation Sequence For Phases 001-007

## Objective

Bring the implementation into direct alignment with `app-write-up.md` and the renamed phase plans for `001` through `007`.

## Execution Order

### Phase 001: Parity Scope

1. Remove marketplace, creator, payout, and community leftovers from routes, seed data, and schema.
2. Standardize active product roles to `USER`, `EDITOR`, and `ADMIN`.
3. Keep `docs/mvp-scope.md` as the source of truth for scope decisions.

### Phase 002: Platform Setup

1. Align the runtime stack with the approved baseline by wiring Styled Components and Redux Toolkit into the app shell.
2. Refresh `.env.example` for live-scores concerns such as news, search, analytics, ads, consent, and notifications.
3. Keep CI quality gates on lint, test, and build.

### Phase 003: Core Data Model

1. Preserve the working read-model entities already used by the app.
2. Add canonical live-scores entities for sport taxonomy, participants, fixture detail, editorial content, favorites, notifications, recents, and source providers.
3. Remove schema models that belong to the retired marketplace/community direction.

### Phase 004: Auth, Preferences, Favorites

1. Keep email/password auth as the primary login flow.
2. Expand account-backed preferences to include locale, theme, timezone, favorite sports, and alert settings.
3. Introduce synchronized favorites for matches, teams, and competitions, with guest-local fallback and merge-on-login behavior.
4. Add editor and admin protection patterns that match the approved roles.

### Phase 005: Provider Sync Pipeline

1. Replace the single hard-coded provider factory with a registry-based abstraction.
2. Keep SportsMonks as the initial football adapter while defining the required provider surface for taxonomy, fixtures, live states, standings, odds, news, and media metadata.
3. Write canonical taxonomy metadata during sync so later multi-sport work does not require a rewrite.

### Phase 006: Shell And Navigation UI

1. Reshape the shell around a Flashscore-style structure:
   - top-level `Scores` / `News`
   - sports strip
   - left rail
   - center content
   - right rail placeholders
2. Add login/profile entry, search trigger, consent placeholder, and ad-slot placeholders.
3. Surface pinned competitions, saved teams, and country browsing in the shell.

### Phase 007: Live Scores Board

1. Add date navigation to the live board.
2. Group fixtures by country and competition.
3. Add collapse/expand sections and competition pin controls.
4. Enrich compact rows with incident indicators and explicit stale/degraded states.
5. Keep refresh windows and result freeze behavior for live and completed fixtures.

## Acceptance Sweep

1. Run `npm run test`
2. Run `npm run lint`
3. Run `npm run build`
4. Review remaining gaps against `docs/mvp-scope.md` and `dev-plan/001-007`
