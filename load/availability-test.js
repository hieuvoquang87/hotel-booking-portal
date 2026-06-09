// k6 load test — availability and filter/sort endpoints
// Run with: k6 run load/availability-test.js
// Resilience run: k6 run -e SCENARIO=resilience load/availability-test.js
//
// Scenario selection is controlled by the SCENARIO env var:
//   happy       (default) — 5 VUs, 30s, happy-path thresholds
//   resilience  — 10 VUs, 30s, circuit-breaker thresholds

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

// ---------------------------------------------------------------------------
// Custom metrics
// ---------------------------------------------------------------------------
const availabilityDuration = new Trend('availability_duration', true);
const filterDuration = new Trend('filter_duration', true);

// ---------------------------------------------------------------------------
// Scenario configuration
// ---------------------------------------------------------------------------
const SCENARIO = __ENV.SCENARIO || 'happy';

const scenarioConfig = {
  happy: {
    executor: 'constant-vus',
    vus: 5,
    duration: '30s',
  },
  resilience: {
    executor: 'constant-vus',
    vus: 10,
    duration: '30s',
  },
};

if (!scenarioConfig[SCENARIO]) {
  throw new Error(`Unknown SCENARIO "${SCENARIO}". Valid values: happy, resilience`);
}

export const options = {
  scenarios: {
    [SCENARIO]: scenarioConfig[SCENARIO],
  },
  thresholds:
    SCENARIO === 'resilience'
      ? {
          // Circuit breaker must fast-fail — p95 stays flat and low
          http_req_duration: ['p(95)<500'],
          http_req_failed: ['rate<0.01'],
        }
      : {
          // Happy-path NFRs
          http_req_duration: ['p(95)<2000'],
          http_req_failed: ['rate<0.01'],
          // Granular thresholds on custom metrics
          availability_duration: ['p(95)<2000'],
          filter_duration: ['p(95)<100'],
        },
};

// ---------------------------------------------------------------------------
// Base URL
// ---------------------------------------------------------------------------
const BASE = 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Happy-path scenario: availability check + in-memory hotel filter
// ---------------------------------------------------------------------------
function runHappyPath() {
  // 1. Availability endpoint (simulated slow third-party)
  const availRes = http.get(
    `${BASE}/api/hotels/hotel-01/rooms?check_in=2026-07-10&check_out=2026-07-12`,
    { tags: { name: 'availability' } },
  );
  availabilityDuration.add(availRes.timings.duration);

  check(availRes, {
    'availability status 200': (r) => r.status === 200,
    'availability has rooms array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.rooms) || Array.isArray(body);
      } catch {
        return false;
      }
    },
  });

  sleep(0.5);

  // 2. Hotel list with country filter (in-memory, should be fast)
  const filterRes = http.get(
    `${BASE}/api/hotels?country=United+States`,
    { tags: { name: 'filter' } },
  );
  filterDuration.add(filterRes.timings.duration);

  check(filterRes, {
    'filter status 200': (r) => r.status === 200,
    'filter returns hotels': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.hotels) || Array.isArray(body);
      } catch {
        return false;
      }
    },
  });

  sleep(0.5);
}

// ---------------------------------------------------------------------------
// Resilience scenario: circuit breaker under 100% fault injection
//
// Start the server with fault injection enabled before running this scenario:
//   FAULT_INJECTION_ENABLED=true FAULT_ERROR_RATE=1.0 npm run dev
//
// With all upstream calls failing the circuit breaker should open quickly and
// begin fast-failing (returning stale cache or an immediate error response)
// instead of hanging for the full upstream timeout.  The p95 threshold of
// 500 ms proves the breaker is holding, NOT that requests are succeeding.
// ---------------------------------------------------------------------------
function runResiliencePath() {
  const res = http.get(
    `${BASE}/api/hotels/hotel-01/rooms?check_in=2026-07-10&check_out=2026-07-12`,
    { tags: { name: 'resilience' } },
  );
  availabilityDuration.add(res.timings.duration);

  // We accept either a 200 (stale cache) or a fast 503/429/500 (tripped breaker).
  // What we do NOT accept is a slow response — that is caught by the threshold.
  check(res, {
    'breaker responds quickly (not hanging)': (r) => r.timings.duration < 500,
    'breaker returns a known status': (r) =>
      [200, 429, 500, 502, 503, 504].includes(r.status),
  });

  sleep(0.3);
}

// ---------------------------------------------------------------------------
// Default function — entry point for k6
// ---------------------------------------------------------------------------
export default function () {
  if (SCENARIO === 'resilience') {
    runResiliencePath();
  } else {
    runHappyPath();
  }
}
