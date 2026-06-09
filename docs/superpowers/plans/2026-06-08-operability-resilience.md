# Operability & Resilience — Implementation Plan

> Phase 2 slice. Derived from
> `docs/superpowers/specs/2026-06-08-operability-resilience-design.md`.
>
> **Edge cache headers** on `/api/locations` + `/api/hotels` are already present —
> that item from §7 of the spec is done. All remaining tasks below.

---

## Context

The availability service is the only slow/expensive seam in Phase 1.  This plan
hardens it: timeout + retry + circuit breaker, an in-memory TTL cache with two read
policies, fault injection so every claim is testable on the mock, metric events
through the existing `track()` facade, a load-test script, incident playbooks, and a
CI bundle gate.

Layering invariants (from `architecture.md`):
- `services/` is server-only; `lib/` is pure functions only.
- `resilience.ts` and `cache.ts` are stateful → live in `services/`, never `lib/`.
- The client never imports services; it reaches availability only via `/api/*`.

---

## Task list

### T1 — `services/config.ts` — feature flags & env config

**Goal:** a single place to read/default all operability knobs from `process.env`.
No behaviour changes in this task — pure config module.

**Files:**
- `services/config.ts` (new)
- `tests/unit/services/config.test.ts` (new)

**What to build:**
```ts
// services/config.ts
export type ResilienceConfig = {
  // Fault injection (off by default)
  faultEnabled: boolean;          // FAULT_INJECTION_ENABLED=true
  faultErrorRate: number;         // FAULT_ERROR_RATE=0..1 (default 0)
  faultLatencyMultiplier: number; // FAULT_LATENCY_MULTIPLIER=1..N (default 1)

  // Circuit breaker
  breakerFailureThreshold: number; // BREAKER_FAILURE_THRESHOLD (default 3)
  breakerCooldownMs: number;       // BREAKER_COOLDOWN_MS (default 10000)

  // Cache
  cacheTtlMs: number;              // CACHE_TTL_MS (default 30000)
  cacheMaxEntries: number;         // CACHE_MAX_ENTRIES (default 500)

  // Service
  availabilityTimeoutMs: number;   // AVAILABILITY_TIMEOUT_MS (default 3000)
  availabilityMaxRetries: number;  // AVAILABILITY_MAX_RETRIES (default 2)
};

export function getResilienceConfig(): ResilienceConfig { ... }
```

**Done when:** unit tests cover env-var parsing + defaults; `tsc --noEmit` passes.

---

### T2 — `services/cache.ts` — TTL availability cache

**Goal:** in-memory `(hotelId, checkIn, checkOut)` → `AvailableRoom[]` store with:
- `readFresh(key)` — returns entry only if within TTL (cost path)
- `readStale(key)` — returns any entry regardless of TTL (resilience path / last-known)
- `write(key, value)` — upserts with TTL timestamp
- LRU-bounded eviction at `cacheMaxEntries` — entries past TTL are not hard-evicted
  (they remain as last-known fallbacks)

**Files:**
- `services/cache.ts` (new)
- `tests/unit/services/cache.test.ts` (new)

**Key design:**
```ts
export type CacheKey = string; // `${hotelId}:${checkIn}:${checkOut}`
export function buildCacheKey(hotelId: string, checkIn: string, checkOut: string): CacheKey

export type CacheStore = {
  readFresh(key: CacheKey): AvailableRoom[] | null;
  readStale(key: CacheKey): AvailableRoom[] | null;
  write(key: CacheKey, rooms: AvailableRoom[]): void;
  clear(): void; // test seam
};

export function createAvailabilityCache(config: Pick<ResilienceConfig, 'cacheTtlMs' | 'cacheMaxEntries'>): CacheStore
```

**Done when:** fresh/stale/miss/eviction unit tests pass; TTL expiry tested with
mocked `Date.now`; `tsc` clean.

---

### T3 — `services/resilience.ts` — transport-agnostic resilience policy

