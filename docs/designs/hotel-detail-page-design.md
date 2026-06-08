# UI/UX Design Spec — Hotel Detail Page (Detail + Room Availability)

> Route: `/hotels/[id]` · Drives the mock UI for hotel detail and lazy room availability.
> Companion spec: [home-page-design.md](home-page-design.md).
> Sourced from `prd.md`, `architecture.md`, `product-roadmap.md`, `user-flows.md`, `mock-data.json`.

**Visual direction:** Clean & modern — neutral grey scale, one blue accent, photo-forward
rounded cards, generous whitespace. **Mobile-first**, WCAG 2.1 AA.

---

## 1. Design Language (shared — identical in both specs)

### Color tokens (Tailwind slate + blue)

| Token            | Hex       | Tailwind  | Use                                                    |
| ---------------- | --------- | --------- | ------------------------------------------------------ |
| `bg/page`        | `#F8FAFC` | slate-50  | Page background                                        |
| `bg/surface`     | `#FFFFFF` | white     | Cards, bars, sheets                                    |
| `border`         | `#E2E8F0` | slate-200 | Dividers, card outline, inputs                         |
| `text/primary`   | `#0F172A` | slate-900 | Headings, key values                                   |
| `text/secondary` | `#475569` | slate-600 | Body, meta                                             |
| `text/muted`     | `#94A3B8` | slate-400 | Placeholders, hints                                    |
| `accent`         | `#2563EB` | blue-600  | Primary buttons, active fill (≥3:1 UI; 5.1:1 on white) |
| `accent/text`    | `#1D4ED8` | blue-700  | Inline text links / small text on white (extra margin) |
| `accent/hover`   | `#1D4ED8` | blue-700  | Hover for primary                                      |
| `focus/ring`     | `#3B82F6` | blue-500  | 2px ring + 2px offset on focus-visible                 |
| `success`        | `#16A34A` | green-600 | "Available" status                                     |
| `warning`        | `#D97706` | amber-600 | Soft warnings                                          |
| `error`          | `#DC2626` | red-600   | Validation + inline errors                             |
| `star`           | `#F59E0B` | amber-500 | Filled rating stars                                    |

Color is never the sole signal — pair with icon + text (e.g. ✓ "Available", not green alone).

### Typography

