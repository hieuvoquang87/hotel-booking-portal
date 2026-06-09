# Home Page Enhancements — Making Discovery More Engaging

**Date:** 2026-06-08
**Status:** In progress — implementing visual-first slice (#2 Hero glow-up, #6a Gradient placeholders, #7 Trust strip). New features (Popular Destinations, Quick Chips, Curated Collections) deferred.
**Branch:** `feat/home-page-enhancements`
**Inspiration:** Booking.com home page (search-first hero + offers + "browse by property type" +
destination discovery), filtered through *this* product's Phase-1 scope.

---

## Goal

The current home page is correct and clean, but **flat** — until you pick a destination there is
almost nothing to look at or do, and even the results are visually quiet (gray placeholder cards, no
imagery, no social proof, no inspiration). This doc proposes ways to make the page feel more alive
and to convert "destination intent into engaged hotel browsing" (the PRD's stated business goal)
without breaking the architecture or pulling Phase-2 work forward.

---

## Why the current home feels flat (honest critique)

Grounded in the live page (`components/home/HomeView.tsx` + children):

1. **The pre-search state is a dead end.** Before a destination is chosen the whole page is a hero +
   one empty-state message ("Start by choosing a destination"). All the screen real estate is idle.
2. **No imagery or color.** The seed has no photos, so cards are gray building-icon placeholders and
   the page is white-on-white. There's no visual hook.
3. **One narrow path in.** The *only* way forward is the destination combobox. There's no browsing,
   no "show me something," no inspiration for an undecided traveler.
4. **Results are low-signal.** Cards show rating + price + amenities but no differentiation — no
   "guest favourite," "great value," or "top rated" cues that make scanning fun and build trust.
5. **No reason to trust or return.** No value props, no social proof, no recently-viewed.

---

## Borrow vs. skip from Booking.com

| Booking.com element | Verdict | Why |
|---|---|---|
| Benefit-driven hero headline + subcopy ("Find deals for any season…") | **Borrow** | Cheap, sets a tone; ours is a plain label. |
| Search front-and-center | **Already have** (destination); consider dates/guests affordance | Dates are deliberately deferred to the detail page (see guardrails). |
| "Offers"/deals carousel | **Adapt → curated collections** | We have no promos; reframe as editorial/discovery, not discounts. |
| "Browse by property type" tiles | **Adapt → browse by destination / vibe** | We don't model property types; we *do* have destinations + amenities. |
| Destination discovery ("Browse … in Los Angeles") | **Borrow** (our biggest win) | We already load the destinations list with counts. |
| Trust signals / reviews | **Borrow (light)** | We have ratings + review counts; honest social proof. |
| Flights / Cruises / Car / Attractions nav | **Skip** | Out of scope — single-vertical hotel discovery. |
| Sign in / Register / Genius rewards / credit-card offers | **Skip** | No auth, payments, or accounts in scope. |
| "List your property" | **Skip** | Supply-side, out of scope. |

---

## Guardrails (so every idea stays valid)

These come straight from `architecture.md` / `prd.md` / `product-roadmap.md`:

- **Location-first — never ship global inventory.** Anything shown *before* a destination is chosen
  may use only the **destinations list** (`useLocations`, already cached once) — *not* hotel records.
  "Featured/trending hotels" on the landing would require loading hotels with no location → **breaks
  the invariant.** Prefer **featured destinations**. (A curated "editor's picks" could be a tiny
  dedicated BFF endpoint later, but that's a deliberate P2 decision, not a freebie.)
- **Mobile-first (80%).** Every section must work as a vertical/− horizontally-scrolling mobile
  layout first; desktop enhances.
- **Dates are intentionally not on the home page / not in the URL.** A Booking-style dates+guests
  search box here is a *scope change*, not a quick win — call it out, don't assume it.
- **P1 filters are star + price only.** Amenity-based "vibe" chips (beachfront, pet-friendly) need
  amenity filtering, which is **P2** (and aligns with the planned SEO "intent slugs"). Star/price
  collections (Luxury 5★, Under $100) are P1-feasible today.
- **No images in seed.** Imagery must come from deterministic placeholders or an external image
  source — a real decision with perf/dependency tradeoffs.

---

## Idea catalog

Each idea: **what it is · why it's more interesting · data & feasibility · effort · risks.**

### 1. Discovery surface: "Popular destinations" (★ top recommendation)
- **What:** Replace the bare pre-search empty state with a grid/carousel of destination tiles — the
  10 cities (and/or 6 countries), each showing name, country, and **hotel count**, clicking sets the
  destination and runs the existing flow.
- **Why interesting:** Turns idle space into a one-tap browsing surface; gives undecided users a way
  in; immediately shows the catalog has breadth.
- **Data & feasibility:** Uses **only** `useLocations()` + the counts already derived in
  `buildDestinationOptions` → **fully P1-feasible and invariant-safe.** No new endpoint.
- **Effort:** S–M. **Risks:** none material; placeholder tiles need visual treatment (see #6).

### 2. Hero glow-up
- **What:** Benefit-driven headline + dynamic subcopy (e.g. "Compare {40} stays across {10} cities in
  {6} countries — by rating and price, in seconds"), a soft on-brand gradient band behind the hero
  (we have no photos, so use color/shape for depth), and the destination search kept central.
- **Why interesting:** First impression goes from "form" to "product"; the live numbers signal scale.
- **Data & feasibility:** Counts come from `useLocations`. P1-feasible.
- **Effort:** S. **Risks:** keep contrast/accessibility on the gradient.

### 3. Quick-destination chips
- **What:** A row of 4–6 one-tap chips under the search ("Tokyo", "Paris", "New York", "London"…)
  that select a destination instantly.
- **Why interesting:** Removes the "what do I type" friction; fast path for popular places.
- **Data & feasibility:** From the destinations list (e.g. top by hotel count). P1-feasible.
- **Effort:** S. **Risks:** choosing "popular" deterministically (sort by count, stable).

### 4. Curated collections / "Browse by vibe"
- **What:** Inspiration tiles/chips: **P1 today** — "Luxury (5★)", "Under $100/night", "Top rated".
  **P2 bridge** — "Beachfront", "Pet-friendly", "Rooftop bars" (amenity intents, which match the
  roadmap's planned `/hotel/.../beachfront` slugs).
- **Why interesting:** Gives a reason to explore beyond a known city; editorial feel.
- **Data & feasibility:** Star/price collections work with P1 filters once a destination is chosen
  (or pre-arm the filter). Amenity collections need P2 amenity filtering + (ideally) intent landing
  pages — **don't build the amenity ones in P1.**
- **Effort:** M (P1 subset) / L (P2 intents). **Risks:** scope creep into P2 — keep the split clear.

### 5. Richer result cards + honest social proof
- **What:** Add scannable badges to `HotelCard`: **"Guest favourite"** (e.g. rating ≥ 4.7 with a
  healthy review count), **"Top rated"**, or **"Great value"** (priced below the loaded location's
  median). Make the rating use the mockup's 5-star display (already tracked as gap #5).
- **Why interesting:** Booking-style cues make scanning feel rewarding and build trust; differentiate
  otherwise-uniform cards.
- **Data & feasibility:** All derivable client-side from the **already-loaded** location set
  (`overall_rating`, `review_count`, `priceFrom`) → invariant-safe. P1-feasible.
- **Effort:** S–M. **Risks:** keep thresholds honest and documented; don't badge everything.

### 6. Real-feeling imagery (kills the gray)
- **What:** Replace flat gray placeholders with either (a) deterministic per-hotel **gradients**
  (hash the id → hue) with the building glyph, or (b) **city imagery** via an external source
  (Unsplash Source / picsum seeded by city).
- **Why interesting:** Single biggest visual lift; the page stops looking like a wireframe.
- **Data & feasibility:** (a) is zero-dependency and safe (recommended default). (b) adds a network
  dependency, perf cost, and licensing/looks risk; the seed has **no** image field, so this is a
  deliberate choice, not data we have.
- **Effort:** S (gradients) / M (external images). **Risks:** external images → CLS/perf, attribution.

### 7. Trust / value-prop strip
- **What:** A compact row under the hero: e.g. "Real guest ratings · Filter by price & stars · No
  booking fees · {40}+ properties." Honest given mock data.
- **Why interesting:** Cheap credibility + color; orients first-time visitors.
- **Effort:** S. **Risks:** keep claims truthful for the demo.

### 8. Recently viewed (personalization, no auth)
- **What:** Persist the last few viewed hotels in `localStorage`; show a "Recently viewed" rail on
  the home page.
- **Why interesting:** Adds continuity/personalization without accounts; a reason to return.
- **Data & feasibility:** Client-only; needs storing small hotel summaries. **P2-leaning** (adds a
  store + detail-page write).
- **Effort:** M. **Risks:** stale entries; SSR/hydration care.

---

## Recommended composition (mobile-first, top → bottom)

```
┌───────────────────────────────────────────────┐
│  HERO  (soft gradient band)                    │
│    Find your perfect stay                      │
│    Compare 40 stays · 10 cities · 6 countries  │
│   ┌──────────────────────────────┐             │
│   │ 🔍  Search a city or country │  (combobox) │
│   └──────────────────────────────┘             │
│    [Tokyo] [Paris] [New York] [London]  ← chips│  (#3)
├───────────────────────────────────────────────┤
│  Real ratings · Stars & price filters · 40+ …  │  (#7 trust strip)
├───────────────────────────────────────────────┤
│  POPULAR DESTINATIONS            (pre-search)  │  (#1 — the centerpiece)
│  [Chicago 4] [Austin 4] [Miami 4] [Tokyo 4] …  │
├───────────────────────────────────────────────┤
│  BROWSE BY VIBE                                │  (#4 — P1: 5★ / <$100 / Top rated)
│  [Luxury 5★] [Under $100] [Top rated]          │
└───────────────────────────────────────────────┘
        ↓ once a destination is chosen ↓
   existing RefineToolbar + richer HotelGrid (#5/#6)
```

Once a destination is selected, "Popular destinations" / "Browse by vibe" collapse and the existing
results flow takes over (with the richer cards from #5/#6).

---

## Prioritization

| Tier | Idea | Impact | Effort | P1-feasible? |
|---|---|---|---|---|
| **Quick wins** | #1 Popular destinations | High | S–M | ✅ |
| | #6a Gradient placeholders | High (visual) | S | ✅ |
| | #2 Hero glow-up | Med–High | S | ✅ |
| | #3 Quick-destination chips | Med | S | ✅ |
| | #7 Trust strip | Med | S | ✅ |
| **Bigger bets** | #5 Card badges + 5-star rating | Med–High | M | ✅ |
| | #4 Curated collections (5★ / price) | Med | M | ✅ (star/price only) |
| **P2 / deliberate** | #4 Amenity "vibe" intents | Med | L | ❌ → pairs with SEO intent slugs |
| | #8 Recently viewed | Med | M | ❌ (client store) |
| | #6b External city imagery | High visual | M | ❌ (dependency/perf decision) |
| | Dates+guests in hero search | — | M | ❌ (scope change — dates deferred by design) |

**Suggested first slice:** #1 + #6a + #2 + #7 — all P1-feasible, invariant-safe, mostly small, and
together they transform the pre-search experience from a dead end into a discovery surface.

---

## Open questions for the team

1. **Imagery direction** — ship deterministic gradients now (#6a), or invest in real city imagery
   (#6b) and accept the dependency/perf tradeoff?
2. **Curated collections** — keep P1 to star/price collections, or pull the amenity "intent"
   collections forward to align with the planned Phase-2 SEO landing pages?
3. **Dates on home** — leave dates on the detail page (current design), or surface a dates/guests
   affordance in the hero to match traveler expectations (a deliberate scope change)?
4. **How much pre-search content** — full discovery sections, or a lighter "popular destinations"
   strip only, to keep the page focused on the core search task?

> These are enhancement ideas, not a committed plan. They intentionally respect Phase-1 scope and the
> location-first / mobile-first / no-global-inventory invariants; items marked P2 are flagged so they
> aren't built prematurely. See also `issues/home-page-design-gaps.md` for the separate
> fidelity/bug fixes against the mockup.
