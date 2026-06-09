# Operability Runbooks

## SLO Targets

| Signal | Target |
|--------|--------|
| Availability call p95 latency | ≤ 2000ms |
| User-visible error rate (post-fallback) | ≤ 0.1% |
| Cache hit ratio at steady state | ≥ 50% |

---

## Alert Config (CloudWatch / Datadog pseudoconfig)

```yaml
alerts:
  availability_error_rate:
    metric: availability_errors_total / availability_requests_total
    threshold: "> 0.01"   # 1% error rate
    window: 5m rolling
    action: page

  breaker_open:
    metric: availability_breaker_state == 'OPEN'
    threshold: "> 120s"   # open more than 2 minutes
    action: page
```

---

## Runbooks

| Runbook | Failure Mode |
|---------|-------------|
| [availability-slow.md](./availability-slow.md) | Availability upstream is slow — p95 latency SLO breached |
| [availability-down.md](./availability-down.md) | Availability upstream returning 5xx errors — breaker opens |
| [stale-prices-after-recovery.md](./stale-prices-after-recovery.md) | Upstream recovered but cache is still serving stale prices |
| [bad-deploy.md](./bad-deploy.md) | Bad deploy causing regressions in error rate or web vitals |