Font: `Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
Prices and counts use `font-variant-numeric: tabular-nums`.

| Role            | Mobile → Desktop | Weight | Line-height |
| --------------- | ---------------- | ------ | ----------- |
| Display / H1    | 30px → 36px      | 700    | 1.2         |
| Section / H2    | 20px → 24px      | 600    | 1.25        |
| Card title / H3 | 16px → 18px      | 600    | 1.3         |
| Body            | 16px             | 400    | 1.5         |
| Caption / meta  | 14px             | 400    | 1.45        |
| Micro / badge   | 12px             | 500    | 1.4         |

### Spacing, radius, elevation

- **4px base grid** (Tailwind spacing scale). Section rhythm: 24px mobile / 32–48px desktop.
- **Container:** `max-width 1280px` (max-w-7xl), centered; gutters **16px** (base) / **24px** (md) / **32px** (lg).
- **Radius:** cards `rounded-xl` (12px); inputs/buttons `rounded-lg` (8px); pills/badges `rounded-full`.
- **Elevation:** cards `shadow-sm` at rest → `shadow-md` on hover; sheets/popovers `shadow-lg`.

### Breakpoints (Tailwind defaults — mobile-first)

Base styles target the smallest screen; min-width media queries layer up.

| Token  | Min width | Primary use                             |
| ------ | --------- | --------------------------------------- |
| (base) | 0         | Single column, stacked, sticky controls |
| `sm`   | 640px     | 2-col grid, inline filters begin        |
| `md`   | 768px     | 3-col grid, full toolbar inline         |
| `lg`   | 1024px    | 4-col grid, two-pane detail             |
| `xl`   | 1280px    | Max container, comfortable gutters      |

### Shared component primitives

`Button` (primary / secondary / ghost · min target 44×44px) · `TextInput` · `Combobox`
(destination) · `Select` (sort) · `RangeInputs` (price min/max) · `SegmentedControl`
(star "& up") · `Card` / `HotelCard` / `RoomCard` · `Badge`/`Pill` (amenity, star) ·
`RatingStars` (amber + numeric) · `PriceTag` (tabular-nums) · `DateField` · `Skeleton`
(shimmer) · `EmptyState` (icon + message + action) · `InlineError` (+ Retry).

### Accessibility baseline (shared)

- Semantic landmarks: `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`; one `<h1>` per page; skip-to-content link.
- Every interactive target ≥ **44×44px**; visible `focus-visible` ring (never removed).
- Every control labelled (visible `<label>` or `aria-label`).
- `aria-live="polite"` for the result count and the availability status.
- Contrast ≥ 4.5:1 text · ≥ 3:1 UI/large text. No color-only meaning.
- Keyboard: combobox supports ↑/↓/Enter/Esc; logical tab order; Esc closes sheets/popovers.
- Honor `prefers-reduced-motion` (disable non-essential motion).

### Motion

150–200ms ease-out for hover/press; 200–250ms cross-fade for skeleton → content.
Reduced-motion: swap fades for instant, keep no looping animation.

### Imagery / placeholders

Dataset has **no images** → every photo is a deterministic **placeholder**: `slate-100`
block, fixed **16:9** aspect-ratio box, centered hotel glyph + hotel name overlay. Reserve
the box's intrinsic size (CSS `aspect-ratio` or width/height) so images **never cause CLS**.
All prices **USD**, shown as `$1,240` / `from $199 / night`.

---

## 2. Purpose & scope (this page)

Show a hotel's full static detail **immediately** (it never waits on pricing), then let the
traveler pick dates to **lazy-load available rooms + price/night** from a simulated slow
third-party. The detail and the availability path are decoupled: an availability failure or
delay must **never block** the detail render.

**Out of scope here:** booking/reserve/checkout (Phase 1 is display-only). The room list shows
availability + price but no transactional CTA.

---

## 3. Page anatomy (zones, top → bottom)

1. **App bar** (sticky) — brand "Stayfinder" (matches home).
2. **Back link** — "← Back to results" (returns to `/` with prior filters/sort/page intact via browser history).
3. **Hero** — large placeholder photo (16:9), hotel name (H1), full address, rating row.
4. **Overview** — description paragraph.
5. **Amenities** — icon + label grid.
6. **Policies** — check-in / check-out times, cancellation.
7. **Room Availability panel** — DateField → lazy room list (the async zone). **Sticky right rail on `lg`+.**
8. **Footer** — slim; build/version stamp.

### Hero / rating row

> Show **both** `star_rating` and `overall_rating` + `review_count` (consistent with the card).

```
[ ⌜5★⌝ ]  The Grand Luminary                       (H1)
          789 Skyline Blvd, Chicago, IL 60611, USA  (caption)
          5★ hotel · ★★★★★ 4.8 · 1,240 reviews
