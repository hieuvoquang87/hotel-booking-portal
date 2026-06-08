# M2 — BFF API Routes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the four `/api/*` GET route handlers that are the client's only
data surface — thin adapters over M1's services, mirroring the REST contract —
plus a small HTTP-layer toolkit (`respond`, `logger`, `withRoute`) and integration
tests for every happy + error branch.

**Architecture:** Framework-agnostic handlers (Web `Request`/`Response.json`, no
`next/server`). Each route file is ~10 lines: parse params → call an M1 service →
`ok(...)`. `withRoute` centralizes timing, typed-error→HTTP mapping, and structured
logging. Validation (rooms dates) and the top-rated default are the only logic in
routes; everything else is delegated to `lib/`/`services/`. TDD throughout; the
≥85% coverage gate (from M0) applies.

**Tech Stack:** Next.js App Router (15+, async route `params`) + TypeScript
(strict). Jest route tests run in the **node** environment. Path alias `@/*` → repo
root (provided by M0).

**Spec:** `docs/superpowers/specs/2026-06-08-m2-bff-api-routes-design.md`

**Conventions for every task:** co-locate `*.test.ts` next to source; run a single
suite with `npx jest <path>`; commit after each green task (conventional-commit
prefixes). Route test files start with `/** @jest-environment node */`.

---

## Preconditions (M0 + M1)

M2 is blocked on:

- **M0** — a Next.js App Router project boots, Jest is configured, `@/*` resolves
  to the repo root, and `services/mock/hotels.json` is in place.
- **M1** — `@/services/hotelService` exports `getLocations`,
  `getHotelsByLocation`, `getHotelById`; `@/services/availabilityService` exports
  `checkAvailability` (honoring `AVAILABILITY_LATENCY_MS`); `@/lib/sort` exports
  `sortHotels`; `@/types/domain` exports `Hotel`, `Location`, `AvailableRoom`,
  `InvalidDateRangeError`, `HotelNotFoundError`.

If either is incomplete, finish it first. **Before writing routes, confirm the
Next 15 route-handler signature** (async `ctx.params`) against current Next docs
via context7 — adjust the `RouteContext` type in Task 3 if the framework has moved.

---

## File Map

| File | Responsibility |
| --- | --- |
| `tests/setupApiEnv.ts` | Jest `setupFiles`: force `AVAILABILITY_LATENCY_MS=0` in tests |
| `app/api/_lib/respond.ts` | `ok(data, init?)`, `fail(status, code, message)` |
| `app/api/_lib/logger.ts` | `logRequest(entry)` — structured JSON log line |
| `app/api/_lib/dates.ts` | `isCalendarDate(value)` — pure `YYYY-MM-DD` validity check |
| `app/api/_lib/handle.ts` | `withRoute(name, handler)` + typed-error→HTTP map |
| `app/api/locations/route.ts` | `GET` → `getLocations()` |
| `app/api/hotels/route.ts` | `GET` → `getHotelsByLocation` / top-rated default |
| `app/api/hotels/[id]/route.ts` | `GET` → `getHotelById` (404 on null) |
| `app/api/hotels/[id]/rooms/route.ts` | `GET` → validate dates → `checkAvailability` |
| `docs/progress.md` | Check off M2 items |

---

## Task 0: Test env — zero availability latency

**Files:** Create `tests/setupApiEnv.ts`; modify `jest.config.js`.

- [ ] **Step 1:** Create `tests/setupApiEnv.ts`

```ts
// tests/setupApiEnv.ts
// Route tests hit the real availabilityService over HTTP and cannot pass delayMs,
// so neutralize the simulated latency for the whole test run.
process.env.AVAILABILITY_LATENCY_MS = '0';
```

- [ ] **Step 2:** Add it to Jest (the service reads the env at module load, so this
      must run before any import). In `jest.config.js`, add:

```js
setupFiles: ['<rootDir>/tests/setupApiEnv.ts'],
```

- [ ] **Step 3:** Verify the suite still runs: `npx jest --passWithNoTests`
      Expected: exits 0.

- [ ] **Step 4:** Commit

```bash
git add tests/setupApiEnv.ts jest.config.js
git commit -m "test(api): zero availability latency in the test environment"
```

---

## Task 1: `app/api/_lib/respond.ts` — JSON helpers

