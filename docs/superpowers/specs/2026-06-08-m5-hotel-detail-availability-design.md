# M5 — Design-System Foundation, M4 Refactor & Hotel Detail/Availability — Design Spec

> Phase 1, Milestone M5 (see `docs/progress.md`). M5 now runs in **three phases on one
> branch, after M4 has merged to `main`**:
> - **Phase A — Design-system foundation (shadcn/ui).** Stand up a small, themed
>   primitive layer (`components/ui/*`) so primitives are visually consistent and call
>   sites stop carrying long Tailwind class strings.
> - **Phase B — M4 refactor.** Migrate M4's already-merged components onto the Phase-A
>   primitives, keeping M4's existing tests green throughout (the safety net).
> - **Phase C — Hotel detail & room availability (`/hotels/[id]`).** The original M5: full
>   static info renders **immediately**, then dates drive a **lazy, decoupled**
>   room-availability fetch from a simulated slow third-party. Covers PRD **F4, F5** — built
>   on the Phase-A primitives from day one.
>
> Sources: `docs/designs/hotel-detail-page-design-spec.md` + `home-page-design-spec.md`
> (visual contract + token tables), the matching `*-mockup.html` files, `architecture.md`,
> `prd.md`, `user-flows.md`, the M1/M3/M4 specs, and the shadcn Tailwind-v4 docs
> (https://ui.shadcn.com/docs/tailwind-v4).

**Status:** approved design — implementation plan follows in
`docs/superpowers/plans/2026-06-08-m5-hotel-detail-availability.md`.

**Why this is folded into M5 (not a standalone milestone).** The primitive layer and the
M4 refactor are sequenced to land **between** M4's merge and M5's feature work, on the same
branch: set up shadcn → refactor M4 → implement M5. Packaging all three as M5 keeps that
ordering and its single green gate coherent. Phase A/B carry **no new product behavior** —
they are a styling/DRY foundation and a like-for-like refactor; the user-facing deliverable
is still F4/F5.

**Build to mockup:** [hotel-detail-page-mockup.html](../../designs/hotel-detail-page-mockup.html)
(open in a browser) · contract
[hotel-detail-page-design-spec.md](../../designs/hotel-detail-page-design-spec.md). Match
layout, tokens, and every availability state (incl. the `2026-07-10 → 2026-07-12` demo
default). This spec governs *how it's built in Next/React*; the design spec governs
*how it looks*.

---

## 1. Goal & Scope

**Goal.** Deliver PRD **F4/F5** (hotel detail + lazy room availability) on top of a small,
consistent shadcn/ui primitive layer — and bring M4's existing UI onto that same layer so
the app is visually and code-stylistically uniform. Render a hotel's static detail (hero,
overview, amenities, policies, ratings) **server-side and immediately**, never gated on
pricing, then mount a client availability panel that lazily loads available rooms +
price/night for chosen dates — decoupled so an availability delay or failure never blocks
the detail.

### Phase A — Design-system foundation (shadcn/ui) — in scope

- `npx shadcn@latest init` (new-york style, Tailwind v4, CSS-variable tokens) → `components.json`,
  `lib/utils.ts` (`cn()` = `clsx` + `tailwind-merge`), deps `class-variance-authority` +
  `tw-animate-css`. See §11.
- **`app/globals.css` reconciliation** (a reviewed manual step): preserve the existing Geist
  font wiring (`--font-sans`/`--font-mono`); **remove the vestigial
  `@media (prefers-color-scheme: dark)` block** — the app is **light-only, no toggle** (matches
  the design spec). Map the design-spec palette into shadcn's semantic token vars + add the
  custom `--success`/`--star`/`--warning` tokens shadcn lacks. See §12.
- **Non-Radix primitives** in `components/ui/`: `Button`, `Badge`, `Card`, `Input`, `Skeleton`,
  `Label` — variants encode the design-spec tokens; focus-ring + ≥44px tap target baked in once.
- **Kept custom (not replaced):** `Icon` (perf budget — we do **not** adopt `lucide`),
  `RatingStars` (domain-specific), native `<input type="date">` (M0 decision).
- **Design-spec doc update:** the `docs/designs/*-design-spec.md` token tables are updated so each
  row defines its **CSS-variable value** (the hex → `--primary` mapping becomes the contract),
  keeping docs authoritative once components read `bg-primary` etc.
