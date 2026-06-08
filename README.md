# Hotel Booking Portal

Phase 1 — hotel discovery interface. Pick a destination → browse/filter/sort
hotels → open a hotel → check room availability for dates.

> Detailed architecture: see [`docs/architecture.md`](docs/architecture.md).
> State-management approach and component breakdown are completed in M8.

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
