# M3 — Client State & Data Hooks — Design Spec

> Phase 1, Milestone M3 (see `docs/progress.md`). The client-side state layer: a
> React Query provider, a dates-only context, a URL search-params hook, and the
> four `use*` hooks the UI (M4/M5) consumes. No page UI yet.
> Sources: `architecture.md`, `prd.md`, `product-roadmap.md`, `user-flows.md`, M1 spec.

**Status:** approved design — implementation plan follows in
`docs/superpowers/plans/2026-06-08-m3-client-state.md`.

---

## 1. Goal & Scope

**Goal.** Establish the client state layer: server data flows through React Query
hooks keyed by params; client state is split between the **URL** (location +
refine/sort/page) and a small **`AppProvider`** (check-in/out dates only). The UI
milestones consume these hooks and never touch `fetch` or `/api/*` directly.

**In scope (M3):**

- `stores/QueryProvider.tsx` — `QueryClient` + provider for the root layout.
- `stores/AppProvider.tsx` — React context holding `checkIn`/`checkOut` dates.
- `hooks/useSearchParamsState.ts` — typed read/write of `country, city, stars,
  min, max, sort, page` in the URL, with safe defaults and page-reset semantics.
- `lib/fetcher.ts` — a tiny typed `fetch` wrapper (throws on non-2xx).
- `hooks/useLocations.ts`, `hooks/useHotels.ts`, `hooks/useFilteredHotels.ts`,
  `hooks/useAvailability.ts`.
- Unit tests for all of the above (≥85% coverage), MSW for the query hooks.

**Out of scope (later milestones):** any page or component UI (M4/M5), error/loading
boundaries and the `track()` facade (M6), the `/api/*` routes themselves (M2,
assumed done), and vendor observability (P2).

**Depends on M0–M2:** M0 provides Next (App Router) + TypeScript + Tailwind,
`@tanstack/react-query`, Jest/RTL/`jest-environment-jsdom`, and an MSW setup. M1
provides domain types and the pure `lib/` functions (`filters`, `sort`,
`paginate`). M2 provides the four `/api/*` routes this layer fetches from. If any
upstream piece is missing, the plan notes the minimal stand-in it needs.

---

## 2. State Model (the split)

Per `architecture.md` §"State split". Three stores, each with one job:

| Store              | Owns                                            | Why there                                                              |
| ------------------ | ----------------------------------------------- | ---------------------------------------------------------------------- |
| **URL** params     | `country, city, stars, min, max, sort, page`    | Shareable, bookmarkable, back-button-correct, crawlable                |
| **`AppProvider`**  | `checkIn`, `checkOut` (dates)                   | Entered each visit; deliberately **not** in the URL (per assumptions)  |
| **React Query**    | server responses, keyed by params               | Cache, dedup, retry, SWR — server cache only, not app state            |

Invariants:

- Dates live **only** in `AppProvider`; a refresh or shared link does not carry
  them. Filters/sort/page live **only** in the URL.
- React Query never holds client UI state; the URL/context never hold server data.
- `useFilteredHotels` is **pure** (no store, no fetch) — it derives a view from the
  loaded hotel subset plus the current URL params.

---

## 3. Module Structure & Data Flow

All client-side (`'use client'` where a hook touches React state, context, RQ, or
navigation). The UI's only data path is these hooks → M2's `/api/*`.

```
stores/QueryProvider.tsx        QueryClient + <QueryClientProvider>, mounted in root layout
stores/AppProvider.tsx          <AppProvider> + useAppDates() — checkIn/checkOut context

lib/fetcher.ts                  getJson<T>(url): typed fetch, throws ApiError on non-2xx

hooks/useSearchParamsState.ts   read/write the 7 refine params in the URL (safe defaults)
hooks/useLocations.ts           RQ → GET /api/locations          key ['locations']
hooks/useHotels.ts              RQ → GET /api/hotels?country&city key ['hotels', country, city]
hooks/useFilteredHotels.ts      PURE → lib/filters → sort → paginate over a loaded Hotel[]
hooks/useAvailability.ts        RQ → GET /api/hotels/[id]/rooms   key ['availability', id, in, out]
```

