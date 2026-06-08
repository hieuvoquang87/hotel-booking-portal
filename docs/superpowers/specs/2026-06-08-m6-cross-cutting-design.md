# M6 — Cross-cutting: A11y · Observability · Boundaries · Perf — Design Spec

> Phase 1, Milestone M6 (see `docs/progress.md`). The non-functional guarantees layered
> on top of M3–M5: route-level error/loading/not-found **boundaries**, a real but
> **vendor-free pluggable `track()` adapter seam**, an **enforceable accessibility** layer
> (jest-axe) split from a documented manual audit, and a **measured perf budget**.
> Covers PRD §5 (Non-Functional Requirements) and `architecture.md` §5 "Edge-state policy",
> §8 rows "Perf budget / A11y AA / Observability".
> Sources: `prd.md` §5, `architecture.md` §5/§6/§8/§10, `assumptions-and-tradeoffs.md` §11,
> `product-roadmap.md` (P2 split), and the M2/M3/M4/M5 specs.

**Status:** approved design — implementation plan follows in
`docs/superpowers/plans/2026-06-08-m6-cross-cutting.md`.

**Scope framing.** Phase 1 ships the **lightweight** cross-cutting layer only. The
`track()` facade gets a real, testable adapter registry but **no vendor SDK**; a11y is
enforced where a unit test can enforce it and **documented** where it cannot; the perf
budget is **measured and recorded**, not gated in CI (the CI pipeline is M7). Vendor
wiring — Sentry / Segment / GA4 / web-vitals / pino — is **Phase 2** (assumptions §11,
roadmap P2).

---

## 1. Goal & Scope

**Goal.** Make the app resilient, observable, accessible, and within budget — the
guarantees that span milestones rather than living in one feature. M3–M5 built the
features and placed their `<Suspense>` boundaries and `aria-live` regions; M6 adds the
**error** boundaries they deliberately deferred, turns the `track()` interface into a
**pluggable seam with a default adapter**, and verifies a11y + perf against the PRD §5
budget.

**In scope (M6):**

- `app/error.tsx` — `'use client'` route-segment error boundary (`error`,
  `unstable_retry`); "Something went wrong" + Try again.
- `app/global-error.tsx` — `'use client'` last-resort boundary that **renders its own
  `<html>`/`<body>`** (it replaces the root layout when active).
- `app/loading.tsx` — route-level loading skeleton shell.
- `app/not-found.tsx` — global 404 (the **detail** `not-found.tsx` already shipped in M5).
- `utils/analyticUtil.ts` — **(modify, "Task 0" reconciliation)** keep the public
  `track(event: AnalyticsEvent): void` signature, add a pluggable adapter registry behind
  it, register a DEV console adapter by default, and **consolidate the full
  `AnalyticsEvent` union** that M4 + M5 split across two specs. No vendor adapter.
- **Accessibility (enforceable):** add `jest-axe` + `toHaveNoViolations`; assert no
  violations on the key M4/M5 components (roles, labels, accessible names, ARIA,
  landmark/heading structure).
- **Accessibility (documented audit):** a recorded checklist for what jest-axe under jsdom
  **cannot** verify — contrast ≥ 4.5:1, visible `:focus-visible` ring, no color-only
  signal, full keyboard journeys.
- **Performance:** one Jest-asserted metric (in-memory filter < 100ms over the largest
  location subset) + a recorded manual Lighthouse-mobile / bundle-size measurement for the
  Web Vitals + JS-size budget.

**Out of scope (later / Phase 2):** all vendor analytics/error SDKs and web-vitals
reporting (P2); the **CI pipeline + coverage gate + Lighthouse-CI / perf gate** (M7 owns
CI); Playwright E2E (M7); per-hotel SEO / SSG-ISR (P2). M6 adds no new product features.

**Depends on M0–M5.** M2: structured API logs (confirm only). M3: `QueryProvider` /
`AppProvider` mounted in the root layout; `lib/fetcher` (`ApiError`). M4: `app/page.tsx`,
`utils/analyticUtil.ts` (the typed `track()` + `search_performed` / `no_results` events
and call sites), the `<Suspense>` boundary on `/`, `aria-live` `ResultCount`, the largest
in-memory filter path (`lib/filterHotels` over a location subset). M5: the detail
`not-found.tsx`, `hotel_viewed` / `availability_checked` / `no_rooms` events. The plan
notes a minimal stand-in for any upstream piece not yet present.

---

## 2. Boundaries & route states (the version-sensitive deliverable)

App Router resolves a fixed set of special files per segment. M3/M4 placed `<Suspense>`
(streaming) and M5 placed the **detail** `not-found.tsx`; M6 fills the rest so every
failure mode has owned UI rather than a framework default.

