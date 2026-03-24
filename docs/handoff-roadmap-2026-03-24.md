# Parity Roadmap And Backlog

- Date: March 24, 2026
- Reference target: Flashscore-style public web parity as defined in `app-write-up.md`
- Scope: post-handoff roadmap for the next parity cycle

## Prioritized Roadmap

### P0: Highest-Value Parity Gaps

| Item | Why it matters | Current gap | Owner |
| --- | --- | --- | --- |
| Deep match center tabs | match center is the highest-frequency parity surface | schema supports incidents, lineups, statistics, H2H snapshots, officials, and venue data, but the UI does not yet expose full Flashscore-style depth | engineering |
| Denser shell navigation | reference product depends on pinned leagues, my teams, and richer left-rail discovery | current shell is functional but simplified compared with target density | engineering + product |
| Competition-hub parity | competition pages need stronger archive, tab density, and season navigation | summary, standings, fixtures, results, and odds are present, but archive richness and module depth are still light | engineering |
| Backup-feed activation | production parity requires resilient live coverage | backup provider slot exists but is not connected | engineering + data/feed |
| Asset coverage and localization polish | parity depends on polished public pages, not just raw data | logo/article coverage and some non-English editorial/admin strings still need follow-through | editorial + engineering |

### P1: Additional Sports

| Item | Why it matters | Exit criteria |
| --- | --- | --- |
| Basketball rollout | provider slot is already prepared | normalization, seed data, read models, smoke coverage, and admin visibility are complete |
| Tennis rollout | provider slot is already prepared | normalization, route coverage, and search support are complete |
| Expanded sport strip | public shell should reflect multi-sport breadth | visible navigation, sport hubs, and country pages exist for enabled sports |

### P1: Deeper Match Data

| Item | Gap |
| --- | --- |
| Lineups and formations | stored in schema but not yet presented as a full match-center tab |
| Stats density | stored data can support richer grouped stats, period filters, and comparisons |
| H2H and standings context | schema includes `H2HSnapshot` and standings, but presentation is still partial |
| Match metadata | referee, venue, capacity, and official context are not surfaced consistently |
| Video and media hooks | route structure anticipates parity, but video/highlight surfaces are not operational |

### P1: Richer Alerts

| Item | Gap |
| --- | --- |
| Delivery channels | subscriptions are stored, but no push, email, or webhook delivery pipeline is wired |
| Additional trigger types | current alert types cover kickoff, goal, card, period change, and final result only |
| Alert management UX | no digest, snooze, quiet-hours, or pre-match reminder controls |
| Editorial/news alerts | schema allows `NEWS`, but the public alert workflow does not yet expose it |

## Sequencing Recommendation

1. Finish football parity where data is already modeled but underexposed.
2. Connect a real backup feed before broadening sport count.
3. Land basketball as the first expansion sport because the provider slot already exists.
4. Add delivery infrastructure for alerts only after match data and provider resiliency are stronger.
5. Use each sport rollout to tighten search, SEO, and smoke coverage rather than treating them as follow-up work.

## Notable Reference Gaps To Track

- shell density is still lighter than the reference target
- match center lacks full tab parity
- competition archive history is thinner than the target
- sport breadth is prepared architecturally but not yet enabled operationally
- backup feed readiness is architectural, not production-real
- alerting is preference-complete but delivery-incomplete

## Suggested Next Milestone

The next milestone should be:

`Football parity depth + backup feed readiness`

Recommended deliverables:

1. full match center depth
2. richer competition archive and summary modules
3. connected failover provider or documented manual failover path
4. refreshed smoke and baseline metrics after those changes ship
