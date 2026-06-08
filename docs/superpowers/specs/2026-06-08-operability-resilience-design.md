# Phase 2 (slice) — Operability & Resilience — Design Spec

> A Phase 2 slice (see `docs/product-roadmap.md` §"Phase 2"). Hardens the one
> expensive/slow/unreliable boundary — the availability service — and makes it
> operable, exercisable, and observable. Designed to be **buildable today**: it
> rests on the M1 `availabilityService`, the only data seam already implemented.
> Sources: `architecture.md`, `product-roadmap.md`, `progress.md`,
> `assumptions-and-tradeoffs.md`.

**Status:** approved design — implementation plan follows in
`docs/superpowers/plans/2026-06-08-operability-resilience.md`.

---

## 1. Goal & Scope

**Goal.** Turn the simulated slow third-party (availability) into a *bounded,
recoverable, cacheable, observable* dependency, and give the system the operational
affordances (flags, metrics, load tests, incident playbooks, CI gates) to run it.
The written rationale and documented tradeoffs are themselves the deliverable —
this slice exists to demonstrate design thinking across the AWS Well-Architected
pillars, on mock data.

**Pillars covered (4 of the 6 the request named):** Reliability, Performance,
Cost Optimization, Operational Excellence. *Resiliency* folds into Reliability.
**Security is the deliberately-excluded 6th pillar** — out of scope for this slice
(noted so the omission reads as a choice, not an oversight).

**The discriminating bar.** Every item in scope must pass: *can I trigger and
observe it on the mock?* Items that cannot are explicitly downgraded to
"documented design only" rather than asserted as built.

**In scope:**

- Fault-injection mode in `availabilityService` (the test harness for everything else).
- A transport-agnostic resilience policy: timeout, bounded retry + jitter, circuit breaker.
- A single availability cache with two read policies (cost vs. resilience).
- Edge cache headers on the cheap, stable BFF reads (`/api/locations`, `/api/hotels`).
- Feature flags / env config (mock-vs-real, fault params, breaker thresholds, cache TTL).
- Metric events emitted through the `track()` facade (latency, cache hit/miss, breaker state).
- A committed load-test script with thresholds tied to the NFR budget.
- Incident playbooks: one runbook per documented failure mode.
- CI perf + bundle gates (`size-limit` + a web-vitals budget).
- SLO + alert definitions (documented design only — see §8).

**Out of scope (considered, deferred as disproportionate at this inventory scale):**
shared/distributed breaker + cache state (Redis/edge-KV), observability sampling,
grid virtualization, synthetic uptime monitoring, BFF rate limiting, bulkhead
concurrency caps. Each is named in §10 so the deferral is explicit.

---

## 2. What exists vs. what is assumed

Precision here is part of the design's honesty. Only **M0 + M1** are built today.

| Surface | State | Role in this slice |
| --- | --- | --- |
| `services/availabilityService.ts` | **Exists (M1)** — `checkAvailability` with configurable simulated latency | The keystone. Gains fault injection; its dependency call is wrapped by the resilience policy and fronted by the cache. This is why the slice is buildable now. |
| `/api/locations`, `/api/hotels`, `/api/hotels/[id]/rooms` | **Assumed (M2, docs-only)** | Edge cache headers are spec'd for when these land; this slice does not build the routes. |
| `http.ts` (real-API fetch wrapper) | **Assumed (Phase 2 service swap)** | Slots *inside* `withResilience` unchanged when real endpoints replace the mock. |
| `track()` observability facade | **Assumed (M6, docs-only)** | Metric events target this facade. If M6 hasn't landed, the plan stubs a minimal facade. |

The resilience layer is designed against the **one real seam that already exists**
(the availability service), not against assumed Phase-1 surfaces. That is what
makes it implementable ahead of the rest of Phase 1.

---

## 3. Load-bearing decision 1 — a transport-agnostic resilience seam

A `withResilience(fn, policy)` wrapper that decorates **any** async dependency
call — the mock today, real HTTP later.

**Why not in `http.ts`.** There is no HTTP call on the mock, so a policy living in
`http.ts` could never be triggered or tested until a real API exists. The breaker
could never trip in a unit test. A policy module that wraps the *dependency call
abstraction* (mock or real) is the difference between a design wishlist and design
thinking: paired with fault injection (§5), the breaker actually opens, serves
stale, and recovers — all on the mock.

**Placement.** `services/resilience.ts` — server-only, consistent with the
"services are server-only" invariant. It is **stateful** (breaker counters), so it
lives in `services/`, not `lib/` (which the architecture reserves for pure
functions).

**Policy contents:**

- **Timeout** — bound every upstream call; a hung dependency must not hang the request.
- **Bounded retry** — at most 2 retries, exponential backoff **with jitter** (avoid
  synchronized retry storms). Retries only transient failures (timeout, 5xx), never
  a definitive "no rooms" result.
