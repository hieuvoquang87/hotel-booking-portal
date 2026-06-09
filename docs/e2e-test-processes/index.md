# Hotel Booking Portal — E2E Test Processes

Comprehensive E2E test suites covering all Phase-1 features at desktop (≥1280px) and mobile (390×844) viewports. Designed for dual execution: **Claude Agent** via `playwright-cli`, or **human QA** following the same step-by-step runbooks.

> **Architecture invariants under test:** location-first loading, filter/sort/paginate in memory, dates not in URL, availability is lazy and decoupled, client reaches data only via `/api/*`.

---

## Suites

| Suite | Directory | Viewport | Focus |
|-------|-----------|----------|-------|
| Desktop Web | [desktop-web/](desktop-web/) | 1280×720 | Full-feature desktop flows |
| Mobile Web | [mobile-web/](mobile-web/) | 390×844 | Mobile-first flows (80% traffic target) |

---

## Environment Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `BASE_URL` | App URL | `http://localhost:3000` |
| `API_URL` | BFF base | `http://localhost:3000/api` |
| `SEED_HOTEL_COUNT` | Hotels in seed data | `40` |
| `SEED_LOCATION_COUNT` | Unique cities in seed | `10` |
| `SEED_COUNTRY_COUNT` | Unique countries in seed | `6` |
| `SCREENSHOT_DIR` | Screenshot output | `docs/screenshots/` |

### Environment Precheck

Before running any test:

```bash
# Verify the app is running
curl -s -o /dev/null -w "%{http_code}" ${BASE_URL}
# Expected: 200

# Verify BFF is reachable
curl -s ${API_URL}/locations | head -c 100
# Expected: JSON array of locations

# Open browser
playwright-cli open ${BASE_URL}
```

---

## Test Case Conventions

### ID Format

`TC-{AREA}-{NN}` — e.g., `TC-CARD-02`, `TC-MOB-FILTER-01`

### Step Structure

```markdown
### TC-AREA-NN: Short description
- **Precondition:** Required state before test starts
- **Steps:**
  1. **Action:** What to do
     - **Command:** playwright-cli command
     - **Selector:** snapshot description (re-run snapshot each time to get fresh refs)
     - **Input:** Data to enter (if applicable)
  2. **Wait:** Condition + timeout
- **Assert:**
  - [ ] Structural UI checks
- **Screenshot:** `e2e-{feature}-{nn}-{description}.png`
```

### Selector Strategy

Selectors reference `playwright-cli snapshot` output descriptions, not hardcoded refs (which change between page loads). Common patterns:

| Element | Snapshot description |
|---------|---------------------|
| Destination input | `combobox` or `textbox "Search a city or country…"` |
| Hotel card link | `link` with hotel name |
| Star filter pill | `button "3★ & up"` etc. |
| Sort select | `combobox "Sort hotels"` |
| Check-in date input | `textbox "Check-in"` |
| Check-out date input | `textbox "Check-out"` |

Always re-run `playwright-cli snapshot` before interacting to get current refs.

### Screenshot Convention

Save to `docs/screenshots/` with pattern: `e2e-{feature}-{nn}-{description}.png`

Desktop screenshot path: `docs/screenshots/e2e-{feature}-{nn}-{description}.png`
Mobile screenshot path: `docs/screenshots/mobile/e2e-mob-{feature}-{nn}-{description}.png`

---

## Execution Order

Both suites are independent and can run in parallel. Within each suite, follow the numbered order.

```
Desktop Web                       Mobile Web
───────────                       ──────────
01-home-destination              01-home-destination-mobile
02-results-refine                 02-results-filter-mobile
03-hotel-card                     03-hotel-card-mobile
04-hotel-detail                   04-hotel-detail-mobile
05-availability                   05-availability-mobile
06-edge-states
```

---

## Pass/Fail Summary Template

Copy this after each full run:

```
Date: YYYY-MM-DD
Environment: ${BASE_URL}
Executor: Claude Agent / Manual

## Desktop Web
- [ ] TC-HOME-01: Home page loads with hero + combobox
- [ ] TC-HOME-02: Empty state shown before destination selected
- [ ] TC-DEST-01: Type in combobox filters options
- [ ] TC-DEST-02: Select a city → hotels load, heading "Hotels in {city}" shown
- [ ] TC-DEST-03: Select a country → all its cities' hotels load
- [ ] TC-RESULT-01: Hotel cards render with name, rating stars, price, amenities
- [ ] TC-RESULT-02: Result count matches loaded hotels
- [ ] TC-FILTER-01: Star filter — select "4★ & up" reduces results
- [ ] TC-FILTER-02: Price filter — set min/max bounds reduce results
- [ ] TC-FILTER-03: Reset filters restores full result set
- [ ] TC-SORT-01: Sort "Recommended" is default
- [ ] TC-SORT-02: Sort "Price: Low to High" reorders results
- [ ] TC-PAGE-01: Pagination controls visible when >8 results
- [ ] TC-PAGE-02: Page change updates results without page reload
- [ ] TC-PAGE-03: URL updates with ?page=N on page change
- [ ] TC-CARD-01: Fractional rating stars render (not single star)
- [ ] TC-CARD-02: Card links to /hotels/[id]
- [ ] TC-CARD-03: Amenity pills show curated labels
- [ ] TC-CARD-04: Price line has divider + "from $X / night"
- [ ] TC-CARD-05: Photo placeholder has stripe texture, name overlay, star badge
- [ ] TC-DETAIL-01: Hotel detail page renders all sections
- [ ] TC-DETAIL-02: Back to results navigates to home with filters preserved
- [ ] TC-DETAIL-03: Invalid hotel ID → not-found page
- [ ] TC-AVAIL-01: Demo dates auto-seeded on first visit
- [ ] TC-AVAIL-02: Rooms load for seeded dates
- [ ] TC-AVAIL-03: Change dates triggers new availability fetch
- [ ] TC-AVAIL-04: Check-out ≤ check-in shows inline error
- [ ] TC-AVAIL-05: No rooms available shows empty state
- [ ] TC-EDGE-01: No results after filters → empty state + reset button
- [ ] TC-EDGE-02: Single page of results → pagination hidden
- [ ] TC-EDGE-03: Brand badge rendered in header
- [ ] TC-EDGE-04: Footer visible with "Stayfinder · Phase 1"
- [ ] TC-EDGE-05: Console is clean — zero errors

## Mobile Web
- [ ] TC-MOB-HOME-01: Home page loads at 390×844
- [ ] TC-MOB-DEST-01: Combobox works on mobile
- [ ] TC-MOB-RESULT-01: Hotel cards stack single-column on mobile
- [ ] TC-MOB-FILTER-01: Mobile filter bar visible with filter count badge
- [ ] TC-MOB-FILTER-02: Filter sheet opens, apply filters, count updates
- [ ] TC-MOB-FILTER-03: Sort select on mobile
- [ ] TC-MOB-CARD-01: Card layout reflows on 390px width
- [ ] TC-MOB-DETAIL-01: Detail page renders on mobile without horizontal overflow
- [ ] TC-MOB-AVAIL-01: Date fields + rooms stack vertically on mobile
- [ ] TC-MOB-AVAIL-02: Availability works on mobile
- [ ] TC-MOB-EDGE-01: No horizontal scroll on 390px anywhere
- [ ] TC-MOB-EDGE-02: Brand badge visible on mobile header
```
