# M1 — Data Layer & Domain — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the server-only data layer for Phase 1 — domain types, the seed gateway, and pure unit-tested logic (`slug`, `filters`, `sort`, `paginate`, `availability`) — so M2's `/api/*` routes have a clean, typed source.

**Architecture:** Raw JSON seed is isolated behind `services/seed.ts`; `services/mappers.ts` converts raw → domain types; `hotelService` maps all hotels once at module load and serves them; `availabilityService` simulates a slow third-party. All branching logic lives in pure `lib/` functions, tested in isolation. TDD throughout; ≥85% coverage gate.

**Tech Stack:** TypeScript (strict), Jest + ts-jest (node env). No React/UI in M1.

**Spec:** `docs/superpowers/specs/2026-06-08-m1-data-layer-design.md`

**Conventions for every task:** run tests with `npx jest <path>`; co-locate `*.test.ts` next to source; commit after each green task. Commit messages use conventional-commit prefixes.

---

## File Map

| File | Responsibility |
| --- | --- |
| `package.json`, `tsconfig.json`, `jest.config.js` | Minimal toolchain (Task 0 — superseded by M0 later) |
| `services/mock/hotels.json` | Raw seed (moved from `docs/mock-data.json` by M0) |
| `types/domain.ts` | Domain types + `InvalidDateRangeError`, `HotelNotFoundError` |
| `lib/slug.ts` | `slugify`, `buildSlugLookup` |
| `lib/availability.ts` | `nightsInRange`, `isRoomAvailable` |
| `lib/filters.ts` | `filterByStars`, `filterByPrice` |
| `lib/sort.ts` | `sortHotels`, `SortKey` |
| `lib/paginate.ts` | `paginate`, `PAGE_SIZE` |
| `tests/fixtures.ts` | `makeHotel`, `makeRoom` test factories |
| `services/mappers.ts` | `RawHotel`/`RawRoom`, `mapHotel`, `mapRoom`, `mapLocation` |
| `services/seed.ts` | `getRawHotels` — the only importer of `hotels.json` |
| `services/hotelService.ts` | `getLocations`, `getHotelsByLocation`, `getHotelById` |
| `services/availabilityService.ts` | `checkAvailability` |
| `services/boundary.test.ts` | Guard: nothing outside `services/` imports the seed |

---

## Task 0: Minimal toolchain (skip if M0 already ran)

> If `package.json` with Jest already exists from M0, only do the seed copy (Step 4) and skip the rest.

**Files:**
- Create: `package.json`, `tsconfig.json`, `jest.config.js`
- Move: `docs/mock-data.json` → `services/mock/hotels.json` (M0 owns this)

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "hotel-booking-portal",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "test": "jest",
    "test:coverage": "jest --coverage",
    "typecheck": "tsc --noEmit"
  }
}
```

- [ ] **Step 2: Install dev dependencies**

Run: `npm install -D typescript jest ts-jest @types/jest @types/node`
Expected: packages install; `package-lock.json` created.

- [ ] **Step 3: Create `tsconfig.json` and `jest.config.js`**

`tsconfig.json` (minimal, strict — M0 will replace with the Next.js config):

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node"
  },
  "include": ["lib", "services", "types", "tests"]
}
```

`jest.config.js`:

```js
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['lib/**/*.ts', 'services/**/*.ts', 'types/**/*.ts', '!**/*.test.ts'],
  coverageThreshold: { global: { branches: 85, functions: 85, lines: 85, statements: 85 } },
};
```

- [ ] **Step 4: Move the seed behind the service** (M0 owns this; skip if M0 already ran)

Run: `mkdir -p services/mock && git mv docs/mock-data.json services/mock/hotels.json`
Expected: `services/mock/hotels.json` exists (40-hotel array); `docs/mock-data.json` is gone.

- [ ] **Step 5: Verify the toolchain runs**

Run: `npx jest --passWithNoTests`
Expected: `No tests found, exiting with code 0`.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json jest.config.js services/mock/hotels.json
git commit -m "chore: minimal TS+Jest toolchain and seed for M1"
```

---

## Task 1: Domain types & typed errors

**Files:**
- Create: `types/domain.ts`
- Test: `types/domain.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// types/domain.test.ts
import { InvalidDateRangeError, HotelNotFoundError } from './domain';