- **Deferred to when needed (not Phase A):** the Radix-backed widgets (`Select`, `Command`/combobox,
  `Dialog`/`Sheet`) — `components.json` makes them a one-line `shadcn add` later for `SortSelect`,
  `DestinationCombobox`, and a mobile filter sheet.

### Phase B — M4 refactor onto the primitives — in scope

- Migrate the M4 components that carry token chrome to consume the Phase-A primitives, so call
  sites collapse from long class strings to `<Button>`/`<Badge>`/`<Card>`/`<Input>`. The merged
  M4 surface (verified post-merge) maps as:
  - `EmptyState` → `Card` + `Button`; `HotelCard` → `Card` + `Badge`; `HotelCardSkeleton` → `Skeleton`.
  - `Pagination` → `Button`; `PriceRange` → `Input` (+ `Label`); `SegmentedStars` → `Button` (segmented).
  - `MobileFilterBar` → `Button` + `Badge` (active-count); `FilterSheet` → its 3 actions become
    `Button` (close = icon/ghost, Reset = outline, "Show N" = default); `DestinationCombobox` →
    `Input` (field) + `Button` (clear).
- **Stays custom in Phase B (Radix deferred to P2):** `FilterSheet`'s overlay/dialog
  (`role="dialog"` hand-rolled), `DestinationCombobox`'s `role="listbox"` popup, and
  `SortSelect`'s **native `<select>`** — only their button/input/badge chrome adopts primitives;
  the widget behavior is untouched (the Radix `Dialog`/`Command`/`Select` swap is a separate P2 step).
- **No chrome change (layout/text only):** `HotelGrid`, `ResultCount`, `RefineToolbar`,
  `HomeView`, `HomeViewFallback` — these compose other components or hold only layout classes.
- **Like-for-like, behavior-preserving.** M4's existing unit tests (`tests/unit/components/**`)
  are the safety net and **must stay green**. Swapping a native element for a primitive can
  change the DOM role (an amenity `<li>` → `<Badge>` is a `<span>`; a `Card` wrapper can drop
  list/heading structure), so **preserve the semantic element** — keep `<ul>/<li>` and put
  `<Badge>` inside the `<li>`, or use the primitive's `asChild`. Expect to touch **some
  role/structure assertions** (not only literal class-string ones); re-assert the same
  user-facing role/text after the swap. Verify each M4 test rather than assuming it is
  class-free.
- **Native date input stays native;** `SortSelect`/`DestinationCombobox` keep their current
  (non-Radix) implementations in Phase B — only their visual chrome adopts the primitives. A
  later Radix swap is out of scope here.

### Phase C — Hotel detail & room availability (`/hotels/[id]`) — in scope

- `app/hotels/[id]/page.tsx` — **server component**: fetch detail via the BFF, render
  the static detail, mount the client availability panel. `generateMetadata` (hotel
  name in title) + `notFound()` for unknown id.
- `app/hotels/[id]/not-found.tsx` — "Hotel not found" + path back to browsing.
- Server-safe presentational pieces: `HotelHero`, `AmenitiesGrid`, `PoliciesList`,
  and the shared `RatingStars` — built on the Phase-A primitives (`Card`, `Badge`, …).
- `components/hotel/RoomAvailability.tsx` — `'use client'` orchestrator: date fields,
  demo-default seeding, validation, lazy fetch via M3's `useAvailability`, all states.
- `components/hotel/DateField.tsx` (wraps `ui/Input` + `ui/Label`), `RoomCard.tsx` (`ui/Card`
  + `ui/Badge`), `RoomSkeleton.tsx` (`ui/Skeleton`), and the shared `InlineError` (`ui/Button`
  for Retry).
- Extend `utils/analyticUtil.ts` with `hotel_viewed`, `availability_checked`,
  `no_rooms` (M4 owns the facade; M5 adds events + call sites; adapters still M6).
- **Reconciliation (additive):** widen M1's `AvailableRoom` (+ the `availabilityService`
  mapper + M3 MSW fixtures) with `bedCount`, `squareFootage`, `amenities` so `RoomCard` meets
  the design §9 acceptance (see §6.1).
- `components/hotel/BackToResults.tsx` — history-based "← Back to results" (`ui/Button`,
  preserves filters/sort/page; see §8).
- RTL component tests + one MSW integration test for the detail → dates → availability
  flow incl. a no-availability hotel (≥85% coverage on M5 modules).

