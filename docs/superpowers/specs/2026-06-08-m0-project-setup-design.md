# M0 — Project Setup & Tooling — Design Spec

> Phase 1, Milestone M0 (see `docs/progress.md`). Scaffolds the Next.js app, the
> test toolchain, the folder skeleton, and relocates the seed — the foundation
> every later milestone commits against.
> Sources: `architecture.md` §5, `product-roadmap.md`, `progress.md`, and the
> approved M1 spec (`2026-06-08-m1-data-layer-design.md`), which M0 must unblock.

**Status:** approved design — implementation plan follows in
`docs/superpowers/plans/2026-06-08-m0-project-setup.md`.

---

## 1. Goal & Scope

**Goal.** An empty Next.js (App Router) + TypeScript app boots, the full test
toolchain (Jest+RTL, MSW, Playwright) runs **green with zero tests**, the folder
skeleton from `architecture.md` §5 exists, and the seed lives behind `services/`.
This is the stable base M1 builds on.

**In scope (M0) — scaffolding only:**

- Scaffold Next.js 15 (App Router, React 19, TS `strict: true`) + Tailwind v4.
- Add `@tanstack/react-query` as a dependency (provider wired later in M3).
- ESLint (Next flat config) + Prettier + import-order; npm scripts.
- Jest + React Testing Library + `jest-environment-jsdom` via `next/jest`.
- MSW v2 bootstrap (handlers + node/browser servers + Jest polyfills).
- Playwright config + `e2e/` dir + one smoke spec.
- Folder skeleton (`components/`, `hooks/`, `lib/`, `services/`, `services/mock/`,
  `stores/`, `types/`, `mocks/`, `e2e/`) with `.gitkeep` for empty dirs.
- Move `docs/mock-data.json` → `services/mock/hotels.json`.
- `README.md` skeleton (install / run / test — filled out in M8).

**Out of scope (later milestones):** any domain types or `lib/` logic (M1), `/api/*`
routes (M2), React Query provider/hooks (M3), all UI (M4/M5), the `track()` facade
and error boundaries (M6), and the **CI pipeline + ≥85% coverage gate** (deferred —
see §8). M0 writes **no application logic** — only configuration and empty structure.

**This milestone unblocks M1**, whose spec states its only M0 dependency is: "a
TypeScript project, Jest, and `services/mock/hotels.json` in place."

---

## 2. Repo Starting State

The repo is **docs-only** — there is no `package.json`. Scaffolding must preserve
what exists.

| Present (must survive)                                   | Notes                                                        |
| -------------------------------------------------------- | ------------------------------------------------------------ |
| `.git`, GitHub remote `origin`                           | branch work continues as-is                                  |
| `.gitignore`                                             | already a full Node ignore file — **merge**, don't overwrite |
| `README.md`                                              | one line; **replaced** by the M0 skeleton                    |
| `docs/` (prd, architecture, roadmap, progress, specs, …) | untouched                                                    |
| `ai-dev-workflow.md`                                     | untouched                                                    |
| `docs/mock-data.json` (40-hotel array)                   | **moved** to `services/mock/hotels.json`                     |

Tooling available: **Node v22.14.0, npm 11.3.0** (supports Next 15 / React 19).

---

## 3. Scaffold Mechanism (Approach A — scaffold-in-temp, merge)

`create-next-app` refuses to run in a directory containing files it doesn't
whitelist (`docs/`, `ai-dev-workflow.md`, `mock-data.json` are not whitelisted), so
it cannot run in place. **Chosen approach:** scaffold into a throwaway directory,
then merge the generated app into the repo.

```
1. npx create-next-app@latest <tmp> --typescript --tailwind --eslint \
     --app --src-dir=false --import-alias "@/*" --use-npm --no-turbopack
2. Copy generated files into repo root: package.json, package-lock.json,
   tsconfig.json, next.config.*, postcss.config.*, eslint.config.mjs,
   next-env.d.ts, app/, public/, and Tailwind's globals.css.
3. MERGE .gitignore (append Next/Playwright/coverage entries not already present;
   the existing file already covers most). Do NOT clobber.
4. REPLACE the one-line README.md with the M0 skeleton (§7).
5. Delete <tmp>.
```

