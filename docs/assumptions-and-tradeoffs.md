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
| Availability cache | In-memory TTL, two read policies     | Distributed cache (Redis) → P2          |
| Circuit breaker | Per-instance CLOSED/OPEN/HALF_OPEN      | Shared breaker state → P2               |

---

## Part 3 — Operability & Resilience

> Phase 2 slice. Sources: `docs/superpowers/specs/2026-06-08-operability-resilience-design.md` §13.

### 13. Breaker + cache state is per-serverless-instance (not shared)

Each serverless instance holds its own circuit breaker counter and in-memory cache. On cold start the breaker is CLOSED and the cache is empty.

_Why:_ Redis / edge-KV is disproportionate at this inventory scale. The `services/cache.ts` and `services/resilience.ts` modules are the swap points where a shared store plugs in.

_Cost:_ Under high concurrency, multiple instances may independently trip or probe the breaker, slightly increasing upstream pressure during failure. Acceptable for a demo; needs a distributed solution at production scale.

### 14. In-memory availability cache

Cache entries live only for the lifetime of the serverless instance.

_Why:_ Same rationale as #13 — no distributed cache at this scale; `createAvailabilityCache()` is the seam.

_Cost:_ Cache doesn't warm across restarts or share between instances.

### 15. Fault injection ships disabled behind a feature flag

`FAULT_INJECTION_ENABLED` defaults to `false`. It is a test and development affordance, not a production behavior.

_Why:_ Without fault injection, the resilience policy (timeout, retry, breaker) cannot be triggered or tested on mock data. The flag makes every resilience claim in the spec deterministically observable.

_Cost:_ Misconfiguring the flag in production would inject artificial errors. Flag is boolean and explicit — low risk.

### 16. Availability is application-cached, not HTTP edge-cached

`/api/hotels/[id]/rooms` carries no `Cache-Control` header. Its freshness and fallback logic lives in `services/cache.ts`, where the circuit breaker can also read stale entries.

_Why:_ An HTTP edge cache cannot serve a stale fallback when upstream fails — it just returns a 502/504. The application cache with two read policies (fresh = cost, stale = resilience) is the mechanism that serves last-known prices during outages.

_Cost:_ No CDN caching on the availability route; every uncached request reaches the BFF. Acceptable: availability is the slow/expensive path by design, and the application cache absorbs repeated lookups.

### 17. SLO dashboard is designed, not built

SLO targets (availability p95 ≤ 2000ms, error rate ≤ 0.1%, cache hit ≥ 50%) are defined in `docs/runbooks/README.md`. A live dashboard is not built.

_Why:_ Asserting a live dashboard on mock data would be disingenuous. The `track()` events (latency, cache hit/miss, breaker transitions) are the feed a real dashboard would consume — the design is forward-compatible and the events are built.

_Cost:_ No single pane of glass. Operational visibility requires a real observability backend wired via `registerAnalyticsAdapter()`.

### 18. Load test is optional in CI

`load/availability-test.js` (k6) runs locally and documents thresholds. It is NOT wired to the blocking CI path.

_Why:_ Load tests against a local dev server are inherently flaky in ephemeral CI runners (no consistent performance baseline, shared CPU).

_Cost:_ Perf regressions that only show at load are not automatically detected. The CI bundle gate and unit perf assertions (filter < 100ms) cover the common cases.

### 19. Deferred as disproportionate at this scale

Items explicitly considered and deferred:
- Distributed/shared circuit breaker + cache state (Redis / edge-KV) → trade-off #13
- Observability sampling (reduce event volume at scale)
- Grid virtualization (DOM size is small at 40 hotels)
- Synthetic uptime monitoring
- BFF rate limiting
- Bulkhead concurrency caps

Each seam is named so the deferral is explicit.

### 20. Security is the deliberately-excluded 6th Well-Architected pillar

The Operability & Resilience slice covers Reliability, Performance, Cost Optimization, and Operational Excellence. Security is out of scope for this slice — the omission is a choice, not an oversight.