**Data flow (home `/`, built in M4):**

```
useSearchParamsState() ─ country,city ─▶ useHotels({country,city})  ─▶ Hotel[] (location subset)
                       └ stars,min,max,sort,page ─▶ useFilteredHotels(hotels, params) ─▶ page view
```

**Data flow (detail `/hotels/[id]`, built in M5):**

```
useAppDates() ─ checkIn,checkOut ─▶ useAvailability(id, checkIn, checkOut) ─▶ AvailableRoom[]
```

The page reads the URL via `useSearchParamsState`, passes the relevant params into
each hook. `useFilteredHotels` receives params as **arguments** (keeps it pure and
unit-testable in isolation; the page owns the URL→args wiring).

---

## 4. App Router Rendering Constraint (must decide here)

`useSearchParams()` reads request-time data, so any client component that calls it
(directly or via `useSearchParamsState`) **opts its route out of static rendering**
and triggers a build-time bail-out error unless it is wrapped in a `<Suspense>`
boundary. The roadmap wants `/` to ship as a static shell with LCP < 2.5s.

**Decision:** the search-params-reading subtree is wrapped in a `<Suspense>`
boundary (a thin fallback) so the surrounding shell stays statically renderable.
M3 defines `useSearchParamsState` to *require* a `<Suspense>` ancestor and
documents it; M4 places the boundary when it builds the page. This is
forward-compatible with the Phase-2 SSG/ISR plan and costs only a wrapper.

(Rejected: making `/` fully dynamic/SSR in Phase 1 — sacrifices the static-shell
LCP win for no benefit, since the shell content is param-independent.)

---

## 5. `QueryProvider` (`stores/QueryProvider.tsx`)

A `'use client'` component that creates one `QueryClient` (via `useState` so it is
stable across re-renders and not shared between requests) and renders
`<QueryClientProvider>`. Mounted once in the root layout.

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,          // 1 min; hooks override as needed
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

Per-hook overrides (e.g. `useLocations` → `staleTime: Infinity`) are set in the
hooks, not here. Defaults chosen for a small, slow-third-party dataset: low retry,
no focus refetch (avoids surprise re-fetches of the slow availability call).

---

## 6. `AppProvider` (`stores/AppProvider.tsx`)

A `'use client'` context holding the two manual dates. Deliberately dumb — it stores
and exposes; **validation lives in M5's `RoomAvailability` component**, not here.

```ts
type AppDates = {
  checkIn: string | null;   // ISO date, e.g. "2026-07-10"
  checkOut: string | null;
  setCheckIn: (d: string | null) => void;
  setCheckOut: (d: string | null) => void;
};

function useAppDates(): AppDates;   // throws if used outside <AppProvider>
```

- Initial state: both `null` (no fetch until both are set — see §9).
- No URL sync, no persistence (assumptions §: dates entered each visit).
- `useAppDates` throws a clear error when called outside the provider (catches
  wiring mistakes early).

---

## 7. `lib/fetcher.ts`

One typed wrapper so every query hook shares fetch/error behavior:

```ts
class ApiError extends Error {
  status: number;
  constructor(status: number, message: string);
}

async function getJson<T>(url: string): Promise<T>;
```

- `getJson` does `fetch(url)`, and on non-2xx throws `ApiError(res.status, …)` so
  React Query's `isError`/`error` carries the HTTP status (M6 boundaries and M4/M5
  inline errors can branch on it). On 2xx, returns `res.json()` typed as `T`.
- Pure transport — no retry/caching here (React Query owns that).

---

## 8. URL state — `hooks/useSearchParamsState.ts`

Hand-rolled over Next's `useSearchParams` / `useRouter` / `usePathname` (no extra
dependency, matching the project's minimal-dep ethos).

