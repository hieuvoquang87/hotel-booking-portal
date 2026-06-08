# Design — UI Mockups & Specs

The visual source of truth for Phase 1 UI. When building the actual pages
(progress milestones **M4** and **M5**), **replicate these mockups** and treat the
matching design spec as the written contract.

## Assets

| Page | Route | Rendered mockup (open in browser) | Written spec | Build in |
|------|-------|-----------------------------------|--------------|----------|
| Home — Search + Hotel Grid | `/` | [home-page-mockup.html](home-page-mockup.html) | [home-page-design-spec.md](home-page-design-spec.md) | [M4](../progress.md) |
| Hotel Detail + Room Availability | `/hotels/[id]` | [hotel-detail-page-mockup.html](hotel-detail-page-mockup.html) | [hotel-detail-page-design-spec.md](hotel-detail-page-design-spec.md) | [M5](../progress.md) |

## How to use

- **`*-mockup.html`** — a self-contained, browser-renderable mock. Open it directly
  (`open docs/designs/home-page-mockup.html`) to see the intended layout, spacing,
  color, states, and responsive behavior. This is what the built page should look like.
- **`*-design-spec.md`** — the contract behind the mock: design tokens, component
  anatomy, responsive breakpoint tables, every empty/loading/error state, the
  analytics events, and a per-page acceptance checklist. When the mock and a doc
  disagree, the spec wins.

## Replication notes (Phase 1)

- **Visual direction:** Clean & modern — neutral slate scale + one blue accent
  (`#2563EB`), photo-forward rounded cards, generous whitespace. **Mobile-first**, WCAG 2.1 AA.
- **Map mockup → code with Tailwind tokens** (the spec lists the exact slate/blue
  scale and Tailwind-default breakpoints `sm/md/lg/xl`).
- **Demo data window:** the detail mock pre-fills check-in `2026-07-10` →
  check-out `2026-07-12` and auto-loads availability, because all seed
  `available_dates` are in **July 2026** — defaulting to "today" would show every
  room unavailable. Keep this behavior in the implementation so the happy path renders.
- **Placeholders:** dataset has no images → 16:9 slate placeholder blocks (no CLS);
  prices in USD.
- Resolved design decisions baked into the mocks: star filter is **minimum "& up"**,
  cards show **both** `star_rating` and `overall_rating` + review count, default sort
  **Recommended** (overall-rating desc), home grid page size **8**, availability
  latency **~1200ms**.
