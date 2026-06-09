# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

Phase 1 of a client-facing **hotel discovery interface**: pick a destination →
browse / filter / sort / paginate its hotels → open a hotel → check room
availability for dates. Mobile-first (assumed 80% mobile traffic). Currently an
early Next.js scaffold — most milestones are not yet implemented.

## Docs are the source of truth

The repo is spec-driven; read before implementing. Don't duplicate these into code comments.

- [docs/architecture.md](docs/architecture.md) — **the single technical entry-point** (requirements → design, layering, API contract, why).
- [docs/prd.md](docs/prd.md) — product requirements, feature acceptance criteria (F1–F5).
- [docs/progress.md](docs/progress.md) — **the milestone + task tracker** (M0–M9). Your work queue and check-off surface (see below).
- [docs/superpowers/specs/](docs/superpowers/specs/) + [docs/superpowers/plans/](docs/superpowers/plans/) — per-milestone design spec and implementation plan. **Read the relevant milestone's spec and plan before writing its code.**
- Also: `assumptions-and-tradeoffs.md`, `user-flows.md`, `product-roadmap.md`, `deployment.md`, `designs/`.

## Milestone workflow — check off progress after every implementation

Work is organized into milestones M0–M9 in [docs/progress.md](docs/progress.md). **After completing any implementation task, update that file** — this is a required step, not optional cleanup:

1. **Check off only when the task's "Done when" gate is actually met** — tests green, behavior verified. Code merely written ≠ done. Don't tick prematurely.
2. **Sync all status surfaces in `progress.md`:** flip the task `- [ ]` → `- [x]`; update the milestone's row in the **Progress at a Glance** table; at release, the **Definition of Done** checklist.
3. **Use the status legend:** `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` deferred to P2.
4. Open decisions are flagged `⚠︎ decision` with defaults in progress.md §"Open Questions" (star filter = minimum, card shows both ratings, ~1s availability latency, native date picker) — follow the default unless told otherwise.

## Architecture invariants

Distilled from architecture.md — the rules that span multiple files and must not be broken:

- **Client reaches data only via `/api/*` (the BFF).** `services/hotelService.ts` and `services/availabilityService.ts` are **server-only**. The UI never imports them or the seed directly.
- **Layering:** `components` (UI) → `hooks` (logic, React Query) → `stores` (client state) → `/api` (BFF route handlers) → `services` (data gateway) → mock data. `lib/` = pure functions (filters, sort, paginate, slug, availability).
- **State split:** server state → **React Query**, keyed by query params. Client state → **URL `searchParams`** (`country, city, stars, min, max, sort, page`; shareable, back-button-correct) **+** `AppProvider` for check-in/check-out **dates, which are deliberately NOT in the URL**.
- **Location-first loading:** never ship global inventory — load only the chosen location's hotels, then filter/sort/paginate that subset in memory (< 100ms).
- **Pricing/availability is decoupled and lazy** — a simulated slow third-party. It loads progressively and must never block hotel browsing or detail rendering.
- **Domain types, not raw seed:** services map the nested seed shape → domain types (`Hotel`, `Room`, `Location`, `Availability`) at the boundary. The UI consumes normalized fields only.

## Commands

```bash
npm run dev           # start the dev server (Next.js)
npm run build         # production build
npm run start         # serve the production build
npm run lint          # ESLint (eslint-config-next: core-web-vitals + typescript)
npm run typecheck     # tsc --noEmit
npm run format        # prettier --write .
npm run format:check  # prettier --check .
npm test              # Jest — all tests (unit + integration, --passWithNoTests)
npm run test:unit     # Jest — unit tests only (tests/unit/)
npm run test:integration # Jest — integration tests only (tests/integration/)
npm run test:coverage # Jest with coverage report (non-blocking gate until M1/M7)
npm run test:e2e      # Playwright end-to-end (smoke spec in e2e/)
```

**Test layout:** Tests do not co-locate with source. All tests live under `tests/`:
- `tests/unit/` — mirrors source structure (`lib/`, `services/`, `types/`, `mocks/`, `api/_lib/`)
- `tests/integration/` — API route integration tests (`api/locations`, `api/hotels`, `api/hotels-id`, `api/hotels-id-rooms`)

**Test environment:** Jest uses `jest-fixed-jsdom` (not stock `jest-environment-jsdom`) — this preserves Node's fetch/Request/Response globals that MSW v2 requires. MSW's ESM dependencies are injected into `next/jest`'s `transformIgnorePatterns` rather than replacing them (replacing would silently drop `geist`/`next/dist/*` transforms). Route test files (node-only) carry a `/** @jest-environment node */` docblock to override the default jsdom environment.

## Conventions & gotchas

- **Next.js version caveat (see `@AGENTS.md`): this Next.js has breaking changes vs. training data — read `node_modules/next/dist/docs/` before writing Next-specific code.** Next 16, React 19, App Router, TypeScript `strict: true`.
- **Path alias:** `@/*` maps to the repo root (e.g. `@/lib/slug`).
- **Seed data:** lives at `services/mock/hotels.json` (moved from `docs/mock-data.json` in M0). Stays behind the service boundary and is never imported outside `services/`. No `getLocations()` seed file exists — locations are _derived_ by aggregating unique city+country across the 40 hotels.
- **Slugs:** location URL params are slugified, diacritics stripped (`United Kingdom` → `united-kingdom`); `lib/slug.ts` must reverse-match slug → seed value.
- Prices are USD; photos are placeholders (seed has no currency/image fields). Dates are ISO strings, no timezone math. Only date validation: checkout > check-in.
- A room is available iff **every** night in `[check-in → check-out)` is in its `available_dates`.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **laughing-wiles-490823** (1321 symbols, 2032 relationships, 33 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/laughing-wiles-490823/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool | When to use | Command |
|------|-------------|---------|
| `query` | Find code by concept | `gitnexus_query({query: "auth validation"})` |
| `context` | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})` |
| `impact` | Blast radius before editing | `gitnexus_impact({target: "X", direction: "upstream"})` |
| `detect_changes` | Pre-commit scope check | `gitnexus_detect_changes({scope: "staged"})` |
| `rename` | Safe multi-file rename | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher` | Custom graph queries | `gitnexus_cypher({query: "MATCH ..."})` |

## Impact Risk Levels

| Depth | Meaning | Action |
|-------|---------|--------|
| d=1 | WILL BREAK — direct callers/importers | MUST update these |
| d=2 | LIKELY AFFECTED — indirect deps | Should test |
| d=3 | MAY NEED TESTING — transitive | Test if critical path |

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/laughing-wiles-490823/context` | Codebase overview, check index freshness |
| `gitnexus://repo/laughing-wiles-490823/clusters` | All functional areas |
| `gitnexus://repo/laughing-wiles-490823/processes` | All execution flows |
| `gitnexus://repo/laughing-wiles-490823/process/{name}` | Step-by-step execution trace |

## Self-Check Before Finishing

Before completing any code modification task, verify:
1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## Keeping the Index Fresh

After committing code changes, the GitNexus index becomes stale. Re-run analyze to update it:

```bash
npx gitnexus analyze
```

If the index previously included embeddings, preserve them by adding `--embeddings`:

```bash
npx gitnexus analyze --embeddings
```

To check whether embeddings exist, inspect `.gitnexus/meta.json` — the `stats.embeddings` field shows the count (0 means no embeddings). **Running analyze without `--embeddings` will delete any previously generated embeddings.**

> Claude Code users: A PostToolUse hook handles this automatically after `git commit` and `git merge`.

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
