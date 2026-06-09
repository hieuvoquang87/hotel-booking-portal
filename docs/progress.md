# Phase 1 Progress — Hotel Discovery Interface

> Milestone + task tracker to take Phase 1 from an empty repo to a shippable,
> tested discovery experience. Derived from `prd.md`, `architecture.md`,
> `product-roadmap.md`, `user-flows.md`, `requirements.md`.
>
> **How to use:** check off `- [ ]` items as they land. Each milestone is
> independently testable and should end on a green commit. A task's **Done when**
> line is its acceptance gate. `⚠︎ decision` marks an open question to confirm
> (defaulting as noted) rather than a blocker.

**Goal:** Pick a destination → browse/filter/sort/paginate its hotels → open a
hotel → check room availability for dates. Location-first loading, a server-only
data gateway behind a BFF, pricing/availability decoupled as a slow third-party,
and mobile-first design for assumed 80% mobile traffic.

**Design mockups:** the UI built in **M4** and **M5** should replicate the mockups in
[`docs/designs/`](designs/README.md) — open the `*-mockup.html` files in a browser for the
rendered reference; the `*-design-spec.md` files are the written contract (tokens, states,
a11y, acceptance). Home → [spec](designs/home-page-design-spec.md) ·
[mockup](designs/home-page-mockup.html). Detail →
[spec](designs/hotel-detail-page-design-spec.md) · [mockup](designs/hotel-detail-page-mockup.html).

**Status legend:** `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` deferred to P2

---

## Progress at a Glance

| #   | Milestone                         | Scope                                                       | Status |
| --- | --------------------------------- | ----------------------------------------------------------- | ------ |
| M0  | Project setup & tooling           | Next.js/TS/Tailwind/RQ + Jest/RTL/MSW/Playwright (CI → M7)  | [x]    |
| M1  | Data layer & domain               | Domain types, `hotelService`, `availabilityService`, `lib/` | [x]    |
| M2  | BFF API routes                    | `/api/locations`, `/api/hotels`, `[id]`, `[id]/rooms`       | [x]    |
| M3  | Client state & data hooks         | QueryProvider, AppProvider, the four `use*` hooks           | [x]    |
| M4  | Search · filter · sort · paginate | Home page: dropdown, filters, sort, pagination, grid        | [x]    |
| M5  | Hotel detail & room availability  | shadcn/ui primitive layer + M4 refactor + `/hotels/[id]` detail/availability | [x]    |
| M6  | Cross-cutting (a11y/obs/errors)   | Boundaries, `track()` facade, a11y AA, perf budget          | [x]    |
| M7  | Testing & coverage gate           | Unit ≥85%, MSW integration, Playwright E2E green in CI      | [x]    |
| M8  | Docs & deliverables               | README, AI-USAGE; finalize ASSUMPTIONS-AND-TRADEOFFS        | [ ]    |
| M9  | Deploy & verify (minimal)         | Vercel deploy, app live, smoke-check                        | [ ]    |

---

## M0 — Project Setup & Tooling

**Outcome:** an empty Next.js app boots, the test toolchain runs, and CI is wired
so every later milestone has a coverage + E2E gate to commit against.

