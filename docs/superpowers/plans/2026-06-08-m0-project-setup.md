# M0 — Project Setup & Tooling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a Next.js (App Router) + TypeScript app with a green-on-zero-tests toolchain (Jest+RTL, MSW v2, Playwright), the folder skeleton, and the relocated seed — the foundation M1+ build against.

**Architecture:** Scaffold via `create-next-app` into a throwaway dir, then merge into this non-empty docs repo (Approach A) so existing `docs/` and `.gitignore` survive. No application logic — only configuration and empty structure. CI is deferred; the coverage gate stays non-blocking until code exists (M1/M7).

**Tech Stack:** Next.js 15 (App Router, React 19), TypeScript `strict`, Tailwind v4, npm, `@tanstack/react-query` (dep only), Jest + React Testing Library + jsdom (via `next/jest`), MSW v2, Playwright, Prettier + ESLint.

**Source spec:** `docs/superpowers/specs/2026-06-08-m0-project-setup-design.md`

---

## Conventions

- Run all commands from the repo root: `/Users/hieu/dev/hotel-booking-portal`.
- The repo already has a GitHub remote (`origin`) and a comprehensive `.gitignore` covering `node_modules/`, `coverage`, `.next`, `out`, `*.tsbuildinfo`, `.env*`.
- **Do not** copy the scaffold's `node_modules`, `.git`, `.gitignore`, or `README.md` into the repo (handled explicitly).
- **No CI** in this milestone. Commit on the current branch (`docs/initial-docs`).

---

## File Structure

| File / dir | Responsibility | Task |
| --- | --- | --- |
| `package.json`, `package-lock.json` | deps + scripts | 1, 2, 4, 5, 6 |
| `tsconfig.json`, `next.config.ts`, `next-env.d.ts` | TS + Next config (scaffolded) | 1 |
| `postcss.config.mjs`, `app/globals.css` | Tailwind v4 (scaffolded) | 1 |
| `eslint.config.mjs` | ESLint flat config (+ prettier) | 1, 2 |
| `prettier.config.mjs` | formatting + import order | 2 |
| `app/layout.tsx`, `app/page.tsx` | scaffolded blank app | 1 |
| `components/ hooks/ lib/ stores/ types/` (`.gitkeep`) | empty skeleton dirs | 3 |
| `services/mock/hotels.json` | relocated seed (server-only) | 3 |
| `jest.config.js`, `jest.setup.ts`, `jest.polyfills.js` | Jest via next/jest + MSW polyfills | 4 |
| `mocks/handlers.ts`, `mocks/server.ts`, `mocks/browser.ts`, `mocks/server.test.ts` | MSW v2 bootstrap + bootstrap test | 4 |
| `playwright.config.ts`, `e2e/smoke.spec.ts` | E2E config + smoke test | 5 |
| `README.md` | install / run / test skeleton | 6 |
| `docs/progress.md`, `docs/superpowers/specs/2026-06-08-m1-data-layer-design.md` | doc deltas | 7 |

---

## Task 1: Scaffold Next.js app (Approach A — temp + merge)

**Files:**
- Create (via scaffold): `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `next-env.d.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `public/*`
- Modify: `.gitignore` (append only)

- [ ] **Step 1: Scaffold into a throwaway directory** (non-interactive)

Run:
```bash
npx create-next-app@latest /tmp/hbp-scaffold --yes \
  --ts --tailwind --eslint --app --no-src-dir \
  --import-alias "@/*" --use-npm
```
Expected: completes and prints "Success! Created hbp-scaffold". If the CLI rejects a flag (version drift), run `npx create-next-app@latest --help`, map to the equivalent, and re-run; the required choices are: TypeScript, Tailwind, ESLint, App Router, **no** `src/` dir, import alias `@/*`, npm.

- [ ] **Step 2: Merge generated files into the repo (preserve docs, .gitignore, README)**

Run:
```bash
rsync -a \
  --exclude node_modules \
  --exclude .git \
  --exclude .gitignore \
  --exclude README.md \
  /tmp/hbp-scaffold/ ./
```
Expected: copies `package.json`, configs, `app/`, `public/` into the repo. `docs/`, `ai-dev-workflow.md`, the existing `README.md` and `.gitignore` are untouched.

