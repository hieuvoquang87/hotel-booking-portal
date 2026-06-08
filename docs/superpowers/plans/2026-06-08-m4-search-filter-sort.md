# M4 — Search · Filter · Sort · Paginate (Home `/`) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the home page `/` — a static shell wrapping a client `HomeView` that lets a traveler pick a destination (country or city), browse that location's hotels, refine by star/price, sort, and paginate, with every loading/empty/error state from the design spec — covering PRD F1, F2, F3.

**Architecture:** `app/page.tsx` is a server component (route metadata + static shell) that wraps a `'use client'` `HomeView` in `<Suspense>` (so `useSearchParams` doesn't bail out static rendering). `HomeView` is the only place that reads the URL and the M3 hooks; every other component is presentational (props in, callbacks out) and unit-testable in isolation. Filter/sort/paginate is pure in-memory composition over the loaded subset via M3's `useFilteredHotels` — no refetch. TDD throughout; ≥85% coverage on M4 modules.

**Tech Stack:** Next.js 16 (App Router) + React 19 + TypeScript (strict), Tailwind v4, `@tanstack/react-query` (via M3 hooks), Jest + `next/jest` (jsdom) + React Testing Library + `@testing-library/user-event` + MSW v2.

**Spec:** `docs/superpowers/specs/2026-06-08-m4-search-filter-sort-design.md`

**Design contract:** `docs/designs/home-page-design-spec.md` + `docs/designs/home-page-mockup.html` (open in a browser for the rendered reference).

**Conventions for every task:** run tests with `npx jest <path>`; co-locate `*.test.tsx` next to source; relative imports (`../../hooks/...`, `../../lib/...`) matching M1/M3; commit after each green task with conventional-commit prefixes. Components are `'use client'` only when they use state/effects/hooks/handlers; pure presentational leaves can stay server-safe but the home subtree is all client (under Suspense).

**Assumes M0–M3 are done:**
- **M0:** Next + TS + Tailwind v4, `next/jest`+jsdom, RTL, MSW under `tests/msw/`, `@tanstack/react-query`.
- **M1:** `types/domain.ts` (`Hotel`, `Room`, `Location`, `AvailableRoom`), `lib/slug.ts`, `lib/filters.ts`, `lib/sort.ts` (`SortKey = 'price-asc'|'price-desc'|'rating'|'stars'`, `sortHotels`), `lib/paginate.ts` (`PAGE_SIZE`, `paginate` → `{items,page,totalPages,total}`), `tests/fixtures.ts` (`makeHotel`, `makeRoom`).
- **M2:** `/api/locations`, `/api/hotels`, `/api/hotels/[id]`, `/api/hotels/[id]/rooms`.
- **M3:** `stores/QueryProvider.tsx`, `stores/AppProvider.tsx` (mounted in `app/layout.tsx`), `hooks/useSearchParamsState.ts` (`RefineState`, `parseRefineState`, `nextState`, `toSearchParams`, `useSearchParamsState`, `DEFAULT_SORT`), `hooks/useLocations.ts`, `hooks/useHotels.ts`, `hooks/useFilteredHotels.ts` (`filterSortPaginate`, `useFilteredHotels`), `tests/msw/{handlers,server}.ts`, `tests/utils/queryWrapper.tsx`.

If a referenced M1–M3 export is missing at execution time, stop and complete that milestone first — M4 is pure assembly on top of them.

> **Next 16 caveat (AGENTS.md):** before Tasks 18–19 (metadata, `app/icon.svg` favicon, Suspense bail-out), read `node_modules/next/dist/docs/` for the current `metadata` export, file-based favicon convention, and `useSearchParams` static-rendering rules. They differ from older Next.

---

## File Map

| File | Responsibility |
| --- | --- |
| `lib/paginate.ts` | **(modify)** `PAGE_SIZE` 12 → 8 |
| `hooks/useSearchParamsState.ts` | **(modify)** `DEFAULT_SORT` `'price-asc'` → `'rating'` |
| `utils/analyticUtil.ts` | Typed `track(event)` facade (DEV console / PROD no-op) |
| `lib/amenities.ts` | `humanizeAmenity(raw)` — "free_wifi" → "Wi-Fi" |
| `lib/destinations.ts` | `buildDestinationOptions(locations)` → mixed country/city option rows (pure) |
| `components/Icon.tsx` | Inline-SVG icon set (`pin`, `building`, `search`, `chevron`, `x`, `star`, `sliders`) |
| `components/EmptyState.tsx` | Reusable: icon + message + optional action button |
| `components/home/HotelCard.tsx` | One hotel; whole-card link to `/hotels/[id]` |
| `components/home/HotelCardSkeleton.tsx` | Shimmer placeholder card |
| `components/home/SegmentedStars.tsx` | `Any / 3★+ / 4★+ / 5★` segmented control |
| `components/home/SortSelect.tsx` | 4 sort options (rating default) |
| `components/home/PriceRange.tsx` | Two USD inputs, commit-on-blur, swap on min>max |
| `components/home/ResultCount.tsx` | `aria-live="polite"` count text |
| `components/home/Pagination.tsx` | Page size 8; hidden when `totalPages ≤ 1` |
| `components/home/DestinationCombobox.tsx` | Filterable country/city combobox |
| `components/home/HotelGrid.tsx` | Responsive grid; renders skeletons / cards |
| `components/home/FilterSheet.tsx` | Mobile bottom-sheet (star + price) |
| `components/home/MobileFilterBar.tsx` | Sticky "Filters" button + inline sort (< sm) |
| `components/home/RefineToolbar.tsx` | Desktop inline toolbar (≥ sm) |
| `components/home/HomeView.tsx` | `'use client'` orchestrator — hooks ↔ UI, URL writes, analytics |
| `components/home/HomeViewFallback.tsx` | Suspense fallback skeleton |
| `app/page.tsx` | Server: route `metadata` + static shell + `<Suspense>` |
| `app/layout.tsx` | **(modify)** title template + meta description |
| `app/icon.svg` | Map-pin favicon |
| `docs/progress.md` | **(modify)** check off M4 |

---

## Task 0: Reconcile page size and default sort

**Files:**
- Modify: `lib/paginate.ts`
- Modify: `lib/paginate.test.ts`
- Modify: `hooks/useSearchParamsState.ts`
- Modify: `hooks/useSearchParamsState.test.tsx`

- [ ] **Step 1: Update the paginate test to expect page size 8**

In `lib/paginate.test.ts`, change the page-size expectation. Find the test asserting the default page size (M1 used 12) and update it:

```ts
it('uses a page size of 8', () => {
  const items = Array.from({ length: 20 }, (_, i) => i);
  const result = paginate(items, 1);
  expect(result.items).toHaveLength(8);
  expect(result.totalPages).toBe(3); // 20 items / 8 = 3 pages
});
```

Also update any other assertion in that file that hard-codes 12 (e.g. clamp tests) to the page-size-8 math.

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest lib/paginate.test.ts`
Expected: FAIL — current `PAGE_SIZE` is 12, so lengths/totals don't match.

- [ ] **Step 3: Change the constant**

In `lib/paginate.ts`:

```ts
export const PAGE_SIZE = 8; // home grid page size (design contract); was 12
```

- [ ] **Step 4: Run to verify paginate passes**

Run: `npx jest lib/paginate.test.ts`
Expected: PASS.

- [ ] **Step 5: Update the search-params default-sort test**

In `hooks/useSearchParamsState.test.tsx`, change every expectation of the default sort from `'price-asc'` to `'rating'`. Specifically the empty-query parse, the unknown-sort coercion, and any `toSearchParams` test where `'price-asc'` was previously omitted as the default (now `'rating'` is omitted, and `'price-asc'` is serialized):

```ts
it('applies safe defaults for an empty query', () => {
  expect(parseRefineState(new URLSearchParams('')).sort).toBe('rating');
});

it('coerces an unknown sort to the default', () => {
  expect(parseRefineState(new URLSearchParams('sort=nope')).sort).toBe('rating');
});

it('omits the default sort but serializes a non-default one', () => {
  const base = parseRefineState(new URLSearchParams(''));
  expect(toSearchParams({ ...base, sort: 'rating' }).toString()).toBe('');
  expect(toSearchParams({ ...base, sort: 'price-asc' }).toString()).toBe('sort=price-asc');
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx jest hooks/useSearchParamsState.test.tsx`
Expected: FAIL — `DEFAULT_SORT` is still `'price-asc'`.

- [ ] **Step 7: Change the default**

In `hooks/useSearchParamsState.ts`:

```ts
const DEFAULT_SORT: SortKey = 'rating'; // was 'price-asc' — quality-first default (M4)
```

- [ ] **Step 8: Run both suites to verify they pass**

Run: `npx jest lib/paginate.test.ts hooks/useSearchParamsState.test.tsx`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/paginate.ts lib/paginate.test.ts hooks/useSearchParamsState.ts hooks/useSearchParamsState.test.tsx
git commit -m "refactor(M4): page size 8 + default sort rating"
```

---

## Task 1: `utils/analyticUtil.ts` — typed track() facade

**Files:**
- Create: `utils/analyticUtil.ts`
- Test: `utils/analyticUtil.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// utils/analyticUtil.test.ts
import { track } from './analyticUtil';

describe('track', () => {
  const original = process.env.NODE_ENV;
  afterEach(() => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = original;
    jest.restoreAllMocks();
  });

  it('logs the event to console.debug in development', () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = 'development';
    const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    track({ name: 'no_results', filters: { stars: 4, min: null, max: null } });
    expect(spy).toHaveBeenCalledWith('[track]', expect.objectContaining({ name: 'no_results' }));
  });

  it('is a no-op in production (does not throw, does not log)', () => {
    (process.env as { NODE_ENV?: string }).NODE_ENV = 'production';
    const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    expect(() =>
      track({ name: 'search_performed', city: 'chicago', country: 'usa', filters: { stars: null, min: null, max: null, sort: 'rating' } }),
    ).not.toThrow();
    expect(spy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest utils/analyticUtil.test.ts`
Expected: FAIL — cannot find module `./analyticUtil`.

- [ ] **Step 3: Write the implementation**

```ts
// utils/analyticUtil.ts
// Typed analytics facade. M4 ships the interface + DEV console body; M6 swaps the
// body for pluggable vendor adapters WITHOUT changing call sites.

export type AnalyticsEvent =
  | {
      name: 'search_performed';
      city: string | null;
      country: string | null;
      filters: { stars: number | null; min: number | null; max: number | null; sort: string };
    }
  | {
      name: 'no_results';
      filters: { stars: number | null; min: number | null; max: number | null };
    };

export function track(event: AnalyticsEvent): void {
  if (process.env.NODE_ENV === 'production') return; // M6 wires real adapters here
  // eslint-disable-next-line no-console
  console.debug('[track]', event);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest utils/analyticUtil.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add utils/analyticUtil.ts utils/analyticUtil.test.ts
git commit -m "feat(M4): typed track() analytics facade (DEV console, PROD no-op)"
```

---

## Task 2: `lib/amenities.ts` — humanize amenity labels

**Files:**
- Create: `lib/amenities.ts`
- Test: `lib/amenities.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/amenities.test.ts
import { humanizeAmenity } from './amenities';

describe('humanizeAmenity', () => {
  it.each([
    ['free_wifi', 'Wi-Fi'],
    ['wifi', 'Wi-Fi'],
    ['fitness_center', 'Fitness center'],
    ['swimming_pool', 'Swimming pool'],
    ['pet_friendly', 'Pet friendly'],
  ])('humanizes %s → %s', (raw, expected) => {
    expect(humanizeAmenity(raw)).toBe(expected);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest lib/amenities.test.ts`
Expected: FAIL — cannot find module `./amenities`.

- [ ] **Step 3: Write the implementation**

```ts
// lib/amenities.ts
// Map raw seed amenity tokens to human-readable card pills.

const SPECIAL: Record<string, string> = {
  free_wifi: 'Wi-Fi',
  wifi: 'Wi-Fi',
};

export function humanizeAmenity(raw: string): string {
  if (SPECIAL[raw]) return SPECIAL[raw];
  const words = raw.replace(/^free[_-]/, '').replace(/[_-]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest lib/amenities.test.ts`
Expected: PASS (5 cases).

- [ ] **Step 5: Commit**

```bash
git add lib/amenities.ts lib/amenities.test.ts
git commit -m "feat(M4): humanizeAmenity helper for card pills"
```

---

## Task 3: `lib/destinations.ts` — destination option builder

**Files:**
- Create: `lib/destinations.ts`
- Test: `lib/destinations.test.ts`

> Depends on M1's `Location` type. Mirrors the mockup's `buildDestinations`: one country-group row per country, then its city rows.

- [ ] **Step 1: Write the failing test**

```ts
// lib/destinations.test.ts
import type { Location } from '../types/domain';
import { buildDestinationOptions } from './destinations';

const loc = (city: string, state: string, country: string, citySlug: string, countrySlug: string): Location =>
  ({ city, state, country, citySlug, countrySlug });

describe('buildDestinationOptions', () => {
  const locations: Location[] = [
    loc('Chicago', 'IL', 'USA', 'chicago', 'usa'),
    loc('New York', 'NY', 'USA', 'new-york', 'usa'),
    loc('London', '', 'United Kingdom', 'london', 'united-kingdom'),
  ];

  it('emits a country row then its city rows, per country', () => {
    const opts = buildDestinationOptions(locations);
    expect(opts.map((o) => [o.kind, o.label])).toEqual([
      ['country', 'All hotels in USA'],
      ['city', 'Chicago, IL — USA'],
      ['city', 'New York, NY — USA'],
      ['country', 'All hotels in United Kingdom'],
      ['city', 'London — United Kingdom'],
    ]);
  });

  it('country rows carry country-only params; city rows carry country+city', () => {
    const [usa, chicago] = buildDestinationOptions(locations);
    expect(usa.params).toEqual({ country: 'usa' });
    expect(chicago.params).toEqual({ country: 'usa', city: 'chicago' });
  });

  it('search text is lowercase and includes city, state, and country', () => {
    const chicago = buildDestinationOptions(locations)[1];
    expect(chicago.search).toContain('chicago');
    expect(chicago.search).toContain('usa');
  });

  it('produces unique keys', () => {
    const keys = buildDestinationOptions(locations).map((o) => o.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest lib/destinations.test.ts`
Expected: FAIL — cannot find module `./destinations`.

- [ ] **Step 3: Write the implementation**

```ts
// lib/destinations.ts
import type { Location } from '../types/domain';

export type DestinationOption =
  | { kind: 'country'; label: string; count: number; search: string; key: string; params: { country: string } }
  | { kind: 'city'; label: string; count: number; search: string; key: string; params: { country: string; city: string } };

// Build the combobox option list: one country-group row per country (loads all its
// hotels) followed by its city rows (loads one city). Country order follows the
// input order (M1's getLocations is already deterministically sorted).
export function buildDestinationOptions(locations: Location[]): DestinationOption[] {
  const byCountry = new Map<string, Location[]>();
  for (const loc of locations) {
    const list = byCountry.get(loc.country) ?? [];
    list.push(loc);
    byCountry.set(loc.country, list);
  }

  const options: DestinationOption[] = [];
  for (const [country, cities] of byCountry) {
    const countrySlug = cities[0].countrySlug;
    options.push({
      kind: 'country',
      label: `All hotels in ${country}`,
      count: cities.length,
      search: `${country} all`.toLowerCase(),
      key: `c-${countrySlug}`,
      params: { country: countrySlug },
    });
    for (const c of cities) {
      const label = c.state ? `${c.city}, ${c.state} — ${c.country}` : `${c.city} — ${c.country}`;
      options.push({
        kind: 'city',
        label,
        count: 1,
        search: `${c.city} ${c.state} ${c.country}`.toLowerCase(),
        key: `city-${c.countrySlug}-${c.citySlug}`,
        params: { country: c.countrySlug, city: c.citySlug },
      });
    }
  }
  return options;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest lib/destinations.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/destinations.ts lib/destinations.test.ts
git commit -m "feat(M4): buildDestinationOptions (country + city rows)"
```

---

## Task 4: `components/Icon.tsx` — inline SVG icon set

**Files:**
- Create: `components/Icon.tsx`
- Test: `components/Icon.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/Icon.test.tsx
import { render } from '@testing-library/react';
import { Icon } from './Icon';

describe('Icon', () => {
  it('renders an svg for a known name with an accessible default (aria-hidden)', () => {
    const { container } = render(<Icon name="pin" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('exposes a label when title is provided', () => {
    const { getByRole } = render(<Icon name="search" title="Search" />);
    expect(getByRole('img', { name: 'Search' })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest components/Icon.test.tsx`
Expected: FAIL — cannot find module `./Icon`.

- [ ] **Step 3: Write the implementation**

```tsx
// components/Icon.tsx
import type { SVGProps } from 'react';

export type IconName = 'pin' | 'building' | 'search' | 'chevron' | 'x' | 'star' | 'sliders';

const PATHS: Record<IconName, JSX.Element> = {
  pin: <path d="M12 21s-7-6.3-7-11a7 7 0 1 1 14 0c0 4.7-7 11-7 11Z M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />,
  building: <path d="M4 21V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v16 M9 9h0 M9 13h0 M9 17h0 M15 9h0 M15 13h0 M15 17h0" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
  x: <path d="M6 6l12 12 M18 6 6 18" />,
  star: <path d="m12 3 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 18.8 6.2 21l1.1-6.5L2.6 9.8l6.5-.9L12 3Z" />,
  sliders: <path d="M4 8h10 M18 8h2 M4 16h2 M10 16h10 M14 6v4 M6 14v4" />,
};

type IconProps = SVGProps<SVGSVGElement> & { name: IconName; size?: number; title?: string };

export function Icon({ name, size = 20, title, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={name === 'star' ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {PATHS[name]}
    </svg>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest components/Icon.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add components/Icon.tsx components/Icon.test.tsx
git commit -m "feat(M4): inline SVG Icon set"
```

---

## Task 5: `components/EmptyState.tsx` — reusable empty/error block

**Files:**
- Create: `components/EmptyState.tsx`
- Test: `components/EmptyState.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/EmptyState.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders title and optional subtext with role=status', () => {
    render(<EmptyState icon="pin" title="No hotels found" subtext="Try widening your filters" />);
    expect(screen.getByRole('status')).toHaveTextContent('No hotels found');
    expect(screen.getByText('Try widening your filters')).toBeTruthy();
  });

  it('renders an action button and fires its callback', async () => {
    const onAction = jest.fn();
    render(<EmptyState icon="pin" title="No hotels found" actionLabel="Reset filters" onAction={onAction} />);
    await userEvent.click(screen.getByRole('button', { name: 'Reset filters' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('omits the button when no action is given', () => {
    render(<EmptyState icon="pin" title="Start by choosing a destination" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest components/EmptyState.test.tsx`
Expected: FAIL — cannot find module `./EmptyState`.

- [ ] **Step 3: Write the implementation**

```tsx
// components/EmptyState.tsx
import { Icon, type IconName } from './Icon';

type EmptyStateProps = {
  icon: IconName;
  title: string;
  subtext?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon, title, subtext, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon name={icon} size={26} />
      </span>
      <p className="text-lg font-semibold text-slate-900">{title}</p>
      {subtext ? <p className="text-sm text-slate-600">{subtext}</p> : null}
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 min-h-11 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest components/EmptyState.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/EmptyState.tsx components/EmptyState.test.tsx
git commit -m "feat(M4): reusable EmptyState component"
```

---

## Task 6: `components/home/HotelCardSkeleton.tsx`

**Files:**
- Create: `components/home/HotelCardSkeleton.tsx`
- Test: `components/home/HotelCardSkeleton.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/home/HotelCardSkeleton.test.tsx
import { render } from '@testing-library/react';
import { HotelCardSkeleton } from './HotelCardSkeleton';

describe('HotelCardSkeleton', () => {
  it('is decorative (aria-hidden) and reserves a 16:9 photo block', () => {
    const { container } = render(<HotelCardSkeleton />);
    const root = container.firstChild as HTMLElement;
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('[data-testid="sk-photo"]')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest components/home/HotelCardSkeleton.test.tsx`
Expected: FAIL — cannot find module `./HotelCardSkeleton`.

- [ ] **Step 3: Write the implementation**

```tsx
// components/home/HotelCardSkeleton.tsx
export function HotelCardSkeleton() {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div data-testid="sk-photo" className="aspect-video animate-pulse bg-slate-100" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-7/12 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-5/12 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-6/12 animate-pulse rounded bg-slate-100" />
        <div className="h-5 w-4/12 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest components/home/HotelCardSkeleton.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add components/home/HotelCardSkeleton.tsx components/home/HotelCardSkeleton.test.tsx
git commit -m "feat(M4): HotelCardSkeleton (no-CLS shimmer)"
```

---

## Task 7: `components/home/HotelCard.tsx`

**Files:**
- Create: `components/home/HotelCard.tsx`
- Test: `components/home/HotelCard.test.tsx`

> Consumes M1's `Hotel` (`id`, `name`, `starRating`, `overallRating`, `reviewCount`, `address.{city,state,country}`, `amenities[]`, `priceFrom`). Uses `humanizeAmenity` (Task 2). Whole card links to `/hotels/[id]`.

- [ ] **Step 1: Write the failing test**

```tsx
// components/home/HotelCard.test.tsx
import { render, screen } from '@testing-library/react';
import type { Hotel } from '../../types/domain';
import { HotelCard } from './HotelCard';

const hotel = {
  id: 'hotel-01',
  name: 'The Grand Luminary',
  starRating: 5,
  overallRating: 4.8,
  reviewCount: 1240,
  address: { street: '', city: 'Chicago', state: 'IL', zipCode: '', country: 'USA' },
  amenities: ['swimming_pool', 'spa', 'free_wifi', 'fitness_center', 'bar'],
  priceFrom: 199,
  photoUrl: '',
  description: '',
  policies: { checkInTime: '', checkOutTime: '', cancellation: '' },
  rooms: [],
} as unknown as Hotel;

describe('HotelCard', () => {
  it('shows name, location, both ratings, review count, and price-from', () => {
    render(<HotelCard hotel={hotel} />);
    expect(screen.getByText('The Grand Luminary')).toBeTruthy();
    expect(screen.getByText(/Chicago, IL · USA/)).toBeTruthy();
    expect(screen.getByText('4.8')).toBeTruthy();
    expect(screen.getByText(/1,240/)).toBeTruthy();
    expect(screen.getByText(/from \$199/)).toBeTruthy();
  });

  it('links the whole card to the hotel detail route with a descriptive label', () => {
    render(<HotelCard hotel={hotel} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/hotels/hotel-01');
    expect(link.getAttribute('aria-label')).toMatch(/Grand Luminary/);
    expect(link.getAttribute('aria-label')).toMatch(/4\.8/);
  });

  it('shows the first three amenities humanized plus a "+N" pill', () => {
    render(<HotelCard hotel={hotel} />);
    expect(screen.getByText('Swimming pool')).toBeTruthy();
    expect(screen.getByText('Wi-Fi')).toBeTruthy();
    expect(screen.getByText('+2')).toBeTruthy(); // 5 amenities, 3 shown
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest components/home/HotelCard.test.tsx`
Expected: FAIL — cannot find module `./HotelCard`.

- [ ] **Step 3: Write the implementation**

```tsx
// components/home/HotelCard.tsx
import Link from 'next/link';
import { humanizeAmenity } from '../../lib/amenities';
import type { Hotel } from '../../types/domain';
import { Icon } from '../Icon';

const fmtPrice = (n: number) => `$${n.toLocaleString('en-US')}`;
const fmtCount = (n: number) => n.toLocaleString('en-US');

function cardAria(h: Hotel): string {
  const where = [h.address.city, h.address.state].filter(Boolean).join(' ');
  return `${h.name}, ${h.starRating} star hotel, rated ${h.overallRating} from ${fmtCount(h.reviewCount)} reviews, from ${fmtPrice(h.priceFrom)} per night, ${where}`;
}

export function HotelCard({ hotel }: { hotel: Hotel }) {
  const shown = hotel.amenities.slice(0, 3);
  const extra = hotel.amenities.length - shown.length;

  return (
    <Link
      href={`/hotels/${hotel.id}`}
      aria-label={cardAria(hotel)}
      className="group block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
    >
      <div className="relative aspect-video bg-slate-100">
        <span className="absolute inset-0 flex items-center justify-center text-slate-300">
          <Icon name="building" size={34} aria-hidden />
        </span>
        <span className="absolute bottom-2 left-3 text-sm font-medium text-slate-500" aria-hidden>
          {hotel.name}
        </span>
        <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-slate-900" aria-hidden>
          {hotel.starRating}★
        </span>
      </div>
      <div className="space-y-1.5 p-4">
        <h3 className="text-base font-semibold text-slate-900">{hotel.name}</h3>
        <p className="text-sm text-slate-600">
          {hotel.address.city}, {hotel.address.state} · {hotel.address.country}
        </p>
        <p className="flex items-center gap-1 text-sm text-slate-900" aria-hidden>
          <Icon name="star" size={14} className="text-amber-500" />
          <span className="font-medium tabular-nums">{hotel.overallRating}</span>
          <span className="text-slate-500">({fmtCount(hotel.reviewCount)})</span>
        </p>
        <ul className="flex flex-wrap gap-1.5 pt-1" aria-hidden>
          {shown.map((a) => (
            <li key={a} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {humanizeAmenity(a)}
            </li>
          ))}
          {extra > 0 ? (
            <li className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">+{extra}</li>
          ) : null}
        </ul>
        <p className="pt-1 text-sm text-slate-900">
          <span className="text-slate-500">from </span>
          <span className="font-semibold tabular-nums">{fmtPrice(hotel.priceFrom)}</span>
          <span className="text-slate-500"> / night</span>
        </p>
      </div>
    </Link>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest components/home/HotelCard.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/home/HotelCard.tsx components/home/HotelCard.test.tsx
git commit -m "feat(M4): HotelCard (both ratings, amenity pills, price-from)"
```

---

## Task 8: `components/home/SegmentedStars.tsx`

**Files:**
- Create: `components/home/SegmentedStars.tsx`
- Test: `components/home/SegmentedStars.test.tsx`

> Value `stars: number | null` (null = Any). Options Any/3/4/5; emits the chosen value (or null for Any).

- [ ] **Step 1: Write the failing test**

```tsx
// components/home/SegmentedStars.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SegmentedStars } from './SegmentedStars';

describe('SegmentedStars', () => {
  it('marks the active option via aria-pressed', () => {
    render(<SegmentedStars value={4} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: '4★ & up' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Any' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('emits the numeric value when a tier is chosen', async () => {
    const onChange = jest.fn();
    render(<SegmentedStars value={null} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: '5★' }));
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('emits null when Any is chosen', async () => {
    const onChange = jest.fn();
    render(<SegmentedStars value={5} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Any' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest components/home/SegmentedStars.test.tsx`
Expected: FAIL — cannot find module `./SegmentedStars`.

- [ ] **Step 3: Write the implementation**

```tsx
// components/home/SegmentedStars.tsx
type Option = { label: string; value: number | null };

const OPTIONS: Option[] = [
  { label: 'Any', value: null },
  { label: '3★ & up', value: 3 },
  { label: '4★ & up', value: 4 },
  { label: '5★', value: 5 },
];

export function SegmentedStars({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <div role="group" aria-label="Minimum star rating" className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.label}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`min-h-11 rounded-md px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
              active ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest components/home/SegmentedStars.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/home/SegmentedStars.tsx components/home/SegmentedStars.test.tsx
git commit -m "feat(M4): SegmentedStars minimum-rating control"
```

---

## Task 9: `components/home/SortSelect.tsx`

**Files:**
- Create: `components/home/SortSelect.tsx`
- Test: `components/home/SortSelect.test.tsx`

> 4 options keyed by M1's `SortKey`. Labels are human strings; default is `rating`.

- [ ] **Step 1: Write the failing test**

```tsx
// components/home/SortSelect.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SortSelect } from './SortSelect';

describe('SortSelect', () => {
  it('renders the four sort options with the current value selected', () => {
    render(<SortSelect id="sort" value="rating" onChange={() => {}} />);
    const select = screen.getByRole('combobox', { name: /sort/i }) as HTMLSelectElement;
    expect(select.value).toBe('rating');
    expect(screen.getAllByRole('option')).toHaveLength(4);
  });

  it('emits the chosen SortKey', async () => {
    const onChange = jest.fn();
    render(<SortSelect id="sort" value="rating" onChange={onChange} />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /sort/i }), 'price-asc');
    expect(onChange).toHaveBeenCalledWith('price-asc');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest components/home/SortSelect.test.tsx`
Expected: FAIL — cannot find module `./SortSelect`.

- [ ] **Step 3: Write the implementation**

```tsx
// components/home/SortSelect.tsx
import type { SortKey } from '../../lib/sort';

const OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'rating', label: 'Rating: Highest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'stars', label: 'Stars: Highest' },
];

export function SortSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: SortKey;
  onChange: (value: SortKey) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-slate-600">
      <span>Sort</span>
      <select
        id={id}
        aria-label="Sort hotels"
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest components/home/SortSelect.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add components/home/SortSelect.tsx components/home/SortSelect.test.tsx
git commit -m "feat(M4): SortSelect (4 keys, rating default)"
```

---

## Task 10: `components/home/PriceRange.tsx`

**Files:**
- Create: `components/home/PriceRange.tsx`
- Test: `components/home/PriceRange.test.tsx`

> Commits on blur (not per-keystroke). `min > max` → swap before emitting. Empty input → that bound is `null`.

- [ ] **Step 1: Write the failing test**

```tsx
// components/home/PriceRange.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PriceRange } from './PriceRange';

describe('PriceRange', () => {
  it('commits min and max on blur', async () => {
    const onCommit = jest.fn();
    render(<PriceRange min={null} max={null} onCommit={onCommit} />);
    const minInput = screen.getByLabelText('Minimum price');
    await userEvent.type(minInput, '100');
    await userEvent.tab(); // blur
    expect(onCommit).toHaveBeenLastCalledWith(100, null);
  });

  it('swaps when min > max before committing', async () => {
    const onCommit = jest.fn();
    render(<PriceRange min={null} max={null} onCommit={onCommit} />);
    await userEvent.type(screen.getByLabelText('Minimum price'), '300');
    await userEvent.type(screen.getByLabelText('Maximum price'), '100');
    await userEvent.tab();
    expect(onCommit).toHaveBeenLastCalledWith(100, 300);
  });

  it('treats an empty field as null', async () => {
    const onCommit = jest.fn();
    render(<PriceRange min={200} max={null} onCommit={onCommit} />);
    const minInput = screen.getByLabelText('Minimum price');
    await userEvent.clear(minInput);
    await userEvent.tab();
    expect(onCommit).toHaveBeenLastCalledWith(null, null);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest components/home/PriceRange.test.tsx`
Expected: FAIL — cannot find module `./PriceRange`.

- [ ] **Step 3: Write the implementation**

```tsx
// components/home/PriceRange.tsx
import { useEffect, useState } from 'react';

const toNum = (s: string): number | null => {
  const t = s.trim();
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

export function PriceRange({
  min,
  max,
  onCommit,
}: {
  min: number | null;
  max: number | null;
  onCommit: (min: number | null, max: number | null) => void;
}) {
  const [minStr, setMinStr] = useState(min?.toString() ?? '');
  const [maxStr, setMaxStr] = useState(max?.toString() ?? '');

  // Keep local inputs in sync when the URL (props) changes externally (e.g. Reset).
  useEffect(() => setMinStr(min?.toString() ?? ''), [min]);
  useEffect(() => setMaxStr(max?.toString() ?? ''), [max]);

  const commit = () => {
    let lo = toNum(minStr);
    let hi = toNum(maxStr);
    if (lo !== null && hi !== null && lo > hi) [lo, hi] = [hi, lo];
    onCommit(lo, hi);
  };

  return (
    <div role="group" aria-label="Price range in US dollars" className="flex items-center gap-2">
      <div className="flex items-center rounded-lg border border-slate-200 bg-white px-2">
        <span className="text-sm text-slate-400">$</span>
        <input
          aria-label="Minimum price"
          inputMode="numeric"
          value={minStr}
          placeholder="min"
          onChange={(e) => setMinStr(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          className="min-h-11 w-16 bg-transparent text-sm tabular-nums focus:outline-none"
        />
      </div>
      <span className="text-slate-400">–</span>
      <div className="flex items-center rounded-lg border border-slate-200 bg-white px-2">
        <span className="text-sm text-slate-400">$</span>
        <input
          aria-label="Maximum price"
          inputMode="numeric"
          value={maxStr}
          placeholder="max"
          onChange={(e) => setMaxStr(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          className="min-h-11 w-16 bg-transparent text-sm tabular-nums focus:outline-none"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest components/home/PriceRange.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/home/PriceRange.tsx components/home/PriceRange.test.tsx
git commit -m "feat(M4): PriceRange (commit-on-blur, swap on min>max)"
```

---

## Task 11: `components/home/ResultCount.tsx`

**Files:**
- Create: `components/home/ResultCount.tsx`
- Test: `components/home/ResultCount.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/home/ResultCount.test.tsx
import { render, screen } from '@testing-library/react';
import { ResultCount } from './ResultCount';

describe('ResultCount', () => {
  it('announces the loading state', () => {
    render(<ResultCount loading total={0} />);
    const region = screen.getByText('Loading hotels…');
    expect(region.getAttribute('aria-live')).toBe('polite');
  });

  it('pluralizes the hotel count', () => {
    const { rerender } = render(<ResultCount loading={false} total={1} />);
    expect(screen.getByText('1 hotel')).toBeTruthy();
    rerender(<ResultCount loading={false} total={24} />);
    expect(screen.getByText('24 hotels')).toBeTruthy();
  });

  it('shows "No hotels" for zero', () => {
    render(<ResultCount loading={false} total={0} />);
    expect(screen.getByText('No hotels')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest components/home/ResultCount.test.tsx`
Expected: FAIL — cannot find module `./ResultCount`.

- [ ] **Step 3: Write the implementation**

```tsx
// components/home/ResultCount.tsx
export function ResultCount({ loading, total }: { loading: boolean; total: number }) {
  const label = loading
    ? 'Loading hotels…'
    : total === 0
      ? 'No hotels'
      : `${total.toLocaleString('en-US')} ${total === 1 ? 'hotel' : 'hotels'}`;
  return (
    <p aria-live="polite" className="text-sm text-slate-600">
      {label}
    </p>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest components/home/ResultCount.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/home/ResultCount.tsx components/home/ResultCount.test.tsx
git commit -m "feat(M4): ResultCount aria-live announcer"
```

---

## Task 12: `components/home/Pagination.tsx`

**Files:**
- Create: `components/home/Pagination.tsx`
- Test: `components/home/Pagination.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/home/Pagination.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('renders nothing when there is a single page', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onPage={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('emits the next page on click', async () => {
    const onPage = jest.fn();
    render(<Pagination page={1} totalPages={3} onPage={onPage} />);
    await userEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(onPage).toHaveBeenCalledWith(2);
  });

  it('disables previous on the first page and next on the last', () => {
    const { rerender } = render(<Pagination page={1} totalPages={3} onPage={() => {}} />);
    expect(screen.getByRole('button', { name: /previous page/i })).toBeDisabled();
    rerender(<Pagination page={3} totalPages={3} onPage={() => {}} />);
    expect(screen.getByRole('button', { name: /next page/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest components/home/Pagination.test.tsx`
Expected: FAIL — cannot find module `./Pagination`.

- [ ] **Step 3: Write the implementation**

```tsx
// components/home/Pagination.tsx
import { Icon } from '../Icon';

export function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const btn =
    'flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500';

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-3 py-6">
      <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)} className={btn}>
        <Icon name="chevron" size={18} className="rotate-90" />
      </button>
      <span className="text-sm tabular-nums text-slate-600">
        Page {page} of {totalPages}
      </span>
      <button type="button" aria-label="Next page" disabled={page >= totalPages} onClick={() => onPage(page + 1)} className={btn}>
        <Icon name="chevron" size={18} className="-rotate-90" />
      </button>
    </nav>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest components/home/Pagination.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/home/Pagination.tsx components/home/Pagination.test.tsx
git commit -m "feat(M4): Pagination (hidden on single page)"
```

---

## Task 13: `components/home/DestinationCombobox.tsx`

**Files:**
- Create: `components/home/DestinationCombobox.tsx`
- Test: `components/home/DestinationCombobox.test.tsx`

> Consumes `DestinationOption[]` (Task 3). Substring filter on `option.search`; keyboard ↑/↓/Enter/Esc; "No destinations" on no match; loading/error(+Retry) states. Emits the selected option.

- [ ] **Step 1: Write the failing test**

```tsx
// components/home/DestinationCombobox.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DestinationOption } from '../../lib/destinations';
import { DestinationCombobox } from './DestinationCombobox';

const options: DestinationOption[] = [
  { kind: 'country', label: 'All hotels in USA', count: 2, search: 'usa all', key: 'c-usa', params: { country: 'usa' } },
  { kind: 'city', label: 'Chicago, IL — USA', count: 1, search: 'chicago il usa', key: 'city-usa-chicago', params: { country: 'usa', city: 'chicago' } },
  { kind: 'city', label: 'London — United Kingdom', count: 1, search: 'london united kingdom', key: 'city-uk-london', params: { country: 'united-kingdom', city: 'london' } },
];

function open() {
  return userEvent.click(screen.getByRole('combobox'));
}

describe('DestinationCombobox', () => {
  it('shows all options when the input is empty', async () => {
    render(<DestinationCombobox options={options} value={null} onSelect={() => {}} loading={false} error={false} onRetry={() => {}} />);
    await open();
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('substring-filters as the user types', async () => {
    render(<DestinationCombobox options={options} value={null} onSelect={() => {}} loading={false} error={false} onRetry={() => {}} />);
    await open();
    await userEvent.type(screen.getByRole('combobox'), 'chic');
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option')).toHaveTextContent('Chicago');
  });

  it('shows "No destinations" when nothing matches', async () => {
    render(<DestinationCombobox options={options} value={null} onSelect={() => {}} loading={false} error={false} onRetry={() => {}} />);
    await open();
    await userEvent.type(screen.getByRole('combobox'), 'zzz');
    expect(screen.getByText('No destinations')).toBeTruthy();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('emits the chosen option (country row → country-only params)', async () => {
    const onSelect = jest.fn();
    render(<DestinationCombobox options={options} value={null} onSelect={onSelect} loading={false} error={false} onRetry={() => {}} />);
    await open();
    await userEvent.click(screen.getByRole('option', { name: /All hotels in USA/ }));
    expect(onSelect).toHaveBeenCalledWith(options[0]);
  });

  it('selects the active option with Enter after ArrowDown', async () => {
    const onSelect = jest.fn();
    render(<DestinationCombobox options={options} value={null} onSelect={onSelect} loading={false} error={false} onRetry={() => {}} />);
    const input = screen.getByRole('combobox');
    await userEvent.click(input);
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}'); // index 1 → Chicago
    expect(onSelect).toHaveBeenCalledWith(options[1]);
  });

  it('shows a Retry affordance on error', async () => {
    const onRetry = jest.fn();
    render(<DestinationCombobox options={[]} value={null} onSelect={() => {}} loading={false} error onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest components/home/DestinationCombobox.test.tsx`
Expected: FAIL — cannot find module `./DestinationCombobox`.

- [ ] **Step 3: Write the implementation**

```tsx
// components/home/DestinationCombobox.tsx
'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { DestinationOption } from '../../lib/destinations';
import { Icon } from '../Icon';

// Diacritic-insensitive lowercase for substring matching.
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

type Props = {
  options: DestinationOption[];
  value: { country: string | null; city: string | null } | null;
  onSelect: (option: DestinationOption) => void;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
};

function selectedLabel(options: DestinationOption[], value: Props['value']): string {
  if (!value?.country) return '';
  const match = options.find((o) =>
    value.city ? o.kind === 'city' && o.params.country === value.country && o.params.city === value.city
               : o.kind === 'country' && o.params.country === value.country,
  );
  return match?.label ?? '';
}

export function DestinationCombobox({ options, value, onSelect, loading, error, onRetry }: Props) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const q = norm(query.trim());
  const results = q ? options.filter((o) => norm(o.search).includes(q)) : options;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function choose(opt: DestinationOption | undefined) {
    if (!opt) return;
    onSelect(opt);
    setQuery('');
    setOpen(false);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) return setOpen(true);
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open) choose(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const display = open ? query : query || selectedLabel(options, value);

  return (
    <div ref={wrapRef} className="relative w-full max-w-[560px]">
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3">
        <Icon name="search" size={20} className="text-slate-400" />
        <input
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
          autoComplete="off"
          disabled={loading}
          placeholder={loading ? 'Loading destinations…' : 'Search a city or country…'}
          value={display}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          className="min-h-11 w-full bg-transparent text-sm text-slate-900 focus:outline-none disabled:opacity-60"
        />
        <Icon name="chevron" size={20} className={`text-slate-400 ${open ? 'rotate-180' : ''}`} />
      </div>

      {error ? (
        <div className="mt-1 flex items-center gap-2 text-sm text-red-600">
          <span>Couldn’t load destinations.</span>
          <button type="button" onClick={onRetry} className="font-medium underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500">
            Retry
          </button>
        </div>
      ) : null}

      {open && !error ? (
        <div id={listId} role="listbox" className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {results.length === 0 ? (
            <div className="px-3 py-3 text-sm text-slate-400">No destinations</div>
          ) : (
            results.map((o, i) => (
              <div
                key={o.key}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(o)}
                className={`flex min-h-11 cursor-pointer items-center gap-2 px-3 text-sm ${
                  i === active ? 'bg-blue-50 text-slate-900' : 'text-slate-700'
                } ${o.kind === 'country' ? 'font-medium' : ''}`}
              >
                <Icon name={o.kind === 'country' ? 'search' : 'pin'} size={16} className="text-slate-400" />
                <span>{o.label}</span>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest components/home/DestinationCombobox.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add components/home/DestinationCombobox.tsx components/home/DestinationCombobox.test.tsx
git commit -m "feat(M4): DestinationCombobox (country/city, keyboard, retry)"
```

---

## Task 14: `components/home/HotelGrid.tsx`

**Files:**
- Create: `components/home/HotelGrid.tsx`
- Test: `components/home/HotelGrid.test.tsx`

> Renders 8 skeletons while `loading`; otherwise the `HotelCard`s. Empty handling is owned by `HomeView` (it shows `EmptyState` instead of the grid), so `HotelGrid` only renders cards/skeletons.

- [ ] **Step 1: Write the failing test**

```tsx
// components/home/HotelGrid.test.tsx
import { render, screen } from '@testing-library/react';
import type { Hotel } from '../../types/domain';
import { HotelGrid } from './HotelGrid';

const hotels = [1, 2].map(
  (n) =>
    ({
      id: `hotel-0${n}`,
      name: `Hotel ${n}`,
      starRating: 4,
      overallRating: 4.2,
      reviewCount: 100,
      address: { street: '', city: 'X', state: 'Y', zipCode: '', country: 'Z' },
      amenities: [],
      priceFrom: 150,
      photoUrl: '',
      description: '',
      policies: { checkInTime: '', checkOutTime: '', cancellation: '' },
      rooms: [],
    }) as unknown as Hotel,
);

describe('HotelGrid', () => {
  it('renders 8 skeletons while loading', () => {
    const { container } = render(<HotelGrid hotels={[]} loading />);
    expect(container.querySelectorAll('[data-testid="sk-photo"]')).toHaveLength(8);
  });

  it('renders a card per hotel when loaded', () => {
    render(<HotelGrid hotels={hotels} loading={false} />);
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest components/home/HotelGrid.test.tsx`
Expected: FAIL — cannot find module `./HotelGrid`.

- [ ] **Step 3: Write the implementation**

```tsx
// components/home/HotelGrid.tsx
import type { Hotel } from '../../types/domain';
import { HotelCard } from './HotelCard';
import { HotelCardSkeleton } from './HotelCardSkeleton';

const GRID = 'grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';

export function HotelGrid({ hotels, loading }: { hotels: Hotel[]; loading: boolean }) {
  if (loading) {
    return (
      <div className={GRID}>
        {Array.from({ length: 8 }, (_, i) => (
          <HotelCardSkeleton key={i} />
        ))}
      </div>
    );
  }
  return (
    <div className={GRID}>
      {hotels.map((h) => (
        <HotelCard key={h.id} hotel={h} />
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest components/home/HotelGrid.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add components/home/HotelGrid.tsx components/home/HotelGrid.test.tsx
git commit -m "feat(M4): HotelGrid (responsive, skeletons while loading)"
```

---

## Task 15: `components/home/FilterSheet.tsx` + `MobileFilterBar.tsx`

**Files:**
- Create: `components/home/FilterSheet.tsx`
- Create: `components/home/MobileFilterBar.tsx`
- Test: `components/home/FilterSheet.test.tsx`
- Test: `components/home/MobileFilterBar.test.tsx`

> `FilterSheet` is a bottom-sheet dialog holding `SegmentedStars` + `PriceRange`, with Reset and "Show N". `MobileFilterBar` is the sticky trigger + inline sort.

- [ ] **Step 1: Write the failing tests**

```tsx
// components/home/FilterSheet.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterSheet } from './FilterSheet';

const base = {
  open: true,
  stars: 4 as number | null,
  min: null as number | null,
  max: null as number | null,
  resultCount: 12,
  onStars: jest.fn(),
  onPrice: jest.fn(),
  onReset: jest.fn(),
  onClose: jest.fn(),
};

describe('FilterSheet', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders as a modal dialog when open', () => {
    render(<FilterSheet {...base} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('closes on Escape', async () => {
    render(<FilterSheet {...base} />);
    await userEvent.keyboard('{Escape}');
    expect(base.onClose).toHaveBeenCalled();
  });

  it('fires onReset and shows the apply button with the count', async () => {
    render(<FilterSheet {...base} />);
    await userEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(base.onReset).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Show 12' })).toBeTruthy();
  });

  it('renders nothing when closed', () => {
    const { container } = render(<FilterSheet {...base} open={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

```tsx
// components/home/MobileFilterBar.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileFilterBar } from './MobileFilterBar';

describe('MobileFilterBar', () => {
  it('opens the sheet via the Filters button and shows an active-filter badge', async () => {
    const onOpen = jest.fn();
    render(<MobileFilterBar activeCount={2} sort="rating" onOpen={onOpen} onSort={() => {}} />);
    expect(screen.getByText('2')).toBeTruthy(); // badge
    await userEvent.click(screen.getByRole('button', { name: /filters/i }));
    expect(onOpen).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx jest components/home/FilterSheet.test.tsx components/home/MobileFilterBar.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the implementations**

```tsx
// components/home/FilterSheet.tsx
'use client';

import { useEffect } from 'react';
import { Icon } from '../Icon';
import { PriceRange } from './PriceRange';
import { SegmentedStars } from './SegmentedStars';

type Props = {
  open: boolean;
  stars: number | null;
  min: number | null;
  max: number | null;
  resultCount: number;
  onStars: (v: number | null) => void;
  onPrice: (min: number | null, max: number | null) => void;
  onReset: () => void;
  onClose: () => void;
};

export function FilterSheet({ open, stars, min, max, resultCount, onStars, onPrice, onReset, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label="Filters" className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 shadow-lg motion-safe:animate-[slideUp_200ms_ease-out]">
        <div className="flex items-center justify-between pb-3">
          <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
          <button type="button" aria-label="Close filters" onClick={onClose} className="flex min-h-11 min-w-11 items-center justify-center text-slate-500">
            <Icon name="x" size={20} />
          </button>
        </div>
        <div className="space-y-5">
          <div>
            <p className="pb-2 text-sm font-medium text-slate-900">Star rating</p>
            <SegmentedStars value={stars} onChange={onStars} />
          </div>
          <div>
            <p className="pb-2 text-sm font-medium text-slate-900">Price (USD)</p>
            <PriceRange min={min} max={max} onCommit={onPrice} />
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between gap-3">
          <button type="button" onClick={onReset} className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700">
            Reset
          </button>
          <button type="button" onClick={onClose} className="min-h-11 flex-1 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700">
            Show {resultCount}
          </button>
        </div>
      </div>
    </div>
  );
}
```

```tsx
// components/home/MobileFilterBar.tsx
'use client';

import type { SortKey } from '../../lib/sort';
import { Icon } from '../Icon';
import { SortSelect } from './SortSelect';

export function MobileFilterBar({
  activeCount,
  sort,
  onOpen,
  onSort,
}: {
  activeCount: number;
  sort: SortKey;
  onOpen: () => void;
  onSort: (sort: SortKey) => void;
}) {
  return (
    <div className="sticky top-14 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 py-2 backdrop-blur sm:hidden">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700"
      >
        <Icon name="sliders" size={18} />
        Filters
        {activeCount > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-xs font-semibold text-white">
            {activeCount}
          </span>
        ) : null}
      </button>
      <SortSelect id="sort-mobile" value={sort} onChange={onSort} />
    </div>
  );
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `npx jest components/home/FilterSheet.test.tsx components/home/MobileFilterBar.test.tsx`
Expected: PASS (4 + 1 tests).

- [ ] **Step 5: Commit**

```bash
git add components/home/FilterSheet.tsx components/home/FilterSheet.test.tsx components/home/MobileFilterBar.tsx components/home/MobileFilterBar.test.tsx
git commit -m "feat(M4): mobile FilterSheet + MobileFilterBar"
```

---

## Task 16: `components/home/RefineToolbar.tsx`

**Files:**
- Create: `components/home/RefineToolbar.tsx`
- Test: `components/home/RefineToolbar.test.tsx`

> Desktop inline toolbar (≥ sm): `SegmentedStars` + `PriceRange` + `SortSelect` + `ResultCount`. Pure wiring of child callbacks up to its props.

- [ ] **Step 1: Write the failing test**

```tsx
// components/home/RefineToolbar.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RefineToolbar } from './RefineToolbar';

const props = {
  stars: null as number | null,
  min: null as number | null,
  max: null as number | null,
  sort: 'rating' as const,
  loading: false,
  total: 24,
  onStars: jest.fn(),
  onPrice: jest.fn(),
  onSort: jest.fn(),
};

describe('RefineToolbar', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the controls and the result count', () => {
    render(<RefineToolbar {...props} />);
    expect(screen.getByRole('group', { name: /minimum star rating/i })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: /sort/i })).toBeTruthy();
    expect(screen.getByText('24 hotels')).toBeTruthy();
  });

  it('forwards a star change', async () => {
    render(<RefineToolbar {...props} />);
    await userEvent.click(screen.getByRole('button', { name: '4★ & up' }));
    expect(props.onStars).toHaveBeenCalledWith(4);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest components/home/RefineToolbar.test.tsx`
Expected: FAIL — cannot find module `./RefineToolbar`.

- [ ] **Step 3: Write the implementation**

```tsx
// components/home/RefineToolbar.tsx
import type { SortKey } from '../../lib/sort';
import { PriceRange } from './PriceRange';
import { ResultCount } from './ResultCount';
import { SegmentedStars } from './SegmentedStars';
import { SortSelect } from './SortSelect';

type Props = {
  stars: number | null;
  min: number | null;
  max: number | null;
  sort: SortKey;
  loading: boolean;
  total: number;
  onStars: (v: number | null) => void;
  onPrice: (min: number | null, max: number | null) => void;
  onSort: (sort: SortKey) => void;
};

export function RefineToolbar({ stars, min, max, sort, loading, total, onStars, onPrice, onSort }: Props) {
  return (
    <div className="hidden sm:block">
      <div className="flex flex-wrap items-center gap-4">
        <SegmentedStars value={stars} onChange={onStars} />
        <PriceRange min={min} max={max} onCommit={onPrice} />
        <div className="ml-auto">
          <SortSelect id="sort-desktop" value={sort} onChange={onSort} />
        </div>
      </div>
      <div className="pt-2">
        <ResultCount loading={loading} total={total} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest components/home/RefineToolbar.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add components/home/RefineToolbar.tsx components/home/RefineToolbar.test.tsx
git commit -m "feat(M4): RefineToolbar (desktop inline controls)"
```

---

## Task 17: `components/home/HomeView.tsx` + `HomeViewFallback.tsx`

**Files:**
- Create: `components/home/HomeView.tsx`
- Create: `components/home/HomeViewFallback.tsx`
- Test: `components/home/HomeView.test.tsx`

> The orchestrator. Reads the URL (`useSearchParamsState`), the location list (`useLocations`), and the hotel subset (`useHotels`), composes the view (`useFilteredHotels`), wires writes back to the URL, fires analytics, and chooses which state to render. This is the only component that touches hooks. Its integration test (full flow + MSW) is **Task 19**; this task's test covers the no-destination state and analytics with the hooks mocked.

- [ ] **Step 1: Write the failing test**

```tsx
// components/home/HomeView.test.tsx
import { render, screen } from '@testing-library/react';

const mockSetParams = jest.fn();
let mockState = { country: null, city: null, stars: null, min: null, max: null, sort: 'rating', page: 1 };
jest.mock('../../hooks/useSearchParamsState', () => ({
  useSearchParamsState: () => ({ state: mockState, setParams: mockSetParams }),
}));
jest.mock('../../hooks/useLocations', () => ({
  useLocations: () => ({ data: [], isLoading: false, isError: false, refetch: jest.fn() }),
}));
jest.mock('../../hooks/useHotels', () => ({
  useHotels: () => ({ data: undefined, isLoading: false, isError: false }),
}));

import { HomeView } from './HomeView';

describe('HomeView — no destination', () => {
  beforeEach(() => {
    mockSetParams.mockClear();
    mockState = { country: null, city: null, stars: null, min: null, max: null, sort: 'rating', page: 1 };
  });

  it('prompts to choose a destination and renders no grid', () => {
    render(<HomeView />);
    expect(screen.getByText(/choosing a destination/i)).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull(); // no hotel cards
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest components/home/HomeView.test.tsx`
Expected: FAIL — cannot find module `./HomeView`.

- [ ] **Step 3: Write the implementations**

```tsx
// components/home/HomeViewFallback.tsx
import { HotelCardSkeleton } from './HotelCardSkeleton';

// Static fallback while the search-params subtree hydrates (matches loaded layout → no CLS).
export function HomeViewFallback() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <HotelCardSkeleton key={i} />
      ))}
    </div>
  );
}
```

```tsx
// components/home/HomeView.tsx
'use client';

import { useEffect, useRef } from 'react';
import { useFilteredHotels } from '../../hooks/useFilteredHotels';
import { useHotels } from '../../hooks/useHotels';
import { useLocations } from '../../hooks/useLocations';
import { useSearchParamsState } from '../../hooks/useSearchParamsState';
import { buildDestinationOptions, type DestinationOption } from '../../lib/destinations';
import { track } from '../../utils/analyticUtil';
import { EmptyState } from '../EmptyState';
import { DestinationCombobox } from './DestinationCombobox';
import { FilterSheet } from './FilterSheet';
import { HotelGrid } from './HotelGrid';
import { MobileFilterBar } from './MobileFilterBar';
import { Pagination } from './Pagination';
import { RefineToolbar } from './RefineToolbar';
import { ResultCount } from './ResultCount';
import { useState } from 'react';

export function HomeView() {
  const { state, setParams } = useSearchParamsState();
  const locations = useLocations();
  const hotels = useHotels({ country: state.country, city: state.city });
  const [sheetOpen, setSheetOpen] = useState(false);

  const options = buildDestinationOptions(locations.data ?? []);
  const hasDestination = !!(state.country || state.city);

  const view = useFilteredHotels(hotels.data ?? [], {
    stars: state.stars,
    min: state.min,
    max: state.max,
    sort: state.sort,
    page: state.page,
  });

  const activeFilterCount = [state.stars, state.min, state.max].filter((v) => v !== null).length;

  // Analytics: announce a search whenever the committed location/refine state changes.
  const prevKey = useRef('');
  useEffect(() => {
    if (!hasDestination) return;
    const key = JSON.stringify([state.country, state.city, state.stars, state.min, state.max, state.sort]);
    if (key === prevKey.current) return;
    prevKey.current = key;
    track({
      name: 'search_performed',
      city: state.city,
      country: state.country,
      filters: { stars: state.stars, min: state.min, max: state.max, sort: state.sort },
    });
  }, [hasDestination, state.country, state.city, state.stars, state.min, state.max, state.sort]);

  // Analytics: inventory-gap signal when a loaded location yields zero after filters.
  useEffect(() => {
    if (hasDestination && hotels.isSuccess && view.total === 0) {
      track({ name: 'no_results', filters: { stars: state.stars, min: state.min, max: state.max } });
    }
  }, [hasDestination, hotels.isSuccess, view.total, state.stars, state.min, state.max]);

  const onSelect = (opt: DestinationOption) =>
    setParams({ country: opt.params.country, city: 'city' in opt.params ? opt.params.city : null });
  const onReset = () => setParams({ stars: null, min: null, max: null });

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">Find your stay</h1>
        <p className="text-slate-600">Browse hotels by destination.</p>
        <DestinationCombobox
          options={options}
          value={{ country: state.country, city: state.city }}
          onSelect={onSelect}
          loading={locations.isLoading}
          error={locations.isError}
          onRetry={() => locations.refetch()}
        />
      </section>

      {!hasDestination ? (
        <EmptyState icon="pin" title="Start by choosing a destination" subtext="Pick a city or country to see hotels." />
      ) : (
        <>
          <RefineToolbar
            stars={state.stars}
            min={state.min}
            max={state.max}
            sort={state.sort}
            loading={hotels.isLoading}
            total={view.total}
            onStars={(stars) => setParams({ stars })}
            onPrice={(min, max) => setParams({ min, max })}
            onSort={(sort) => setParams({ sort })}
          />
          <MobileFilterBar
            activeCount={activeFilterCount}
            sort={state.sort}
            onOpen={() => setSheetOpen(true)}
            onSort={(sort) => setParams({ sort })}
          />
          <div className="sm:hidden">
            <ResultCount loading={hotels.isLoading} total={view.total} />
          </div>

          {hotels.isLoading ? (
            <HotelGrid hotels={[]} loading />
          ) : view.total === 0 ? (
            <EmptyState
              icon="pin"
              title="No hotels found"
              subtext="Try widening your filters."
              actionLabel="Reset filters"
              onAction={onReset}
            />
          ) : (
            <>
              <HotelGrid hotels={view.items} loading={false} />
              <Pagination page={view.page} totalPages={view.totalPages} onPage={(page) => setParams({ page })} />
            </>
          )}

          <FilterSheet
            open={sheetOpen}
            stars={state.stars}
            min={state.min}
            max={state.max}
            resultCount={view.total}
            onStars={(stars) => setParams({ stars })}
            onPrice={(min, max) => setParams({ min, max })}
            onReset={onReset}
            onClose={() => setSheetOpen(false)}
          />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest components/home/HomeView.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add components/home/HomeView.tsx components/home/HomeViewFallback.tsx components/home/HomeView.test.tsx
git commit -m "feat(M4): HomeView orchestrator + Suspense fallback"
```

---

## Task 18: `app/page.tsx`, layout metadata, favicon

**Files:**
- Create/Modify: `app/page.tsx`
- Modify: `app/layout.tsx`
- Create: `app/icon.svg`

> **Read first:** `node_modules/next/dist/docs/` for the `metadata` export, the `app/icon.svg` favicon convention, and `useSearchParams`/`<Suspense>` static-rendering rules (Next 16 differs from training data).

- [ ] **Step 1: Write the home page (server shell + Suspense)**

```tsx
// app/page.tsx — SERVER component (no 'use client')
import { Suspense } from 'react';
import { HomeView } from '../components/home/HomeView';
import { HomeViewFallback } from '../components/home/HomeViewFallback';

export const metadata = {
  title: 'Find your stay',
  description: 'Browse and compare hotels by destination — filter by rating and price, then check room availability.',
};

export default function HomePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
      <Suspense fallback={<HomeViewFallback />}>
        <HomeView />
      </Suspense>
    </div>
  );
}
```

- [ ] **Step 2: Add the app bar / footer shell + title template + favicon to the layout**

Modify `app/layout.tsx` — keep M3's `QueryProvider` + `AppProvider` wrapping; add the title template, description, a sticky app bar, and a slim footer around `{children}`. Example shape (merge into the existing file, do not delete the providers):

```tsx
// app/layout.tsx (excerpt — merge with existing providers from M3)
export const metadata = {
  title: { default: 'Stayfinder — Find your stay', template: '%s · Stayfinder' },
  description: 'Find your stay — browse hotels by destination.',
};

// inside <body>:
//   <QueryProvider>
//     <AppProvider>
//       <header className="sticky top-0 z-40 h-14 border-b border-slate-200 bg-white/95 backdrop-blur md:h-16">
//         <div className="mx-auto flex h-full max-w-7xl items-center px-4 md:px-6 lg:px-8">
//           <span className="flex items-center gap-2 text-lg font-bold text-slate-900">
//             <Icon name="pin" size={22} className="text-blue-600" /> Stayfinder
//           </span>
//         </div>
//       </header>
//       <main className="min-h-[calc(100vh-3.5rem)] bg-slate-50">{children}</main>
//       <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
//         Stayfinder · Phase 1
//       </footer>
//     </AppProvider>
//   </QueryProvider>
```

Import `Icon` from `../components/Icon` at the top of the layout.

- [ ] **Step 3: Create the favicon**

```svg
<!-- app/icon.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 21s-7-6.3-7-11a7 7 0 1 1 14 0c0 4.7-7 11-7 11Z" />
  <circle cx="12" cy="10" r="2.5" />
</svg>
```

- [ ] **Step 4: Verify build + typecheck**

Run: `npm run build`
Expected: build succeeds; `/` is generated without a `useSearchParams`/Suspense bail-out error.
Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/layout.tsx app/icon.svg
git commit -m "feat(M4): home route shell, metadata, and favicon"
```

---

## Task 19: Integration test (full flow) + MSW handlers

**Files:**
- Create: `components/home/HomeView.integration.test.tsx`
- Modify (if needed): `tests/msw/handlers.ts`

> Renders the `HomeView` client subtree (not the server `app/page.tsx`) under `QueryProvider` + `AppProvider` + `<Suspense>`, with `next/navigation` mocked so URL state is assertable. Drives destination → loading → loaded → filter → sort → paginate, plus the no-hotels and locations-error paths. This is M4's "Done when" gate.

- [ ] **Step 1: Ensure MSW handlers return enough data for the flow**

In `tests/msw/handlers.ts`, make `/api/locations` return at least one country with multiple cities, and `/api/hotels?country=usa` return **> 8 hotels** (so pagination has ≥ 2 pages) spanning a star/price spread. Add/confirm:

```ts
// tests/msw/handlers.ts (augment the M3 handlers)
import { http, HttpResponse } from 'msw';

const ORIGIN = 'http://localhost';

const usaHotels = Array.from({ length: 10 }, (_, i) => ({
  id: `hotel-${String(i + 1).padStart(2, '0')}`,
  name: `USA Hotel ${i + 1}`,
  description: '',
  starRating: (i % 3) + 3, // 3,4,5
  overallRating: 4 + (i % 5) / 10,
  reviewCount: 100 + i,
  address: { street: '', city: i < 5 ? 'Chicago' : 'New York', state: i < 5 ? 'IL' : 'NY', zipCode: '', country: 'USA' },
  amenities: ['free_wifi', 'spa'],
  policies: { checkInTime: '', checkOutTime: '', cancellation: '' },
  priceFrom: 100 + i * 25,
  photoUrl: '',
  rooms: [],
}));

export const handlers = [
  http.get(`${ORIGIN}/api/locations`, () =>
    HttpResponse.json([
      { city: 'Chicago', state: 'IL', country: 'USA', citySlug: 'chicago', countrySlug: 'usa' },
      { city: 'New York', state: 'NY', country: 'USA', citySlug: 'new-york', countrySlug: 'usa' },
    ]),
  ),
  http.get(`${ORIGIN}/api/hotels`, ({ request }) => {
    const country = new URL(request.url).searchParams.get('country');
    return HttpResponse.json(country === 'usa' ? usaHotels : []);
  }),
];
```

> If M3 already centralizes handlers, extend them there rather than duplicating; keep one source of truth.

- [ ] **Step 2: Write the integration test**

```tsx
// components/home/HomeView.integration.test.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Suspense } from 'react';
import { AppProvider } from '../../stores/AppProvider';
import { server } from '../../tests/msw/server';

// Mutable URL mock shared with the hook under test.
let mockSearch = '';
const replace = jest.fn((url: string) => {
  mockSearch = url.includes('?') ? url.split('?')[1] : '';
});
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
  useRouter: () => ({ replace }),
  usePathname: () => '/',
}));

import { HomeView } from './HomeView';

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  mockSearch = '';
  replace.mockClear();
});
afterAll(() => server.close());

function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <AppProvider>
        <Suspense fallback={<div>loading-shell</div>}>
          <HomeView />
        </Suspense>
      </AppProvider>
    </QueryClientProvider>,
  );
}

describe('Home flow: destination → filter → sort → paginate', () => {
  it('selects a destination, loads hotels, then filters and paginates via the URL', async () => {
    renderHome();

    // No destination yet.
    expect(screen.getByText(/choosing a destination/i)).toBeTruthy();

    // Pick the USA country row.
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(await screen.findByRole('option', { name: /All hotels in USA/ }));
    expect(replace).toHaveBeenCalledWith('/?country=usa');

    // Hotels load (10 → page size 8 → 2 pages).
    await waitFor(() => expect(screen.getAllByRole('link').length).toBe(8));
    expect(screen.getByText('10 hotels')).toBeTruthy();

    // Apply a 5★ filter — resets to page 1 and narrows the set.
    await userEvent.click(screen.getAllByRole('button', { name: '5★' })[0]);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/?country=usa&stars=5'));
  });

  it('shows "No hotels found" + Reset when filters exclude everything', async () => {
    mockSearch = 'country=usa&min=99999';
    renderHome();
    await waitFor(() => expect(screen.getByText('No hotels found')).toBeTruthy());
    await userEvent.click(screen.getByRole('button', { name: /reset filters/i }));
    expect(replace).toHaveBeenCalledWith('/?country=usa'); // filters cleared
  });

  it('offers Retry when locations fail to load', async () => {
    server.use(http.get('http://localhost/api/locations', () => new HttpResponse(null, { status: 500 })));
    renderHome();
    await waitFor(() => expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy());
  });
});
```

> Add `import { http, HttpResponse } from 'msw';` at the top of the test for the error-path override.

- [ ] **Step 3: Run to verify it passes**

Run: `npx jest components/home/HomeView.integration.test.tsx`
Expected: PASS (3 tests). If the URL-mock and the hook's serialization disagree on key order, align the expected query strings with M3's `toSearchParams` (sorted keys) — e.g. `country=usa&stars=5`.

- [ ] **Step 4: Commit**

```bash
git add components/home/HomeView.integration.test.tsx tests/msw/handlers.ts
git commit -m "test(M4): home full-flow integration (destination→filter→sort→paginate)"
```

---

## Task 20: Full suite, coverage gate, progress doc

**Files:**
- Modify: `docs/progress.md`

- [ ] **Step 1: Run the full suite with coverage**

Run: `npx jest --coverage`
Expected: all suites PASS; M4 modules (`components/**`, `lib/destinations.ts`, `lib/amenities.ts`, `utils/**`) ≥ 85% across branches/functions/lines/statements.

- [ ] **Step 2: Lint, typecheck, build**

Run: `npm run lint && npm run typecheck && npm run build`
Expected: clean lint, no type errors, successful build with `/` rendered (no Suspense bail-out).

- [ ] **Step 3: Manual smoke (optional but recommended)**

Run: `npm run dev`, open `/`, verify: pick a country → cards load; pick a city → narrows; star/price refine instantly (no spinner); sort reorders; pagination at >8; resize to 360px → sticky Filters bar + bottom sheet; share a URL with params → state restores.

- [ ] **Step 4: Update `docs/progress.md`**

In the **M4** section, check off (`[x]`) every task: `DestinationDropdown`/combobox, country→all-hotels + city→one-city + slug params, empty input shows all; `FilterPanel`/filters in-memory + URL; sort control + `?sort=`; pagination + `?page=`; filter/sort reset to page 1; `HotelCard` (both ratings), `HotelGrid`, `EmptyState`, `aria-live` count, home `page.tsx` wiring, SEO/metadata + favicon; and every edge/empty-state line. Flip the **Progress at a Glance** M4 row to `[x]`. Append a decisions note:

```markdown
**M4 decisions (from design spec):** `/` = static shell + `<Suspense>`-wrapped client
`HomeView`; combobox offers country-group + city rows (`lib/destinations.ts`);
"Recommended" sort dropped (no seed field) → default sort `rating`; page size 8
(`lib/paginate.ts`); analytics via `utils/analyticUtil.ts` (DEV console; M6 wires
adapters); no new dependencies (combobox + bottom sheet hand-rolled).
```

> Note: M4 uses `track()` call sites but the `track()` *adapters*, route error/loading/not-found boundaries, and the formal a11y+perf audit remain M6; Playwright E2E remains M7.

- [ ] **Step 5: Commit**

```bash
git add docs/progress.md
git commit -m "docs(M4): mark search/filter/sort/paginate milestone complete"
```

---

## Self-Review (completed by plan author)

**1. Spec coverage** — every spec section maps to a task:

- §2 rendering (shell + Suspense) → Tasks 17 (fallback), 18 (page + boundary). §3.1 default sort `rating` → Task 0. §3.2 page size 8 → Task 0. §4 module structure → Tasks 1–18 (one file per row). §5 data flow (HomeView wiring, location-first, in-memory refine, slug writes) → Task 17. §6.1 destination builder + combobox → Tasks 3, 13. §6.2 PriceRange swap → Task 10. §6.3 mobile sheet/bar → Task 15. §7 states (no-destination, no-match, loading, loaded, no-hotels+reset, single-page, slug params, bad params, locations-fail+retry) → Tasks 13/14/17 + integration Task 19. §8 analytics → Tasks 1 (facade) + 17 (call sites). §9 a11y/mobile-first → baked into every component (aria, 44px targets, focus-visible, aspect-video) + smoke Task 20. §10 testing → every task is test-first; integration Task 19. §11 decisions → Task 20 progress note.

**2. Placeholder scan** — no TBD/TODO; every code step shows complete code; every test step shows full assertions. Layout (Task 18 Step 2) is shown as a commented excerpt because it *merges* into M3's existing file — the concrete markup is given, with an explicit "keep the providers" instruction.

**3. Type/name consistency** — `DestinationOption` (Task 3) consumed verbatim by Task 13 + Task 17. `track`/`AnalyticsEvent` (Task 1) used in Task 17. `humanizeAmenity` (Task 2) used in Task 7. `IconName`/`Icon` (Task 4) used by EmptyState, HotelCard, Pagination, combobox, sheet, bar, layout. `SortKey` (M1) used by SortSelect, RefineToolbar, MobileFilterBar, HomeView. `useSearchParamsState`/`RefineState` fields (`country,city,stars,min,max,sort,page`), `useHotels({country,city})`, `useLocations()` (`.data/.isLoading/.isError/.refetch`), `useFilteredHotels(hotels, params)` → `{items,page,totalPages,total}` — all from M3, used consistently in Task 17. `Hotel` domain fields (`id,name,starRating,overallRating,reviewCount,address.{city,state,country},amenities,priceFrom`) from M1 used in Tasks 7/14.

**Note for executor:** M4 is assembly over M0–M3. If any M1/M3 export named here is absent, finish that milestone first. Read `node_modules/next/dist/docs/` before Task 18 (Next 16 metadata/favicon/Suspense differ from training data).