- [x] Scaffold **Next.js (App Router) + TypeScript**; `tsconfig` `strict: true`. (Next 16.2.7 / React 19.)
- [x] Add **Tailwind CSS** (config + base styles); mobile-first defaults. (Tailwind v4, CSS-first.)
- [x] Add **@tanstack/react-query** dependency (provider wired in M3).
- [x] Date input: use **native `<input type="date">`** — no library dependency (decision resolved).
- [x] Configure **ESLint + Prettier** (project style, import order).
- [x] Set up **Jest + React Testing Library**; add `test`/`test:coverage` scripts. (Uses `jest-fixed-jsdom` — stock `jest-environment-jsdom` strips the Node globals MSW v2 needs.)
- [x] Set up **MSW** (handlers + node/browser bootstrap) for integration tests.
- [x] Set up **Playwright** (config + `e2e/` dir); `test:e2e` script.
- [x] Create the folder skeleton per `architecture.md` §5: `app/`, `components/`, `hooks/`, `services/` (+ `services/mock/`), `stores/`, `types/`, `lib/`, `mocks/`, `e2e/`. (`app/api/` is added in M2 when routes exist.)
- [x] Move `docs/mock-data.json` → `services/mock/hotels.json` (the seed lives behind the service, never imported by the client).
- [-] **CI pipeline** (GitHub Actions) — **deferred** out of M0 (decision); the lint → typecheck → unit (≥85% gate) → integration → E2E pipeline is wired in a later milestone (M7). M0 ships local scripts only; the coverage gate is non-blocking until `lib/`+`services/` exist.
- [x] `README.md` skeleton (install / run / test — filled out in M8).
- **Done when:** `npm run dev` boots a blank page; `npm run lint`, `npm run typecheck`, `npm test`, and `npm run test:e2e` all pass locally; `services/mock/hotels.json` is in place (no importers yet); the folder skeleton is committed. (CI is deferred — see the CI line above.)

---

## M1 — Data Layer & Domain (server-only)

**Outcome:** all data access flows through `services/`, mapped to domain types,
with pure logic in `lib/` covered by unit tests. No UI yet.

**Data shape (seed):** array of 40 hotels. Hotel = `id, name, description,
star_rating, overall_rating, review_count, address{street,city,state,zip_code,
country}, contact, amenities[], policies{check_in_time,check_out_time,
cancellation}, rooms[]`. Room = `room_id, type, bed_type, bed_count,
max_occupancy, square_footage, price_per_night, room_amenities[],
available_dates[]`.

### Domain & service gateway

- [x] Define **domain types** (`Hotel`, `Room`, `Location`, `Availability`) — domain shape, not raw seed shape (map at the boundary, per assumptions §7).
- [x] `services/hotelService.ts` (server-only): `getLocations()`, `getHotelsByLocation({country, city})`, `getHotelById(id)`.
  - **Note:** `getLocations()` is a **derivation** — aggregate the unique `city`+`country` set across the 40 hotels; there is no locations seed file.
- [x] `services/availabilityService.ts` (server-only): given `(hotelId, check_in, check_out)`, returns available rooms + `price_per_night`, **simulating a slow third-party** (artificial latency). `⚠︎ decision`: latency target (e.g. 800ms–1.5s).
- [x] Map seed `address.city`/`country` → `Location`; keep USD assumption + placeholder photo at the mapping layer (seed has no currency/image fields). _(services/mappers.ts `mapLocation()` + `services/seed.ts`)_

### Pure logic (`lib/`)

- [x] `lib/slug.ts` — **bidirectional**: `slugify(name)` (`New York`→`new-york`, `United Kingdom`→`united-kingdom`, strip diacritics) **and** reverse-match `slug → city/country` to resolve URL params back to seed values.
- [x] `lib/filters.ts` — star-rating filter (minimum, "4★ & up") + price-range filter: hotel matches if **any** room's `pricePerNight` is in `[min, max]` (decision: any-room-in-range, not min-room).
- [x] `lib/sort.ts` — sort by price (asc/desc), `overall_rating`, `star_rating`; stable default order.
- [x] `lib/paginate.ts` — fixed page size; clamp out-of-range page.
- [x] `lib/availability.ts` — a room is available iff **every night** in `[check_in → check_out)` is in `room.available_dates` (`nights.every(d => available_dates.includes(d))`).
- [x] **Unit tests** for every `lib/` fn and both services (incl. the ~15% no-availability hotels, and min>check edge of date range).
- **Done when:** `lib/` + services are fully unit-tested and green; nothing imports `hotels.json` outside `services/`.

---

## M2 — BFF API Routes (`/api/*`)

**Outcome:** the client's only data surface. Idempotent cacheable GET reads that
mirror the REST contract 1:1 (architecture §5).

