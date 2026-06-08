# M6 — Cross-cutting: A11y · Observability · Boundaries · Perf — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the cross-cutting non-functional layer on top of M3–M5 — route-level error/loading/not-found **boundaries**, a vendor-free **pluggable `track()` adapter registry**, **enforceable a11y** (jest-axe) split from a documented manual audit, and a **measured perf budget** (one Jest-asserted metric + a recorded Lighthouse/bundle measurement).

**Architecture:** App Router special files (`app/error.tsx`, `app/global-error.tsx`, `app/loading.tsx`, `app/not-found.tsx`) own the cross-cutting failure/loading states; `utils/analyticUtil.ts` keeps M4's public `track(event)` signature but fans out to a registry of adapters (DEV console adapter by default, zero vendor adapters in P1); `jest-axe` asserts roles/labels/ARIA/structure in unit tests while contrast/focus/keyboard stay a documented audit; the in-memory filter budget (<100ms) is unit-asserted while Web Vitals + JS size are a recorded manual measurement. TDD throughout; this milestone's tests contribute to the M7 ≥85% gate.

**Tech Stack:** Next.js 16 (App Router special files, `unstable_retry`) + React 19 + TypeScript (strict), Tailwind v4, Jest 30 + `jest-fixed-jsdom` + React Testing Library + `@testing-library/user-event`, `jest-axe` (new dev-dep), optionally `@next/bundle-analyzer` (new dev-dep).

**Spec:** `docs/superpowers/specs/2026-06-08-m6-cross-cutting-design.md`

**Conventions for every task:** tests live under `tests/unit/` mirroring source (project rule — tests are **not** co-located; see `CLAUDE.md` "Test layout"); run a single test file with `npx jest <path>`; relative imports matching M1–M5; commit after each green task with conventional-commit prefixes. A component is `'use client'` only when it uses state/effects/hooks/handlers.

**Assumes M0–M5 are done.** This milestone modifies and audits artifacts built earlier:
- **M1:** `types/domain.ts` (`Hotel`, `Room`), `lib/filters.ts` (`filterByStars`, `filterByPrice`), `lib/sort.ts` (`sortHotels`, `SortKey`), `tests/fixtures.ts` (`makeHotel`, `makeRoom`).
- **M2:** structured API logs in the route handlers (confirmed, not rebuilt).
- **M3:** `QueryProvider` / `AppProvider` mounted in `app/layout.tsx`; `lib/fetcher.ts` (`ApiError`).
- **M4:** `app/page.tsx`, `utils/analyticUtil.ts` (the typed `track()` + `search_performed` / `no_results` events and call sites), the home `<Suspense>` boundary, `aria-live` `ResultCount`, the components `DestinationCombobox` / filter / sort / `HotelCard` / results grid.
- **M5:** `app/hotels/[id]/not-found.tsx`, `components/hotel/*` (`HotelHero`, `AmenitiesGrid`, `PoliciesList`, `RoomAvailability`, `DateField`, `RoomCard`), and the `hotel_viewed` / `availability_checked` / `no_rooms` events.

> **If a referenced M4/M5 export is missing at execution time, stop and complete that milestone first** — M6 is a layer on top of them. Tasks 1 and 6 touch M4/M5 files directly; Tasks 2–5, 7 are self-contained and runnable even if M4/M5 lag, but the milestone is only **done** once the a11y audit (Task 6) and measurement (Task 8) cover the real M4/M5 surfaces.

