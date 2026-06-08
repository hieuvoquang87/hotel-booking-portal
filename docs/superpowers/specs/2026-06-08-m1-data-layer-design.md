# M1 — Data Layer & Domain — Design Spec

> Phase 1, Milestone M1 (see `docs/progress.md`). Server-only data layer: the seed
> gateway, domain types, and the pure logic the rest of Phase 1 builds on.
> Sources: `architecture.md`, `prd.md`, `product-roadmap.md`, `user-flows.md`.

**Status:** approved design — implementation plan follows in
`docs/superpowers/plans/2026-06-08-m1-data-layer.md`.

---

## 1. Goal & Scope

**Goal.** All hotel/location/availability data reaches the rest of the app through
server-only services that return **domain types** (not raw seed shape), backed by
pure, unit-tested logic in `lib/`. No UI, no API routes, no React.

**In scope (M1):**

- Seed accessor that isolates the raw JSON import (the Phase-2 swap seam).
- Domain types: `Location`, `Hotel`, `Room`, `AvailableRoom`.
- Mapping raw seed → domain types.
- `hotelService`: `getLocations`, `getHotelsByLocation`, `getHotelById`.
- `availabilityService`: `checkAvailability` with configurable simulated latency.
- `lib/`: `slug`, `filters`, `sort`, `paginate`, `availability` — all pure.
- Unit tests for every `lib/` function and both services (≥85% coverage).

**Out of scope (later milestones):** `/api/*` route handlers (M2), React Query
hooks and partial-date gating (M3), any UI (M4/M5). M1 assumes its callers (M2)
will translate domain results and thrown errors into HTTP.

**Depends on M0:** TypeScript project, Jest, and `services/mock/hotels.json` in
place. If M0 is not done, the plan creates the minimal pieces M1 needs.

---

## 2. Data Realities (from the seed)

Verified against `services/mock/hotels.json` (40 hotels):

| Fact                      | Value                                                   | Why it matters                                                       |
| ------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------- |
| Countries                 | 6: USA, United Kingdom, France, Japan, Australia, Italy | `Location` carries country; USA has 5 cities, others 1 each          |
| Cities                    | 10 (4 hotels each)                                      | Country selection spans multiple cities only for USA                 |
| Availability window       | **only `2026-07-10` → `2026-07-14`** (5 dates)          | Stays outside this window return no rooms; test fixtures must use it |
| No-availability inventory | exactly **6 hotels (15%)** have every room empty        | Drives the "No rooms available" empty state (surfaced in M5)         |
| Hotel id format           | `hotel-01` … `hotel-40`                                 | `getHotelById` lookup key                                            |
| Currency / photos         | seed has neither                                        | USD assumed; `photoUrl` = placeholder constant, set at mapping       |

Raw hotel fields: `id, name, description, star_rating, overall_rating,
review_count, address{street,city,state,zip_code,country}, contact, amenities[],
policies{check_in_time,check_out_time,cancellation}, rooms[]`.
Raw room fields: `room_id, type, bed_type, bed_count, max_occupancy,
square_footage, price_per_night, room_amenities[], available_dates[]`.

---

## 3. Module Structure & Data Flow

All server-only. The client never imports any of these — only M2's `/api/*` will.

```
services/mock/hotels.json        raw seed (imported by exactly one module: seed.ts)
services/seed.ts                 returns the raw seed array — the Phase-2 swap seam
services/mappers.ts              raw hotel/room → domain Hotel/Room/Location
services/hotelService.ts         getLocations / getHotelsByLocation / getHotelById
services/availabilityService.ts  checkAvailability (configurable latency sim)

lib/slug.ts                      slugify + buildSlugLookup        (pure)
lib/filters.ts                   filterByStars + filterByPrice    (pure)
lib/sort.ts                      sortHotels                       (pure)
lib/paginate.ts                  paginate                         (pure)
lib/availability.ts              nightsInRange + isRoomAvailable   (pure)

types/domain.ts                  Location, Hotel, Room, AvailableRoom, error type
```

**Chosen approach (A): map once at module load.** `hotelService` reads the seed
via `seed.ts`, maps all 40 hotels to domain `Hotel[]` **once** at module
initialization, and all getters operate on that in-memory array. The isolated
`seed.ts` + `mappers.ts` are the seam the roadmap's Phase-2 plan swaps for
`http.ts` / `dto.ts` without touching callers. (Rejected: lazy per-call mapping —
no benefit at 40 hotels; full repository/DI pattern — YAGNI for a static seed.)

---