**Files:** Create `app/api/_lib/respond.ts`; Test `app/api/_lib/respond.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
/** @jest-environment node */
// app/api/_lib/respond.test.ts
import { fail, ok } from './respond';

describe('ok', () => {
  it('returns a 200 JSON response with the data', async () => {
    const res = ok([{ id: 'hotel-01' }]);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/application\/json/);
    expect(await res.json()).toEqual([{ id: 'hotel-01' }]);
  });
  it('passes through init (status + headers)', () => {
    const res = ok({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
    expect(res.headers.get('cache-control')).toBe('no-store');
  });
});

describe('fail', () => {
  it('returns the given status and an { error: { code, message } } body', async () => {
    const res = fail(404, 'HOTEL_NOT_FOUND', 'hotel not found: hotel-99');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({
      error: { code: 'HOTEL_NOT_FOUND', message: 'hotel not found: hotel-99' },
    });
  });
});
```

- [ ] **Step 2: Run to verify it fails** — `npx jest app/api/_lib/respond.test.ts`
      Expected: FAIL — cannot find module `./respond`.

- [ ] **Step 3: Implement**

```ts
// app/api/_lib/respond.ts
export function ok<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, init);
}

export function fail(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}
```

- [ ] **Step 4: Run to verify it passes** — Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/_lib/respond.ts app/api/_lib/respond.test.ts
git commit -m "feat(api): JSON ok/fail response helpers"
```

---

## Task 2: `app/api/_lib/logger.ts` — structured request log

**Files:** Create `app/api/_lib/logger.ts`; Test `app/api/_lib/logger.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
/** @jest-environment node */
// app/api/_lib/logger.test.ts
import { logRequest } from './logger';

describe('logRequest', () => {
  afterEach(() => jest.restoreAllMocks());

  it('logs one JSON line with the request fields on success', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    logRequest({ route: 'GET /api/locations', method: 'GET', status: 200, durationMs: 3, outcome: 'ok' });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(spy.mock.calls[0][0])).toMatchObject({
      route: 'GET /api/locations', method: 'GET', status: 200, outcome: 'ok',
    });
  });

  it('uses console.error and includes the error name/message for 5xx', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    logRequest({ route: 'GET /api/x', method: 'GET', status: 500, durationMs: 1, outcome: 'error', error: new Error('boom') });
    expect(spy).toHaveBeenCalledTimes(1);
    const line = JSON.parse(spy.mock.calls[0][0]);
    expect(line.outcome).toBe('error');
    expect(line.error).toMatchObject({ name: 'Error', message: 'boom' });
  });
});
```

- [ ] **Step 2: Run to verify it fails** — Expected: FAIL — cannot find `./logger`.

- [ ] **Step 3: Implement**

```ts
// app/api/_lib/logger.ts
export interface LogEntry {
  route: string;
  method: string;
  status: number;
  durationMs: number;
  outcome: 'ok' | 'error';
  error?: unknown;
}

export function logRequest(entry: LogEntry): void {
  const { error, ...rest } = entry;
  const line = JSON.stringify({
    ...rest,
    ...(error !== undefined
      ? { error: error instanceof Error ? { name: error.name, message: error.message } : String(error) }
      : {}),
  });
  // 5xx: full error (incl. stack) server-side; never returned to the client.
  if (entry.status >= 500) {
    console.error(line, error instanceof Error ? error.stack : '');
  } else {
    console.log(line);
  }
}
```

- [ ] **Step 4: Run to verify it passes** — Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/_lib/logger.ts app/api/_lib/logger.test.ts
git commit -m "feat(api): structured per-request logger"
```

---

## Task 3: `app/api/_lib/handle.ts` — withRoute + error map

