# M8 — Docs & Deliverables — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the three submission deliverables — a complete README (with state-management + component-breakdown sections), the single finalized Assumptions & Trade-offs file, and an AI-usage transparency note — all accurate to the shipped app.

**Architecture:** Documentation only. The README summarizes and links `architecture.md` rather than restating it; the assumptions file stays a single contained doc; `AI-USAGE.md` is a short root-level note. Verification is by inspection: commands run as written, links resolve, sections match the real component tree.

**Tech Stack:** Markdown. No code or test changes.

**Spec:** `docs/superpowers/specs/2026-06-08-m8-docs-deliverables-design.md`

**Conventions:** commit per deliverable. **Assumes M0–M7 are done** — content describes the shipped app; if a component referenced below doesn't exist yet, that milestone isn't complete and M8 can't be finished truthfully.

---

## File Map

| File | Responsibility |
| --- | --- |
| `README.md` | **(modify)** add **State management** + **Component breakdown** sections; link architecture + assumptions |
| `docs/assumptions-and-tradeoffs.md` | **(finalize)** resolve the three open questions to shipped defaults; drop stale hedges |
| `AI-USAGE.md` | **(create, root)** transparency note |
| `docs/progress.md` | **(modify)** check off M8 |

---

## Task 1: Complete the README

**Files:** Modify `README.md`

- [ ] **Step 1:** Verify the existing install/run/test commands are accurate.

Run: `npm install && npm run dev` (boots), then `npm test` and `npm run test:e2e`.
Expected: all run as the README documents; fix any drifted command/version.

- [ ] **Step 2:** Add a **## State management** section (replace the "completed in M8" note). Content: server state → React Query keyed by query params (the four `use*` hooks); client state → URL `searchParams` (`country, city, stars, min, max, sort, page`) + `AppProvider` for dates (not in the URL); one-line "why" (shareable / back-button-correct / crawlable). Link `docs/architecture.md` §State split.

- [ ] **Step 3:** Add a **## Component breakdown** section: a layered list matching the real tree — `app/` routes + boundaries; `components/` (home controls + grid/card; `hotel/` hero/amenities/policies/`RoomAvailability`/room cards; shared `RatingStars`/`InlineError`/`Icon`/`EmptyState`); `hooks/`; `stores/`; `lib/`; `services/` (server-only); `app/api/` (BFF). One line per layer. Cross-check names against the actual `components/` directory before writing.

- [ ] **Step 4:** Add a link to `docs/assumptions-and-tradeoffs.md` under a "Design notes" line.

- [ ] **Step 5:** Verify every link resolves.

Run: `grep -oE '\]\([^)]+\)' README.md` and confirm each path exists.
Expected: no broken links.

- [ ] **Step 6: Commit**
```bash
git add README.md
git commit -m "docs(M8): complete README — state management + component breakdown"
```

---

## Task 2: Finalize Assumptions & Trade-offs

**Files:** Modify `docs/assumptions-and-tradeoffs.md`

- [ ] **Step 1:** Resolve the three open questions to the shipped defaults: star filter = **minimum** ("4★ & up"); cards show **both** `star_rating` and `overall_rating`; availability latency ≈ **1s**. Update any section that still poses them as open.

- [ ] **Step 2:** Remove forward-looking hedges ("planned", "to be decided") that no longer hold now that the app ships; keep the P1-vs-P2 trade-off framing intact.

- [ ] **Step 3:** Confirm it remains a single self-contained file (no second copy created elsewhere) and that the README links it.

- [ ] **Step 4:** Read it once end-to-end for consistency with the shipped behavior.

- [ ] **Step 5: Commit**
```bash
git add docs/assumptions-and-tradeoffs.md
git commit -m "docs(M8): finalize assumptions & trade-offs for submission"
```

---

## Task 3: AI-USAGE.md

**Files:** Create `AI-USAGE.md`

- [ ] **Step 1:** Write the note:
```markdown
# AI Usage

This project was built with AI assistance, used transparently per the assignment's AI policy.

## Tools
- **Claude Code** (Anthropic) — the primary coding assistant.
- **Spec-driven `superpowers` workflow** — brainstorming → design specs → implementation plans → TDD execution.
- **GitNexus** — codebase navigation and change-impact analysis.

## How it was used
- Each milestone (M0–M9) was brainstormed into a design spec (`docs/superpowers/specs/`) and a task-by-task implementation plan (`docs/superpowers/plans/`) before any code.
- Implementation followed the plans test-first (Jest/RTL/MSW unit + integration, Playwright E2E).
- AI helped draft components, tests, and documentation; it navigated the codebase and assessed edit impact.

## Human oversight
- Every spec and plan was reviewed and approved before implementation.
- Tests are the acceptance gate; architecture decisions and final review are owned by the engineer.
- See `ai-dev-workflow.md` for the detailed workflow.
```

- [ ] **Step 2:** Confirm the referenced files (`docs/superpowers/specs/`, `docs/superpowers/plans/`, `ai-dev-workflow.md`) exist.

Run: `ls docs/superpowers/specs docs/superpowers/plans ai-dev-workflow.md`
Expected: all present.

- [ ] **Step 3: Commit**
```bash
git add AI-USAGE.md
git commit -m "docs(M8): add AI-usage transparency note"
```

---

## Task 4: Check off M8

**Files:** Modify `docs/progress.md`

- [ ] **Step 1:** Flip the M8 task checkboxes `- [ ]` → `- [x]` (README, ASSUMPTIONS-AND-TRADEOFFS, AI-USAGE) and set the **M8 row** in "Progress at a Glance" to `[x]`. If this completes the release set, update the **Definition of Done** checklist accordingly.

- [ ] **Step 2:** Final consistency pass — re-read all three deliverables together; confirm no contradictions and that commands/links work.

- [ ] **Step 3: Commit**
```bash
git add docs/progress.md
git commit -m "docs(M8): check off docs & deliverables"
```

---

## Self-Review (completed by the plan author)

- **Spec §2 README sections** → Task 1 (state management + component breakdown, links). ✓
- **Spec §3 assumptions finalize** → Task 2 (three defaults, single file). ✓
- **Spec §4 AI-USAGE** → Task 3 (tools / how / oversight). ✓
- **Spec §5 done-when** → Task 4. ✓
- **Placeholders:** none — the AI-USAGE body is complete content, not a stub.
- **Consistency:** file paths (`docs/assumptions-and-tradeoffs.md`, `ai-dev-workflow.md`, the superpowers dirs) match the repo; the three resolved defaults match progress.md §Open Questions.
