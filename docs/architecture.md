# Architecture — Hotel Discovery Interface

> Single technical entry-point for Phase 1. Consolidates `prd.md` (product),
> `phase-1.md` (build spec), `assumptions-and-tradeoffs.md` (rationale),
> `deployment.md` (ops). Read those for depth; this maps requirements → design.

---

## 1. Overview

Client-facing hotel discovery: pick a destination → browse/filter hotels → open
a hotel → check room availability for dates. Location-first loading, a server-only
data gateway behind a BFF, and pricing/availability decoupled as a slow third-party.

---

## 2. Requirements

**Functional (Phase 1)**

| #   | Capability              | Core behavior                                                                   |
| --- | ----------------------- | ------------------------------------------------------------------------------- |
| 1   | Destination picker      | Filterable city+country dropdown → loads that location's hotels                 |
| 2   | Search/filter/sort/page | Refine by star + price range; sort + paginate — all in-memory over the subset   |
| 3   | Hotel detail            | `/hotels/[id]`: name, address, description, amenities, policies, rating + count |
| 4   | Room availability       | Pick dates → lazy-load open rooms + price/night (third-party sim)               |

**Non-functional**

| Area                    | Target                                                                        |
| ----------------------- | ----------------------------------------------------------------------------- |
| Perf                    | LCP < 2.5s · INP < 200ms · CLS < 0.1 · initial JS < 150KB gz · filter < 100ms |
| A11y                    | WCAG 2.1 AA — semantic, keyboard, focus, `aria-live` count, contrast ≥ 4.5:1  |
| Observability           | `error.tsx` boundary · `track()` facade · typed events · structured API logs  |
| Testing                 | Jest+RTL unit ≥ 85% · MSW integration · Playwright E2E · CI coverage gate     |
| Production (P2 targets) | 100 TPS · 99.995% SLA · MTTD 5m · MTTR 20m                                    |

**Out of scope:** booking/checkout, auth/payments, SEO routing, map view.

---

## 3. Technology Stack

| Tech                                         | Role         | Why                                                                               |
| -------------------------------------------- | ------------ | --------------------------------------------------------------------------------- |
| Next.js (App Router) + TS                    | Framework    | Routing + Server Components + route handlers; SEO/SSG slots in P2 without rewrite |
| React Query                                  | Server state | Cache, dedup, retry, loading/error once — not per hook; keyed by query params     |
| URL `searchParams` + Context (`AppProvider`) | Client state | Shareable/back-button-correct; no global store needed at this scale               |
| Route handlers (`/api/*`, BFF)               | Data path    | Idempotent cacheable GET reads; CDN-cacheable; clean client/server boundary       |
| Mock JSON behind services                    | Data gateway | `hotelService` is the single swap point to a real API                             |
| Vercel                                       | Hosting      | Immutable builds → instant promote/rollback                                       |

---

## 4. Constraints

- Client reaches data **only** via `/api/*`; `hotelService` / `availabilityService` are server-only.
- Seed = 40 hotels / 10 cities, used as-is (nested JSON), isolated behind services.
- Prices USD · photos = placeholder · dates = ISO strings (no TZ math).
- Location URL params slugified (`new-york`, `united-kingdom`); dates entered each visit, not in URL.
- Only validation: checkout > check-in.

---

## 5. Design

### Layering

```
components (UI) → hooks (logic, RQ fetches) → stores (client state + query client)
   → /api (BFF) → services (server-only gateway) → mock data
                  lib/ = pure functions (filters, availability, slug)
```

### Data flow — location-first

```
1. /api/locations            → getLocations   (loaded once; client filters dropdown in memory)
2. /api/hotels?country=&city= → getHotelsByLocation  (only chosen location; refine in memory)
3. /api/hotels/[id]          → getHotelById    (fast — renders immediately)
   /api/hotels/[id]/rooms?check_in=&check_out= → availabilityService  (slow sim — lazy, never blocks)
```

### API contract

