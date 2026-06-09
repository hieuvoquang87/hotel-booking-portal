# Home Page — Design Gaps & Bugs (live vs. mockup)

**Date:** 2026-06-08
**Compared:** live app at `http://localhost:3001/` (the implemented Home page) vs. the
Stayfinder design mockup `docs/designs/home-page-mockup.html`.

**Method:** both rendered in a real browser and diffed in two states — empty (no destination)
and results (destination = "Chicago, IL"). Visual claims were cross-checked against the source
(`app/globals.css`, `app/layout.tsx`, `components/home/*`, `lib/amenities.ts`) and, where it
mattered, against computed styles in the page.

> **Baseline (confirmed).** The request pointed at a claude.ai design link (`Stayfinder.html`),
> which is behind Cloudflare + login and could not be loaded headlessly, so this diff uses the
> committed `docs/designs/home-page-mockup.html`. The author confirmed the two are the same design,
> so all findings below — bugs and design gaps alike — are measured against the correct target.
>
> **Arbiter for "gap vs. intentional".** Some entries below may be deliberate product decisions
> rather than defects (e.g. the "Phase 1" footer, the rating-first default sort). Check
> `docs/designs/home-page-design-spec.md` and `docs/progress.md` (M4 decisions) before treating a
> design gap as something to "fix". The mockup's build line ("Mock UI · build … · 40 hotels
> indexed") is prototype scaffolding, not a requirement — ignore it.

---

## Priority summary

| # | Issue | Type | Severity |
|---|-------|------|----------|
| 1 | Page background renders **white**, not the design's slate-50 | CSS regression | **High** |
| 2 | Body/heading font renders **Arial**, not Inter (nor even the wired-up Geist) | CSS regression | **High** |
| 3 | Dark-mode media query in `globals.css` flips bg to near-black (no dark theme exists) | CSS bug | **High** |
| 4 | Amenity "free Wi-Fi" renders as **"Free Wi Fi"** (broken humanizer) | Logic bug | **High** |
| 5 | Hotel card shows a **single star**, not the 5-star fractional rating | Design gap | **High** |
| 6 | Missing **"Hotels in {destination}"** results heading | Design gap | Medium |
| 7 | Star filter is a rounded-rect toggle, not the **pill segmented control** | Design gap | Medium |
| 8 | Hero is **left-aligned**; design centers it | Design gap | Medium |
| 9 | Amenity labels uncurated ("Bicycle rentals", "Laundry service", "Breakfast") | Design gap | Medium |
| 10 | Sort is missing the **"Recommended"** option + leading icon | Design gap | Medium |
| 11 | Toolbar missing **"Stars" / "Price"** labels; count on its own row instead of right-aligned | Design gap | Low |
| 12 | Card photo missing diagonal texture + **uppercase name overlay** | Design gap | Low |
| 13 | Card price lacks the **top divider** and larger price type | Design gap | Low |
| 14 | Combobox options missing the **per-option count badge** | Design gap | Low |
| 15 | Brand mark missing the blue **rounded-square badge** | Design gap | Low |
| 16 | Price inputs use "$min/$max" instead of the actual **bound values** as placeholders | Design gap | Low |
| 17 | Footer + empty-state icon color + several copy strings differ | Copy/visual | Low |

---

## Bugs (functional / CSS regressions)

### 1–3. `app/globals.css` is still the Next.js starter and fights the design
The file defines `--background:#ffffff`, a `body { background: var(--background) }` rule, a
`body { font-family: Arial, Helvetica, sans-serif }` rule, and a `prefers-color-scheme: dark`
block. Because these are **unlayered** CSS, they win over Tailwind utilities (which live in a
cascade layer), so they override `app/layout.tsx`'s `<body className="… bg-slate-50">` and the
Geist font variables.

Verified by computed style:
- Live `body` background = `rgb(255,255,255)`; mockup = `rgb(248,250,252)` (slate-50).
- Live `body`/`h1` font = `Arial, Helvetica, sans-serif`; mockup = `Inter, …`.

