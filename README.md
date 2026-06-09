# sparky-bloom

A self-hosted metabolic health companion. SparkyFitness bones, T1D AI enhancements, Bloom visual language.

## Structure

```
sparky-bloom/
├── prod/          ← Working upstream reference (SparkyFitness as-is)
│   ├── README.md      — what's running, how to start it
│   ├── UPSTREAM.md    — how to sync with SparkyFitness
│   ├── docker-compose.yml
│   ├── .github/ISSUE_TEMPLATE/ — prod bug report template
│   ├── server/ → /tmp/sparkyfitness/SparkyFitnessServer
│   ├── mobile/ → /tmp/sparkyfitness/SparkyFitnessMobile
│   └── shared/  → /tmp/sparkyfitness/shared
│
├── server/        ← Dev: SparkyFitnessServer + Bloom additions
├── mobile/        ← Dev: SparkyFitnessMobile + Bloom screens
├── shared/        ← Dev: shared schemas + Bloom pigment system
├── docker/        ← Dev Docker setup
├── issues/        ← PRD + issue tracking docs
├── issues/prd.md  ← Product Requirements Document
│
├── package.json   ← Root workspace
└── pnpm-workspace.yaml
```

## Working with prod

The `prod/` folder is the reference — the working, unmodified SparkyFitness codebase. Use it to:
- Check how a feature works in the upstream before building it
- File bugs against the stolen bits
- Sync upstream fixes

See `prod/README.md` for details.

## Building Bloom

The magic bit is the Bloom — a living watercolor metabolic self-portrait powered by predicted response (not logged inputs). See `issues/prd.md` for the full vision.

## Quick start (dev)

```bash
# Install dependencies
pnpm install

# Start the server (dev)
pnpm --filter sparky-bloom-server start

# Start the mobile app (dev)
pnpm --filter sparky-bloom-mobile start
```

## License

ISC (SparkyFitness upstream) + MIT (simple-calorie-tracker UI patterns) — see LICENSE.