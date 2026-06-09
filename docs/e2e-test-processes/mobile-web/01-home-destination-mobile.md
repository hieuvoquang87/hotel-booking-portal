# Home & Destination — Mobile E2E Tests

> Tests the home page at 390×844 viewport: layout, hero, combobox, destination selection, and empty state.

## Prerequisites

| Requirement | Value |
|-------------|-------|
| Prior test | None (standalone) |
| Viewport | 390×844 |
| State | Clean browser session, no URL params |

---

## Test Cases

### TC-MOB-HOME-01: Home page loads with correct mobile layout

- **Precondition:** Browser at `${BASE_URL}`.
- **Steps:**
  1. **Action:** Open at mobile viewport
     - **Command:** `playwright-cli open ${BASE_URL}`
     - **Command:** `playwright-cli resize 390 844`
  2. **Action:** Snapshot
     - **Command:** `playwright-cli snapshot`
  3. **Action:** Screenshot
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/mobile/e2e-mob-home-01-initial.png`
- **Assert:**
  - [ ] Hero heading "Find your stay" visible, centered
  - [ ] Combobox spans full usable width (not overflowing)
  - [ ] Brand badge visible in header (blue square + white pin)
  - [ ] Empty state card visible: "Start by choosing a destination"
  - [ ] No horizontal scrollbar anywhere on the page
  - [ ] No desktop RefineToolbar visible (only `sm:block` breakpoint)
  - [ ] Header height is `h-14` (56px on mobile, vs `md:h-16` on desktop)
- **Screenshot:** `e2e-mob-home-01-initial.png`

---

### TC-MOB-DEST-01: Combobox searchable, select a city, results load

- **Precondition:** On home page at 390×844.
- **Steps:**
  1. **Action:** Focus combobox
     - **Selector:** Click `textbox "Search a city or country…"`
  2. **Action:** Snapshot to see open state
     - **Command:** `playwright-cli snapshot`
  3. **Action:** Type a search query
     - **Selector:** `textbox "Search a city or country…"`
     - **Input:** `chicago`
  4. **Action:** Snapshot filtered options
     - **Command:** `playwright-cli snapshot`
  5. **Action:** Select the city option
     - **Selector:** Click the "Chicago, IL" option
  6. **Wait:** Hotels fetch + render (timeout: 10s)
  7. **Action:** Snapshot
     - **Command:** `playwright-cli snapshot`
  8. **Action:** Screenshot
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/mobile/e2e-mob-dest-01-chicago.png`
- **Assert:**
  - [ ] Combobox listbox opens below input, covers full width
  - [ ] Each option shows label + count badge on the same line
  - [ ] After selection: "Hotels in **Chicago, IL**" heading visible
  - [ ] Hotel cards render (single column)
  - [ ] Mobile filter bar visible (not desktop toolbar)
  - [ ] Result count visible below filter bar on mobile
  - [ ] Combobox shows "Chicago, IL" as selected value
- **Screenshot:** `e2e-mob-dest-01-chicago.png`

---

### TC-MOB-DEST-02: Select a country → all its cities load

- **Precondition:** On home page at 390×844.
- **Steps:**
  1. **Action:** Open combobox
     - **Selector:** Click `textbox "Search a city or country…"`
  2. **Action:** Select a country option
     - **Selector:** Click the "United States" country option (has search icon)
  3. **Wait:** Hotels load (timeout: 10s)
  4. **Action:** Snapshot
     - **Command:** `playwright-cli snapshot`
- **Assert:**
  - [ ] Heading "Hotels in **United States**" visible
  - [ ] More hotels than a single city (e.g., all US cities combined)
  - [ ] Pagination visible if >8 hotels
  - [ ] URL is `?country=united-states` (no city param)
- **Screenshot:** `e2e-mob-dest-02-country.png`

---

### TC-MOB-DEST-03: Empty state renders correctly on mobile

- **Precondition:** On home page, no destination selected.
- **Steps:**
  1. **Action:** Snapshot the empty state
     - **Command:** `playwright-cli snapshot`
  2. **Action:** Screenshot
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/mobile/e2e-mob-dest-03-empty.png`
- **Assert:**
  - [ ] Empty state card: "Start by choosing a destination"
  - [ ] Subtext: "Pick a city or country above to see available stays."
  - [ ] Icon is blue-tinted (`bg-blue-50` circle, blue pin icon)
  - [ ] Card fits within 390px, no overflow
  - [ ] `role="status"` on the card
- **Screenshot:** `e2e-mob-dest-03-empty.png`