Consequences:
- **(1)** The whole page is white, so white cards/header have almost no contrast against the page
  — the design's soft slate-50 canvas is gone.
- **(2)** Type renders in Arial. The design uses Inter; the layout even tries to load Geist — both
  are being suppressed.
- **(3)** On a device set to dark mode, `--background` becomes `#0a0a0a` and the page goes
  near-black while every card, text color, and border stays light-themed → unreadable. The app
  has no dark theme; this block should not exist.

**Fix:** replace the starter `globals.css` body/background/font/dark-mode rules so the design
tokens (slate-50 canvas, Inter or the intended Geist, no dark override) actually apply. This one
change resolves 1, 2, and 3.

### 4. Amenity humanizer mangles "free Wi-Fi" → "Free Wi Fi"
`lib/amenities.ts` only special-cases the keys `free_wifi` / `wifi`, but the seed token is
`"free Wi-Fi"` (a space, and a hyphen inside "Wi-Fi"). It falls through to the generic transform:
`^free[_-]` doesn't match `"free "` (space, not `_`/`-`), then `[_-]+ → space` splits the hyphen,
yielding **"Free Wi Fi"**. Wi-Fi appears on nearly every card, so this is the most visible label
defect. The mockup shows **"Wi-Fi"**.

**Fix:** handle the actual seed token (`"free Wi-Fi"`) and, ideally, adopt the mockup's curated
label map (see #9).

---

## Design gaps (visual fidelity)

### 5. Hotel card rating: single star vs. 5-star fractional display
`components/home/HotelCard.tsx` renders one `<Icon name="star" />` + the number + count. The
mockup renders a 5-star row with a fractional amber fill (`RatingStars`) + number + count — a much
richer rating signal. **No `RatingStars` component exists yet.**

### 6. Missing "Hotels in {destination}" results heading
The mockup shows an `<h2>` "**Hotels in Chicago, IL**" (destination in the blue accent) above the
grid. `HomeView.tsx` goes straight from the toolbar/count to `HotelGrid` with no heading.

### 7. Star filter — segmented control style
Mockup: a **pill-shaped** track (`rounded-full`, slate-100 background) where the active option is a
white pill with blue text + subtle shadow. Live (`SegmentedStars.tsx`): a rounded-rectangle group
where the active option is a solid blue block with white text. Different shape and active treatment.

### 8. Hero alignment
Mockup centers the hero (title, subtitle, and the 560px search box are centered). Live left-aligns
everything (`HomeView.tsx` hero section has no centering).

### 9. Amenity labels are uncurated
Beyond the Wi-Fi bug, the generic transform diverges from the mockup's curated dictionary:

| Seed token | Live renders | Mockup |
|---|---|---|
| `free Wi-Fi` | Free Wi Fi | Wi-Fi |
| `free_breakfast` | Breakfast | Free breakfast |
| `bicycle_rentals` | Bicycle rentals | Bikes |
| `laundry_service` | Laundry service | Laundry |

The mockup ships a ~30-entry `AMENITY_LABEL` map; `lib/amenities.ts` has 2 entries + a fallback.

### 10. Sort control — missing "Recommended" + icon
`SortSelect.tsx` offers rating / price-asc / price-desc / stars and defaults to "Rating: Highest".
The mockup offers **Recommended** (default) plus the four, and renders a leading sort icon inside
the select. (Functionally "rating" == "recommended" here, so it's a label/option gap, not a sort
behavior bug.)

### 11. Toolbar labels & count placement
Mockup prefixes the controls with "**Stars**" and "**Price**" labels and right-aligns the result
count ("4 hotels") on the same row as the controls. Live (`RefineToolbar.tsx`) has no Stars/Price
labels and drops the count onto a separate row below, left-aligned.

### 12. Card photo placeholder is plainer
Mockup placeholder: diagonal stripe texture + building glyph + the **hotel name in uppercase**
along the bottom + star badge. Live: flat slate-100 + building glyph + star badge only.

### 13. Card price typography
Mockup separates the price from the amenity pills with a **top border** and renders the value large
(18px bold). Live has no divider and uses `text-sm` (14px) semibold.

### 14. Combobox options missing count badges
Mockup options carry a count pill (e.g. "Chicago, IL USA **4**", "All hotels in USA **20**"). Live
options (`DestinationCombobox.tsx`) show the label only.

### 15. Brand mark
Mockup: a blue rounded-square badge containing a white pin. Live (`layout.tsx`): a bare blue pin
icon next to the wordmark, no badge.

### 16. Price input placeholders
Mockup uses the actual price bounds as placeholders ("$ 75" … "$ 590"); live (`PriceRange.tsx`)
uses generic "$min" / "$max".

### 17. Star badge, footer, empty-state icon & copy
- **Star badge format:** mockup "★ 5" (icon + number); live "5★" (number + glyph).
- **Footer:** mockup is a fixed bar — "Stayfinder" left, build/index line right; live is a
  centered "Stayfinder · Phase 1" in normal flow.
- **Empty-state icon:** mockup uses a blue tint (`#EFF4FF` bg + blue pin); live uses a gray/slate
  circle + slate pin.
- **Copy strings:**
  - Hero subtitle — live "Browse hotels by destination." vs mockup "Browse hotels by destination —
    pick a city or country to begin."
  - Empty state — live "Pick a city or country to see hotels." vs mockup "Pick a city or country
    above to see available stays."
  - No results — live "Try widening your filters." vs mockup "Try widening your filters to see more
    stays."

---

## Verified NOT issues (checked, working as intended)

- **Combobox text filtering works.** Typing "tokyo" narrows the DOM to a single option (the
  accessibility snapshot was stale; the live DOM confirmed 1 option).
- **Default sort order matches.** "rating" (live default) and "recommended" (mockup default) both
  sort by overall rating descending — same order on screen.
- **Responsive grid matches** — 1 / 2 / 3 / 4 columns at the same breakpoints.
- **Card hover, skeletons, pagination, mobile filter sheet** are all present and structurally
  consistent with the mockup.

---

## Suggested fix order

1. **`app/globals.css`** — the single highest-leverage fix; clears #1, #2, #3 (background, font,
   dark-mode) at once.
