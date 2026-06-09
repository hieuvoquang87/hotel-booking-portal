# Hotel Cards — Mobile E2E Tests

> Tests hotel card rendering at 390px width: single-column layout, rating stars, amenity pills, and price line.

## Prerequisites

| Requirement | Value |
|-------------|-------|
| Prior test | `01-home-destination-mobile` (results visible) |
| Viewport | 390×844 |
| State | "Chicago, IL" selected, hotel cards rendered |

---

## Test Cases

### TC-MOB-CARD-01: Cards render single-column, no horizontal overflow

- **Precondition:** Results visible at 390×844.
- **Steps:**
  1. **Action:** Snapshot the results grid
     - **Command:** `playwright-cli snapshot`
  2. **Action:** Screenshot
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/mobile/e2e-mob-card-01-grid.png`
  3. **Action:** Check for horizontal overflow
     - **Command:** `playwright-cli eval "document.documentElement.scrollWidth <= document.documentElement.clientWidth"`
- **Assert:**
  - [ ] Cards stack in a single column (`grid-cols-1` at mobile)
  - [ ] Each card fills the viewport width (minus padding) — no cards cut off
  - [ ] No horizontal scrollbar on the page
  - [ ] Card padding and margins consistent
  - [ ] Photo placeholder renders at correct aspect ratio (`aspect-video`)
- **Screenshot:** `e2e-mob-card-01-grid.png`

---

### TC-MOB-CARD-02: RatingStars and amenity pills visible at 390px

- **Precondition:** Hotel cards visible.
- **Steps:**
  1. **Action:** Inspect a single card's rating and amenities
     - **Command:** `playwright-cli snapshot`
  2. **Action:** Screenshot the first card
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/mobile/e2e-mob-card-02-stars.png`
- **Assert:**
  - [ ] Fractional RatingStars render (5-star row with amber fill, not a single star)
  - [ ] Rating number + review count visible
  - [ ] Up to 3 amenity pills + overflow "+N" badge visible
  - [ ] Pills do not overflow the card or wrap awkwardly
  - [ ] Curated labels used (e.g., "Wi-Fi", not "Free Wi Fi")
  - [ ] Stars and amenity pills fit within card width without truncation
- **Screenshot:** `e2e-mob-card-02-stars.png`

---

### TC-MOB-CARD-03: Price line and card link intact on mobile

- **Precondition:** Hotel cards visible.
- **Steps:**
  1. **Action:** Inspect the price area of a card
     - **Command:** `playwright-cli snapshot`
  2. **Action:** Screenshot
     - **Command:** `playwright-cli screenshot --filename=docs/screenshots/mobile/e2e-mob-card-03-price.png`
  3. **Action:** Tap the first card
     - **Selector:** Click the first hotel card link
  4. **Wait:** Navigation to detail page (timeout: 5s)
- **Assert:**
  - [ ] Price line has border-t divider on mobile
  - [ ] Large price value (`text-lg font-bold`) with "from" and "/ night"
  - [ ] Price uses `mt-auto` to push to bottom of card
  - [ ] Tapping card navigates to `/hotels/{id}`
  - [ ] Card area is adequately tappable on mobile (min touch target ~44px)
  - [ ] Photo overlay (hotel name + star badge) visible on mobile
- **Screenshot:** `e2e-mob-card-03-price.png`