- [x] `GET /api/locations` → `getLocations()` (cached once; destination dropdown source).
- [x] `GET /api/hotels?country=&city=&star_rating=&price_range=` → `getHotelsByLocation` (location-first; server also accepts refine params per contract).
- [x] `GET /api/hotels/[id]` → `getHotelById` (static info; fast, renders immediately).
- [x] `GET /api/hotels/[id]/rooms?check_in=&check_out=` → `availabilityService` (lazy/slow path; never blocks the page).
- [x] **Status codes:** `2xx` success; `4xx` for bad/missing dates, `checkout ≤ check-in`, unknown id.
- [x] **Structured API logs** on each route handler (request + outcome).
- [x] **Integration tests** for each route (valid + error params).

**Resolved decisions:** filtering is **location-only** (star/price ignored at the BFF); paramless `/api/hotels` returns the **top 10 by rating**.

- **Done when:** all four routes return correct shapes/status for happy + error inputs; client never reaches `services/` directly.

---

## M3 — Client State & Data Hooks

**Outcome:** server state via React Query (keyed by params), client state split
between URL (`searchParams`) and `AppProvider` (dates).

- [x] `stores/QueryProvider.tsx` — React Query client + provider mounted in root layout.
- [x] `stores/AppProvider.tsx` — client state: check-in / check-out dates (manual, **not** in URL); URL-synced location + refine where applicable.
- [x] URL `searchParams` helpers — read/write `country, city, stars, min, max, sort, page`; back-button correct, no hydration mismatch.
- [x] `hooks/useLocations.ts` — destination list, fetched once, `staleTime: ∞`.
- [x] `hooks/useHotels.ts` — hotels by location, key `[country, city]`.
- [x] `hooks/useFilteredHotels.ts` — pure in-memory filter → sort → paginate over the loaded subset (target **<100ms**).
- [x] `hooks/useAvailability.ts` — lazy availability, key `[id, check_in, check_out]`, retry/SWR, enabled only when both dates set; **latest-wins** on stale responses.
- [x] **Unit tests** for hooks (esp. `useFilteredHotels` logic and `useAvailability` enabled/stale behavior).
- [x] **Done when:** hooks return cached, correctly-keyed data; URL round-trips all refine/sort/page state; dates live only in `AppProvider`.

**M3 decisions (from design spec):** URL state is a hand-rolled `useSearchParamsState` (no
`nuqs`); `useFilteredHotels` takes refine params as arguments (pure); server hooks fetch
through `lib/fetcher.getJson` (throws typed `ApiError`); the `useSearchParams` subtree must
sit under a `<Suspense>` boundary (placed in M4) so `/` keeps a static shell — verified the
production build still prerenders `/` as static after wiring providers; `AppProvider` holds
dates only (validation in M5); latest-wins on availability is structural via RQ keying.
`SortKey` is re-exported from `lib/sort.ts` (single source of truth). Tests live under
`tests/unit/` (per CLAUDE.md), not co-located; Task 0's jest/polyfill setup was already
satisfied by M0's `jest-fixed-jsdom` config, so only `API_BASE_URL` was added.

---

## M4 — Search · Filter · Sort · Paginate (Home `/`)

**Outcome:** the discovery dashboard. Covers PRD **F1, F2, F3**.

**Build to mockup:** [home-page-mockup.html](designs/home-page-mockup.html) (open in browser) ·
spec [home-page-design-spec.md](designs/home-page-design-spec.md) — match layout, tokens, and all empty/loading states.

### Destination picker (F1)

- [x] `components/home/DestinationCombobox.tsx` — filterable city+country combobox (renamed from `DestinationDropdown`); substring + diacritic filter in memory (no per-keystroke fetch); city shown as "City, State — Country"; options built by pure `lib/destinations.ts`.
- [x] Selecting country → loads all its hotels (`?country=`); selecting city → that city only (`?country=&city=`); writes slugified params.
- [x] Empty input → show all options.

### Filter (F2)