describe('domain errors', () => {
  it('InvalidDateRangeError is an Error with a stable name', () => {
    const err = new InvalidDateRangeError();
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('InvalidDateRangeError');
    expect(err.message).toMatch(/check-out/i);
  });

  it('HotelNotFoundError includes the id', () => {
    const err = new HotelNotFoundError('hotel-99');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('HotelNotFoundError');
    expect(err.message).toContain('hotel-99');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest types/domain.test.ts`
Expected: FAIL — cannot find module `./domain`.

- [ ] **Step 3: Write the implementation**

```ts
// types/domain.ts
export type Location = {
  city: string;
  country: string;
  state: string;
  citySlug: string;
  countrySlug: string;
};

export type Room = {
  roomId: string;
  type: string;
  bedType: string;
  bedCount: number;
  maxOccupancy: number;
  squareFootage: number;
  pricePerNight: number;
  amenities: string[];
  availableDates: string[];
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
  priceFrom: number;
  photoUrl: string;
  rooms: Room[];
};

export type AvailableRoom = {
  roomId: string;
  type: string;
  pricePerNight: number;
  bedType: string;
  maxOccupancy: number;
};

export class InvalidDateRangeError extends Error {
  constructor(message = 'check-out must be after check-in') {
    super(message);
    this.name = 'InvalidDateRangeError';
  }
}

export class HotelNotFoundError extends Error {
  constructor(id: string) {
    super(`hotel not found: ${id}`);
    this.name = 'HotelNotFoundError';
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest types/domain.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add types/domain.ts types/domain.test.ts
git commit -m "feat(types): domain types and typed errors for M1"
```

---

## Task 2: `lib/slug.ts` — slugify + lookup

**Files:**
- Create: `lib/slug.ts`
- Test: `lib/slug.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/slug.test.ts
import { slugify, buildSlugLookup } from './slug';

describe('slugify', () => {
  it.each([
    ['New York', 'new-york'],
    ['United Kingdom', 'united-kingdom'],
    ['Île-de-France', 'ile-de-france'],
    ['USA', 'usa'],
    ['  Spaced  Out  ', 'spaced-out'],
  ])('slugifies %s -> %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe('buildSlugLookup', () => {
  it('maps slugs back to original values', () => {
    const lookup = buildSlugLookup(['United Kingdom', 'New York']);
    expect(lookup.get('united-kingdom')).toBe('United Kingdom');
    expect(lookup.get('new-york')).toBe('New York');
    expect(lookup.get('nope')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/slug.test.ts`
Expected: FAIL — cannot find module `./slug`.

- [ ] **Step 3: Write the implementation**

```ts
// lib/slug.ts
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildSlugLookup(values: string[]): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const value of values) {
    lookup.set(slugify(value), value);
  }
  return lookup;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/slug.test.ts`
Expected: PASS (6 cases + 1).

- [ ] **Step 5: Commit**

```bash
git add lib/slug.ts lib/slug.test.ts
git commit -m "feat(lib): bidirectional slug helpers"
```

---

## Task 3: `lib/availability.ts` — nights + room availability

**Files:**
- Create: `lib/availability.ts`
- Test: `lib/availability.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/availability.test.ts
import { nightsInRange, isRoomAvailable } from './availability';
import type { Room } from '../types/domain';

const room = (availableDates: string[]): Room => ({
  roomId: 'r', type: 'Std', bedType: 'Queen', bedCount: 1, maxOccupancy: 2,
  squareFootage: 300, pricePerNight: 200, amenities: [], availableDates,
});

describe('nightsInRange', () => {
  it('excludes the checkout date', () => {
    expect(nightsInRange('2026-07-10', '2026-07-12')).toEqual(['2026-07-10', '2026-07-11']);
  });
  it('returns a single night for a 1-night stay', () => {
    expect(nightsInRange('2026-07-10', '2026-07-11')).toEqual(['2026-07-10']);
  });
});

describe('isRoomAvailable', () => {
  const nights = nightsInRange('2026-07-10', '2026-07-12'); // [10, 11]
  it('true when every night is in available_dates', () => {
    expect(isRoomAvailable(room(['2026-07-10', '2026-07-11', '2026-07-12']), nights)).toBe(true);
  });
  it('false when any night is missing', () => {
    expect(isRoomAvailable(room(['2026-07-10']), nights)).toBe(false);
  });
  it('false for an empty availability list', () => {
    expect(isRoomAvailable(room([]), nights)).toBe(false);
  });
  it('false when there are no nights', () => {
    expect(isRoomAvailable(room(['2026-07-10']), [])).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/availability.test.ts`
Expected: FAIL — cannot find module `./availability`.

- [ ] **Step 3: Write the implementation**

```ts
// lib/availability.ts
import type { Room } from '../types/domain';

export function nightsInRange(checkIn: string, checkOut: string): string[] {
  const nights: string[] = [];
  const cursor = new Date(`${checkIn}T00:00:00Z`);
  const end = new Date(`${checkOut}T00:00:00Z`);
  while (cursor < end) {
    nights.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return nights;
}

export function isRoomAvailable(room: Room, nights: string[]): boolean {
  return nights.length > 0 && nights.every((night) => room.availableDates.includes(night));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/availability.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/availability.ts lib/availability.test.ts
git commit -m "feat(lib): night-range and room availability logic"
```

---

## Task 4: Test fixtures + `lib/filters.ts`

**Files:**
- Create: `tests/fixtures.ts`
- Create: `lib/filters.ts`
- Test: `lib/filters.test.ts`

- [ ] **Step 1: Create the fixtures factory**

```ts
// tests/fixtures.ts
import type { Hotel, Room } from '../types/domain';

export function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    roomId: 'room-x',
    type: 'Standard',
    bedType: 'Queen',
    bedCount: 1,
    maxOccupancy: 2,
    squareFootage: 300,
    pricePerNight: 200,
    amenities: [],
    availableDates: ['2026-07-10', '2026-07-11', '2026-07-12', '2026-07-13', '2026-07-14'],
    ...overrides,
  };
}

export function makeHotel(overrides: Partial<Hotel> = {}): Hotel {
  const rooms = overrides.rooms ?? [makeRoom()];
  return {
    id: 'hotel-x',
    name: 'Test Hotel',
    description: 'desc',
    starRating: 4,
    overallRating: 4.5,
    reviewCount: 100,
    address: { street: '1 St', city: 'Testville', state: 'TS', zipCode: '00000', country: 'USA' },
    amenities: [],
    policies: { checkInTime: '15:00', checkOutTime: '11:00', cancellation: 'free' },
    priceFrom: Math.min(...rooms.map((r) => r.pricePerNight)),
    photoUrl: '/images/hotel-placeholder.svg',
    rooms,
    ...overrides,
  };
}
```

- [ ] **Step 2: Write the failing test**

```ts
// lib/filters.test.ts
import { filterByStars, filterByPrice } from './filters';
import { makeHotel, makeRoom } from '../tests/fixtures';

describe('filterByStars (minimum)', () => {
  const hotels = [makeHotel({ starRating: 3 }), makeHotel({ starRating: 4 }), makeHotel({ starRating: 5 })];
  it('keeps stars >= min', () => {
    expect(filterByStars(hotels, 4).map((h) => h.starRating)).toEqual([4, 5]);
  });
  it('min 0 keeps all', () => {
    expect(filterByStars(hotels, 0)).toHaveLength(3);
  });
});

describe('filterByPrice (any room in range)', () => {
  it('keeps a hotel whose cheapest room is in range', () => {
    const h = makeHotel({ rooms: [makeRoom({ pricePerNight: 500 }), makeRoom({ pricePerNight: 150 })] });
    expect(filterByPrice([h], 100, 200)).toHaveLength(1);
  });
  it('keeps a hotel that matches only via a non-cheapest room', () => {
    const h = makeHotel({ rooms: [makeRoom({ pricePerNight: 150 }), makeRoom({ pricePerNight: 800 })] });
    expect(filterByPrice([h], 700, 900)).toHaveLength(1); // priceFrom is 150, but room 800 matches
  });
  it('drops a hotel with no room in range', () => {
    const h = makeHotel({ rooms: [makeRoom({ pricePerNight: 500 })] });
    expect(filterByPrice([h], 100, 200)).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest lib/filters.test.ts`
Expected: FAIL — cannot find module `./filters`.

- [ ] **Step 4: Write the implementation**

```ts
// lib/filters.ts
import type { Hotel } from '../types/domain';

export function filterByStars(hotels: Hotel[], minStars: number): Hotel[] {
  return hotels.filter((hotel) => hotel.starRating >= minStars);
}

export function filterByPrice(hotels: Hotel[], min: number, max: number): Hotel[] {
  return hotels.filter((hotel) =>
    hotel.rooms.some((room) => room.pricePerNight >= min && room.pricePerNight <= max),
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest lib/filters.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add tests/fixtures.ts lib/filters.ts lib/filters.test.ts
git commit -m "feat(lib): star (min) and price (any-room) filters + fixtures"
```

---

## Task 5: `lib/sort.ts`

**Files:**
- Create: `lib/sort.ts`
- Test: `lib/sort.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/sort.test.ts
import { sortHotels } from './sort';
import { makeHotel, makeRoom } from '../tests/fixtures';

const hotel = (id: string, price: number, rating: number, stars: number) =>
  makeHotel({ id, rooms: [makeRoom({ pricePerNight: price })], overallRating: rating, starRating: stars });

describe('sortHotels', () => {
  const hotels = [hotel('a', 300, 4.0, 3), hotel('b', 100, 4.8, 5), hotel('c', 200, 4.5, 4)];

  it('price-asc orders by priceFrom ascending', () => {
    expect(sortHotels(hotels, 'price-asc').map((h) => h.id)).toEqual(['b', 'c', 'a']);
  });
  it('price-desc orders by priceFrom descending', () => {
    expect(sortHotels(hotels, 'price-desc').map((h) => h.id)).toEqual(['a', 'c', 'b']);
  });
  it('rating orders by overallRating descending', () => {
    expect(sortHotels(hotels, 'rating').map((h) => h.id)).toEqual(['b', 'c', 'a']);
  });
  it('stars orders by starRating descending', () => {
    expect(sortHotels(hotels, 'stars').map((h) => h.id)).toEqual(['b', 'c', 'a']);
  });
  it('is stable for ties (preserves input order)', () => {
    const tied = [hotel('x', 100, 4, 4), hotel('y', 100, 4, 4)];
    expect(sortHotels(tied, 'price-asc').map((h) => h.id)).toEqual(['x', 'y']);
  });
  it('does not mutate the input array', () => {
    const input = [...hotels];
    sortHotels(input, 'price-asc');
    expect(input.map((h) => h.id)).toEqual(['a', 'b', 'c']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/sort.test.ts`
Expected: FAIL — cannot find module `./sort`.

- [ ] **Step 3: Write the implementation**

```ts
// lib/sort.ts
import type { Hotel } from '../types/domain';

export type SortKey = 'price-asc' | 'price-desc' | 'rating' | 'stars';

const comparators: Record<SortKey, (a: Hotel, b: Hotel) => number> = {
  'price-asc': (a, b) => a.priceFrom - b.priceFrom,
  'price-desc': (a, b) => b.priceFrom - a.priceFrom,
  rating: (a, b) => b.overallRating - a.overallRating,
  stars: (a, b) => b.starRating - a.starRating,
};

export function sortHotels(hotels: Hotel[], key: SortKey): Hotel[] {
  // Array.prototype.sort is stable in V8 (Node >= 12), so ties keep input order.
  return [...hotels].sort(comparators[key]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/sort.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/sort.ts lib/sort.test.ts
git commit -m "feat(lib): stable hotel sorting by price/rating/stars"
```

---

## Task 6: `lib/paginate.ts`

**Files:**
- Create: `lib/paginate.ts`
- Test: `lib/paginate.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/paginate.test.ts
import { paginate, PAGE_SIZE } from './paginate';

const nums = Array.from({ length: 25 }, (_, i) => i + 1); // 1..25

describe('paginate', () => {
  it('returns the requested page slice and metadata', () => {
    const result = paginate(nums, 1, 10);
    expect(result.items).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(result).toMatchObject({ page: 1, totalPages: 3, total: 25 });
  });
  it('clamps a too-large page to the last page', () => {
    expect(paginate(nums, 99, 10).page).toBe(3);
    expect(paginate(nums, 99, 10).items).toEqual([21, 22, 23, 24, 25]);
  });
  it('clamps page 0 / negative up to 1', () => {
    expect(paginate(nums, 0, 10).page).toBe(1);
    expect(paginate(nums, -5, 10).page).toBe(1);
  });
  it('an empty list has totalPages 1 and no items', () => {
    expect(paginate([], 1, 10)).toMatchObject({ items: [], page: 1, totalPages: 1, total: 0 });
  });
  it('defaults to PAGE_SIZE', () => {
    expect(paginate(nums, 1).items).toHaveLength(PAGE_SIZE);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/paginate.test.ts`
Expected: FAIL — cannot find module `./paginate`.

- [ ] **Step 3: Write the implementation**

```ts
// lib/paginate.ts
export const PAGE_SIZE = 12;

export interface Page<T> {
  items: T[];
  page: number;
  totalPages: number;
  total: number;
}

export function paginate<T>(items: T[], page: number, size: number = PAGE_SIZE): Page<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const clampedPage = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (clampedPage - 1) * size;
  return { items: items.slice(start, start + size), page: clampedPage, totalPages, total };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/paginate.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/paginate.ts lib/paginate.test.ts
git commit -m "feat(lib): page clamping helper"
```

---

## Task 7: `services/mappers.ts` + `services/seed.ts`

**Files:**
- Create: `services/mappers.ts`
- Create: `services/seed.ts`
- Test: `services/mappers.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// services/mappers.test.ts
import { mapHotel, mapRoom, mapLocation, type RawHotel } from './mappers';

const rawHotel: RawHotel = {
  id: 'hotel-01',
  name: 'The Grand Luminary',
  description: 'A luxury oasis.',
  star_rating: 5,
  overall_rating: 4.8,
  review_count: 1240,
  address: { street: '789 Skyline Blvd', city: 'Chicago', state: 'IL', zip_code: '60611', country: 'USA' },
  amenities: ['pool', 'spa'],
  policies: { check_in_time: '15:00', check_out_time: '11:00', cancellation: 'Free up to 24h' },
  rooms: [
    {
      room_id: 'room-01a', type: 'Deluxe King', bed_type: 'King', bed_count: 1, max_occupancy: 2,
      square_footage: 450, price_per_night: 299, room_amenities: ['city_view'], available_dates: ['2026-07-10'],
    },
    {
      room_id: 'room-01b', type: 'Standard Queen', bed_type: 'Queen', bed_count: 1, max_occupancy: 2,
      square_footage: 300, price_per_night: 199, room_amenities: [], available_dates: ['2026-07-10'],
    },
  ],
};

describe('mapRoom', () => {
  it('renames snake_case to camelCase domain fields', () => {
    expect(mapRoom(rawHotel.rooms[0])).toEqual({
      roomId: 'room-01a', type: 'Deluxe King', bedType: 'King', bedCount: 1, maxOccupancy: 2,
      squareFootage: 450, pricePerNight: 299, amenities: ['city_view'], availableDates: ['2026-07-10'],
    });
  });
});

describe('mapHotel', () => {
  const hotel = mapHotel(rawHotel);
  it('maps scalar + nested fields to domain shape', () => {
    expect(hotel.id).toBe('hotel-01');
    expect(hotel.starRating).toBe(5);
    expect(hotel.reviewCount).toBe(1240);
    expect(hotel.address).toEqual({ street: '789 Skyline Blvd', city: 'Chicago', state: 'IL', zipCode: '60611', country: 'USA' });
    expect(hotel.policies.checkInTime).toBe('15:00');
  });
  it('derives priceFrom from the cheapest room', () => {
    expect(hotel.priceFrom).toBe(199);
  });
  it('sets a placeholder photoUrl and omits contact', () => {
    expect(hotel.photoUrl).toBeTruthy();
    expect((hotel as Record<string, unknown>).contact).toBeUndefined();
  });
});

describe('mapLocation', () => {
  it('derives slugged location from a domain hotel', () => {
    expect(mapLocation(mapHotel(rawHotel))).toEqual({
      city: 'Chicago', country: 'USA', state: 'IL', citySlug: 'chicago', countrySlug: 'usa',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest services/mappers.test.ts`
Expected: FAIL — cannot find module `./mappers`.

- [ ] **Step 3: Write `services/mappers.ts`**

```ts
// services/mappers.ts
import { slugify } from '../lib/slug';
import type { Hotel, Room, Location } from '../types/domain';

const PLACEHOLDER_PHOTO = '/images/hotel-placeholder.svg';

export interface RawRoom {
  room_id: string;
  type: string;
  bed_type: string;
  bed_count: number;
  max_occupancy: number;
  square_footage: number;
  price_per_night: number;
  room_amenities: string[];
  available_dates: string[];
}

export interface RawHotel {
  id: string;
  name: string;
  description: string;
  star_rating: number;
  overall_rating: number;
  review_count: number;
  address: { street: string; city: string; state: string; zip_code: string; country: string };
  amenities: string[];
  policies: { check_in_time: string; check_out_time: string; cancellation: string };
  rooms: RawRoom[];
}

export function mapRoom(raw: RawRoom): Room {
  return {
    roomId: raw.room_id,
    type: raw.type,
    bedType: raw.bed_type,
    bedCount: raw.bed_count,
    maxOccupancy: raw.max_occupancy,
    squareFootage: raw.square_footage,
    pricePerNight: raw.price_per_night,
    amenities: raw.room_amenities,
    availableDates: raw.available_dates,
  };
}

export function mapHotel(raw: RawHotel): Hotel {
  const rooms = raw.rooms.map(mapRoom);
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    starRating: raw.star_rating,
    overallRating: raw.overall_rating,
    reviewCount: raw.review_count,
    address: {
      street: raw.address.street,
      city: raw.address.city,
      state: raw.address.state,
      zipCode: raw.address.zip_code,
      country: raw.address.country,
    },
    amenities: raw.amenities,
    policies: {
      checkInTime: raw.policies.check_in_time,
      checkOutTime: raw.policies.check_out_time,
      cancellation: raw.policies.cancellation,
    },
    priceFrom: Math.min(...rooms.map((room) => room.pricePerNight)),
    photoUrl: PLACEHOLDER_PHOTO,
    rooms,
  };
}

export function mapLocation(hotel: Hotel): Location {
  return {
    city: hotel.address.city,
    country: hotel.address.country,
    state: hotel.address.state,
    citySlug: slugify(hotel.address.city),
    countrySlug: slugify(hotel.address.country),
  };
}
```

- [ ] **Step 4: Write `services/seed.ts`**

```ts
// services/seed.ts
import rawHotels from './mock/hotels.json';
import type { RawHotel } from './mappers';

// The ONLY module that imports the raw seed. Phase-2 swaps this for an HTTP client.
export function getRawHotels(): RawHotel[] {
  return rawHotels as unknown as RawHotel[];
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest services/mappers.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add services/mappers.ts services/seed.ts services/mappers.test.ts
git commit -m "feat(services): seed accessor and raw->domain mappers"
```

---

## Task 8: `services/hotelService.ts`

**Files:**
- Create: `services/hotelService.ts`
- Test: `services/hotelService.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// services/hotelService.test.ts
import { getLocations, getHotelsByLocation, getHotelById } from './hotelService';

describe('getLocations', () => {
  it('returns the 10 distinct seed locations, deterministically ordered', () => {
    const a = getLocations();
    const b = getLocations();
    expect(a).toHaveLength(10);
    expect(a).toEqual(b); // deterministic order
    expect(a).toContainEqual({ city: 'New York', country: 'USA', state: 'NY', citySlug: 'new-york', countrySlug: 'usa' });
  });
});

describe('getHotelsByLocation', () => {
  it('returns all 20 USA hotels for the country slug', () => {
    expect(getHotelsByLocation({ country: 'usa' })).toHaveLength(20);
  });
  it('narrows to the 4 New York hotels for the city slug', () => {
    const hotels = getHotelsByLocation({ city: 'new-york' });
    expect(hotels).toHaveLength(4);
    expect(hotels.every((h) => h.address.city === 'New York')).toBe(true);
  });
  it('returns all 40 hotels when no filter is given', () => {
    expect(getHotelsByLocation({})).toHaveLength(40);
  });
  it('returns [] for an unknown slug', () => {
    expect(getHotelsByLocation({ city: 'atlantis' })).toEqual([]);
  });
});

describe('getHotelById', () => {
  it('returns a mapped domain hotel for a known id', () => {
    const hotel = getHotelById('hotel-01');
    expect(hotel?.id).toBe('hotel-01');
    expect(hotel?.starRating).toBeGreaterThan(0);
    expect(hotel?.photoUrl).toBeTruthy();
  });
  it('returns null for an unknown id', () => {
    expect(getHotelById('hotel-999')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest services/hotelService.test.ts`
Expected: FAIL — cannot find module `./hotelService`.

- [ ] **Step 3: Write the implementation**

```ts
// services/hotelService.ts
import { getRawHotels } from './seed';
import { mapHotel, mapLocation } from './mappers';
import { buildSlugLookup } from '../lib/slug';
import type { Hotel, Location } from '../types/domain';

// Map the whole seed to domain types once, at module load.
const hotels: Hotel[] = getRawHotels().map(mapHotel);

export function getLocations(): Location[] {
  const seen = new Map<string, Location>();
  for (const hotel of hotels) {
    const location = mapLocation(hotel);
    const key = `${location.countrySlug}/${location.citySlug}`;
    if (!seen.has(key)) {
      seen.set(key, location);
    }
  }
  return [...seen.values()].sort(
    (a, b) => a.country.localeCompare(b.country) || a.city.localeCompare(b.city),
  );
}

export function getHotelsByLocation(query: { country?: string; city?: string }): Hotel[] {
  let result = hotels;

  if (query.country) {
    const lookup = buildSlugLookup(hotels.map((h) => h.address.country));
    const country = lookup.get(query.country);
    result = country ? result.filter((h) => h.address.country === country) : [];
  }

  if (query.city) {
    const lookup = buildSlugLookup(hotels.map((h) => h.address.city));
    const city = lookup.get(query.city);
    result = city ? result.filter((h) => h.address.city === city) : [];
  }

  return result;
}

export function getHotelById(id: string): Hotel | null {
  return hotels.find((hotel) => hotel.id === id) ?? null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest services/hotelService.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add services/hotelService.ts services/hotelService.test.ts
git commit -m "feat(services): hotelService getLocations/getHotelsByLocation/getHotelById"
```

---

## Task 9: `services/availabilityService.ts`

**Files:**
- Create: `services/availabilityService.ts`
- Test: `services/availabilityService.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// services/availabilityService.test.ts
import { checkAvailability } from './availabilityService';
import { InvalidDateRangeError, HotelNotFoundError } from '../types/domain';

describe('checkAvailability', () => {
  it('returns only rooms available for every night in range', async () => {
    // hotel-01: room-01a covers 07-10..07-12, room-01b only 07-10..07-11.
    const rooms = await checkAvailability('hotel-01', '2026-07-10', '2026-07-13', { delayMs: 0 });
    expect(rooms.map((r) => r.roomId)).toEqual(['room-01a']);
    expect(rooms[0]).toMatchObject({ roomId: 'room-01a', pricePerNight: 299 });
  });

  it('returns [] for a hotel with no availability (hotel-04)', async () => {
    expect(await checkAvailability('hotel-04', '2026-07-10', '2026-07-11', { delayMs: 0 })).toEqual([]);
  });

  it('returns [] for dates outside the dataset window', async () => {
    expect(await checkAvailability('hotel-01', '2026-08-01', '2026-08-02', { delayMs: 0 })).toEqual([]);
  });

  it('throws InvalidDateRangeError when checkout <= checkin', async () => {
    await expect(checkAvailability('hotel-01', '2026-07-12', '2026-07-12', { delayMs: 0 })).rejects.toBeInstanceOf(
      InvalidDateRangeError,
    );
  });

  it('throws HotelNotFoundError for an unknown id', async () => {
    await expect(checkAvailability('hotel-999', '2026-07-10', '2026-07-11', { delayMs: 0 })).rejects.toBeInstanceOf(
      HotelNotFoundError,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest services/availabilityService.test.ts`
Expected: FAIL — cannot find module `./availabilityService`.

- [ ] **Step 3: Write the implementation**

```ts
// services/availabilityService.ts
import { getHotelById } from './hotelService';
import { nightsInRange, isRoomAvailable } from '../lib/availability';
import { InvalidDateRangeError, HotelNotFoundError, type AvailableRoom } from '../types/domain';

const DEFAULT_LATENCY_MS = Number(process.env.AVAILABILITY_LATENCY_MS ?? 1000);

function simulateLatency(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function checkAvailability(
  id: string,
  checkIn: string,
  checkOut: string,
  opts: { delayMs?: number } = {},
): Promise<AvailableRoom[]> {
  if (!(checkOut > checkIn)) {
    throw new InvalidDateRangeError();
  }

  const hotel = getHotelById(id);
  if (!hotel) {
    throw new HotelNotFoundError(id);
  }

  // Simulate the slow third-party pricing/availability call.
  await simulateLatency(opts.delayMs ?? DEFAULT_LATENCY_MS);

  const nights = nightsInRange(checkIn, checkOut);
  return hotel.rooms
    .filter((room) => isRoomAvailable(room, nights))
    .map((room) => ({
      roomId: room.roomId,
      type: room.type,
      pricePerNight: room.pricePerNight,
      bedType: room.bedType,
      maxOccupancy: room.maxOccupancy,
    }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest services/availabilityService.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add services/availabilityService.ts services/availabilityService.test.ts
git commit -m "feat(services): availabilityService with simulated latency"
```

---

## Task 10: Boundary guard — only `services/` imports the seed

**Files:**
- Create: `services/boundary.test.ts`

> Placed inside `services/` so the walk (which skips `services/`) does not flag this test's own reference to `hotels.json`.

- [ ] **Step 1: Write the test (it should pass immediately — the guard already holds)**

```ts
// services/boundary.test.ts
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (['node_modules', 'services', 'coverage', 'dist', '.next', '.git'].includes(name) || name.startsWith('.')) {
        return [];
      }
      return walk(full);
    }
    return /\.tsx?$/.test(name) ? [full] : [];
  });
}

it('no module outside services/ imports the raw seed', () => {
  const root = join(__dirname, '..');
  const offenders = walk(root).filter((file) => readFileSync(file, 'utf8').includes('hotels.json'));
  expect(offenders).toEqual([]);
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx jest services/boundary.test.ts`
Expected: PASS (1 test). If it FAILS, a non-service file imports the seed — move that access behind `services/seed.ts`.

- [ ] **Step 3: Commit**

```bash
git add services/boundary.test.ts
git commit -m "test(services): guard that only services/ imports the seed"
```

---

## Task 11: Full suite, coverage gate, and progress doc update

**Files:**
- Modify: `docs/progress.md` (M1 price-filter wording + check off M1 items)

- [ ] **Step 1: Run the whole suite with coverage**

Run: `npx jest --coverage`
Expected: all suites PASS; coverage ≥ 85% on branches/functions/lines/statements (the configured threshold does not fail the run).

- [ ] **Step 2: Run the type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Update `docs/progress.md`**

In the M1 section, change the price-filter line from "min room `price_per_night`" to reflect the decided semantics, and check off completed M1 items. Replace the `lib/filters.ts` bullet text:

```markdown
- [x] `lib/filters.ts` — star-rating filter (minimum, "4★ & up") + price-range filter: hotel matches if **any** room's `pricePerNight` is in `[min, max]` (decision: any-room-in-range, not min-room).
```

Check off the other completed M1 checkboxes (`[x]`) for domain types, `hotelService`, `availabilityService`, `lib/slug.ts`, `lib/sort.ts`, `lib/paginate.ts`, `lib/availability.ts`, and the unit-tests + "Done when" line.

- [ ] **Step 4: Commit**

```bash
git add docs/progress.md
git commit -m "docs: mark M1 complete; correct price-filter semantics"
```

---

## Self-Review (completed by plan author)

**1. Spec coverage** — every spec section maps to a task:
- §3 module structure → Tasks 7, 8, 9. §4 domain types → Task 1. §5.1 hotelService → Task 8. §5.2 availabilityService → Task 9. §6.1–6.5 lib → Tasks 2–6. §7 errors → Task 1 (defined) + Task 9 (thrown). §8 testing → every task is test-first; §8 boundary invariant → Task 10; ≥85% gate → Task 0 config + Task 11 run. §9 progress.md wording fix → Task 11.

**2. Placeholder scan** — no TBD/TODO; every code step shows complete code; every test step shows full assertions.

**3. Type/name consistency** — `Hotel`, `Room`, `Location`, `AvailableRoom`, `InvalidDateRangeError`, `HotelNotFoundError` defined in Task 1 and used verbatim after. `getLocations/getHotelsByLocation/getHotelById` (Task 8) and `checkAvailability` (Task 9) match the spec signatures. `slugify/buildSlugLookup`, `nightsInRange/isRoomAvailable`, `filterByStars/filterByPrice`, `sortHotels/SortKey`, `paginate/PAGE_SIZE`, `mapHotel/mapRoom/mapLocation/RawHotel`, `getRawHotels` are all consistent across producer and consumer tasks.

**Note for executor:** if M0 ran first, Task 0's `tsconfig.json`/`jest.config.js` may already exist via Next.js — keep those and only ensure `resolveJsonModule: true`, a node-env Jest project for `*.test.ts`, and the seed at `services/mock/hotels.json`.
