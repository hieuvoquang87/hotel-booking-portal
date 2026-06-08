# M7 — Testing & Coverage Gate — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce coverage ≥85% (PR-blocking) and a Playwright primary-flow + edge E2E suite green against a production build, in GitHub Actions, on every PR and on `main`.

**Architecture:** A `quality` CI job runs lint/typecheck/`test:coverage` (the jest `coverageThreshold` gate); an `e2e` job builds and starts the real app (real BFF + seed, no MSW) and runs Playwright. Per-feature unit/integration tests come from M1–M6; M7 wires the gate, authors the E2E specs, and fills coverage gaps with tests.

**Tech Stack:** GitHub Actions, Jest 30 (`coverageThreshold`), Playwright (`@playwright/test`, Chromium), Next.js 16 production server.

**Spec:** `docs/superpowers/specs/2026-06-08-m7-testing-coverage-design.md`

**Conventions:** unit tests under `tests/unit/`; E2E specs under `e2e/`; commit after each green task. **Assumes M0–M6 are done** — all features, their tests, the `track()` registry, and the boundary components exist. E2E reads `services/mock/hotels.json` for fixture ids; if the seed differs from the ids below, use the equivalents the seed actually contains.

> **Next 16 / Playwright caveat:** the E2E flow depends on M4 (home controls) and M5 (detail + demo-default dates `2026-07-10 → 2026-07-12`). If those aren't built yet, stop and complete them — E2E asserts their real DOM.

---

## File Map

| File | Responsibility |
| --- | --- |
| `jest.config.js` | **(modify)** add `coverageThreshold.global` 85%/4 metrics; add `utils/**` to `collectCoverageFrom` |
| `playwright.config.ts` | **(modify)** CI-aware `webServer` (build+start), `screenshot: 'only-on-failure'` |
| `e2e/primary-flow.spec.ts` | **(create)** destination → filter → sort → detail → availability success |
| `e2e/no-results.spec.ts` | **(create)** filter → zero hotels empty state |
| `e2e/no-rooms.spec.ts` | **(create)** no-availability hotel → "No rooms available" |
| `e2e/smoke.spec.ts` | **(delete)** replaced by the three real specs |
| `.github/workflows/ci.yml` | **(create)** `quality` + `e2e` jobs |
| `docs/progress.md` | **(modify)** check off M7 |

---

## Task 1: Turn on the coverage gate

**Files:** Modify `jest.config.js`

- [ ] **Step 1:** In `baseConfig`, add `utils/**/*.{ts,tsx}` to `collectCoverageFrom`, and add:
```js
coverageThreshold: {
  global: { statements: 85, branches: 85, functions: 85, lines: 85 },
},
```

- [ ] **Step 2:** Run the gate.

Run: `npm run test:coverage`
Expected: PASS if every collected file is ≥85% on all four metrics; otherwise FAIL listing the under-covered files. Note them for Task 2.

- [ ] **Step 3: Commit**
```bash
git add jest.config.js
git commit -m "test(M7): enforce global 85% coverage threshold"
```

---

## Task 2: Fill coverage gaps to green

**Files:** Create/extend `tests/unit/**` for each file the Task 1 report flagged < 85%.

- [ ] **Step 1:** Run `npm run test:coverage` and open the per-file table (or `coverage/lcov-report/index.html`). For each file below 85%, identify the uncovered lines/branches.

- [ ] **Step 2:** For each gap, add a focused unit test in the mirroring `tests/unit/...` path that exercises the missing branch (e.g. an `error.tsx` `useEffect` logging path, a `RoomAvailability` state arm, a `lib/` guard clause). Follow the existing test style for that module. One example shape:
```tsx
// tests/unit/<mirror>/<name>.test.tsx — cover the previously-missed branch
test('<module> handles <the uncovered branch>', () => {
  // arrange the input that takes the untested path, assert the observable result
});
```

- [ ] **Step 3:** Re-run until the gate passes.

Run: `npm run test:coverage`
Expected: PASS — all four metrics ≥85%, no threshold failure. **Do not** lower the threshold or exclude files to pass.

- [ ] **Step 4: Commit**
```bash
git add tests/
git commit -m "test(M7): fill coverage gaps to satisfy the 85% gate"
```

---

## Task 3: Make Playwright run a production build in CI

**Files:** Modify `playwright.config.ts`

- [ ] **Step 1:** Change `webServer` and `use`:
```ts
use: {
  baseURL: 'http://localhost:3000',
  trace: 'on-first-retry',
  screenshot: 'only-on-failure',
},
webServer: {
  command: process.env.CI ? 'npm run build && npm run start' : 'npm run dev',
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
  timeout: 180_000,
},
```

- [ ] **Step 2:** Verify the existing smoke spec still runs locally (dev server).

Run: `npm run test:e2e`
Expected: PASS (smoke spec). Confirms the config change didn't break local runs before we replace the spec.

- [ ] **Step 3: Commit**
```bash
git add playwright.config.ts
git commit -m "test(M7): run E2E against a production build in CI"
```

---

## Task 4: Primary-flow E2E

**Files:** Create `e2e/primary-flow.spec.ts`; Delete `e2e/smoke.spec.ts`

- [ ] **Step 1:** Confirm fixtures in `services/mock/hotels.json`: a has-availability hotel in **Chicago** (`hotel-01`, "The Grand Luminary", 5★, rooms include `2026-07-10`/`2026-07-11`). If the seed differs, substitute the city + hotel name it actually has.

