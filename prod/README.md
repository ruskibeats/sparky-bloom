# prod/ — SparkyFitness (upstream, unmodified)

**The boring bits — steal them as-is.**

This is the working SparkyFitness monorepo, added as a git subtree from https://github.com/CodeWithCJ/SparkyFitness.

## What this is

A fully runnable, unmodified copy of the SparkyFitness codebase. Use this to:
- Run the production backend and mobile app locally
- Understand how the stolen features work before building Bloom on top of them
- File bugs against the upstream code
- Pull upstream fixes via `git subtree pull`

## Quick start

```bash
# From sparky-bloom root
cd prod

# Start the full stack (PostgreSQL + backend)
docker compose -f docker/docker-compose.prod.yml up -d
```

The server starts on port 3010. See `docker/docker-compose.prod.yml` for config.

## Structure (upstream)

```
prod/
├── SparkyFitnessServer/     ← Express backend (Node.js/TypeScript)
│   ├── routes/              60+ route files
│   ├── services/            55+ business logic services
│   ├── models/              data access layer
│   ├── integrations/        15+ health API clients
│   ├── db/                  connection pool, migrations
│   └── SparkyFitnessServer.ts  entry point (692 lines)
│
├── SparkyFitnessMobile/     ← Expo mobile app (React Native)
│   ├── src/screens/         48 screens
│   ├── src/services/        API client, health kit, sync
│   └── App.tsx              entry point (1064 lines)
│
├── SparkyFitnessFrontend/   ← Web dashboard (React/Vite)
├── shared/                  ← Zod schemas, constants, utils
├── docker/                  ← Docker Compose + Dockerfiles
├── db_schema_backup.sql     ← Full PostgreSQL schema (7,466 lines)
└── helm/                    ← Kubernetes deployment
```

## Upstream sync

```bash
# Pull the latest SparkyFitness changes into prod/
git subtree pull --prefix=prod /tmp/sparkyfitness main --squash
```

## Filing bugs

Found a bug in the stolen bits? Raise a GitHub issue with the `prod` label. Template at `.github/ISSUE_TEMPLATE/prod-bug.yml`.

## What we stole (don't rewrite)

- User auth (better-auth: OIDC, TOTP, Passkey, MFA)
- Food CRUD + diary entries + barcode scanning + search
- Exercise / sleep / fasting / water / mood tracking
- 15 health integrations (Fitbit, Garmin, Withings, Apple Health, etc.)
- Family access controls
- PostgreSQL schema with Row-Level Security
- AI chat (SparkyAI)
- Docker Compose deployment