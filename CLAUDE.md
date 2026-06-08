# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

Phase 1 of a client-facing **hotel discovery interface**: pick a destination →
browse / filter / sort / paginate its hotels → open a hotel → check room
availability for dates. Mobile-first (assumed 80% mobile traffic). Currently an
early Next.js scaffold — most milestones are not yet implemented.

## Docs are the source of truth

The repo is spec-driven; read before implementing. Don't duplicate these into code comments.

- [docs/architecture.md](docs/architecture.md) — **the single technical entry-point** (requirements → design, layering, API contract, why).
- [docs/prd.md](docs/prd.md) — product requirements, feature acceptance criteria (F1–F5).
- [docs/progress.md](docs/progress.md) — **the milestone + task tracker** (M0–M9). Your work queue and check-off surface (see below).
- [docs/superpowers/specs/](docs/superpowers/specs/) + [docs/superpowers/plans/](docs/superpowers/plans/) — per-milestone design spec and implementation plan. **Read the relevant milestone's spec and plan before writing its code.**
- Also: `assumptions-and-tradeoffs.md`, `user-flows.md`, `product-roadmap.md`, `deployment.md`, `designs/`.

## Milestone workflow — check off progress after every implementation

Work is organized into milestones M0–M9 in [docs/progress.md](docs/progress.md). **After completing any implementation task, update that file** — this is a required step, not optional cleanup:

1. **Check off only when the task's "Done when" gate is actually met** — tests green, behavior verified. Code merely written ≠ done. Don't tick prematurely.
2. **Sync all status surfaces in `progress.md`:** flip the task `- [ ]` → `- [x]`; update the milestone's row in the **Progress at a Glance** table; at release, the **Definition of Done** checklist.
3. **Use the status legend:** `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` deferred to P2.
4. Open decisions are flagged `⚠︎ decision` with defaults in progress.md §"Open Questions" (star filter = minimum, card shows both ratings, ~1s availability latency, native date picker) — follow the default unless told otherwise.

## Architecture invariants

Distilled from architecture.md — the rules that span multiple files and must not be broken:

- **Client reaches data only via `/api/*` (the BFF).** `services/hotelService.ts` and `services/availabilityService.ts` are **server-only**. The UI never imports them or the seed directly.
- **Layering:** `components` (UI) → `hooks` (logic, React Query) → `stores` (client state) → `/api` (BFF route handlers) → `services` (data gateway) → mock data. `lib/` = pure functions (filters, sort, paginate, slug, availability).
- **State split:** server state → **React Query**, keyed by query params. Client state → **URL `searchParams`** (`country, city, stars, min, max, sort, page`; shareable, back-button-correct) **+** `AppProvider` for check-in/check-out **dates, which are deliberately NOT in the URL**.
- **Location-first loading:** never ship global inventory — load only the chosen location's hotels, then filter/sort/paginate that subset in memory (< 100ms).
- **Pricing/availability is decoupled and lazy** — a simulated slow third-party. It loads progressively and must never block hotel browsing or detail rendering.
- **Domain types, not raw seed:** services map the nested seed shape → domain types (`Hotel`, `Room`, `Location`, `Availability`) at the boundary. The UI consumes normalized fields only.

## Commands

```bash
npm run dev      # start the dev server (Next.js)
npm run build    # production build
npm run start    # serve the production build
npm run lint     # ESLint (eslint-config-next: core-web-vitals + typescript)
```

**Test toolchain is not wired yet** — it's M0 work. progress.md M0 specifies these _planned_ scripts to add: `test` / `test:coverage` (Jest + RTL, ≥85% coverage gate), MSW for integration, and `test:e2e` (Playwright). Don't invoke them until they exist in `package.json`.

## Conventions & gotchas

- **Next.js version caveat (see `@AGENTS.md`): this Next.js has breaking changes vs. training data — read `node_modules/next/dist/docs/` before writing Next-specific code.** Next 16, React 19, App Router, TypeScript `strict: true`.
- **Path alias:** `@/*` maps to the repo root (e.g. `@/lib/slug`).
- **Seed data:** lives at `docs/mock-data.json` **today**; M0 moves it to `services/mock/hotels.json`. Either way it stays behind the services and is never imported outside `services/`. No `getLocations()` seed file exists — locations are _derived_ by aggregating unique city+country across the 40 hotels.
- **Slugs:** location URL params are slugified, diacritics stripped (`United Kingdom` → `united-kingdom`); `lib/slug.ts` must reverse-match slug → seed value.
- Prices are USD; photos are placeholders (seed has no currency/image fields). Dates are ISO strings, no timezone math. Only date validation: checkout > check-in.
- A room is available iff **every** night in `[check-in → check-out)` is in its `available_dates`.