- [ ] **Step 2:** Write the spec (role/text selectors; the exact control labels come from M4/M5 — adjust to their real accessible names):
```ts
import { test, expect } from '@playwright/test';

test('destination → filter → sort → detail → availability success', async ({ page }) => {
  await page.goto('/');

  // Destination
  await page.getByRole('combobox', { name: /destination/i }).fill('Chicago');
  await page.getByRole('option', { name: /Chicago/i }).first().click();

  // A hotel from the results is visible
  await expect(page.getByRole('link', { name: /The Grand Luminary/i })).toBeVisible();

  // Filter + sort (controls own their accessible names in M4)
  await page.getByRole('button', { name: /5 stars|5★/i }).click();
  await page.getByRole('combobox', { name: /sort/i }).selectOption({ label: /price/i });

  // Open the detail
  await page.getByRole('link', { name: /The Grand Luminary/i }).click();
  await expect(page.getByRole('heading', { name: /The Grand Luminary/i })).toBeVisible();

  // Demo-default dates (2026-07-10 → 2026-07-12) auto-resolve to an available room
  await expect(page.getByText(/available/i).first()).toBeVisible();
  await expect(page.getByText(/\$\d/).first()).toBeVisible();
});
```

- [ ] **Step 3:** Delete the stub.
```bash
git rm e2e/smoke.spec.ts
```

- [ ] **Step 4:** Run it (local dev server).

Run: `npm run test:e2e -- primary-flow`
Expected: PASS. If a selector misses, align it to the real accessible name M4/M5 shipped — do not weaken assertions.

- [ ] **Step 5: Commit**
```bash
git add e2e/primary-flow.spec.ts
git commit -m "test(M7): primary-flow E2E (destination → availability success)"
```

---

## Task 5: Edge-case E2E (no-results, no-rooms)

**Files:** Create `e2e/no-results.spec.ts`, `e2e/no-rooms.spec.ts`

- [ ] **Step 1:** Write `no-results.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('a filter yielding zero hotels shows the empty state', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('combobox', { name: /destination/i }).fill('Chicago');
  await page.getByRole('option', { name: /Chicago/i }).first().click();

  // Drive the min-price filter above every Chicago room (control label from M4)
  await page.getByLabel(/min price/i).fill('100000');

  await expect(page.getByText(/no matching hotels/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /reset|clear/i })).toBeVisible();
});
```

- [ ] **Step 2:** Write `no-rooms.spec.ts` (fixture: `hotel-04`, "Magnolia Place Chicago", empty `available_dates`):
```ts
import { test, expect } from '@playwright/test';

test('a no-availability hotel shows "No rooms available"', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('combobox', { name: /destination/i }).fill('Chicago');
  await page.getByRole('option', { name: /Chicago/i }).first().click();

  await page.getByRole('link', { name: /Magnolia Place Chicago/i }).click();
  await expect(page.getByRole('heading', { name: /Magnolia Place Chicago/i })).toBeVisible();

  // Demo-default dates resolve to no rooms for this hotel
  await expect(page.getByText(/no rooms available/i)).toBeVisible();
});
```

- [ ] **Step 3:** Run both.

Run: `npm run test:e2e -- no-results no-rooms`
Expected: PASS. Adjust selectors to the real M4/M5 accessible names if needed.

- [ ] **Step 4: Commit**
```bash
git add e2e/no-results.spec.ts e2e/no-rooms.spec.ts
git commit -m "test(M7): no-results and no-rooms edge E2E"
```

---

## Task 6: GitHub Actions CI

**Files:** Create `.github/workflows/ci.yml`

- [ ] **Step 1:** Write the workflow:
```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:coverage
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage
          path: coverage/

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
        env:
          CI: 'true'
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

- [ ] **Step 2:** Validate locally that each referenced script exists and passes the way CI will run them.

Run: `npm ci && npm run lint && npm run typecheck && npm run test:coverage`
Expected: all PASS. Then `CI=true npm run test:e2e` to confirm the production-build path boots (`next build && next start`) and the three specs pass.

- [ ] **Step 3: Commit**
```bash
git add .github/workflows/ci.yml
git commit -m "ci(M7): GitHub Actions quality + e2e pipeline"
```

---

## Task 7: Check off M7

**Files:** Modify `docs/progress.md`

- [ ] **Step 1:** Flip the M7 task checkboxes `- [ ]` → `- [x]` (unit ≥85%, MSW integration, Playwright E2E, CI coverage gate) and set the **M7 row** in "Progress at a Glance" to `[x]`.

- [ ] **Step 2:** Final full-suite confirmation.

Run: `npm run test:coverage && npm run test:e2e`
Expected: gate passes; all E2E specs pass.

- [ ] **Step 3: Commit**
```bash
git add docs/progress.md
git commit -m "docs(M7): check off testing & coverage gate"
```

---

## Self-Review (completed by the plan author)

- **Spec §2 CI** → Task 6 (two jobs, triggers, artifacts). ✓
- **Spec §3 coverage gate** → Task 1 (threshold + `utils/`) + Task 2 (gap-fill). ✓
- **Spec §4 Playwright config** → Task 3; **E2E specs** → Tasks 4–5 (primary + two edges, Chicago seed, real ids `hotel-01`/`hotel-04`). ✓
- **Spec §5 done-when** → Task 7. ✓
- **Placeholders:** selector labels are intentionally `/regex/i` against M4/M5 accessible names (resolved at execution against the real DOM), not content gaps. No TBD/TODO.
- **Consistency:** `coverageThreshold` metrics match the spec; E2E fixture ids (`hotel-01`, `hotel-04`, Chicago) match the seed inspection; `npm run test:coverage` / `test:e2e` are the existing package scripts.
