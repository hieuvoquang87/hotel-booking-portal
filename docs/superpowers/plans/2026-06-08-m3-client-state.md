# M3 — Client State & Data Hooks — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the client state layer for Phase 1 — a React Query provider, a dates-only context, a hand-rolled URL search-params hook, a typed fetch wrapper, and the four `use*` hooks (`useLocations`, `useHotels`, `useFilteredHotels`, `useAvailability`) — so the M4/M5 UI consumes cached, correctly-keyed data and shareable URL state without touching `fetch` or `/api/*` directly.

**Architecture:** Client state is split three ways — the **URL** owns `country, city, stars, min, max, sort, page`; a small **`AppProvider`** owns the manual check-in/out dates; **React Query** owns server responses keyed by params. `useFilteredHotels` is a pure composition of M1's `lib/` functions over the loaded subset. Server hooks fetch through one `lib/fetcher.getJson` wrapper that throws a typed `ApiError`. Latest-wins on availability is structural (RQ keying), not manual cancellation. TDD throughout; ≥85% coverage gate.

**Tech Stack:** Next.js (App Router) + TypeScript (strict), `@tanstack/react-query`, Jest + `next/jest` (jsdom env), `@testing-library/react`, MSW. No `nuqs` (URL state is hand-rolled).

**Spec:** `docs/superpowers/specs/2026-06-08-m3-client-state-design.md`

**Conventions for every task:** run tests with `npx jest <path>`; co-locate `*.test.ts(x)` next to source; relative imports (`../lib/...`, `../types/...`) matching M1; commit after each green task with conventional-commit prefixes.

**Assumes M0–M2 are done:** Next + TS + Tailwind, `@tanstack/react-query`, Jest/RTL/MSW, M1's `types/domain.ts` + `lib/{filters,sort,paginate}.ts` + `tests/fixtures.ts`, and M2's four `/api/*` routes. Task 0 installs/configures only what may be missing.

---

## File Map

| File                                | Responsibility                                                          |
| ----------------------------------- | ----------------------------------------------------------------------- |
| `jest.config.js`                    | Switch to `next/jest`, jsdom env, add `hooks/`+`stores/` to coverage (Task 0) |
| `lib/fetcher.ts`                    | `ApiError`, `getJson<T>` — typed fetch, throws on non-2xx               |
| `stores/AppProvider.tsx`            | `AppProvider`, `useAppDates()` — check-in/out dates context             |
| `stores/QueryProvider.tsx`          | `makeQueryClient`, `QueryProvider` — RQ client + provider               |
| `hooks/useSearchParamsState.ts`     | `parseRefineState`, `nextState`, `toSearchParams`, `useSearchParamsState` |
| `hooks/useFilteredHotels.ts`        | `filterSortPaginate` (pure), `useFilteredHotels` (memoized)             |
| `tests/msw/handlers.ts`             | MSW request handlers for `/api/*` (test doubles)                        |
| `tests/msw/server.ts`               | MSW `setupServer` instance                                              |
| `tests/utils/queryWrapper.tsx`      | `createQueryWrapper` — fresh `QueryClient` per test                     |
| `hooks/useLocations.ts`             | RQ hook → `/api/locations`                                              |
| `hooks/useHotels.ts`                | RQ hook → `/api/hotels?country=&city=`                                  |
| `hooks/useAvailability.ts`          | RQ hook → `/api/hotels/[id]/rooms?check_in=&check_out=`                 |
| `app/layout.tsx`                    | Mount `QueryProvider` + `AppProvider` (Task 10, if M0 created it)       |
| `docs/progress.md`                  | Check off M3; note hand-rolled URL hook + Suspense + fetcher (Task 10)  |

---

## Task 0: Test config & prerequisites

> If M0 already set up `next/jest` with jsdom and installed RTL + MSW, only verify (Steps 3–4) and skip the rest.

**Files:**

- Modify: `jest.config.js`

- [ ] **Step 1: Install test deps if missing**

Run: `npm install -D @testing-library/react @testing-library/dom msw`
Expected: packages present in `devDependencies` (RTL + MSW; `@tanstack/react-query` came from M0).

- [ ] **Step 2: Replace `jest.config.js` with the `next/jest` setup**

`next/jest` compiles TS/TSX/JSX and wires env vars, so both M1's pure tests and M3's client-hook tests run under one config. jsdom is the global environment (pure tests run fine under it).

