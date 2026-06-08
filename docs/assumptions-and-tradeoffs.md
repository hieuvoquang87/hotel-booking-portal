# Assumptions & Trade-offs

> Architecture rationale for the Hotel Discovery app.
> Companion to `architecture.md` (core) and `product-roadmap.md` (SEO & scale).

---

## Part 1 — Assumptions

### Production requirements (NFRs)

| Metric       | Target                   | Implication                                             |
| ------------ | ------------------------ | ------------------------------------------------------- |
| Traffic      | 100 TPS                  | Cache-first; CDN/ISR absorb load before the service     |
| Device split | 80% mobile / 20% desktop | Mobile-first UX, payloads, and Web Vitals validation    |
| Geo split    | 80% US / 20% intl        | US edge regions prioritized; cache warming biased US    |
| Availability | 99.995% SLA (~26 min/yr) | Graceful degradation; no single hard dep in render path |
| MTTD         | 5 min                    | Real-time alerting on errors + Web Vitals               |
| MTTR         | 20 min                   | Fast rollback, feature flags, cached fallbacks          |

**Error budget:** MTTD + MTTR (25 min) ≈ the entire annual budget → degradation
must be **partial, never total**.

### Domain assumptions

| Assumption                            | Note                                                            |
| ------------------------------------- | --------------------------------------------------------------- |
| Inventory owned                       | Our `hotelService` is source of truth — cacheable, ISR-friendly |
| Pricing third-party                   | Slow + expensive → decoupled from render path (see Trade-off 7) |
| Dataset = 40 hotels, 10 global cities | All surfaced from Phase 1                                       |
| ~15% inventory has no availability    | Drives the "No rooms" empty state                               |
| Dates = ISO strings                   | Direct match vs `available_dates`; no TZ math in v1             |
| Mock JSON ≈ real API                  | `hotelService` is the swap point                                |
| State slug = 2-letter (`il`, `ny`)    | Mapped to full name in metadata                                 |
| Detail = dedicated route, not modal   | Shareable, SEO-ready (to confirm)                               |

---

## Part 2 — Trade-offs

Each: **decision → why → cost**.

### 1. Next.js (App Router)

SEO is mandatory → SSR/SSG/Server Components out of the box; SEO layer slots in
without a rewrite. _Cost:_ more framework surface than a plain SPA.

### 2. Mobile-first UI

80% of traffic is assumed mobile, so layout, controls, payload size, and Web
Vitals are optimized for mobile first; desktop gets progressive enhancement.
_Cost:_ denser desktop layouts are secondary in Phase 1.

### 3. `hotelService` single gateway

All reads flow through one module; mock JSON hidden behind it. Mock→API swap is
one file's internals. _Cost:_ one layer of indirection over a static file today.

### 4. API route handlers (BFF), not Server Actions

Hotel queries are idempotent cacheable GET reads → proper HTTP semantics,
CDN-cacheable, parallel, stable URLs a mobile client can reuse. Server Actions are
POST-only, un-cached, sequential → reserved for mutations like booking (Phase 2). The client
talks **only** to `/api/*`; `hotelService` is server-only behind it. _Cost:_ a
thin BFF layer over a tiny dataset today — but it's the Phase 2 swap seam and a
clean server/client boundary.

### 5. URL `searchParams` for filters

Shareable, bookmarkable, back-button-correct, crawlable for free. _Cost:_ more
verbose than a store; correct for anything linkable.

### 6. `useState` → Context → (Zustand)

Filters live in URL, data on the server; what's left (dates, modals) is small +
local. Start with `useState`; lift to a memoized Context only when shared; Zustand
only if state turns perf-sensitive or is used off-React. _Cost:_ Context
re-renders all consumers — harmless at this scale; mitigate by splitting contexts.

### 7. Pricing decoupled from render path

Pricing is the riskiest dep (slow, costly, third-party), so isolate it.

```
Inventory (owned, fast)  → renders immediately
Pricing (3rd-party, slow) → async · cached · progressive
   hit  → instant   miss → "from $X" then hydrate   fail → last-known + "indicative"
```

Mechanics: separate `pricingService` + cache namespace, per-hotel/date TTL (Redis,
SWR), ~800ms timeout, circuit breaker w/ cached fallback, own BFF route.
_Why:_ caps third-party cost under 100 TPS, keeps slow pricing off first paint,
and a pricing outage never breaks browsing → protects the SLA.
_Cost:_ prices can be briefly stale/indicative; exact price reconfirmed at booking.

### 8. Domain types, not raw shape

Service maps source → domain at the boundary; UI types never move when the API
changes. _Cost:_ a mapping step (cheap insurance).

### 9. SSG + ISR (Phase 2)

Small stable inventory → pre-render all for instant LCP + crawlability; ISR keeps
prices fresh without rebuilds. _Cost:_ data stale within revalidate window; live
availability re-checked via BFF.

### 10. Country segment in URL from day one (Phase 2)

`/hotel/{country}/...` → international is data, not a route migration. _Cost:_ a
redundant `us` segment early; trivial.

### 11. Allow-listed intent slugs (Phase 2)

Curated slugs → indexable long-tail pages without an infinite crawl surface.
_Cost:_ manual curation of high-value slugs.

### 12. `track()` observability facade (Phase 2)

Typed events to one interface; vendor wiring behind it → swap providers freely.
`no_results` / `no_rooms` double as inventory-gap signals. _Cost:_ thin
abstraction over vendor SDKs.

---

## Decision Summary

| Area            | Choice                                  | Deferred                                |
| --------------- | --------------------------------------- | --------------------------------------- |
| Framework       | Next.js App Router                      | —                                       |
| UX priority     | Mobile-first for 80% mobile traffic     | Desktop dense optimizations → P2        |
| Data access     | `hotelService` gateway                  | real endpoint → P2                      |
| Browser reads   | API route handlers (BFF)                | Server Actions → booking/mutations (P2) |
| Inventory       | owned, cached, ISR                      | —                                       |
| Pricing         | decoupled · cached · circuit breaker    | exact price at booking → P2             |
| Filter state    | URL searchParams                        | —                                       |
| Ephemeral state | `useState` → Context                    | Zustand → escape hatch                  |
| Rendering       | CSR + server data (P1)                  | SSG + ISR → P2                          |
| Resilience      | graceful degradation + cached fallbacks | meets 99.995% / MTTR 20m                |
| SEO             | —                                       | landing pages, slugs, JSON-LD → P2      |