**Out of scope (later milestones):** booking/reserve/checkout (Phase 2 — display-only
now, **no transactional CTA**); the `track()` vendor adapters, route error/loading
boundaries, and the formal a11y/perf audit (M6); Playwright E2E (M7); full per-hotel
SEO — canonical/OG/JSON-LD (Phase 2); the **Radix-backed primitives** and a **dark theme**
(both Phase 2 — `components.json` leaves the door open).

**Depends on M0–M4 being _merged to `main`_** (not in-flight — Phases A/B touch M4's files
directly). M1: `Hotel`/`Room`/`AvailableRoom` types, `lib/availability` (`nightsInRange`).
M2: `/api/hotels/[id]` (detail) + `/api/hotels/[id]/rooms` (availability). M3:
`useAvailability`, `useAppDates` (`AppProvider` mounted in root layout), `lib/fetcher.getJson`.
M4: `Icon`, `EmptyState`, `lib/amenities` (`humanizeAmenity`), `utils/analyticUtil` (`track`),
and the `components/home/*` set Phase B refactors. **If any M1–M4 export is missing at
execution time, finish that milestone first** — M5 is assembly + refactor on top of them.

---

## 2. Rendering Architecture (detail = server, availability = client)

The crux decision, resolved: **the detail page is a server component that fetches its
own BFF route**, and only the availability zone is client-rendered.

```
app/hotels/[id]/page.tsx               SERVER component
  ├─ generateMetadata({params})          getJson<Hotel>('/api/hotels/{id}') → title = hotel.name
  ├─ getJson<Hotel>('/api/hotels/{id}')   on 404 (ApiError.status===404) → notFound()
  ├─ <HotelHero hotel/>                   static — renders immediately
  ├─ <section> overview (description)
  ├─ <AmenitiesGrid amenities/>
  ├─ <PoliciesList policies/>
  └─ <RoomAvailability hotelId={id}/>    ← 'use client' boundary (the only async zone)
app/hotels/[id]/not-found.tsx          SERVER — "Hotel not found" + Browse hotels link
```

**Why server-fetch-via-BFF (not direct service import, not a client hook):**

- Honors the architecture invariant — *client reaches data only via `/api/*`; the UI
  never imports `services/*` directly*. The server component calls the BFF route, not
  the service.
- Gives M2's `/api/hotels/[id]` its Phase-1 consumer (otherwise dead code).
- Enables `generateMetadata` (hotel-name `<title>`) and `notFound()` server-side, so
  the detail is crawlable HTML with no client round-trip — matching "renders
  immediately."
- Forward-compatible with the roadmap's P2 **SSG/ISR** for hotel detail (add
  `revalidate` / `generateStaticParams` later without restructuring).

**Fetch mechanics.** The server component uses M3's `lib/fetcher.getJson`, which
prepends `process.env.API_BASE_URL`. `getJson` throws `ApiError` on non-2xx; the page
catches `status === 404` → `notFound()`, and re-throws other errors to the route error
boundary (M6).

> **Plan prerequisite — not an M9 deferral.** At SSR runtime a relative
> `/api/hotels/[id]` has no origin and `fetch` throws, so `API_BASE_URL` **must** be set
> in the dev/server runtime (M3 only set it in `jest.polyfills.js` for tests). The plan's
> Task 0 adds `API_BASE_URL=http://localhost:3000` to `.env.local`; M9 sets the
> deployment origin. (Alternative considered: derive the origin from `headers()` per
> request — heavier; env var is simpler for Phase 1.) Without this the detail page
> crashes on first load.

> **Two fetches per request (`generateMetadata` + the page) is fine.** Next memoizes
> identical `fetch` calls within a single request, and `getJson` uses a plain `fetch`
> with no `cache` override, so the second call is deduped. Rely on this — do **not**
> prop-drill the hotel from metadata into the page (server-component metadata can't pass
> props to the default export anyway).

> **Next 16 caveat (AGENTS.md):** before implementing, read `node_modules/next/dist/docs/`
> for the current `generateMetadata`, `notFound()`, dynamic `params` (now async — `await
> params`), and file-based `not-found.tsx` conventions — they differ from training data.

---

## 3. Module Structure