```js
// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  collectCoverageFrom: [
    'lib/**/*.ts',
    'services/**/*.ts',
    'types/**/*.ts',
    'hooks/**/*.{ts,tsx}',
    'stores/**/*.{ts,tsx}',
    '!**/*.test.{ts,tsx}',
  ],
  coveragePathIgnorePatterns: ['/node_modules/', '/tests/'],
  coverageThreshold: { global: { branches: 85, functions: 85, lines: 85, statements: 85 } },
};

module.exports = createJestConfig(config);
```

- [ ] **Step 3: Verify the existing (M1) suite still runs under the new config**

Run: `npx jest lib services types --passWithNoTests`
Expected: M1's `lib/`, `services/`, `types/` suites PASS (or `No tests found` if M1 not yet present).

- [ ] **Step 4: Commit**

```bash
git add jest.config.js package.json package-lock.json
git commit -m "chore(test): next/jest + jsdom config for client hooks (M3)"
```

---

## Task 1: `lib/fetcher.ts` — typed fetch wrapper

**Files:**

- Create: `lib/fetcher.ts`
- Test: `lib/fetcher.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/fetcher.test.ts
import { ApiError, getJson } from './fetcher';

describe('getJson', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('returns parsed JSON on a 2xx response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ hello: 'world' }),
    }) as unknown as typeof fetch;

    await expect(getJson<{ hello: string }>('/api/x')).resolves.toEqual({ hello: 'world' });
  });

  it('throws an ApiError carrying the status on a non-2xx response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    }) as unknown as typeof fetch;

    await expect(getJson('/api/x')).rejects.toMatchObject({ name: 'ApiError', status: 500 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest lib/fetcher.test.ts`
Expected: FAIL — cannot find module `./fetcher`.

- [ ] **Step 3: Write the implementation**

```ts
// lib/fetcher.ts
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Read the base per-call so tests can set API_BASE_URL after module load.
// In the browser API_BASE_URL is unset → '' → URLs stay relative (resolved by origin).
export async function getJson<T>(url: string): Promise<T> {
  const base = process.env.API_BASE_URL ?? '';
  const res = await fetch(`${base}${url}`);
  if (!res.ok) {
    throw new ApiError(res.status, `Request failed (${res.status}): ${url}`);
  }
  return (await res.json()) as T;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest lib/fetcher.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/fetcher.ts lib/fetcher.test.ts
git commit -m "feat(lib): typed getJson fetch wrapper with ApiError"
```

---

## Task 2: `stores/AppProvider.tsx` — dates context

**Files:**

- Create: `stores/AppProvider.tsx`
- Test: `stores/AppProvider.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// stores/AppProvider.test.tsx
import { act, renderHook } from '@testing-library/react';
import { AppProvider, useAppDates } from './AppProvider';

describe('useAppDates', () => {
  it('throws when used outside <AppProvider>', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAppDates())).toThrow(/AppProvider/);
    spy.mockRestore();
  });

  it('starts with null dates and updates them', () => {
    const { result } = renderHook(() => useAppDates(), { wrapper: AppProvider });

    expect(result.current.checkIn).toBeNull();
    expect(result.current.checkOut).toBeNull();

    act(() => result.current.setCheckIn('2026-07-10'));
    act(() => result.current.setCheckOut('2026-07-12'));

    expect(result.current.checkIn).toBe('2026-07-10');
    expect(result.current.checkOut).toBe('2026-07-12');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest stores/AppProvider.test.tsx`
Expected: FAIL — cannot find module `./AppProvider`.

- [ ] **Step 3: Write the implementation**

```tsx
// stores/AppProvider.tsx
'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type AppDates = {
  checkIn: string | null;
  checkOut: string | null;
  setCheckIn: (date: string | null) => void;
  setCheckOut: (date: string | null) => void;
};

const AppDatesContext = createContext<AppDates | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);

  const value = useMemo<AppDates>(
    () => ({ checkIn, checkOut, setCheckIn, setCheckOut }),
    [checkIn, checkOut],
  );

  return <AppDatesContext.Provider value={value}>{children}</AppDatesContext.Provider>;
}

export function useAppDates(): AppDates {
  const ctx = useContext(AppDatesContext);
  if (!ctx) {
    throw new Error('useAppDates must be used within <AppProvider>');
  }
  return ctx;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest stores/AppProvider.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add stores/AppProvider.tsx stores/AppProvider.test.tsx
git commit -m "feat(stores): AppProvider dates context with useAppDates guard"
```

