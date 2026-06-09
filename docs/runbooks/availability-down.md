# Runbook: Availability Upstream Down

**Failure mode:** Availability upstream returning 5xx errors — breaker opens, stale cache serves prices

---

## Detection

- Error rate SLO breach: user-visible errors > 0.1% (post-fallback)
- `availability_breaker_transition` log events showing state → `OPEN`
- All `availability_cache_miss` calls failing (no new prices from upstream)
- Alert: `breaker_open` fires when breaker stays OPEN > 2 minutes

---

## Diagnosis

1. **Confirm breaker is OPEN:**
   ```bash
   grep 'availability_breaker_transition' <logs> | tail -5
   # Expected: { state: "OPEN", ... }
   ```

2. **Confirm stale cache is serving:**
   ```bash
   grep 'availability_latency' <logs> | jq 'select(.cacheHit == true)' | wc -l
   # Should be high — cache hits absorbing requests
   ```
   - Users should see last-known prices, not hard errors
   - If cache is empty (cold start), users may see no prices — that is the expected degraded state

3. **Identify upstream cause:**
   - Check upstream service health dashboard / status page
   - Look for correlated deploy or incident in upstream system

---

## Mitigation

- **No immediate action required if breaker is OPEN and stale cache is serving** — this is the designed degraded state
- Verify users are not seeing hard error states (they should see last-known prices or loading placeholders)
- If outage is prolonged (> 30 min), consider displaying a "pricing temporarily unavailable" banner to set user expectations:
  - Set `NEXT_PUBLIC_AVAILABILITY_DEGRADED_BANNER=true` (if implemented) or deploy a hotfix banner

---

## Recovery / Rollback

1. When upstream recovers, disable fault injection or confirm upstream fix is deployed
2. Breaker half-opens automatically after `BREAKER_COOLDOWN_MS` (default cooldown period)
3. A single probe request is sent; if it succeeds, breaker closes
4. Monitor for `availability_breaker_transition CLOSED` log event
5. Confirm cache is filling with fresh data: `availability_latency.cacheHit` ratio should decrease as new entries are written
6. Remove degraded-state banner if one was added
