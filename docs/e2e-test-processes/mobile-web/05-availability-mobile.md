# Availability — Mobile E2E Tests

> Tests the room availability panel at mobile viewport: date fields, room cards, date validation, and empty state.

## Prerequisites

| Requirement | Value |
|-------------|-------|
| Prior test | `04-hotel-detail-mobile` (must be on a hotel detail page) |
| Viewport | 390×844 |
| State | On `/hotels/hotel-01` at 390×844, availability panel visible |

> **Setup shortcut:** Navigate to `${BASE_URL}/hotels/hotel-01` and `resize 390 844`.

---

## Test Cases

### TC-MOB-AVAIL-01: Demo dates auto-seeded, rooms load on mobile

- **Precondition:** Clean session, navigate to `/hotels/hotel-01` at 390×844.
- **Steps:**
  1. **Action:** Open detail page
     - **Command:** `playwright-cli open ${BASE_URL}/hotels/hotel-01`
     - **Command:** `playwright-cli resize 390 844`
  2. **Wait:** Availability fetch completes (timeout: 15s)
     - Poll: `playwright-cli snapshot` until "Checking availability…" disappears
  3. **Action:** Snapshot the availability section
     - **Command:** `playwright-cli snapshot`
  4. **Action:** Screenshot
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/mobile/e2e-mob-avail-01-rooms.png`
- **Assert:**
  - [ ] Check-in field pre-filled with `2026-07-10`
  - [ ] Check-out field pre-filled with `2026-07-12`
  - [ ] Date fields stacked or side-by-side (2-col grid at `sm:`, 1-col at default)
  - [ ] Room cards render below date fields
  - [ ] Status "X rooms available" visible
  - [ ] Each RoomCard readable at 390px width
  - [ ] Room card info (type, bed, price) fits without truncation
- **Screenshot:** `e2e-mob-avail-01-rooms.png`

---

### TC-MOB-AVAIL-02: Date validation error on mobile

- **Precondition:** On hotel detail at 390×844.
- **Steps:**
  1. **Action:** Set invalid date range
     - **Selector:** `textbox "Check-in"` → `2026-07-20`
     - **Selector:** `textbox "Check-out"` → `2026-07-15`
  2. **Action:** Blur to trigger validation
     - **Command:** Click outside the date fields
  3. **Action:** Snapshot
     - **Command:** `playwright-cli snapshot`
  4. **Action:** Screenshot
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/mobile/e2e-mob-avail-02-invalid.png`
  5. **Action:** Fix the dates
     - **Selector:** `textbox "Check-in"` → `2026-07-12`
     - **Selector:** `textbox "Check-out"` → `2026-07-15`
  6. **Action:** Blur to trigger fetch
  7. **Wait:** Availability loads (timeout: 15s)
- **Assert:**
  - [ ] Error "Check-out must be after check-in" visible
  - [ ] Error fits within 390px without overflow
  - [ ] No availability fetch triggered when dates invalid
  - [ ] Fixing dates clears error and loads rooms
- **Screenshot:** `e2e-mob-avail-02-invalid.png`

---

### TC-MOB-AVAIL-03: No rooms empty state on mobile

- **Precondition:** On hotel detail at 390×844.
- **Steps:**
  1. **Action:** Set dates with no availability
     - **Selector:** `textbox "Check-in"` → `2026-07-01`
     - **Selector:** `textbox "Check-out"` → `2026-07-02`
  2. **Wait:** Availability fetch completes (timeout: 15s)
  3. **Action:** Snapshot
     - **Command:** `playwright-cli snapshot`
  4. **Action:** Screenshot
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/mobile/e2e-mob-avail-03-empty.png`
- **Assert:**
  - [ ] Empty state "No rooms available for these dates" visible
  - [ ] Subtext "Try different dates." visible
  - [ ] Empty state card fits within 390px
  - [ ] Blue-tinted icon (consistent with other EmptyState instances)
- **Screenshot:** `e2e-mob-avail-03-empty.png`
