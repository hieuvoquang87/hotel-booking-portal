# UI/UX Design Spec — Home Page (Search + Hotel Grid)

> Route: `/` · Drives the mock UI for destination search, refine/sort, and the hotel grid.
> Companion spec: [hotel-detail-page-design.md](hotel-detail-page-design.md).
> Sourced from `prd.md`, `architecture.md`, `product-roadmap.md`, `user-flows.md`, `mock-data.json`.

**Visual direction:** Clean & modern — neutral grey scale, one blue accent, photo-forward
rounded cards, generous whitespace. **Mobile-first**, WCAG 2.1 AA.

---

## 1. Design Language (shared — identical in both specs)

### Color tokens (Tailwind slate + blue)

| Token | Hex | Tailwind | Use |
|-------|-----|----------|-----|
| `bg/page` | `#F8FAFC` | slate-50 | Page background |
| `bg/surface` | `#FFFFFF` | white | Cards, bars, sheets |
| `border` | `#E2E8F0` | slate-200 | Dividers, card outline, inputs |
| `text/primary` | `#0F172A` | slate-900 | Headings, key values |
| `text/secondary` | `#475569` | slate-600 | Body, meta |
| `text/muted` | `#94A3B8` | slate-400 | Placeholders, hints |
| `accent` | `#2563EB` | blue-600 | Primary buttons, active fill (≥3:1 UI; 5.1:1 on white) |
| `accent/text` | `#1D4ED8` | blue-700 | Inline text links / small text on white (extra margin) |
| `accent/hover` | `#1D4ED8` | blue-700 | Hover for primary |
| `focus/ring` | `#3B82F6` | blue-500 | 2px ring + 2px offset on focus-visible |
| `success` | `#16A34A` | green-600 | "Available" status |
| `warning` | `#D97706` | amber-600 | Soft warnings |
| `error` | `#DC2626` | red-600 | Validation + inline errors |
| `star` | `#F59E0B` | amber-500 | Filled rating stars |

Color is never the sole signal — pair with icon + text (e.g. ✓ "Available", not green alone).

### Typography

