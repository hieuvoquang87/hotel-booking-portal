# Runbook: Availability Upstream Slow

**Failure mode:** Availability upstream is slow — p95 latency SLO breached (> 2000ms)

---

## Detection

- p95 `availability_latency.durationMs` exceeds 2000ms in logs/metrics
- Rising `availability_cache_miss` rate (more requests hitting slow upstream)
- Alert: `availability_error_rate` or latency dashboard spikes

---

## Diagnosis

1. **Is the breaker still CLOSED?**
   - If CLOSED, latency is real upstream delay — breaker has not yet triggered
   - Look for `availability_breaker_transition` log events; absence means breaker is still CLOSED

2. **Compare timeout config vs actual latency:**
   ```bash
   # Check configured timeout
   echo $AVAILABILITY_TIMEOUT_MS   # default: 5000
   # Grep for recent latency values
   grep 'availability_latency' <logs> | jq '.durationMs' | sort -n | tail -20
   ```

3. **Check cache miss rate:**
   - High `availability_cache_miss` count means stale cache is not absorbing the load
   - Check `CACHE_TTL_MS` — if short, cache is expiring fast and hitting upstream frequently

---

## Mitigation

- **Widen cache TTL** to serve more stale data and reduce upstream pressure:
  ```bash
  # Increase cache TTL (e.g. 5 minutes)
  CACHE_TTL_MS=300000  # restart or set via env
  ```
- The circuit breaker will eventually open if errors accumulate, switching to fast-fail + last-known prices — this bounds blast radius automatically
- No manual breaker intervention needed; let the breaker trip naturally

---

## Recovery / Rollback

- When upstream latency normalises, the breaker (if it opened) half-opens after `BREAKER_COOLDOWN_MS` and probes with a single request
- Successful probe → breaker closes automatically; normal cache fill resumes
- Restore cache TTL to normal once fresh data is propagating:
  ```bash
  CACHE_TTL_MS=60000   # restore to default
  ```
- Confirm recovery: `availability_breaker_transition CLOSED` event in logs + p95 latency back below 2000ms