**Files:** Create `app/api/_lib/handle.ts`; Test `app/api/_lib/handle.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
/** @jest-environment node */
// app/api/_lib/handle.test.ts
import { HotelNotFoundError, InvalidDateRangeError } from '@/types/domain';
import { ok } from './respond';
import { withRoute } from './handle';

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const req = new Request('http://test/api/x');
const ctx = { params: Promise.resolve({ id: 'hotel-01' }) };

describe('withRoute', () => {
  it('returns the handler response and logs an ok outcome', async () => {
    const handler = withRoute('GET /api/x', async () => ok({ hi: true }));
    const res = await handler(req, ctx);
    expect(res.status).toBe(200);
    expect(console.log).toHaveBeenCalledTimes(1);
  });

  it('forwards ctx.params to the handler', async () => {
    const handler = withRoute('GET /api/x', async (_r, c) => ok(await c.params));
    expect(await (await handler(req, ctx)).json()).toEqual({ id: 'hotel-01' });
  });

  it('maps InvalidDateRangeError to 400 INVALID_DATE_RANGE', async () => {
    const handler = withRoute('GET /api/x', async () => { throw new InvalidDateRangeError(); });
    const res = await handler(req, ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('INVALID_DATE_RANGE');
  });

  it('maps HotelNotFoundError to 404 HOTEL_NOT_FOUND', async () => {
    const handler = withRoute('GET /api/x', async () => { throw new HotelNotFoundError('hotel-99'); });
    expect((await handler(req, ctx)).status).toBe(404);
  });

  it('maps an unexpected throw to a generic 500 (no leaked message) and logs error', async () => {
    const handler = withRoute('GET /api/x', async () => { throw new Error('db exploded'); });
    const res = await handler(req, ctx);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: { code: 'INTERNAL', message: 'Internal server error' } });
    expect(console.error).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — Expected: FAIL — cannot find `./handle`.

- [ ] **Step 3: Implement**

```ts
// app/api/_lib/handle.ts
import { HotelNotFoundError, InvalidDateRangeError } from '@/types/domain';
import { logRequest } from './logger';
import { fail } from './respond';

export type RouteContext = { params: Promise<Record<string, string>> };
export type RouteHandler = (req: Request, ctx: RouteContext) => Promise<Response>;

function mapError(error: unknown): Response {
  if (error instanceof InvalidDateRangeError) return fail(400, 'INVALID_DATE_RANGE', error.message);
  if (error instanceof HotelNotFoundError) return fail(404, 'HOTEL_NOT_FOUND', error.message);
  return fail(500, 'INTERNAL', 'Internal server error');
}

export function withRoute(name: string, handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    const start = Date.now();
    try {
      const res = await handler(req, ctx);
      logRequest({ route: name, method: req.method, status: res.status, durationMs: Date.now() - start, outcome: 'ok' });
      return res;
    } catch (error) {
      const res = mapError(error);
      logRequest({ route: name, method: req.method, status: res.status, durationMs: Date.now() - start, outcome: 'error', error });
      return res;
    }
  };
}
```

- [ ] **Step 4: Run to verify it passes** — Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/_lib/handle.ts app/api/_lib/handle.test.ts
git commit -m "feat(api): withRoute wrapper with typed-error to HTTP mapping"
```

---

## Task 4: `app/api/_lib/dates.ts` — calendar-date validation

**Files:** Create `app/api/_lib/dates.ts`; Test `app/api/_lib/dates.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// app/api/_lib/dates.test.ts
import { isCalendarDate } from './dates';

describe('isCalendarDate', () => {
  it.each(['2026-07-10', '2026-02-28', '2024-02-29'])('accepts real date %s', (d) => {
    expect(isCalendarDate(d)).toBe(true);
  });
  it.each([
    '2026-13-01', // bad month
    '2026-02-30', // not a real day (would roll to March)
    '2026-7-10',  // not zero-padded
    '07-10-2026', // wrong order
    'tomorrow',
    '',
  ])('rejects %s', (d) => {
    expect(isCalendarDate(d)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails** — Expected: FAIL — cannot find `./dates`.

- [ ] **Step 3: Implement**

```ts
// app/api/_lib/dates.ts
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// True only for a real YYYY-MM-DD calendar date. Rejects shape errors AND
// non-days like 2026-02-30 (new Date rolls those over silently).
export function isCalendarDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
```

- [ ] **Step 4: Run to verify it passes** — Expected: PASS (9 cases).

- [ ] **Step 5: Commit**

```bash
git add app/api/_lib/dates.ts app/api/_lib/dates.test.ts
git commit -m "feat(api): strict calendar-date validation helper"
```

---

## Task 5: `GET /api/locations`

**Files:** Create `app/api/locations/route.ts`; Test `app/api/locations/route.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
/** @jest-environment node */
// app/api/locations/route.test.ts
import { GET } from './route';

beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

const ctx = { params: Promise.resolve({}) };

