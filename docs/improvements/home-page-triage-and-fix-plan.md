# Home Page — Triage & Fix Plan (post‑M5)

**Date:** 2026-06-08
**Baseline:** branch `docs/bugs-and-issues` after merging `origin/main` → M5 (`e4a6d16`,
"design‑system foundation, M4 refactor & hotel detail/availability").
**Inputs:** `issues/home-page-design-gaps.md` (17 fidelity/bug findings) +
`docs/improvements/home-page-enhancements.md` (8 engagement ideas).
**Priority lens (agreed):** *Engagement / product value* — convert destination intent into
engaged browsing. A page that looks broken converts nobody, so near‑free correctness comes
first, then the pre‑search discovery surface, then richer results, then pure polish.

> Method: every status below was re‑verified against the current source after the M5 merge
> (file inspection, cross‑checked against the seed and existing tests). CSS verdicts are by
> cascade inspection, not a re‑render.

---

## ✅ Resolution log (2026-06-09)

**All 17 design‑gap issues are now resolved.** #1–#3 were fixed by the M5 merge; the remaining
13 open + 1 partial (#4–#17) were implemented in this pass and verified. Enhancements (the 8
ideas in `home-page-enhancements.md`) remain intentionally out of scope.

- **Verification:** `npm run typecheck` clean · `npm test` 66 suites / **285** tests green
  (272 → 285; new amenity cases) · `npm run lint` clean · browser‑checked on the running dev
  server (Playwright): 4 Chicago cards render with fractional stars, "Hotels in Chicago, IL"
  heading, "Wi‑Fi"/curated amenity pills, pill star filter, "Recommended" sort, real price‑bound
  placeholders, brand badge — **zero console/page errors**.