```
PHASE A — design-system foundation
components.json                        (create) shadcn config (new-york, Tailwind v4, cssVariables)
lib/utils.ts                           (create) cn() = clsx + tailwind-merge
app/globals.css                        (modify) shadcn token vars + custom --success/--star/--warning;
                                                 preserve Geist; drop the dark media-query block
components/ui/button.tsx               primitive: variant/size via cva, focus-ring + ≥44px baked in
components/ui/badge.tsx                primitive: pill (default / success / muted variants)
components/ui/card.tsx                 primitive: surface (Card/CardHeader/CardContent…)
components/ui/input.tsx                primitive: text/date input chrome
components/ui/skeleton.tsx             primitive: shimmer block
components/ui/label.tsx                primitive: form label
docs/designs/*-design-spec.md          (modify) token tables define the CSS-variable values

PHASE B — M4 refactor (consume the primitives; behavior unchanged)
components/EmptyState.tsx              (modify) Card + Button
components/home/HotelCard.tsx          (modify) Card + Badge (keep <ul>/<li> for pills)
components/home/HotelCardSkeleton.tsx  (modify) Skeleton
components/home/Pagination.tsx         (modify) Button
components/home/PriceRange.tsx         (modify) Input + Label
components/home/SegmentedStars.tsx     (modify) Button (segmented)
components/home/MobileFilterBar.tsx    (modify) Button + Badge (active-count)
components/home/FilterSheet.tsx        (modify) 3 actions → Button; overlay/dialog stays custom (P2)
components/home/DestinationCombobox.tsx(modify) Input + Button (clear); listbox stays custom (P2)
components/home/SortSelect.tsx         (modify) native <select> token alignment only (Radix Select → P2)
components/home/{HotelGrid,ResultCount,RefineToolbar,HomeView,HomeViewFallback}.tsx
                                       (no chrome change) layout/text/composition only

PHASE C — hotel detail & availability
app/hotels/[id]/page.tsx               server: fetch + metadata + static detail + panel mount
app/hotels/[id]/not-found.tsx          server: not-found UI (EmptyState + Button)

components/hotel/BackToResults.tsx     'use client' — router.back() link (ui/Button; preserves URL state)
components/hotel/HotelHero.tsx         hero photo (16:9 placeholder) + name + address + ratings
components/hotel/AmenitiesGrid.tsx     humanized amenity icon grid (reuses lib/amenities)
components/hotel/PoliciesList.tsx      check-in / check-out / cancellation rows
components/hotel/RoomAvailability.tsx  'use client' orchestrator (dates ↔ useAvailability ↔ states)
components/hotel/DateField.tsx         labelled native <input type="date"> (ui/Input + ui/Label)
components/hotel/RoomCard.tsx          one available room (ui/Card + ui/Badge: specs, pills, price, ✓)
components/hotel/RoomSkeleton.tsx      shimmer placeholder room card (ui/Skeleton)

components/RatingStars.tsx             shared: amber stars + numeric (used by hero; M4 cards may adopt)
components/InlineError.tsx             shared: message + Retry (ui/Button) — availability error path

utils/analyticUtil.ts                  (modify) add hotel_viewed / availability_checked / no_rooms events
```

Reused from M4 without change: `components/Icon.tsx`, `lib/amenities.ts`. Reused from M1/M3:
`types/domain.ts`, `lib/availability.ts`, `lib/fetcher.ts`, `hooks/useAvailability.ts`,
`stores/AppProvider.tsx`. **Primitives policy:** every M5 component and every refactored M4
component composes `components/ui/*` for its chrome; raw Tailwind utility strings on app
components are reserved for layout (grid/spacing), not for color/border/focus/radius tokens.

---

## 4. Data flow

**Detail (server, synchronous to the request):**

```
params.id ─▶ getJson<Hotel>('/api/hotels/'+id)
   ├─ 404 → notFound() → app/hotels/[id]/not-found.tsx
   └─ Hotel ─▶ HotelHero / overview / AmenitiesGrid / PoliciesList (rendered HTML)
            └─▶ <RoomAvailability hotelId={id}/> (client island, no hotel data needed beyond id)
```

**Availability (client, lazy):**

```
useAppDates() ─ checkIn, checkOut ─┐
RoomAvailability seeds demo default│ (on mount, if both null → 2026-07-10 / 2026-07-12)
                                   ▼
   validate: checkOut > checkIn ?  ─no─▶ inline validation error, no fetch
                                   │yes
   useAvailability(id, checkIn, checkOut)  (enabled only when valid)
        ─▶ isLoading → "Checking availability…" + RoomSkeletons (~1200ms)
        ─▶ data=[]   → EmptyState "No rooms available for these dates"
        ─▶ data=[…]  → RoomCard list (✓ Available + price/night)
        ─▶ isError   → InlineError + Retry (refetch)
```

- **Detail never waits on availability** — it is server-rendered; the panel is a
  separate client island that resolves independently. An availability failure leaves
  the whole detail usable.