- [ ] **Step 3: Append stack-specific entries to `.gitignore`**

The existing `.gitignore` already ignores `node_modules/`, `coverage`, `.next`, `out`, `*.tsbuildinfo`. Append the few that are missing:
```bash
cat >> .gitignore <<'EOF'

# Next.js (generated)
next-env.d.ts

# Vercel
.vercel

# Playwright
/test-results/
/playwright-report/
/playwright/.cache/
EOF
```

- [ ] **Step 4: Install dependencies in the repo**

Run:
```bash
npm install
```
Expected: creates `node_modules/` from the copied `package-lock.json`; exits 0.

- [ ] **Step 4b: Add the React Query dependency** (dep only — provider is wired in M3, not here)

```bash
npm install @tanstack/react-query
```
Verify it appears under `dependencies` in `package.json`.

- [ ] **Step 5: Verify TS strict is on**

Run:
```bash
grep '"strict"' tsconfig.json
```
Expected: `"strict": true,`. If absent, edit `tsconfig.json` to set `"strict": true` under `compilerOptions`.

- [ ] **Step 6: Add a `typecheck` script**

Edit `package.json` `scripts` to add (keep the scaffolded `dev`/`build`/`start`/`lint`):
```json
"typecheck": "tsc --noEmit"
```

- [ ] **Step 7: Verify the app builds, lints, and typechecks**

Run each; all must exit 0:
```bash
npm run build      # Expected: "Compiled successfully" / route table printed
npm run lint       # Expected: "No ESLint warnings or errors"
npm run typecheck  # Expected: no output, exit 0
```
A successful `build` confirms the scaffold is sound. The "app actually serves a page" check is owned by Playwright's `webServer` in Task 5 (and the final gate in Task 8), so there's no fragile manual dev-server smoke here. To eyeball it manually now, optionally run `npm run dev` and open `http://localhost:3000`, then stop the server.

- [ ] **Step 8: Clean up the throwaway dir and commit**

```bash
rm -rf /tmp/hbp-scaffold
git add -A
git commit -m "build: scaffold Next.js 15 + TS strict + Tailwind v4 (M0)"
```

---

## Task 2: Prettier + import ordering + ESLint integration

**Files:**
- Create: `prettier.config.mjs`
- Modify: `eslint.config.mjs`, `package.json`

- [ ] **Step 1: Install Prettier and plugins**

```bash
npm install -D prettier eslint-config-prettier \
  prettier-plugin-tailwindcss @ianvs/prettier-plugin-sort-imports
```

- [ ] **Step 2: Create `prettier.config.mjs`**

`prettier-plugin-tailwindcss` must be **last** in the plugins array.
```js
/** @type {import("prettier").Config} */
const config = {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  plugins: [
    '@ianvs/prettier-plugin-sort-imports',
    'prettier-plugin-tailwindcss',
  ],
  importOrder: [
    '^(react|react-dom|next)(/.*)?$',
    '<THIRD_PARTY_MODULES>',
    '^@/(.*)$',
    '^[./]',
  ],
};

export default config;
```

- [ ] **Step 3: Disable ESLint formatting rules via `eslint-config-prettier`**

