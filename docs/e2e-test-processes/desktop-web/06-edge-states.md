# Edge States — Desktop E2E Tests

> Tests edge cases: no-results after filtering, single-page pagination, brand chrome, and empty-state visual details.

## Prerequisites

| Requirement | Value |
|-------------|-------|
| Prior test | `02-results-refine` |
| Viewport | 1280×720 |
| State | Results visible (any destination) |

---

## Test Cases

### TC-EDGE-01: Filters that exclude all hotels show empty state with reset

- **Precondition:** Results visible.
- **Steps:**
  1. **Action:** Apply extreme filters that exclude all hotels
     - **Selector:** `button "5★"` (star filter)
     - **Selector:** `textbox "Minimum price"` → `9999`
  2. **Action:** Blur to commit
  3. **Action:** Snapshot
     - **Command:** `playwright-cli snapshot`
  4. **Action:** Screenshot
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/e2e-edge-01-no-results.png`
  5. **Action:** Click reset
     - **Selector:** `button "Reset filters"`
  6. **Action:** Snapshot to verify recovery
     - **Command:** `playwright-cli snapshot`
- **Assert:**
  - [ ] EmptyState card visible: "No hotels found"
  - [ ] Subtext: "Try widening your filters to see more stays."
  - [ ] "Reset filters" button visible
  - [ ] Clicking reset restores full results (filters cleared)
  - [ ] URL params cleared after reset
- **Screenshot:** `e2e-edge-01-no-results.png`

---

### TC-EDGE-02: Single page of results hides pagination

- **Precondition:** A destination with ≤8 hotels selected (e.g., "Chicago, IL" has 4).
- **Steps:**
  1. **Action:** Navigate to a small result set
     - **Command:** `playwright-cli open ${BASE_URL}?country=united-states&city=chicago`
  2. **Wait:** Hotels load
  3. **Action:** Scroll to bottom of results
     - **Command:** `playwright-cli eval "window.scrollTo(0, document.body.scrollHeight)"`
  4. **Action:** Snapshot
     - **Command:** `playwright-cli snapshot`
- **Assert:**
  - [ ] No pagination controls visible (totalPages = 1, component returns null)
  - [ ] All 4 hotel cards visible on one page
  - [ ] No "Page 1 of 1" shown
- **Screenshot:** `e2e-edge-02-no-pagination.png`

---

### TC-EDGE-03: Footer and brand chrome

- **Precondition:** On home page or results.
- **Steps:**
  1. **Action:** Scroll to the very bottom of the page
     - **Command:** `playwright-cli eval "window.scrollTo(0, document.body.scrollHeight)"`
  2. **Action:** Snapshot
     - **Command:** `playwright-cli snapshot`
  3. **Action:** Screenshot
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/e2e-edge-03-footer.png`
- **Assert:**
  - [ ] Footer visible with "Stayfinder · Phase 1" text
  - [ ] Footer centered, slim, in normal page flow
  - [ ] Header brand badge: blue rounded-square (`bg-blue-600`, `rounded-lg`) with white pin icon + "Stayfinder"
- **Screenshot:** `e2e-edge-03-footer.png`

---

### TC-EDGE-04: EmptyState icon is blue-tinted (not gray)

- **Precondition:** No destination selected (home page fresh load).
- **Steps:**
  1. **Action:** Navigate to home page
     - **Command:** `playwright-cli open ${BASE_URL}`
  2. **Action:** Snapshot the empty state card
     - **Command:** `playwright-cli snapshot`
  3. **Action:** Screenshot
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/e2e-edge-04-empty-state.png`
- **Assert:**
  - [ ] Empty state icon container has `bg-blue-50` background (blue tint, not gray/slate)
  - [ ] Icon is `text-blue-600` (blue pin icon, not slate/muted)
  - [ ] Card has `role="status"` for accessibility
- **Screenshot:** `e2e-edge-04-empty-state.png`

---

### TC-EDGE-05: Console is clean — zero errors

- **Precondition:** Any page loaded.
- **Steps:**
  1. **Action:** Open browser console
     - **Command:** `playwright-cli console`
  2. **Action:** Navigate through all major pages (home → select destination → hotel detail → back)
  3. **Action:** Re-check console
     - **Command:** `playwright-cli console`
- **Assert:**
  - [ ] No JS errors in console (no `Uncaught TypeError`, no `Cannot read properties of undefined`)
  - [ ] No React hydration warnings
  - [ ] No 404s for critical resources (favicon 404 is acceptable)
  - [ ] No React key warnings ("Each child in a list should have a unique key")
  - [ ] No `act(...)` warnings in development mode
- **Screenshot:** (none — console output)