---

## Task 3: `stores/QueryProvider.tsx` — React Query client + provider

**Files:**

- Create: `stores/QueryProvider.tsx`
- Test: `stores/QueryProvider.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// stores/QueryProvider.test.tsx
import { useQueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { makeQueryClient, QueryProvider } from './QueryProvider';

function Probe() {
  const client = useQueryClient();
  return <span>{client ? 'has-client' : 'no-client'}</span>;
}

describe('QueryProvider', () => {
  it('makeQueryClient applies the configured query defaults', () => {
    const defaults = makeQueryClient().getDefaultOptions().queries;
    expect(defaults).toMatchObject({ staleTime: 60_000, retry: 1, refetchOnWindowFocus: false });
  });

  it('provides a QueryClient to descendants', () => {
    render(
      <QueryProvider>
        <Probe />
      </QueryProvider>,
    );
    // getByText throws if not found — that is the assertion.
    expect(screen.getByText('has-client')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest stores/QueryProvider.test.tsx`
Expected: FAIL — cannot find module `./QueryProvider`.

- [ ] **Step 3: Write the implementation**

```tsx
// stores/QueryProvider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function QueryProvider({ children }: { children: ReactNode }) {
  // useState initializer keeps one client stable across re-renders (and per request on the server).
  const [client] = useState(makeQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest stores/QueryProvider.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add stores/QueryProvider.tsx stores/QueryProvider.test.tsx
git commit -m "feat(stores): QueryProvider with configured RQ defaults"
```

---

## Task 4: `hooks/useSearchParamsState.ts` — URL refine state

**Files:**

- Create: `hooks/useSearchParamsState.ts`
- Test: `hooks/useSearchParamsState.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// hooks/useSearchParamsState.test.tsx
import { act, renderHook } from '@testing-library/react';
import {
  nextState,
  parseRefineState,
  toSearchParams,
  useSearchParamsState,
} from './useSearchParamsState';

// Mutable mock of the current URL query; jest allows vars prefixed with `mock`.
let mockSearch = '';
const replace = jest.fn();
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
  useRouter: () => ({ replace }),
  usePathname: () => '/',
}));

describe('parseRefineState', () => {
  it('applies safe defaults for an empty query', () => {
    expect(parseRefineState(new URLSearchParams(''))).toEqual({
      country: null,
      city: null,
      stars: null,
      min: null,
      max: null,
      sort: 'price-asc',
      page: 1,
    });
  });

  it('coerces an unknown sort and a bad page', () => {
    const s = parseRefineState(new URLSearchParams('sort=nope&page=0'));
    expect(s.sort).toBe('price-asc');
    expect(s.page).toBe(1);
  });

  it('parses all provided values', () => {
    const s = parseRefineState(
      new URLSearchParams('country=usa&city=new-york&stars=4&min=100&max=300&sort=rating&page=2'),
    );
    expect(s).toEqual({
      country: 'usa',
      city: 'new-york',
      stars: 4,
      min: 100,
      max: 300,
      sort: 'rating',
      page: 2,
    });
  });
});

describe('nextState page-reset', () => {
  const base = parseRefineState(new URLSearchParams('country=usa&page=3'));

  it('resets page to 1 when a filter changes', () => {
    expect(nextState(base, { stars: 4 }).page).toBe(1);
  });
  it('keeps the page when the patch sets page explicitly', () => {
    expect(nextState(base, { page: 5 }).page).toBe(5);
  });
  it('keeps the page for an empty patch', () => {
    expect(nextState(base, {}).page).toBe(3);
  });
});

describe('toSearchParams', () => {
  it('omits defaults and nulls, sorts keys', () => {
    const qs = toSearchParams({
      country: 'usa',
      city: null,
      stars: 4,
      min: null,
      max: null,
      sort: 'price-asc',
      page: 1,
    }).toString();
    expect(qs).toBe('country=usa&stars=4');
  });
  it('includes sort and page when non-default', () => {
    const qs = toSearchParams({
      country: null,
      city: null,
      stars: null,
      min: null,
      max: null,
      sort: 'rating',
      page: 2,
    }).toString();
    expect(qs).toBe('page=2&sort=rating');
  });
});

describe('useSearchParamsState', () => {
  beforeEach(() => {
    replace.mockClear();
    mockSearch = 'country=usa&page=3';
  });

  it('exposes the parsed state', () => {
    const { result } = renderHook(() => useSearchParamsState());
    expect(result.current.state).toMatchObject({ country: 'usa', page: 3 });
  });

  it('setParams resets page on a filter change and calls router.replace', () => {
    const { result } = renderHook(() => useSearchParamsState());
    act(() => result.current.setParams({ stars: 4 }));
    expect(replace).toHaveBeenCalledWith('/?country=usa&stars=4');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest hooks/useSearchParamsState.test.tsx`
