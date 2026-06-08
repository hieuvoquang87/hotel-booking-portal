# Product Roadmap: Hotel Discovery & Booking Platform

## Phase 1: Core Discovery (3 hours)

**Stack:** Next.js (App Router) + TypeScript + React Query + Tailwind

### Features

| #   | Feature               | Details                                                                             |
| --- | --------------------- | ----------------------------------------------------------------------------------- |
| 1   | **Search & Filter**   | Filterable destination dropdown (city+country); refine by star rating & price range |
| 2   | **Hotel Detail**      | Name, address, description, amenities, policies, rating+review count                |
| 3   | **Room Availability** | Pick check-in/out dates → lazy-load available rooms + price per night               |

**Principles:**

- Mobile-first: assume 80% mobile traffic; desktop enhances the mobile flow
- Location-first: user picks destination → only that location's hotels load
- Refine (star, price) in memory over bounded set
- Availability lazy-loaded with skeleton (simulates slow third-party)
- URL is source of truth (location, filters shareable + back-button correct)
- Prices in USD; dates manual (not URL-stored)

### Routes & API

```
Pages:
  /                       Search + hotel grid
  /hotels/[id]            Detail + room availability

API (BFF — REST contract, under /api):
  GET /api/locations              Destination list (BFF-only, cached once)
  GET /api/hotels?country=&city=&star_rating=&price_range=  Hotels by location/criteria
  GET /api/hotels/[id]            Hotel details (full info)
  GET /api/hotels/[id]/rooms?check_in=&check_out=  Room types + price/night (lazy, slow sim)
```

### Design Mockups

UI source of truth for the two pages — replicate when building. See [`docs/designs/`](designs/README.md).

| Page | Route | Mockup (browser) | Spec |
|------|-------|------------------|------|
| Search + hotel grid | `/` | [home-page-mockup.html](designs/home-page-mockup.html) | [home-page-design-spec.md](designs/home-page-design-spec.md) |
| Detail + room availability | `/hotels/[id]` | [hotel-detail-page-mockup.html](designs/hotel-detail-page-mockup.html) | [hotel-detail-page-design-spec.md](designs/hotel-detail-page-design-spec.md) |

### State Management

```
Server State   → React Query    useLocations / useHotels / useAvailability
Client State   → URL + AppProvider    Location, refine filters, dates
```

### Architecture

```
app/
├── page.tsx                  Home (search + grid)
├── hotels/[id]/page.tsx      Detail + availability
└── api/
    ├── locations/
    ├── hotels/
    │   ├── route.ts
    │   └── [id]/
    │       ├── route.ts
    │       └── rooms/route.ts

components/
├── DestinationDropdown.tsx   Filterable city/country select
├── FilterPanel.tsx            Star + price range
├── HotelCard.tsx / HotelGrid.tsx
├── RoomAvailability.tsx       Date picker → lazy availability
└── EmptyState.tsx

hooks/
├── useLocations.ts            Destination list (once, stale: ∞)
├── useHotels.ts               By location (country/city)
├── useFilteredHotels.ts       In-memory filter/sort/paginate
└── useAvailability.ts         Lazy availability + retry (SWR)

services/
├── hotelService.ts            getLocations / getHotelsByLocation / getHotelById
├── availabilityService.ts     Simulate slow third-party (latency + price)
└── mock/hotels.json           40 hotels × 10 cities

stores/
├── QueryProvider.tsx          React Query cache
└── AppProvider.tsx            Client state: location + refine (URL-synced)
```

### Key Decisions

| Decision                            | Why                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------ |
| Location-first loading              | Don't ship global inventory; user picks, then fetch that location only                     |
| Destination dropdown preloaded      | Tiny list → fetch once, filter in memory as user types (no per-keystroke calls)            |
| Availability lazy + decoupled       | Separate endpoint w/ artificial latency; page renders immediately, availability streams in |
| URL state (location + refine)       | Shareable, bookmarkable, back-button correct                                               |
| React Query for server state        | Caching, dedup, retry, SWR once; not app state — that's AppProvider + URL                  |
| Availability = every-night-in-range | `nights.every(d => room.available_dates.includes(d))`                                      |
| Slugified URLs                      | `/hotels?country=new-york&city=ny` → clean, no diacritics                                  |

### Empty States

- No filter match → "No destinations"
- No hotels found → "No hotels found" + reset action
- Availability loading → "Checking availability…" skeleton
- Availability fails → inline error + retry
- `available_dates: []` → "No rooms available"
- Checkout ≤ check-in → blocked (validation)

### Testing

| Layer       | Tool             | Target                                               |
| ----------- | ---------------- | ---------------------------------------------------- |
| Unit        | Jest + RTL       | Pure logic + components — **≥ 85%**                  |
| Integration | Jest + RTL + MSW | Component ↔ API ↔ service                            |
| E2E         | Playwright       | Destination → filter → detail → dates → availability |

---

## Phase 2: Scale, SEO & Booking

**Extends Phase 1** — assumes routes, components, and data layer exist.

### 1. Booking (New Feature)

```
Detail → RoomAvailability → "Reserve"
  → /hotels/[id]/book   (guest details + date/room summary)
  → confirm → Server Action createBooking()
  → re-validate availability + lock price → confirmation
```

- `bookingService` (server-only): `createBooking`, `getBooking`
- Re-validate availability + price at submit (price drift possible)
- Optimistic UI + rollback; idempotency key (prevent double-book)
- **Why Server Actions (not BFF):** mutation, CSRF protection, sequential integrity

### 2. SEO & Landing Pages

