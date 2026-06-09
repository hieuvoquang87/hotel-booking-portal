# Results & Refine — Desktop E2E Tests

> Tests the refine toolbar (star filter, price filter, sort), result count, and pagination after a destination is selected.

## Prerequisites

| Requirement | Value |
|-------------|-------|
| Prior test | `01-home-destination` (must have a destination selected) |
| Viewport | 1280×720 |
| State | "Chicago, IL" selected, 4 hotels loaded |

> **Setup shortcut:** Navigate directly to `${BASE_URL}?country=united-states&city=chicago` to skip destination selection.

---

## Test Cases

### TC-RESULT-01: Result count shows correct total

- **Precondition:** On `${BASE_URL}?country=united-states&city=chicago` with hotels loaded.
- **Steps:**
  1. **Action:** Snapshot the toolbar area
     - **Command:** `playwright-cli snapshot`
- **Assert:**
  - [ ] Result count text shows "4 hotels" (or the correct count for Chicago)
  - [ ] Count is right-aligned in the toolbar (on the same row as sort select)
  - [ ] Count uses tabular-nums (monospaced digits)
- **Screenshot:** `e2e-result-01-count.png`

---

### TC-FILTER-01: Star filter pill reduces results

- **Precondition:** Results visible for a destination with hotels at different star ratings.
- **Steps:**
  1. **Action:** Note current result count from toolbar
     - **Command:** `playwright-cli snapshot`
  2. **Action:** Click "4★ & up" filter pill
     - **Selector:** `button "4★ & up"`
  3. **Wait:** Filter applies instantly (in-memory, no loading)
  4. **Action:** Snapshot
     - **Command:** `playwright-cli snapshot`
  5. **Action:** Screenshot
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/e2e-filter-01-star-4up.png`
  6. **Action:** Click "5★" filter pill
     - **Selector:** `button "5★"`
  7. **Action:** Snapshot
     - **Command:** `playwright-cli snapshot`
  8. **Action:** Click "Any" to reset star filter
     - **Selector:** `button "Any"`
  9. **Action:** Snapshot to confirm full set restored
     - **Command:** `playwright-cli snapshot`
- **Assert:**
  - [ ] "4★ & up" selected → active pill is white with blue text + shadow
  - [ ] Result count decreases (only 4★ and 5★ hotels shown)
  - [ ] URL updates to `?stars=4` on selection
  - [ ] "5★" selected → only 5★ hotels shown
  - [ ] "Any" selected → full result set restored, URL has no `stars` param
  - [ ] Active pill has `aria-pressed="true"`
  - [ ] Pill track is `rounded-full` with slate-100 background + border
- **Screenshot:** `e2e-filter-01-star-4up.png`

---

### TC-FILTER-02: Price filter bounds reduce results

- **Precondition:** Results visible, all filters cleared.
- **Steps:**
  1. **Action:** Note the placeholder values in price inputs (should show actual bounds)
     - **Command:** `playwright-cli snapshot`
     - **Expect:** Min placeholder shows the lowest price in the loaded set, Max shows the highest
  2. **Action:** Set a minimum price
     - **Selector:** `textbox "Minimum price"`
     - **Input:** `300`
  3. **Action:** Press Enter or blur to commit
     - **Command:** Click outside the input or press Tab
  4. **Action:** Snapshot
     - **Command:** `playwright-cli snapshot`
  5. **Action:** Set a maximum price
     - **Selector:** `textbox "Maximum price"`
     - **Input:** `500`
  6. **Action:** Blur to commit
  7. **Action:** Snapshot
     - **Command:** `playwright-cli snapshot`
  8. **Action:** Screenshot
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/e2e-filter-02-price.png`
- **Assert:**
  - [ ] Setting min=300 reduces results to only hotels with `priceFrom ≥ $300`
  - [ ] Setting max=500 further reduces to hotels in [$300, $500]
  - [ ] URL updates with `?min=300&max=500`
  - [ ] Price inputs have `inputMode="numeric"` (mobile keyboard friendly)
  - [ ] Min > Max is swapped automatically (enter 500 in min and 300 in max → treated as 300–500)
- **Screenshot:** `e2e-filter-02-price.png`

---

### TC-FILTER-03: Reset filters from empty state restores full set

