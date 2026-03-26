# 015-release-validation

## Goal
Validate the minimal matches and results experience before production launch.

## Build
1. Run the automated suite that matters for the shipped routes: homepage board, match detail pages, competition pages, provider sync, and health checks.
2. Execute regression coverage for date navigation, state filtering, live updates, final-result stability, and degraded-provider behavior.
3. Run responsive and accessibility checks for the public scores surfaces on representative mobile and desktop layouts.
4. Verify that primary user actions such as changing date, switching state, opening a match, and opening a competition can be completed in 1 to 2 interactions.
5. Validate provider readiness, credential alignment, and asset-host configuration before promotion.
6. Publish a release validation report with issues, fixes, known limitations, and explicit sign-off for the narrowed scope.

## Done When
- All critical homepage, match, and competition flows pass.
- No blocker or high-severity defects remain on the shipped surfaces.
- Unsupported or removed product areas are not part of release gating.
- Signed release validation is stored in repo docs.
