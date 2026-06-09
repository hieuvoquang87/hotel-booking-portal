# Runbook: Bad Deploy

**Failure mode:** A deploy introduces a regression in error rate, web vitals, or bundle size

---

## Detection

- **Pre-merge (primary prevention):** CI perf/bundle gate fails; coverage gate fails; PR is blocked
- **Post-merge signals:**
  - Rising error rate in production (user-visible errors breach 0.1% SLO)
  - Web-vitals alert (LCP, CLS, FID regressions)
  - Lighthouse score drop
  - Bundle size increase beyond gate threshold

---

## Diagnosis

1. **Identify the regression commit:**
   ```bash
   git log --oneline -5
   ```
   - Correlate timing of alert onset with deploy timestamps in Vercel / CI dashboard

2. **Confirm it's deploy-correlated:**
   - Did the alert start immediately after a specific deployment?
   - Check Vercel deployment history for the matching timestamp

3. **Narrow the cause:**
   - If bundle size: check CI artifact diff — which chunk grew?
   - If error rate: check server logs for new exception types or stack traces introduced post-deploy
   - If web vitals: check if a new client component or image was added without optimisation

---

## Mitigation

- **Roll back immediately** to the previous known-good deployment:
  - **Vercel:** Go to Deployments → find previous deployment → "Promote to Production"
  - Rollback is instantaneous and does not require a code change

- The CI bundle gate and coverage gate prevent most regressions from ever merging — if this runbook is triggered, the gate was either not yet configured for that signal or was bypassed

---

## Recovery / Rollback

1. After rollback, confirm error rate / web vitals return to baseline
2. Fix the regression in a new branch with a PR
3. Ensure the CI gate that should have caught this is active and passing before re-merging
4. Do not re-deploy the reverted commit without the fix applied
