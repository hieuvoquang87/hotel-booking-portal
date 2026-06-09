# Load Tests

k6 load tests for the hotel-booking-portal availability and filter/sort endpoints.

## Prerequisites

### 1. Install k6

```bash
brew install k6
```

Or follow the official docs: <https://k6.io/docs/get-started/installation/>

### 2. Start the dev server

```bash
npm run dev
```

The tests target `http://localhost:3000` by default.

---

## Running the tests

### Happy path (default)

```bash
k6 run load/availability-test.js
```

- **5 virtual users**, **30 seconds**
- Hits the availability endpoint (`/api/hotels/hotel-01/rooms`) and the hotel list filter endpoint (`/api/hotels?country=United+States`)
- Thresholds: `http_req_duration p95 < 2000 ms`, filter custom metric `p95 < 100 ms`, error rate `< 1%`

### Resilience path (circuit-breaker verification)

Start the dev server with fault injection enabled in a separate terminal:

```bash
FAULT_INJECTION_ENABLED=true FAULT_ERROR_RATE=1.0 npm run dev
```

Then run the resilience scenario:

```bash
k6 run -e SCENARIO=resilience load/availability-test.js
```

- **10 virtual users**, **30 seconds**
- Hits only the availability endpoint
- With `FAULT_ERROR_RATE=1.0` every upstream call fails. The circuit breaker should open quickly and begin fast-failing (returning stale cache or an immediate error response) rather than waiting for the full upstream timeout.
- Threshold: `http_req_duration p95 < 500 ms` — a low, flat p95 **proves the breaker is holding**, not that requests are succeeding.

> **Note:** The resilience scenario is an optional CI job and is not on the blocking path. It is designed for manual verification and exploratory performance runs.

---

## Thresholds reference

See [`thresholds.json`](./thresholds.json) for the authoritative NFR values.

| Metric | Threshold | Scenario |
|--------|-----------|----------|
| `http_req_duration` p95 | < 2000 ms | happy path |
| `filter_duration` p95 | < 100 ms | happy path (in-memory filter) |
| `http_req_duration` p95 | < 500 ms | resilience path (breaker fast-fail) |
| `http_req_failed` rate | < 1% | happy path |

---

## Controlling scenarios

The script is controlled by the `SCENARIO` env var (passed with `-e`):

| Value | Behaviour |
|-------|-----------|
| `happy` (default) | 5 VUs, 30s, availability + filter endpoints |
| `resilience` | 10 VUs, 30s, availability endpoint only, breaker threshold |

```bash
# Explicit happy path
k6 run -e SCENARIO=happy load/availability-test.js

# Resilience path
k6 run -e SCENARIO=resilience load/availability-test.js
```