```
app/
  error.tsx          'use client'  segment error boundary — wraps page/loading/not-found below it
  global-error.tsx   'use client'  root boundary — replaces the root layout; own <html>/<body>
  loading.tsx        server        route-level skeleton (instant shell while a segment suspends)
  not-found.tsx      server        global 404 (notFound() outside the detail segment, unknown routes)
  hotels/[id]/
    not-found.tsx    server        hotel-specific 404 (M5 — already shipped)
```

**Component hierarchy (from the Next docs):** `error.js` wraps `loading.js`,
`not-found.js`, `page.js`, and nested layouts in a React error boundary — but it does
**not** wrap the layout in its own segment. Errors thrown by the **root layout** escape
`app/error.tsx`; only `global-error.tsx` catches those. That is why both files exist.

**Why each file:**

- `error.tsx` — catches render/runtime errors in the page subtree (e.g. `getJson`
  re-throwing a non-404 `ApiError` from the M5 detail page). Inline recoverable UI keeps
  the app usable; matches `architecture.md` §8 "Observability → `error.tsx`".
- `global-error.tsx` — the only thing that survives a root-layout failure; minimal,
  self-contained markup.
- `loading.tsx` — the route-level skeleton the roadmap's "static shell, LCP < 2.5s" goal
  relies on; complements (does not replace) the component-level `<Suspense>` skeletons M4
  uses for the results grid.
- `app/not-found.tsx` — global 404 for unknown routes and any `notFound()` thrown outside
  the detail segment.

> **Next 16 caveat (AGENTS.md) — these differ from training data; confirm against
> `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/`
> (`error.md`, `loading.md`, `not-found.md`) before writing the boundary code:**
>
> - The error-boundary recovery prop is now **`unstable_retry()`** (re-fetch + re-render
>   the segment) — the docs say prefer it over `reset()`. `reset()` still exists for the
>   rarer "clear error state without re-fetching" case. The spec's contract below uses
>   `unstable_retry`; verify the exact prop name at implementation time.
> - **`global-error.tsx` must define its own `<html>` and `<body>`** and **cannot export
>   `metadata` / `generateMetadata`** (it's a Client Component) — use the React `<title>`
>   component for a title instead.
> - Both `error.tsx` and `global-error.tsx` **must be `'use client'`**.

---

## 3. Boundary component contracts

### 3.1 `app/error.tsx` (`'use client'`)

- **Props:** `{ error: Error & { digest?: string }; unstable_retry: () => void }`.
- Renders a centered "Something went wrong" message + a **Try again** button
  (`onClick={() => unstable_retry()}`, ≥ 44px tap target) + a path back to `/`.
- `useEffect` logs the error once — **via the `track()` facade is out of P1 scope**
  (no `error_occurred` event in the typed union; a plain `console.error` placeholder with a
  `// P2: report to Sentry` seam, consistent with assumptions §11). Keep it a Client
  Component; no data fetching.
- Mobile-first, semantic (`<h1>`/`<h2>`), keyboard-operable, visible focus ring.

### 3.2 `app/global-error.tsx` (`'use client'`)

- **Props:** same shape as `error.tsx`.
- **Renders `<html><body>…</body></html>`** (replaces the root layout). Minimal inline
  styling only — it cannot rely on the app shell or providers being present. Title via the
  React `<title>` component (no `metadata` export).
- Single Try-again (`unstable_retry`) + "Go home" link.

### 3.3 `app/loading.tsx` (server)

- A static skeleton matching the home shell's above-the-fold layout (header + a few card
  placeholders), reserving space to avoid CLS. No client JS.

### 3.4 `app/not-found.tsx` (server)

- "Page not found" + a **Browse hotels** link to `/`. Mirrors the M5 detail
  `not-found.tsx` tone so the two read consistently.

---

## 4. Observability — `track()` adapter registry (reconciliation)

M4 shipped `utils/analyticUtil.ts` with the typed `track()` and an **inline**
`console.debug` body; its spec pins *"call sites in M4 don't change."* M6 honors that: the
**public signature is unchanged**, and the registry sits entirely behind it.

> **Reconciliation (M6 "Task 0" — same pattern as M5 Task 0).** M4 and M5 each declared a
> *slice* of the `AnalyticsEvent` union in their own specs. M6 **consolidates the full
> union in one place** and replaces M4's inline `console.debug` with a **default-registered
> console adapter**. This is additive to the public API — no call site changes.

### 4.1 Public surface (unchanged + additive)