- **Test contract updates (design‑driven, not loosened):** `amenities.test.ts` expanded for the
  curated map; `AmenitiesGrid.test.tsx` `free_parking → "Free parking"` (was the old strip‑prefix
  behavior #9 corrects); `HotelCard.test.tsx` name→heading query (name now also in the photo
  overlay) and price asserts `$199` (price line restructured for #13).
- **Decisions applied:** D1 → fractional `RatingStars` (shared with the detail page, no API
  change); D2 → relabel `rating`→"Recommended" (kept 4 options, tests intact); D3 → kept Geist;
  D4 → deterministic stripe/gradient placeholder (no external imagery).
- **Note:** the M5 merge had left the working tree with a corrupted `package.json`
  (`next: ^9.3.3`) + lockfile; restored from HEAD and `npm ci`'d to a healthy Next 16 baseline
  before any fixes. The footer "Stayfinder · Phase 1" was left as‑is: the design spec
  (`home-page-design-spec.md` §Footer) calls for a "slim build/version stamp", which the current
  slim Phase‑1 stamp satisfies; the mockup's verbose build line is "ignore" per the gaps doc.
- **#16 covers both surfaces:** `priceBounds` is threaded to the desktop `RefineToolbar` **and**
  the mobile `FilterSheet` price inputs (80%‑mobile app — the sheet is the primary surface).

The per‑issue statuses in Section A below reflect the **pre‑fix** audit and are superseded by
this log.

---

## A. Status of the 17 design‑gap issues (re‑verified vs. latest)

**Resolved 3 · Partial 1 · Open 13.**

| # | Issue | Status | Evidence in latest |
|---|-------|--------|--------------------|
| 1 | White bg, not slate‑50 | ✅ **Resolved** | `globals.css` → `body { @apply bg-background }`; `--background: oklch(98.4% …) /* slate-50 */`. Starter `body{background:#fff}` gone. |
| 2 | Arial font | ✅ **Resolved** | `html { @apply font-sans }` = Geist. No `font-family: Arial`. *(Geist, the wired‑up font — not Inter; see decision D3.)* |
| 3 | `prefers-color-scheme: dark` block | ✅ **Resolved** | Removed; dark is now an opt‑in `.dark` class variant — no auto‑flip. |
| 5 | Card single‑star rating | ⚠️ **Partial** | `RatingStars` component now **exists** (used on detail page) but **`HotelCard` still renders one `<Icon name="star">`**. Component also rounds (`Math.round`) → whole‑star, not the mockup's fractional fill. |
| 4 | `free Wi‑Fi` → "Free Wi Fi" | ❌ Open | `lib/amenities.ts` unchanged; seed `"free Wi-Fi"` ×40. |
| 6 | No "Hotels in {dest}" heading | ❌ Open | `HomeView.tsx` goes toolbar→grid. |
| 7 | Stars not a pill control | ❌ Open | `SegmentedStars` = `rounded-lg`, active = solid `bg-primary`. |
| 8 | Hero left‑aligned | ❌ Open | `HomeView` hero `section` has no centering. |
| 9 | Uncurated amenity labels | ❌ Open | `amenities.ts` = 2 entries + fallback. |
| 10 | Sort lacks "Recommended" + icon | ❌ Open | `SortSelect` = 4 options, no leading icon (`Icon` has no `sort` glyph). |
| 11 | No Stars/Price labels; count on own row | ❌ Open | `RefineToolbar` count in `pt-2` row, no labels. |
| 12 | Card photo flat, no name overlay | ❌ Open | `HotelCard` = `bg-muted` + glyph + badge. |
| 13 | Card price no divider / larger type | ❌ Open | price `<p>` = `pt-1 text-sm`, no `border-t`. |
| 14 | Combobox options lack count badge | ❌ Open | options render `{o.label}` only. |
| 15 | Brand mark lacks badge box | ❌ Open | `layout.tsx` = bare pin + wordmark. |
| 16 | Price placeholders "min/max" | ❌ Open | `PriceRange` hardcodes `"min"`/`"max"`. |
| 17 | Star‑badge order, footer, empty‑icon, copy | ❌ Open | card `{starRating}★`; footer "Phase 1"; `EmptyState` gray `bg-muted` circle; short copy strings. |

**Also from the gaps doc's "3 reported items" appendix:** the *background* proposal is now done
(✅, folded into #1); the *card/toolbar dividers* and *always‑on scrollbar gutter* are **not**.

## B. Status of the 8 enhancement ideas

**All 8 not started.** M5 shipped the hotel‑detail page + shared `components/ui/*` + `RatingStars`
+ design tokens — none of the home‑page engagement surfaces. So #1 Popular destinations, #2 Hero
glow‑up, #3 Quick chips, #4 Collections, #5 Card badges, #6 Imagery, #7 Trust strip,
#8 Recently‑viewed all remain greenfield.

---

## C. Prioritized backlog (engagement lens) → work units

Remaining work = 13 open issues + 1 partial + 8 enhancements, consolidated into 5 shippable units
(overlaps between the two docs merged so nothing is double‑counted). Sequenced top‑to‑bottom.

| Unit | Tier | Covers (issues / enh) | Effort |
|------|------|------------------------|--------|
| **U1 — Amenity labels** | 0 (cleanup) | #4, #9 | **S** |
| **U2 — Discovery surface & hero** | 1 (engagement core) | Enh #1, #2, #3, #7 · #8 (center), #6 (heading), #17 (copy) | **L** (4 slices) |
| **U3 — Richer hotel card** | 2 | #5 (+Enh #5), #12 (+Enh #6a), #13, #17 (badge order) | **M** |
| **U4 — Toolbar fidelity** | 3 | #7, #10, #11, #16 | **M** |
| **U5 — Brand & chrome** | 4 | #14, #15, #17 (footer, empty‑icon) | **S–M** |
| **Deferred (P2)** | — | Enh #4 (amenity intents), #8 (recently‑viewed), #6b (external imagery); dates‑in‑hero (scope change) | — |

---

## D. Fix plan per unit

### U1 — Amenity labels  ·  closes #4, #9  ·  S
- **File:** `lib/amenities.ts`.
- **Do:** key the actual seed token `"free Wi-Fi"` → `"Wi-Fi"`; adopt the mockup's curated
  ~30‑entry `AMENITY_LABEL` map (`free_breakfast`→"Free breakfast", `bicycle_rentals`→"Bikes",
  `laundry_service`→"Laundry", …); keep the generic transform as fallback.
- **Tests:** update `tests/unit/lib/amenities.test.ts` (add the curated cases incl. `free Wi-Fi`).
- **Deps:** none. Highest leverage‑per‑effort; do first.
- **Freebie to attach:** add `html { scrollbar-gutter: stable; }` to `globals.css` (gaps‑doc
  reported‑item 3) — one line, prevents pagination layout shift.

### U2 — Discovery surface & hero  ·  closes Enh #1/#2/#3/#7, #6, #8, #17(copy)  ·  L → 4 slices
The engagement centerpiece. **Invariant:** everything pre‑destination may read **only**
`useLocations()` (already cached) — never hotel records. Build mobile‑first.
- **U2a Hero glow‑up** (`HomeView.tsx`): center the hero (#8), benefit headline + dynamic subcopy
  with live counts ("Compare 40 stays · 10 cities · 6 countries"), soft gradient band, align copy
  strings to the mockup (#17). *S.*
- **U2b Popular destinations** (new `components/home/PopularDestinations.tsx`): grid/carousel of
  destination tiles w/ hotel counts from `buildDestinationOptions`; click → `onSelect`. Replaces the
  bare empty state pre‑search. *S–M.*
- **U2c Quick‑destination chips** (new `QuickChips.tsx`): 4–6 top‑by‑count chips under the search. *S.*
- **U2d Trust strip + results heading** (`HomeView.tsx`, new `TrustStrip.tsx`): honest value‑prop row
  (#Enh 7); add the "Hotels in {dest}" results heading (#6). *S.*
- **Tests:** component render tests per new component; assert destination tiles fire `onSelect`.
- **Deps:** independent of U1; safe to start in parallel.

### U3 — Richer hotel card  ·  closes #5, #12, #13, #17(badge) + Enh #5/#6a  ·  M
- **File:** `components/home/HotelCard.tsx` (+ maybe `components/RatingStars.tsx`).
- **Do:** swap the single star for `RatingStars` (#5); add value badges — "Guest favourite"
  (rating ≥ 4.7 + healthy review count), "Top rated", "Great value" (below loaded‑set median)
  — all derived from the already‑loaded location set, invariant‑safe (Enh #5); add a `border-t`
  price divider + 18px value (#13); deterministic per‑id **gradient** placeholder + uppercase name
  overlay (#12 / Enh #6a); flip star badge to "★ 5" order (#17).
- **Tests:** extend `HotelCard` render test for stars/badges/price divider.
- **Decision D1:** upgrade `RatingStars` to fractional amber fill, or keep rounded whole‑star?

### U4 — Toolbar fidelity  ·  closes #7, #10, #11, #16  ·  M
- **Files:** `SegmentedStars.tsx`, `SortSelect.tsx`, `Icon.tsx`, `RefineToolbar.tsx`,
  `PriceRange.tsx`, `HomeView.tsx`.
- **Do:** pill segmented track (slate‑100, white active pill + blue text) keeping `role`/
  `aria-pressed` (#7); add a `sort` glyph to `Icon` + leading icon in `SortSelect`, relabel default
  to "Recommended" (#10 — see D2); add "Stars"/"Price" labels and move `ResultCount` onto the
  controls row, right‑aligned (#11); thread `priceBounds` `[min,max]` from `HomeView` → `RefineToolbar`
  → `PriceRange` for real placeholders (#16).
- **Tests at risk:** `SortSelect.test.tsx` (line 10 asserts **4** options, line 9 asserts
  `value === 'rating'`), `SegmentedStars.test.tsx` (`aria-pressed`) — preserve both.
- **Decision D2:** for #10, relabel existing `rating`→"Recommended" (keeps **4** options, test
  intact — verified: relabeling display text keeps both `SortSelect.test.tsx` assertions, since
  value stays `rating`) rather than adding a 5th option (would break the length‑4 assertion).
  Recommended.

### U5 — Brand & chrome  ·  closes #14, #15, #17(footer, empty‑icon)  ·  S–M
- **Files:** `DestinationCombobox.tsx`, `app/layout.tsx`, `components/EmptyState.tsx`.
- **Do:** per‑option count badge in combobox results (#14); blue rounded‑square brand badge w/ white
  pin in the header (#15); footer + empty‑state icon to blue tint (`#EFF4FF` bg + blue pin) and
  remaining copy (#17).
- **Tests:** light render assertions.

### Deferred (P2 — deliberately not now)
- **Enh #4 amenity "vibe" intents** — needs P2 amenity filtering; pairs with the planned SEO intent
  slugs. (Star/price collections, Enh #4‑P1, stay parked as a bigger bet — see D5.)
- **Enh #8 recently‑viewed** — needs a client store + detail‑page write; SSR/hydration care.
- **Enh #6b external city imagery** — network dependency, perf/CLS + licensing decision.
- **Dates+guests in hero** — scope change; dates are deliberately off the home page / out of the URL.

---

## E. Open decisions
- **D1 — RatingStars fidelity:** fractional amber fill (matches mockup) vs. keep rounded whole‑star.
- **D2 — Sort "Recommended":** relabel `rating`→"Recommended" keeping 4 options (preserves the
  option‑count test) — *recommended* — vs. adding a 5th option.
- **D3 — Font:** accept **Geist** (the wired‑up, intended font; closes #2's Arial bug) vs. switch to
  **Inter** to match the mockup exactly. *Recommend accept Geist.*
- **D4 — Imagery:** deterministic per‑id **gradients** now (zero‑dependency, in U3) vs. invest in
  external city imagery (Enh #6b, deferred). *Recommend gradients now.*
- **D5 — Star/price collections (Enh #4‑P1):** keep parked as a bigger bet, or promote into U2 as a
  fifth discovery slice. *Currently parked.*
- **D6 — Unit sequencing (assumption, not settled):** the table lists U1 (amenity fix) before U2
  (the discovery surface — the actual engagement lever). U1 is S and the two are independent, so
  order barely matters operationally, but the engagement lens could equally justify leading with
  **U2b Popular destinations**. The lens was confirmed; this ordering was *not* — flip it on review
  if you'd rather lead with the discovery win.

## F. Execution preconditions (when a unit gets implemented)
Per `CLAUDE.md`/`AGENTS.md`, these fire at implementation time — not for this plan doc, but don't
forget them at handoff:
- **GitNexus impact analysis** before editing any symbol (`gitnexus_impact … direction:"upstream"`),
  and `gitnexus_detect_changes()` before committing.
- **`docs/progress.md` check‑off** — tick the task only when its "Done when" gate is met (tests green,
  behavior verified) and sync the Progress‑at‑a‑Glance row.
- **Read `node_modules/next/dist/docs/`** before any Next‑specific code (Next 16 has breaking changes
  vs. training data).

## G. Housekeeping
- `docs/issues/` is empty; the gaps doc lives at repo‑root `issues/home-page-design-gaps.md`. Move it
  under `docs/issues/` so the two source docs sit together (separate from acting on this plan).
