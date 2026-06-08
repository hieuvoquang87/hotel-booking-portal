# M8 — Docs & Deliverables — Design Spec

> Phase 1, Milestone M8 (see `docs/progress.md`). The submission artifacts from
> `requirements.md` "Deliverables & Guidelines": a complete **README**, a single
> **Assumptions & Trade-offs** file, and an **AI-usage** transparency note.
> Sources: `requirements.md` §Deliverables, the M0–M7 specs, and the shipped app.

**Status:** approved design — plan in `docs/superpowers/plans/2026-06-08-m8-docs-deliverables.md`.

**Framing.** Pure documentation — no code, no new behavior. The README skeleton (M0)
already has install/run/test; M8 completes the two explanatory sections the requirements
ask for and adds the two companion files. Because these describe the *shipped* app, M8
runs late — its accuracy depends on M3–M5 (and ideally M9) being real.

---

## 1. Scope

**Three deliverables** (`requirements.md` §Documentation / §Assumptions / §AI Tooling Policy):

1. **`README.md`** (modify) — keep the existing install / run / test sections; add the two
   required explanations: **state-management approach** and **component breakdown**. Link
   the architecture and assumptions docs.
2. **`docs/assumptions-and-tradeoffs.md`** (finalize) — the **single** "separate file" the
   requirements mandate. It already exists and is substantial; M8 finalizes it against the
   shipped app (resolve the three open questions, drop any "planned/TBD" hedges) and links
   it prominently from the README. No duplicate root copy — one contained file.
3. **`AI-USAGE.md`** (create, repo root) — the transparency note: which AI tools were used
   and how (spec-driven brainstorming → plans → TDD execution), what was human-reviewed.

**Out of scope:** any code or test change; new architecture content (link to
`architecture.md`, don't restate it); deployment docs (M9 owns the live-URL line).

**Depends on M0–M7** for accurate content; the component-breakdown section assumes the
M4/M5 component tree exists. If a section can't yet be written truthfully (a component not
built), M8 isn't done — it's the penultimate milestone before deploy.

---

## 2. README additions (the two required explanations)

Concise, link-out rather than restate. Two new sections:

- **State management** — the architecture's state split: **server state → React Query**
  (keyed by query params, the four `use*` hooks); **client state → URL `searchParams`**
  (`country, city, stars, min, max, sort, page` — shareable, back-button-correct) **+
  `AppProvider`** for check-in/check-out **dates (deliberately not in the URL)**. One
  paragraph + the one-line "why" (shareable/crawlable), linking `architecture.md` §State split.
- **Component breakdown** — a short layered list reflecting the real tree: `app/` routes
  (home `page.tsx`, `hotels/[id]`, boundaries), `components/` (home: destination/filter/
  sort/grid/card; `hotel/`: hero, amenities, policies, `RoomAvailability` + room cards;
  shared: `RatingStars`, `InlineError`, `Icon`, `EmptyState`), `hooks/`, `stores/`,
  `lib/`, `services/` (server-only gateway), `app/api/` (BFF). One line per layer noting
  responsibility, mirroring `architecture.md` §Layering.

---

## 3. Assumptions & Trade-offs (finalize the single file)

`docs/assumptions-and-tradeoffs.md` is the contained deliverable. M8:

- Resolves the three open questions to the shipped defaults (progress.md §Open Questions):
  **star filter = minimum** ("4★ & up"), **card shows both ratings**, **availability
  latency ≈ 1s**.
- Removes forward-looking hedges that no longer apply once the app ships; keeps the
  P1-vs-P2 trade-off framing.
- Is linked from the README as "design thinking / trade-offs."

No second copy is created — the requirements say keep it to a single file.

## 4. AI-USAGE.md (new, root)

A short, honest transparency note (requirements §AI Tooling Policy):

- **Tools:** Claude Code (Anthropic), spec-driven `superpowers` workflow.
- **How:** brainstorming → per-milestone design specs (`docs/superpowers/specs/`) →
  implementation plans (`docs/superpowers/plans/`) → TDD execution; GitNexus for codebase
  navigation/impact.
- **Human oversight:** specs/plans reviewed before implementation; tests are the
  acceptance gate; the engineer owns architecture decisions and final review.
- Points to `ai-dev-workflow.md` (existing) for the workflow detail.

---

## 5. Done when

All three are present, accurate, and **consistent with the shipped app**: README
install/run/test commands work as written; the state-management + component-breakdown
sections match the real tree; the assumptions file is the single finalized deliverable;
`AI-USAGE.md` exists. progress.md M8 checked off.

---

## 6. Decisions

- **One assumptions file** — finalize `docs/assumptions-and-tradeoffs.md` in place; no root
  duplicate (requirements: "contained to a single file"). README links it.
- **README links, doesn't restate** architecture — the two new sections are summaries with
  pointers to `architecture.md`.
- **`AI-USAGE.md` at repo root** — reviewers expect the transparency note top-level.
- **M8 runs late** — content must describe the shipped app, so it depends on M3–M7.
