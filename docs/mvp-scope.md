# MVP Scope Sign-Off (Phase 001)

## Purpose
This document locks the implementation scope for the sports app MVP and acts as the single source of truth for Phase 001 execution.

## In Scope (MVP Must-Have)
- Authentication (signup/login/logout/session)
- Football live matches
- Fixtures, results, and tables
- Match detail pages
- Odds display (core markets only)
- Community insights (create/read/basic engagement)
- Basic betting slip builder
- Paid creator content (marketplace baseline)
- Admin and moderation baseline
- Responsive UI foundation
- Internationalization foundation
- Light/dark theme foundation

## Out of Scope (Post-MVP)
- AI-assisted recommendations
- Multi-sport expansion
- Native mobile apps
- Deep historical analytics
- Advanced creator scoring beyond baseline trust signals

## Architecture Lock (MVP)
- Frontend/Backend framework: Next.js App Router
- Language: JavaScript
- Database access: Prisma ORM
- Database: MySQL
- Styling: Styled Components
- Client state: Redux Toolkit
- Localization: i18n routing + translation dictionaries

## User Roles Lock
- Guest
- Registered User
- Creator
- Moderator
- Admin

## Quality Bar for Phase Completion
- MVP in-scope and out-of-scope items are unambiguous.
- Stack and role model are explicitly locked and referenced by later phases.
- Any new feature request not listed in MVP is deferred to post-MVP unless formally approved.

## Change Control
Any scope change must include:
1. Change request description
2. Impacted phase files (`dev-plan/*`)
3. Timeline/cost impact
4. Explicit approval before implementation

## Sign-Off
- Product Owner: __________________  Date: ______________
- Tech Lead: ______________________  Date: ______________
- Engineering Lead: ________________  Date: ______________
- Operations/Moderation Lead: ______  Date: ______________

Status: Pending sign-off (re-executed)
Version: 1.1
Last Updated: 2026-03-21