Font: `Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
Prices and counts use `font-variant-numeric: tabular-nums`.

| Role | Mobile → Desktop | Weight | Line-height |
|------|------------------|--------|-------------|
| Display / H1 | 30px → 36px | 700 | 1.2 |
| Section / H2 | 20px → 24px | 600 | 1.25 |
| Card title / H3 | 16px → 18px | 600 | 1.3 |
| Body | 16px | 400 | 1.5 |
| Caption / meta | 14px | 400 | 1.45 |
| Micro / badge | 12px | 500 | 1.4 |

### Spacing, radius, elevation

- **4px base grid** (Tailwind spacing scale). Section rhythm: 24px mobile / 32–48px desktop.
- **Container:** `max-width 1280px` (max-w-7xl), centered; gutters **16px** (base) / **24px** (md) / **32px** (lg).
- **Radius:** cards `rounded-xl` (12px); inputs/buttons `rounded-lg` (8px); pills/badges `rounded-full`.
- **Elevation:** cards `shadow-sm` at rest → `shadow-md` on hover; sheets/popovers `shadow-lg`.

### Breakpoints (Tailwind defaults — mobile-first)

Base styles target the smallest screen; min-width media queries layer up.

| Token | Min width | Primary use |
|-------|-----------|-------------|
| (base) | 0 | Single column, stacked, sticky controls |
| `sm` | 640px | 2-col grid, inline filters begin |
| `md` | 768px | 3-col grid, full toolbar inline |
| `lg` | 1024px | 4-col grid, two-pane detail |
| `xl` | 1280px | Max container, comfortable gutters |

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

Let a traveler **pick a destination → browse that location's hotels → refine, sort, and
paginate** them, then click through to a hotel. Location-first: no hotels load until a
destination is chosen. All refine/sort/page state lives in the URL.

**Out of scope here:** dates, availability, pricing-by-date, booking (see the detail spec).

---

## 3. Page anatomy (zones, top → bottom)

1. **App bar** (sticky) — brand "Stayfinder" (left), minimal. Height 56px mobile / 64px desktop.
2. **Hero search** — H1 "Find your stay", subhead, **destination combobox**.
3. **Refine toolbar** — star filter (segmented "& up"), price min–max, sort select, **result count** (`aria-live`).
4. **Hotel grid** — responsive 1 → 2 → 3 → 4 columns of `HotelCard`.
5. **Pagination** — page size **8**; hidden when a single page.
6. **Footer** — slim; build/version stamp (ops can confirm the deployed build).

### Destination combobox

- Filterable text input over a preloaded list (10 cities across 8 regions: Chicago, New York,
  Miami, Austin, Seattle (USA); London (UK); Paris (FR); Rome (IT); Tokyo (JP); Sydney (AU)).
- Each option renders **City, State — Country** (e.g. "Chicago, IL — USA"). Substring filter as the user types.
- Selecting a **city** loads that city only; selecting a **country** loads all its cities.
- Writes slugified params to URL: `?country=usa&city=chicago`.
- Empty input → show all options. No match → option list shows **"No destinations"**.

### Refine toolbar controls

| Control | Type | Values | URL param |
|---------|------|--------|-----------|
| Star rating | SegmentedControl (**minimum, "& up"**) | `Any` · `3★ & up` · `4★ & up` · `5★` | `stars` (3/4/5; omit = Any) |
| Price range | Two number inputs (USD) | min / max, dataset spans **$75–$590** | `min`, `max` |
| Sort | Select | see below | `sort` |
| Result count | Text, `aria-live="polite"` | "24 hotels" / "1 hotel" / "No hotels" | — |

> **Resolved open question — star filter:** minimum "& up" (segmented), not exact match.

**Sort options** (`sort` value in parens):

1. **Recommended** (`recommended`, **default**) — overall rating desc, stable tiebreak by hotel id
2. Price: Low to High (`price_asc`)
3. Price: High to Low (`price_desc`)
4. Rating: Highest (`rating_desc`) — by `overall_rating`
5. Stars: Highest (`stars_desc`) — by `star_rating`

Changing any filter or sort **resets `page` to 1**. Bad `sort` → default; bad `page` → clamp;
`min > max` → normalize (swap) without crashing.

### HotelCard anatomy

> **Resolved open question — ratings on cards:** show **both** `star_rating` and `overall_rating` + `review_count`.

```
┌──────────────────────────────┐
│  [ 16:9 placeholder photo ]   │  ← slate-100, hotel glyph + name, lazy, no CLS
│  ⌜5★⌝ (star badge, overlay)   │
├──────────────────────────────┤
│  The Grand Luminary       H3  │
│  Chicago, IL · USA   caption  │
│  ★★★★★ 4.8  (1,240)           │  ← RatingStars(overall) + numeric + review_count
│  [pool] [spa] [Wi-Fi] +3      │  ← top 3 amenity pills + "+N"
│  from $199 / night     price  │  ← min room price, tabular-nums
└──────────────────────────────┘
```

- Whole card is one link → `/hotels/[id]`; hover lifts to `shadow-md`; focus shows ring.
- `aria-label`: "The Grand Luminary, 5 star hotel, rated 4.8 from 1,240 reviews, from $199 per night, Chicago Illinois".
- Amenity labels humanized: `free Wi-Fi` → "Wi-Fi", `fitness_center` → "Fitness center".

---

## 4. Wireframes

### Mobile (base, ≤ 640px) — single column, sticky refine

```
┌─────────────────────────────┐
│ ☰  Stayfinder            ⌕  │ sticky app bar (56px)
├─────────────────────────────┤
│ Find your stay              │ H1
│ Browse hotels by destination│ subhead
│ ┌─────────────────────────┐ │
│ │ ⌕ Chicago, IL — USA   ▾ │ │ destination combobox
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ [ Filters ]  Sort: Rec.  ▾  │ STICKY bar → opens bottom sheet
│ 4 hotels                    │ aria-live count
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │   [ 16:9 photo ]   5★   │ │ HotelCard (full width)
│ │ The Grand Luminary      │ │
│ │ Chicago, IL · USA       │ │
│ │ ★★★★★ 4.8 (1,240)       │ │
│ │ [pool][spa][Wi-Fi] +3   │ │
│ │ from $199 / night       │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ … next card …           │ │ cards stack vertically
│ └─────────────────────────┘ │
├─────────────────────────────┤
│        ‹  1  ›   (if >1pg)  │
└─────────────────────────────┘

