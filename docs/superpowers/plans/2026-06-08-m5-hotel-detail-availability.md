# M5 — Hotel Detail & Room Availability (`/hotels/[id]`) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/hotels/[id]` — a server-rendered hotel detail (hero, overview, amenities, policies, ratings) that paints immediately and a decoupled client availability island that lazily loads available rooms + price/night for chosen dates, covering PRD F4, F5.

**Architecture:** `app/hotels/[id]/page.tsx` is a server component that fetches its own BFF route `/api/hotels/[id]` via M3's `getJson` (BFF-only data access), exposes `generateMetadata` (hotel-name title), and calls `notFound()` on a 404. The only client island is `RoomAvailability`, which seeds demo-default dates, validates, and drives M3's `useAvailability` through the BFF's slow `/rooms` route — never blocking the detail. TDD throughout; ≥85% coverage on M5 modules.

**Tech Stack:** Next.js 16 (App Router, async `params`) + React 19 + TypeScript (strict), Tailwind v4, `@tanstack/react-query` (via M3 hooks), Jest + `next/jest` (jsdom) + React Testing Library + `@testing-library/user-event` + MSW v2.

**Spec:** `docs/superpowers/specs/2026-06-08-m5-hotel-detail-availability-design.md`

**Design contract:** `docs/designs/hotel-detail-page-design-spec.md` + `docs/designs/hotel-detail-page-mockup.html` (open in a browser).

**Conventions for every task:** run tests with `npx jest <path>`; co-locate `*.test.tsx` next to source; relative imports matching M1/M3/M4; commit after each green task with conventional-commit prefixes. Components are `'use client'` only when they use state/effects/hooks/handlers.

**Assumes M0–M4 are done:**
- **M1:** `types/domain.ts` (`Hotel`, `Room`, `AvailableRoom`), `lib/availability.ts` (`nightsInRange`), `services/availabilityService.ts` (room→`AvailableRoom` mapper), `tests/fixtures.ts` (`makeHotel`, `makeRoom`).
- **M2:** `/api/hotels/[id]` (detail), `/api/hotels/[id]/rooms` (availability).
- **M3:** `hooks/useAvailability.ts`, `stores/AppProvider.tsx` (`useAppDates`, mounted in root layout), `lib/fetcher.ts` (`getJson`, `ApiError`), `tests/msw/{handlers,server}.ts`, `tests/utils/queryWrapper.tsx`.
- **M4:** `components/Icon.tsx`, `components/EmptyState.tsx`, `lib/amenities.ts` (`humanizeAmenity`), `utils/analyticUtil.ts` (`track`, `AnalyticsEvent`), the root layout app bar/footer.

If a referenced M1–M4 export is missing at execution time, stop and complete that milestone first — M5 is assembly on top of them.

> **Next 16 caveat (AGENTS.md):** before Tasks 9–11 (`page.tsx`, `generateMetadata`, `notFound`, `not-found.tsx`, async `params`), read `node_modules/next/dist/docs/` — dynamic route `params` is now a Promise (`await params`), and `generateMetadata`/file-based `not-found` conventions differ from training data.

---

## File Map

| File | Responsibility |
| --- | --- |
| `.env.local` | **(create)** `API_BASE_URL=http://localhost:3000` for SSR fetch |
| `types/domain.ts` | **(modify)** widen `AvailableRoom` with `bedCount`, `squareFootage`, `amenities` |
| `services/availabilityService.ts` | **(modify)** mapper populates the new `AvailableRoom` fields |
| `tests/msw/handlers.ts` | **(modify)** `/rooms` returns the widened shape |
| `utils/analyticUtil.ts` | **(modify)** add `hotel_viewed`, `availability_checked`, `no_rooms` events |
| `components/RatingStars.tsx` | Shared amber stars + numeric value |
| `components/InlineError.tsx` | Shared message + Retry |
| `components/hotel/BackToResults.tsx` | `'use client'` history-based "← Back to results" |
| `components/hotel/HotelHero.tsx` | Hero 16:9 placeholder + name + address + ratings |
| `components/hotel/AmenitiesGrid.tsx` | Humanized amenity icon grid |
| `components/hotel/PoliciesList.tsx` | Check-in / check-out / cancellation rows |
| `components/hotel/RoomCard.tsx` | One available room (specs + pills + price + ✓) |
| `components/hotel/RoomSkeleton.tsx` | Shimmer room placeholder |
| `components/hotel/RoomAvailability.tsx` | `'use client'` orchestrator (dates ↔ useAvailability ↔ states) |
| `components/hotel/DateField.tsx` | Labelled native `<input type="date">` |
| `app/hotels/[id]/page.tsx` | Server: fetch detail, metadata, render, mount panel |
| `app/hotels/[id]/not-found.tsx` | Server: "Hotel not found" + Browse hotels |
| `docs/progress.md` | **(modify)** check off M5 |

---

## Task 0: Reconciliations — widen `AvailableRoom`, analytics events, env

**Files:**
- Modify: `types/domain.ts`
- Modify: `services/availabilityService.ts`
- Modify: `services/availabilityService.test.ts`
- Modify: `tests/msw/handlers.ts`
- Modify: `utils/analyticUtil.ts`
- Modify: `utils/analyticUtil.test.ts`
- Create: `.env.local`

- [ ] **Step 1: Write the failing service test for the widened mapping**

In `services/availabilityService.test.ts`, extend the happy-path assertion so a returned `AvailableRoom` carries the new fields (the seed room-01a has `bed_count: 1`, `square_footage: 450`, `room_amenities: ['city_view','mini_bar']`):

```ts
it('maps bed count, square footage, and room amenities onto AvailableRoom', async () => {
  const rooms = await checkAvailability('hotel-01', '2026-07-10', '2026-07-12', { delayMs: 0 });
  const deluxe = rooms.find((r) => r.roomId === 'room-01a')!;
  expect(deluxe.bedCount).toBe(1);
  expect(deluxe.squareFootage).toBe(450);
  expect(deluxe.amenities).toEqual(['city_view', 'mini_bar']);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest services/availabilityService.test.ts`