**Rejected — Approach B (manual):** hand-writing every config drifts from the
official template's blessed defaults for no benefit. Approach A gives canonical,
current Next 15 + Tailwind v4 config and confines risk to three known files
(`.gitignore`, `README.md`, and not clobbering `docs/`).

> Exact flag set and any post-scaffold reconciliation are finalized in the
> implementation plan; if a flag is unavailable in the installed CLI version, the
> plan falls back to the interactive equivalent producing the same config.

---

## 4. Stack & Resolved Defaults

Most of M0 is pre-decided by `progress.md` + the approved M1 spec. Defaults are
**stated, not polled**:

| Choice           | Decision                                                | Rationale                                                                      |
| ---------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Framework        | **Next.js 15**, App Router, React 19, TS `strict: true` | roadmap stack; create-next-app default                                         |
| Styling          | **Tailwind v4** (CSS-first; no `tailwind.config.js`)    | create-next-app default; mobile-first base                                     |
| Package manager  | **npm**                                                 | already present (npm 11.3); lockfile committed                                 |
| Server-state lib | `@tanstack/react-query` v5 — **dependency only**        | provider wired in M3, not M0                                                   |
| Date input       | **native `<input type="date">`; no library**            | resolves progress.md's date-picker `⚠︎ decision`; nothing later needs a library |
| Test runner      | **Jest** (not Vitest)                                   | every doc + the approved M1 spec assume Jest + an 85% gate                     |

---

## 5. Test Toolchain

All three layers must execute **green with zero real tests** at the end of M0.

### 5.1 Jest + RTL + jsdom (via `next/jest`)

- Config built with `next/jest` (`createJestConfig`) — inherits SWC transform, the
  `@/*` path alias, and CSS/asset mocks, so no manual Babel/ts-jest wiring.
- `testEnvironment: 'jest-environment-jsdom'`.
- `jest.setup.ts` imports `@testing-library/jest-dom`; deps include
  `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`.
- **Runner separation:** Jest `testMatch` = `**/*.test.ts?(x)`;
  `testPathIgnorePatterns` excludes `e2e/` and `node_modules`. Playwright owns
  `e2e/*.spec.ts`. The two never pick up each other's files.
- Scripts run with `--passWithNoTests` so an empty repo is green.

### 5.2 Coverage gate sequencing (resolves the empty-repo contradiction)

The `progress.md` Done-when implies an ≥85% gate at M0, but a threshold on a repo
with zero source/tests fails vacuously. Resolution:

- **M0:** no enforced `coverageThreshold` (or set to `0`); `test:coverage` runs and
  reports but never blocks.
- **Gate activation:** ≥85% is enforced once `lib/` + `services/` exist (M1 raises
  the threshold; M7 enforces it in CI). M0 only provides the script and the
  reporter config.

### 5.3 MSW v2 bootstrap

Set up now so the first integration test (M4/M5) works without a toolchain detour.

- `mocks/handlers.ts` (empty/placeholder array), `mocks/server.ts`
  (`setupServer`), `mocks/browser.ts` (`setupWorker`).
- **Known Jest+MSW-v2 plumbing handled in M0:** a `jest.polyfills.js`
  (TextEncoder/TextDecoder + `undici` `fetch`/`Response`/`Request`) loaded before
  the test framework, and jsdom `testEnvironmentOptions.customExportConditions:
['']` so MSW resolves its Node interceptors. `transformIgnorePatterns` adjusted
  if MSW's ESM needs transforming. No handlers are asserted in M0 — only that the
  server can `listen()`/`close()` without error.

### 5.4 Playwright

- `@playwright/test` + `playwright.config.ts` with a `webServer` block booting the
  app (`next dev`, `baseURL http://localhost:3000`), `testDir: 'e2e'`.
- One trivial **smoke spec** (`e2e/smoke.spec.ts`): load `/`, assert the page
  responds — so `test:e2e` is green.
- Browsers installed via `npx playwright install` (documented as a setup step; not
  a committed artifact).