- **Precondition:** Results visible. Apply filters that produce zero results (e.g., 5★ + max=$50).
- **Steps:**
  1. **Action:** Select "5★" star filter
     - **Selector:** `button "5★"`
  2. **Action:** Set max price very low
     - **Selector:** `textbox "Maximum price"`
     - **Input:** `50`
  3. **Action:** Blur to commit
  4. **Wait:** Results update (instant, in-memory)
  5. **Action:** Snapshot
     - **Command:** `playwright-cli snapshot`
  6. **Action:** Click reset button in the empty state
     - **Selector:** `button "Reset filters"`
  7. **Action:** Snapshot
     - **Command:** `playwright-cli snapshot`
- **Assert:**
  - [ ] "No hotels found" empty state visible when filters exclude all
  - [ ] Subtext: "Try widening your filters to see more stays."
  - [ ] "Reset filters" button visible
  - [ ] After reset: full result set restored
  - [ ] URL params for stars/min/max cleared after reset
- **Screenshot:** `e2e-filter-03-reset.png`

---

### TC-SORT-01: Sort default is "Recommended" (rating desc)

- **Precondition:** Results visible.
- **Steps:**
  1. **Action:** Inspect the sort select
     - **Command:** `playwright-cli snapshot`
  2. **Action:** Screenshot
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/e2e-sort-01-default.png`
- **Assert:**
  - [ ] Sort select shows "Recommended" as the selected option
  - [ ] Sort select has a leading sort icon (up/down arrows)
  - [ ] Sort select has a trailing chevron icon
  - [ ] First hotel card has the highest `overallRating` among results
  - [ ] Sort select options (when opened): Recommended, Price: Low to High, Price: High to Low, Stars: Highest (4 options)
- **Screenshot:** `e2e-sort-01-default.png`

---

### TC-SORT-02: Sort "Price: Low to High" reorders results

- **Precondition:** Results visible.
- **Steps:**
  1. **Action:** Change sort
     - **Selector:** `combobox "Sort hotels"`
     - **Input:** Select "Price: Low to High"
  2. **Action:** Snapshot
     - **Command:** `playwright-cli snapshot`
  3. **Action:** Screenshot
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/e2e-sort-02-price-asc.png`
  4. **Action:** Change sort back to "Recommended"
     - **Selector:** `combobox "Sort hotels"`
     - **Input:** Select "Recommended"
- **Assert:**
  - [ ] First card now has the lowest `priceFrom` among results
  - [ ] URL updates to `?sort=price-asc`
  - [ ] Results reorder instantly (in-memory, no loading skeleton)
- **Screenshot:** `e2e-sort-02-price-asc.png`

---

### TC-PAGE-01: Pagination visible when results exceed page size

- **Precondition:** A destination with >8 hotels selected (e.g., "United States" country-level).
- **Steps:**
  1. **Action:** Navigate to a large result set
     - **Command:** `playwright-cli open ${BASE_URL}?country=united-states`
  2. **Wait:** Hotels load
  3. **Action:** Snapshot
     - **Command:** `playwright-cli snapshot`
  4. **Action:** Screenshot
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/e2e-page-01-visible.png`
- **Assert:**
  - [ ] Pagination controls visible at bottom of results: "Page 1 of N"
  - [ ] Previous page button disabled on page 1
  - [ ] Next page button enabled (if >8 hotels)
  - [ ] Exactly 8 hotel cards shown on page 1
  - [ ] URL has no `?page=` param when on page 1 (or has `?page=1`)
- **Screenshot:** `e2e-page-01-visible.png`

---

### TC-PAGE-02: Page change updates results without page reload

- **Precondition:** Pagination visible (from TC-PAGE-01).
- **Steps:**
  1. **Action:** Click next page
     - **Selector:** `button "Next page"`
  2. **Action:** Snapshot
     - **Command:** `playwright-cli snapshot`
  3. **Action:** Screenshot
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/e2e-page-02-page2.png`
  4. **Action:** Click previous page
     - **Selector:** `button "Previous page"`
  5. **Action:** Snapshot
     - **Command:** `playwright-cli snapshot`
- **Assert:**
  - [ ] Different hotels shown on page 2 (not same as page 1)
  - [ ] URL updates to `?page=2` (soft client-side update, no full reload)
  - [ ] Page indicator updates to "Page 2 of N"
  - [ ] Previous page button now enabled
  - [ ] No loading skeleton — results swap instantly (in-memory slice)
  - [ ] Returning to page 1 shows original 8 hotels
- **Screenshot:** `e2e-page-02-page2.png`
