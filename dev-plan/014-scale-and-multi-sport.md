# 014-scale-and-multi-sport

## Goal
Harden the platform for real-time load, multi-sport expansion, and reliable monetization surfaces.

## Build
1. Add advanced caching and queue backpressure controls for live match windows and high-traffic odds or prediction modules.
2. Add observability dashboards for latency, sync lag, stale data rates, cache hit rates, page errors, and affiliate or analytics pipeline health.
3. Add provider expansion patterns for additional sports, specialized odds feeds, and backup feeds, with env-driven activation through `SPORTS_DATA_PROVIDER` and provider namespaces.
4. Distinguish cataloged providers from implemented adapter families so release tooling and operators can block unsafe source switches early.
5. Add asset, image, and CDN strategy for logos, competition marks, article media, bookmaker badges, and sponsored creative assets, including remote host updates through env configuration.
6. Run failure drills for provider outage, delayed live feed, search degradation, cache invalidation issues, and broken affiliate or funnel endpoints.
7. Document SLOs and operational playbooks for peak traffic windows, including what to disable first when a revenue surface threatens core live-score performance.

## Done When
- The app can handle peak live traffic reliably.
- Multi-sport and multi-feed expansion is technically prepared, and supported provider swaps are operationally driven by env plus release validation instead of code edits.
- Operations have tested runbooks for the main failure modes across both product and monetization surfaces.
- Unsupported provider selections are caught by tooling and operational visibility before promotion.