```ts
// utils/analyticUtil.ts

export type AnalyticsEvent =
  | { name: 'search_performed'; city: string | null; country: string | null;
      filters: { stars: number | null; min: number | null; max: number | null; sort: string } }
  | { name: 'no_results'; filters: { stars: number | null; min: number | null; max: number | null } }
  | { name: 'hotel_viewed'; hotelId: string }
  | { name: 'availability_checked'; hotelId: string; nights: number }
  | { name: 'no_rooms'; hotelId: string };

export type AnalyticsAdapter = (event: AnalyticsEvent) => void;

/** Unchanged public API — M4/M5 call sites are untouched. Fans out to all adapters. */
export function track(event: AnalyticsEvent): void;

/** P2 seam: register a vendor adapter. Returns an unsubscribe fn. */
export function registerAnalyticsAdapter(adapter: AnalyticsAdapter): () => void;

/** Test seam: clear all registered adapters (used by unit tests). */
export function __resetAnalyticsAdapters(): void;
```

### 4.2 Behavior

- A **module-level adapter list**. `track(event)` iterates it and calls each adapter; an
  adapter that throws is caught (one bad adapter never breaks tracking or the UI).
- **Default adapter:** a DEV-only console adapter is registered at module load —
  `process.env.NODE_ENV !== 'production'` → `console.debug('[track]', event)`. In PROD the
  list starts empty (no-op), exactly matching M4's "DEV console / PROD no-op" behavior, but
  now as a *registered adapter* rather than an inline branch.
- **Zero vendor adapters in P1.** `registerAnalyticsAdapter` is the documented P2 seam:
  wiring Segment/GA4/Sentry becomes a single `registerAnalyticsAdapter(segmentAdapter)`
  call with no change to `track` or any call site (roadmap §"Observability").