> **Next 16 caveat (AGENTS.md):** before Tasks 4–5 (`error.tsx`, `global-error.tsx`), read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md`. The recovery prop is **`unstable_retry()`** (preferred over `reset()`); `global-error.tsx` must render its own `<html>`/`<body>` and cannot export `metadata` (it's a Client Component) — use the React `<title>` component. Confirm exact prop names there before writing.

---

## File Map

| File | Responsibility |
| --- | --- |
| `package.json` | **(modify)** add `jest-axe` (+ `@types/jest-axe`) dev-deps; optionally `@next/bundle-analyzer` |
| `jest.setup.ts` | **(modify)** `expect.extend(toHaveNoViolations)` for jest-axe |
| `utils/analyticUtil.ts` | **(modify/reconcile)** registry behind unchanged `track()`; full `AnalyticsEvent` union; default DEV console adapter; `registerAnalyticsAdapter`, `__resetAnalyticsAdapters` |
| `app/not-found.tsx` | **(create)** server — global 404 + Browse hotels link |
| `app/loading.tsx` | **(create)** server — route-level skeleton shell |
| `app/error.tsx` | **(create)** `'use client'` — segment error boundary (`error`, `unstable_retry`) |
| `app/global-error.tsx` | **(create)** `'use client'` — root boundary, own `<html>`/`<body>` |
| `tests/unit/utils/analyticUtil.test.ts` | **(create)** registry fan-out, default adapter, isolation, types |
| `tests/unit/app/not-found.test.tsx` | **(create)** render 404 + link |
| `tests/unit/app/loading.test.tsx` | **(create)** render skeleton |
| `tests/unit/app/error.test.tsx` | **(create)** render + `unstable_retry` fires |
| `tests/unit/app/global-error.test.tsx` | **(create)** render own html/body + retry |
| `tests/unit/app/a11y.test.tsx` | **(create)** jest-axe no-violations on boundary components (+ M4/M5 compositions) |
| `tests/unit/lib/perf.test.ts` | **(create)** in-memory filter+sort < 100ms over a realistic subset |
| `next.config.ts` | **(modify, optional)** wrap with `@next/bundle-analyzer` for the JS-size measurement |
| `docs/progress.md` | **(modify)** check off M6 |
| `docs/superpowers/specs/2026-06-08-m6-cross-cutting-design.md` §5.2/§6.2 | **(modify)** record the manual a11y-audit checklist + perf numbers (Task 8) |

---

## Task 0: Add jest-axe and wire the matcher

**Files:**
- Modify: `package.json`
- Modify: `jest.setup.ts`
- Test: `tests/unit/app/a11y-setup.test.tsx` (temporary sanity check, removed in Task 6)

- [ ] **Step 1: Install the dev dependency**

Run:
```bash
npm install -D jest-axe @types/jest-axe
```
Expected: both added under `devDependencies`.

- [ ] **Step 2: Wire the matcher into the jest setup**

Edit `jest.setup.ts` to:
```ts
import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);
```

- [ ] **Step 3: Write a sanity test that the matcher works**

Create `tests/unit/app/a11y-setup.test.tsx`:
```tsx
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';

test('jest-axe matcher is wired and passes on a labelled control', async () => {
  const { container } = render(
    <label>
      Email
      <input type="email" />
    </label>,
  );
  expect(await axe(container)).toHaveNoViolations();
});
```

- [ ] **Step 4: Run it**

Run: `npx jest tests/unit/app/a11y-setup.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json jest.setup.ts tests/unit/app/a11y-setup.test.tsx
git commit -m "test(M6): add jest-axe and wire toHaveNoViolations"
```

---

## Task 1: `track()` adapter registry (analyticUtil reconciliation)

> Replaces M4's inline `console.debug` body with a registry **behind the unchanged public `track(event)` signature**, and consolidates the full `AnalyticsEvent` union M4+M5 split across two specs. Additive — no M4/M5 call site changes. If `utils/analyticUtil.ts` does not exist yet, M4 has not shipped — complete M4 first.

**Files:**
- Modify: `utils/analyticUtil.ts`
- Test: `tests/unit/utils/analyticUtil.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/utils/analyticUtil.test.ts`:
```ts
import {
  track,
  registerAnalyticsAdapter,
  __resetAnalyticsAdapters,
  type AnalyticsEvent,
} from '../../../utils/analyticUtil';