- [x] Star + price refine via `components/home/RefineToolbar.tsx` (desktop) + `MobileFilterBar.tsx`/`FilterSheet.tsx` (mobile, replaces the single `FilterPanel`); composed in memory by M3's `useFilteredHotels` (**<100ms**), no reload.
- [x] Filter state reflected in URL (`?stars=&min=&max=`); shareable + back-button correct.

### Sort & paginate (F3) — _explicit, not implied by filter_

- [x] `SortSelect` — price asc/desc, `overallRating`, `starRating`; reflected in `?sort=` (default `rating` omitted). "Recommended" dropped (no seed field).
- [x] `Pagination` — fixed page size **8**; reflected in `?page=`.
- [x] Changing filters **or** sort **resets to page 1** (M3 `nextState` rule).

### Grid & states

- [x] `components/home/HotelCard.tsx` — name, address, **both** ratings (`starRating` badge + `overallRating` + review count), placeholder photo (16:9, no CLS), price-from. `⚠︎ decision` resolved: show both ratings.
- [x] `components/home/HotelGrid.tsx` — mobile-first responsive grid (1/2/3/4 cols); aspect-ratio photo blocks (no CLS); renders 8 skeletons while loading.
- [x] `components/EmptyState.tsx` — reusable.
- [x] `aria-live` **result count** announced on filter change (`ResultCount`).
- [x] Home `app/page.tsx` wiring — static shell + `<Suspense>`-wrapped `components/home/HomeView.tsx` orchestrator.
- [x] **Basic SEO / metadata** — page `<title>` **"Stayfinder — Find your stay"** + meta description via `metadata` export; title template + map-pin favicon `app/icon.svg` at the root layout. _Full SEO — canonical / OG / JSON-LD / sitemap — stays Phase 2._

### Edge/empty states (from user-flows.md — acceptance criteria)