- **Circuit breaker** — after _N_ consecutive failures the breaker **opens** and
  fast-fails to the fallback ladder (§4) without touching upstream; after a cooldown
  it **half-opens** to probe, then **closes** on success.

---

## 4. Load-bearing decision 2 — one cache, two read policies

A single `(hotelId, dateRange)` TTL store (`services/cache.ts`, server-only, in-memory),
read two different ways depending on caller intent:

| Caller intent | Read policy | Pillar |
| --- | --- | --- |
| Normal request | serve **within TTL** (fresh) → else call upstream | Cost — skip the expensive call |
| Upstream failing | serve **stale, past TTL** as last-known | Reliability — stale price > no price |

**Consequence (documented).** Do **not** hard-evict past-TTL entries — they are the
last-known fallback when upstream is down. Cost wants *fresh*; resilience wants
*anything*. Same store, two doors. Eviction is bounded by size/LRU, not by TTL alone.

This dual role is the detail that proves the thinking: the cost lever and the
resilience fallback are the *same* mechanism read under different policies.

---

## 5. Fault injection — the test harness

`availabilityService` gains a fault-injection mode, **off by default**, controlled by
flags (§6). It can inject:

- **Latency** — multiply or spike simulated delay (drive timeouts).
- **Errors** — return 5xx-equivalent failures at a configurable rate (drive retries + breaker).
- **Recovery** — flip back to healthy (drive breaker half-open → close).

This is a **test affordance, not production behavior** — it ships disabled and is the
deterministic harness that makes every resilience claim in this spec observable
(§9, §11).

---

## 6. The single control-flow path

The availability request is **one** path, not a list of features:

```
request(hotelId, dates)
  │
  ├─ breaker OPEN? ──────────────► fallback ladder
  │
  ├─ cache fresh (within TTL)? ──► return cached                 [cost]
  │
  └─ call upstream  (timeout-bounded, ≤2 retries + jitter)
        ├─ success ──► write cache, return                       [reliability]
        └─ exhausted ─► trip breaker ─► fallback ladder

fallback ladder:  stale cache (last-known)
                  →  "pricing temporarily unavailable" empty-state
                  (hotel browsing & detail render are never blocked)
```

Browsing never blocks on availability — that graceful degradation is inherited from
Phase 1's decoupled, lazy availability boundary. This slice only adds the bounding
(timeout/breaker) and the exploitation (cache) of that existing seam.

---

## 7. Edge caching for the cheap reads

`Cache-Control: s-maxage=<window>, stale-while-revalidate=<window>` on
`/api/locations` and `/api/hotels` — stable, cheap, location-first reads. Cuts
serverless invocations (cost) and improves LCP (performance); directly observable in
response headers.

**Caveat (honesty).** These routes are M2 and **not built yet**. This is a spec'd
header policy for when they land, not a change to existing code. The availability
route is deliberately **not** edge-cached at the HTTP layer — its freshness/fallback
logic lives in the application cache (§4), which the breaker and stale-read policy
depend on.

---

## 8. Operability — with the demonstrability bar applied

| Item | How it's demonstrated | Status |
| --- | --- | --- |
| **Feature flags / env config** (mock-vs-real, fault params, breaker thresholds, cache TTL) | Flip a flag, observe behavior change in tests/dev | ✅ build |
| **Metric events via `track()`** (call latency, cache hit/miss, breaker state transitions) | Emit through the facade; assert emission in tests | ✅ build |
| **Load-test script** (§9) | Run locally against dev BFF; thresholds enforced | ✅ build |
| **Incident playbooks** (§10) | One runbook per documented failure mode | ✅ build (doc) |
| **CI perf + bundle gates** (`size-limit` + web-vitals budget) | A *real committed* workflow that fails on regression | ✅ build (extends M7) |
| **SLOs + dashboard / alert config** (availability p95, error rate) | A live dashboard on mock data is hand-wavy | ⬇ **documented design only** — define SLOs + sample alert config in this spec; do not claim a live dashboard |

The SLO/dashboard downgrade is deliberate: asserting a dashboard that cannot be
shown on mock data would undercut the deliverable. What *is* built — the metric
events through `track()` — is the real feed a dashboard would consume, so the design
is honest and forward-compatible.

**SLO targets (documented design):** availability call p95 latency, availability
error rate (post-fallback user-visible failure rate), cache hit ratio. **Sample
alert:** error rate > threshold over a rolling window, or breaker open > N minutes →
page. The `no_results` / `no_rooms` typed events (Phase 2 §4) feed an inventory-gap
signal on the same dashboard.

---

## 9. Load testing

A committed script (k6 or autocannon) targeting the local BFF, with thresholds tied
to the **NFR budget** (filter response < 100ms in-memory; availability p95 under
concurrency). Two scenarios:

