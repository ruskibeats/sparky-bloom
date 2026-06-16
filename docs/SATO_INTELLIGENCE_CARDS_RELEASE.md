# Sato Intelligence Cards Release Notes

## Version: sato-intelligence-cards-foundation-v1

## Summary
Implemented Sato Intelligence Cards foundation with ranked feed, demo mode, and interaction tracking. All cards fail-closed when no real data exists.

## Issues Completed
- **#110**: Real-data Sato Cards feed (fail-closed)
- **#111**: Demo mode vs product validation mode enforcement
- **#112**: Card interaction lifecycle tracking
- **#122**: Ranked Sato feed with expiry and suppression

## Files Changed
### Services (Canonical Contract Source)
- `server/services/satoIntelligenceCardsService.ts` - Core card types, generators, rankings
- `server/services/cardInteractionService.ts` - Interaction persistence (NEW)
- `server/services/satoAdvancedCardGenerators.ts` - Advanced card generators

### Routes
- `server/routes/t1dSatoRoutes.ts` - Intelligence cards endpoints

### Types
- `server/types/sato.ts` - Re-exports for consumer convenience

### Database
- `server/db/migrations/20260616000000_create_t1d_card_interactions.sql` (NEW)

### Tests
- `server/tests/satoIntelligenceCardsService.test.ts` - 23 tests passing
- `server/tests/cardInteraction.test.ts` - Interaction tests

## API Endpoints
```
POST /api/t1d/sato/intelligence/cards
  - Body: { demoMode?: boolean }
  - Returns: { cards: SatoIntelligenceCard[], suppressed: CardRenderDecision[], generatedAt: string }

POST /api/t1d/sato/intelligence/interactions
  - Body: { cardId: string, action: CardInteractionAction, payload?: Record }
  - Persists interaction events

GET /api/t1d/sato/intelligence/dismissed
  - Returns: { dismissedCardIds: string[] }
```

## Configuration
- `SATO_DEMO_MODE=true` - Enables demo cards in development
- Default: Product validation mode (no demo cards)

## Card Types
pattern_insight, safe_meal, weekly_digest, insulin_stock, what_if, pattern_drift, experiment, doctor_prep, restaurant

## Suppression Reasons
INSUFFICIENT_DATA, LOW_CONFIDENCE, NO_GRAPH_MATCH, STALE_DATA, MISSING_EVIDENCE, SAFETY_SUPPRESSED, USER_DISMISSED, MISSING_DATA

## Rollback Steps
1. Revert commit containing Sato Intelligence Cards changes
2. Drop migration: `DROP TABLE IF EXISTS t1d_card_interactions CASCADE;`
3. Remove routes from SparkyFitnessServer.ts if needed
4. Revert types/sato.ts changes

## Smoke Test Checklist
- [ ] GET /api/t1d/sato/intelligence/cards returns { cards: [], suppressed: [], generatedAt: string } on no data
- [ ] POST /api/t1d/sato/intelligence/interactions persists dismissed actions
- [ ] Dismissed cards suppressed in subsequent feed loads
- [ ] Demo cards render with [DEMO] marker when SATO_DEMO_MODE=true
- [ ] Feed limited to max 7 cards
- [ ] All 28 tests pass