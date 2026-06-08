# M2 — BFF API Routes — Design Spec

> Phase 1, Milestone M2 (see `docs/progress.md`). The BFF: four idempotent GET
> route handlers that are the client's **only** data surface, wrapping M1's
> server-only services and mirroring the canonical REST contract.
> Sources: `architecture.md` §5, `prd.md`, `product-roadmap.md`, `user-flows.md`,
> and the M1 spec (`docs/superpowers/specs/2026-06-08-m1-data-layer-design.md`).

**Status:** approved design — implementation plan follows in
`docs/superpowers/plans/2026-06-08-m2-bff-api-routes.md`.

---

## 1. Goal & Scope

**Goal.** Expose hotel/location/availability data to the client through
`/api/*` GET route handlers. Each handler is a **thin adapter**: parse params →
call an M1 service → map the domain result (and M1's typed errors) to an HTTP
response. No business logic lives in routes — it stays in M1's `lib/` and
services.

**In scope (M2):**

- Four route handlers: `/api/locations`, `/api/hotels`, `/api/hotels/[id]`,
  `/api/hotels/[id]/rooms`.
- A small HTTP-layer toolkit under `app/api/_lib/`: JSON response helpers, a
  structured per-request logger, and a `withRoute` wrapper that centralizes
  timing, error→HTTP mapping, and logging.
- Request validation for the rooms route (date presence, format, range).
- `Cache-Control` headers per route (cacheable reads vs. the dynamic rooms path).
- Integration tests for every route — happy path + each error branch — invoking
  the handlers directly with a Web `Request`.

**Out of scope (later milestones):** React Query hooks and partial-date gating
(M3); any UI (M4/M5); route-level error/loading/not-found **pages** (M6, distinct
from these JSON responses); vendor observability wiring — pino/Sentry (P2). The
client never imports `services/` directly; M2 is the boundary that guarantees it.

**Depends on M1** (`hotelService`, `availabilityService`, the domain types and
`InvalidDateRangeError` / `HotelNotFoundError`) and **M0** (Next.js App Router
project + Jest). Neither is built yet, so the implementation plan is blocked on
them; it states the assumptions M2 makes about their public surface.

---

## 2. Routes & Contract

The BFF mirrors the canonical REST contract 1:1, plus the `/api/locations`
addition (architecture.md §5).

| Route | Service call | Success | Caching |
| --- | --- | --- | --- |
| `GET /api/locations` | `getLocations()` | `200` `Location[]` | cacheable (long) |
| `GET /api/hotels?country=&city=` | `getHotelsByLocation` / top-rated default | `200` `Hotel[]` | cacheable (short) |
| `GET /api/hotels/[id]` | `getHotelById(id)` | `200` `Hotel` · `404` | cacheable (short) |
| `GET /api/hotels/[id]/rooms?check_in=&check_out=` | `checkAvailability(id, ci, co)` | `200` `AvailableRoom[]` · `400` · `404` | **`no-store`** |

### 2.1 `GET /api/locations`

Returns the deterministically-ordered distinct location list (10 entries) — the
destination dropdown source. No params, no error branch beyond a `500` safety net.

### 2.2 `GET /api/hotels`

- `country` and/or `city` (slug values, e.g. `usa`, `new-york`) → resolved by the
  service's slug lookup, returns that location's hotels.
- **`star_rating` / `price_range` are accepted in the querystring (contract
  surface) but ignored in P1** — no `400`. Refinement is the client's job (M4's
  in-memory `useFilteredHotels`). _Decision: location-only filtering (YAGNI)._
- **Paramless call (no `country` and no `city`) → the top 10 hotels by
  `overallRating` (best-rated), not the full catalog.** This gives the home page a
  "featured" default while never shipping global inventory through the BFF —
  honoring the location-first principle at the API boundary. Composed in the route
  from existing M1 exports: `sortHotels(getHotelsByLocation({}), 'rating')
  .slice(0, DEFAULT_HOTELS_LIMIT)`, `DEFAULT_HOTELS_LIMIT = 10`. _Decision: a
  paramless `/api/hotels` is a featured-list default, replacing both "return all
  40" and "400 require location."_