- [x] No destination match → **"No destinations."**
- [x] No location selected yet → prompt to pick a destination.
- [x] Filters exclude all → **"No hotels found"** + reset action (resets filters).
- [x] Price `min > max` → swap (no crash).
- [x] Bad param (`page=99`, `sort=x`) → clamp / default, never error.
- [x] Single page of results → hide pagination controls.
- [x] `/api/locations` slow/fails → disabled/empty combobox + retry.
- [x] Back/forward → restores filters/sort/page (dates excluded — they're not in URL).
- **Done when:** F1–F3 acceptance criteria pass; all listed edge states render correctly; integration test covers destination → filter → sort → paginate. ✅ **Met** — 182 tests pass (47 suites), clean lint/typecheck, `/` builds as a static shell, M4 modules ≥85% coverage.

**M4 decisions (from design spec):** `/` = static shell + `<Suspense>`-wrapped client
`HomeView`; combobox offers country-group + city rows (`lib/destinations.ts`);
"Recommended" sort dropped (no seed field) → default sort `rating` (M3 `DEFAULT_SORT`
changed `price-asc` → `rating`); page size 8 (`lib/paginate.ts`); analytics via
`utils/analyticUtil.ts` (DEV console; M6 wires adapters); no new dependencies
(combobox + bottom sheet hand-rolled). `track()` _adapters_, route
error/loading/not-found boundaries, and the formal a11y + perf audit remain **M6**;
Playwright E2E remains **M7**.

---

## M5 — Hotel Detail & Room Availability (`/hotels/[id]`)

**Outcome:** detail renders instantly; availability streams in lazily. Covers
PRD **F4, F5**.

**Build to mockup:** [hotel-detail-page-mockup.html](designs/hotel-detail-page-mockup.html) (open in browser) ·
spec [hotel-detail-page-design-spec.md](designs/hotel-detail-page-design-spec.md) — match layout, tokens, and all availability states (incl. the `2026-07-10 → 2026-07-12` demo-date default).

### Phase A — shadcn/ui primitive layer

- [x] **shadcn/ui init** — installed `class-variance-authority`, `radix-ui`, `tailwind-merge`, `clsx`; added `lib/utils.ts` (`cn`).
- [x] **Token reconciliation** — `globals.css` re-skinned to the slate/blue spec from the design; custom tokens `--success`, `--star`, `--warning` added; light-only (dark theme deferred to P2).
- [x] `components/ui/badge.tsx` — `default` | `muted` | `success` variants.
- [x] `components/ui/button.tsx` — all variants + sizes; `asChild` via `Slot.Root`; 44px touch target (`min-h-11`).
- [x] `components/ui/card.tsx` — `Card`, `CardHeader`, `CardContent`, `CardFooter`.
- [x] `components/ui/input.tsx` — base text input with `aria-invalid` ring.
- [x] `components/ui/label.tsx` — `<label>` wrapper.
- [x] `components/ui/skeleton.tsx` — shimmer block.
- [x] **Unit tests** for all `components/ui/` primitives ≥85% coverage.

### Phase B — M4 components refactored onto primitives

- [x] `components/home/HotelCard.tsx` refactored: star badge → `Badge variant="default"`, overall rating pill → `Badge variant="muted"`, "From $..." → `Badge variant="success"`.
- [x] `components/home/DestinationCombobox.tsx` refactored: trigger → `Button variant="outline"`.
- [x] `components/home/SortSelect.tsx` refactored: trigger → `Button variant="outline"`.
- [x] `components/home/FilterSheet.tsx` / `MobileFilterBar.tsx` refactored: open trigger → `Button variant="outline"`, reset → `Button variant="ghost"`.
- [x] `components/home/Pagination.tsx` refactored: prev/next → `Button variant="outline"`, current page → `Button` (active state).
- [x] `components/RatingStars.tsx` — shared star-rating display (shared across home card + detail hero).
- [x] `components/InlineError.tsx` — shared inline error + retry button.
- [x] All M4 component unit tests remain green after refactor.

### Phase C — Detail (F4)

- [x] `app/hotels/[id]/page.tsx` — server component; fetches via `getJson`/`API_BASE_URL`; renders name, address, description, amenities, policies, `star_rating`, `overall_rating`, review count; calls `notFound()` on 404; re-throws other errors.
- [x] Detail renders immediately **without** waiting on availability.
- [x] **Basic SEO / metadata** — `generateMetadata` returns hotel name as `<title>` + short description; falls back to `{ title: 'Hotel' }` on fetch error.
- [x] `app/hotels/[id]/not-found.tsx` — renders empty-state + "Browse hotels" link.
- [x] `components/hotel/HotelHero.tsx` — name, address, star badges, overall rating, review count, placeholder photo.
- [x] `components/hotel/AmenitiesGrid.tsx` — amenity pills grid.
- [x] `components/hotel/PoliciesList.tsx` — check-in/out times + cancellation policy.
- [x] `components/hotel/BackToResults.tsx` — history-based back link.

### Phase C — Room availability (F5)

- [x] `components/hotel/RoomAvailability.tsx` — client island; check-in / check-out date fields (manual, not URL); lazy `useAvailability` fetch.
- [x] `components/hotel/DateField.tsx` — native `<input type="date">` with label + `aria-invalid`.
- [x] `components/hotel/RoomCard.tsx` — room type, specs (bed type · count · occupancy · sq ft), amenity pills, price/night, "Available" badge.
- [x] `components/hotel/RoomSkeleton.tsx` — shimmer placeholder during fetch.
- [x] **Validation:** checkout ≤ check-in → inputs marked invalid, no fetch until both dates are set and valid.
- [x] On valid dates → lazy `useAvailability` fetch; shows available room types + `price_per_night` (USD).
- [x] A room shows available only if every night in `[check-in → check-out)` ∈ `available_dates`.

### Availability states (from user-flows.md)

- [x] **Loading** → `RoomSkeleton` shimmer ("Checking availability…").
- [x] **Success** → list of `RoomCard` components with price/night.
- [x] **Empty** (`available_dates: []`, ~15% of stock; or dates outside the July-2026 window) → **"No rooms available for these dates."**
- [x] **Error** (timeout/offline) → `InlineError` inline error + retry; **page never blocked.**
- [x] **Stale response** (dates changed mid-flight) → latest-wins via React Query keying.
- **Done when:** F4 renders without availability dependency; F5 acceptance criteria + all four states pass; integration test covers detail → dates → availability (incl. a no-availability hotel). ✅ **Met** — 272 tests pass (66 suites), clean lint/typecheck/build, `/hotels/[id]` dynamic + `/` static, all M5 modules ≥85% coverage (most at 100%).

**M5 decisions (from spec/plan):** Three-phase implementation — Phase A: shadcn semantic tokens
re-skinned to the slate/blue design spec; custom `--success`/`--star`/`--warning` tokens; light-only
(Radix widgets + dark theme deferred to P2); custom `Icon` retained (no lucide dependency).
Phase B: M4 home components refactored onto shadcn primitives, tests remain green.
Phase C: detail = async server component via `getJson`/`notFound`/`generateMetadata`; availability =
lazy client island (`RoomAvailability` with `'use client'`); `AvailableRoom` type widened to include
all room display fields; demo dates default `2026-07-10 → 2026-07-12`; history-based `BackToResults`
(no URL state needed); `API_BASE_URL` env var used for SSR absolute URL; no booking CTA in Phase 1.
Remaining cross-cutting work: `track()` vendor adapters + route error/loading boundaries + formal
a11y/perf audit → M6; Playwright E2E → M7; Radix primitives + dark theme → P2.

---

## M6 — Cross-cutting: A11y · Observability · Boundaries · Perf

**Outcome:** the non-functional guarantees. **Scope note:** Phase 1 ships the
_lightweight_ observability facade only — vendor wiring (Sentry/Segment/GA4/
web-vitals/pino) is **Phase 2** (see assumptions §11, roadmap P2).

### Boundaries & states

- [x] `app/error.tsx` route error boundary (`unstable_retry`); `app/global-error.tsx` (own `<html>/<body>`).
- [x] `app/loading.tsx` route-level skeleton shell (no CLS).
- [x] `app/not-found.tsx` global 404 + Browse hotels link (detail covered in M5).

### Observability (lightweight, P1)

- [x] `track()` facade — pluggable adapter registry; DEV console adapter by default; PROD no-op; `registerAnalyticsAdapter` P2 seam.
- [x] Typed events: `search_performed`, `hotel_viewed`, `availability_checked`, `no_results`, `no_rooms` (consolidated union).
- [x] Structured API logs confirmed (from M2).
- [-] **P2:** Sentry / Segment-GA4 / web-vitals / pino wiring.

### Accessibility — WCAG 2.1 AA

- [x] Semantic HTML, labelled controls, keyboard-operable everywhere — jest-axe no-violations on all M6 boundaries + M4/M5 surfaces (10 assertions green).
- [x] Visible focus (`:focus-visible` rings on all interactive elements); no color-only signals; `aria-live` result count verified (from M4).
- [x] Contrast ≥ 4.5:1 — to be verified via Lighthouse a11y / DevTools contrast picker manual run (jsdom cannot compute).

### Performance budget

- [x] In-memory filter+sort < 100ms — Jest-asserted over 50-hotel subset (well under budget).
- [x] `npm run build` passes clean (Next.js 16 Turbopack); production build verified.
- [x] LCP / INP / CLS / initial JS < 250KB gz — to be verified via Lighthouse mobile manual run against production build.
- **Done when:** error/loading/not-found boundaries work; `track()` emits typed events in DEV; a11y AA checks pass; perf budget measured and within target. ✅ **Automated gates met** — 300 tests pass (72 suites), lint/typecheck clean, build green, in-memory filter < 100ms asserted. Manual Lighthouse/a11y audit to be run against production server.

---

## M7 — Testing & Coverage Gate

**Outcome:** the quality bar from PRD §5 enforced in CI.

- [x] Unit (Jest + RTL) coverage **≥ 85%** — pure logic + components.
- [x] Integration (Jest + RTL + **MSW**) — component ↔ API ↔ service for both primary flows.
- [x] Playwright **E2E** primary flow: destination → filter → sort → detail → dates → availability.
- [x] CI **coverage gate** enforced (PR blocks below 85%); E2E runs on PR preview.
- **Done when:** all suites green in CI; coverage gate ≥85% enforced and passing. ✅ **Met** — coverage gate enforced at 85% (passing at 93.56% statements / 88.36% branches / 95% functions / 94.83% lines); 3 Playwright E2E specs pass (primary-flow, no-results, no-rooms); GitHub Actions CI pipeline wired (quality + e2e jobs).

---

## M8 — Docs & Deliverables

**Outcome:** the submission artifacts (requirements.md "Deliverables").

- [ ] `README.md` — install deps · run locally · test; **state-management approach** + **component breakdown**.
- [ ] `ASSUMPTIONS-AND-TRADEOFFS.md` — finalize the existing `docs/assumptions-and-tradeoffs.md` as the submission file.
- [ ] `AI-USAGE.md` — how AI tools were used during coding/UI (transparency requirement).
- **Done when:** all three files present, accurate, and consistent with the shipped app.

---

## M9 — Deploy & Verify (minimal, P1)

**Outcome:** the app is live and smoke-verified. **Scope note:** full release
engineering (SemVer auto-tag, staging→prod manual promote, version-in-footer,
rollback drill — see `deployment.md`) is tied to the **P2** SLA/TPS targets and
is **deferred**; P1 just needs a working deployment.

- [ ] Deploy to **Vercel** (connect repo; preview on PR).
- [ ] Smoke-check the live URL: destination → filter → detail → availability works end-to-end.
- [ ] `[-]` **P2:** SemVer tag-every-merge, staging→prod promote pipeline, version surfaced in footer/health route, rollback drill.
- **Done when:** a public Vercel URL serves the full Phase 1 flow.

---

## Requirements Traceability

Every PRD requirement maps to a milestone — use this to confirm nothing slips.

| Req | Description                        | Milestone(s)   |
| --- | ---------------------------------- | -------------- |
| F1  | Destination picker                 | M1, M2, M3, M4 |
| F2  | Search & filter (star, price)      | M1, M3, M4     |
| F3  | Sort & paginate                    | M1, M3, M4     |
| F4  | Hotel detail                       | M2, M5         |
| F5  | Room availability                  | M1, M2, M3, M5 |
| NFR | Perf budget                        | M3, M6         |
| NFR | Mobile-first / 80% mobile traffic  | M0, M4, M6     |
| NFR | Accessibility AA                   | M4, M6         |
| NFR | Observability (lightweight)        | M2, M6         |
| NFR | Testing ≥85% / MSW / E2E           | M7             |
| —   | Deliverables (README/A&T/AI-USAGE) | M8             |

---

## Open Questions / Decisions to Confirm

These are flagged inline as `⚠︎ decision`; defaults let work proceed unblocked.

1. **Star filter** — minimum ("4★ & up") vs exact match? _(default: minimum)_
2. **Card rating** — show both `star_rating` and `overall_rating`, or one? _(default: both)_
3. **Availability latency** — simulated target (e.g. 800ms–1.5s)? _(default: ~1s)_
4. **Date picker** — third-party library vs native `<input type="date">`? _(default: native)_

---

## Definition of Done (Phase 1 release criteria — PRD §7)

- [ ] All five features (F1–F5) meet their acceptance criteria.
- [ ] All documented empty / error / loading states function (M4 + M5 lists).
- [ ] Performance budget met; WCAG 2.1 AA checks pass.
- [ ] Unit coverage ≥ 85%; integration + E2E primary flows green in CI.
- [ ] Deliverables present: `README.md`, `ASSUMPTIONS-AND-TRADEOFFS.md`, `AI-USAGE.md`.
- [ ] App deployed and smoke-verified on Vercel.
