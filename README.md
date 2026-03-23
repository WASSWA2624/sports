# Sports App

Baseline Next.js App Router project for the sports platform roadmap.

## Quick Start

1. Install dependencies:
```bash
npm ci
```
2. Copy environment template and edit values:
```bash
copy .env.example .env
```
3. Run development server:
```bash
npm run dev
```

Optional nodemon wrapper:
```bash
npm run dev:nodemon
```

App URL: [http://localhost:3000](http://localhost:3000)  
Health endpoint: [http://localhost:3000/api/health](http://localhost:3000/api/health)

## Quality Gates

```bash
npm run lint
npm run test
npm run build
```

## Sync Jobs

Configure SportsMonks credentials and tracked IDs in `.env`, then trigger the admin sync endpoint for one of the registered buckets: `static-ish`, `daily`, or `high-frequency`.

Admin-triggered sync endpoint: `POST /api/admin/sync/[job]`

## Database (Prisma + MySQL)

```bash
npm run db:generate
npm run db:migrate
```

Set `DATABASE_URL` in `.env` before running DB commands.