**Goal:** `withResilience(fn, config)` — decorates any `() => Promise<T>` with:
- **Timeout** — rejects after `availabilityTimeoutMs` ms
- **Bounded retry** — up to `availabilityMaxRetries` retries on transient errors (timeout
  or explicitly-marked retryable); exponential backoff with full jitter to avoid storms
- **Circuit breaker** — three states: CLOSED → OPEN → HALF_OPEN → CLOSED
  - Opens after `breakerFailureThreshold` consecutive failures
  - Stays open for `breakerCooldownMs`, then half-opens for one probe
  - Probe succeeds → CLOSED; probe fails → OPEN again

Breaker state is held in the returned controller object (per-instance, not module-level),
matching the "per-serverless-instance" tradeoff documented in §13 of the spec.

**Files:**
- `services/resilience.ts` (new)
- `tests/unit/services/resilience.test.ts` (new)

**API sketch:**
```ts
export type BreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export type ResiliencePolicy = {
  timeoutMs: number;
  maxRetries: number;
  breakerFailureThreshold: number;
  breakerCooldownMs: number;
};

export type ResilienceController<T> = {
  call(): Promise<T>;          // invoke with full policy
  getBreakerState(): BreakerState;
};

export function createResilienceController<T>(
  fn: () => Promise<T>,
  policy: ResiliencePolicy,
  onBreakerTransition?: (state: BreakerState) => void,
): ResilienceController<T>
```

**Done when:** unit tests cover all state transitions (including half-open probe
success/fail), jitter is present but testable (mock `Math.random`), timeout fires,
retry count is bounded; `tsc` clean.

---

### T4 — Extend `utils/analyticUtil.ts` with resilience metric events

**Goal:** add three new typed event variants to the existing `AnalyticsEvent` union
so the wired availability service can emit operational metrics through `track()`.

**Files:**
- `utils/analyticUtil.ts` (edit — add variants)
- `tests/unit/utils/analyticUtil.test.ts` (edit — test new events)

**New event variants to add:**
```ts
| { name: 'availability_latency'; hotelId: string; durationMs: number; cacheHit: boolean }
| { name: 'availability_cache_miss'; hotelId: string }
| { name: 'availability_breaker_transition'; state: BreakerState; hotelId: string }
```

**Done when:** new event variants compile; existing tests remain green; at least one
test per new variant verifying `track()` fans out correctly.

---

### T5 — Wire `availabilityService.ts` + fault injection + tests

**Goal:** augment the existing `checkAvailability` to:
1. **Fault injection** (off by default via config): if `faultEnabled`, multiply latency
   by `faultLatencyMultiplier` and at `faultErrorRate` probability throw a synthetic
   `AvailabilityUpstreamError` before the real computation
2. **Resilience wrapper**: create a `ResilienceController` around the core call; use
   the exported `availabilityBreakerState` getter for observability
3. **Cache**: check `readFresh` first (cost path) → on miss call upstream via controller
   → on success `write` to cache → on failure `readStale` (resilience path)
4. **Metrics via `track()`**: emit `availability_latency` on every request,
   `availability_cache_miss` on cache miss, `availability_breaker_transition` on
   breaker state change

Add module-level singleton controller + cache so tests can reset them (export test seams).

**Files:**
- `services/availabilityService.ts` (edit)
- `services/resilience.ts` (edit — add `AvailabilityUpstreamError` or define in domain)
- `types/domain.ts` (edit — add `AvailabilityUpstreamError` if not in resilience.ts)
- `tests/unit/services/availabilityService.test.ts` (edit — extend)
- `tests/integration/availability-resilience.test.ts` (new — integration-level scenarios)

**Integration test scenarios (these are the ones that "sell it"):**
- 100% error rate → breaker opens after `breakerFailureThreshold` calls → subsequent calls
  fast-fail and return stale cache (not an error)
- `readFresh` hit → upstream is NOT called (verify with a spy)
- Latency multiplier > timeout → timeout fires → retry runs → fallback serves stale cache
- Breaker `OPEN` → inject recovery (clear fault) → half-open probe → breaker closes