- Unknown slug that resolves to nothing → `200 []` (an empty result, not an error).

### 2.3 `GET /api/hotels/[id]`

- Known id → `200` with the full domain `Hotel` (static info; fast — the detail
  page renders from this immediately).
- Unknown id (`getHotelById` → `null`) → `404 { error: { code: 'HOTEL_NOT_FOUND' } }`.
  (The route returns a JSON 404; the detail **page**'s `notFound()` is M5.)

### 2.4 `GET /api/hotels/[id]/rooms`

The slow, lazy, never-cached path — the simulated third-party.

- Validates `check_in` and `check_out` (see §4). Both absent/partial/malformed →
  `400` **before** any service call (no latency wasted on bad input).
- Valid dates → `checkAvailability(id, check_in, check_out)` (no `delayMs`
  override, so the route incurs the configured latency).
- `200` with `AvailableRoom[]` — including `200 []` for the 6 no-availability
  hotels or out-of-window dates (a valid "no rooms" result, **not** an error).
- `checkOut <= checkIn` → service throws `InvalidDateRangeError` → `400`.
- Unknown id → service throws `HotelNotFoundError` → `404`.

---

## 3. Module Structure & Data Flow

Framework-agnostic handlers wrapped by a tiny shared toolkit. Nothing here imports
`services/` except via M1's public functions.

```
app/api/
├── _lib/                       non-routable (underscore prefix); HTTP-layer only
│   ├── respond.ts              ok(data, init?) · fail(status, code, message)
│   ├── logger.ts               logRequest({ route, method, status, durationMs, outcome })
│   └── handle.ts               withRoute(name, handler) — timing, error→HTTP, logging
├── locations/route.ts          GET → getLocations()
└── hotels/
    ├── route.ts                GET → getHotelsByLocation | top-rated default
    └── [id]/
        ├── route.ts            GET → getHotelById (404 on null)
        └── rooms/route.ts      GET → validate dates → checkAvailability
```

```
client ──fetch──▶ /api/* route handler ──▶ withRoute(handler)
                                              │  parse Web Request (URL searchParams, params)
                                              │  call M1 service  ───▶ services/ (server-only)
                                              │  ok(domainResult)   or  thrown typed error
                                              ▼
                                         Response.json(...) + Cache-Control + structured log
```

**Chosen approach: Web-standard handlers (no `next/server`).** Handlers read
`new URL(request.url).searchParams` and return `Response.json(data, { status,
headers })` — only Web primitives, no `NextRequest`/`NextResponse` import. These
GET reads need nothing Next-specific (no cookies, redirects, or middleware), and
avoiding the `next/server` import keeps the integration tests trivial in a plain
Jest environment (no edge-runtime shim). _Rejected: `NextRequest`/`NextResponse`
— couples handlers to the framework and complicates the test environment for zero
benefit here._

**Helper placement: `app/api/_lib/` (not `lib/api/`).** `lib/` is reserved for
**pure** functions (per architecture.md §5: "filters, availability, slug"); these
helpers build HTTP responses and write logs (a side effect), so they live with the
API layer. The `_` prefix keeps the folder out of Next's route table.

---

## 4. Request Validation

Per architecture.md §4, **the only hard validation is `checkout > check-in`**.
Everything else is permissive (bad/unused params are ignored, not rejected).

**Rooms route — validation order (deterministic, so tests are unambiguous):**

1. **Presence** — `check_in` or `check_out` missing → `400 MISSING_DATES`.
2. **Format** — not a real `YYYY-MM-DD` calendar date → `400 INVALID_DATE`.
   (Format _and_ validity: `2026-13-01` and `2026-02-30` are both rejected —
   regex shape plus a round-trip `Date` check, since `new Date('2026-02-30')`
   silently rolls over to March.)
3. **Range** — delegated to the service; `InvalidDateRangeError` → `400
   INVALID_DATE_RANGE`.

Steps 1–2 run in the handler and return **before** any service call (so malformed
input never incurs the simulated latency). Step 3 is the service's own guard,
surfaced via the error map. A "bad dates + unknown id" request therefore yields a
date `400` (presence/format fail first), never a `404` — pinned by order.

**Other routes:** `/api/hotels` ignores unknown/extra params; `/api/hotels/[id]`
has no params to validate. No route 400s on anything except rooms-date problems.

---

## 5. Response & Error Envelope

- **Success: bare JSON** — `Location[]`, `Hotel[]`, `Hotel`, `AvailableRoom[]`.
  Idiomatic REST; M3's React Query hooks consume the parsed body directly and
  throw on `!res.ok`.
- **Error: `{ error: { code, message } }`** with the matching status.

| Condition | Status | `code` |
| --- | --- | --- |
| Unknown hotel id (`getHotelById` → null, or `HotelNotFoundError`) | `404` | `HOTEL_NOT_FOUND` |
| Missing `check_in` / `check_out` | `400` | `MISSING_DATES` |
| Malformed / non-calendar date | `400` | `INVALID_DATE` |
| `checkout <= check_in` (`InvalidDateRangeError`) | `400` | `INVALID_DATE_RANGE` |
| Any unexpected throw | `500` | `INTERNAL` |

**The `500` branch never leaks the raw exception.** The full error (message +
stack) is logged server-side; the client receives a generic
`{ error: { code: 'INTERNAL', message: 'Internal server error' } }`.

### 5.1 `withRoute(name, handler)` — the shared wrapper

A ~25-line higher-order function so each route file stays ~10 lines:

```ts
type RouteContext = { params: Promise<Record<string, string>> };
type Handler = (req: Request, ctx: RouteContext) => Promise<Response>;

withRoute(name: string, handler: Handler): Handler
```

- **Forwards both `req` and `ctx`** to the inner handler — `ctx.params` is a
  `Promise` in Next 15+ and the `[id]` routes need it (`const { id } = await
  ctx.params`). A wrapper that dropped `ctx` would break those routes.
- Times the request; on success logs `outcome: 'ok'` and returns the handler's
  `Response`.
- On throw, maps the error (table above) via `fail()`, logs `outcome: 'error'`
  with the full error server-side, and returns the mapped response. Unmapped
  errors → generic `500`.

### 5.2 `respond.ts`

```ts
ok<T>(data: T, init?: ResponseInit): Response              // Response.json(data, init)
fail(status: number, code: string, message: string): Response  // { error: { code, message } }
```

`Cache-Control` is passed through `ok(data, { headers })` per route (§6).

### 5.3 `logger.ts` — structured API logs (the M2 deliverable M6 builds on)

```ts
logRequest(entry: {
  route: string; method: string; status: number;
  durationMs: number; outcome: 'ok' | 'error'; error?: unknown;
}): void
```

One structured JSON line per request via `console`. This is the **lightweight P1
facade** — pino wiring is P2 (assumptions §11), mirroring how `track()` (M6) is a
console facade now. It is distinct from `track()`: this logs server requests,
`track()` emits client product events.

---

## 6. Caching

Reading `searchParams`/`params` forces a route to be dynamic in Next, so M2 does
**not** rely on static route-segment inference. Caching is set explicitly via
`Cache-Control` headers on the response:

| Route | `Cache-Control` | Why |
| --- | --- | --- |
| `/api/locations` | `public, max-age=3600, stale-while-revalidate=86400` | Tiny, rarely changes |
| `/api/hotels` | `public, max-age=300, stale-while-revalidate=3600` | Location-scoped reads |
| `/api/hotels/[id]` | `public, max-age=300, stale-while-revalidate=3600` | Static hotel info |
| `/api/hotels/[id]/rooms` | `no-store` | Slow third-party; lazy; must be fresh |

(With a static seed these values are mostly forward-looking — they encode the
intended CDN behavior for when `hotelService` swaps to a real API in P2. Render
strategy proper, SSG/ISR, is explicitly a P2 concern.)

---

## 7. Testing Strategy (integration, ≥85% coverage)

Handlers are tested **directly** — construct a Web `Request` (and, for `[id]`
routes, `{ params: Promise.resolve({ id }) }`), invoke the exported `GET`, and
assert `status` + parsed body. No MSW (that mocks the network for M3 hook tests;
M2 owns the handlers themselves). Availability tests set
`AVAILABILITY_LATENCY_MS=0` so the rooms route doesn't incur ~1s latency.

Fixtures use **real seed values** (verified against the seed):

- `/api/locations` → `200`, length `10`, deterministic order.
- `/api/hotels?country=usa` → `200`, 20 hotels; `?city=new-york` → 4;
  `?city=atlantis` (unknown) → `200 []`; **no params → `200`, 10 hotels, sorted
  by `overallRating` desc** (the featured default).
- `/api/hotels/hotel-01` → `200`, body `id === 'hotel-01'`;
  `/api/hotels/hotel-999` → `404 HOTEL_NOT_FOUND`.
- `/api/hotels/hotel-01/rooms?check_in=2026-07-10&check_out=2026-07-13` → `200`,
  `[room-01a]` (room-01b lacks 07-12); `hotel-04` (no-availability) → `200 []`;
  out-of-window dates → `200 []`.
- Rooms errors: missing `check_out` → `400 MISSING_DATES`; `check_in=2026-02-30`
  → `400 INVALID_DATE`; `check_in=2026-07-12&check_out=2026-07-12` → `400
  INVALID_DATE_RANGE`; unknown id with valid dates → `404 HOTEL_NOT_FOUND`.
- **`withRoute` `500` branch:** force an unexpected throw (mock a service to
  throw a plain `Error`) → `200`?-no → `500 INTERNAL` with a generic message and a
  logged outcome.
- Assert `logRequest` is invoked (spy on `console`) for at least one ok and one
  error path.

---

## 8. Decisions & Open Items

**Resolved decisions:**

- **Filtering = location-only** at `/api/hotels`; `star_rating`/`price_range`
  accepted but ignored (refine is client-side, M4).
- **Paramless `/api/hotels` = top 10 by `overallRating`** (featured default) —
  not all-40, not a `400`.
- **Web-standard handlers** (`Request`/`Response.json`), no `next/server` import.
- **Helpers in `app/api/_lib/`**, keeping `lib/` pure.
- **Error envelope** `{ error: { code, message } }`; bare JSON on success.
- **Validation order** presence → format → range; date `400`s precede id `404`.
- **`500` never leaks** the raw exception message.
- **Caching via explicit `Cache-Control` headers**, not static inference.
- **Structured logging** via a `console`-JSON facade (pino is P2).

**Assumptions about M1/M0 (verify when writing the plan):** M1 exports
`getLocations`, `getHotelsByLocation`, `getHotelById`, `checkAvailability`,
`sortHotels`, and the two typed errors with the signatures in the M1 spec; the
availability latency honors `AVAILABILITY_LATENCY_MS`. M0 provides a Next.js App
Router project (Next 15+, async route `params`) and a Jest setup that can run the
route tests. Confirm the exact route-handler signature (async `params`) against
current Next docs (context7) before implementing.

**Deferred (not M2):** hooks + partial-date gating + stale-response latest-wins
(M3); UI states (M4/M5); error/loading/not-found **pages** and the `track()`
facade (M6); pino/Sentry wiring + SSG/ISR render strategy (P2).
