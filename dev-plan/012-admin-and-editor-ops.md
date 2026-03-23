# 012-admin-and-editor-ops

## Goal
Deliver editorial and operational control for a live scores platform.

## Build
1. Build admin modules for users, providers, sync jobs, feature flags, ad slots, and consent text.
2. Build editor tools for article management, article-to-entity linking, and homepage news curation.
3. Build operations dashboards for sync lag, failed jobs, stale data, cache health, and route error spikes.
4. Add role-based admin APIs with immutable audit trails.
5. Add emergency controls to disable a provider, hide an odds surface, or remove a broken module without redeploying.
6. Add issue triage workflows for data disputes, wrong scores, and broken article content.

## Done When
- Editors can manage news safely.
- Admins can observe live platform health and act quickly.
- Critical control-plane actions are traceable.
