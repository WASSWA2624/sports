# 012-admin

## Goal
Deliver moderation and admin operations baseline.

## Build
1. Build admin modules for users, reports, moderation actions, feature flags.
2. Build moderator console for queue triage and action history.
3. Build operations dashboard: sync status, failed jobs, cache health, spikes, purchase anomalies.
4. Add role-based admin APIs and immutable audit trails.
5. Add emergency controls (feature flag kill-switches, rate-limit tightening).

## Done When
- Moderators can handle reports at scale.
- Admins can observe platform health and act safely.
- All critical actions are traceable.
