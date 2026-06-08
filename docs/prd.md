# PRD — Hotel Discovery Interface (Phase 1)

> High-level product requirements for the Phase 1 discovery experience.
> Companions: `PHASE-1.md` (technical design), `ASSUMPTIONS-AND-TRADEOFFS.md`.

---

## 1. Background & Goals

**Background.** Travelers need to find and evaluate hotels quickly. This is the
client-facing discovery surface of a travel platform: pick a destination, browse
properties, inspect a hotel, and check room availability for their dates.

**User problems**
- Hard to narrow a large catalog to relevant options fast.
- Property details scattered or shallow when comparing hotels.
- Unclear which rooms are open for specific dates, and at what price.

**Business objectives**
- Convert destination intent into engaged hotel browsing.
- Deliver a fast, accessible, maintainable UI that scales to more inventory.
- Establish a clean architecture (data gateway, BFF, server/client state split)
  that later phases (SEO, booking) build on without rework.

---

## 2. Target Users & Use Cases

**Primary user:** a traveler planning a trip, on mobile or desktop.

**Use cases**
1. Choose a destination (country and/or city) and browse its hotels.
2. Narrow results by star rating and price range.
3. Open a hotel to read its full details and amenities.
4. Enter check-in/out dates to see which rooms are open and their nightly price.

---

## 3. Scope & Feature List

**In scope**
| # | Feature | Summary |
|---|---------|---------|
| 1 | Destination picker | Filterable city/country dropdown; selecting loads that location's hotels |
| 2 | Search & filter | Refine the location's hotels by star rating and price range (min–max) |
| 3 | Sort & paginate | Sort by price / rating / stars; paginate the results (client-side over the loaded set) |
| 4 | Hotel detail | Name, address, description, amenities, policies, rating + review count |
| 5 | Room availability | Pick dates → lazy-loaded available rooms + price/night (simulated third-party) |

**Out of scope (Phase 1)**
- Booking, reservation, checkout (display only — no transaction)
- Authentication, payments, user accounts
- SEO landing pages, international URL routing
- Map view

---

## 4. Functional Behavior & Acceptance Criteria

**F1 — Destination picker**
- Given the destination list, when the user types, then options filter by
  substring (city shown with its country).
- When a country is selected, all its hotels load; when a city is selected, only
  that city's hotels load.
- No match → dropdown shows "No destinations".

**F2 — Search & filter**
- When star rating or price range changes, the list updates in-memory (< 100ms),
  no full reload.
- Filter state is reflected in the URL (shareable, back-button correct).
- No hotels match → "No hotels found" + reset action.

**F3 — Sort & paginate**
- Results can be sorted by price (asc/desc), overall rating, or star rating;
  default order is stable.
- Sort + current page are reflected in the URL (`?sort=&page=`).
- Results paginate client-side at a fixed page size; changing filters/sort resets
  to page 1.

**F4 — Hotel detail**
- Selecting a hotel opens `/hotels/[id]` showing name, address, description,
  amenities, policies, star rating, overall rating, and review count.
- Detail renders immediately without waiting on availability.

**F5 — Room availability**
- Given valid check-in/out dates, availability + price/night lazy-load with a
  "Checking availability…" state.
- A room shows as available only if every night in `[check-in → check-out)` is in
  its `available_dates`.
- No open rooms → "No rooms available for these dates".
- Availability fetch fails → inline error + retry; the page is never blocked.
- Checkout ≤ check-in → blocked.

---

## 5. Non-Functional Requirements & Constraints

**Performance budget**
| Metric | Target |
|--------|--------|
| LCP | < 2.5s |
| INP | < 200ms |
| CLS | < 0.1 |
| Initial JS (gzip) | < 150KB |
| In-memory filter response | < 100ms |

Availability/price is the deliberate async path (third-party sim) → skeleton,
excluded from the filter budget.

**Accessibility** — WCAG 2.1 AA: semantic HTML, keyboard-operable, visible focus,
labelled controls, `aria-live` result count, contrast ≥ 4.5:1, no color-only
signals.

**Observability** — route error boundary; `track()` facade (DEV console, PROD
adapters pluggable); typed events (`search_performed`, `hotel_viewed`,
`availability_checked`, `no_results`, `no_rooms`); structured API logs.

**Testing** — Jest + RTL unit (**≥ 85% coverage**), integration with MSW,
Playwright E2E for primary flows; CI coverage gate.

**Environment / constraints**
- Next.js (App Router) + TypeScript; React Query for server state; URL +
  Context for client state.
- Client reaches data only via `/api/*` (BFF); `hotelService` /
  `availabilityService` are server-only.
- Data from a mock seed (40 hotels, 10 cities); isolated behind the services.
- Prices displayed in USD; hotel photos use a placeholder image.
- Location URL params are slugified (no diacritics / encoded chars).
- Responsive / mobile-first.

---

## 6. Dependencies, Assumptions & Open Questions

**Dependencies**
- Mock data seed (stands in for the hotel inventory API).
- React Query, a date-picker component, testing tooling (Jest/RTL/MSW/Playwright).

**Assumptions**
- Inventory is owned; pricing/availability is a slow, expensive third-party →
  modeled as a lazy, latency-simulated endpoint.
- **All prices are USD** (mock has no currency unit; single-currency assumption).
- **Photos use a placeholder** (dataset has no image fields).
- **Dates are entered manually each visit** — not persisted in the URL; a refresh
  or shared link does not carry dates (filters/sort/page do).
- **Dataset dates accepted as-is** (all July 2026); no artificial date-window
  constraint beyond checkout > check-in.
- **Price reveals after dates** (lazy availability) — acceptable for mock data.
- **Location URL params are slugified** (no diacritics): `Île-de-France`→`ile-de-france`,
  `New York`→`new-york`, `United Kingdom`→`united-kingdom`.
- Reviews = rating + count only (dataset has no review text).
- Price range matches each hotel's min room price.
- Dates are ISO strings; no timezone math in v1.

**Open questions**
- Star filter: minimum ("4★ & up") vs exact match?
- Show both `star_rating` and `overall_rating` on cards, or one?
- Simulated availability latency target (e.g. 800ms–1.5s)?

---

## 7. Success Metrics & Release Criteria

**Success metrics**
- Destination → hotel-detail rate (engagement).
- Availability-check rate per hotel viewed.
- `no_results` / `no_rooms` rates (demand vs inventory gaps).
- Core Web Vitals within budget on mobile.

**Release criteria**
- All four features meet their acceptance criteria.
- All documented empty/error/loading states function.
- Performance budget met; WCAG 2.1 AA checks pass.
- Unit coverage ≥ 85%; integration + E2E primary flows green in CI.
- Deliverables present: `README.md`, `ASSUMPTIONS-AND-TRADEOFFS.md`, AI-usage note.
