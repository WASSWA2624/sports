# 004-auth-preferences-favorites

## Goal
Remove auth, preferences, and favorites from the MVP critical path and keep the product fully usable without accounts.

## Build
1. Treat sign-up, login, profile, onboarding, favorites sync, and account-backed settings as out of scope for the minimal site.
2. Ensure homepage, match detail, and competition pages remain fully usable for anonymous visitors with no blocked actions.
3. Keep any state the MVP needs lightweight and anonymous, such as selected date or filter state in the URL or local UI state.
4. Remove roadmap assumptions that require users to save teams, receive alerts, or own personalized match surfaces before release.
5. If auth or preference code already exists in the repo, keep it isolated so it does not block the scores product or complicate validation.
6. Document favorites, alerts, and account personalization as future options rather than active MVP commitments.

## Done When
- No shipped MVP flow depends on login or account storage.
- Anonymous browsing is the default and complete experience.
- Favorites and account-backed preferences are clearly deferred instead of partially planned.
