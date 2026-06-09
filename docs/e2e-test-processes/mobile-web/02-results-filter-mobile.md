# Results & Filters — Mobile E2E Tests

> Tests the mobile filter bar, bottom-sheet filter panel, sort select, and result count at mobile viewport.

## Prerequisites

| Requirement | Value |
|-------------|-------|
| Prior test | `01-home-destination-mobile` (must have a destination selected) |
| Viewport | 390×844 |
| State | "Chicago, IL" selected, hotels loaded |

> **Setup shortcut:** Navigate to `${BASE_URL}?country=united-states&city=chicago` and `resize 390 844`.

---

## Test Cases

### TC-MOB-FILTER-01: Mobile filter bar visible with active filter count badge

- **Precondition:** Results visible at 390×844.
- **Steps:**
  1. **Action:** Snapshot the filter bar area
     - **Command:** `playwright-cli snapshot`
  2. **Action:** Screenshot
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/mobile/e2e-mob-filter-01-bar.png`
- **Assert:**
  - [ ] Mobile filter bar visible (not the desktop RefineToolbar)
  - [ ] "Filters" button visible
  - [ ] Filter count badge shows "0" when no filters active
  - [ ] Sort select visible on the same row
  - [ ] Result count visible below the filter bar
  - [ ] Desktop RefineToolbar NOT visible (hidden by `sm:block`)
- **Screenshot:** `e2e-mob-filter-01-bar.png`

---

### TC-MOB-FILTER-02: Filter sheet opens, applies star and price filters

- **Precondition:** Results visible, no filters active.
- **Steps:**
  1. **Action:** Click "Filters" button
     - **Selector:** Click the Filters button in the mobile filter bar
  2. **Action:** Snapshot the sheet
     - **Command:** `playwright-cli snapshot`
  3. **Action:** Screenshot the sheet
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/mobile/e2e-mob-filter-02-sheet.png`
  4. **Action:** Select "4★ & up" star filter
     - **Selector:** `button "4★ & up"` within the sheet
  5. **Action:** Set a price minimum
     - **Selector:** `textbox "Minimum price"` within the sheet
     - **Input:** `200`
  6. **Action:** Blur to commit
  7. **Action:** Snapshot results after filters
     - **Command:** `playwright-cli snapshot`
  8. **Action:** Screenshot
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/mobile/e2e-mob-filter-02-results.png`
- **Assert:**
  - [ ] Sheet slides up from bottom (motion-safe: `slideUp` animation)
  - [ ] Sheet title: "Filters"
  - [ ] Close button (X) in top-right corner
  - [ ] Star filter: pill segmented control with "Any", "3★ & up", "4★ & up", "5★"
  - [ ] Price filter: two inputs with "$" prefix, placeholder values from bounds
  - [ ] Price placeholders show actual bounds (not "min"/"max")
  - [ ] "Show X results" button at bottom of sheet (X updates live)
  - [ ] After applying: results filtered, count badge on filter bar updates
  - [ ] URL updates with filter params (`?stars=4&min=200`)
- **Screenshot:** `e2e-mob-filter-02-sheet.png` (sheet), `e2e-mob-filter-02-results.png` (results)

---

### TC-MOB-FILTER-03: Filter sheet close and reset

- **Precondition:** Filter sheet open with active filters.
- **Steps:**
  1. **Action:** Note current filter state
     - **Command:** `playwright-cli snapshot`
  2. **Action:** Click "Clear" or "Reset" button in the sheet
     - **Selector:** `button "Clear"` (or similar)
  3. **Action:** Snapshot
     - **Command:** `playwright-cli snapshot`
  4. **Action:** Close the sheet
     - **Selector:** Click the X close button
  5. **Action:** Snapshot after close
     - **Command:** `playwright-cli snapshot`
  6. **Action:** Screenshot
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/mobile/e2e-mob-filter-03-cleared.png`
- **Assert:**
  - [ ] Clear resets star to "Any" and price inputs to empty
  - [ ] "Show X results" updates to full count after clear
  - [ ] Sheet closes when X button clicked
  - [ ] Sheet closes when tapping backdrop (outside the sheet)
  - [ ] URL params cleared after reset
- **Screenshot:** `e2e-mob-filter-03-cleared.png`

---

### TC-MOB-SORT-01: Sort select functional on mobile

- **Precondition:** Results visible.
- **Steps:**
  1. **Action:** Find the sort select in the mobile filter bar
     - **Command:** `playwright-cli snapshot`
  2. **Action:** Change sort to "Price: Low to High"
     - **Selector:** `combobox "Sort hotels"` (in mobile filter bar area)
     - **Input:** Select "Price: Low to High"
  3. **Action:** Snapshot
     - **Command:** `playwright-cli snapshot`
- **Assert:**
  - [ ] Sort select has leading sort icon and trailing chevron
  - [ ] Default is "Recommended"
  - [ ] Changing sort reorders results (first card has lowest price)
  - [ ] Sort select fits within the mobile filter bar row
  - [ ] URL updates with `?sort=price-asc`
- **Screenshot:** `e2e-mob-sort-01.png`
