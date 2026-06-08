# M4 — Search · Filter · Sort · Paginate (Home `/`) — Design Spec

> Phase 1, Milestone M4 (see `docs/progress.md`). The discovery dashboard: pick a
> destination → browse that location's hotels → refine (star + price), sort, and
> paginate, then click through to a hotel. Covers PRD **F1, F2, F3**.
> Sources: `docs/designs/home-page-design-spec.md` (visual contract),
> `docs/designs/home-page-mockup.html` (rendered reference + component breakdown),
> `architecture.md`, `prd.md`, `user-flows.md`, and the M1/M3 specs.

**Status:** approved design — implementation plan follows in
`docs/superpowers/plans/2026-06-08-m4-search-filter-sort.md`.

**Build to mockup:** [home-page-mockup.html](../../designs/home-page-mockup.html)
(open in a browser) · contract
[home-page-design-spec.md](../../designs/home-page-design-spec.md). Match layout,
tokens, and every empty/loading state. This spec governs *how it's built in
Next/React*; the design spec governs *how it looks*.

---

## 1. Goal & Scope

**Goal.** Assemble the home page from M3's hooks and M1's pure logic into the
discovery experience the design spec describes — a static shell with a
client-rendered, URL-driven refine/sort/paginate subtree — matching the mockup at
every breakpoint and state, mobile-first, WCAG 2.1 AA.

**In scope (M4):**

- `app/page.tsx` — server component: route `metadata` + static shell + the
  `<Suspense>` boundary M3 §4 deferred here.
- `components/home/HomeView.tsx` — the `'use client'` orchestrator that reads the
  URL and wires the hooks to the UI.
- Presentational + interactive components: `DestinationCombobox`, `RefineToolbar`
  (desktop) + `MobileFilterBar` + `FilterSheet` (bottom sheet), `SegmentedStars`,
  `PriceRange`, `SortSelect`, `ResultCount`, `HotelGrid`, `HotelCard`,
  `HotelCardSkeleton`, `Pagination`, and a reusable `EmptyState`.
- App-level branding: `<title>` template + meta description (root layout) and the
  map-pin favicon `app/icon.svg`.
- `utils/analyticUtil.ts` — the **typed `track()` interface** the UI calls;
  no-op/console-DEV body now, real adapters wired in **M6**.
- The two cross-milestone reconciliations §3 names (default sort `rating`, page size 8).
- RTL component tests + one MSW integration test for the full
  destination → filter → sort → paginate flow (≥85% coverage on M4 modules).

**Out of scope (later milestones):** the hotel detail page and availability (M5);
the `track()` vendor adapters, route error/loading/not-found boundaries, and the
full a11y/perf audit (M6); Playwright E2E (M7); full SEO — canonical/OG/JSON-LD/
sitemap (Phase 2).

**Depends on M0–M3.** M0: Next App Router + TS + Tailwind v4 + Jest/RTL/MSW. M1:
domain types + `lib/{slug,filters,sort,paginate}`. M3: `useLocations`, `useHotels`,
`useFilteredHotels`, `useAvailability`, `useSearchParamsState`, `AppProvider`,
`QueryProvider` (mounted in the root layout). M2: the `/api/*` routes the hooks
fetch. The plan notes the minimal stand-in for any upstream piece not yet present.

---

## 2. Rendering Architecture (resolves M3 §4)

`useSearchParams()` reads request-time data; any client component that calls it
(directly or via `useSearchParamsState`) opts its route out of static rendering and
**build-fails** unless wrapped in a `<Suspense>` boundary. The roadmap wants `/` to
ship as a static shell (LCP < 2.5s). M3 §4 decided the boundary, deferred placement
to M4. **M4 places it:**

```
app/page.tsx                         SERVER component (no 'use client')
  ├─ export const metadata             title "Stayfinder — Find your stay" + description
  ├─ <header> app bar (brand)          static shell — param-independent
  ├─ <main>
  │    └─ <Suspense fallback={<HomeViewFallback/>}>
  │          <HomeView/>               ← the only search-params-reading subtree
  │       </Suspense>
  └─ <footer> slim build stamp         static shell
```

- The shell (app bar, hero heading, footer) is param-independent and stays
  statically renderable. Only `HomeView` reads the URL, so only it sits under
  `<Suspense>`. Forward-compatible with the Phase-2 SSG/ISR plan.
