# Hotel Cards — Desktop E2E Tests

> Tests the individual hotel card component: layout, rating stars, amenity pills, price line, and link behavior.

## Prerequisites

| Requirement | Value |
|-------------|-------|
| Prior test | `01-home-destination` (must have results visible) |
| Viewport | 1280×720 |
| State | "Chicago, IL" selected, hotel cards rendered |

> **Setup shortcut:** Navigate to `${BASE_URL}?country=united-states&city=chicago`.

---

## Test Cases

### TC-CARD-01: Fractional RatingStars render with amber fill

- **Precondition:** Hotel cards visible in results.
- **Steps:**
  1. **Action:** Snapshot to find a hotel card
     - **Command:** `playwright-cli snapshot`
  2. **Action:** Locate the rating area within a card
     - Look for the `Rated X.X out of 5` aria-label
  3. **Action:** Screenshot a card
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/e2e-card-01-stars.png`
- **Assert:**
  - [ ] Each card shows 5 stars (not a single star icon)
  - [ ] Stars have fractional amber fill matching the `overallRating` value
  - [ ] Rating number (e.g., "4.8") shown next to stars in tabular-nums
  - [ ] Review count in parentheses after rating (e.g., "(1,240)")
  - [ ] `aria-label` on the star component reads "Rated X out of 5"
- **Screenshot:** `e2e-card-01-stars.png`

---

### TC-CARD-02: Card links to hotel detail with descriptive aria-label

- **Precondition:** Hotel cards visible.
- **Steps:**
  1. **Action:** Snapshot to find the first hotel card link
     - **Command:** `playwright-cli snapshot`
  2. **Action:** Inspect the link element
     - **Command:** `playwright-cli eval "document.querySelector('a[href^=\"/hotels/\"]')?.getAttribute('aria-label')"`
  3. **Action:** Click the first hotel card
     - **Selector:** Click the link with the hotel name
  4. **Wait:** Page navigation completes (timeout: 5s)
  5. **Action:** Snapshot
     - **Command:** `playwright-cli snapshot`
- **Assert:**
  - [ ] Card `<a>` has a descriptive `aria-label` including hotel name, star rating, review rating, price, location
  - [ ] The `href` points to `/hotels/{id}` (not a hash or external URL)
  - [ ] Whole card is clickable (not just the name)
  - [ ] Click navigates to `/hotels/{id}` — hotel detail page renders
  - [ ] Card has `hover:shadow-md` transition on hover
  - [ ] Card has `focus-visible` outline ring for keyboard navigation
- **Screenshot:** `e2e-card-02-link.png` (before click)

---

### TC-CARD-03: Amenity pills show curated labels

- **Precondition:** Hotel cards visible.
- **Steps:**
  1. **Action:** Snapshot to find amenity badges
     - **Command:** `playwright-cli snapshot`
  2. **Action:** Screenshot a card
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/e2e-card-03-amenities.png`
- **Assert:**
  - [ ] Up to 3 amenity pills visible per card, plus a "+N" overflow badge if >3
  - [ ] Pills use `variant="muted"` styling
  - [ ] Common labels verified: "Wi-Fi" (not "Free Wi Fi"), "Free breakfast" (not "Breakfast"), "Bikes" (not "Bicycle rentals")
  - [ ] Pills are `aria-hidden` (decorative — info already in card aria-label)
  - [ ] No raw snake_case tokens visible (e.g., no `free_parking` or `laundry_service`)
- **Screenshot:** `e2e-card-03-amenities.png`

---

### TC-CARD-04: Price line has divider and correct typography

- **Precondition:** Hotel cards visible.
- **Steps:**
  1. **Action:** Inspect the price area of a card
     - **Command:** `playwright-cli snapshot`
  2. **Action:** Screenshot the price line
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/e2e-card-04-price.png`
- **Assert:**
  - [ ] Price area separated from amenity pills by a `border-t` divider
  - [ ] Price value in large bold type (`text-lg font-bold`, ~18px)
  - [ ] Preceded by "from" in small muted text
  - [ ] Followed by "/ night" in small muted text
  - [ ] Price formatted as "$X,XXX" (USD, comma-separated thousands)
  - [ ] Price area pushed to bottom of card via `mt-auto` (fills remaining space)
- **Screenshot:** `e2e-card-04-price.png`

---

### TC-CARD-05: Photo placeholder has stripe texture, name overlay, and star badge

- **Precondition:** Hotel cards visible.
- **Steps:**
  1. **Action:** Inspect the photo placeholder area
     - **Command:** `playwright-cli snapshot`
  2. **Action:** Screenshot
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/e2e-card-05-photo.png`
- **Assert:**
  - [ ] Photo area has a diagonal stripe texture (not flat gray)
  - [ ] Building icon centered in the placeholder
  - [ ] Hotel name in UPPERCASE along the bottom of the photo
  - [ ] "★ N" star badge (star icon + number, not "N★") in top-right corner
  - [ ] Star badge is white/semi-transparent pill with shadow
  - [ ] Photo area is `aria-hidden`
  - [ ] Aspect ratio is `aspect-video` (16:9)
- **Screenshot:** `e2e-card-05-photo.png`