Expected: FAIL — cannot find module `./useSearchParamsState`.

- [ ] **Step 3: Write the implementation**

```ts
// hooks/useSearchParamsState.ts
'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

export type SortKey = 'price-asc' | 'price-desc' | 'rating' | 'stars';

const SORT_KEYS: SortKey[] = ['price-asc', 'price-desc', 'rating', 'stars'];
const DEFAULT_SORT: SortKey = 'price-asc';
const FILTER_KEYS = ['country', 'city', 'stars', 'min', 'max', 'sort'] as const;

export type RefineState = {
  country: string | null;
  city: string | null;
  stars: number | null;
  min: number | null;
  max: number | null;
  sort: SortKey;
  page: number;
};

function parseNum(raw: string | null): number | null {
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function parseRefineState(sp: URLSearchParams): RefineState {
  const sortRaw = sp.get('sort');
  const pageNum = parseNum(sp.get('page'));
  return {
    country: sp.get('country'),
    city: sp.get('city'),
    stars: parseNum(sp.get('stars')),
    min: parseNum(sp.get('min')),
    max: parseNum(sp.get('max')),
    sort: SORT_KEYS.includes(sortRaw as SortKey) ? (sortRaw as SortKey) : DEFAULT_SORT,
    page: pageNum !== null && pageNum >= 1 ? Math.floor(pageNum) : 1,
  };
}

export function nextState(current: RefineState, patch: Partial<RefineState>): RefineState {
  const merged: RefineState = { ...current, ...patch };
  const changesFilter = FILTER_KEYS.some((key) => key in patch);
  if (changesFilter && !('page' in patch)) {
    merged.page = 1;
  }
  return merged;
}

export function toSearchParams(state: RefineState): URLSearchParams {
  const sp = new URLSearchParams();
  if (state.country) sp.set('country', state.country);
  if (state.city) sp.set('city', state.city);
  if (state.stars !== null) sp.set('stars', String(state.stars));
  if (state.min !== null) sp.set('min', String(state.min));
  if (state.max !== null) sp.set('max', String(state.max));
  if (state.sort !== DEFAULT_SORT) sp.set('sort', state.sort);
  if (state.page > 1) sp.set('page', String(state.page));

  // Deterministic, sorted key order for stable, test-assertable URLs.
  const sorted = new URLSearchParams();
  for (const key of [...sp.keys()].sort()) {
    sorted.set(key, sp.get(key) as string);
  }
  return sorted;
}

export function useSearchParamsState(): {
  state: RefineState;
  setParams: (patch: Partial<RefineState>) => void;
} {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const state = useMemo(
    () => parseRefineState(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );

  const setParams = useCallback(
    (patch: Partial<RefineState>) => {
      const qs = toSearchParams(nextState(state, patch)).toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [state, router, pathname],
  );

  return { state, setParams };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest hooks/useSearchParamsState.test.tsx`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add hooks/useSearchParamsState.ts hooks/useSearchParamsState.test.tsx
git commit -m "feat(hooks): hand-rolled URL refine-state hook with page-reset"
```

---

## Task 5: `hooks/useFilteredHotels.ts` — pure filter/sort/paginate

**Files:**

- Create: `hooks/useFilteredHotels.ts`
- Test: `hooks/useFilteredHotels.test.ts`

> Depends on M1's `lib/filters.ts`, `lib/sort.ts`, `lib/paginate.ts`, `types/domain.ts`, and `tests/fixtures.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// hooks/useFilteredHotels.test.ts
import { makeHotel, makeRoom } from '../tests/fixtures';
import { filterSortPaginate } from './useFilteredHotels';

