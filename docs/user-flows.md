# User Flows — Hotel Discovery (Phase 1)

> Primary journeys through the discovery experience.
> Companions: `prd.md`, `architecture.md`.
> Mobile-first: assume 80% mobile traffic; desktop enhances the same flows.

---

## Primary Flow (happy path)

```
Home
  │  type in destination dropdown → options filter (substring)
  ▼
Select destination (country and/or city)        → URL ?country=&city= (slugified)
  │  React Query fetches /api/hotels for location
  ▼
Results list
  │  refine (star, price USD) · sort · paginate    → URL ?stars=&min=&max=&sort=&page=
  │  (filter + sort + paginate in memory, instant)
  ▼
Select a hotel                                   → /hotels/[id]
  │  detail renders immediately (placeholder photo)
  ▼
Hotel detail
  │  pick check-in / check-out dates (manual; not stored in URL)
  ▼
Availability (lazy, third-party sim)
  │  "Checking availability…" → available rooms + price/night (USD)
  ▼
Done (Phase 1 ends at display — no booking)
```

---

## Flow 1 — Choose a destination

```
Home ─→ focus dropdown ─→ type "chi"
                            │
              ┌─────────────┴─────────────┐
           match                       no match
              │                           │
       show options                "No destinations"
       (city, country)                   │
              │                      adjust input
        select one
              │
   write {country[, city]} to URL ─→ load that location's hotels
```

- Country selected → all its cities' hotels. City selected → that city only.

---

## Flow 2 — Refine, sort, paginate (in memory)

```
Results list (loaded location set)
   │
   ├─ adjust star rating ─┐
   ├─ set price min–max  ─┤→ filter ─→ sort ─→ paginate ─→ render
   ├─ change sort        ─┤   (URL: ?stars=&min=&max=&sort=&page=)
   └─ change page        ─┘
   │
   filter/sort change → reset to page 1
   │
   no matches → "No hotels found" + reset
```

---

## Flow 3 — Hotel detail + availability

```
Select hotel ─→ /hotels/[id]
   │  GET /api/hotels/[id]  → hotel + static room info (fast)
   ▼
Detail renders (name, address, description, amenities, policies, ratings)
   │
   pick check-in / check-out
   │  validate: checkout > check-in
   ▼
GET /api/hotels/[id]/rooms?check_in=&check_out=   (lazy, simulated latency)
   │
   ┌──────────────┬───────────────┬──────────────┐
loading        success          empty           error
   │              │                │               │
"Checking…"   rooms + price   "No rooms        inline error
 skeleton                       available"        + retry
                                                (page not blocked)
```

---

## Edge & Empty States

| Point | Trigger | UI / behavior |
|-------|---------|---------------|
| Destination | no option matches input | "No destinations" |
| Destination | empty input | show all options |
| Destination | `/api/locations` slow/fails | disabled/empty dropdown + retry |
| Results | no location selected yet | prompt to pick a destination |
| Results | filters exclude all | "No hotels found" + reset |
| Filter | price `min > max` | swap or block (no crash) |
| Sort/page | bad param (`page=99`, `sort=x`) | clamp / default, never error |
| Pagination | single page | hide controls |
| Detail | invalid `/hotels/[id]` | not-found page |
| Detail dates | checkout ≤ check-in | blocked / invalid |
| Detail dates | partial (only check-in) | no fetch until both set |
| Availability | loading | "Checking availability…" skeleton |
| Availability | `available_dates: []` (15% of stock) | "No rooms available for these dates" |
| Availability | dates outside July 2026 window | "No rooms available" (dataset accepted as-is) |
| Availability | stale response (dates changed mid-flight) | latest-wins; older response ignored |
| Availability | timeout / offline | inline error + retry; page not blocked |
| Navigation | back/forward | restores filters/sort/page (not dates) |

---

## State & Data at a Glance

```
Client state (URL + AppProvider)        Server state (React Query)
────────────────────────────            ──────────────────────────
country, city (slugified, URL)          /api/locations   (once)
stars, min, max, sort, page (URL)       /api/hotels      [country, city]
check-in, check-out (AppProvider only,  /api/hotels/[id]
  manual entry, NOT in URL)             /api/hotels/[id]/rooms [id,check_in,check_out]
```

All data flows client → `/api/*` → server-only services → mock seed.
Prices are USD; photos use a placeholder.