- **Latest-wins is structural** (M3 §9.4): the panel subscribes to the current
  `[id, checkIn, checkOut]` key; a late response for old dates lands in the old key's
  cache and is never read. No manual cancellation.
- **Dates are client-only** (`AppProvider`), never in the URL — refresh/shared link
  does not carry them; the demo default re-applies on each fresh visit (when null).

---

## 5. `RoomAvailability` — the client orchestrator

Owns date state interaction, validation, demo-default seeding, the lazy fetch, and
state selection. Consumes `useAppDates` (dates) + `useAvailability` (rooms).

**Demo-default seeding.** On mount, if `checkIn` **and** `checkOut` are both `null`,
set them to `2026-07-10` / `2026-07-12` (one effect, runs once). Rationale: all seed
`available_dates` are July 2026; defaulting to "today" would show every room
unavailable and the success path would never render. If the user already has dates
(navigated from another hotel in the same session), keep them.

**Validation (before fetch).** Compute `valid = !!(checkIn && checkOut && checkOut >
checkIn)`. When `checkIn && checkOut && checkOut <= checkIn` → render the inline error
"Check-out must be after check-in" and do **not** fetch. When only one date is set →
idle hint, no fetch. (`useAvailability` already gates `enabled` identically, so the UI
gate and the hook gate agree.)

**State selection (what the panel renders below the date fields):**

| Condition | Render |
| --- | --- |
| both dates null (pre-seed tick) / only one set | `AvailIdle` hint: "Pick check-in and check-out to see rooms" |
| `checkOut <= checkIn` | inline validation error (no fetch) |
| `useAvailability.isLoading` | "Checking availability…" + 2–3 `RoomSkeleton` (aria-live) |
| `data` non-empty | `RoomCard` list |
| `data === []` | `EmptyState` "No rooms available for these dates" + "Try different dates" |
| `isError` | `InlineError` "Couldn't load availability" + **Retry** (`refetch`) |

**`aria-live="polite"`** region announces the status text ("Checking availability…",
"2 rooms available", "No rooms available for these dates").

**Analytics call sites (client):**

- `hotel_viewed` — fired once on detail mount. Since the page is a server component,
  this fires from a mount effect in `RoomAvailability` (the client island always
  present on the detail page), payload `{ hotelId }`.
- `availability_checked` — when a valid-date fetch is issued, payload `{ hotelId,
  nights }` where `nights = nightsInRange(checkIn, checkOut).length`.
- `no_rooms` — when a fetch resolves to `[]`, payload `{ hotelId }`.

---

## 6. Component contracts (the ones with real logic)

### 6.1 `RoomCard`

- **Props:** `room: AvailableRoom`. Renders everything the design spec §3/§9 require:
  **type** (H3), a specs line **"King · 1 bed · Sleeps 2 · 450 sq ft"** (`bedType`,
  `bedCount`, `maxOccupancy`, `squareFootage`), humanized **room-amenity pills**
  (`[city view] [mini bar]` via `lib/amenities`), **price/night** (USD, tabular-nums),
  and the **✓ Available** badge (icon + text, never color-only). No "Reserve" CTA in
  Phase 1.

> **Reconciliation (M5 Task 0 — same pattern as M4 Task 0).** M1's `AvailableRoom`
> projection is leaner (`roomId, type, pricePerNight, bedType, maxOccupancy`) than the
> design contract's RoomCard, which §9 lists as **acceptance** ("bed_type/count,
> occupancy, sq ft, room amenities"). The raw seed `Room` already carries
> `bed_count, square_footage, room_amenities[]` (M1 §2) — the projection simply dropped
> them. M5 **widens `AvailableRoom`** to add `bedCount: number`, `squareFootage:
> number`, `amenities: string[]`, and extends `availabilityService`'s room→`AvailableRoom`
> mapper to populate them. **Ripple:** M3's MSW handlers + any `AvailableRoom` fixtures
> must return the widened shape (Task 0 updates them). This is additive — no consumer
> breaks; it makes the F5 acceptance checkbox achievable.

### 6.2 `DateField`

- **Props:** `id`, `label`, `value: string | null`, `min?: string`, `onChange(value:
  string | null)`. Renders a visible `<label>` + native `<input type="date">` (no
  library, per M0 decision); empty input → `null`. ≥ 44px tall; full-width on mobile.
- The check-out field passes `min={checkIn ?? undefined}` as a native hint, but the
  authoritative validation is in `RoomAvailability` (§5) — the native `min` is a
  convenience, not the guard.