1. **Happy path** — concurrent browse + availability; assert in-memory filter/sort
   stays < 100ms and availability p95 stays within budget.
2. **Resilience path** (fault injection on, sustained errors) — assert the breaker
   **holds open and fast-fails** (a flat latency line), **not** a latency cliff. This
   is the load-test that proves the resilience design rather than just the happy path.

Runnable locally and as an *optional* CI job (kept off the blocking path to avoid
flaky CI). Results/thresholds documented.

---

## 10. Incident playbooks

One runbook per documented failure mode, each closing the loop
**detection → diagnosis → mitigation → recovery / rollback**:

| Failure mode | Detection signal | Mitigation / recovery |
| --- | --- | --- |
| Availability upstream slow | p95 latency SLO breach; rising timeout metric | Breaker bounds blast radius; serve stale cache; widen cache TTL via flag |
| Availability upstream down (5xx) | error-rate SLO breach; breaker OPEN metric | Confirm breaker open + serving last-known; if prolonged, raise status banner |
| Stale prices after recovery | breaker closed but cache-hit ratio high | Flush/short-TTL availability cache via flag |
| Price drift at booking | re-validation mismatch (Phase 2 booking) | Lock re-validated price; surface change to user |
| Bad deploy / regression | CI perf/bundle gate (pre-merge) or web-vitals alert | Roll back deploy; gate prevents most from merging |

Playbooks live alongside the SLO/alert definitions so an on-call reader goes
signal → action in one place.

---

## 11. Where it lives (layering — services stay server-only)

```
services/
├── availabilityService.ts   (exists, M1) — + fault-injection mode; uses wrapper + cache
├── resilience.ts            NEW — withResilience(): timeout, retry+jitter, circuit breaker
├── cache.ts                 NEW — (hotelId,dateRange) TTL store; two read policies
└── config.ts                NEW — feature flags / thresholds from env (or lib/ if pure)

app/api/locations, app/api/hotels    — Cache-Control headers (when M2 lands)

load/                        NEW — k6/autocannon script + thresholds
docs/runbooks/               NEW — incident playbooks + SLO/alert definitions
.github/workflows            — perf + bundle gate (extends M7 CI)
```

`resilience.ts` and `cache.ts` are stateful, so they sit in `services/`
(server-only), never `lib/`. The client never imports them — it reaches availability
only via `/api/*`, unchanged from the Phase-1 invariant.

---

## 12. Testing strategy (this is what sells it)

Fault injection (§5) is the deterministic harness:

- Inject 100% error rate → assert breaker opens after _N_ failures and the fallback
  ladder serves **stale cache**, not an error.
- Inject latency > timeout → assert timeout fires, retry + jitter runs, then fallback.
- Inject recovery → assert breaker half-opens, probes, then **closes**.
- Cache: assert fresh hit skips upstream (cost); assert stale read on error (resilience).
- Metrics: assert `track()` receives latency / cache hit-miss / breaker-state events.
- Load (§9): assert flat latency under sustained failure (breaker holding).

All deterministic, all on the mock, all unit/integration-level — no external
dependency required.

---

## 13. Tradeoffs to document (the deliverable for "design thinking")

These belong in `ASSUMPTIONS-AND-TRADEOFFS.md`:

- **Breaker + cache state is per-serverless-instance, not shared.** Acceptable for a
  demo; production would use Redis / edge-KV. Naming the limitation *is* the maturity
  signal — and `cache.ts` / `resilience.ts` are the seams where a shared store plugs in.
- **In-memory cache** — same rationale; documents the swap point.
- **Fault injection ships disabled** behind a flag — a test affordance, not prod behavior.
- **Availability is application-cached, not HTTP edge-cached** — its freshness +
  fallback logic must live where the breaker can read stale entries.
- **SLO dashboard is designed, not built;** metric events that would feed it *are* built.
- **Load test is optional in CI** — kept off the blocking path to avoid flakiness.
- **Deferred as disproportionate:** distributed state, observability sampling,
  virtualization, synthetic monitoring, rate limiting, bulkheads (§1 out-of-scope).
- **Security** is the deliberately-excluded 6th Well-Architected pillar for this slice.

---

## 14. Pillar coverage map

| Pillar | This slice delivers |
| --- | --- |
| **Reliability / Resiliency** | timeout, bounded retry + jitter, circuit breaker, tiered fallback ladder, stale-cache last-known |
| **Performance** | availability cache (skip slow call), edge headers on cheap reads, web-vitals CI budget, load-test thresholds |
| **Cost Optimization** | cache the expensive upstream, edge caching to cut invocations, SSG/ISR framing (Phase 2), deferred-sampling noted |
| **Operational Excellence** | feature flags, `track()` metric events, SLOs + alerts (designed), load tests, incident playbooks, CI perf/bundle gates |
| **Security** | deliberately excluded — out of scope for this slice |
