# Handoff Walkthrough Packet

- Date: March 24, 2026
- Scope: structured walkthroughs for engineering, product, editorial, and operations owners

## Required Pre-Reads

- `docs/handoff-technical-2026-03-24.md`
- `docs/handoff-operations-2026-03-24.md`
- `docs/handoff-roadmap-2026-03-24.md`
- `docs/handoff-maintenance-2026-03-24.md`
- `docs/baseline-metrics-2026-03-24.md`
- `docs/production-release-runbook.md`

## Walkthrough Schedule

| Audience | Duration | Lead | Outcome |
| --- | --- | --- | --- |
| Engineering | 60 min | engineering owner | architecture, provider contract, sync flow, release tooling, baseline archive process understood |
| Product | 45 min | product owner | next parity roadmap and acceptance priorities agreed |
| Editorial | 45 min | editorial owner | publishing, correction, and takedown workflow signed off |
| Operations | 45 min | operations owner | incident response, drills, stale-data triage, and release watch responsibilities clear |

## Engineering Walkthrough

Cover:

1. route map and read-model boundaries
2. Prisma domain layout
3. provider registry and sync job lifecycle
4. cache tags, revalidation flow, and degraded-read behavior
5. release artifact, preflight, smoke, and baseline archive commands

Engineering sign-off questions:

- can a new engineer trace a public page from route to read model to Prisma data?
- can the data/feed owner explain when each sync job should run?
- can the release owner produce an artifact and rollback plan without tribal knowledge?

## Product Walkthrough

Cover:

1. current parity state versus target
2. P0 and P1 roadmap ordering
3. additional sports activation sequence
4. metrics that should drive roadmap reprioritization

Product sign-off questions:

- is the next milestone clearly prioritized?
- are parity gaps separated from future invention work?
- is every unresolved gap assigned to an owner lane?

## Editorial Walkthrough

Cover:

1. newsroom entry points and role requirements
2. draft, publish, archive, and entity-link workflow
3. homepage and module placement expectations
4. takedown and correction handling
5. issue creation path for broken content

Editorial sign-off questions:

- can editors publish and correct content without engineering help?
- is the takedown path documented and testable?
- are linked team, competition, and fixture surfaces easy to verify after publish?

## Operations Walkthrough

Cover:

1. `/api/health` and admin control room fields
2. provider outage, stale-data, search, and cache drill scenarios
3. escalation and containment levers
4. release first-hour watch expectations
5. evidence preservation requirements

Operations sign-off questions:

- can the on-call owner tell the difference between stale data and a cache issue?
- are the first three containment actions obvious for a provider outage?
- is the rollback threshold documented well enough for a night or weekend incident?

## Sign-Off Template

Capture these after each session:

| Walkthrough | Date | Owner | Status | Follow-ups |
| --- | --- | --- | --- | --- |
| Engineering | TBD | engineering owner | pending | fill during session |
| Product | TBD | product owner | pending | fill during session |
| Editorial | TBD | editorial owner | pending | fill during session |
| Operations | TBD | operations owner | pending | fill during session |

The walkthrough phase is complete only when every row above is updated and any follow-up issue has a named owner.
