# Hotel Booking Portal

A mobile-first, client-facing hotel discovery & booking platform: pick a
destination → browse/filter/sort hotels → open a hotel → check room availability
for dates, with booking and production hardening planned next.

> Spec-driven. Full architecture in [`docs/architecture.md`](docs/architecture.md);
> roadmap in [`docs/product-roadmap.md`](docs/product-roadmap.md); design rationale in
> [`docs/assumptions-and-tradeoffs.md`](docs/assumptions-and-tradeoffs.md); user
> journeys in [`docs/user-flows.md`](docs/user-flows.md); milestone status in
> [`docs/progress.md`](docs/progress.md). Architecture, state management,
> and the quality bar are summarized below.

## Project phases

Shipped in phases — see [`docs/product-roadmap.md`](docs/product-roadmap.md):

- **Phase 1 — Core Discovery (current):** destination picker, in-memory
  filter/sort/paginate, hotel detail, and lazy room availability.
- **Phase 2 — Scale, SEO, Booking & Resilience (designed, not yet built):** booking
  via Server Actions, crawlable SSG/ISR landing pages, a real-API service swap,
  observability, operability/resilience hardening, and internationalization (es/fr/de).

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

## Architecture at a glance

```
Browser (mobile-first)
   │  HTTPS
   ▼
Next.js app ──/api/* (BFF)──▶ services (server-only gateway)
 RSC + client                     ├─▶ inventory (owned, fast) ── mock/hotels.json  → real API (P2)
                                  └─▶ pricing/availability (slow 3rd-party sim) ── lazy · cached · decoupled
```

The client talks only to the BFF; data never ships raw. The slow pricing dependency
is isolated so an outage degrades partially and never blocks browsing. Full design:
[`docs/architecture.md`](docs/architecture.md).

## Design principles & trade-offs

Decisions and their rationale (depth in [`docs/architecture.md`](docs/architecture.md) §6;
costs accepted in [`docs/assumptions-and-tradeoffs.md`](docs/assumptions-and-tradeoffs.md)):

- **Location-first loading** — never ship global inventory; small payloads that scale with the catalog.
- **BFF for reads, Server Actions reserved for Phase 2 writes** — GET reads stay cacheable; mutations get CSRF + idempotency later.
- **URL as source of truth** (filters/sort/page) — shareable, bookmarkable, back-button-correct.
- **Pricing decoupled & lazy** — a slow third-party never blocks browsing or detail render.
- **Domain types, not raw seed** — `services/` is the single swap seam to a real API; the UI is unaffected.
- **Mobile-first** — 80% mobile traffic drives layout, payload size, and Web Vitals.

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

## Project structure

```
app/            Next.js App Router — pages, layouts, error/loading/not-found boundaries + /api BFF routes
components/     UI components — home/ (search, filter, sort, pagination, grid, card),
                hotel/ (hero, amenities, policies, availability, room card), ui/ (shadcn/ui primitives)
hooks/          React Query data hooks (useLocations, useHotels, useFilteredHotels, useAvailability)
                + URL search-params state (useSearchParamsState)
stores/         client-state providers (QueryProvider, AppProvider)
services/       server-only data gateway (hotelService, availabilityService) + cache, config, resilience, mappers + mock/ seed
lib/            pure functions (filters, sort, paginate, slug, availability, fetcher, destinations, amenities, colors, utils)
types/          domain types (Hotel, Room, Location, Availability)
mocks/          MSW request handlers (tests)
tests/          Jest unit + integration (RTL + MSW)
e2e/            Playwright end-to-end specs
docs/           architecture, roadmap, progress, user-flows, specs, plans, designs, runbooks, test-results
```

## Quality bar & non-functional budgets

Treated as first-class budgets (targets in [`docs/architecture.md`](docs/architecture.md) §2);
the CI gate that enforces them is wired in M7:

- **Performance** — LCP < 2.5s · INP < 200ms · CLS < 0.1 · initial JS < 250KB gz · in-memory filter < 100ms.
- **Accessibility** — WCAG 2.1 AA: semantic HTML, keyboard, focus-visible, `aria-live` result count, contrast ≥ 4.5:1.
- **Testing** — unit ≥ 85% · MSW integration · Playwright E2E · CI coverage gate (M7) blocks merge.

## Resilience & operations

Pricing/availability is the one slow, unreliable dependency, so it gets timeout +
bounded retry, a circuit breaker, and a stale-cache fallback — browsing never blocks
(design: [resilience spec](docs/superpowers/specs/2026-06-08-operability-resilience-design.md)).
Releases are immutable Vercel builds with preview → staging → production and instant
rollback ([`docs/deployment.md`](docs/deployment.md)). On-call SLOs, alert config, and
incident runbooks for the availability dependency — slow, down, stale prices after
recovery, bad deploy — live in [`docs/runbooks/`](docs/runbooks/README.md).

## Security

- Client reaches data **only** via `/api/*`; `services/` and the seed are server-only — no inventory or secrets ship to the browser.
- Input validated at the BFF boundary; only normalized domain fields cross to the UI.
- Out of scope for Phase 1 (no auth/payments). Phase 2 mutations add CSRF via Server Actions, idempotency keys, and rate limiting.

## AI usage

Built with AI assistance; the end-to-end workflow (requirements → docs → architecture
→ implementation) is documented in [`ai-dev-workflow.md`](ai-dev-workflow.md).

## Test results

Lighthouse 🟢 100/100/100/100 · Jest **361 passed** · Playwright **3/3** E2E green. Full breakdown, metrics, and the load-test plan → [`docs/test-results/`](docs/test-results/).