describe('GET /api/locations', () => {
  it('returns 200 with the 10 distinct locations', async () => {
    const res = await GET(new Request('http://test/api/locations'), ctx);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(10);
    expect(body).toContainEqual(
      expect.objectContaining({ city: 'New York', country: 'USA', citySlug: 'new-york' }),
    );
  });

  it('sets a cacheable Cache-Control header', async () => {
    const res = await GET(new Request('http://test/api/locations'), ctx);
    expect(res.headers.get('cache-control')).toContain('max-age');
  });
});
```

- [ ] **Step 2: Run to verify it fails** — Expected: FAIL — cannot find `./route`.

- [ ] **Step 3: Implement**

```ts
// app/api/locations/route.ts
import { withRoute } from '@/app/api/_lib/handle';
import { ok } from '@/app/api/_lib/respond';
import { getLocations } from '@/services/hotelService';

const CACHE = 'public, max-age=3600, stale-while-revalidate=86400';

export const GET = withRoute('GET /api/locations', async () =>
  ok(getLocations(), { headers: { 'Cache-Control': CACHE } }),
);
```

- [ ] **Step 4: Run to verify it passes** — Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/locations/route.ts app/api/locations/route.test.ts
git commit -m "feat(api): GET /api/locations route"
```

---

## Task 6: `GET /api/hotels` (location + top-rated default)

**Files:** Create `app/api/hotels/route.ts`; Test `app/api/hotels/route.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
/** @jest-environment node */
// app/api/hotels/route.test.ts
import { GET } from './route';

beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

const ctx = { params: Promise.resolve({}) };
const call = (qs = '') => GET(new Request(`http://test/api/hotels${qs}`), ctx);

describe('GET /api/hotels', () => {
  it('returns the 20 USA hotels for ?country=usa', async () => {
    const res = await call('?country=usa');
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveLength(20);
  });

  it('narrows to 4 hotels for ?city=new-york', async () => {
    expect(await (await call('?city=new-york')).json()).toHaveLength(4);
  });

  it('returns [] for an unknown slug', async () => {
    expect(await (await call('?city=atlantis')).json()).toEqual([]);
  });

  it('with no params returns the top 10 hotels by overallRating', async () => {
    const body = await (await call()).json();
    expect(body).toHaveLength(10);
    const ratings = body.map((h: { overallRating: number }) => h.overallRating);
    expect(ratings).toEqual([...ratings].sort((a, b) => b - a)); // descending
  });

  it('ignores star_rating/price_range params (no 400, still location-filtered)', async () => {
    const res = await call('?country=usa&star_rating=5&price_range=100-200');
    expect(res.status).toBe(200);
    expect(await res.json()).toHaveLength(20); // params ignored, not applied
  });
});
```

- [ ] **Step 2: Run to verify it fails** — Expected: FAIL — cannot find `./route`.

- [ ] **Step 3: Implement**

```ts
// app/api/hotels/route.ts
import { withRoute } from '@/app/api/_lib/handle';
import { ok } from '@/app/api/_lib/respond';
import { sortHotels } from '@/lib/sort';
import { getHotelsByLocation } from '@/services/hotelService';

const CACHE = 'public, max-age=300, stale-while-revalidate=3600';
const DEFAULT_HOTELS_LIMIT = 10;

export const GET = withRoute('GET /api/hotels', async (req) => {
  const { searchParams } = new URL(req.url);
  const country = searchParams.get('country') ?? undefined;
  const city = searchParams.get('city') ?? undefined;

  // No location → a "featured" default: top-rated hotels, never the full catalog.
  if (!country && !city) {
    const featured = sortHotels(getHotelsByLocation({}), 'rating').slice(0, DEFAULT_HOTELS_LIMIT);
    return ok(featured, { headers: { 'Cache-Control': CACHE } });
  }

  // star_rating / price_range are accepted but ignored in P1 (client refines).
  return ok(getHotelsByLocation({ country, city }), { headers: { 'Cache-Control': CACHE } });
});
```

- [ ] **Step 4: Run to verify it passes** — Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/hotels/route.ts app/api/hotels/route.test.ts
git commit -m "feat(api): GET /api/hotels with location filter and top-rated default"
```

---

## Task 7: `GET /api/hotels/[id]`

