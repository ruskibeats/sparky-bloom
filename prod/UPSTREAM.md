# Upstream: SparkyFitness

**Source:** https://github.com/CodeWithCJ/SparkyFitness  
**License:** ISC  
**Local clone:** `/tmp/sparkyfitness/`  
**Subtree in this repo:** `prod/`

## Relationship

`prod/` is a [git subtree](https://www.atlassian.com/git/tutorials/git-subtree) of the SparkyFitness monorepo.
This means `prod/` is fully contained in the sparky-bloom repo — no submodule dependencies, no external clones needed to build.

```mermaid
graph TD
    GH[github.com/CodeWithCJ/SparkyFitness] -->|git clone| LOCAL[/tmp/sparkyfitness]
    LOCAL -->|git subtree add| PROD[sparky-bloom/prod]
    PROD -->|git subtree pull| LOCAL
```

## Upstream sync

```bash
# From sparky-bloom root
git subtree pull --prefix=prod /tmp/sparkyfitness main --squash
```

Before pulling, update the local clone:
```bash
cd /tmp/sparkyfitness
git pull origin main
```

## What we keep synced

These parts of the upstream should stay identical in our dev copy:
- `SparkyFitnessServer/db/migrations/` — database schema changes
- `SparkyFitnessServer/routes/` — API endpoints
- `SparkyFitnessServer/services/food*` — food business logic
- `shared/` — Zod schemas and constants

## What we diverge on

The dev copies (`server/`, `mobile/`, `shared/` at root) are our Bloom-modified versions.
- `shared/src/pigments/` — doesn't exist upstream, we own it
- `server/routes/v2/bloomRoutes.ts` — will be added
- `mobile/src/screens/BloomScreen.tsx` — will be added

## Prod bug workflow

1. Developer finds a bug in the running prod server
2. Opens a GitHub issue with the `prod` label using the template
3. If the bug is in SparkyFitness upstream, we fix it there and pull
4. If the bug is in our dev code, we fix it in dev

## Merge conflicts

Because `prod/` is a subtree, we can't have uncommitted changes when pulling.
Always commit or stash before `git subtree pull`.