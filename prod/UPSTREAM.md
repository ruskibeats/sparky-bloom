# Upstream: SparkyFitness

**Source:** https://github.com/CodeWithCJ/SparkyFitness
**License:** ISC
**Forked to:** `/tmp/sparkyfitness/` (local clone, `main` branch)

## Relationship

```
SparkyFitness (upstream GitHub)
        │
        ▼ cloned to
/tmp/sparkyfitness/  (local reference, git pull to update)
        │
        ├── SparkyFitnessServer ────────── prod/server/src → ../../dev/server/
        ├── SparkyFitnessMobile ────────── prod/mobile/src → ../../dev/mobile/
        ├── shared ────────────────────── prod/shared/src → ../../dev/shared/
        ├── docker/* ──────────────────── prod/docker/source
        └── db_schema_backup.sql ──────── prod/db_schema_backup.sql
```

## Upstream sync

To update the prod reference with latest upstream changes:

```bash
# Update the local clone
cd /tmp/sparkyfitness
git pull origin main

# Check what changed in server/
git diff --stat HEAD..origin/main -- SparkyFitnessServer/

# Check what changed in mobile/
git diff --stat HEAD..origin/main -- SparkyFitnessMobile/

# Check what changed in shared/
git diff --stat HEAD..origin/main -- shared/
```

## Dev divergence tracking

The dev code (`server/`, `mobile/`, `shared/`) was copied from SparkyFitness then modified for Bloom. Over time, it will diverge. When upstream fixes bugs, we may want to cherry-pick them.

Key divergence points:
- `shared/src/pigments/` — added for Bloom (doesn't exist upstream)
- `server/` — will gain Bloom routes and services
- `mobile/` — will gain Bloom screens and replace dashboard

## Files we keep synced with upstream

These should stay identical to upstream (no Bloom-specific changes):
- `server/db/migrations/*` — database schema
- `server/integrations/*` — health API clients
- `server/middleware/authMiddleware.ts` — auth
- `mobile/src/services/api/*` — API client
- `mobile/src/services/healthkit/*` — Apple Health
- `mobile/src/services/healthconnect/*` — Google Health

## Files we MUST NOT sync (diverged)

- `shared/src/pigments/` — we own this
- Bloom-specific additions not yet created