**Files:** Create `app/api/hotels/[id]/route.ts`; Test `app/api/hotels/[id]/route.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
/** @jest-environment node */
// app/api/hotels/[id]/route.test.ts
import { GET } from './route';

beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

const call = (id: string) =>
  GET(new Request(`http://test/api/hotels/${id}`), { params: Promise.resolve({ id }) });

describe('GET /api/hotels/[id]', () => {
  it('returns 200 with the hotel for a known id', async () => {
    const res = await call('hotel-01');
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe('hotel-01');
  });

  it('returns 404 HOTEL_NOT_FOUND for an unknown id', async () => {
    const res = await call('hotel-999');
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe('HOTEL_NOT_FOUND');
  });
});
```

- [ ] **Step 2: Run to verify it fails** — Expected: FAIL — cannot find `./route`.

- [ ] **Step 3: Implement**

```ts
// app/api/hotels/[id]/route.ts
import { withRoute } from '@/app/api/_lib/handle';
import { fail, ok } from '@/app/api/_lib/respond';
import { getHotelById } from '@/services/hotelService';

const CACHE = 'public, max-age=300, stale-while-revalidate=3600';

export const GET = withRoute('GET /api/hotels/[id]', async (_req, ctx) => {
  const { id } = await ctx.params;
  const hotel = getHotelById(id);
  if (!hotel) return fail(404, 'HOTEL_NOT_FOUND', `hotel not found: ${id}`);
  return ok(hotel, { headers: { 'Cache-Control': CACHE } });
});
```

- [ ] **Step 4: Run to verify it passes** — Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add "app/api/hotels/[id]/route.ts" "app/api/hotels/[id]/route.test.ts"
git commit -m "feat(api): GET /api/hotels/[id] route with 404 on unknown id"
```

---

## Task 8: `GET /api/hotels/[id]/rooms`

**Files:** Create `app/api/hotels/[id]/rooms/route.ts`; Test `app/api/hotels/[id]/rooms/route.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
/** @jest-environment node */
// app/api/hotels/[id]/rooms/route.test.ts
import { GET } from './route';

beforeEach(() => jest.spyOn(console, 'log').mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

const call = (id: string, qs = '') =>
  GET(new Request(`http://test/api/hotels/${id}/rooms${qs}`), { params: Promise.resolve({ id }) });

