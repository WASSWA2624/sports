# 004-auth

## Goal
Ship authentication, RBAC, and protected route policy.

## Build
1. Implement email/password auth and session lifecycle.
2. Add optional social auth hooks (can be disabled via env in MVP).
3. Enforce RBAC middleware for user/creator/moderator/admin endpoints.
4. Implement profile page with preferences and locale/theme settings.
5. Add step-up verification for sensitive actions (payout/profile-security/admin actions).
6. Log auth-sensitive events to AuditLog.

## Done When
- Users can sign up/login/logout reliably.
- Protected APIs reject unauthorized roles.
- Security-sensitive actions require re-auth as specified.
