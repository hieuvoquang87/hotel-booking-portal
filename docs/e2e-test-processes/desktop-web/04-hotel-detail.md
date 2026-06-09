# Hotel Detail — Desktop E2E Tests

> Tests the hotel detail page: rendering all sections, back-to-results navigation, and the not-found page for invalid hotel IDs.

## Prerequisites

| Requirement | Value |
|-------------|-------|
| Prior test | `03-hotel-card` (need a valid hotel ID) |
| Viewport | 1280×720 |
| State | On a hotel detail page (`/hotels/{id}`) |

> **Setup shortcut:** Navigate directly to `${BASE_URL}/hotels/hotel-01`.

---

## Test Cases

### TC-DETAIL-01: Detail page renders all sections

- **Precondition:** Navigate to `/hotels/hotel-01`.
- **Steps:**
  1. **Action:** Navigate to a hotel detail page
     - **Command:** `playwright-cli open ${BASE_URL}/hotels/hotel-01`
  2. **Wait:** Page loads (server-rendered, should be instant once server responds)
  3. **Action:** Snapshot the full page
     - **Command:** `playwright-cli snapshot`
  4. **Action:** Screenshot
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/e2e-detail-01-full-page.png`
  5. **Action:** Scroll down to see all sections
     - **Command:** `playwright-cli eval "window.scrollTo(0, document.body.scrollHeight)"`
  6. **Action:** Screenshot bottom of page
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/e2e-detail-01-bottom.png`
- **Assert:**
  - [ ] HotelHero section: hotel name, star rating, review rating with RatingStars, address, price from
  - [ ] "Overview" section: description text in readable prose
  - [ ] "Amenities" section: amenity list/grid with curated human-readable labels
  - [ ] "Policies" section: check-in time, check-out time, cancellation policy
  - [ ] "Room availability" sidebar: date fields (check-in, check-out) + status area
  - [ ] BackToResults link visible at top
  - [ ] Two-column layout at desktop: main content (left) + availability panel (right, sticky)
  - [ ] Page has semantic heading hierarchy (h1 hotel name, h2 section titles)
- **Screenshot:** `e2e-detail-01-full-page.png`

---

### TC-DETAIL-02: Back to results navigates to home with filters preserved

- **Precondition:** On a hotel detail page, reached FROM the home page with filters applied (e.g., `${BASE_URL}/hotels/hotel-01`, having come from `${BASE_URL}?country=united-states&city=chicago&stars=4`).
- **Steps:**
  1. **Action:** Navigate from filtered results to detail
     - **Command:** `playwright-cli open ${BASE_URL}?country=united-states&city=chicago&stars=4`
  2. **Wait:** Results load
  3. **Action:** Click first hotel card
     - **Selector:** Click the first hotel link
  4. **Wait:** Detail page loads
  5. **Action:** Snapshot to verify back link
     - **Command:** `playwright-cli snapshot`
  6. **Action:** Click "Back to results"
     - **Selector:** Click the back link/button
  7. **Wait:** Navigation to home (timeout: 5s)
  8. **Action:** Snapshot
     - **Command:** `playwright-cli snapshot`
- **Assert:**
  - [ ] BackToResults link/button visible on detail page
  - [ ] Clicking returns to home page
  - [ ] URL preserves the filters (`?country=united-states&city=chicago&stars=4`)
  - [ ] Results show filtered hotels (not full unfiltered set)
  - [ ] Star filter "4★ & up" still active
- **Screenshot:** `e2e-detail-02-back.png`

---

### TC-DETAIL-03: Invalid hotel ID shows not-found page

- **Precondition:** None.
- **Steps:**
  1. **Action:** Navigate to non-existent hotel
     - **Command:** `playwright-cli open ${BASE_URL}/hotels/nonexistent-hotel-id`
  2. **Wait:** Server responds with 404 (timeout: 5s)
  3. **Action:** Snapshot
     - **Command:** `playwright-cli snapshot`
  4. **Action:** Screenshot
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/e2e-detail-03-not-found.png`
- **Assert:**
  - [ ] Not-found page rendered (Next.js default or custom not-found UI)
  - [ ] HTTP status is 404 (check browser network tab or `playwright-cli network`)
  - [ ] Does NOT crash or show a raw error
  - [ ] Does NOT show the error boundary (which is for 5xx, not 404)
- **Screenshot:** `e2e-detail-03-not-found.png`