```

- `star_rating` → "5★ hotel" badge (amber). `overall_rating` → `RatingStars` + numeric "4.8".
- `review_count` → "1,240 reviews" (tabular-nums). Reviews are rating + count only (no text in dataset).

### Overview / Amenities / Policies

| Section   | Source field  | Render                                                                                                                                                           |
| --------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview  | `description` | One paragraph, body text, max ~70ch line length                                                                                                                  |
| Amenities | `amenities[]` | Responsive icon grid; humanize labels (`valet_parking` → "Valet parking", `free Wi-Fi` → "Wi-Fi", `pet_friendly` → "Pet friendly"). Unknown → generic check icon |
| Policies  | `policies`    | Three rows: **Check-in** 15:00 · **Check-out** 11:00 · **Cancellation** "Free cancellation up to 24 hours before check-in"                                       |

### Room Availability panel — the lazy async zone

**Date entry**

- Two `DateField`s: **Check-in** and **Check-out**.
- **Demo default (critical):** pre-fill **Check-in `2026-07-10`**, **Check-out `2026-07-12`**
  on load, and **auto-trigger the availability fetch once** so a viewer sees the _success_
  state immediately. (Rationale: all dataset `available_dates` are in **July 2026**; defaulting
  to "today" — 2026-06-08 — would show every room as unavailable and the happy path would
  never render. Dates are entered each visit and are **not** stored in the URL.)
- **Validation:** Check-out must be **after** Check-in. `checkout ≤ check-in` → inline error
  "Check-out must be after check-in", fetch blocked. Only one date set → no fetch yet.

**Availability rule:** a room is available only if **every night** in `[check-in → check-out)`
is in its `available_dates`. For the demo window the nights are `[2026-07-10, 2026-07-11]`.
Simulated third-party latency: **~1200ms** (drives the skeleton duration).

**RoomCard anatomy**

```
┌────────────────────────────────────────────┐
│ Deluxe King Room                  ✓ Available│ ← type (H3) + success badge (icon+text)
│ King · 1 bed · Sleeps 2 · 450 sq ft          │ ← bed_type, bed_count, max_occupancy, sq_ft
│ [city view] [mini bar]                       │ ← room_amenities pills (humanized)
│ $299 / night                                 │ ← price_per_night, tabular-nums
└────────────────────────────────────────────┘
```

No "Reserve" button in Phase 1 (display-only). A disabled/"Coming soon" affordance is
optional; Phase 2 adds the booking CTA here.

---

## 4. Wireframes

### Mobile (base, ≤ 640px) — single column, sticky check-availability bar

```
┌─────────────────────────────┐
│ Stayfinder                  │ sticky app bar
├─────────────────────────────┤
│ ← Back to results           │
│ ┌─────────────────────────┐ │
│ │   [ 16:9 photo ]   5★   │ │ hero placeholder
│ └─────────────────────────┘ │
│ The Grand Luminary       H1 │
│ 789 Skyline Blvd, Chicago…  │
│ 5★ · ★★★★★ 4.8 · 1,240 rev  │
├─────────────────────────────┤
│ Overview                    │ H2
│ A luxury oasis in the heart…│
├─────────────────────────────┤
│ Amenities                   │
│ ◦ Pool   ◦ Wi-Fi  ◦ Spa     │ 2-col icon grid
│ ◦ Fitness ◦ Valet ◦ Pet     │
├─────────────────────────────┤
│ Policies                    │
│ Check-in 15:00 · out 11:00  │
│ Free cancellation ≤24h      │
├─────────────────────────────┤
│ Room availability        H2 │
│ Check-in   [ 2026-07-10 ]   │ pre-filled
│ Check-out  [ 2026-07-12 ]   │ pre-filled
│ ── Checking availability… ──│ ~1200ms skeleton
│ ┌─────────────────────────┐ │
│ │ Deluxe King  ✓ Available │ │ RoomCard
│ │ King·Sleeps 2·450 sq ft  │ │
│ │ [city view][mini bar]    │ │
│ │ $299 / night             │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Standard Queen ✓ Avail.  │ │
│ │ $199 / night             │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ [ Check availability ]      │ STICKY bottom bar → focuses date fields
└─────────────────────────────┘
```

### Desktop (lg ≥ 1024px) — two-pane, sticky availability rail

```
┌───────────────────────────────────────────────────────────────┐
│ Stayfinder                                                     │
├───────────────────────────────────────────────────────────────┤
│ ← Back to results                                              │
│ ┌───────────────────────────────────┐                         │
│ │        [ 16:9 hero photo ]   5★   │                         │
│ └───────────────────────────────────┘                         │
│ The Grand Luminary                          ┌────────────────┐ │
│ 789 Skyline Blvd, Chicago, IL · USA         │ Room availab.  │ │ ← sticky rail
│ 5★ · ★★★★★ 4.8 · 1,240 reviews              │ Check-in       │ │
│                                             │ [ 2026-07-10 ] │ │
│ Overview            (H2)                     │ Check-out      │ │
│ A luxury oasis in the heart of downtown…    │ [ 2026-07-12 ] │ │
│                                             │ ─────────────  │ │
│ Amenities                                   │ Deluxe King    │ │
│ ◦ Pool  ◦ Wi-Fi  ◦ Spa  ◦ Fitness          │ ✓ $299 /night  │ │
│ ◦ Valet parking  ◦ Pet friendly             │ Standard Queen │ │
│                                             │ ✓ $199 /night  │ │
│ Policies                                    │                │ │
│ Check-in 15:00 · Check-out 11:00            └────────────────┘ │
│ Free cancellation up to 24h before check-in                   │
└───────────────────────────────────────────────────────────────┘
   left column: detail content        right rail: availability (sticky, lazy)
