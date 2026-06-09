# Runbook: Stale Prices After Recovery

**Failure mode:** Upstream has recovered but cache is still serving stale prices

---

## Detection

- Breaker is CLOSED (confirmed via `availability_breaker_transition CLOSED` log event)
- But `availability_latency.cacheHit` ratio remains high — upstream is not being called despite recovery
- Users report prices that appear outdated

---

## Diagnosis

1. **Confirm breaker state is CLOSED:**
   ```bash
   grep 'availability_breaker_transition' <logs> | tail -3
   # Expected: state: "CLOSED"
   ```

2. **Check cache TTL configuration:**
   ```bash
   echo $CACHE_TTL_MS   # default: 60000 (1 minute)
   ```
   - A long TTL means existing entries are still valid and won't be refreshed until they expire

3. **Inspect cache entry age vs current time:**
   - Compare log timestamps of last `availability_latency.cacheHit=false` writes vs now
   - If the gap is less than `CACHE_TTL_MS`, entries are still considered fresh — this is expected behaviour, not a bug

---

## Mitigation

- **Shorten cache TTL** to force expiry of stale entries sooner:
  ```bash
  # Set a short TTL (e.g. 5 seconds) and restart
  CACHE_TTL_MS=5000
  ```
- On next cache miss, fresh data will be fetched from the (now-recovered) upstream and written to cache
- New requests will progressively get fresh prices as entries expire and refill

---

## Recovery / Rollback

1. Monitor `availability_latency.cacheHit` ratio — it should decrease as entries expire and fresh data fills in
2. Once fresh data has propagated (ratio stabilises at steady-state ≥ 50%), restore normal TTL:
   ```bash
   CACHE_TTL_MS=60000   # restore to default
   ```
3. Restart/redeploy to apply the restored value
4. Confirm users are seeing current prices