describe('GET /api/hotels/[id]/rooms', () => {
  it('returns only rooms available every night in range', async () => {
    const res = await call('hotel-01', '?check_in=2026-07-10&check_out=2026-07-13');
    expect(res.status).toBe(200);
    expect((await res.json()).map((r: { roomId: string }) => r.roomId)).toEqual(['room-01a']);
  });

  it('returns [] for a no-availability hotel', async () => {
    const res = await call('hotel-04', '?check_in=2026-07-10&check_out=2026-07-11');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('returns [] for out-of-window dates', async () => {
    const res = await call('hotel-01', '?check_in=2026-08-01&check_out=2026-08-02');
    expect(await res.json()).toEqual([]);
  });

  it('400 MISSING_DATES when a date is absent', async () => {
    const res = await call('hotel-01', '?check_in=2026-07-10');
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('MISSING_DATES');
  });

  it('400 INVALID_DATE for a non-calendar date', async () => {
    const res = await call('hotel-01', '?check_in=2026-02-30&check_out=2026-07-13');
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('INVALID_DATE');
  });

  it('400 INVALID_DATE_RANGE when checkout <= check-in', async () => {
    const res = await call('hotel-01', '?check_in=2026-07-12&check_out=2026-07-12');
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('INVALID_DATE_RANGE');
  });

  it('404 HOTEL_NOT_FOUND for an unknown id with valid dates', async () => {
    const res = await call('hotel-999', '?check_in=2026-07-10&check_out=2026-07-11');
    expect(res.status).toBe(404);
  });

  it('date validation precedes id lookup (bad dates + unknown id → 400)', async () => {
    const res = await call('hotel-999', '?check_in=2026-07-10'); // missing check_out
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('MISSING_DATES');
  });

  it('marks the response no-store', async () => {
    const res = await call('hotel-01', '?check_in=2026-07-10&check_out=2026-07-11');
    expect(res.headers.get('cache-control')).toBe('no-store');
  });
});
```

- [ ] **Step 2: Run to verify it fails** — Expected: FAIL — cannot find `./route`.

- [ ] **Step 3: Implement**

```ts
// app/api/hotels/[id]/rooms/route.ts
import { isCalendarDate } from '@/app/api/_lib/dates';
import { withRoute } from '@/app/api/_lib/handle';
import { fail, ok } from '@/app/api/_lib/respond';
import { checkAvailability } from '@/services/availabilityService';

export const GET = withRoute('GET /api/hotels/[id]/rooms', async (req, ctx) => {
  const { id } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const checkIn = searchParams.get('check_in');
  const checkOut = searchParams.get('check_out');

  // Validate presence + format BEFORE any service call (no wasted latency).
  if (!checkIn || !checkOut) return fail(400, 'MISSING_DATES', 'check_in and check_out are required');
  if (!isCalendarDate(checkIn) || !isCalendarDate(checkOut)) {
    return fail(400, 'INVALID_DATE', 'dates must be valid YYYY-MM-DD');
  }

  // Range (checkOut > checkIn) and unknown-id are the service's guards →
  // surfaced as 400 INVALID_DATE_RANGE / 404 HOTEL_NOT_FOUND by withRoute.
  const rooms = await checkAvailability(id, checkIn, checkOut);
  return ok(rooms, { headers: { 'Cache-Control': 'no-store' } });
});
```

- [ ] **Step 4: Run to verify it passes** — Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add "app/api/hotels/[id]/rooms/route.ts" "app/api/hotels/[id]/rooms/route.test.ts"
git commit -m "feat(api): GET /api/hotels/[id]/rooms with date validation"
```

---

## Task 9: Full suite, coverage gate, typecheck, progress doc

**Files:** Modify `docs/progress.md`.

- [ ] **Step 1:** Run the whole suite with coverage — `npx jest --coverage`
      Expected: all suites PASS; `app/api/**` ≥ 85% on branches/functions/lines/statements.

- [ ] **Step 2:** Type check — `npx tsc --noEmit` — Expected: no errors.

- [ ] **Step 3:** Update `docs/progress.md` — check off all M2 items (`[x]`):
      the four routes, status codes, structured API logs, integration tests, and the
      "Done when" line. Note in the M2 section the two resolved decisions: filtering
      is **location-only** (star/price ignored), and a paramless `/api/hotels`
      returns the **top 10 by rating**.

- [ ] **Step 4:** Commit

```bash
git add docs/progress.md
git commit -m "docs: mark M2 (BFF API routes) complete"
```

---

## Self-Review (completed by plan author)

**1. Spec coverage** — every spec section maps to a task: §2.1 → Task 5; §2.2 →
Task 6 (incl. ignored params + top-rated default); §2.3 → Task 7; §2.4 + §4 → Task
8 (validation order tested explicitly); §3 structure → Tasks 1–8; §5 envelope +
`withRoute` + error map → Tasks 1, 3; §5.3 logger → Task 2; §6 caching → asserted
in Tasks 5/6/8; §7 testing (incl. the 500 branch and log spies) → Tasks 3, 5–8;
≥85% gate → Task 9.

**2. Placeholder scan** — no TBD/TODO; every step shows complete code and full
assertions.

**3. Type/name consistency** — `ok`/`fail` (Task 1), `logRequest`/`LogEntry`
(Task 2), `withRoute`/`RouteContext`/`RouteHandler` (Task 3), `isCalendarDate`
(Task 4) are defined once and imported verbatim after. Routes consume M1's
`getLocations`/`getHotelsByLocation`/`getHotelById`/`checkAvailability`/`sortHotels`
and the typed errors exactly as the M1 spec defines them. Error codes
(`HOTEL_NOT_FOUND`, `MISSING_DATES`, `INVALID_DATE`, `INVALID_DATE_RANGE`,
`INTERNAL`) match the spec §5 table.

**4. Seed facts** — verified against the seed: 40 hotels, USA = 20, New York = 4,
no-availability `hotel-04`, window `2026-07-10 → 07-14`, hotel-01 `room-01a` covers
07-10..12 (so a 07-10→07-13 stay yields only `room-01a`).

**Note for executor:** confirm the Next 15 route-handler `ctx.params` Promise
signature (context7) before Task 3; if M0 scaffolded `@/*` to `src/`, adjust the
import prefix. Route test files must keep the `/** @jest-environment node */`
docblock so `Response.json` and global `Request` resolve in Node.
