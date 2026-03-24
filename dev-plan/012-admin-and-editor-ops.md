# 012-admin-and-editor-ops

## Goal
Deliver editorial, monetization, and operational control for a live scores platform.

## Build
1. Build admin modules for users, providers, sync jobs, feature flags, ad slots, consent text, affiliate partners, bookmaker mappings, funnel destinations, and geo-targeted CTA configuration.
2. Build editor tools for article management, article-to-entity linking, homepage news curation, sponsored labels, and any prediction or promo copy that needs staff review.
3. Build operations dashboards for sync lag, failed jobs, stale data, cache health, route error spikes, ad readiness, affiliate or conversion signal health, provider chain readiness, and adapter-family implementation status.
4. Add role-based admin APIs with immutable audit trails for editorial, operational, and monetization-sensitive actions.
5. Add emergency controls to disable a provider, hide an odds or prediction surface, pause an affiliate CTA, or remove a broken module without redeploying.
6. Expose enough provider metadata in control-plane views for operators to understand selected-provider code, fallback chain, supported capabilities, and when a cataloged provider is not yet implemented.
7. Add issue-triage workflows for data disputes, wrong scores, broken article content, broken affiliate destinations, provider-switch incidents, and compliance incidents.

## Done When
- Editors can manage news and sponsored or monetized placements safely.
- Admins can observe live platform health and act quickly across product and revenue surfaces.
- Critical control-plane actions are traceable.
- Provider-switch and provider-readiness issues are visible before they become production incidents.
