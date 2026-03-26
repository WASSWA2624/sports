# Sports App

Minimal football scores web app built with Next.js App Router.

The shipped product is intentionally database-free. The public experience runs from the in-repo match data layer and does not require Prisma, MySQL, migrations, or seed steps.

## Scope Source Of Truth

The active product contract is locked in [docs/mvp-scope.md](docs/mvp-scope.md).

## Quick Start

Install dependencies and start the app:

```bash
npm ci
npm run dev
```

Optional Docker path:

```bash
docker compose up --build
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

## Runtime Notes

- The public UI only covers football scores, fixtures, results, tables, leagues, and match detail.
- Provider credentials in `.env` are optional for the shipped public routes.
- Asset host settings still live in `.env` for remote logos and media.

## Docs

- `docs/mvp-scope.md`
- `docs/handoff-roadmap-2026-03-24.md`