### 6.3 `RatingStars` (shared)

- **Props:** `value: number` (e.g. 4.8), `size?`. Renders 5 star glyphs with the
  filled proportion reflecting `value/5` (amber), plus the numeric value (tabular-nums)
  for screen readers and sighted users. Decorative stars are `aria-hidden`; the numeric
  value carries the meaning.

### 6.4 `InlineError` (shared)

- **Props:** `message: string`, `onRetry?: () => void`. Red text + icon + optional
  Retry button (≥ 44px). Used by the availability error state; reusable by M6.

### 6.5 `BackToResults` (client)

- A `'use client'` "← Back to results" control. **Must use `router.back()`** (Next's
  `useRouter`), not a plain `<Link href="/">` — the design spec §3 requires returning to
  `/` with the prior filters/sort/page intact, and those live in the URL/history. A bare
  link drops them. Falls back to `router.push('/')` only when there is no history entry
  (direct/deep-link entry) — detect via a guarded `router.back()` (or `window.history.length`).
  ≥ 44px tap target.

---

## 7. States (every state the page must render)

Detail content is always present; only the **Room Availability** zone changes state
(mirrors the design spec §6 / `user-flows.md`).

| State | Trigger | UI |
| --- | --- | --- |
| **Detail loaded** | `/api/hotels/[id]` returns | hero, overview, amenities, policies render immediately — never gated on availability |
| **Unknown hotel** | `/api/hotels/[id]` 404 | server `notFound()` → `not-found.tsx`: "Hotel not found" + "Browse hotels" link |
| **Availability idle** | only one date set | date fields + hint "Pick check-in and check-out to see rooms"; no fetch |
| **Availability loading** | both valid dates (incl. demo default) | "Checking availability…" + 2–3 `RoomSkeleton` (~1200ms, aria-live) |
| **Availability success** | rooms cover every night | `RoomCard` list, ✓ Available + price/night |
| **Availability empty** | no room covers the range (incl. `available_dates: []`) | `EmptyState` "No rooms available for these dates" + "Try different dates" |
| **Availability error** | fetch fails/times out | `InlineError` + Retry — detail stays fully usable |
| **Validation blocked** | `checkout ≤ check-in` | inline error "Check-out must be after check-in"; no fetch |
| **Stale response** | dates changed mid-flight | latest-wins (structural RQ keying); old response ignored |

---

## 8. Accessibility & mobile-first (from the design spec)

- Semantic landmarks; one `<h1>` (hotel name); skip-to-content (shared layout, M4);
  "← Back to results" link returns via browser history (filters/sort/page intact).
- Date fields have visible `<label>`s; availability status in `aria-live="polite"`.
- ✓ Available is **icon + text**, never color-only; contrast ≥ 4.5:1; visible
  `:focus-visible` ring.
- Verified at **360px first**; tap targets ≥ 44px; native date picker; no horizontal
  scroll. Hero placeholder reserves 16:9 (`aspect-ratio`) → no **CLS**.
- Layout: single column with a **sticky bottom "Check availability" bar** (focuses the
  date fields) on mobile; **two-pane with a sticky availability rail** on `lg`+.
- Honor `prefers-reduced-motion` (skeleton cross-fade → instant).

(The formal a11y/perf audit is M6; M5 builds to these rules so it passes.)

---

## 9. Testing strategy (TDD, ≥85% coverage on M5 modules)