2. **`lib/amenities.ts`** — fix `free Wi-Fi` + adopt the curated label map (#4, #9).
3. **`HotelCard.tsx` + new `RatingStars`** — 5-star fractional rating (#5), then price divider /
   star badge / photo name overlay (#12, #13, #17).
4. **`HomeView.tsx`** — center hero (#8), add the "Hotels in {destination}" heading (#6), align
   copy (#17).
5. **Toolbar set** — `SegmentedStars` pill style (#7), `RefineToolbar` labels + count placement
   (#11), `SortSelect` Recommended + icon (#10), `PriceRange` placeholders (#16).
6. **`DestinationCombobox.tsx`** count badges (#14) and **`layout.tsx`** brand badge + footer (#15,
   #17).

---

## Proposed changes for the 3 reported items (review follow-up)

> Suggestions only — **not applied**. Derived from the live screenshot vs. mockup (Austin, TX).
> Everything below is CSS/styling; the only at-risk tests assert `SortSelect` has exactly 4 options
> and `SegmentedStars` `aria-pressed` — both preserved here. Run `npm run typecheck && npm test`
> after applying.

### Item 1 — Sort / Price / Stars controls don't match the mockup's styles
All in `components/home/`.

**A. Stars filter → pill segmented control** — `SegmentedStars.tsx`
Live = rounded-rectangle group, active = solid blue block. Mockup = pill track on slate-100, active
= white pill + blue text + shadow.
- Track: `inline-flex items-center gap-0.5 rounded-full border border-slate-200 bg-slate-100 p-[3px]`
- Button: `min-h-11 rounded-full px-3.5 text-[13.5px] font-semibold whitespace-nowrap …`
- Active: `bg-white text-blue-700 shadow-sm` · Inactive: `text-slate-600 hover:text-slate-900`
- Keep `role` / `aria-pressed` and the labels (tests assert these).

**B. Sort → bordered select with a leading sort icon** — `SortSelect.tsx` (+ `Icon.tsx`)
- Add a `'sort'` glyph (up/down arrows) to `Icon.tsx`'s `IconName` union + `PATHS`.
- Wrap the select in `relative inline-flex items-center`; select gets
  `appearance-none border-slate-300 rounded-lg pl-9 pr-9 min-h-11 text-sm font-medium`; leading
  `<Icon name="sort">` absolute-left, trailing `<Icon name="chevron">` absolute-right.
- Keep `aria-label="Sort hotels"` and the **4** options. Do **not** add "Recommended" here — that's
  a separate behavioral change (tracked as #10) and it would break the 4-option test.

**C. Price → match the input chrome + show the achievable range** — `PriceRange.tsx`
- Border `border-slate-300`; add `focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/15`.
- Replace the `"min"`/`"max"` placeholders with the loaded location's price bounds: add an optional
  `bounds?: [number, number]` prop and use `String(bounds[0])` / `String(bounds[1])`, falling back
  to `min`/`max`.

**D. Toolbar labels + count placement** — `RefineToolbar.tsx`, `HomeView.tsx`
- Prefix each group with a `text-[13px] font-semibold text-slate-600` label: "Stars", "Price", "Sort".
- Move `ResultCount` onto the controls row, right-aligned (`ml-auto`) instead of a separate row below.
- Compute `priceBounds` in `HomeView` from `hotels.data` (`[min, max]` of `priceFrom`) and thread it
  → `RefineToolbar` → `PriceRange`.

### Item 2 — Missing background color + dividers
**A. Page background** — `app/globals.css`. The page renders white, not slate-50, because the starter
rule `body { background: var(--background) }` (`#fff`, unlayered) overrides the `bg-slate-50` utility
on `<body>`. Remove the `background` declaration from that `body` rule so the utility wins. Also drop
the `@media (prefers-color-scheme: dark)` block — otherwise it flips the new slate-50 to near-black
(the app has no dark theme).
**B. Toolbar divider** — `RefineToolbar.tsx`: add `border-b border-slate-200` to the toolbar wrapper.
**C. Card price divider** — `HotelCard.tsx`: add `border-t border-slate-200 pt-3` to the price `<p>`
so it separates from the amenity pills (mockup has this; live doesn't).

### Item 3 — Always-on vertical scrollbar (no layout shift)
**`app/globals.css`** — add `html { overflow-y: scroll; }`. The scrollbar gutter is always reserved,
so content overflow (more hotels loading) never shifts the layout horizontally.
- Alternative: `html { scrollbar-gutter: stable; }` reserves the gutter without always painting the
  track — choose based on whether you want the bar always *visible* (`overflow-y: scroll`) or just
  the space reserved (`scrollbar-gutter: stable`).

---

## Note — pagination must stay client-side (no page refresh / refetch)

**Requirement:** paging through results must **not** reload the page or re-fetch hotels from the
server. A page change only re-slices the already-loaded location set in memory.

**Current status — already satisfied** (verified in code):
- `components/home/Pagination.tsx` → `onPage` → `HomeView` calls `setParams({ page })`.
- `hooks/useHotels.ts` query key is `['hotels', country, city]` — **`page` is not in the key**, so
  changing page is a React Query cache hit → **no network refetch**.
- Paging is an in-memory slice in `hooks/useFilteredHotels.ts` (filter → sort → paginate over the
  bounded set), per the architecture's "filter/sort/paginate that subset in memory (< 100ms)".
- `hooks/useSearchParamsState.ts` `setParams` uses `router.replace(...)` → a **soft client-side URL
  update**, not a full page reload.

**One nuance to preserve:** `page` *is* written to the URL (`?page=2`) on purpose — it keeps
pagination shareable and back-button-correct (architecture invariant: URL is the source of truth for
client state). That is a URL update, **not** a page refresh or a refetch. If "no update" is meant to
also drop `page` from the URL, that trades away shareable/bookmarkable pagination — flag before
changing.

**Guard against regressions:** keep `page` out of the `useHotels` query key, and never move
pagination to a server fetch or a route navigation that re-runs the hotel fetch.