- `HomeViewFallback` is a thin skeleton (hero + 8 `HotelCardSkeleton`s) so the first
  paint matches the loaded layout (no CLS).
- Everything from `HomeView` down is `'use client'` (hooks, RQ, navigation).

---

## 3. Cross-milestone reconciliations (decided for M4)

Two spots where the design contract outruns what M1/M3 currently encode. M4 owns
the reconciliation; both are small and additive.

### 3.1 Sort options + default (no `recommended`)

The design spec lists 5 sort options including a "Recommended" default. **The seed
has no `recommended` field**, and synthesizing one (composite score or extra
tiebreak) was rejected — there's no data to back it. So M4 **drops "Recommended"
entirely** and ships the **4** sort keys M1 already defines (`price-asc |
price-desc | rating | stars`) — `SortKey` is unchanged, `lib/sort.ts` needs no edit.

- **Default sort = `'rating'`** (Rating: Highest — `overallRating` desc). This
  replaces both the design's removed "Recommended" default and M3's interim
  `price-asc` default; it best preserves the design's "surface the best hotels
  first" intent (price-asc would anchor on the cheapest). Change M3's `DEFAULT_SORT`
  from `'price-asc'` to `'rating'` and update its parse/serialize tests.
- It is the omit-from-URL default: `?sort=` appears only for non-default sorts.

> URL `sort` values are the **code identifiers** (`rating` default · `price-asc` ·
> `price-desc` · `stars`) — one hyphen-style vocabulary matching the existing
> `SortKey` union. The `SortSelect` option **labels** are the human strings
> ("Rating: Highest", "Price: Low to High", "Price: High to Low", "Stars: Highest").

### 3.2 Page size = 8

