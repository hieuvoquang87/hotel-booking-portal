# Hotel Booking Portal — Mobile Web E2E Test Procedures

Comprehensive E2E test suite covering all Phase-1 features at mobile viewport (390×844, iPhone 14 Pro-class). Designed for execution by Claude Agent via `playwright-cli`, also usable as manual QA runbooks.

> **Mobile-first reality:** The architecture targets 80% mobile traffic. Every feature must work on a 390px-wide screen without horizontal overflow or layout breakage. Desktop enhances the same flows — it does not add new ones.

---

## Mobile-First Principles

Every test in this suite:
- Opens the browser at `390×844` via `playwright-cli resize 390 844` before any navigation
- Never relies on the desktop RefineToolbar — uses the mobile FilterSheet exclusively
- Validates no horizontal overflow on any element
- Saves screenshots to `docs/screenshots/mobile/`

---

## Environment Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `BASE_URL` | App URL | `http://localhost:3000` |
| `VIEWPORT_WIDTH` | Mobile width | `390` |
| `VIEWPORT_HEIGHT` | Mobile height | `844` |
| `SCREENSHOT_DIR` | Screenshot output | `docs/screenshots/mobile/` |

### Environment Precheck

```bash
# Set mobile viewport immediately after opening
playwright-cli open ${BASE_URL}
playwright-cli resize 390 844

# Verify mobile layout reflowed
playwright-cli snapshot
# Expected: hero centered, combobox full-width, NO desktop RefineToolbar visible
```

---

## Test Case Conventions

### ID Format
`TC-MOB-{AREA}-{NN}` — e.g., `TC-MOB-FILTER-01`, `TC-MOB-CARD-03`

### Step Structure

```markdown
### TC-MOB-AREA-NN: Short description
- **Precondition:** Required state before test starts
- **Viewport:** 390×844 (set at suite start, maintained throughout)
- **Steps:**
  1. **Action:** What to do
     - **Command:** playwright-cli command
     - **Selector:** Snapshot description
     - **Input:** Data to enter (if applicable)
  2. **Wait:** Condition + timeout
- **Assert:**
  - [ ] Mobile-specific structural checks
- **Screenshot:** `docs/screenshots/mobile/e2e-mob-{feature}-{nn}-{description}.png`
```

---

## Execution Order

```
01-home-destination-mobile   → standalone (no state needed)
02-results-filter-mobile      → requires: destination selected (01)
03-hotel-card-mobile          → requires: destination selected + results visible (02)
04-hotel-detail-mobile        → requires: hotel card visible (03)
05-availability-mobile        → requires: hotel detail page open (04)
```

---

## Feature Files

| # | File | Test Cases | Focus |
|---|------|-----------|-------|
| 01 | [01-home-destination-mobile.md](01-home-destination-mobile.md) | 4 | Home page mobile layout, combobox, select destination, empty state |
| 02 | [02-results-filter-mobile.md](02-results-filter-mobile.md) | 4 | Mobile filter bar, filter sheet, sort, result count |
| 03 | [03-hotel-card-mobile.md](03-hotel-card-mobile.md) | 3 | Cards at 390px, amenity pills, price line |
| 04 | [04-hotel-detail-mobile.md](04-hotel-detail-mobile.md) | 3 | Detail single-column, back navigation, not-found |
| 05 | [05-availability-mobile.md](05-availability-mobile.md) | 3 | Date fields mobile, room cards, date validation |

**Total: 17 test cases**

---

## Pass/Fail Summary Template

```
Date: YYYY-MM-DD
Environment: ${BASE_URL}
Viewport: 390×844
Executor: Claude Agent / Manual

## Home & Destination
- [ ] TC-MOB-HOME-01: Home page loads at 390×844, hero centered, no horizontal overflow
- [ ] TC-MOB-HOME-02: Combobox full-width, searchable on mobile
- [ ] TC-MOB-DEST-01: Select city → results heading + cards visible
- [ ] TC-MOB-DEST-02: Empty state renders on mobile

## Results & Filters
- [ ] TC-MOB-FILTER-01: Mobile filter bar visible with filter count badge
- [ ] TC-MOB-FILTER-02: Filter sheet opens from bottom, star + price filters work
- [ ] TC-MOB-FILTER-03: Close button dismisses filter sheet
- [ ] TC-MOB-SORT-01: Sort select visible and functional on mobile

## Hotel Cards
- [ ] TC-MOB-CARD-01: Cards render single-column, no horizontal overflow
- [ ] TC-MOB-CARD-02: RatingStars + amenity pills visible at 390px
- [ ] TC-MOB-CARD-03: Price line intact on mobile

## Hotel Detail
- [ ] TC-MOB-DETAIL-01: Detail page single-column layout, all sections visible
- [ ] TC-MOB-DETAIL-02: Back navigation preserves filters
- [ ] TC-MOB-DETAIL-03: Not-found page renders on mobile without overflow

## Availability
- [ ] TC-MOB-AVAIL-01: Demo dates auto-seeded, rooms load on mobile
- [ ] TC-MOB-AVAIL-02: Date validation error visible on mobile
- [ ] TC-MOB-AVAIL-03: No rooms empty state on mobile
```