The Next.js BFF (`/api/*`) mirrors the canonical REST contract 1:1, plus two additions.

| Canonical REST                   | BFF route                    | Params                                                  |
| -------------------------------- | ---------------------------- | ------------------------------------------------------- |
| `GET /hotels` (or `/properties`) | `GET /api/hotels`            | `city`, `star_rating`, `price_range` (+ `country` ext.) |
| `GET /hotels/<id>`               | `GET /api/hotels/[id]`       | —                                                       |
| `GET /hotels/<id>/rooms`         | `GET /api/hotels/[id]/rooms` | `check_in`, `check_out`                                 |
| — (BFF addition)                 | `GET /api/locations`         | — (destination dropdown, cached once)                   |

Status: `2xx` success · `4xx` client errors (bad/missing dates, unknown id). The P1 client
loads by location (`country`/`city`) then refines `star_rating`/`price_range` in-memory; the
endpoint also accepts them server-side per the contract.

### Two boundaries everything rests on

```
client ──/api/*──┤ server        (data never ships raw to client)
inventory (owned, fast) → render immediately
pricing  (3rd-party, slow) → async · cached · progressive → outage never breaks browsing
```

### State split

```
SERVER (async, cached) → React Query   useLocations / useHotels / useAvailability
CLIENT (UI, sync)      → URL (location + stars/min/max/sort/page) · AppProvider (dates)
```

---

## 6. Why This Design

- **Location-first** — never ship global inventory; matches travel UX, small payloads, scales with catalog.
- **BFF over Server Actions** — reads are cacheable GETs; Actions are POST-only/un-cached → reserved for P2 booking.
- **Pricing decoupled + lazy** — isolates the slow/costly third-party so a pricing outage degrades partially, protecting the SLA.
- **URL as source of truth** — shareable, bookmarkable, back-button-correct, crawlable; avoids hydration mismatch.
- **Domain types, not raw shape** — service maps seed → domain; UI unaffected when the data source changes.
- **React Query for server cache only** — complements (doesn't replace) URL + Context.

---

## 7. Assumptions & Trade-offs (summary)

| Decision                       | Cost accepted                                                  |
| ------------------------------ | -------------------------------------------------------------- |
| Next.js App Router             | More framework surface than a plain SPA                        |
| `hotelService` gateway         | One indirection layer over a static file today                 |
| In-memory filter/sort/page     | Bounded subset only (city ≈ 4, country ≤ ~20)                  |
| Pricing cached/circuit-breaker | Prices briefly stale/indicative; exact price at booking (P2)   |
| Dates manual, not in URL       | Refresh/shared link doesn't carry dates (filters/sort/page do) |
| USD + placeholder photos       | Dataset has no currency/image fields                           |

Full rationale → `assumptions-and-tradeoffs.md`. Open questions: star filter (min vs exact),
which rating on cards, availability latency target.

---

## 8. How Requirements Are Satisfied

| Requirement           | Satisfied by                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------------- |
| Destination picker    | `/api/locations` once → client substring filter → URL `?country=&city=`                       |
| Filter < 100ms        | `useFilteredHotels` pure in-memory over loaded subset                                         |
| Shareable filters     | All refine/sort/page state in `searchParams`                                                  |
| Detail renders fast   | `/api/hotels/[id]` static info; availability decoupled                                        |
| Availability + states | Lazy `useAvailability` (key `[id,check_in,check_out]`): loading skeleton, retry/SWR, empty/blocked states |
| Perf budget           | Sized lazy images (no CLS), `loading.tsx` skeletons, location-first small payloads            |
| A11y AA               | Semantic HTML, labelled controls, `aria-live` count, focus-visible, contrast                  |
| Observability         | `error.tsx`, `track()` facade + typed events, structured API logs                             |
| Testing ≥ 85%         | Jest/RTL unit, MSW integration, Playwright E2E, CI coverage gate                              |
| Resilience (P2)       | Cache-first + graceful degradation; Vercel instant promote/rollback (MTTR 20m)                |

```

```