**Done when:** all scenarios pass; `tsc` clean; existing tests remain green; `npm test`
green.

---

### T6 — Load test script (`load/`)

**Goal:** a runnable k6 (or autocannon) script with two scenarios and documented
thresholds.

**Files:**
- `load/availability-test.js` (new) — k6 script
- `load/README.md` (new) — how to run + thresholds + expected output

**Scenarios:**
1. **Happy path** — concurrent GET `/api/hotels/[id]/rooms?check_in=&check_out=` (use
   a hotel id from the seed); assert p95 < 2000ms (availability simulated latency + headroom)
2. **Resilience path** — same but with fault injection enabled (`FAULT_INJECTION_ENABLED=true
   FAULT_ERROR_RATE=1.0`); assert p95 stays flat (breaker holding) not a latency cliff

**Thresholds file** (`load/thresholds.json`) documents the NFR targets so CI/humans
can read them without running k6.

**Done when:** script runs locally (`k6 run load/availability-test.js`) against
`npm run dev`; README documents all thresholds; no `tsc` errors in test files.

---

### T7 — Incident playbooks + SLO definitions (`docs/runbooks/`)

**Goal:** written runbooks, one per failure mode, each covering detection →
diagnosis → mitigation → recovery. Plus SLO targets + sample alert config.

**Files:**
- `docs/runbooks/README.md` — index + SLO targets + sample alert config
- `docs/runbooks/availability-slow.md`
- `docs/runbooks/availability-down.md`
- `docs/runbooks/stale-prices-after-recovery.md`
- `docs/runbooks/bad-deploy.md`

**SLO targets to document:**
- availability p95 latency ≤ 2000ms
- user-visible error rate (post-fallback) ≤ 0.1%
- cache hit ratio ≥ 50% at steady state

**Sample alert** (paste-able CloudWatch / Datadog pseudoconfig):
- error_rate > 1% over 5m rolling → page
- breaker OPEN > 2m → page

**Done when:** all five files present and internally consistent with the spec; no
broken markdown links.

---

### T8 — CI bundle/perf gate

**Goal:** a committed `.github/workflows` job that fails on bundle regression.

**Files:**
- `.size-limit.json` (new) — size-limit config with initial budgets
- `package.json` (edit — add `size-limit` dev dep + `size` script)
- `.github/workflows/bundle.yml` (new) — standalone bundle-check workflow

**Budget:**
- First-load JS total < 150 KB gzipped (per M6 perf budget)
- Route chunk for `/` < 50 KB gzipped

**Done when:** `npm run size` passes locally (after `npm run build`); bundle.yml
workflow present; no existing tests broken.

---

### T9 — Tradeoffs documentation update

**Goal:** append the resilience/operability tradeoffs from spec §13 to
`docs/assumptions-and-tradeoffs.md` so the Phase 2 slice has its reasoning on record.

**Files:**
- `docs/assumptions-and-tradeoffs.md` (edit — append new section "Part 3")

**Tradeoffs to add (verbatim from spec §13):**
- Breaker + cache state per-serverless-instance (not shared)
- In-memory cache (no Redis/edge-KV yet)
- Fault injection ships disabled behind a flag
- Availability application-cached, not HTTP edge-cached
- SLO dashboard designed but not built; metric events are built
- Load test optional in CI (off blocking path to avoid flakiness)
- Deferred: distributed state, observability sampling, virtualization, rate limiting, bulkheads
- Security excluded as deliberate non-scope

**Done when:** tradeoffs are appended as a new "Part 3 — Operability & Resilience"
section; prose is consistent with existing style; Decision Summary table updated.

---

## Execution order (dependencies)

```
T1 (config)
  └─► T2 (cache uses config types)
  └─► T3 (resilience uses config types)
       └─► T4 (metric events — BreakerState type)
            └─► T5 (wire everything together)
                 └─► T6 (load test — needs wired service)

T7, T8, T9 — independent, can run in any order after T5
```