## 4. Domain Types (`types/domain.ts`)

Domain shape, camelCase, decoupled from raw seed (assumptions §7):

```ts
export type Location = {
  city: string; // "New York"
  country: string; // "USA"
  state: string; // "NY"
  citySlug: string; // "new-york"
  countrySlug: string; // "usa"
};

export type Room = {
  roomId: string;
  type: string; // "Deluxe King Room"
  bedType: string;
  bedCount: number;
  maxOccupancy: number;
  squareFootage: number;
  pricePerNight: number; // USD
  amenities: string[]; // from room_amenities
  availableDates: string[]; // ISO date strings
};

export type Hotel = {
  id: string;
  name: string;
  description: string;
  starRating: number;
  overallRating: number;
  reviewCount: number;
  address: { street: string; city: string; state: string; zipCode: string; country: string };
  amenities: string[];
  policies: { checkInTime: string; checkOutTime: string; cancellation: string };
  priceFrom: number; // min room pricePerNight — for the card "from $X"
  photoUrl: string; // placeholder constant (seed has no images)
  rooms: Room[];
};

export type AvailableRoom = {
  roomId: string;
  type: string;
  pricePerNight: number;
  bedType: string;
  maxOccupancy: number;
};
```

`contact` is intentionally dropped from the domain `Hotel` (not used by any Phase-1
view). `priceFrom` is `Math.min(...rooms.pricePerNight)`; a hotel always has ≥1 room.

---

## 5. Services

### 5.1 `hotelService` (operates on the map-once domain array)

```ts
getLocations(): Location[]
getHotelsByLocation(query: { country?: string; city?: string }): Hotel[]
getHotelById(id: string): Hotel | null
```

- **`getLocations`** — derive the distinct set of `city + country + state` across
  all hotels, mapped to `Location` (both fields slugged). Order: stable
  (alphabetical by country, then city) so the dropdown and tests are deterministic.
- **`getHotelsByLocation`** — resolve incoming **slugs** back to seed values using a
  slug lookup built from the seed (see §6.1), then filter hotels by
  `address.country` and/or `address.city`. `city` narrows to one city; `country`
  alone returns all hotels in that country; neither provided → return **all** hotels
  (M2/M3 enforce location-first selection — the service stays permissive per the
  REST contract). Unknown slug that matches nothing → `[]`.
- **`getHotelById`** — exact match on `id`; returns `null` when not found (M2 maps
  `null` → HTTP 404).

### 5.2 `availabilityService`

```ts
checkAvailability(
  id: string,
  checkIn: string,    // ISO date
  checkOut: string,   // ISO date
  opts?: { delayMs?: number }
): Promise<AvailableRoom[]>
```

- Validates `checkOut > checkIn`; otherwise throws `InvalidDateRangeError` (§7).
- `await simulateLatency(opts?.delayMs ?? DEFAULT_LATENCY_MS)` — simulates the slow
  third-party. `DEFAULT_LATENCY_MS = 1000`, overridable via env
  (`AVAILABILITY_LATENCY_MS`); **unit tests pass `delayMs: 0`** for speed/determinism.
- Looks up the hotel by id (unknown id → throws `HotelNotFoundError`, §7).
- Computes nights via `nightsInRange(checkIn, checkOut)`, keeps rooms where
  `isRoomAvailable(room, nights)`, maps survivors → `AvailableRoom[]`.
- Returns `[]` for the 6 all-empty hotels or any out-of-window date range — a valid,
  non-error "no rooms" result.

---

## 6. Pure Logic (`lib/`)

### 6.1 `slug.ts`

```ts
slugify(value: string): string
buildSlugLookup(values: string[]): Map<string, string>   // slug → original
```

- `slugify`: lowercase → strip diacritics (NFD + remove combining marks) →
  non-alphanumerics to hyphens → collapse/trim hyphens. `"New York"→"new-york"`,
  `"United Kingdom"→"united-kingdom"`, `"Île-de-France"→"ile-de-france"`.
- `buildSlugLookup`: maps each value's slug back to the original. Used to resolve
  URL slugs → seed values **without** a lossy reverse transform. Collisions are not
  expected in this seed; last-wins if they occur (documented, not handled specially).

### 6.2 `filters.ts`

```ts
filterByStars(hotels: Hotel[], minStars: number): Hotel[]   // starRating >= minStars
filterByPrice(hotels: Hotel[], min: number, max: number): Hotel[]
```

