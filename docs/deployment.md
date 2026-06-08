# Deployment, Versioning & Rollback

> Hosting: **Vercel** (preview / staging / production). Short and concise.

---

## Environments & Pipeline

```
PR opened ───────────────→ Preview (E2E)   per-PR URL, Playwright runs here
   │ merge to master
   ▼
master ──────────────────→ Staging         auto-deploy, every merge
   │ manual trigger (pick a version)
   ▼
production ──────────────→ Production       promote a specific build, never auto
```

| Env           | Trigger                                | Purpose                                                   |
| ------------- | -------------------------------------- | --------------------------------------------------------- |
| Preview (E2E) | open/update PR                         | isolated URL; CI runs unit + integration + Playwright E2E |
| Staging       | merge to `master`                      | integrated QA on production-like build                    |
| Production    | **manual** promote of a chosen version | release control                                           |

Gate: a PR can't merge unless CI (lint, types, 85% coverage, E2E) is green.

---

## Versioning

- **SemVer** `MAJOR.MINOR.PATCH`; every merge to `master` tags `vX.Y.Z` (git tag).
- The tag = the immutable Vercel build that staging deployed.
- Production promotes a **specific tag/build**, so prod is always a known version.
- Surface the version (env var → footer/health route) to confirm what's live.

```
PR ─→ preview build (sha)   master ─→ staging build = vX.Y.Z   prod ─→ promote vX.Y.Z
```

---

## Rollback

Vercel keeps every build immutable, so rollback = **promote the previous good
version** (no rebuild).

```
prod incident
   │  promote previous tag (vX.Y.Z-1) in Vercel  ← instant, deterministic
   ▼
prod restored → investigate failed build → fix-forward via normal pipeline
```

- **Production:** instant promote of last-known-good tag.
- **Staging:** auto-heals on the next green merge; or promote a prior build.
- **DB/contract changes (future):** ship backward-compatible first so a code
  rollback never strands data.
- Post-rollback: tag the bad version, capture incident, fix forward.

---

## Targets (tie-in)

- MTTD 5 min → alerting on errors/Web Vitals triggers the call.
- MTTR 20 min → instant Vercel promote keeps recovery well inside budget.
