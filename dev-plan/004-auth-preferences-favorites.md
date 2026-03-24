# 004-auth-preferences-favorites

## Goal
Ship auth, preferences, onboarding, favorites sync, and account-backed community prediction ownership for Flashscore-style personalization and retention.

## Build
1. Implement email/password auth and session lifecycle with optional social hooks behind env flags.
2. Support guest-local favorites plus account-backed sync for matches, teams, and competitions.
3. Add onboarding and settings for locale, timezone, favorite sports, alert preferences, theme, and consent-aware opt-ins for reminder or funnel prompts where legally allowed.
4. Add geo-aware user preferences for region-sensitive bookmakers, regulated copy, and territory-driven CTA behavior without blocking anonymous browsing.
5. Protect editor and admin routes with role-aware middleware and step-up flows for sensitive control-plane actions.
6. Add audit logging for account-sensitive actions, admin sign-in events, and preference changes that affect regulated or monetized surfaces.
7. Support favorite, alert, community-slip, and retention prompts from any core page without forcing login before the user can browse the product.
8. Ensure auth, onboarding, settings, and theme or locale switches are mobile-first, fully translated, responsive, and achievable in 1 to 2 taps for common actions.

## Done When
- Users can sign up, log in, keep favorites across sessions, and own saved or published community slips across sessions.
- Guests can still browse everything without forced auth.
- Protected editor and admin routes reject unauthorized access.
- Preference and onboarding data can personalize both product and compliant CTA behavior.
- Account and settings flows remain fast, fully translated, and easy to use on mobile and desktop.