- **Star = minimum** ("4★ & up"): keep `starRating >= minStars`.
- **Price = any room in range** (per decision): keep hotels where
  `rooms.some(r => r.pricePerNight >= min && r.pricePerNight <= max)`.
  _Known trade-off:_ a hotel's card shows `priceFrom` (cheapest room), so a hotel can
  appear under a low price filter via one cheap room while displaying a higher "from"
  price. Accepted; documented in ASSUMPTIONS.

### 6.3 `sort.ts`

```ts
type SortKey = 'price-asc' | 'price-desc' | 'rating' | 'stars';
sortHotels(hotels: Hotel[], key: SortKey): Hotel[]   // pure, returns a new array
```

- `price-asc`/`price-desc` sort by `priceFrom`; `rating` by `overallRating` desc;
  `stars` by `starRating` desc. Stable: ties preserve input order (so the unsorted
  seed order is the deterministic default).

### 6.4 `paginate.ts`

```ts
const PAGE_SIZE = 12;   // fixed; tunable constant
paginate<T>(items: T[], page: number, size?: number): {
  items: T[]; page: number; totalPages: number; total: number;
}
```

- Clamps `page` into `[1, totalPages]` (so `page=99` returns the last page, never
  errors); `totalPages` is `1` when there are zero items.

### 6.5 `availability.ts`

```ts
nightsInRange(checkIn: string, checkOut: string): string[]   // [checkIn .. checkOut)
isRoomAvailable(room: Room, nights: string[]): boolean
```

- `nightsInRange` returns each ISO date from `checkIn` up to **but not including**
  `checkOut` (a 2-night stay `[07-10, 07-12)` → `["2026-07-10","2026-07-11"]`).
  Iterates by UTC day to avoid timezone drift; no TZ math beyond that.
- `isRoomAvailable`: `nights.length > 0 && nights.every(n => room.availableDates.includes(n))`.
  Empty `availableDates` (the 6 hotels) → always `false`.

---

## 7. Error Handling

M1 throws typed errors; M2 maps them to HTTP. Defined in `types/domain.ts`:

| Error                   | Thrown when                                  | M2 maps to (later) |
| ----------------------- | -------------------------------------------- | ------------------ |
| `InvalidDateRangeError` | `checkOut <= checkIn` in `checkAvailability` | 400                |
| `HotelNotFoundError`    | `checkAvailability` called with unknown id   | 404                |

`getHotelById` returns `null` (not a throw) for unknown id — it's an expected lookup
miss, and M2 turns `null` into 404. Partial/absent dates are **not** M1's concern:
hooks (M3) only call `checkAvailability` once both dates are set.

---

## 8. Testing Strategy (TDD, ≥85% coverage)

Written test-first per task in the implementation plan. Fixtures use **real seed
values inside the `2026-07-10 → 07-14` window**.

- **`slug`** — diacritics (`Île-de-France`), spaces, multi-word country; round-trip
  via `buildSlugLookup`.
- **`filters`** — `filterByStars` floor behavior (4 keeps 4 & 5); `filterByPrice`
  any-room-in-range (incl. a hotel that matches only via a non-cheapest room).
- **`sort`** — each key + stable-tie ordering.
- **`paginate`** — clamp `page=99`, `page=0`, empty list → `totalPages=1`.
- **`availability`** — `nightsInRange` boundary (checkout excluded); `isRoomAvailable`
  every-night-in-range true/false; empty `availableDates` → false.
- **`hotelService`** — `getLocations` returns 10 distinct, deterministically ordered;
  `getHotelsByLocation` by country (multi-city for USA) and by city; slug resolution;
  unknown slug → `[]`; `getHotelById` hit + `null` miss.
- **`availabilityService`** — happy path within window (`delayMs:0`); one of the 6
  all-empty hotels → `[]`; out-of-window dates → `[]`; `checkOut<=checkIn` →
  `InvalidDateRangeError`; unknown id → `HotelNotFoundError`.

**Invariant test:** assert no module outside `services/` imports `hotels.json`
(grep-style guard or lint rule) — enforces the gateway boundary.

---

## 9. Decisions & Open Items

**Resolved decisions:**

- Star filter = **minimum** ("4★ & up").
- Price filter = **any room in range** (not min-room). → update `progress.md` M1
  wording (currently says "min room price").
- Latency = **configurable, default ~1000ms, 0 in unit tests**.
- `Location` = **flat list**; UI groups by country (M4).
- Service throws **typed errors**; `getHotelById` returns `null` for a miss.

**Deferred to later milestones (not M1):** HTTP status mapping (M2), partial-date
gating + stale-response latest-wins (M3), all UI states (M4/M5).