```ts
type SortKey = 'price-asc' | 'price-desc' | 'rating' | 'stars';

type RefineState = {
  country: string | null;       // slug
  city: string | null;          // slug
  stars: number | null;         // min stars; null = no star filter
  min: number | null;           // price min
  max: number | null;           // price max
  sort: SortKey;                // default 'price-asc'
  page: number;                 // default 1, >= 1
};

function useSearchParamsState(): {
  state: RefineState;
  setParams: (patch: Partial<RefineState>) => void;
};
```

**Read (parse + safe defaults):**

- `country`/`city` → raw slug string or `null` if absent.
- `stars`/`min`/`max` → parsed number, or `null` if absent/NaN.
- `sort` → validated against the `SortKey` union; unknown/absent → `'price-asc'`.
- `page` → `Math.max(1, parseInt)`; absent/NaN/`<1` → `1` (final clamp to
  `totalPages` happens in `paginate`, M1).

**Write (`setParams`):**

- Merges the patch onto current params, drops keys set to `null`, and calls
  `router.replace(pathname + '?' + qs)` — `replace` (not `push`) so refine tweaks
  don't flood history; back/forward still restores prior *committed* states.
- **Page-reset rule:** if the patch changes any of `country, city, stars, min,
  max, sort` and does **not** itself set `page`, `page` is reset to `1`. (Matches
  M4 "changing filters or sort resets to page 1".)
- Stable serialization (sorted keys) so URLs are deterministic and test-assertable.

**Hydration:** reads via `useSearchParams()` (client) under the §4 `<Suspense>`
boundary; no `window.location` access, so no SSR/CSR mismatch.

---

## 9. The data hooks

### 9.1 `useLocations`

```ts
function useLocations(): UseQueryResult<Location[]>;
```

- Key `['locations']`; `queryFn` → `getJson<Location[]>('/api/locations')`.
- `staleTime: Infinity` (the destination list is tiny and effectively static — fetch
  once per session). Feeds the dropdown; client does substring filtering in memory
  (M4), so no per-keystroke refetch.

### 9.2 `useHotels`

```ts
function useHotels(query: { country?: string | null; city?: string | null }):
  UseQueryResult<Hotel[]>;
```

- Key `['hotels', query.country ?? null, query.city ?? null]`.
- `queryFn` → `getJson<Hotel[]>('/api/hotels?' + qs)` (only defined params serialized).
- `enabled: !!(query.country || query.city)` — **location-first**: nothing loads
  until a destination is chosen. Changing country/city is a new key → a new fetch,
  while previous results stay cached.

### 9.3 `useFilteredHotels` (pure)

```ts
function useFilteredHotels(
  hotels: Hotel[],
  params: { stars: number | null; min: number | null; max: number | null;
            sort: SortKey; page: number },
): { items: Hotel[]; page: number; totalPages: number; total: number };
```

- **No fetch, no store.** Composes M1's pure logic over the loaded subset:
  `filterByStars` (skip when `stars` null) → `filterByPrice` (skip when both
  null; open-ended when one null) → `sortHotels(sort)` → `paginate(page)`.
- Memoized with `useMemo` keyed on `(hotels, params)` to hold the <100ms budget and
  avoid recompute on unrelated renders.
- Returns the `paginate` result shape (`items/page/totalPages/total`), so the page
  gets the clamped page and total-pages directly.

### 9.4 `useAvailability`

```ts
function useAvailability(id: string, checkIn: string | null, checkOut: string | null):
  UseQueryResult<AvailableRoom[]>;
```

