# M7 — Testing & Coverage Gate — Design Spec

> Phase 1, Milestone M7 (see `docs/progress.md`). Enforce the PRD §5 quality bar in CI:
> unit + integration coverage **≥ 85%** (PR-blocking) and the Playwright primary-flow
> **E2E** green against a **production build**, on every PR and on `main`.
> Sources: `prd.md` §5/§7, `architecture.md` §9, and the M0–M6 specs.

**Status:** approved design — plan in `docs/superpowers/plans/2026-06-08-m7-testing-coverage.md`.

**Framing.** The per-feature unit/integration tests are authored *inside* M1–M6. M7 does
**not** re-author them — it (1) wires the GitHub Actions pipeline, (2) authors the
Playwright E2E specs, and (3) turns on the coverage gate and fills whatever gaps the
report flags. M0 already scaffolded `playwright.config.ts`, `e2e/`, and a
`collectCoverageFrom` list with **no threshold**; the CI workflow was explicitly deferred
from M0 to here.

---

## 1. Scope

**In scope:** `.github/workflows/ci.yml`; `jest.config.js` `coverageThreshold`;
`playwright.config.ts` (CI-aware production server); `e2e/` primary-flow + no-results +
no-rooms specs; coverage gap-filling to reach 85%.

**Out of scope:** Lighthouse-CI / perf gates (M6 measures; P2 may gate); visual-regression;
cross-browser beyond Chromium; deploy (M9).

**Depends on M0–M6** (all features + their tests, the `track()` registry, the boundary
components) and the real BFF + seed (E2E uses neither MSW nor mocks).

---

## 2. CI pipeline (`.github/workflows/ci.yml`)

Triggered on `pull_request` and `push` to `main`. Two jobs:

- **`quality`** — `npm ci` → `npm run lint` → `npm run typecheck` → `npm run test:coverage`.
  The coverage gate (§3) fails the job under threshold, blocking the PR. Uploads the
  coverage summary artifact.
- **`e2e`** — `npm ci` → `npx playwright install --with-deps chromium` →
  `npm run test:e2e`. Playwright's `webServer` performs the `next build && next start` in
  CI (§4). Uploads the Playwright HTML report / trace on failure.

Node version pinned to the project's **Node 22** (the README requires Node 22+); npm cache
via `actions/setup-node`. The
two jobs run independently so a lint failure and an E2E failure surface together.

---

## 3. Coverage gate (`jest.config.js`)

- Add `coverageThreshold.global = { statements: 85, lines: 85, functions: 85, branches: 85 }`
  (flat global across all four metrics — the project decision).
- Extend `collectCoverageFrom` to add `utils/**/*.{ts,tsx}` (where `track()` lives) to the
  existing `lib/ services/ hooks/ components/ app/`.
- `npm run test:coverage` is the gate command CI runs.

**Gap-filling.** Run coverage, read the per-file report, and add the missing **unit** tests
(not E2E) for any file below 85% — most commonly **branch** coverage on JSX/boundary pages
(the strict part of a flat 85%). The M6 boundary tests already cover `error`/`global-error`/
`loading`/`not-found`; the gap-fill closes whatever remains (e.g. an untested `error.tsx`
`useEffect`, a `RoomAvailability` state arm). Do not lower the threshold or exclude files to
pass — fix coverage with tests.

---

## 4. Playwright config & E2E (`playwright.config.ts`, `e2e/`)

**Config (modify M0's scaffold):**
- `webServer.command = process.env.CI ? 'npm run build && npm run start' : 'npm run dev'`;
  `reuseExistingServer: !process.env.CI`; raise `timeout` to cover the build.
- Keep `baseURL: 'http://localhost:3000'`, `retries: 2` in CI, `trace: 'on-first-retry'`;
  add `screenshot: 'only-on-failure'`. Chromium-only project (mobile-first; one engine in P1).
- E2E exercises the **real app + real seed** end-to-end — no MSW, no network mocking.
- **Runtime env:** the detail page (M5) is a server component whose SSR `getJson` prepends
  `API_BASE_URL`; `.env.local` is gitignored, so the E2E `webServer` must inject
  `API_BASE_URL=http://localhost:3000` via `webServer.env` (covers local + CI). Without it,
  the home-grid spec still passes but every detail-page spec fails when the SSR fetch throws
  on a relative URL. The plan wires this in the Playwright config.

**Specs (replace the smoke stub):** selectors are role/label/text based (no nth-child),
and all three share the **Chicago** destination (a real seed city with both a
has-availability and a no-availability hotel).

| Spec | Flow | Assertion |
| --- | --- | --- |
| `primary-flow.spec.ts` | pick **Chicago** → apply a star filter → sort → open **The Grand Luminary** (`hotel-01`, 5★) → availability auto-resolves via the **2026-07-10 → 2026-07-12 demo default** | a ✓ Available room with a price/night renders after the skeleton |
| `no-results.spec.ts` | pick **Chicago** → apply a filter combination that yields zero hotels (e.g. a min-price above every Chicago room) | the "no matching hotels" empty state + reset action |
| `no-rooms.spec.ts` | pick **Chicago** → open **Magnolia Place Chicago** (`hotel-04`, empty `available_dates`) → demo-default dates | "No rooms available for these dates" |

Determinism rests on the seed dates all being July 2026 and the demo-default seeding
(M5) — the success path resolves without manual date entry, and the no-rooms hotel is a
fixed seed id. (The plan confirms these ids/names against `services/mock/hotels.json` at
execution time in case the seed shifts.)

---

## 5. Done when

`quality` + `e2e` jobs green in CI; the 85% gate enforced and passing (gaps filled with
tests); the three E2E specs pass against the production build. progress.md M7 checked off.

---

## 6. Decisions

- **Flat global 85%** on all four metrics over `lib/ services/ hooks/ components/ utils/ app/`
  — gaps closed by tests, never by exclusions (§3).
- **E2E against a production build in CI** (`next build && next start`), real seed, no MSW;
  dev server locally for speed (§4).
- **Primary flow + two edges** (no-results, no-rooms), all on the Chicago seed city (§4).
- **Chromium-only**, GitHub Actions, two jobs (§2). Cross-browser / visual-regression are P2.