Edit `eslint.config.mjs`. Add the import at the top and append `eslintConfigPrettier` as the **last** item of the exported array. Example (match the scaffold's existing structure — it uses `FlatCompat`):
```js
import eslintConfigPrettier from 'eslint-config-prettier';
// ...existing imports and compat setup...

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  eslintConfigPrettier,
];

export default eslintConfig;
```

- [ ] **Step 4: Add `format` scripts to `package.json`**

```json
"format": "prettier --write .",
"format:check": "prettier --check ."
```

- [ ] **Step 5: Format the codebase and verify lint still passes**

```bash
npm run format        # Expected: rewrites scaffolded files, exits 0
npm run format:check  # Expected: "All matched files use Prettier code style!"
npm run lint          # Expected: no errors
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "build: add Prettier, import ordering, ESLint integration (M0)"
```

---

## Task 3: Folder skeleton + relocate seed

**Files:**
- Create: `components/.gitkeep`, `hooks/.gitkeep`, `lib/.gitkeep`, `stores/.gitkeep`, `types/.gitkeep`
- Move: `docs/mock-data.json` → `services/mock/hotels.json`

- [ ] **Step 1: Create the empty skeleton dirs with `.gitkeep`**

```bash
for d in components hooks lib stores types; do
  mkdir -p "$d" && touch "$d/.gitkeep"
done
```
(`app/` exists from the scaffold; `mocks/` and `e2e/` are created in Tasks 4–5; `services/mock/` is created by the move below.)

- [ ] **Step 2: Move the seed behind the service boundary**

```bash
mkdir -p services/mock
git mv docs/mock-data.json services/mock/hotels.json
```
Expected: `docs/mock-data.json` no longer exists; `services/mock/hotels.json` is staged as a rename.

- [ ] **Step 3: Verify the seed is intact (40-hotel array) and not imported anywhere**

```bash
node -e "const d=require('./services/mock/hotels.json'); if(!Array.isArray(d)||d.length!==40) throw new Error('seed shape changed: '+(Array.isArray(d)?d.length:typeof d)); console.log('seed OK: 40 hotels');"
grep -rn "hotels.json" app components hooks lib stores types services 2>/dev/null || echo "no importers yet (expected)"
```
Expected: `seed OK: 40 hotels`, and no source file imports it yet.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "build: add folder skeleton; move seed to services/mock/hotels.json (M0)"
```

---

## Task 4: Jest + RTL + jsdom + MSW v2 bootstrap

**Files:**
- Create: `jest.config.js`, `jest.setup.ts`, `jest.polyfills.js`, `mocks/handlers.ts`, `mocks/server.ts`, `mocks/browser.ts`, `mocks/server.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Install test dependencies**

```bash
npm install -D jest jest-environment-jsdom \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  @types/jest undici
npm install -D msw@latest
```
(`next/jest` ships with `next`; no separate install. `undici` provides `fetch`/`Response` polyfills MSW v2 needs under jsdom.)

- [ ] **Step 2: Create `jest.polyfills.js`** (loaded before the test framework)

```js
// jest.polyfills.js — MSW v2 needs Web Streams + fetch primitives in jsdom.
const { TextEncoder, TextDecoder } = require('node:util');
const { ReadableStream, TransformStream } = require('node:stream/web');
const { fetch, Headers, FormData, Request, Response } = require('undici');

Object.defineProperties(globalThis, {
  TextEncoder: { value: TextEncoder },
  TextDecoder: { value: TextDecoder },
  ReadableStream: { value: ReadableStream },
  TransformStream: { value: TransformStream },
  fetch: { value: fetch, writable: true },
  Headers: { value: Headers },
  FormData: { value: FormData },
  Request: { value: Request },
  Response: { value: Response },
});
```

- [ ] **Step 3: Create `jest.setup.ts`**

```ts
import '@testing-library/jest-dom';
```

- [ ] **Step 4: Create `jest.config.js`** (via `next/jest`; CommonJS so no `ts-node` needed)

```js
const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const config = {
  setupFiles: ['<rootDir>/jest.polyfills.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',
  // MSW v2 + jsdom: resolve Node interceptors.
  testEnvironmentOptions: { customExportConditions: [''] },
  testMatch: ['**/?(*.)+(test).[jt]s?(x)'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/e2e/'],
  // Non-blocking in M0: collect but do NOT enforce a threshold (gate activates in M1/M7).
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'services/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
  ],
};

module.exports = createJestConfig(config);
```

- [ ] **Step 5: Create the MSW bootstrap files**

`mocks/handlers.ts`:
```ts
import type { RequestHandler } from 'msw';

// Empty in M0; real handlers (http.get(...) / HttpResponse) are added when
// integration tests arrive (M4/M5).
export const handlers: RequestHandler[] = [];
```

`mocks/server.ts`:
```ts
import { setupServer } from 'msw/node';

import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

`mocks/browser.ts`:
```ts
import { setupWorker } from 'msw/browser';

import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

- [ ] **Step 6: Write the failing bootstrap test**

`mocks/server.test.ts`:
```ts
import { server } from './server';

describe('MSW server bootstrap', () => {
  it('starts and stops without throwing', () => {
    expect(() => {
      server.listen();
      server.close();
    }).not.toThrow();
  });
});
```

- [ ] **Step 7: Run it to verify the toolchain works**

Run:
```bash
npx jest mocks/server.test.ts
```
Expected: PASS. If it fails importing `Response`/`fetch`, confirm `jest.polyfills.js` is listed under `setupFiles` and `undici` is installed — that chain is the common MSW-v2-under-jsdom failure.

- [ ] **Step 8: Add `test` scripts and verify**

Edit `package.json` `scripts`:
```json
"test": "jest --passWithNoTests",
"test:coverage": "jest --coverage --passWithNoTests"
```
Run:
```bash
npm test            # Expected: 1 passed (MSW bootstrap)
npm run test:coverage   # Expected: runs, prints a coverage table, exits 0 (no threshold enforced)
```

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "test: set up Jest + RTL + jsdom and MSW v2 bootstrap (M0)"
```

---

## Task 5: Playwright + smoke spec

**Files:**
- Create: `playwright.config.ts`, `e2e/smoke.spec.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Playwright and a browser**

```bash
npm install -D @playwright/test
npx playwright install chromium
```
(`playwright install` downloads the browser locally; it is not committed.)

- [ ] **Step 2: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 3: Write the smoke spec**

`e2e/smoke.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('home page loads', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.ok()).toBeTruthy();
  await expect(page.locator('body')).toBeVisible();
});
```

- [ ] **Step 4: Add the `test:e2e` script and run it**

Edit `package.json` `scripts`:
```json
"test:e2e": "playwright test"
```
Run:
```bash
npm run test:e2e
```
Expected: Playwright boots the dev server and the `home page loads` test PASSES. (First run may take ~30–60s while the dev server compiles.)

- [ ] **Step 5: Confirm Jest does not pick up Playwright specs**

Run:
```bash
npx jest --listTests | grep -c "e2e/" || echo "0 (e2e excluded from Jest — correct)"
```
Expected: `0` — `e2e/` is excluded via `testPathIgnorePatterns`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "test: add Playwright config and home-page smoke spec (M0)"
```

---

## Task 6: README skeleton

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the one-line README with the install/run/test skeleton**

Overwrite `README.md` with:
```markdown
# Hotel Booking Portal

Phase 1 — hotel discovery interface. Pick a destination → browse/filter/sort
hotels → open a hotel → check room availability for dates.

> Detailed architecture: see [`docs/architecture.md`](docs/architecture.md).
> State-management approach and component breakdown are completed in M8.

## Prerequisites

- Node.js 22+ and npm 11+

## Install

```bash
npm install
npx playwright install chromium   # one-time, for E2E tests
```

## Run locally

```bash
npm run dev        # http://localhost:3000
```

## Build

```bash
npm run build
npm run start
```

## Test

```bash
npm test           # Jest unit/integration (RTL, MSW)
npm run test:coverage
npm run test:e2e   # Playwright end-to-end
```

## Quality

```bash
npm run lint
npm run typecheck
npm run format:check
```
```

- [ ] **Step 2: Verify the markdown is well-formed and commit**

```bash
npm run format -- README.md   # Expected: formats cleanly
git add README.md
git commit -m "docs: add README skeleton (install/run/test) (M0)"
```

---

## Task 7: Doc deltas (progress.md + M1 spec reference)

**Files:**
- Modify: `docs/progress.md`, `docs/superpowers/specs/2026-06-08-m1-data-layer-design.md`

- [ ] **Step 1: Update `docs/progress.md` M0 — date-picker decision (native)**

Replace this line:
```
- [ ] Add a **date-picker** dependency (native `<input type="date">` is acceptable — `⚠︎ decision`: library vs native).
```
with:
```
- [x] Date input: use **native `<input type="date">`** — no library dependency (decision resolved).
```

- [ ] **Step 2: Update `docs/progress.md` M0 — defer CI**

Replace this line:
```
- [ ] **CI pipeline** (GitHub Actions): lint → typecheck → unit (coverage gate **≥85%**) → MSW integration → Playwright E2E; PR can't merge unless green.
```
with:
```
- [-] **CI pipeline** (GitHub Actions) — **deferred** out of M0 (decision); the lint → typecheck → unit (≥85% gate) → integration → E2E pipeline is wired in a later milestone (M7). M0 ships local scripts only; the coverage gate is non-blocking until `lib/`+`services/` exist.
```

- [ ] **Step 3: Update `docs/progress.md` M0 — Done-when (local scripts, not CI)**

Replace this line:
```
- **Done when:** `dev` server boots a blank page, `test` + `test:e2e` run (even with 0 tests), and CI runs green on an empty PR.
```
with:
```
- **Done when:** `npm run dev` boots a blank page; `npm run lint`, `npm run typecheck`, `npm test`, and `npm run test:e2e` all pass locally; `services/mock/hotels.json` is in place (no importers yet); the folder skeleton is committed. (CI is deferred — see the CI line above.)
```

- [ ] **Step 4: Fix the stale seed-path reference in the M1 spec**

In `docs/superpowers/specs/2026-06-08-m1-data-layer-design.md`, replace:
```
Verified against `docs/mock-data.json` (40 hotels):
```
with:
```
Verified against `services/mock/hotels.json` (40 hotels):
```

- [ ] **Step 5: Commit**

```bash
git add docs/progress.md docs/superpowers/specs/2026-06-08-m1-data-layer-design.md
git commit -m "docs: record M0 decisions (native date, CI deferred); fix M1 seed path"
```

---

## Task 8: Final verification (Done-when gate)

**Files:** none (verification only)

- [ ] **Step 1: Run the full local gate**

Run each; all must exit 0:
```bash
npm run lint
npm run typecheck
npm run format:check
npm test
npm run test:e2e
npm run build
```

- [ ] **Step 2: Confirm the Done-when checklist from the spec (§8)**

```bash
test -f services/mock/hotels.json && echo "seed in place"
git ls-files components hooks lib stores types | grep -c .gitkeep   # Expected: 5
test ! -f docs/mock-data.json && echo "old seed path removed"
grep -rn "hotels.json" app components hooks lib stores types 2>/dev/null || echo "no client importers (correct)"
```
Expected: `seed in place`, `5`, `old seed path removed`, `no client importers (correct)`.

- [ ] **Step 3: Verify the working tree is clean**

```bash
git status --short   # Expected: empty (everything committed)
```

- [ ] **Step 4: (Optional) push the branch**

Only if the user asks to push:
```bash
git push -u origin docs/initial-docs
```

---

## Self-Review (completed by plan author)

**Spec coverage** — every M0 in-scope item maps to a task:
- Scaffold Next 15 + TS strict + Tailwind v4 → Task 1
- `@tanstack/react-query` dep → Task 1, Step 4b
- ESLint + Prettier + import order → Tasks 1 (ESLint scaffolded) + 2
- Jest + RTL + jsdom (next/jest, `--passWithNoTests`, non-blocking coverage) → Task 4
- MSW v2 bootstrap + Jest polyfills + `customExportConditions` → Task 4
- Playwright + smoke spec → Task 5
- Folder skeleton + `.gitkeep` → Task 3
- Move seed → `services/mock/hotels.json` → Task 3
- README skeleton → Task 6
- Doc deltas (progress.md, M1 ref) → Task 7
- Done-when verification → Task 8

**Gap found & fixed:** the spec lists `@tanstack/react-query` as an M0 dependency (provider wired in M3) but the scaffold doesn't add it — now Task 1, Step 4b.

**Placeholder scan:** none — every code/config step shows full content.

**Type consistency:** `handlers` (array) → consumed by `setupServer(...handlers)` and `setupWorker(...handlers)`; `server` export → imported by `mocks/server.test.ts`. Script names (`dev/build/start/lint/typecheck/format/format:check/test/test:coverage/test:e2e`) are consistent across Tasks 1, 2, 4, 5 and the README (Task 6).