- Key `['availability', id, checkIn, checkOut]`.
- `queryFn` → `getJson<AvailableRoom[]>('/api/hotels/' + id + '/rooms?check_in=…&check_out=…')`.
- `enabled: !!(checkIn && checkOut && checkOut > checkIn)` — no fetch on partial or
  invalid ranges (M1's service would 400; we gate before calling).
- `retry: 2` here (the slow third-party path benefits from a couple of retries);
  SWR keeps the last good result visible while refetching.
- **Latest-wins is structural, not cancellation.** The component subscribes to the
  *current* `[id, checkIn, checkOut]` key. If the user changes dates mid-flight, a
  late response for the *old* dates resolves into that old key's cache entry and is
  never the data the component reads — so the newest selection always wins without
  any manual abort logic.

---

## 10. Error Handling

M3 surfaces errors; it does not render them (boundaries + inline UI are M6/M4/M5).

| Source                         | M3 behavior                                                       |
| ------------------------------ | ----------------------------------------------------------------- |
| Non-2xx from `/api/*`          | `getJson` throws `ApiError(status)`; RQ exposes `isError`/`error` |
| Network failure / timeout      | RQ retry (per-hook count) then `isError`; `refetch()` available    |
| Partial/invalid dates          | `useAvailability` stays `enabled:false` → never fetches (no error) |
| No location selected           | `useHotels` stays `enabled:false` → idle, no fetch                 |
| Empty result (`[]`)            | A valid success, **not** an error (drives M4/M5 empty states)      |

`useAppDates`/`useSearchParamsState` misuse outside their provider/Suspense throws a
developer-facing error (fail fast in dev).

---

## 11. Testing Strategy (TDD, ≥85% coverage)

Written test-first per the implementation plan. jsdom environment (these are client
hooks). Two harnesses by hook kind:

**Pure / navigation hooks — no MSW:**

- **`useFilteredHotels`** — call directly with `makeHotel` fixtures (M1's
  `tests/fixtures.ts`): star floor, price any-room-in-range, open-ended price (one
  bound null), each sort key, pagination clamp; assert the `{items,page,totalPages,
  total}` shape; assert no mutation of the input array.
- **`useSearchParamsState`** — mock `next/navigation` (`useSearchParams`,
  `useRouter`, `usePathname`); parse defaults (bad `sort`→`price-asc`, bad
  `page`→1, absent numbers→null); `setParams` round-trip and key-drop on `null`;
  **page-reset** when a filter/sort changes; no page-reset when the patch itself
  sets `page`.
- **`lib/fetcher`** — stub `global.fetch`: 2xx returns typed JSON; non-2xx throws
  `ApiError` with the right `status`.

**Query hooks — `renderHook` + `QueryClientProvider` + MSW:**

A shared test wrapper builds a fresh `QueryClient` per test (retries off, gc short)
and MSW serves `/api/*` from M0's handlers.

- **`useLocations`** — resolves to the locations array; second mount within the test
  doesn't refetch (infinite stale) — assert one MSW hit.
- **`useHotels`** — `enabled:false` (no country/city) → never fetches (`isLoading`
  stays, MSW untouched); with a country slug → fetches and returns the subset;
  changing the key triggers a new fetch while the old key stays cached.
- **`useAvailability`**:
  - partial dates / `checkOut <= checkIn` → disabled, no request;
  - valid dates → returns rooms;
  - **latest-wins:** an MSW handler delays the response for an old date pair; assert
    that after switching dates the hook reflects the *new* key's data and never the
    stale delayed payload (drives the §9.4 guarantee).
- **error path** — MSW returns 500 → `isError` true, `error` is an `ApiError` with
  `status 500`.

---

## 12. Decisions & Open Items

**Resolved decisions:**

- URL state = **hand-rolled `useSearchParamsState`** (no `nuqs` dependency).
- `useFilteredHotels` takes refine params as **arguments** (pure); the page wires
  URL→args.
- Search-params subtree wrapped in **`<Suspense>`** to keep `/` a static shell (§4).
- `AppProvider` holds **dates only**, dumb store; validation deferred to M5.
- Query hook tests use **MSW**; pure/navigation hooks mock directly.
- `QueryClient` defaults: `staleTime 60s`, `retry 1`, no focus refetch;
  `useLocations` overrides to `staleTime: Infinity`, `useAvailability` to
  `retry: 2`.

**Deferred to later milestones (not M3):** all page/component UI and the
`<Suspense>` placement (M4/M5), error/loading/not-found boundaries and the `track()`
facade (M6), `/api/*` route handlers (M2), vendor observability (P2).