```

---

## 5. Responsive behavior (mobile-first)

Base CSS targets the smallest screen; each breakpoint **adds** capability.

| Zone               | base (≤640)                                                 | sm (≥640)    | md (≥768)    | lg (≥1024)                                      | xl (≥1280)      |
| ------------------ | ----------------------------------------------------------- | ------------ | ------------ | ----------------------------------------------- | --------------- |
| Page layout        | **1 column, availability stacked below content**            | 1 col        | 1 col        | **2 panes: content + sticky availability rail** | 2 panes         |
| Availability panel | Inline section + **sticky bottom "Check availability" bar** | inline       | inline       | **sticky right rail** (top-aligned)             | sticky rail     |
| Hero photo         | 16:9 full-bleed                                             | 16:9         | 16:9         | 16:9 (capped width)                             | 16:9            |
| Amenities grid     | 2 cols                                                      | 2            | 3            | 3                                               | 4               |
| Date fields        | Stacked, full-width                                         | side by side | side by side | stacked in rail                                 | stacked in rail |
| Gutters            | 16px                                                        | 16px         | 24px         | 32px                                            | 32px            |

**Mobile-first rules (non-negotiable):**

- Designed and verified at 360px width **first**; larger screens are progressive enhancement.
- All tap targets ≥ **44×44px** (date fields, back link, retry); ≥ 8px between adjacent targets.
- Date fields are full-width and use the platform **native date picker** on mobile.
- A **sticky bottom "Check availability" bar** keeps date entry one-thumb reachable; tapping it scrolls to / focuses the date fields.
- Detail content reads top-to-bottom with no horizontal scroll; availability never overlaps content on small screens.
- The detail (hero, overview, amenities, policies) renders **before and independent of** availability at every width.

---

## 6. States (every state the mock must render)

Detail content is always present; only the **Room Availability** zone changes state.

| State                     | Trigger                                                                 | UI                                                                                    |
| ------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Detail loaded**         | `/api/hotels/[id]` returns                                              | Hero, overview, amenities, policies render immediately — never gated on availability  |
| **Availability: idle**    | Only one date set (or both cleared)                                     | Date fields shown; hint "Pick check-in and check-out to see rooms" — no fetch         |
| **Availability: loading** | Both valid dates (incl. demo default on load)                           | **"Checking availability…"** + 2–3 `RoomCard` skeletons, ~1200ms (`aria-live`)        |
| **Availability: success** | Rooms available for the full range                                      | List of `RoomCard`s with ✓ Available + price/night                                    |
| **Availability: empty**   | No room covers every night (incl. `available_dates: []`, ~15% of stock) | `EmptyState`: "No rooms available for these dates" + "Try different dates"            |
| **Availability: error**   | Fetch fails / times out                                                 | `InlineError`: "Couldn't load availability" + **[Retry]** — detail stays fully usable |
| **Validation: blocked**   | `checkout ≤ check-in`                                                   | Inline error "Check-out must be after check-in"; fetch blocked                        |
| **Stale response**        | Dates changed mid-flight                                                | Latest request wins; older response ignored                                           |
| **Unknown hotel**         | Invalid `/hotels/[id]`                                                  | Route renders **not-found** page: "Hotel not found" + "Browse hotels" link            |

---

## 7. Interactions & data model

- **Detail-first render:** static info paints immediately; the availability panel mounts in its
  idle/loading state and resolves independently.
- **Lazy availability:** keyed by `[hotelId, check_in, check_out]`; fetch only when both dates are
  valid and `checkout > check-in`. Latest-wins on rapid date changes (cancel/ignore stale).
- **Dates are client-only** (not in URL) — refresh or a shared link does **not** carry dates;
  the demo defaults re-apply on each load.
- **Availability status** announced via `aria-live="polite"` ("Checking availability…", "2 rooms available", "No rooms available").
- Retry re-issues the same keyed request; the rest of the page is never blocked.

---

## 8. Analytics events (track() facade)

| Event                  | Fires when                                | Payload                                 |
| ---------------------- | ----------------------------------------- | --------------------------------------- |
| `hotel_viewed`         | Detail page mounts                        | `{ hotelId }`                           |
| `availability_checked` | Availability fetch issued for valid dates | `{ hotelId, nights }` (e.g. nights = 2) |
| `no_rooms`             | Availability returns empty for the dates  | `{ hotelId }`                           |

---

## 9. Acceptance checklist (this page)

- [ ] Detail (name, address, description, amenities, policies, star + overall rating, review count) renders immediately, independent of availability.
- [ ] Date fields pre-fill `2026-07-10` → `2026-07-12` and auto-fetch once → viewer sees the **success** state.
- [ ] Availability is lazy + decoupled: ~1200ms "Checking availability…" skeleton, then rooms or empty/error.
- [ ] A room shows available only if every night in `[check-in → check-out)` ∈ `available_dates`.
- [ ] All availability states render: idle, loading, success, "No rooms available", inline error + retry, blocked validation.
- [ ] `checkout ≤ check-in` is blocked with an inline message; partial dates do not fetch; stale responses ignored.
- [ ] RoomCard shows type, bed_type/count, occupancy, sq ft, room amenities, and price/night (USD, tabular-nums). No booking CTA in P1.
- [ ] Unknown `/hotels/[id]` → not-found page with a path back to browsing.
- [ ] Two-pane sticky availability rail on `lg`+; single-column with sticky "Check availability" bar on mobile.
- [ ] Mobile-first verified at 360px; tap targets ≥ 44px; native date picker; no horizontal scroll.
- [ ] WCAG AA: landmarks, labelled date fields, `aria-live` availability status, focus-visible, contrast, no color-only signals.
- [ ] Placeholder hero reserves 16:9 space (no CLS); prices in USD.

```

```
