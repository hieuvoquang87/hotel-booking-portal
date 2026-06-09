# Availability — Desktop E2E Tests

> Tests the room availability panel: auto-seeded demo dates, room listing, date changes, and date validation.

## Prerequisites

| Requirement | Value |
|-------------|-------|
| Prior test | `04-hotel-detail` (must be on a hotel detail page) |
| Viewport | 1280×720 |
| State | On `/hotels/hotel-01`, availability panel visible |

> **Setup shortcut:** Navigate to `${BASE_URL}/hotels/hotel-01`.

---

## Test Cases

### TC-AVAIL-01: Demo dates auto-seeded on first visit

- **Precondition:** Clean browser session (no stored dates in AppProvider state), navigate to `${BASE_URL}/hotels/hotel-01`.
- **Steps:**
  1. **Action:** Open detail page with no prior session
     - **Command:** `playwright-cli open ${BASE_URL}/hotels/hotel-01`
  2. **Wait:** Page loads
  3. **Action:** Snapshot the availability panel
     - **Command:** `playwright-cli snapshot`
  4. **Action:** Screenshot
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/e2e-avail-01-seeded-dates.png`
- **Assert:**
  - [ ] Check-in field pre-filled with `2026-07-10`
  - [ ] Check-out field pre-filled with `2026-07-12`
  - [ ] Availability query fires automatically (dates are set, enabled condition met)
  - [ ] Does NOT show "Pick check-in and check-out to see rooms" prompt
  - [ ] Status shows either "Checking availability…" (during load) or "X rooms available" (after load)
- **Screenshot:** `e2e-avail-01-seeded-dates.png`

---

### TC-AVAIL-02: Rooms load with room cards for seeded dates

- **Precondition:** On hotel detail page with demo dates auto-seeded, availability finished loading.
- **Steps:**
  1. **Action:** Wait for availability to finish loading
     - Poll: `playwright-cli snapshot` until "Checking availability…" disappears (timeout: 15s)
  2. **Action:** Snapshot the availability panel
     - **Command:** `playwright-cli snapshot`
  3. **Action:** Screenshot
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/e2e-avail-02-rooms.png`
- **Assert:**
  - [ ] Status shows "X rooms available" (X ≥ 1 for hotel-01 on demo dates)
  - [ ] Room cards rendered below the date fields
  - [ ] Each RoomCard shows: room type, bed type, occupancy, price per night
  - [ ] Price formatted as "$X/night"
  - [ ] No error message visible
  - [ ] No skeleton shown (loading is complete)
  - [ ] ARIA live region (sr-only) announces the status
- **Screenshot:** `e2e-avail-02-rooms.png`

---

### TC-AVAIL-03: Change dates triggers new availability fetch

- **Precondition:** Rooms loaded for demo dates (from TC-AVAIL-02).
- **Steps:**
  1. **Action:** Change check-in date
     - **Selector:** `textbox "Check-in"`
     - **Input:** `2026-07-15`
  2. **Action:** Change check-out date
     - **Selector:** `textbox "Check-out"`
     - **Input:** `2026-07-18`
  3. **Action:** Blur to trigger validation + fetch
     - **Command:** Click outside the date fields
  4. **Wait:** Availability re-fetches (brief loading state, simulated latency ~1s)
  5. **Action:** Snapshot
     - **Command:** `playwright-cli snapshot`
- **Assert:**
  - [ ] Brief "Checking availability…" skeleton shown during fetch
  - [ ] Room results update (may show different rooms or same rooms — depends on seed)
  - [ ] Status updates to new room count
  - [ ] URL does NOT include check-in/check-out params (dates stay out of URL)
  - [ ] Analytics event `availability_checked` fired (check console or network)
- **Screenshot:** `e2e-avail-03-dates-changed.png`

---

### TC-AVAIL-04: Check-out ≤ check-in shows validation error

- **Precondition:** On hotel detail page.
- **Steps:**
  1. **Action:** Set check-in to a later date than check-out
     - **Selector:** `textbox "Check-in"`
     - **Input:** `2026-07-20`
  2. **Action:** Set check-out to an earlier or equal date
     - **Selector:** `textbox "Check-out"`
     - **Input:** `2026-07-15`
  3. **Action:** Blur to trigger validation
     - **Command:** Click outside the date fields
  4. **Action:** Snapshot
     - **Command:** `playwright-cli snapshot`
  5. **Action:** Screenshot
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/e2e-avail-04-invalid-dates.png`
  6. **Action:** Fix the dates to valid range
     - **Selector:** `textbox "Check-in"` → `2026-07-10`
     - **Selector:** `textbox "Check-out"` → `2026-07-12`
  7. **Action:** Blur to trigger validation + fetch
- **Assert:**
  - [ ] Inline error message: "Check-out must be after check-in" shown
  - [ ] No availability fetch triggered (query disabled when dates invalid)
  - [ ] Error uses red/destructive styling (`text-destructive`)
  - [ ] Fixing dates clears the error and triggers availability fetch
- **Screenshot:** `e2e-avail-04-invalid-dates.png`

---

### TC-AVAIL-05: No rooms available shows empty state

- **Precondition:** On hotel detail page.
- **Steps:**
  1. **Action:** Set dates to a range where no rooms are available in the seed
     - **Selector:** `textbox "Check-in"` → `2026-07-01`
     - **Selector:** `textbox "Check-out"` → `2026-07-02`
  2. **Wait:** Availability fetch completes (timeout: 15s)
  3. **Action:** Snapshot
     - **Command:** `playwright-cli snapshot`
  4. **Action:** Screenshot
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/e2e-avail-05-no-rooms.png`
- **Assert:**
  - [ ] Empty state: "No rooms available for these dates"
  - [ ] Subtext: "Try different dates."
  - [ ] No room cards rendered
  - [ ] Status (sr-only) announces "No rooms available for these dates"
  - [ ] No error — this is a valid empty state, not a failure
- **Screenshot:** `e2e-avail-05-no-rooms.png`