const hotel = (id: string, stars: number, price: number) =>
  makeHotel({ id, starRating: stars, rooms: [makeRoom({ pricePerNight: price })] });

describe('filterSortPaginate', () => {
  const hotels = [hotel('a', 3, 300), hotel('b', 5, 100), hotel('c', 4, 200)];

  it('filters by minimum stars then sorts by price ascending', () => {
    const result = filterSortPaginate(hotels, {
      stars: 4,
      min: null,
      max: null,
      sort: 'price-asc',
      page: 1,
    });
    expect(result.items.map((h) => h.id)).toEqual(['b', 'c']);
    expect(result.total).toBe(2);
  });

  it('treats a single price bound as open-ended', () => {
    const result = filterSortPaginate(hotels, {
      stars: null,
      min: 250,
      max: null,
      sort: 'price-asc',
      page: 1,
    });
    expect(result.items.map((h) => h.id)).toEqual(['a']); // only 300 >= 250
  });

  it('skips filtering when stars and both price bounds are null', () => {
    const result = filterSortPaginate(hotels, {
      stars: null,
      min: null,
      max: null,
      sort: 'stars',
      page: 1,
    });
    expect(result.total).toBe(3);
    expect(result.items[0].id).toBe('b'); // 5-star sorts first
  });

  it('does not mutate the input array', () => {
    const input = [...hotels];
    filterSortPaginate(input, { stars: null, min: null, max: null, sort: 'price-asc', page: 1 });
    expect(input.map((h) => h.id)).toEqual(['a', 'b', 'c']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest hooks/useFilteredHotels.test.ts`
Expected: FAIL — cannot find module `./useFilteredHotels`.

- [ ] **Step 3: Write the implementation**

```ts
// hooks/useFilteredHotels.ts
'use client';

import { useMemo } from 'react';
import { filterByPrice, filterByStars } from '../lib/filters';
import { paginate, type Page } from '../lib/paginate';
import { sortHotels, type SortKey } from '../lib/sort';
import type { Hotel } from '../types/domain';

export type RefineParams = {
  stars: number | null;
  min: number | null;
  max: number | null;
  sort: SortKey;
  page: number;
};

export function filterSortPaginate(hotels: Hotel[], params: RefineParams): Page<Hotel> {
  let result = hotels;

  if (params.stars !== null) {
    result = filterByStars(result, params.stars);
  }
  if (params.min !== null || params.max !== null) {
    const min = params.min ?? 0;
    const max = params.max ?? Number.POSITIVE_INFINITY;
    result = filterByPrice(result, min, max);
  }

  result = sortHotels(result, params.sort);
  return paginate(result, params.page);
}

export function useFilteredHotels(hotels: Hotel[], params: RefineParams): Page<Hotel> {
  return useMemo(
    () => filterSortPaginate(hotels, params),
    // Primitive deps keep recompute under the <100ms budget on unrelated renders.
    [hotels, params.stars, params.min, params.max, params.sort, params.page],
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest hooks/useFilteredHotels.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add hooks/useFilteredHotels.ts hooks/useFilteredHotels.test.ts
git commit -m "feat(hooks): pure useFilteredHotels (filter->sort->paginate)"
```

---

## Task 6: Test infrastructure — MSW handlers, server, query wrapper

**Files:**

- Create: `tests/msw/handlers.ts`
- Create: `tests/msw/server.ts`
- Create: `tests/utils/queryWrapper.tsx`

> These are test doubles for M2's routes. M0 owns the long-term MSW setup; if it already provides `tests/msw/server.ts` + handlers covering `/api/locations`, `/api/hotels`, `/api/hotels/:id/rooms` at an absolute `http://localhost` origin, reuse those and only add `queryWrapper.tsx`.

- [ ] **Step 1: Create the MSW handlers**

```ts
// tests/msw/handlers.ts
import { http, HttpResponse } from 'msw';

// Absolute origin so Node's fetch can resolve the URL (getJson prepends API_BASE_URL).
const ORIGIN = 'http://localhost';

export const handlers = [
  http.get(`${ORIGIN}/api/locations`, () =>
    HttpResponse.json([
      { city: 'New York', country: 'USA', state: 'NY', citySlug: 'new-york', countrySlug: 'usa' },
    ]),
  ),

  http.get(`${ORIGIN}/api/hotels`, ({ request }) => {
    const country = new URL(request.url).searchParams.get('country');
    if (country === 'usa') {
      return HttpResponse.json([{ id: 'hotel-01', name: 'Test Hotel', starRating: 5 }]);
    }
    return HttpResponse.json([]);
  }),

  http.get(`${ORIGIN}/api/hotels/:id/rooms`, () =>
    HttpResponse.json([
      { roomId: 'room-01a', type: 'Deluxe King', pricePerNight: 299, bedType: 'King', maxOccupancy: 2 },
    ]),
  ),
];
```

- [ ] **Step 2: Create the server**

```ts
// tests/msw/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

- [ ] **Step 3: Create the query wrapper**

```tsx
// tests/utils/queryWrapper.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Fresh client per test; retries off by default and retryDelay 0 so error-path
// tests resolve fast even when a hook opts into its own retry count.
export function createQueryWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
```

- [ ] **Step 4: Smoke-check the files compile (no test yet)**

Run: `npx tsc --noEmit`
Expected: no errors (these files are imported by the query-hook tests in Tasks 7–9).

- [ ] **Step 5: Commit**

```bash
git add tests/msw/handlers.ts tests/msw/server.ts tests/utils/queryWrapper.tsx
git commit -m "test(infra): MSW handlers/server and React Query test wrapper"
```

---

## Task 7: `hooks/useLocations.ts`

**Files:**

- Create: `hooks/useLocations.ts`
- Test: `hooks/useLocations.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// hooks/useLocations.test.tsx
process.env.API_BASE_URL = 'http://localhost';

import { renderHook, waitFor } from '@testing-library/react';
import { server } from '../tests/msw/server';
import { createQueryWrapper } from '../tests/utils/queryWrapper';
import { useLocations } from './useLocations';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('useLocations', () => {
  it('fetches and returns the locations list', async () => {
    const { result } = renderHook(() => useLocations(), { wrapper: createQueryWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].citySlug).toBe('new-york');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest hooks/useLocations.test.tsx`
Expected: FAIL — cannot find module `./useLocations`.

- [ ] **Step 3: Write the implementation**

```ts
// hooks/useLocations.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { getJson } from '../lib/fetcher';
import type { Location } from '../types/domain';

export function useLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: () => getJson<Location[]>('/api/locations'),
    staleTime: Infinity, // destination list is effectively static — fetch once per session
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest hooks/useLocations.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add hooks/useLocations.ts hooks/useLocations.test.tsx
git commit -m "feat(hooks): useLocations (fetch-once destination list)"
```

---

## Task 8: `hooks/useHotels.ts`

**Files:**

- Create: `hooks/useHotels.ts`
- Test: `hooks/useHotels.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// hooks/useHotels.test.tsx
process.env.API_BASE_URL = 'http://localhost';

import { renderHook, waitFor } from '@testing-library/react';
import { server } from '../tests/msw/server';
import { createQueryWrapper } from '../tests/utils/queryWrapper';
import { useHotels } from './useHotels';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('useHotels', () => {
  it('is idle (does not fetch) when no location is selected', () => {
    const { result } = renderHook(() => useHotels({}), { wrapper: createQueryWrapper() });
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  it('fetches the country subset when a country slug is set', async () => {
    const { result } = renderHook(() => useHotels({ country: 'usa' }), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.map((h) => h.id)).toEqual(['hotel-01']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest hooks/useHotels.test.tsx`
Expected: FAIL — cannot find module `./useHotels`.

- [ ] **Step 3: Write the implementation**

```ts
// hooks/useHotels.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { getJson } from '../lib/fetcher';
import type { Hotel } from '../types/domain';

export function useHotels(query: { country?: string | null; city?: string | null }) {
  const country = query.country ?? null;
  const city = query.city ?? null;

  return useQuery({
    queryKey: ['hotels', country, city],
    queryFn: () => {
      const sp = new URLSearchParams();
      if (country) sp.set('country', country);
      if (city) sp.set('city', city);
      return getJson<Hotel[]>(`/api/hotels?${sp.toString()}`);
    },
    enabled: !!(country || city), // location-first: nothing loads until a destination is chosen
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest hooks/useHotels.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add hooks/useHotels.ts hooks/useHotels.test.tsx
git commit -m "feat(hooks): useHotels keyed by location, enabled when set"
```

---

## Task 9: `hooks/useAvailability.ts`

**Files:**

- Create: `hooks/useAvailability.ts`
- Test: `hooks/useAvailability.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// hooks/useAvailability.test.tsx
process.env.API_BASE_URL = 'http://localhost';

import { delay, http, HttpResponse } from 'msw';
import { renderHook, waitFor } from '@testing-library/react';
import { server } from '../tests/msw/server';
import { createQueryWrapper } from '../tests/utils/queryWrapper';
import { useAvailability } from './useAvailability';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('useAvailability gating', () => {
  it('does not fetch with partial dates', () => {
    const { result } = renderHook(() => useAvailability('hotel-01', '2026-07-10', null), {
      wrapper: createQueryWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('does not fetch when checkout <= checkin', () => {
    const { result } = renderHook(() => useAvailability('hotel-01', '2026-07-12', '2026-07-12'), {
      wrapper: createQueryWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('returns available rooms for a valid range', async () => {
    const { result } = renderHook(() => useAvailability('hotel-01', '2026-07-10', '2026-07-12'), {
      wrapper: createQueryWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].roomId).toBe('room-01a');
  });
});

describe('useAvailability latest-wins', () => {
  it('a delayed response for old dates never replaces the new selection', async () => {
    server.use(
      http.get('http://localhost/api/hotels/:id/rooms', async ({ request }) => {
        const checkOut = new URL(request.url).searchParams.get('check_out');
        if (checkOut === '2026-07-12') {
          await delay(50);
          return HttpResponse.json([
            { roomId: 'STALE', type: 'x', pricePerNight: 1, bedType: 'x', maxOccupancy: 1 },
          ]);
        }
        return HttpResponse.json([
          { roomId: 'FRESH', type: 'y', pricePerNight: 2, bedType: 'y', maxOccupancy: 2 },
        ]);
      }),
    );

    const wrapper = createQueryWrapper();
    const { result, rerender } = renderHook(
      ({ out }: { out: string }) => useAvailability('hotel-01', '2026-07-10', out),
      { wrapper, initialProps: { out: '2026-07-12' } },
    );

    // Change dates before the slow (old-date) response resolves.
    rerender({ out: '2026-07-13' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].roomId).toBe('FRESH');

    // After the delayed stale response lands, the displayed data is still the new key's.
    await new Promise((r) => setTimeout(r, 80));
    expect(result.current.data?.[0].roomId).toBe('FRESH');
  });
});

describe('useAvailability errors', () => {
  it('surfaces an ApiError carrying the status on a 500', async () => {
    server.use(
      http.get('http://localhost/api/hotels/:id/rooms', () => new HttpResponse(null, { status: 500 })),
    );
    const { result } = renderHook(() => useAvailability('hotel-01', '2026-07-10', '2026-07-12'), {
      wrapper: createQueryWrapper(),
    });
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 2000 });
    expect((result.current.error as { status?: number }).status).toBe(500);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest hooks/useAvailability.test.tsx`
Expected: FAIL — cannot find module `./useAvailability`.

- [ ] **Step 3: Write the implementation**

```ts
// hooks/useAvailability.ts
'use client';

import { useQuery } from '@tanstack/react-query';
import { getJson } from '../lib/fetcher';
import type { AvailableRoom } from '../types/domain';

export function useAvailability(id: string, checkIn: string | null, checkOut: string | null) {
  const enabled = !!(checkIn && checkOut && checkOut > checkIn);

  return useQuery({
    queryKey: ['availability', id, checkIn, checkOut],
    queryFn: () =>
      getJson<AvailableRoom[]>(
        `/api/hotels/${id}/rooms?check_in=${checkIn}&check_out=${checkOut}`,
      ),
    enabled,
    retry: 2, // the slow third-party path benefits from a couple of retries
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest hooks/useAvailability.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add hooks/useAvailability.ts hooks/useAvailability.test.tsx
git commit -m "feat(hooks): useAvailability with date gating and latest-wins"
```

---

## Task 10: Wire providers, full suite, coverage gate, progress doc

**Files:**

- Modify: `app/layout.tsx` (only if M0 created it)
- Modify: `docs/progress.md`

- [ ] **Step 1: Mount the providers in the root layout (skip if `app/layout.tsx` is absent)**

Wrap the app in `QueryProvider` then `AppProvider` so every client component can use the hooks. Keep whatever else M0 put in the layout; only add the provider wrapping around `{children}`:

```tsx
// app/layout.tsx — inside <body>, wrap children
import { AppProvider } from '../stores/AppProvider';
import { QueryProvider } from '../stores/QueryProvider';

// ...
//   <body>
//     <QueryProvider>
//       <AppProvider>{children}</AppProvider>
//     </QueryProvider>
//   </body>
```

> Note: the `<Suspense>` boundary required around the `useSearchParams`-reading subtree (spec §4) is placed by **M4** when it builds the home page — not here, because no page reads search params yet.

- [ ] **Step 2: Run the whole suite with coverage**

Run: `npx jest --coverage`
Expected: all suites PASS; coverage ≥ 85% on branches/functions/lines/statements.

- [ ] **Step 3: Run the type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Update `docs/progress.md`**

In the **M3** section, check off the completed items (`[x]`) for `QueryProvider`, `AppProvider`, the URL `searchParams` helpers, `useLocations`, `useHotels`, `useFilteredHotels`, `useAvailability`, the unit tests, and the "Done when" line. Append a short decisions note under M3:

```markdown
**M3 decisions (from design spec):** URL state is a hand-rolled `useSearchParamsState`
(no `nuqs`); `useFilteredHotels` takes refine params as arguments (pure); server hooks
fetch through `lib/fetcher.getJson` (throws typed `ApiError`); the `useSearchParams`
subtree must sit under a `<Suspense>` boundary (placed in M4) so `/` keeps a static
shell; `AppProvider` holds dates only (validation in M5); latest-wins on availability
is structural via RQ keying.
```

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx docs/progress.md
git commit -m "feat(stores): wire providers in root layout; mark M3 complete"
```

> If `app/layout.tsx` does not exist yet, commit only `docs/progress.md`.

---

## Self-Review (completed by plan author)

**1. Spec coverage** — every spec section maps to a task:

- §2 state model → enforced across Tasks 2 (dates), 4 (URL), 7–9 (RQ). §3 module structure → Tasks 1–9. §4 Suspense constraint → documented in Task 10 Step 1 + M3 note (placement is M4, correctly out of scope). §5 QueryProvider → Task 3. §6 AppProvider → Task 2. §7 fetcher → Task 1. §8 useSearchParamsState → Task 4. §9.1–9.4 hooks → Tasks 7, 8, 5, 9. §10 error handling → Task 1 (`ApiError`) + Task 9 (500 path) + gating in Tasks 8/9. §11 testing → every task is test-first; MSW infra in Task 6; latest-wins in Task 9. §12 decisions → Task 10 progress note.

**2. Placeholder scan** — no TBD/TODO; every code step shows complete code; every test step shows full assertions. The only conditional steps (Task 0 skip-if-M0, Task 6 reuse-if-M0, Task 10 layout-if-present) state the exact condition and the concrete fallback.

**3. Type/name consistency** — `ApiError`/`getJson` (Task 1) used verbatim in Tasks 7–9 and the spec. `AppDates`/`useAppDates`/`AppProvider` (Task 2) consistent. `makeQueryClient`/`QueryProvider` (Task 3). `RefineState`/`SortKey`/`parseRefineState`/`nextState`/`toSearchParams`/`useSearchParamsState` (Task 4) — `SortKey` matches M1's `lib/sort.ts` union. `RefineParams`/`filterSortPaginate`/`useFilteredHotels` (Task 5) consume M1's `filterByStars(hotels, min)`, `filterByPrice(hotels, min, max)`, `sortHotels(hotels, key)`, `paginate(items, page)` → `Page<T>` exactly. `createQueryWrapper`/`server`/`handlers` (Task 6) used by Tasks 7–9. Domain types `Location`/`Hotel`/`AvailableRoom` from M1 used verbatim.

**Note for executor:** these are client modules (`'use client'`). They depend on M0's Next+`next/jest`+jsdom toolchain and M1's `lib/`+`types/`+`tests/fixtures.ts`. If M2's `/api/*` routes are not yet live, the MSW handlers (Task 6) fully stand in for them during M3 tests — no running server required.