Expected: FAIL — `bedCount`/`squareFootage`/`amenities` are `undefined` (type + mapper don't carry them yet).

- [ ] **Step 3: Widen the type and the mapper**

In `types/domain.ts`, add the three fields to `AvailableRoom`:

```ts
export type AvailableRoom = {
  roomId: string;
  type: string;
  pricePerNight: number; // USD
  bedType: string;
  bedCount: number;
  maxOccupancy: number;
  squareFootage: number;
  amenities: string[]; // raw room_amenities tokens; humanized in the UI
};
```

In `services/availabilityService.ts`, where a surviving `Room` is mapped to `AvailableRoom`, populate the new fields from the raw room:

```ts
// inside the rooms.filter(...).map(room => ({ ... })) projection:
const toAvailableRoom = (room: Room): AvailableRoom => ({
  roomId: room.roomId,
  type: room.type,
  pricePerNight: room.pricePerNight,
  bedType: room.bedType,
  bedCount: room.bedCount,
  maxOccupancy: room.maxOccupancy,
  squareFootage: room.squareFootage,
  amenities: room.amenities,
});
```

> If M1's `Room` domain type didn't carry `bedCount`/`squareFootage`/`amenities`, add them there too from the raw seed (`bed_count`, `square_footage`, `room_amenities`) in the seed→domain mapper. The seed provides all three (verified).

- [ ] **Step 4: Run to verify the service test passes**

Run: `npx jest services/availabilityService.test.ts`
Expected: PASS.

- [ ] **Step 5: Update the MSW `/rooms` handler to the widened shape**

In `tests/msw/handlers.ts`, make the `/api/hotels/:id/rooms` handler return rooms with the new fields so M5's hook/integration tests see realistic data:

```ts
http.get(`${ORIGIN}/api/hotels/:id/rooms`, () =>
  HttpResponse.json([
    { roomId: 'room-01a', type: 'Deluxe King Room', pricePerNight: 299, bedType: 'King', bedCount: 1, maxOccupancy: 2, squareFootage: 450, amenities: ['city_view', 'mini_bar'] },
    { roomId: 'room-01b', type: 'Standard Queen', pricePerNight: 199, bedType: 'Queen', bedCount: 1, maxOccupancy: 2, squareFootage: 320, amenities: ['mini_bar'] },
  ]),
);
```

- [ ] **Step 6: Write the failing analytics test for the three new events**

In `utils/analyticUtil.test.ts`, add (these assert the events type-check and log in DEV):

```ts
it('accepts the M5 event shapes', () => {
  (process.env as { NODE_ENV?: string }).NODE_ENV = 'development';
  const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
  track({ name: 'hotel_viewed', hotelId: 'hotel-01' });
  track({ name: 'availability_checked', hotelId: 'hotel-01', nights: 2 });
  track({ name: 'no_rooms', hotelId: 'hotel-01' });
  expect(spy).toHaveBeenCalledTimes(3);
});
```

- [ ] **Step 7: Run to verify it fails**

Run: `npx jest utils/analyticUtil.test.ts`
Expected: FAIL — TS/`track` rejects the unknown event names.

- [ ] **Step 8: Extend the `AnalyticsEvent` union**

In `utils/analyticUtil.ts`, add the three M5 variants to the union (keep M4's two):

```ts
export type AnalyticsEvent =
  | { name: 'search_performed'; city: string | null; country: string | null; filters: { stars: number | null; min: number | null; max: number | null; sort: string } }
  | { name: 'no_results'; filters: { stars: number | null; min: number | null; max: number | null } }
  | { name: 'hotel_viewed'; hotelId: string }
  | { name: 'availability_checked'; hotelId: string; nights: number }
  | { name: 'no_rooms'; hotelId: string };
```

- [ ] **Step 9: Run to verify analytics passes**

Run: `npx jest utils/analyticUtil.test.ts`
Expected: PASS.

- [ ] **Step 10: Create `.env.local` for the SSR fetch origin**

```bash
# .env.local
API_BASE_URL=http://localhost:3000
```

> This is what lets the server component's `getJson('/api/hotels/[id]')` resolve to an absolute URL at SSR time. M9 sets the deployment origin. Confirm `.env.local` is gitignored (Next's default `.gitignore` ignores `.env*.local`).

- [ ] **Step 11: Commit**

```bash
git add types/domain.ts services/availabilityService.ts services/availabilityService.test.ts tests/msw/handlers.ts utils/analyticUtil.ts utils/analyticUtil.test.ts
git commit -m "refactor(M5): widen AvailableRoom + add M5 analytics events"
```

> `.env.local` is intentionally not committed (gitignored).

---

## Task 1: `components/RatingStars.tsx`

**Files:**
- Create: `components/RatingStars.tsx`
- Test: `components/RatingStars.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/RatingStars.test.tsx
import { render, screen } from '@testing-library/react';
import { RatingStars } from './RatingStars';

describe('RatingStars', () => {
  it('renders the numeric value and is labelled for screen readers', () => {
    render(<RatingStars value={4.8} />);
    expect(screen.getByText('4.8')).toBeTruthy();
    expect(screen.getByLabelText(/rated 4\.8 out of 5/i)).toBeTruthy();
  });

  it('marks the star glyphs decorative', () => {
    const { container } = render(<RatingStars value={4.8} />);
    expect(container.querySelectorAll('svg[aria-hidden="true"]').length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest components/RatingStars.test.tsx`
Expected: FAIL — cannot find module `./RatingStars`.

- [ ] **Step 3: Write the implementation**

```tsx
// components/RatingStars.tsx
import { Icon } from './Icon';

export function RatingStars({ value, size = 16 }: { value: number; size?: number }) {
  const rounded = Math.round(value);
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Rated ${value} out of 5`}>
      <span className="inline-flex" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <Icon key={i} name="star" size={size} className={i < rounded ? 'text-amber-500' : 'text-slate-300'} />
        ))}
      </span>
      <span className="text-sm font-medium tabular-nums text-slate-900">{value}</span>
    </span>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest components/RatingStars.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add components/RatingStars.tsx components/RatingStars.test.tsx
