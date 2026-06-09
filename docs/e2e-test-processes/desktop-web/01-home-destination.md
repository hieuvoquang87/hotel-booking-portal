# Home & Destination — Desktop E2E Tests

> Tests the home page initial render, the destination combobox, and selecting a city or country to load hotels.

## Prerequisites

| Requirement | Value |
|-------------|-------|
| Prior test | None (standalone) |
| Viewport | 1280×720 |
| State | Clean browser session, no URL params |

---

## Test Cases

### TC-HOME-01: Home page loads with hero, combobox, and empty state

- **Precondition:** Browser at `${BASE_URL}`, viewport 1280×720.
- **Steps:**
  1. **Action:** Open app
     - **Command:** `playwright-cli open ${BASE_URL}`
     - **Command:** `playwright-cli resize 1280 720`
  2. **Action:** Snapshot the full page
     - **Command:** `playwright-cli snapshot`
  3. **Action:** Screenshot
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/e2e-home-01-initial.png`
- **Assert:**
  - [ ] Hero heading "Find your stay" visible, centered
  - [ ] Subtitle "Browse hotels by destination — pick a city or country to begin." visible
  - [ ] Destination combobox (`textbox "Search a city or country…"`) visible
  - [ ] Combobox has search icon (magnifying glass) + chevron
  - [ ] Empty state card visible: "Start by choosing a destination"
  - [ ] No hotel grid / no refine toolbar visible
- **Screenshot:** `e2e-home-01-initial.png`

---

### TC-HOME-02: Brand badge renders in header

- **Precondition:** On home page (from TC-HOME-01).
- **Steps:**
  1. **Action:** Inspect the header area
     - **Command:** `playwright-cli snapshot`
  2. **Action:** Screenshot header
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/e2e-home-02-brand.png --element="header"`
- **Assert:**
  - [ ] Blue rounded-square badge (`bg-blue-600`, rounded corners) visible in header
  - [ ] White pin icon inside the badge
  - [ ] "Stayfinder" text next to badge
  - [ ] Header is sticky (`position: sticky`)
- **Screenshot:** `e2e-home-02-brand.png`

---

### TC-DEST-01: Type in combobox filters destinations by substring

- **Precondition:** On home page.
- **Steps:**
  1. **Action:** Focus the combobox
     - **Selector:** `textbox "Search a city or country…"`
     - **Command:** Click the input
  2. **Action:** Snapshot to see full option list
     - **Command:** `playwright-cli snapshot`
  3. **Action:** Type a partial city name
     - **Selector:** `textbox "Search a city or country…"`
     - **Input:** `chi`
  4. **Action:** Snapshot filtered results
     - **Command:** `playwright-cli snapshot`
  5. **Action:** Screenshot
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/e2e-dest-01-filter-chi.png`
- **Assert:**
  - [ ] Full list shows all destinations (cities + countries) when empty
  - [ ] Typing "chi" filters to matching results (e.g., "Chicago, IL")
  - [ ] Each option shows a count badge (e.g., "4")
  - [ ] City options have a pin icon; country options have a search icon
  - [ ] Diacritic-insensitive: typing "mexico" matches "Ciudad de México" if in seed
- **Screenshot:** `e2e-dest-01-filter-chi.png`

---

### TC-DEST-02: Select a city → hotels load with results heading

- **Precondition:** On home page, combobox open showing options.
- **Steps:**
  1. **Action:** Select "Chicago, IL" from the combobox
     - **Selector:** Click the option containing "Chicago"
  2. **Wait:** Hotels fetch completes (timeout: 10s)
     - Poll: `playwright-cli snapshot` until hotel cards appear
  3. **Action:** Snapshot the results area
     - **Command:** `playwright-cli snapshot`
  4. **Action:** Screenshot
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/e2e-dest-02-chicago-results.png`
- **Assert:**
  - [ ] URL updates to `?country=united-states&city=chicago` (slugified)
  - [ ] Heading "Hotels in **Chicago, IL**" visible (Chicago in blue accent)
  - [ ] Refine toolbar visible with star filter, price filter, sort select
  - [ ] Hotel cards render (4 hotels for Chicago in seed)
  - [ ] Result count shows "4 hotels" 
  - [ ] Combobox now displays "Chicago, IL" as the selected value
  - [ ] Empty state replaced by hotel grid
- **Screenshot:** `e2e-dest-02-chicago-results.png`

---

### TC-DEST-03: Select a country → all its cities' hotels load

- **Precondition:** On home page (clear previous selection by removing URL params or refreshing).
- **Steps:**
  1. **Action:** Open combobox
     - **Selector:** Click `textbox "Search a city or country…"`
  2. **Action:** Select a country option (e.g., "United States")
     - **Selector:** Click the country option (has search icon, not pin icon)
  3. **Wait:** Hotels fetch completes (timeout: 10s)
  4. **Action:** Snapshot
     - **Command:** `playwright-cli snapshot`
  5. **Action:** Screenshot
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/e2e-dest-03-country-results.png`
- **Assert:**
  - [ ] URL updates to `?country=united-states` (no city param)
  - [ ] Heading "Hotels in **United States**" visible
  - [ ] More hotels shown than a single-city selection (all US cities combined)
  - [ ] Pagination visible if >8 hotels
- **Screenshot:** `e2e-dest-03-country-results.png`
