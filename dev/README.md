# Development Environment

## Start Dev Stack
```bash
pnpm up:dev
```

## Structure
- `scripts/` - Development helper scripts
- `fixtures/` - Test data and mock files

## Notes
- Dev server runs on port 3010 with hot reload
- Frontend runs on port 3005 (proxy to dev server)
- Database persisted in `data/dev/postgres`