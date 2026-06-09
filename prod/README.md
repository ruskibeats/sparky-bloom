# sparky-bloom / prod

**The working upstream — what we stole.**

This directory documents the running production setup that sparky-bloom is built on. It is NOT the dev code. Dev code lives in `../../server/`, `../../mobile/`, `../../shared/`.

## What's running on this server

| Service | Status | Where | Port |
|---------|--------|-------|------|
| SparkyFitness backend | Code at `/tmp/sparkyfitness/SparkyFitnessServer/` | Not currently running | 3010 |
| T1D Companion backend | Code at `/root/t1d/app/` | Not currently running | 8000 |
| Nightscout | Running (Docker) | `t1d-nightscout` | 4000 |
| LibreLink Up bridge | Running (Docker) | `t1d-libre-bridge` | — |
| MongoDB | Running (Docker) | `t1d-ns-mongo` | 27017 |
| Nginx frontend | Running (Docker) | `t1d-frontend` | 3000 |

## What we stole and where it lives in prod

Each stolen module maps to one reference directory here:

| Stolen Module | prod/ Reference | Upstream Source | How to Run |
|---------------|-----------------|----------------|------------|
| Server (Express) | `prod/server/` | `/tmp/sparkyfitness/SparkyFitnessServer/` | `cd prod/server && pnpm install && pnpm start` |
| Mobile App (Expo) | `prod/mobile/` | `/tmp/sparkyfitness/SparkyFitnessMobile/` | `cd prod/mobile && pnpm install && pnpm start` |
| Shared schemas | `prod/shared/` | `/tmp/sparkyfitness/shared/` | Referenced by server + mobile |
| Docker setup | `prod/docker/` | `/tmp/sparkyfitness/docker/` | `docker compose -f prod/docker/docker-compose.prod.yml up` |
| DB schema | `prod/db_schema_backup.sql` | `/tmp/sparkyfitness/db_schema_backup.sql` | Reference only (7,466 lines) |
| DB migrations | `prod/server/db/migrations/` | (copied) | Run automatically on server start |

## How this prod folder works

This is a **symlink reference** to the actual working codebase at `/tmp/sparkyfitness/`. Files here point to the real locations. If you need to modify the upstream (fix a bug in the boring bits), make the change in the actual source, not in this reference directory.

## The boring bits you can steal without writing code

- [x] User auth (better-auth: OIDC, TOTP, Passkey, MFA, API keys)
- [x] Food CRUD (create, read, update, delete foods)
- [x] Food diary entries (log what you ate, when, how much)
- [x] Barcode scanning (OpenFoodFacts + USDA integration)
- [x] Food search (name, barcode, branded vs generic tabs)
- [x] Meal types (breakfast, lunch, dinner, snacks with custom percentages)
- [x] Meal plans and templates
- [x] Exercise logging (entries, presets, templates, libraries)
- [x] Sleep logging (entries, stages, analytics)
- [x] Fasting tracking
- [x] Water intake tracking
- [x] Mood logging
- [x] Body measurements (weight, body fat, circumference)
- [x] Goal setting (calories, macros, custom nutrients)
- [x] Health integrations (Fitbit, Garmin, Withings, Polar, Strava, Hevy, Apple Health, Google Health Connect)
- [x] AI chat (SparkyAI - conversational food logging)
- [x] Family access (shared diary, permissions)
- [x] PostgreSQL with Row-Level Security
- [x] Docker Compose (PostgreSQL + app + nginx)

## Running the prod server locally

```bash
# From sparky-bloom root
cd prod/server
pnpm install
cp .env.example .env   # configure your DB
pnpm start             # starts on port 3010
```

## Architecture reference

```
prod/server/SparkyFitnessServer.ts (692 lines)
  └── middleware/        (auth, CORS, error handling, upload)
  └── routes/            (60+ route files, one per domain)
  │     └── v2/          (newer API versions)
  └── services/          (55+ business logic services)
  └── models/            (data access / repository pattern)
  └── integrations/      (15+ external health API clients)
  └── db/                (connection pool, migrations)
  └── config/            (logging, swagger)
  └── security/          (encryption)
  └── utils/             (date helpers, cors, food utils, secrets)
```

## Filing production bugs

Found a bug in the stolen bits? Raise it here: use the "prod bug" issue template below.