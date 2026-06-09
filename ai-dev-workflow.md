# AI Development Workflow

## 1. Requirements & Brainstorming

1. Analyze initial requirements; surface ambiguities and assumptions
2. Brainstorm ideas, edge cases, and trade-offs
3. Capture everything in draft docs before narrowing scope

## 2. High-Level Planning Docs

1. `ASSUMPTIONS-AND-TRADEOFFS.md` — decisions, rationale, costs
2. `prd.md` — product requirements and acceptance criteria (F1–Fn)
3. `user-flows.md` / `data-flow.md` — how users and data move through the system
4. `product-roadmap.md` — phased feature delivery

## 3. Architecture & Milestones

1. `architecture.md` — layering, data contracts, invariants, why
2. `progress.md` — milestone list (M0–Mn) with tasks, "Done when" gates, and status legend
3. Review and confirm milestone scope before implementation begins

## 4. Spec → Plan → Design (per milestone)

1. `docs/superpowers/specs/<milestone>-design.md` — what to build and why; load-bearing decisions
2. `docs/superpowers/plans/<milestone>.md` — task list with file targets, acceptance gates, and dependency order
3. `docs/designs/<page>-mockup.html` + `<page>-design-spec.md` — visual reference for UI milestones

## 5. Implementation (subagent-driven, per task)

For each task in the plan:

1. **Dispatch implementer subagent** with full task text + codebase context (no inherited session state)
2. Answer any questions before work begins
3. **Spec compliance review** — confirm code matches spec, nothing missing or extra
4. **Code quality review** — correctness, TypeScript strictness, test coverage gaps
5. Fix issues (re-dispatch to implementer; re-review until approved)
6. Mark task complete in `progress.md`

Run independent tasks in parallel; respect declared dependency order.

## 6. Milestone Wrap-Up

1. Run full test suite (`npm test`, `npm run typecheck`, `npm run lint`)
2. Check off the milestone's "Done when" gate in `progress.md`
3. Update the **Progress at a Glance** table and Definition of Done checklist
