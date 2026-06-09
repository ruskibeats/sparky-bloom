# sparky-bloom

A self-hosted metabolic health companion. SparkyFitness bones, T1D AI enhancements, Bloom visual language.

## Structure

```
sparky-bloom/
├── prod/                  ← Working SparkyFitness upstream (git subtree, unmodified)
│   ├── README.md              What's in prod, how to run it
│   ├── UPSTREAM.md            How to sync with SparkyFitness
│   ├── docker-compose.yml → docker/docker-compose.prod.yml
│   ├── .env.example           Required env vars
│   ├── SparkyFitnessServer/   Express backend (Node.js/TypeScript)
│   ├── SparkyFitnessMobile/   Expo mobile app (React Native)
│   ├── SparkyFitnessFrontend/ Web dashboard (React/Vite)
│   ├── shared/                Zod schemas, constants, utils
│   └── docker/                Docker Compose files + nginx config
│
├── server/                ← Dev: SparkyFitnessServer + Bloom additions
├── mobile/                ← Dev: SparkyFitnessMobile + Bloom screens
├── shared/                ← Dev: shared schemas + Bloom pigment system
├── docker/                ← Dev Docker setup
├── issues/                ← PRD + issue tracking docs
├── issues/prd.md          ← Product Requirements Document
│
├── package.json           ← Root workspace (pnpm)
└── pnpm-workspace.yaml
```

## Running prod

```bash
cd prod
cp .env.example .env       # configure your DB and secrets
docker compose up -d       # starts PostgreSQL + server on port 3010
```

See `prod/README.md` for details.

## Building Bloom

The magic bit is the Bloom — a living watercolor metabolic self-portrait powered by predicted response (not logged inputs). See `issues/prd.md` for the full vision. See the GitHub issues for the implementation plan.

## Quick start (dev)

```bash
# Install dependencies
pnpm install

# Start the server (dev)
pnpm --filter sparky-bloom-server start

# Start the mobile app (dev)
pnpm --filter sparky-bloom-mobile start
```

## Filing bugs

- **Prod bugs** (upstream SparkyFitness): use the `Prod Bug` issue template, label `prod`
- **Bloom bugs** (our code): standard GitHub issue

## License

ISC (SparkyFitness upstream) + MIT (simple-calorie-tracker UI patterns).