# 004-auth-preferences-favorites

## Goal
Ship login, preferences, and favorites sync for Flashscore-style personalization.

## Build
1. Implement email/password auth and session lifecycle with optional social hooks behind env flags.
2. Support guest-local favorites plus account-backed sync for matches, teams, and competitions.
3. Add settings for locale, timezone, favorite sports, alert preferences, and theme.
4. Protect editor and admin routes with role-aware middleware.
5. Add audit logging for account-sensitive actions and admin sign-in events.
6. Support favorite and alert actions from any core page without breaking anonymous browsing.

## Done When
- Users can sign up, log in, and keep favorites across sessions.
- Guests can still browse everything without forced auth.
- Protected editor and admin routes reject unauthorized access.
