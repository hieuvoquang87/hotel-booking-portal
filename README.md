# Hotel Booking Portal

Phase 1 — hotel discovery interface. Pick a destination → browse/filter/sort
hotels → open a hotel → check room availability for dates.

> Spec-driven. Full architecture in [`docs/architecture.md`](docs/architecture.md);
> milestone status in [`docs/progress.md`](docs/progress.md). State management and
> component breakdown are summarized at the end of this file.

## Prerequisites

- Node.js 22+ and npm 11+

## Install

```bash
npm install
npx playwright install chromium   # one-time, for E2E tests
```

## Run locally

```bash
npm run dev        # http://localhost:3000
```

## Build

```bash
npm run build
npm run start
```

## Test

```bash
npm test           # Jest unit/integration (RTL, MSW)
npm run test:coverage
npm run test:e2e   # Playwright end-to-end
```

## Quality

```bash
npm run lint
npm run typecheck
npm run format:check
```

## State management

Split by data ownership — full rationale in
[`docs/architecture.md`](docs/architecture.md) §5:

- **Server state** → React Query, fetched via `/api/*`, keyed by query params.
- **Client state** → URL `searchParams` (location, filters, sort, page) — shareable,
  bookmarkable, back-button-correct.
- **Dates** → `AppProvider` (React Context), deliberately not in the URL.

## Component breakdown

Layered, one-way flow; the client reaches data only through `/api/*` (services are
server-only). Module map and per-layer build status:
[`docs/architecture.md`](docs/architecture.md) §5 · [`docs/progress.md`](docs/progress.md).

```
components → hooks (React Query) → stores → /api (BFF) → services → lib + mock data
```