afterEach(() => __resetAnalyticsAdapters());

const sample: AnalyticsEvent = { name: 'hotel_viewed', hotelId: 'h1' };

test('track fans out to every registered adapter', () => {
  const a = jest.fn();
  const b = jest.fn();
  registerAnalyticsAdapter(a);
  registerAnalyticsAdapter(b);
  track(sample);
  expect(a).toHaveBeenCalledWith(sample);
  expect(b).toHaveBeenCalledWith(sample);
});

test('a throwing adapter does not break the others or track()', () => {
  const bad = jest.fn(() => {
    throw new Error('boom');
  });
  const good = jest.fn();
  registerAnalyticsAdapter(bad);
  registerAnalyticsAdapter(good);
  expect(() => track(sample)).not.toThrow();
  expect(good).toHaveBeenCalledWith(sample);
});

test('registerAnalyticsAdapter returns a working unsubscribe', () => {
  const a = jest.fn();
  const off = registerAnalyticsAdapter(a);
  off();
  track(sample);
  expect(a).not.toHaveBeenCalled();
});

test('accepts every event in the consolidated union', () => {
  const seen: AnalyticsEvent[] = [];
  registerAnalyticsAdapter((e) => seen.push(e));
  const events: AnalyticsEvent[] = [
    { name: 'search_performed', city: 'Paris', country: 'France',
      filters: { stars: 4, min: null, max: null, sort: 'price-asc' } },
    { name: 'no_results', filters: { stars: 5, min: 0, max: 100 } },
    { name: 'hotel_viewed', hotelId: 'h1' },
    { name: 'availability_checked', hotelId: 'h1', nights: 2 },
    { name: 'no_rooms', hotelId: 'h1' },
  ];
  events.forEach(track);
  expect(seen).toHaveLength(5);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest tests/unit/utils/analyticUtil.test.ts`
Expected: FAIL — `registerAnalyticsAdapter` / `__resetAnalyticsAdapters` not exported (and `utils/analyticUtil.ts` may be the M4 version without them).

- [ ] **Step 3: Write the consolidated implementation**

Replace `utils/analyticUtil.ts` with:
```ts
// Typed analytics facade. Public `track(event)` is unchanged from M4 (call sites
// untouched); M6 adds a pluggable adapter registry behind it. No vendor SDK in P1 —
// register a vendor adapter in P2 (roadmap §Observability).

export type AnalyticsEvent =
  | {
      name: 'search_performed';
      city: string | null;
      country: string | null;
      filters: { stars: number | null; min: number | null; max: number | null; sort: string };
    }
  | { name: 'no_results'; filters: { stars: number | null; min: number | null; max: number | null } }
  | { name: 'hotel_viewed'; hotelId: string }
  | { name: 'availability_checked'; hotelId: string; nights: number }
  | { name: 'no_rooms'; hotelId: string };

export type AnalyticsAdapter = (event: AnalyticsEvent) => void;

const adapters = new Set<AnalyticsAdapter>();

/** Register an adapter; returns an unsubscribe fn. P2 vendor seam. */
export function registerAnalyticsAdapter(adapter: AnalyticsAdapter): () => void {
  adapters.add(adapter);
  return () => {
    adapters.delete(adapter);
  };
}

/** Test seam: drop all adapters (including the default). */
export function __resetAnalyticsAdapters(): void {
  adapters.clear();
}

/** Unchanged public API. Fans out to all adapters; one bad adapter never breaks the rest. */
export function track(event: AnalyticsEvent): void {
  for (const adapter of adapters) {
    try {
      adapter(event);
    } catch {
      // An adapter failure must never break tracking or the UI.
    }
  }
}

// Default adapter: DEV console only; PROD starts with no adapters (no-op), matching M4.
if (process.env.NODE_ENV !== 'production') {
  registerAnalyticsAdapter((event) => {
    // eslint-disable-next-line no-console
    console.debug('[track]', event);
  });
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx jest tests/unit/utils/analyticUtil.test.ts`
Expected: PASS (4 tests). (`__resetAnalyticsAdapters` in `afterEach` removes the default DEV adapter so fan-out counts are exact.)

- [ ] **Step 5: Add the default-adapter test**

Append to the test file:
```ts
test('a default DEV console adapter is registered at load', () => {
  const spy = jest.spyOn(console, 'debug').mockImplementation(() => {});
  jest.resetModules();
  // Re-import a fresh module instance so the load-time default adapter registers.
  const fresh = require('../../../utils/analyticUtil') as typeof import('../../../utils/analyticUtil');
  fresh.track({ name: 'hotel_viewed', hotelId: 'h1' });
  expect(spy).toHaveBeenCalledWith('[track]', { name: 'hotel_viewed', hotelId: 'h1' });
  spy.mockRestore();
});
```

- [ ] **Step 6: Run the full file**

Run: `npx jest tests/unit/utils/analyticUtil.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 7: Confirm M4/M5 call sites still typecheck**

Run: `npm run typecheck`
Expected: PASS — `track()`'s signature is unchanged, so M4/M5 call sites compile untouched.

- [ ] **Step 8: Commit**

```bash
git add utils/analyticUtil.ts tests/unit/utils/analyticUtil.test.ts
git commit -m "feat(M6): pluggable track() adapter registry + consolidated event union"
```

---

## Task 2: `app/not-found.tsx` — global 404

**Files:**
- Create: `app/not-found.tsx`
- Test: `tests/unit/app/not-found.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/app/not-found.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import NotFound from '../../../app/not-found';

test('renders a 404 heading and a Browse hotels link to home', () => {
  render(<NotFound />);
  expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /browse hotels/i })).toHaveAttribute('href', '/');
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest tests/unit/app/not-found.test.tsx`
Expected: FAIL — cannot find `app/not-found`.

- [ ] **Step 3: Write the component**

Create `app/not-found.tsx`:
```tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-gray-600">The page you’re looking for doesn’t exist or has moved.</p>
      <Link
        href="/"
        className="inline-flex min-h-[44px] items-center rounded-md bg-blue-600 px-4 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        Browse hotels
      </Link>
    </main>
  );
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx jest tests/unit/app/not-found.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/not-found.tsx tests/unit/app/not-found.test.tsx
git commit -m "feat(M6): global not-found boundary"
```

---

## Task 3: `app/loading.tsx` — route-level skeleton

**Files:**
- Create: `app/loading.tsx`
- Test: `tests/unit/app/loading.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/app/loading.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import Loading from '../../../app/loading';

test('renders an accessible loading status', () => {
  render(<Loading />);
  expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest tests/unit/app/loading.test.tsx`
Expected: FAIL — cannot find `app/loading`.

- [ ] **Step 3: Write the component**

Create `app/loading.tsx`:
```tsx
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="mx-auto max-w-5xl px-4 py-6">
      <span className="sr-only">Loading…</span>
      <div className="h-10 w-1/2 animate-pulse rounded bg-gray-200" />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 animate-pulse rounded-lg bg-gray-200" />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx jest tests/unit/app/loading.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/loading.tsx tests/unit/app/loading.test.tsx
git commit -m "feat(M6): route-level loading skeleton"
```

---

## Task 4: `app/error.tsx` — segment error boundary

> **Next 16:** the recovery prop is `unstable_retry`. Confirm against `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md` before writing.

**Files:**
- Create: `app/error.tsx`
- Test: `tests/unit/app/error.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/app/error.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Error from '../../../app/error';

test('renders a recoverable error and Try again calls unstable_retry', async () => {
  const unstable_retry = jest.fn();
  render(<Error error={new globalThis.Error('boom')} unstable_retry={unstable_retry} />);
  expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /try again/i }));
  expect(unstable_retry).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest tests/unit/app/error.test.tsx`
Expected: FAIL — cannot find `app/error`.

- [ ] **Step 3: Write the component**

Create `app/error.tsx`:
```tsx
'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // P2: report to Sentry via a registered analytics/error adapter.
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-gray-600">An unexpected error occurred. You can try again.</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="inline-flex min-h-[44px] items-center rounded-md bg-blue-600 px-4 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex min-h-[44px] items-center rounded-md border px-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx jest tests/unit/app/error.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/error.tsx tests/unit/app/error.test.tsx
git commit -m "feat(M6): segment error boundary"
```

---

## Task 5: `app/global-error.tsx` — root boundary

> **Next 16:** must render its own `<html>`/`<body>` (it replaces the root layout) and cannot export `metadata`. RTL renders into a `<div>`, so an `<html>` child logs a DOM-nesting `console.error` in jsdom — that is expected; assert on content, not nesting.

**Files:**
- Create: `app/global-error.tsx`
- Test: `tests/unit/app/global-error.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/app/global-error.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GlobalError from '../../../app/global-error';

test('renders a self-contained fallback and retries', async () => {
  // jsdom warns about <html> inside a <div>; silence the expected nesting noise.
  const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  const unstable_retry = jest.fn();
  render(<GlobalError error={new Error('fatal')} unstable_retry={unstable_retry} />);
  expect(screen.getByRole('heading', { name: /something went wrong/i })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /try again/i }));
  expect(unstable_retry).toHaveBeenCalledTimes(1);
  spy.mockRestore();
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest tests/unit/app/global-error.test.tsx`
Expected: FAIL — cannot find `app/global-error`.

- [ ] **Step 3: Write the component**

Create `app/global-error.tsx`:
```tsx
'use client';

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <title>Something went wrong</title>
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            padding: '1rem',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Something went wrong</h1>
          <p>A critical error occurred. Please try again.</p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            style={{ minHeight: 44, padding: '0 1rem', borderRadius: 6 }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx jest tests/unit/app/global-error.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/global-error.tsx tests/unit/app/global-error.test.tsx
git commit -m "feat(M6): global-error root boundary"
```

---

## Task 6: jest-axe a11y assertions

> Enforces roles/labels/ARIA/structure only. Contrast, focus-ring, color-only, and keyboard journeys are jsdom-blind — those are the manual audit in Task 8. Boundary components (M6-owned) are always assertable here; the M4/M5 compositions assume those milestones shipped (import them; if missing, complete that milestone first).

**Files:**
- Create: `tests/unit/app/a11y.test.tsx`
- Delete: `tests/unit/app/a11y-setup.test.tsx` (the Task 0 sanity check)

- [ ] **Step 1: Remove the temporary sanity test**

Run:
```bash
git rm tests/unit/app/a11y-setup.test.tsx
```

- [ ] **Step 2: Write the a11y test for the M6 boundary components**

Create `tests/unit/app/a11y.test.tsx`:
```tsx
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';

import NotFound from '../../../app/not-found';
import Loading from '../../../app/loading';
import AppError from '../../../app/error';

test('not-found has no axe violations', async () => {
  const { container } = render(<NotFound />);
  expect(await axe(container)).toHaveNoViolations();
});

test('loading has no axe violations', async () => {
  const { container } = render(<Loading />);
  expect(await axe(container)).toHaveNoViolations();
});

test('error boundary has no axe violations', async () => {
  const { container } = render(<AppError error={new Error('x')} unstable_retry={() => {}} />);
  expect(await axe(container)).toHaveNoViolations();
});
```

- [ ] **Step 3: Run it**

Run: `npx jest tests/unit/app/a11y.test.tsx`
Expected: PASS (3 tests). If a violation is reported, fix the component (add the missing label/role/landmark) — do not weaken the assertion.

- [ ] **Step 4: Add axe coverage for the M4 home + M5 detail compositions**

Append to `tests/unit/app/a11y.test.tsx` (imports assume M4/M5 shipped these components; wrap any data-driven component in the providers/props its own M4/M5 test already uses):
```tsx
import { HotelHero } from '../../../components/hotel/HotelHero';
import { makeHotel } from '../../fixtures';

test('hotel hero has no axe violations', async () => {
  const { container } = render(<HotelHero hotel={makeHotel()} />);
  expect(await axe(container)).toHaveNoViolations();
});
```
> Add one `axe(container)` assertion per key M4/M5 surface you can render in isolation (`HotelHero`, `AmenitiesGrid`, `PoliciesList`, `RoomCard`, `DestinationCombobox`, `HotelCard`, `ResultCount`). Reuse each component's existing M4/M5 test render setup (props, `QueryProvider`/`AppProvider` wrappers) so the only new line is the `axe()` assertion. If a component is not yet built, leave a `test.todo('axe: <Component>')` placeholder and complete it when that milestone lands.

- [ ] **Step 5: Run the full a11y file**

Run: `npx jest tests/unit/app/a11y.test.tsx`
Expected: PASS (boundary tests green; M4/M5 tests green or `test.todo` placeholders where a component is not yet built).

- [ ] **Step 6: Commit**

```bash
git add tests/unit/app/a11y.test.tsx
git commit -m "test(M6): jest-axe no-violations on boundaries + M4/M5 surfaces"
```

---

## Task 7: Perf assertion — in-memory filter+sort < 100ms

> The only deterministically unit-testable budget item (PRD §5). Web Vitals + JS size are the manual measurement in Task 8.

**Files:**
- Create: `tests/unit/lib/perf.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/lib/perf.test.ts`:
```ts
import { filterByStars, filterByPrice } from '../../../lib/filters';
import { sortHotels } from '../../../lib/sort';
import { makeHotel, makeRoom } from '../../fixtures';

// A realistic-but-generous location subset. Architecture §7: city ≈ 4, country ≤ ~20;
// 50 exercises more than any real subset while staying well inside the budget.
function buildSubset(n: number) {
  return Array.from({ length: n }, (_, i) =>
    makeHotel({
      id: `h${i}`,
      starRating: (i % 5) + 1,
      rooms: [makeRoom({ pricePerNight: 100 + (i % 10) * 25 })],
    }),
  );
}

test('filter + sort over a location subset completes in < 100ms', () => {
  const hotels = buildSubset(50);
  const start = performance.now();
  const result = sortHotels(filterByPrice(filterByStars(hotels, 3), 100, 300), 'price-asc');
  const elapsed = performance.now() - start;
  expect(result.length).toBeGreaterThan(0);
  expect(elapsed).toBeLessThan(100);
});
```

- [ ] **Step 2: Run it**

Run: `npx jest tests/unit/lib/perf.test.ts`
Expected: PASS — the bounded subset filters/sorts in well under 100ms. (If it ever fails, that is a real regression in `lib/filters`/`lib/sort`, not flakiness — investigate, don't raise the threshold.)

- [ ] **Step 3: Commit**

```bash
git add tests/unit/lib/perf.test.ts
git commit -m "test(M6): assert in-memory filter+sort within the <100ms budget"
```

---

## Task 8: Manual measurement + audit + check off M6 (no automated test)

> The documented half of a11y + perf. Produces recorded evidence so progress.md's "a11y AA checks pass" and "perf budget measured and within target" gates are backed, not asserted. Run against a **production build** so the numbers are real.

**Files:**
- Modify (optional): `package.json`, `next.config.ts` (bundle-analyzer)
- Modify: `docs/superpowers/specs/2026-06-08-m6-cross-cutting-design.md` (§5.2 checklist results, §6.2 numbers)
- Modify: `docs/progress.md`

- [ ] **Step 1: (Optional) wire `@next/bundle-analyzer`**

Run: `npm install -D @next/bundle-analyzer`
Then wrap the config in `next.config.ts`:
```ts
import withBundleAnalyzer from '@next/bundle-analyzer';

const analyze = withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });

// ...existing config object as `nextConfig`
export default analyze(nextConfig);
```

- [ ] **Step 2: Build and record the JS-size budget**

Run: `npm run build`
Record from the route output the **First Load JS** for `/` and `/hotels/[id]`. (Optionally `ANALYZE=true npm run build` for the treemap.) Confirm initial JS **< 150KB gz**.

- [ ] **Step 3: Measure Web Vitals on a production build (mobile emulation)**

Run: `npm run build && npm run start`, then in Chrome DevTools → Lighthouse (Mobile) audit `/` and one `/hotels/[id]`. Record **LCP < 2.5s**, **INP < 200ms** (or TBT as proxy in Lighthouse), **CLS < 0.1**.

- [ ] **Step 4: Run the manual a11y audit (the jsdom-blind checks)**

Using the same Lighthouse run + keyboard-only navigation, verify and record each row of the spec §5.2 table: contrast ≥ 4.5:1, visible `:focus-visible` ring on every interactive element, no color-only signal (✓ Available is icon+text; counts are text), full keyboard journey destination → filter → sort → detail → dates, and `aria-live` announcements (result count + availability status).

- [ ] **Step 5: Record results in the spec**

Edit `docs/superpowers/specs/2026-06-08-m6-cross-cutting-design.md`: fill §6.2 with the measured numbers (date + values) and mark each §5.2 checklist row pass/fail with the fix applied for any failure. Re-run the relevant task if a fix changes a component (re-green its test).

- [ ] **Step 6: Run the full suite + lint + typecheck**

Run: `npm test && npm run lint && npm run typecheck`
Expected: all green.

- [ ] **Step 7: Check off M6 in progress.md**

Edit `docs/progress.md`: flip the M6 task checkboxes `- [ ]` → `- [x]` (boundaries, `track()` facade + typed events, a11y AA, perf budget), set the **M6 row** in "Progress at a Glance" to `[x]`, and leave the P2 rows as `[-]`.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json next.config.ts docs/superpowers/specs/2026-06-08-m6-cross-cutting-design.md docs/progress.md
git commit -m "docs(M6): record perf/a11y measurements; check off M6"
```

---

## Self-Review (completed by the plan author)

**Spec coverage:**
- §2 boundaries → Tasks 2–5 (`not-found`, `loading`, `error`, `global-error`). ✓
- §3 boundary contracts → Tasks 2–5 (props, `unstable_retry`, own html/body). ✓
- §4 `track()` registry + consolidated union → Task 1. ✓
- §5.1 jest-axe (enforceable) → Tasks 0 (wiring) + 6 (assertions). ✓
- §5.2 manual a11y audit → Task 8 step 4–5. ✓
- §6.1 filter <100ms (asserted) → Task 7. ✓
- §6.2 manual perf measurement → Task 8 step 1–3, 5. ✓
- §7 file map → File Map table. ✓
- §8 testing strategy → every task is TDD; analytics/boundary/a11y/perf all covered. ✓
- §9 edge-state closure → Tasks 2–5 (the cross-cutting rows). ✓

**Placeholder scan:** the only intentional placeholder is `test.todo('axe: <Component>')` in Task 6 step 4 — guarded explicitly for components not yet built when M6 runs ahead of M4/M5; not a content gap.

**Type consistency:** `track`, `registerAnalyticsAdapter`, `__resetAnalyticsAdapters`, `AnalyticsEvent`, `AnalyticsAdapter` used identically across Task 1's impl and test; `unstable_retry` prop name identical in `error.tsx`/`global-error.tsx` and their tests; `filterByStars`/`filterByPrice`/`sortHotels`/`makeHotel`/`makeRoom` match the real M1 exports verified in the source.