```
/hotel/{country}/{state}/{city}                City landing (pre-rendered)
/hotel/{country}/{state}/{city}/{slug}         Hotel detail canonical

/hotel/us/il/chicago
/hotel/us/il/chicago/the-grand-luminary-hotel-01

Intent slugs (allow-listed):
  /hotel/us/fl/miami/beachfront           → { amenity: beach_access }
  /hotel/us/tx/austin/pet-friendly        → { amenity: pet_friendly }
  /hotel/us/ny/new-york/5-star            → { stars: 5 }
```

**Renders:**
| Route | Strategy | Why |
|-------|----------|-----|
| `/` | SSG | Static shell, instant LCP |
| City landing | SSG + ISR | Pre-render all; revalidate for freshness |
| Hotel detail | SSG + ISR | Crawlable HTML + JSON-LD |
| `/search` | SSR | URL-driven, shareable |

- `generateStaticParams` → pre-render all cities + hotels
- `generateMetadata` → per-page title, description, canonical, OG
- `schema.org/Hotel` JSON-LD → rich results (stars, price, reviews)
- `sitemap.ts` + `robots.ts`

### 3. Service Layer — Swap Mock for Real Endpoint

Phase 1's `hotelService` is the single gateway. Phase 2 only changes **internals**:

```
services/
├── hotelService.ts     Same API (getHotels / getHotel / checkAvailability)
├── http.ts             NEW — fetch wrapper: retry, timeout, error mapping
├── dto.ts              NEW — raw API shapes (HotelDTO)
├── mappers.ts          NEW — DTO → domain types
└── mock/               Dev/test fallback (env-switched)
```

**Isolation:** Callers untouched; DTO ≠ domain type (API changes never leak to UI).

### 4. Observability

```
events → track() facade → DEV: console | PROD: Segment/GA4 + Sentry
```

| Pillar      | What                         | Tool                     |
| ----------- | ---------------------------- | ------------------------ |
| Errors      | exceptions + render failures | Sentry (client + server) |
| Analytics   | typed user events            | Segment / GA4            |
| Performance | LCP / INP / CLS              | web-vitals               |
| Logs        | server / ISR / fetch         | pino (structured)        |

**Typed Events:**

```ts
type Event =
  | { name: 'search_performed'; city: string; intent?: string }
  | { name: 'hotel_viewed'; hotelId: string }
  | { name: 'availability_checked'; hotelId: string; nights: number }
  | { name: 'no_results'; filters: object } // ← inventory-gap signal
  | { name: 'no_rooms'; hotelId: string };
```

### 5. Error Handling

| Failure                | Behavior                                         |
| ---------------------- | ------------------------------------------------ |
| Hotel id not found     | `notFound()` → 404 + "browse {city}"             |
| Invalid intent slug    | redirect to base city page                       |
| Empty filter result    | `EmptyState` + reset filters                     |
| `available_dates: []`  | "No rooms available for these dates"             |
| Service down / timeout | Backoff retry → last ISR cache, else `error.tsx` |
| Service 5xx            | Typed error → boundary + Sentry alert            |

**Layers:** `error.tsx` · `not-found.tsx` · `loading.tsx` · `global-error.tsx`

---

## Shared Assumptions & Tradeoffs

| Decision                            | Rationale                                                            |
| ----------------------------------- | -------------------------------------------------------------------- |
| Core capabilities only (Phase 1)    | Ship the 3 features clean                                            |
| All 40 hotels, 10 cities            | Global dataset surfaced                                              |
| Client → API only                   | Clean server/client boundary                                         |
| React Query + URL state             | Server cache + shareable, bookmarkable client state                  |
| Single mock file                    | Seed as-is (nested) — split/merge when real API exists               |
| Location-first load                 | Fetch only chosen location; global inventory never ships to client   |
| Destination list preloaded          | Tiny; client filters in memory (no per-keystroke calls)              |
| Filter/sort/paginate in memory      | Bounded set (city ≈ 4, country ≤ 20) → instant, URL state            |
| Availability lazy + decoupled       | Separate endpoint w/ artificial latency (simulates slow third-party) |
| URL state (location + refine)       | Shareable + back-button correct > global store                       |
| Dates manual, not in URL            | Entered each visit; filters/sort/page persist in URL                 |
| USD + placeholder photos            | Mock has no currency or images                                       |
| Reviews = rating + count            | No review text in dataset                                            |
| DTO ≠ domain type (Phase 2)         | API changes never leak to UI; one-file mapper fix                    |
| Country segment in URL (Phase 2)    | International = more data, not a route rewrite                       |
| SSG + ISR (Phase 2)                 | Small inventory → pre-render all; ISR handles price drift            |
| Intent slugs allow-listed (Phase 2) | Controlled crawl surface; no infinite filter URLs                    |

---

## Deliverables

| File                             | Contents                                                             |
| -------------------------------- | -------------------------------------------------------------------- |
| **README.md**                    | Install · run locally · test; state management + component breakdown |
| **ASSUMPTIONS-AND-TRADEOFFS.md** | Architectural rationale (design thinking)                            |
| **AI-USAGE.md**                  | How AI tools were used during coding/UI                              |

---

## Non-Functional Targets (Phase 1)

| Metric          | Target                   |
| --------------- | ------------------------ |
| Device split    | 80% mobile / 20% desktop |
| LCP             | < 2.5s                   |
| INP             | < 200ms                  |
| CLS             | < 0.1                    |
| JS (gzip)       | < 150KB                  |
| Filter response | < 100ms (in-memory)      |
| Test coverage   | ≥ 85% (unit)             |

---

## Open Questions (Phase 2)

1. City landing content — all hotels or sorted by rating/price?
2. ISR revalidate window — how fresh must prices/availability be (1h vs 5m)?
3. State slug for intl — scheme for non-US (e.g., `idf` for Île-de-France)?