jsdom + RTL; MSW (M3's `tests/msw/`) for the integration test; `next/navigation`
mocked where needed. Test-first per the plan.

**Component tests (props in / callbacks out — no hooks):**

- `RatingStars` — numeric value rendered; stars decorative (`aria-hidden`).
- `DateField` — label associates with input; emits value; empty → `null`; passes `min`.
- `RoomCard` — type, full specs line (bedType · bedCount · maxOccupancy · sqft),
  humanized room-amenity pills, price (USD tabular-nums), ✓ Available badge (icon +
  text); **no** Reserve button.
- `BackToResults` — clicking calls `router.back()` (assert with a mocked `useRouter`).
- `RoomSkeleton` — decorative (`aria-hidden`).
- `InlineError` — message + Retry fires callback; omits button when no `onRetry`.
- `HotelHero` / `AmenitiesGrid` / `PoliciesList` — render the mapped fields; amenities
  humanized via `lib/amenities`.

**`RoomAvailability` (hooks mocked):**

- demo-default seeding on mount when dates null; **no** reseed when dates already set;
- validation `checkout ≤ checkin` → inline error, `useAvailability` not enabled;
- loading → skeletons + aria-live; success → `RoomCard`s; empty → `EmptyState`;
  error → `InlineError` + Retry calls `refetch`;
- analytics: `hotel_viewed` once on mount; `availability_checked` with `nights` on a
  valid fetch; `no_rooms` on empty.

**Integration test (RTL + MSW — M5's "Done when"):** render the detail composition
(static detail + `RoomAvailability` under `QueryProvider` + `AppProvider`); assert the
detail paints immediately, the demo default auto-fetches → **success** rooms appear
after the skeleton, then switch to a **no-availability hotel** (one of the ~15% with
`available_dates: []`) → "No rooms available". Include an error-path (MSW 500 → Retry)
and the `notFound()` path is covered by a `page.tsx` unit test asserting a 404 from
`getJson` triggers `notFound()`.

`utils/analyticUtil` extension is unit-tested for the three new event shapes.

**Phase A (primitives) — tests in `tests/unit/components/ui/`** (per CLAUDE.md, **not**
co-located): each primitive renders its variants, forwards `className`/`...props`, applies
the focus-ring, and (Button/Input/Label) keeps the role/label wiring a form needs. Smoke a
token by asserting the variant class resolves (e.g. `Button` default carries `bg-primary`).

**Phase B (M4 refactor) — green-gate, not new behavior:** M4's existing
`tests/unit/components/**` suites are the contract and **must stay green** after the
refactor. Because primitives can change the DOM role (`<li>`→`<Badge>`/`<span>`), preserve
the semantic element (keep `<ul>/<li>`, `asChild`) and expect to update **some role/structure
assertions**, not just literal class-string ones — re-asserting the same user-facing
role/text. No coverage regression on M4 modules.

---

## 10. Decisions & open items

**Resolved (this spec):**

- **shadcn/ui adopted for primitives only**, themed via its **semantic CSS-variable tokens**
  (new-york, Tailwind v4) re-skinned to the design-spec palette; **Radix-backed widgets +
  dark theme deferred to Phase 2** (§1 Phase A, §11–§12).
- **App stays light-only — the `prefers-color-scheme: dark` block is removed** so OS-dark
  users don't get a half-dark UI from shadcn's partial token flip (§12). _(Confirmed: light-only
  for Phase 1; a real dark theme is deferred P2.)_
- **Custom `Icon` kept; `lucide` not adopted** (perf budget); native `<input type="date">`
  kept (§1 Phase A).
- **M4 refactor is a full, behavior-preserving phase (Phase B)** gated by M4's existing
  green tests — not incremental, not a rewrite of test logic (§1 Phase B, §9).
- **Design-spec token tables become the CSS-variable contract** (docs stay authoritative
  once components read `bg-primary`) (§12).
- **Detail = server component fetching `/api/hotels/[id]` via `getJson`** (BFF
  invariant honored; SSR metadata + `notFound()`); availability is the only client
  island (§2).
- **`hotel_viewed` fires from the client island** (`RoomAvailability` mount effect),
  since server components can't call `track()` (§5).
- **Demo-default dates `2026-07-10 → 2026-07-12`** seeded on mount when `AppProvider`
  dates are null; not in the URL (§5).
- **`AvailableRoom` widened (Task 0)** with `bedCount`, `squareFootage`, `amenities`
  (+ mapper + MSW fixtures) so `RoomCard` meets the design §9 acceptance — additive,
  same pattern as M4 Task 0 (§6.1).
- **"← Back to results" is history-based** (`router.back()`), preserving the home URL
  state, not a bare link (§6.5).
- **`API_BASE_URL` set in the runtime** (`.env.local`) as a Task 0 prerequisite — the
  SSR detail fetch needs an absolute origin (§2).
- **No booking CTA** in Phase 1 (display-only).
- **`RatingStars` / `InlineError`** added as shared components (hero + availability
  error); reusable by M4/M6.

**Resolved — light-only.** Confirmed for Phase 1: the `prefers-color-scheme: dark` block is
dropped and no toggle ships. A real dark theme (full `.dark` token set + toggle) is a larger,
separate scope deferred to P2 — not folded into M5.

**Deferred (not M5):** Radix-backed primitives (`Select`/`Command`/`Dialog`/`Sheet`) + dark
theme (P2 — `components.json` keeps the path open); booking/checkout (P2); `track()` vendor
adapters + route error/loading boundaries + formal a11y/perf audit (M6); Playwright E2E
(M7); per-hotel canonical/OG/JSON-LD SEO and SSG/ISR (P2).

---

## 11. Phase A — shadcn/ui foundation (the `components/ui/*` layer)

**Init.** `npx shadcn@latest init` — new-york style, Tailwind v4 (CSS-variable tokens, oklch),
base color slate. It creates `components.json`, `lib/utils.ts` (`cn()`), and adds
`class-variance-authority`, `tailwind-merge`, `clsx`, `tw-animate-css`. We **do not** use the
`lucide-react` it may add (tree-shaken away); the custom `Icon` stays. Read the shadcn
Tailwind-v4 guide before running — the v4 flow has no `tailwind.config.js` and writes tokens
into `app/globals.css` via `:root` + `@theme inline`.

**Primitives built (non-Radix, so no Radix dep enters):**

| Primitive | Variants (cva) | Notes |
| --- | --- | --- |
| `Button` | `variant`: default·outline·ghost·link; `tone`: default·danger; `size`: sm·default·lg·icon | focus-ring + **≥44px** min height baked in; `asChild` not needed in P1 |
| `Badge` | `variant`: default·muted·success | the amenity pill + the ✓ Available badge (icon + text) |
| `Card` | `Card`/`CardHeader`/`CardContent`/`CardFooter` | `rounded-xl border bg-card shadow-sm` |
| `Input` | — | text + `type="date"` chrome; `min-h-11`, focus-ring |
| `Label` | — | `htmlFor` association for `Input`/`DateField` |
| `Skeleton` | — | `animate-pulse rounded bg-muted`, `aria-hidden` |

**Composition rule.** App components (M4 + M5) own *layout* (grid, spacing, flow) but delegate
*token chrome* (color, border, radius, focus, elevation) to these primitives. `RoomCard` =
`Card` + `Badge` + `Rating/price` content; `DateField` = `Label` + `Input`; `InlineError` =
`Card` (destructive) + `Button`; `RoomSkeleton` = `Skeleton` rows.

## 12. Token reconciliation — design spec → shadcn CSS variables

`shadcn init` rewrites the token block in `app/globals.css`. The **reviewed manual
reconciliation**:

1. **Preserve** the Geist wiring already in `@theme inline` (`--font-sans:
   var(--font-geist-sans)`, `--font-mono: var(--font-geist-mono)`).
2. **Remove** the scaffold's `@media (prefers-color-scheme: dark)` block (light-only; §10).
3. **Map** the design-spec palette onto shadcn's semantic vars, and **add the three custom
   tokens** shadcn's default set lacks. The `docs/designs/*-design-spec.md` token tables are
   updated to state these var bindings (docs = contract):

| Design-spec token | Hex | shadcn / custom var | Tailwind utility |
| --- | --- | --- | --- |
| `bg/page` | `#F8FAFC` | `--background` | `bg-background` |
| `bg/surface` | `#FFFFFF` | `--card`, `--popover` | `bg-card` |
| `border` | `#E2E8F0` | `--border`, `--input` | `border` |
| `text/primary` | `#0F172A` | `--foreground`, `--card-foreground` | `text-foreground` |
| `text/secondary` | `#475569` | `--muted-foreground` | `text-muted-foreground` |
| `text/muted` | `#94A3B8` | `--muted-foreground` (placeholder) | — |
| `accent` | `#2563EB` | `--primary` | `bg-primary text-primary-foreground` |
| `accent/hover` | `#1D4ED8` | (hover step of `--primary`) | `hover:…` |
| `focus/ring` | `#3B82F6` | `--ring` | `focus-visible:ring-ring` |
| `success` | `#16A34A` | **`--success`** (custom) | `text-success` |
| `warning` | `#D97706` | **`--warning`** (custom) | `text-warning` |
| `error` | `#DC2626` | `--destructive` | `bg-destructive` / `text-destructive` |
| `star` | `#F59E0B` | **`--star`** (custom) | `text-star` |

> Values are expressed in shadcn's v4 token format (oklch) in `:root`, surfaced as
> `--color-*` via `@theme inline`, then used through the Tailwind utilities above. Custom
> tokens (`--success`, `--star`, `--warning`) get the same `:root` + `@theme inline` pair so
> `text-success` / `text-star` / `text-warning` resolve. Radius (`--radius`) maps to the
> spec's scale: cards `rounded-xl`, inputs/buttons `rounded-lg`, pills `rounded-full`.