The design contract says **page size 8** (`HotelGrid` + `Pagination`); M1's
`lib/paginate.ts` defines `PAGE_SIZE = 12`. No other Phase-1 consumer needs 12, and
the design spec is authoritative on layout. M4: **change the `PAGE_SIZE` constant in
`lib/paginate.ts` to 8** (update M1's paginate test expectations). `useFilteredHotels`
keeps calling `paginate(result, page)` with the default size — no signature change.

---

## 4. Module Structure

All new UI lives under `components/home/` (a focused folder; `EmptyState` is generic
enough to live at `components/EmptyState.tsx` for reuse by M5). Presentational
components take props and call back; only `HomeView` touches hooks/URL — so each
card/control is unit-testable in isolation.

```
app/page.tsx                         server: metadata + shell + <Suspense>
app/layout.tsx                       (modify) title template + favicon link
app/icon.svg                         map-pin brand mark → favicon

components/home/HomeView.tsx         'use client' orchestrator (hooks ↔ UI)
components/home/HomeViewFallback.tsx Suspense fallback skeleton
components/home/DestinationCombobox.tsx
components/home/RefineToolbar.tsx    desktop inline toolbar (≥ sm)
components/home/MobileFilterBar.tsx  sticky "Filters" button + inline sort (< sm)
components/home/FilterSheet.tsx      mobile bottom-sheet dialog (star + price)
components/home/SegmentedStars.tsx   Any / 3★+ / 4★+ / 5★
components/home/PriceRange.tsx       two USD number inputs (min / max)
components/home/SortSelect.tsx       4 options (rating default, price-asc/desc, stars)
components/home/ResultCount.tsx      aria-live="polite" count
components/home/HotelGrid.tsx        responsive 1/2/3/4 cols; renders skeletons
components/home/HotelCard.tsx        one hotel; whole card → /hotels/[id]
components/home/HotelCardSkeleton.tsx
components/home/Pagination.tsx       page size 8; hidden on single page
components/EmptyState.tsx            icon + message + optional action (reusable)
components/Icon.tsx                  inline-SVG icon set (pin, building, search, …)

lib/destinations.ts                  buildDestinationOptions(locations) → option rows (pure)

utils/analyticUtil.ts                track(event, payload) typed facade (DEV no-op)

lib/paginate.ts                      (modify) PAGE_SIZE 12 → 8
hooks/useSearchParamsState.ts        (modify) DEFAULT_SORT → 'rating'
                                     (lib/sort.ts unchanged — 4 keys already exist)
```

---

## 5. Data flow (`HomeView`)

`HomeView` is the single wiring point; everything below it is pure presentation.

```
useSearchParamsState() → { state, setParams }
   state.country, state.city ─▶ useHotels({country, city})  ─▶ hotels: Hotel[] | undefined
   state.{stars,min,max,sort,page} + hotels
        ─▶ useFilteredHotels(hotels ?? [], {stars,min,max,sort,page})
           ─▶ { items, page, totalPages, total }
useLocations() ─▶ Location[] ─▶ buildDestinationOptions() ─▶ DestinationCombobox options

DestinationCombobox onSelect(opt) ─▶ setParams(opt.params)  (country, or country+city)
SegmentedStars   onChange(stars)   ─▶ setParams({ stars })   (page→1 via M3 rule)
PriceRange       onCommit(min,max) ─▶ setParams({ min, max })
SortSelect       onChange(sort)    ─▶ setParams({ sort })
Pagination       onPage(p)         ─▶ setParams({ page: p })
```

- **Location-first:** `useHotels` is `enabled` only when a country/city is set; until
  then `HomeView` renders the **No-destination** state (hero + combobox + prompt),
  no grid, no fetch.
- **In-memory refine:** filter/sort/paginate is `useFilteredHotels` over the loaded
  subset — **no refetch** on filter/sort/page change (< 100ms budget). Changing any
  filter or sort resets `page` to 1 (M3's `nextState` rule; `Pagination` is the only
  caller that sets `page` directly).
- **Slug writes:** the combobox writes slugified params from the chosen option — a
  **country** row writes `?country=usa` (no city → all that country's hotels), a
  **city** row writes `?country=usa&city=chicago`. Slugs come from M1's
  `Location.countrySlug`/`citySlug`; `useHotels` passes them through and M1's slug
  lookup resolves them server-side (M1 `getHotelsByLocation` already handles
  country-only → all hotels in that country).

---

## 6. Component contracts (the ones with real logic)

The card/skeleton/empty/pagination/segmented/sort components are thin and follow the
mockup verbatim. The two with genuine behavior:

### 6.1 Destination options (`lib/destinations.ts`) + `DestinationCombobox`

The option list mixes **country-group rows and city rows** (matching the mockup's
`buildDestinations`), so a user can pick a whole country *or* one city — satisfying
F1's "selecting country loads all its cities; selecting city loads that city only."

**`buildDestinationOptions(locations: Location[]): DestinationOption[]`** (pure):

```ts
type DestinationOption =
  | { kind: 'country'; label: string;  // "All hotels in USA"
      count: number; search: string; key: string; params: { country: string } }
  | { kind: 'city'; label: string;     // "Chicago, IL — USA"
      count: number; search: string; key: string; params: { country: string; city: string } };
```

- Group `locations` by country (preserving M1's deterministic order); for each
  country emit a **country row** (`params: { country: countrySlug }`,
  `count` = its city count) followed by its **city rows** (`params: { country, city }`),
  cities alphabetical. `search` lowercases name+state+country for substring matching.
- `count` here is the number of cities/locations (M1 `Location[]` has no hotel
  counts); the mockup's per-row hotel count is cosmetic — the contract is the row's
  `params`, not the badge.

**`DestinationCombobox`:**

- **Props:** `options: DestinationOption[]`, `value: { country, city } | null`,
  `onSelect(opt: DestinationOption)`, `loading`, `error`, `onRetry`.
- **Filtering:** substring match (case-insensitive, diacritic-insensitive) on
  `option.search` — **in memory, no per-keystroke fetch**. Country rows render their
  `label` ("All hotels in USA"); city rows render **"City, State — Country"**.
- **Selecting** a row calls `onSelect(opt)`; `HomeView` writes `opt.params` to the
  URL — a country row → `?country=usa`, a city row → `?country=usa&city=chicago`.
- **Empty input →** show all options. **No match →** non-selectable
  **"No destinations"** row.
- **Keyboard:** `↑/↓` move active option, `Enter` selects, `Esc` closes; `role="combobox"`
  + `role="listbox"`/`option`, `aria-activedescendant`, `aria-expanded`. Options ≥ 44px.
- **States:** `loading` → disabled input + hint; `error` (locations fetch failed) →
  disabled/empty dropdown + inline **Retry** (`onRetry` → `useLocations().refetch`).

### 6.2 `PriceRange`

- **Props:** `min: number|null`, `max: number|null`, `onCommit(min, max)`.
- Two number inputs (USD). Commits on blur / Enter (not per-keystroke) to avoid URL
  thrash. **`min > max` → normalize by swapping** before committing (never crash,
  never block). Empty input → that bound is `null` (open-ended, per M3/M1).

### 6.3 Mobile refine: `MobileFilterBar` + `FilterSheet`

- Below `sm`: a **sticky** bar with a "Filters" button (+ active-filter count badge)
  and an inline `SortSelect`. Tapping "Filters" opens `FilterSheet`.
- `FilterSheet` is a bottom-sheet `role="dialog" aria-modal="true"`: holds
  `SegmentedStars` + `PriceRange`, a **Reset** (clears stars/min/max) and a
  **"Show N"** apply button (≥ 44px, lower half for thumb reach). `Esc` and scrim
  click close it; focus is trapped while open; honors `prefers-reduced-motion`.
- At `sm`+ the sheet is unused; `RefineToolbar` shows the controls inline.

---

## 7. States (every state the page must render)

Mirrors the design spec §6 / `user-flows.md` acceptance criteria.

| State | Trigger | UI |
| --- | --- | --- |
| **No destination** | no `country`/`city` in URL | hero + combobox (focused) + `EmptyState` "Start by choosing a destination"; no grid, no fetch |
| **No destination match** | combobox text matches nothing | dropdown shows non-selectable "No destinations" |
| **Loading hotels** | destination set, `useHotels` fetching | 8 `HotelCardSkeleton`s; `ResultCount` reads "Loading hotels…" |
| **Loaded** | hotels returned | grid of `HotelCard`; `ResultCount` "N hotels" / "1 hotel" (aria-live) |
| **No hotels found** | filters exclude all | `EmptyState` "No hotels found" + "Try widening your filters" + **[Reset filters]** (clears stars/min/max) |
| **Single page** | `totalPages ≤ 1` | `Pagination` hidden |
| **Slugified params** | `?country=united-kingdom&city=london` | hydrates combobox + filters from URL; back/forward restores exactly |
| **Bad params** | `page=99`, `sort=x`, `min>max` | clamp page (M1), default sort (M3), swap price (§6.2) — never error |
| **Locations slow/fail** | `/api/locations` errors | disabled/empty combobox + Retry |

`useFilteredHotels` returning `[]` is a **success**, not an error — it drives the
"No hotels found" empty state (distinct from the loading and no-destination states).

---

## 8. Analytics (`utils/analyticUtil.ts`)

M4 ships the **interface only**; M6 wires real adapters. Per the design spec §8.

```ts
export type AnalyticsEvent =
  | { name: 'search_performed'; city: string | null; country: string | null;
      filters: { stars: number | null; min: number | null; max: number | null; sort: string } }
  | { name: 'no_results'; filters: { stars: number | null; min: number | null; max: number | null } };
// 'hotel_viewed' is owned by the detail page (M5); 'availability_*' by M5.

export function track(event: AnalyticsEvent): void;
```

- **Body now:** in DEV, `console.debug('[track]', event)`; in PROD, no-op. No vendor
  SDK in Phase 1 (assumptions §11). M6 swaps the body for pluggable adapters; **call
  sites in M4 don't change.**
- **Call sites (M4):** `search_performed` when a destination is selected or a
  filter/sort is applied; `no_results` when `useFilteredHotels` yields `total === 0`
  on a loaded location. Fire from `HomeView` effects so presentational components
  stay pure.

---

## 9. Accessibility & mobile-first (non-negotiable, from the design spec)

- Semantic landmarks (`<header>/<nav>/<main>/<footer>`), one `<h1>` ("Find your
  stay"), skip-to-content link.
- Every control labelled; `ResultCount` and (M5) availability use
  `aria-live="polite"`. Combobox a11y per §6.1.
- Visible `:focus-visible` ring (never removed); contrast ≥ 4.5:1 text / ≥ 3:1 UI;
  **no color-only signals** (pair icon + text).
- Verified at **360px first**; tap targets ≥ 44×44px, ≥ 8px apart; refine collapses
  to sticky bar + bottom sheet; **no horizontal scroll** at any width.
- Placeholder photos reserve 16:9 space (CSS `aspect-ratio`) so images never cause
  **CLS**; prices USD with `tabular-nums`. Honor `prefers-reduced-motion`.

(The formal a11y/perf audit is M6; M4 builds to these rules so the audit passes.)

---

## 10. Testing strategy (TDD, ≥85% coverage on M4 modules)

jsdom + RTL; MSW (from M3's `tests/msw/`) for the integration test. Test-first per
the implementation plan.

**Pure / additive logic (no React):**

- `lib/paginate.ts` — `PAGE_SIZE === 8`; existing clamp tests updated to 8.
- `hooks/useSearchParamsState.ts` — `DEFAULT_SORT` is `rating`; `sort=rating`
  omitted from URL; unknown sort → `rating`.
- `lib/destinations.ts` — `buildDestinationOptions`: one country row + its city rows
  per country, deterministic order; country row `params` has `country` only, city row
  has `country`+`city`; `search` is lowercased/diacritic-free.

**Component tests (RTL, props in / callbacks out — no hooks):**

- `DestinationCombobox` — substring + diacritic filter over mixed country/city rows;
  selecting a **country** row emits `{country}` only, a **city** row emits
  `{country,city}`; "No destinations" on no match; empty input shows all; keyboard
  ↑/↓/Enter/Esc; loading/error (Retry) states.
- `PriceRange` — commit on blur; `min>max` swaps; empty → null.
- `SegmentedStars` / `SortSelect` — render options, emit on change, reflect value.
- `HotelCard` — both ratings + review count + "from $X"; humanized amenity pills +
  "+N"; whole-card link to `/hotels/[id]`; descriptive `aria-label`.
- `Pagination` — hidden when `totalPages ≤ 1`; emits page; clamps display.
- `EmptyState` — renders icon/message/action; fires action callback.
- `FilterSheet` — opens/closes (Esc, scrim); Reset clears; "Show N" applies; focus
  trapped; `aria-modal`.

**Integration test (RTL + MSW — M4's "Done when"):** render the **`HomeView`
client subtree** (wrapped in `QueryProvider` + `AppProvider` + a `<Suspense>`),
**not** `app/page.tsx` — a server component doesn't render cleanly under jsdom in the
App Router. Mock `next/navigation` (as M3's `useSearchParamsState` test does) so URL
reads/writes are assertable. Then drive the **full flow**: select a destination →
hotels load (skeletons → cards) → apply a star filter (count updates via aria-live,
page resets) → change sort (order changes, no refetch) → paginate. Assert the URL
reflects each step and back/forward restores. Include a filters-exclude-all path →
"No hotels found" + Reset, and a `/api/locations` failure → combobox Retry.

---

## 11. Decisions & open items

**Resolved (this spec):**

- `/` = **static shell + `<Suspense>`-wrapped client `HomeView`** (places M3 §4).
- **"Recommended" sort dropped** (no `recommended` field in the seed; synthesizing
  one rejected). Ship M1's 4 existing keys; **default = `rating`** (M3 `DEFAULT_SORT`
  changes `price-asc` → `rating`) (§3.1).
- **Page size = 8**: `lib/paginate.ts` `PAGE_SIZE` 12 → 8 (§3.2).
- **No new dependencies** — combobox and bottom sheet are hand-rolled (mockup parity,
  minimal-dep ethos).
- **`utils/analyticUtil.ts`** exposes the typed `track()` now (DEV console / PROD
  no-op); M6 wires adapters; M4 call sites are final.
- **Both ratings on the card** (`starRating` badge + `overallRating` + `reviewCount`)
  and **star filter = minimum "& up"** — already resolved upstream; restated for the
  card/segmented contracts.
- Combobox offers **both country-group rows and city rows** (`lib/destinations.ts`
  builder, mockup parity): a country row loads all that country's hotels
  (`?country=`), a city row loads one city (`?country=&city=`) — fully covering F1
  (§6.1).

**Deferred (not M4):** hotel detail + availability and `hotel_viewed`/availability
events (M5); `track()` vendor adapters, route error/loading/not-found boundaries,
formal a11y + perf audit (M6); Playwright E2E (M7); full SEO (Phase 2).