---

## 6. Repo Structure

Create the skeleton from `architecture.md` §5. Empty dirs are tracked with
`.gitkeep` (git won't track an empty directory otherwise).

```
app/                 (scaffolded — layout.tsx, page.tsx, globals.css)
components/  .gitkeep
hooks/       .gitkeep
lib/         .gitkeep
services/    .gitkeep
services/mock/hotels.json      ← moved from docs/mock-data.json
stores/      .gitkeep
types/       .gitkeep          (M1 adds types/domain.ts)
mocks/       handlers.ts, server.ts, browser.ts   (MSW)
e2e/         smoke.spec.ts
```

**Seed move:** `git mv docs/mock-data.json services/mock/hotels.json`. The seed now
lives behind the service boundary and is imported by exactly one module later
(M1's `services/seed.ts`); nothing imports it during M0. The M1 spec §2 currently
references `docs/mock-data.json` — M0 updates that reference to the new path so it
doesn't go stale.

---

## 7. Tooling Config & Scripts

**Lint/format:** ESLint (Next 15 flat config, `eslint.config.mjs` from the
scaffold) + Prettier with `prettier-plugin-tailwindcss` (class ordering) and an
import-order rule (ESLint `import/order` or a Prettier sort-imports plugin —
finalized in the plan). `eslint-config-prettier` disables conflicting rules.

**`package.json` scripts:**

```
dev            next dev
build          next build
start          next start
lint           next lint
typecheck      tsc --noEmit
format         prettier --write .
format:check   prettier --check .
test           jest --passWithNoTests
test:coverage  jest --coverage --passWithNoTests
test:e2e       playwright test
```

**README skeleton:** replace the one-liner with `Install` / `Run locally` / `Test`
sections (stub commands now; full state-management + component breakdown added in
M8).

---

## 8. Done When / Verification

Anchored to exactly what M1 depends on, plus the green-toolchain outcome:

- [ ] `npm run dev` boots a blank page at `localhost:3000`.
- [ ] `npm run lint` passes.
- [ ] `npm run typecheck` passes (`tsc --noEmit`, `strict: true`).
- [ ] `npm test` runs and is green (`--passWithNoTests`).
- [ ] `npm run test:e2e` runs the smoke spec green.
- [ ] `services/mock/hotels.json` exists (40-hotel array); **no module imports it
      yet**.
- [ ] Folder skeleton committed (empty dirs via `.gitkeep`).
- [ ] Existing `docs/` and `ai-dev-workflow.md` are unchanged; `.gitignore` merged,
      not clobbered.

**CI explicitly deferred** (per decision): no GitHub Actions in M0. The pipeline
(lint → typecheck → unit+coverage gate → integration → E2E) and the ≥85% gate land
in a later milestone (folded into M7 / a dedicated CI step). `progress.md` M0's
"CI pipeline" task and its "CI green on empty PR" Done-when move there; M0's
Done-when is the local-scripts list above.

---

## 9. Decisions & Doc Deltas

**Resolved decisions:**

- Scaffold via **Approach A** (scaffold-in-temp, merge) — confirmed.
- **No CI in M0** — confirmed; deferred to a later milestone.
- Date picker = **native, no dependency** — resolves progress.md decision #4.
- Package manager = **npm**; styling = **Tailwind v4**; runner = **Jest**.
- Coverage gate is **non-blocking in M0**, activated when code exists (M1/M7).

**Doc deltas M0 implements (keep the doc set consistent):**

- `progress.md` M0: replace the GitHub-Actions/CI task + "CI green on empty PR"
  Done-when with the local-scripts Done-when; record the resolved date-picker
  (native) decision; move CI to the later milestone.
- M1 spec §2: update the `docs/mock-data.json` reference → `services/mock/hotels.json`.

**No open questions remain for M0** — all four `progress.md` M0 `⚠︎ decision` items
that touch setup (date picker) or sequencing (coverage gate, CI) are resolved
above; the remaining `⚠︎ decision` items (star-filter semantics, card rating,
availability latency) belong to M1/M4 and are already settled in the M1 spec.
