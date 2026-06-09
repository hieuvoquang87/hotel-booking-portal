# Hotel Booking Portal — Desktop Web E2E Test Procedures

Comprehensive E2E test suite covering all Phase-1 features at desktop viewport (≥1280px). Designed for execution by Claude Agent via `playwright-cli`, also usable as manual QA runbooks.

> Use the `testing-web-e2e` skill to co-run this suite alongside the mobile suite as parallel sub-agents.

---

## Environment Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `BASE_URL` | App URL | `http://localhost:3000` |
| `VIEWPORT_WIDTH` | Desktop width | `1280` |
| `VIEWPORT_HEIGHT` | Desktop height | `720` |
| `SCREENSHOT_DIR` | Screenshot output | `docs/screenshots/` |

### Environment Precheck

```bash
# Verify app is running
curl -s -o /dev/null -w "%{http_code}" ${BASE_URL}
# Expected: 200

# Verify BFF endpoints
curl -s ${BASE_URL}/api/locations | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'Locations: {len(d)}')"
# Expected: Locations: 12 (10 cities + 6 countries — some overlap)

# Open browser at desktop viewport
playwright-cli open ${BASE_URL}
playwright-cli resize ${VIEWPORT_WIDTH} ${VIEWPORT_HEIGHT}
```

---

## Test Case Conventions

### ID Format
`TC-{AREA}-{NN}` — e.g., `TC-DEST-01`, `TC-CARD-03`

### Step Structure

```markdown
### TC-AREA-NN: Short description
- **Precondition:** Required state before test starts
- **Steps:**
  1. **Action:** What to do
     - **Command:** playwright-cli command
     - **Selector:** Snapshot description (re-run snapshot each time)
     - **Input:** Data to enter (if applicable)
  2. **Wait:** Condition + timeout
- **Assert:**
  - [ ] Structural UI checks
- **Screenshot:** `e2e-{feature}-{nn}-{description}.png`
```

### Selector Strategy

Selectors reference `playwright-cli snapshot` output descriptions, not hardcoded refs (which change between page loads).

Always re-run `playwright-cli snapshot` before interacting to get current refs.

### Screenshot Convention

Save to `docs/screenshots/` with pattern: `e2e-{feature}-{nn}-{description}.png`

---

## Execution Order

```
01-home-destination    → standalone (no state needed)
02-results-refine      → requires: destination selected (01)
03-hotel-card          → requires: destination selected + results visible (02)
04-hotel-detail        → requires: hotel card visible (03)
05-availability        → requires: hotel detail page open (04)
06-edge-states         → requires: results visible (02)
```

---

## Feature Files

| # | File | Test Cases | Focus |
|---|------|-----------|-------|
| 01 | [01-home-destination.md](01-home-destination.md) | 5 | Home page render, hero, combobox search, select city, select country |
| 02 | [02-results-refine.md](02-results-refine.md) | 8 | Result count, star filter, price filter, sort (2), pagination (2), reset |
| 03 | [03-hotel-card.md](03-hotel-card.md) | 5 | Card layout, rating stars, amenity pills, price line, photo placeholder, card link |
| 04 | [04-hotel-detail.md](04-hotel-detail.md) | 3 | Detail page sections, back navigation, not-found |
| 05 | [05-availability.md](05-availability.md) | 5 | Auto-seeded dates, rooms load, date change, date validation, no rooms |
| 06 | [06-edge-states.md](06-edge-states.md) | 5 | No results, single-page pagination, footer/brand, empty-state icon, console errors |

**Total: 31 test cases**

---

## Pass/Fail Summary Template

```
Date: YYYY-MM-DD
Environment: ${BASE_URL}
Viewport: 1280×720
Executor: Claude Agent / Manual

## Home & Destination
- [ ] TC-HOME-01: Home page loads with hero, combobox, empty state
- [ ] TC-HOME-02: Brand badge (blue square + white pin) in header
- [ ] TC-DEST-01: Type in combobox filters destinations by substring
- [ ] TC-DEST-02: Select a city → hotels load, "Hotels in {city}" heading
- [ ] TC-DEST-03: Select a country → all its cities' hotels load

## Results & Refine
- [ ] TC-RESULT-01: Result count shows correct total
- [ ] TC-FILTER-01: Star filter pill — select "4★ & up" reduces results
- [ ] TC-FILTER-02: Price filter — set bounds reduce results
- [ ] TC-FILTER-03: Reset filters restores full set
- [ ] TC-SORT-01: Sort default is "Recommended" (rating desc)
- [ ] TC-SORT-02: Sort "Price: Low to High" reorders
- [ ] TC-PAGE-01: Pagination visible when >8 results; URL has ?page=
- [ ] TC-PAGE-02: Page 2 shows different hotels, no page reload

## Hotel Cards
- [ ] TC-CARD-01: Fractional RatingStars render (amber fill, not single star)
- [ ] TC-CARD-02: Card links to /hotels/[id] with descriptive aria-label
- [ ] TC-CARD-03: Amenity pills show curated labels (Wi-Fi, Free breakfast, etc.)
- [ ] TC-CARD-04: Price line: border-t divider + "from $X / night" with large price

## Hotel Detail
- [ ] TC-DETAIL-01: Detail page renders all sections (hero, overview, amenities, policies, availability)
- [ ] TC-DETAIL-02: Back to results → home with filters preserved in URL
- [ ] TC-DETAIL-03: Invalid hotel ID (/hotels/nonexistent) → not-found page

## Availability
- [ ] TC-AVAIL-01: Demo dates auto-seeded (2026-07-10 → 2026-07-12) on first visit
- [ ] TC-AVAIL-02: Rooms load with "X rooms available" and RoomCards
- [ ] TC-AVAIL-03: Change dates → new availability fetch, results update
- [ ] TC-AVAIL-04: Check-out ≤ check-in → "Check-out must be after check-in" error

## Edge States
- [ ] TC-EDGE-01: Filters exclude all → "No hotels found" + reset button
- [ ] TC-EDGE-02: Single page of results → pagination hidden
- [ ] TC-EDGE-03: Footer visible with "Stayfinder · Phase 1"
- [ ] TC-EDGE-04: EmptyState icon is blue-tinted (bg-blue-50 + text-blue-600)
```