- **Structured API logs** (M2's route handlers) are confirmed present, not re-built here.

### 4.3 Call sites (audit, not new feature work)

Confirm every typed event fires from its owner (no new call sites are *invented* by M6;
it verifies the union is complete and emitted): `search_performed` / `no_results` (M4),
`hotel_viewed` / `availability_checked` / `no_rooms` (M5).

---

## 5. Accessibility — enforceable vs. documented

> **Critical constraint:** `jest-axe` runs axe-core under **jsdom**, which produces no real
> layout or computed styles. axe's **color-contrast** rule is therefore skipped/incomplete
> there, and `:focus-visible`, "no color-only signal", and keyboard-journey checks are not
> expressible as jsdom assertions. The spec splits a11y accordingly — do **not** claim
> jest-axe enforces contrast.

### 5.1 Test-enforced (jest-axe) — feeds the M7 ≥85% suite

- Add `jest-axe` (dev-dep) + `expect.extend(toHaveNoViolations)` in the jest setup.
- Assert `await axe(container)` has **no violations** on the key surfaces: the home page
  composition (destination combobox, filters, sort, `ResultCount`, results grid), and the
  detail composition (`HotelHero`, `AmenitiesGrid`, `PoliciesList`, `RoomAvailability` with
  `DateField`s + `RoomCard`s), plus the four boundary components.
- Catches: missing/mismatched labels, bad ARIA, duplicate/missing landmarks, heading-order
  problems, controls without accessible names, `aria-live` region wiring.

### 5.2 Documented manual audit (recorded checklist in the spec/plan)

A short, recorded pass (DevTools + Lighthouse-a11y on mobile emulation) covering what
jsdom cannot:

| Check | How |
| --- | --- |
| Contrast ≥ 4.5:1 (text + UI) | Lighthouse a11y + DevTools contrast picker on the token palette |
| Visible `:focus-visible` ring on every interactive element | Keyboard-tab through home + detail |
| No color-only signal (✓ Available is icon + text; result count is text) | Visual review against design spec |
| Full keyboard journey: destination → filter → sort → detail → dates | Manual keyboard-only run |
| `aria-live` result count announces (M4) and availability status (M5) | Screen-reader spot check |

The checklist outcome is recorded in the plan's final task so "a11y AA checks pass" in
progress.md is backed by evidence, not assertion.

---

## 6. Performance budget — one asserted metric, the rest measured

PRD §5 budget: LCP < 2.5s, INP < 200ms, CLS < 0.1, initial JS < 150KB gz, in-memory
filter < 100ms. Only the last is deterministically unit-testable.

### 6.1 Jest-asserted

- **In-memory filter < 100ms.** A unit test runs M4's pure filter path
  (`lib/filterHotels` / `lib/sortHotels`) over the **largest** location subset in the seed
  (the city/country with the most hotels) for a realistic filter combination and asserts
  wall-clock < 100ms. Pure-function timing in jsdom is representative because the budget
  excludes the async availability path (PRD §5). Generous-but-meaningful threshold; not
  flaky because the subset is bounded (city ≈ 4, country ≤ ~20 — architecture §7).

### 6.2 Documented manual measurement (recorded numbers in the plan)

- **Initial JS < 150KB gz** — read from `next build` route output and/or
  `@next/bundle-analyzer` (dev-only config). Record the First Load JS for `/` and
  `/hotels/[id]`.
- **LCP / INP / CLS** — one Lighthouse-mobile run against the production build
  (`next build && next start`) for `/` and a detail page; record the three numbers.
- **No CI perf gate in P1** — wiring Lighthouse-CI / a bundle-size gate into the pipeline
  is **M7**. M6 establishes the *measurement and the recorded baseline*; M7 may gate it.

---

## 7. Module structure

```
app/error.tsx                  'use client'  segment error boundary (unstable_retry)
app/global-error.tsx           'use client'  root boundary, own <html>/<body>
app/loading.tsx                server        route-level skeleton shell
app/not-found.tsx              server        global 404 → Browse hotels

utils/analyticUtil.ts          (modify)      adapter registry behind unchanged track(); full union; default DEV adapter
jest.setup.ts (or equivalent)  (modify)      expect.extend(toHaveNoViolations)
next.config / analyzer         (optional)    @next/bundle-analyzer dev wiring for the JS-size measurement
docs/progress.md               (modify)      check off M6
```

Reused unchanged: M3 providers + `lib/fetcher`; M4 `app/page.tsx`, `Icon`, `EmptyState`,
`lib/filterHotels`; M5 detail composition + detail `not-found.tsx`.

---

## 8. Testing strategy (TDD; contributes to the M7 ≥85% gate)

jsdom + RTL; `jest-axe` for a11y assertions; `next/navigation` mocked where a boundary
references it.

**Boundary components:**
- `error.tsx` / `global-error.tsx` — render the message; **Try again** calls
  `unstable_retry` (mocked); `global-error` renders `<html>`/`<body>`. (Test the default
  export as a plain component with injected props — no full route render needed.)
- `loading.tsx` / `not-found.tsx` — render skeleton / 404 copy + the Browse link.

**`analyticUtil` registry:**
- `track` fans out to **every** registered adapter; a throwing adapter doesn't break the
  others; default DEV console adapter present in DEV (assert via a `console.debug` spy);
  PROD path no-ops with no adapters; `registerAnalyticsAdapter` returns a working
  unsubscribe; `__resetAnalyticsAdapters` clears. Type-level: the union accepts all five
  event shapes and rejects an unknown `name` (a `// @ts-expect-error` line).

**a11y (jest-axe):** no-violations assertions on the home + detail compositions and the
boundary components (§5.1).

**perf:** the `lib/filterHotels` < 100ms assertion (§6.1).

**Manual audit + perf measurement** are executed and their results recorded in the plan's
final task (not automated) — they back the progress.md "Done when" gates.

---

## 9. States covered (edge-state policy closure)

M6 closes the `architecture.md` §5 edge-state table rows that are *cross-cutting* rather
than feature-local:

| Area | Rule | Owned by |
| --- | --- | --- |
| Any segment render error | inline recoverable boundary + Try again | `app/error.tsx` (M6) |
| Root layout failure | self-contained full-page fallback | `app/global-error.tsx` (M6) |
| Route-level loading | instant skeleton shell (no CLS) | `app/loading.tsx` (M6) |
| Unknown route / stray `notFound()` | global 404 + Browse hotels | `app/not-found.tsx` (M6) |
| Unknown hotel id | detail `notFound()` | M5 (`hotels/[id]/not-found.tsx`) |
| Destination / results / availability inline states | feature-local | M4 / M5 |

---

## 10. Decisions & open items

**Resolved (this spec):**

- **A11y = hybrid:** `jest-axe` enforces role/label/ARIA/structure in tests;
  contrast / focus-ring / color-only / keyboard journeys are a **documented manual audit**
  (jsdom can't compute layout/contrast) — the spec must not claim jest-axe checks contrast
  (§5).
- **Perf = one asserted metric + recorded measurement:** filter < 100ms is unit-tested;
  Web-Vitals + JS-size are a recorded Lighthouse/bundle measurement, **not** a CI gate in
  P1 (§6).
- **`track()` = real pluggable adapter registry, no vendor:** unchanged public signature,
  default DEV console adapter, `registerAnalyticsAdapter` as the P2 seam; **full
  `AnalyticsEvent` union consolidated** from M4 + M5 (§4).
- **Two error boundaries** because `app/error.tsx` cannot catch root-layout errors —
  `global-error.tsx` (own `<html>`/`<body>`) is required (§2).
- **`unstable_retry` (Next 16)** is the recovery prop, confirmed against the local Next
  docs; verify at implementation time (§2 caveat).
- **No `error_occurred` analytics event in P1** — the boundary uses a `console.error`
  placeholder with a `// P2: Sentry` seam (§3.1).

**Deferred (not M6):** vendor SDKs + web-vitals reporting (P2); CI pipeline + coverage
gate + any Lighthouse-CI / bundle-size **gate** (M7); Playwright E2E (M7); SEO / SSG-ISR
(P2).
