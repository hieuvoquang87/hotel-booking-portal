# Test results

Latest verified results for the suites that gate this project. Summary lives in the [root README](../../README.md#test-results); this is the full breakdown.

## Lighthouse (desktop, no throttling)

Latest run against `/?country=usa&page=1` ([report](lighthouse-report.html)):

| Category       | Score  |
| -------------- | ------ |
| Performance    | 🟢 100 |
| Accessibility  | 🟢 100 |
| Best Practices | 🟢 100 |
| SEO            | 🟢 100 |

Key metrics: **FCP 0.2s** · **LCP 0.7s** · **TBT 0ms** · **CLS 0.011** · **SI 0.3s** · **TTI 0.7s**.

> Re-run with `npx lighthouse http://localhost:3000/?country=usa\&page=1 --preset=desktop --view`.
> For mobile-emulation (80% traffic target), use `--preset=perf` (4× CPU throttle, slow 4G).

## Jest

```
Tests:  361 passed, 361 total
Suites: 77 passed,  77 total
```

## Playwright (E2E)

Single `chromium` project (Desktop Chrome), run fully parallel. The three specs cover the core flow's terminal states — success, no-results, and no-rooms:

```
Running 3 tests using 3 workers
  ✓  primary-flow.spec.ts  destination → filter → sort → detail → availability success   (2.2s)
  ✓  no-results.spec.ts    filters that match no hotels show empty state with reset action   (756ms)
  ✓  no-rooms.spec.ts      hotel with no availability shows no-rooms empty state   (2.3s)

3 passed (3.1s)
```

> Run with `npm run test:e2e`. Useful flags: `--headed` (watch the browser), `--ui` (time-travel UI mode), `--debug` (step through), or append a path to run one spec — e.g. `npm run test:e2e -- e2e/primary-flow.spec.ts`.
> CI runs the same suite against a production build (`npm run build && npm run start`) with 2 retries and uploads the HTML report as the `playwright-report` artifact.

## Load & stress — planned (staging / production)

Deferred in Phase 1 — load-testing the in-memory mock measures the mock, not real capacity. Runs on **staging** then production ([pipeline](../deployment.md)): `k6`/`Gatling`/`Artillery` against `/api/*`, asserting the [perf budget](../../README.md#quality-bar--non-functional-budgets) (**p95/p99 · throughput · error rate**) holds under concurrency, with focus on the availability dependency's circuit-breaker/stale-cache fallback.