[ Filters ] tap → bottom sheet:
┌─────────────────────────────┐
│ Filters              ✕      │
│ Star rating                 │
│ (Any)(3★+)(4★+)(5★)         │ segmented
│ Price (USD)                 │
│ [ min ] – [ max ]           │
│ ─────────────────────────── │
│ [ Reset ]      [ Show 4 ]   │ 44px buttons
└─────────────────────────────┘
```

### Desktop (lg ≥ 1024px) — inline toolbar, 4-col grid

```
┌───────────────────────────────────────────────────────────────┐
│ Stayfinder                                                     │ app bar (64px)
├───────────────────────────────────────────────────────────────┤
│ Find your stay                                                 │ H1
│ ┌───────────────────────────────────────────┐                 │
│ │ ⌕ Chicago, IL — USA                     ▾ │   (max-w combobox)│
│ └───────────────────────────────────────────┘                 │
├───────────────────────────────────────────────────────────────┤
│ Stars (Any)(3★+)(4★+)(5★)   Price [min]–[max]   Sort: Rec ▾   │ inline toolbar
│ 4 hotels                                                       │ aria-live
├───────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│ │[ photo ]│ │[ photo ]│ │[ photo ]│ │[ photo ]│  4 columns     │
│ │Grand Lum│ │Riverfrnt│ │  …      │ │  …      │               │
│ │★ 4.8    │ │★ 4.3    │ │         │ │         │               │
│ │from $199│ │from $175│ │         │ │         │               │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘               │
│              ‹  1  2  3  ›   (page size 8)                     │
└───────────────────────────────────────────────────────────────┘
```

---

## 5. Responsive behavior (mobile-first)

Base CSS targets the smallest screen; each breakpoint **adds** capability.

| Zone | base (≤640) | sm (≥640) | md (≥768) | lg (≥1024) | xl (≥1280) |
|------|-------------|-----------|-----------|------------|------------|
| Grid columns | **1** | 2 | 3 | 4 | 4 |
| Refine controls | **Sticky "Filters" button → bottom sheet**; sort inline | filters begin inlining | full toolbar inline | inline | inline |
| App bar | 56px, condensed | 56px | 64px | 64px | 64px |
| Gutters | 16px | 16px | 24px | 32px | 32px |
| Combobox width | full-bleed | full | max 560px | max 560px | max 560px |
| Card photo | 16:9 full width | 16:9 | 16:9 | 16:9 | 16:9 |

**Mobile-first rules (non-negotiable):**
- Designed and verified at 360px width **first**; larger screens are progressive enhancement.
- All tap targets ≥ **44×44px**; ≥ 8px between adjacent targets.
- Refine controls collapse into a **sticky bar + bottom sheet** on mobile — never a cramped inline row.
- One-thumb reachable: primary actions sit in the lower half of the sheet.
- No horizontal scroll at any width; text reflows, never truncates a price or rating.
- Combobox dropdown is full-width and scrollable on mobile; options ≥ 44px tall.

---

## 6. States (every state the mock must render)

| State | Trigger | UI |
|-------|---------|----|
| **No destination** | Initial load, no `country`/`city` | Hero only; grid area = `EmptyState`: map-pin icon, "Start by choosing a destination", combobox focused |
| **No destination match** | Combobox text matches nothing | Dropdown shows **"No destinations"** row (non-selectable) |
| **Loading hotels** | Destination chosen, fetch in flight | **8 skeleton cards** (photo block + 3 text lines shimmer); count reads "Loading hotels…" |
| **Loaded** | Hotels returned | Grid of `HotelCard`; count "N hotels" (`aria-live`) |
| **No hotels found** | Filters exclude all | `EmptyState`: "No hotels found", subtext "Try widening your filters", **[Reset filters]** button |
| **Single page** | ≤ 8 results | Pagination hidden |
| **Slugified params** | URL `?country=united-kingdom&city=london` | Hydrates combobox + filters from URL; back/forward restores exactly |

---

## 7. Interactions & URL model

- **URL is source of truth:** `?country=&city=&stars=&min=&max=&sort=&page=` — shareable, bookmarkable, back-button-correct.
- Filter/sort change → in-memory recompute (< 100ms) over the loaded subset, **no refetch**; `page` resets to 1.
- Combobox: type → substring filter; ↑/↓ to move, Enter to select, Esc to close.
- Result count announced via `aria-live="polite"` on every change.
- Hover: card `shadow-sm → shadow-md`, 150ms ease-out (disabled under reduced-motion).

---

## 8. Analytics events (track() facade)

| Event | Fires when | Payload |
|-------|-----------|---------|
| `search_performed` | Destination selected or filter/sort applied | `{ city, country, filters }` |
| `no_results` | Filters exclude all hotels | `{ filters }` (inventory-gap signal) |
| `hotel_viewed` | Card click → detail mount (owned by detail page) | `{ hotelId }` |

---

## 9. Acceptance checklist (this page)

- [ ] Destination combobox filters by substring; "No destinations" on no match; empty input shows all.
- [ ] Selecting city loads that city; selecting country loads all its cities; URL gets slugified params.
- [ ] Star ("& up") + price range refine in-memory < 100ms; no refetch.
- [ ] Sort offers the 5 options; default = Recommended; filter/sort change resets to page 1.
- [ ] Grid is 1/2/3/4 cols at base/sm/md/lg; cards show both ratings + review count + "from $X".
- [ ] All empty/loading states render (no destination, no match, loading skeletons, no hotels + reset).
- [ ] Pagination at page size 8; hidden on single page; bad `page` clamps, bad `sort` defaults.
- [ ] Mobile-first verified at 360px; tap targets ≥ 44px; sticky filter bar + bottom sheet; no horizontal scroll.
- [ ] WCAG AA: landmarks, labelled controls, `aria-live` count, focus-visible, contrast, no color-only signals.
- [ ] Placeholder photos reserve 16:9 space (no CLS); prices in USD with tabular-nums.
