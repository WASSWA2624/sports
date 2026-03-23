# 015-test

## Goal
Validate the complete product before production launch.

## Build
1. Run full automated suite: unit, integration, API contract, and end-to-end tests.
2. Execute role-based test matrix for guest, user, creator, moderator, and admin.
3. Run non-functional validation: performance, security checks, accessibility, SEO, and localization.
4. Verify marketplace flows end-to-end: paid slip purchase, access unlock, refund path, payout request.
5. Run sync reliability tests under degraded provider conditions and confirm graceful fallback UX.
6. Produce a release test report with failed cases, fixes, and final sign-off.

## Done When
- All critical tests pass.
- No blocker/high-severity defects remain.
- Signed release report is stored in repo/docs.
