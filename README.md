# Hotel Booking Portal

A mobile-first, client-facing hotel discovery & booking platform: pick a
destination → browse/filter/sort hotels → open a hotel → check room availability
for dates, with booking and production hardening planned next.

> Spec-driven. Full architecture in [`docs/architecture.md`](docs/architecture.md);
> roadmap in [`docs/product-roadmap.md`](docs/product-roadmap.md); milestone status
> in [`docs/progress.md`](docs/progress.md). State management and component
> breakdown are summarized at the end of this file.

## Project phases

Shipped in phases — see [`docs/product-roadmap.md`](docs/product-roadmap.md):

- **Phase 1 — Core Discovery (current):** destination picker, in-memory
  filter/sort/paginate, hotel detail, and lazy room availability.
- **Phase 2 — Scale, SEO, Booking & Resilience (designed, not yet built):** booking
  via Server Actions, crawlable SSG/ISR landing pages, a real-API service swap,
  observability, and operability/resilience hardening.

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
