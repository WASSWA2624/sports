# 015-release-validation

## Goal
Validate the full Flashscore-style web experience and monetization stack before production launch.

## Build
1. Run the full automated suite: unit, integration, API contract, and end-to-end tests.
2. Execute regression coverage for scores board, news, competition pages, standings, team pages, match center, favorites, search, admin, odds, predictions, affiliate CTAs, and funnel entry points.
3. Run live-update and degraded-provider scenarios to verify stale markers, retries, fallback UX, active-provider switching through env configuration, and clear errors for unimplemented provider families.
4. Run non-functional validation for accessibility, SEO, localization, responsive behavior, performance, and outbound CTA integrity.
5. Verify consent, ad-slot, odds-gating, region-targeting, affiliate-link routing, analytics-event behavior, and asset host configuration across supported locales, geos, user states, and provider selections.
6. Publish a release test report with issues, fixes, known limitations, and final sign-off.

## Done When
- All critical product and revenue flows pass.
- No blocker or high-severity defects remain.
- Signed release validation is stored in repo docs.
- Release tooling blocks unsupported provider selections before production promotion.
