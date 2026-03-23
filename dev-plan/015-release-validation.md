# 015-release-validation

## Goal
Validate the full Flashscore-style web experience before production launch.

## Build
1. Run the full automated suite: unit, integration, API contract, and end-to-end tests.
2. Execute regression coverage for scores board, news, competition pages, standings, team pages, match center, favorites, search, and admin.
3. Run live-update and degraded-provider scenarios to verify stale markers, retries, and fallback UX.
4. Run non-functional validation for accessibility, SEO, localization, responsive behavior, and performance.
5. Verify consent, ad-slot, and odds-gating behavior across supported locales and user states.
6. Publish a release test report with issues, fixes, known limitations, and final sign-off.

## Done When
- All critical product flows pass.
- No blocker or high-severity defects remain.
- Signed release validation is stored in repo docs.
