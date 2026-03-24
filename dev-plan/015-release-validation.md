# 015-release-validation

## Goal
Validate the full Flashscore-style web experience and monetization stack before production launch.

## Build
1. Run the full automated suite: unit, integration, API contract, and end-to-end tests.
2. Execute regression coverage for scores board, news, competition pages, standings, team pages, match center, favorites, search, admin, odds, predictions, affiliate CTAs, and funnel entry points.
3. Run live-update and degraded-provider scenarios to verify stale markers, retries, and fallback UX.
4. Run non-functional validation for accessibility, SEO, localization, responsive behavior, performance, and outbound CTA integrity.
5. Verify consent, ad-slot, odds-gating, region-targeting, affiliate-link routing, and analytics-event behavior across supported locales, geos, and user states.
6. Publish a release test report with issues, fixes, known limitations, and final sign-off.

## Done When
- All critical product and revenue flows pass.
- No blocker or high-severity defects remain.
- Signed release validation is stored in repo docs.
