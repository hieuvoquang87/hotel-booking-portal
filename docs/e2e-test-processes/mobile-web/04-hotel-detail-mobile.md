# Hotel Detail — Mobile E2E Tests

> Tests the hotel detail page at mobile viewport: single-column layout, all sections, back navigation, and not-found.

## Prerequisites

| Requirement | Value |
|-------------|-------|
| Prior test | `03-hotel-card-mobile` (need a valid hotel ID) |
| Viewport | 390×844 |
| State | On a hotel detail page (`/hotels/{id}`) |

> **Setup shortcut:** Navigate to `${BASE_URL}/hotels/hotel-01` and `resize 390 844`.

---

## Test Cases

### TC-MOB-DETAIL-01: Detail page single-column layout with all sections

- **Precondition:** Navigate to `/hotels/hotel-01` at 390×844.
- **Steps:**
  1. **Action:** Open detail page
     - **Command:** `playwright-cli open ${BASE_URL}/hotels/hotel-01`
     - **Command:** `playwright-cli resize 390 844`
  2. **Wait:** Page loads (server-rendered)
  3. **Action:** Snapshot the full page
     - **Command:** `playwright-cli snapshot`
  4. **Action:** Screenshot top
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/mobile/e2e-mob-detail-01-top.png`
  5. **Action:** Scroll through all sections
     - **Command:** `playwright-cli eval "window.scrollTo(0, 1200)"`
  6. **Action:** Screenshot middle
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/mobile/e2e-mob-detail-01-middle.png`
- **Assert:**
  - [ ] Page uses single-column layout (not the desktop two-column)
  - [ ] Availability panel stacks below hotel content (not in a sidebar)
  - [ ] All sections visible: hotel hero, overview, amenities, policies, availability
  - [ ] No horizontal overflow on any section
  - [ ] BackToResults link visible at top
  - [ ] Hotel name, star rating, address all readable at 390px
  - [ ] Availability panel is NOT sticky on mobile (sticky is `lg:` only)
- **Screenshot:** `e2e-mob-detail-01-top.png`, `e2e-mob-detail-01-middle.png`

---

### TC-MOB-DETAIL-02: Back to results preserves filters

- **Precondition:** Arrived at detail from filtered results on mobile.
- **Steps:**
  1. **Action:** Navigate from filtered results to detail
     - **Command:** `playwright-cli open ${BASE_URL}?country=united-states&city=chicago&stars=4`
     - **Command:** `playwright-cli resize 390 844`
  2. **Wait:** Results load
  3. **Action:** Tap first hotel card
     - **Selector:** Click the first hotel link
  4. **Wait:** Detail page loads
  5. **Action:** Tap "Back to results"
     - **Selector:** Click the back link
  6. **Wait:** Navigation back (timeout: 5s)
  7. **Action:** Snapshot
     - **Command:** `playwright-cli snapshot`
- **Assert:**
  - [ ] Returns to home page at mobile viewport
  - [ ] URL preserves `?country=united-states&city=chicago&stars=4`
  - [ ] Star filter "4★ & up" still active
  - [ ] Mobile filter bar shows active filter count
  - [ ] Results still filtered correctly
- **Screenshot:** `e2e-mob-detail-02-back.png`

---

### TC-MOB-DETAIL-03: Not-found page renders on mobile

- **Precondition:** None.
- **Steps:**
  1. **Action:** Navigate to invalid hotel
     - **Command:** `playwright-cli open ${BASE_URL}/hotels/invalid-id`
     - **Command:** `playwright-cli resize 390 844`
  2. **Wait:** Page loads
  3. **Action:** Snapshot
     - **Command:** `playwright-cli snapshot`
  4. **Action:** Screenshot
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/mobile/e2e-mob-detail-03-not-found.png`
- **Assert:**
  - [ ] Not-found page rendered
  - [ ] Content fits within 390px without overflow
  - [ ] No raw error or stack trace visible
- **Screenshot:** `e2e-mob-detail-03-not-found.png`