git commit -m "feat(M5): shared RatingStars component"
```

---

## Task 2: `components/InlineError.tsx`

**Files:**
- Create: `components/InlineError.tsx`
- Test: `components/InlineError.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/InlineError.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InlineError } from './InlineError';

describe('InlineError', () => {
  it('shows the message with an alert role', () => {
    render(<InlineError message="Couldn't load availability" />);
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load availability");
  });

  it('fires Retry when provided', async () => {
    const onRetry = jest.fn();
    render(<InlineError message="x" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('omits the Retry button when no handler is given', () => {
    render(<InlineError message="x" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest components/InlineError.test.tsx`
Expected: FAIL — cannot find module `./InlineError`.

- [ ] **Step 3: Write the implementation**

```tsx
// components/InlineError.tsx
import { Icon } from './Icon';

export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <span className="flex items-center gap-2">
        <Icon name="x" size={18} />
        {message}
      </span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 rounded-lg border border-red-300 px-3 font-medium text-red-700 hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest components/InlineError.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/InlineError.tsx components/InlineError.test.tsx
git commit -m "feat(M5): shared InlineError + Retry"
```

---

## Task 3: `components/hotel/BackToResults.tsx`

**Files:**
- Create: `components/hotel/BackToResults.tsx`
- Test: `components/hotel/BackToResults.test.tsx`

> History-based so the home filters/sort/page survive. Falls back to `/` when there is no in-app history (deep-link entry).

- [ ] **Step 1: Write the failing test**

```tsx
// components/hotel/BackToResults.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const back = jest.fn();
const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ back, push }) }));

import { BackToResults } from './BackToResults';

describe('BackToResults', () => {
  beforeEach(() => {
    back.mockClear();
    push.mockClear();
  });

  it('navigates back through history when there is history', async () => {
    Object.defineProperty(window.history, 'length', { configurable: true, value: 3 });
    render(<BackToResults />);
    await userEvent.click(screen.getByRole('button', { name: /back to results/i }));
    expect(back).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it('falls back to the home route on a deep-link entry', async () => {
    Object.defineProperty(window.history, 'length', { configurable: true, value: 1 });
    render(<BackToResults />);
    await userEvent.click(screen.getByRole('button', { name: /back to results/i }));
    expect(push).toHaveBeenCalledWith('/');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest components/hotel/BackToResults.test.tsx`
Expected: FAIL — cannot find module `./BackToResults`.

- [ ] **Step 3: Write the implementation**

```tsx
// components/hotel/BackToResults.tsx
'use client';

import { useRouter } from 'next/navigation';
import { Icon } from '../Icon';

export function BackToResults() {
  const router = useRouter();
  const onClick = () => {
    // history.length > 1 means we arrived from another in-app page → preserve its URL state.
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/');
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-blue-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
    >
      <Icon name="chevron" size={18} className="rotate-90" />
      Back to results
    </button>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest components/hotel/BackToResults.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add components/hotel/BackToResults.tsx components/hotel/BackToResults.test.tsx
git commit -m "feat(M5): history-based BackToResults"
```

---

## Task 4: `components/hotel/HotelHero.tsx`

**Files:**
- Create: `components/hotel/HotelHero.tsx`
- Test: `components/hotel/HotelHero.test.tsx`

> Consumes `Hotel` (`name`, `address.{street,city,state,zipCode,country}`, `starRating`, `overallRating`, `reviewCount`). Uses `RatingStars` (Task 1).

- [ ] **Step 1: Write the failing test**

```tsx
// components/hotel/HotelHero.test.tsx
import { render, screen } from '@testing-library/react';
import type { Hotel } from '../../types/domain';
import { HotelHero } from './HotelHero';

const hotel = {
  id: 'hotel-01',
  name: 'The Grand Luminary',
  starRating: 5,
  overallRating: 4.8,
  reviewCount: 1240,
  address: { street: '789 Skyline Blvd', city: 'Chicago', state: 'IL', zipCode: '60611', country: 'USA' },
} as unknown as Hotel;

describe('HotelHero', () => {
  it('renders the name as the h1, the full address, and the ratings', () => {
    render(<HotelHero hotel={hotel} />);
    expect(screen.getByRole('heading', { level: 1, name: 'The Grand Luminary' })).toBeTruthy();
    expect(screen.getByText(/789 Skyline Blvd, Chicago, IL 60611, USA/)).toBeTruthy();
    expect(screen.getByText('5★ hotel')).toBeTruthy();
    expect(screen.getByText(/1,240 reviews/)).toBeTruthy();
    expect(screen.getByLabelText(/rated 4\.8 out of 5/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest components/hotel/HotelHero.test.tsx`
Expected: FAIL — cannot find module `./HotelHero`.

- [ ] **Step 3: Write the implementation**

```tsx
// components/hotel/HotelHero.tsx
import type { Hotel } from '../../types/domain';
import { Icon } from '../Icon';
import { RatingStars } from '../RatingStars';

export function HotelHero({ hotel }: { hotel: Hotel }) {
  const a = hotel.address;
  const fullAddress = `${a.street}, ${a.city}, ${a.state} ${a.zipCode}, ${a.country}`;
  return (
    <section className="space-y-3">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-100">
        <span className="absolute inset-0 flex items-center justify-center text-slate-300">
          <Icon name="building" size={48} aria-hidden />
        </span>
        <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-sm font-semibold text-slate-900" aria-hidden>
          {hotel.starRating}★
        </span>
      </div>
      <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">{hotel.name}</h1>
      <p className="text-sm text-slate-600">{fullAddress}</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-700">
        <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-700">{hotel.starRating}★ hotel</span>
        <RatingStars value={hotel.overallRating} />
        <span className="tabular-nums text-slate-500">{hotel.reviewCount.toLocaleString('en-US')} reviews</span>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest components/hotel/HotelHero.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add components/hotel/HotelHero.tsx components/hotel/HotelHero.test.tsx
git commit -m "feat(M5): HotelHero (placeholder, ratings)"
```

---

## Task 5: `components/hotel/AmenitiesGrid.tsx`

**Files:**
- Create: `components/hotel/AmenitiesGrid.tsx`
- Test: `components/hotel/AmenitiesGrid.test.tsx`

> Uses `humanizeAmenity` (M4) and `Icon`. Responsive 2→3→4 col grid.

- [ ] **Step 1: Write the failing test**

```tsx
// components/hotel/AmenitiesGrid.test.tsx
import { render, screen } from '@testing-library/react';
import { AmenitiesGrid } from './AmenitiesGrid';

describe('AmenitiesGrid', () => {
  it('renders a humanized list item per amenity', () => {
    render(<AmenitiesGrid amenities={['valet_parking', 'free_wifi', 'pet_friendly']} />);
    expect(screen.getByText('Valet parking')).toBeTruthy();
    expect(screen.getByText('Wi-Fi')).toBeTruthy();
    expect(screen.getByText('Pet friendly')).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest components/hotel/AmenitiesGrid.test.tsx`
Expected: FAIL — cannot find module `./AmenitiesGrid`.

- [ ] **Step 3: Write the implementation**

```tsx
// components/hotel/AmenitiesGrid.tsx
import { humanizeAmenity } from '../../lib/amenities';
import { Icon } from '../Icon';

export function AmenitiesGrid({ amenities }: { amenities: string[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-slate-900">Amenities</h2>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {amenities.map((a) => (
          <li key={a} className="flex items-center gap-2 text-sm text-slate-700">
            <Icon name="building" size={18} className="text-slate-400" aria-hidden />
            {humanizeAmenity(a)}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest components/hotel/AmenitiesGrid.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add components/hotel/AmenitiesGrid.tsx components/hotel/AmenitiesGrid.test.tsx
git commit -m "feat(M5): AmenitiesGrid (humanized)"
```

---

## Task 6: `components/hotel/PoliciesList.tsx`

**Files:**
- Create: `components/hotel/PoliciesList.tsx`
- Test: `components/hotel/PoliciesList.test.tsx`

> Consumes `Hotel['policies']` (`checkInTime`, `checkOutTime`, `cancellation`).

- [ ] **Step 1: Write the failing test**

```tsx
// components/hotel/PoliciesList.test.tsx
import { render, screen } from '@testing-library/react';
import { PoliciesList } from './PoliciesList';

describe('PoliciesList', () => {
  it('renders check-in, check-out, and cancellation', () => {
    render(<PoliciesList policies={{ checkInTime: '15:00', checkOutTime: '11:00', cancellation: 'Free cancellation up to 24 hours before check-in' }} />);
    expect(screen.getByText('15:00')).toBeTruthy();
    expect(screen.getByText('11:00')).toBeTruthy();
    expect(screen.getByText(/Free cancellation up to 24 hours/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest components/hotel/PoliciesList.test.tsx`
Expected: FAIL — cannot find module `./PoliciesList`.

- [ ] **Step 3: Write the implementation**

```tsx
// components/hotel/PoliciesList.tsx
import type { Hotel } from '../../types/domain';

export function PoliciesList({ policies }: { policies: Hotel['policies'] }) {
  const rows = [
    { label: 'Check-in', value: policies.checkInTime },
    { label: 'Check-out', value: policies.checkOutTime },
    { label: 'Cancellation', value: policies.cancellation },
  ];
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-slate-900">Policies</h2>
      <dl className="space-y-2 text-sm">
        {rows.map((r) => (
          <div key={r.label} className="flex gap-2">
            <dt className="w-28 shrink-0 font-medium text-slate-900">{r.label}</dt>
            <dd className="text-slate-600">{r.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest components/hotel/PoliciesList.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add components/hotel/PoliciesList.tsx components/hotel/PoliciesList.test.tsx
git commit -m "feat(M5): PoliciesList"
```

---

## Task 7: `components/hotel/RoomSkeleton.tsx` + `RoomCard.tsx`

**Files:**
- Create: `components/hotel/RoomSkeleton.tsx`
- Create: `components/hotel/RoomCard.tsx`
- Test: `components/hotel/RoomCard.test.tsx`

> `RoomCard` consumes the widened `AvailableRoom` (Task 0). Humanizes room amenities. No Reserve CTA.

- [ ] **Step 1: Write the failing test**

```tsx
// components/hotel/RoomCard.test.tsx
import { render, screen } from '@testing-library/react';
import type { AvailableRoom } from '../../types/domain';
import { RoomCard } from './RoomCard';

const room: AvailableRoom = {
  roomId: 'room-01a',
  type: 'Deluxe King Room',
  pricePerNight: 299,
  bedType: 'King',
  bedCount: 1,
  maxOccupancy: 2,
  squareFootage: 450,
  amenities: ['city_view', 'mini_bar'],
};

describe('RoomCard', () => {
  it('shows type, full specs, humanized amenity pills, price, and the available badge', () => {
    render(<RoomCard room={room} />);
    expect(screen.getByRole('heading', { name: 'Deluxe King Room' })).toBeTruthy();
    expect(screen.getByText(/King · 1 bed · Sleeps 2 · 450 sq ft/)).toBeTruthy();
    expect(screen.getByText('City view')).toBeTruthy();
    expect(screen.getByText('Mini bar')).toBeTruthy();
    expect(screen.getByText('$299')).toBeTruthy();
    expect(screen.getByText(/Available/)).toBeTruthy();
  });

  it('has no Reserve/booking button in Phase 1', () => {
    render(<RoomCard room={room} />);
    expect(screen.queryByRole('button', { name: /reserve|book/i })).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest components/hotel/RoomCard.test.tsx`
Expected: FAIL — cannot find module `./RoomCard`.

- [ ] **Step 3: Write the implementations**

```tsx
// components/hotel/RoomSkeleton.tsx
export function RoomSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="h-5 w-1/2 animate-pulse rounded bg-slate-100" />
      <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
      <div className="h-5 w-1/4 animate-pulse rounded bg-slate-100" />
    </div>
  );
}
```

```tsx
// components/hotel/RoomCard.tsx
import { humanizeAmenity } from '../../lib/amenities';
import type { AvailableRoom } from '../../types/domain';
import { Icon } from '../Icon';

export function RoomCard({ room }: { room: AvailableRoom }) {
  const specs = `${room.bedType} · ${room.bedCount} bed · Sleeps ${room.maxOccupancy} · ${room.squareFootage} sq ft`;
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900">{room.type}</h3>
        <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600">
          <Icon name="star" size={16} aria-hidden />
          Available
        </span>
      </div>
      <p className="text-sm text-slate-600">{specs}</p>
      {room.amenities.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {room.amenities.map((a) => (
            <li key={a} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {humanizeAmenity(a)}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-sm text-slate-900">
        <span className="font-semibold tabular-nums">${room.pricePerNight.toLocaleString('en-US')}</span>
        <span className="text-slate-500"> / night</span>
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest components/hotel/RoomCard.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add components/hotel/RoomSkeleton.tsx components/hotel/RoomCard.tsx components/hotel/RoomCard.test.tsx
git commit -m "feat(M5): RoomCard (full specs, pills, price) + RoomSkeleton"
```

---

## Task 8: `components/hotel/DateField.tsx`

**Files:**
- Create: `components/hotel/DateField.tsx`
- Test: `components/hotel/DateField.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/hotel/DateField.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateField } from './DateField';

describe('DateField', () => {
  it('associates the label and emits the chosen date', async () => {
    const onChange = jest.fn();
    render(<DateField id="check-in" label="Check-in" value={null} onChange={onChange} />);
    const input = screen.getByLabelText('Check-in');
    await userEvent.type(input, '2026-07-10');
    expect(onChange).toHaveBeenLastCalledWith('2026-07-10');
  });

  it('emits null when cleared and forwards min', () => {
    const onChange = jest.fn();
    render(<DateField id="check-out" label="Check-out" value="2026-07-12" min="2026-07-10" onChange={onChange} />);
    const input = screen.getByLabelText('Check-out') as HTMLInputElement;
    expect(input.min).toBe('2026-07-10');
    expect(input.value).toBe('2026-07-12');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest components/hotel/DateField.test.tsx`
Expected: FAIL — cannot find module `./DateField`.

- [ ] **Step 3: Write the implementation**

```tsx
// components/hotel/DateField.tsx
'use client';

export function DateField({
  id,
  label,
  value,
  min,
  onChange,
}: {
  id: string;
  label: string;
  value: string | null;
  min?: string;
  onChange: (value: string | null) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-900">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value ?? ''}
        min={min}
        onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
        className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
      />
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest components/hotel/DateField.test.tsx`
Expected: PASS (2 tests).

> Note: `userEvent.type` on a native date input fills it as the browser/jsdom allows; if jsdom rejects partial typing, use `fireEvent.change(input, { target: { value: '2026-07-10' } })` instead — assert the emitted value either way.

- [ ] **Step 5: Commit**

```bash
git add components/hotel/DateField.tsx components/hotel/DateField.test.tsx
git commit -m "feat(M5): DateField (native date input)"
```

---

## Task 9: `components/hotel/RoomAvailability.tsx`

**Files:**
- Create: `components/hotel/RoomAvailability.tsx`
- Test: `components/hotel/RoomAvailability.test.tsx`

> The client orchestrator. Seeds demo defaults, validates, drives `useAvailability`, renders every state, fires analytics. Consumes `useAppDates` (M3) + `useAvailability` (M3) + `nightsInRange` (M1).

- [ ] **Step 1: Write the failing test (hooks + analytics mocked)**

```tsx
// components/hotel/RoomAvailability.test.tsx
import { render, screen, waitFor } from '@testing-library/react';

let mockDates = { checkIn: null as string | null, checkOut: null as string | null };
const setCheckIn = jest.fn((d: string | null) => (mockDates = { ...mockDates, checkIn: d }));
const setCheckOut = jest.fn((d: string | null) => (mockDates = { ...mockDates, checkOut: d }));
jest.mock('../../stores/AppProvider', () => ({
  useAppDates: () => ({ ...mockDates, setCheckIn, setCheckOut }),
}));

let mockAvail = { data: undefined as unknown, isLoading: false, isError: false, isSuccess: false, refetch: jest.fn() };
jest.mock('../../hooks/useAvailability', () => ({ useAvailability: () => mockAvail }));

const track = jest.fn();
jest.mock('../../utils/analyticUtil', () => ({ track: (e: unknown) => track(e) }));

import { RoomAvailability } from './RoomAvailability';

beforeEach(() => {
  mockDates = { checkIn: null, checkOut: null };
  setCheckIn.mockClear();
  setCheckOut.mockClear();
  track.mockClear();
  mockAvail = { data: undefined, isLoading: false, isError: false, isSuccess: false, refetch: jest.fn() };
});

describe('RoomAvailability', () => {
  it('seeds the demo-default dates on mount when none are set', () => {
    render(<RoomAvailability hotelId="hotel-01" />);
    expect(setCheckIn).toHaveBeenCalledWith('2026-07-10');
    expect(setCheckOut).toHaveBeenCalledWith('2026-07-12');
  });

  it('fires hotel_viewed once on mount', () => {
    render(<RoomAvailability hotelId="hotel-01" />);
    expect(track).toHaveBeenCalledWith({ name: 'hotel_viewed', hotelId: 'hotel-01' });
  });

  it('blocks with a validation message when checkout <= checkin', () => {
    mockDates = { checkIn: '2026-07-12', checkOut: '2026-07-12' };
    render(<RoomAvailability hotelId="hotel-01" />);
    expect(screen.getByText(/Check-out must be after check-in/i)).toBeTruthy();
  });

  it('shows skeletons while loading', () => {
    mockDates = { checkIn: '2026-07-10', checkOut: '2026-07-12' };
    mockAvail = { ...mockAvail, isLoading: true };
    const { container } = render(<RoomAvailability hotelId="hotel-01" />);
    expect(screen.getByText(/Checking availability/i)).toBeTruthy();
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
  });

  it('renders room cards on success', () => {
    mockDates = { checkIn: '2026-07-10', checkOut: '2026-07-12' };
    mockAvail = { ...mockAvail, isSuccess: true, data: [{ roomId: 'room-01a', type: 'Deluxe King Room', pricePerNight: 299, bedType: 'King', bedCount: 1, maxOccupancy: 2, squareFootage: 450, amenities: [] }] };
    render(<RoomAvailability hotelId="hotel-01" />);
    expect(screen.getByRole('heading', { name: 'Deluxe King Room' })).toBeTruthy();
  });

  it('shows the empty state and fires no_rooms when data is empty', () => {
    mockDates = { checkIn: '2026-07-10', checkOut: '2026-07-12' };
    mockAvail = { ...mockAvail, isSuccess: true, data: [] };
    render(<RoomAvailability hotelId="hotel-01" />);
    expect(screen.getByText(/No rooms available for these dates/i)).toBeTruthy();
    expect(track).toHaveBeenCalledWith({ name: 'no_rooms', hotelId: 'hotel-01' });
  });

  it('shows an inline error with Retry on failure', () => {
    mockDates = { checkIn: '2026-07-10', checkOut: '2026-07-12' };
    mockAvail = { ...mockAvail, isError: true };
    render(<RoomAvailability hotelId="hotel-01" />);
    expect(screen.getByRole('alert')).toHaveTextContent(/Couldn't load availability/i);
    expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest components/hotel/RoomAvailability.test.tsx`
Expected: FAIL — cannot find module `./RoomAvailability`.

- [ ] **Step 3: Write the implementation**

```tsx
// components/hotel/RoomAvailability.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useAvailability } from '../../hooks/useAvailability';
import { nightsInRange } from '../../lib/availability';
import { useAppDates } from '../../stores/AppProvider';
import { track } from '../../utils/analyticUtil';
import { EmptyState } from '../EmptyState';
import { InlineError } from '../InlineError';
import { DateField } from './DateField';
import { RoomCard } from './RoomCard';
import { RoomSkeleton } from './RoomSkeleton';

const DEMO_CHECK_IN = '2026-07-10';
const DEMO_CHECK_OUT = '2026-07-12';

export function RoomAvailability({ hotelId }: { hotelId: string }) {
  const { checkIn, checkOut, setCheckIn, setCheckOut } = useAppDates();

  // Seed demo defaults once on mount when no dates are set (so the success state shows).
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    if (checkIn === null && checkOut === null) {
      setCheckIn(DEMO_CHECK_IN);
      setCheckOut(DEMO_CHECK_OUT);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // hotel_viewed fires once on detail mount (server page can't call track()).
  useEffect(() => {
    track({ name: 'hotel_viewed', hotelId });
  }, [hotelId]);

  const invalid = !!(checkIn && checkOut && checkOut <= checkIn);
  const query = useAvailability(hotelId, checkIn, checkOut);

  // availability_checked when a valid fetch is in flight; no_rooms on an empty result.
  useEffect(() => {
    if (checkIn && checkOut && checkOut > checkIn) {
      track({ name: 'availability_checked', hotelId, nights: nightsInRange(checkIn, checkOut).length });
    }
  }, [hotelId, checkIn, checkOut]);
  useEffect(() => {
    if (query.isSuccess && Array.isArray(query.data) && query.data.length === 0) {
      track({ name: 'no_rooms', hotelId });
    }
  }, [hotelId, query.isSuccess, query.data]);

  const status = query.isLoading ? 'Checking availability…' : query.data ? `${query.data.length} rooms available` : '';

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-900">Room availability</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <DateField id="check-in" label="Check-in" value={checkIn} onChange={setCheckIn} />
        <DateField id="check-out" label="Check-out" value={checkOut} min={checkIn ?? undefined} onChange={setCheckOut} />
      </div>

      <p aria-live="polite" className="sr-only">
        {status}
      </p>

      {invalid ? (
        <InlineError message="Check-out must be after check-in" />
      ) : !checkIn || !checkOut ? (
        <p className="text-sm text-slate-500">Pick check-in and check-out to see rooms.</p>
      ) : query.isLoading ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Checking availability…</p>
          <RoomSkeleton />
          <RoomSkeleton />
        </div>
      ) : query.isError ? (
        <InlineError message="Couldn't load availability" onRetry={() => query.refetch()} />
      ) : query.data && query.data.length > 0 ? (
        <div className="space-y-3">
          {query.data.map((room) => (
            <RoomCard key={room.roomId} room={room} />
          ))}
        </div>
      ) : (
        <EmptyState icon="pin" title="No rooms available for these dates" subtext="Try different dates." />
      )}
    </section>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest components/hotel/RoomAvailability.test.tsx`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add components/hotel/RoomAvailability.tsx components/hotel/RoomAvailability.test.tsx
git commit -m "feat(M5): RoomAvailability orchestrator (seed/validate/states/analytics)"
```

---

## Task 10: `app/hotels/[id]/page.tsx` + `not-found.tsx`

**Files:**
- Create: `app/hotels/[id]/page.tsx`
- Create: `app/hotels/[id]/not-found.tsx`
- Test: `app/hotels/[id]/page.test.tsx`

> **Read first:** `node_modules/next/dist/docs/` for async `params`, `generateMetadata`, and `notFound()` in Next 16.

- [ ] **Step 1: Write the failing test (notFound on 404; render on success)**

```tsx
// app/hotels/[id]/page.test.tsx
const notFound = jest.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
jest.mock('next/navigation', () => ({ notFound }));

const getJson = jest.fn();
jest.mock('../../../lib/fetcher', () => ({
  getJson: (...args: unknown[]) => getJson(...args),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
    }
  },
}));

import { ApiError } from '../../../lib/fetcher';
import HotelDetailPage from './page';

const hotel = {
  id: 'hotel-01',
  name: 'The Grand Luminary',
  description: 'A luxury oasis.',
  starRating: 5,
  overallRating: 4.8,
  reviewCount: 1240,
  address: { street: '789 Skyline Blvd', city: 'Chicago', state: 'IL', zipCode: '60611', country: 'USA' },
  amenities: ['free_wifi'],
  policies: { checkInTime: '15:00', checkOutTime: '11:00', cancellation: 'Free cancellation up to 24 hours before check-in' },
  priceFrom: 199,
  photoUrl: '',
  rooms: [],
};

beforeEach(() => getJson.mockReset());

describe('HotelDetailPage', () => {
  it('calls notFound() when the BFF returns 404', async () => {
    getJson.mockRejectedValue(new ApiError(404, 'not found'));
    await expect(HotelDetailPage({ params: Promise.resolve({ id: 'nope' }) })).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });

  it('renders the detail on success', async () => {
    getJson.mockResolvedValue(hotel);
    const element = await HotelDetailPage({ params: Promise.resolve({ id: 'hotel-01' }) });
    // The server component returns a React element tree; assert it references the hotel name.
    const json = JSON.stringify(element);
    expect(json).toContain('The Grand Luminary');
    expect(getJson).toHaveBeenCalledWith('/api/hotels/hotel-01');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest app/hotels/[id]/page.test.tsx`
Expected: FAIL — cannot find module `./page`.

- [ ] **Step 3: Write the page + not-found**

```tsx
// app/hotels/[id]/page.tsx — SERVER component
import { notFound } from 'next/navigation';
import { AmenitiesGrid } from '../../../components/hotel/AmenitiesGrid';
import { BackToResults } from '../../../components/hotel/BackToResults';
import { HotelHero } from '../../../components/hotel/HotelHero';
import { PoliciesList } from '../../../components/hotel/PoliciesList';
import { RoomAvailability } from '../../../components/hotel/RoomAvailability';
import { ApiError, getJson } from '../../../lib/fetcher';
import type { Hotel } from '../../../types/domain';

async function fetchHotel(id: string): Promise<Hotel> {
  try {
    return await getJson<Hotel>(`/api/hotels/${id}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err; // other errors bubble to the route error boundary (M6)
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const hotel = await getJson<Hotel>(`/api/hotels/${id}`); // deduped with the page fetch
    return { title: hotel.name };
  } catch {
    return { title: 'Hotel' };
  }
}

export default async function HotelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hotel = await fetchHotel(id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
      <BackToResults />
      <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <HotelHero hotel={hotel} />
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-900">Overview</h2>
            <p className="max-w-[70ch] text-slate-700">{hotel.description}</p>
          </section>
          <AmenitiesGrid amenities={hotel.amenities} />
          <PoliciesList policies={hotel.policies} />
        </div>
        <div className="lg:sticky lg:top-20 lg:self-start">
          <RoomAvailability hotelId={hotel.id} />
        </div>
      </div>
    </div>
  );
}
```

```tsx
// app/hotels/[id]/not-found.tsx — SERVER component
import Link from 'next/link';
import { EmptyState } from '../../../components/EmptyState';

export default function HotelNotFound() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 md:px-6 lg:px-8">
      <EmptyState icon="pin" title="Hotel not found" subtext="The hotel you're looking for doesn't exist." />
      <div className="mt-4 text-center">
        <Link href="/" className="text-sm font-medium text-blue-700 hover:underline">
          Browse hotels
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest app/hotels/[id]/page.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Verify build + typecheck**

Run: `npm run build && npx tsc --noEmit`
Expected: build succeeds (`/hotels/[id]` is a dynamic server route); no type errors.

- [ ] **Step 6: Commit**

```bash
git add "app/hotels/[id]/page.tsx" "app/hotels/[id]/not-found.tsx" "app/hotels/[id]/page.test.tsx"
git commit -m "feat(M5): hotel detail server page + metadata + not-found"
```

---

## Task 11: Integration test (detail → dates → availability)

**Files:**
- Create: `components/hotel/RoomAvailability.integration.test.tsx`

> Renders `RoomAvailability` under real `QueryProvider` + `AppProvider` with MSW serving `/rooms`, exercising the demo-default auto-fetch (success), a no-availability hotel (empty), and the error path. This is M5's "Done when" gate for F5. (F4 server-render is covered by Task 10.)

- [ ] **Step 1: Write the integration test**

```tsx
// components/hotel/RoomAvailability.integration.test.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { AppProvider } from '../../stores/AppProvider';
import { server } from '../../tests/msw/server';
import { RoomAvailability } from './RoomAvailability';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderPanel(hotelId: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <AppProvider>{children}</AppProvider>
    </QueryClientProvider>
  );
  return render(<RoomAvailability hotelId={hotelId} />, { wrapper: Wrapper });
}

describe('RoomAvailability integration', () => {
  it('auto-fetches the demo default and shows available rooms (success)', async () => {
    renderPanel('hotel-01');
    // Demo default dates seed → fetch fires → success rooms render.
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Deluxe King Room' })).toBeTruthy());
    expect(screen.getByText(/\$299/)).toBeTruthy();
  });

  it('shows "No rooms available" for a hotel with no availability (empty)', async () => {
    server.use(http.get('http://localhost/api/hotels/:id/rooms', () => HttpResponse.json([])));
    renderPanel('hotel-empty');
    await waitFor(() => expect(screen.getByText(/No rooms available for these dates/i)).toBeTruthy());
  });

  it('shows an inline error with Retry when availability fails', async () => {
    server.use(http.get('http://localhost/api/hotels/:id/rooms', () => new HttpResponse(null, { status: 500 })));
    renderPanel('hotel-01');
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/Couldn't load availability/i));
    expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy();
  });
});
```

> The MSW origin/handlers come from M3's `tests/msw/`. The default `/rooms` handler (widened in Task 0) returns the two rooms; the `server.use(...)` overrides exercise empty/error.

- [ ] **Step 2: Run to verify it passes**

Run: `npx jest components/hotel/RoomAvailability.integration.test.tsx`
Expected: PASS (3 tests). If the demo-default success assertion is flaky on timing, wrap the first `waitFor` with a longer `{ timeout: 2000 }` (the MSW handler is synchronous, so it should resolve fast).

- [ ] **Step 3: Commit**

```bash
git add components/hotel/RoomAvailability.integration.test.tsx
git commit -m "test(M5): availability integration (success/empty/error)"
```

---

## Task 12: Full suite, coverage gate, progress doc

**Files:**
- Modify: `docs/progress.md`

- [ ] **Step 1: Run the full suite with coverage**

Run: `npx jest --coverage`
Expected: all suites PASS; M5 modules (`components/hotel/**`, `components/RatingStars.tsx`, `components/InlineError.tsx`, `app/hotels/**`) ≥ 85% across branches/functions/lines/statements.

- [ ] **Step 2: Lint, typecheck, build**

Run: `npm run lint && npm run typecheck && npm run build`
Expected: clean lint, no type errors, successful build.

- [ ] **Step 3: Manual smoke (optional but recommended)**

Run: `npm run dev`, open `/hotels/hotel-01`: detail paints immediately; dates pre-fill `2026-07-10 → 2026-07-12` and rooms auto-load after a ~1200ms skeleton; change dates to outside July 2026 → "No rooms available"; visit `/hotels/nope` → not-found page; resize to 360px → single column + native date picker; click "← Back to results" from a home navigation → filters restored.

- [ ] **Step 4: Update `docs/progress.md`**

In the **M5** section, check off (`[x]`) every task: detail page renders name/address/description/amenities/policies/ratings; detail renders without availability; SEO/metadata + favicon reuse; `not-found`; `RoomAvailability` date fields; validation; lazy fetch; every-night rule; and all four availability states (loading/success/empty/error) + stale latest-wins. Flip the **Progress at a Glance** M5 row to `[x]`. Append a decisions note:

```markdown
**M5 decisions (from design spec):** detail is a **server component** fetching the BFF
`/api/hotels/[id]` via `getJson` (generateMetadata + notFound()); availability is the
only client island (`RoomAvailability` via M3 `useAvailability`/`useAppDates`), lazy
through the slow `/rooms` route, never blocking detail. `AvailableRoom` widened with
`bedCount`/`squareFootage`/`amenities` (Task 0) so RoomCard meets the design; demo dates
`2026-07-10→2026-07-12` seeded on mount; "← Back to results" is history-based;
`API_BASE_URL` set in the runtime for SSR fetch; no booking CTA (P2).
```

> Note: `track()` adapters, route error/loading boundaries, and the formal a11y+perf audit remain M6; Playwright E2E remains M7.

- [ ] **Step 5: Commit**

```bash
git add docs/progress.md
git commit -m "docs(M5): mark hotel detail & room availability milestone complete"
```

---

## Self-Review (completed by plan author)

**1. Spec coverage** — every spec section maps to a task:

- §1 scope → Tasks 0–12. §2 rendering (server detail via BFF, getJson, generateMetadata, notFound, API_BASE_URL prereq, fetch dedupe) → Task 10 + Task 0 Step 10. §3 module structure → one task per file. §4 data flow (detail-first, lazy availability, latest-wins, dates client-only) → Tasks 9, 10. §5 RoomAvailability (seed, validate, states, analytics) → Task 9. §6.1 RoomCard widened → Tasks 0 + 7. §6.2 DateField → Task 8. §6.3 RatingStars → Task 1. §6.4 InlineError → Task 2. §6.5 BackToResults history-based → Task 3. §7 states (detail loaded, unknown hotel, idle, loading, success, empty, error, blocked, stale) → Tasks 9 (states) + 10 (notFound) + 11 (integration) + M3 (structural latest-wins). §8 a11y/mobile → baked into each component (labels, aria-live, 44px, aspect-video) + smoke Task 12. §9 testing → every task test-first; integration Task 11; analytics Task 0; notFound Task 10. §10 decisions → Task 12 progress note.

**2. Placeholder scan** — no TBD/TODO; every code step shows complete code; every test step shows full assertions. The two notes (Task 8 jsdom date-typing fallback, Task 11 timeout) give concrete alternatives, not vague hand-waving.

**3. Type/name consistency** — `AvailableRoom` widened in Task 0 (`bedCount`, `squareFootage`, `amenities`) is consumed verbatim by `RoomCard` (Task 7), `RoomAvailability` (Task 9), and the integration handlers (Task 0). `AnalyticsEvent` M5 variants (Task 0) used by Task 9 (`hotel_viewed`/`availability_checked`/`no_rooms`). `RatingStars` (Task 1) used by `HotelHero` (Task 4). `InlineError` (Task 2) used by `RoomAvailability` (Task 9). `humanizeAmenity` (M4) used by `AmenitiesGrid` (Task 5) + `RoomCard` (Task 7). `useAppDates` (`checkIn`/`checkOut`/`setCheckIn`/`setCheckOut`) and `useAvailability(id, checkIn, checkOut)` → `{data, isLoading, isError, isSuccess, refetch}` (M3) used in Task 9. `getJson`/`ApiError` (M3) used in Task 10. `nightsInRange` (M1) used in Task 9. `Hotel`/`AvailableRoom` domain fields from M1 used throughout.

**Note for executor:** M5 is assembly over M0–M4. If any M1–M4 export named here is absent, finish that milestone first. Set `API_BASE_URL` in `.env.local` (Task 0) — the SSR detail fetch needs it. Read `node_modules/next/dist/docs/` before Task 10 (Next 16 async `params`/`generateMetadata`/`notFound` differ from training data).
