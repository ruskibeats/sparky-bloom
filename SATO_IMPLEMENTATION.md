# Sato Implementation Documentation

## Overview

Sato is an emotional presentation layer for the T1D companion system. It transforms raw nutritional and glucose data into emotionally resonant narratives that feel human and approachable.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Sato Layer (Default View)                             │
│                                                          │
│  Route → satoCompanionIntentWrapper                    │
│           ↓                                             │
│       satoCompanionCardsWrapper                         │
│           ↓ (filters to essential cards)               │
│       companionCardsFromData (existing Layer 2)         │
│           ↓                                             │
│       getCompanionDataContext (existing Layer 1)       │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  Nerd Stats Layer (Power User View)                    │
│                                                          │
│  Route → nerdStatsRoutes                               │
│           ↓                                             │
│       companionCardsFromData (existing Layer 2)         │
│           ↓                                             │
│       getCompanionDataContext (existing Layer 1)       │
└─────────────────────────────────────────────────────────┘
```

## File Structure

```
sparky-bloom/server/
├── types/
│   └── sato.ts                          # All Sato types
├── utils/
│   ├── emotionalScoreMapper.ts          # Emotional intensity calculation
│   ├── moodBadgeMapper.ts               # Mood badge mapping & templates
│   └── satoFilters.ts                   # Essential card filtering
├── services/
│   └── satoNarratorService.ts           # LLM narrative generation
├── db/
│   └── queryWrappers/
│       ├── satoCompanionIntentWrapper.ts   # Emotional greeting generation
│       ├── satoCompanionCardsWrapper.ts    # Card emotional enrichment
│       └── cardPayloadParser.ts           # Raw card parsing
└── routes/
    ├── t1dSatoRoutes.ts                  # Sato API endpoints
    └── t1dNerdStatsRoutes.ts             # Nerd Stats API endpoints
```

## Key Types

### EmotionalGreetingResponse
```typescript
{
  emotion: 'calm' | 'curied' | 'excited' | 'surprised';
  mood_badge: 'green' | 'amber' | 'orange' | 'red';
  narrative: string;
  questionOrOffer?: string;
  voice: 'warm' | 'practical' | 'calm' | 'analytical';
  raw: RawCompanionContext;  // For debugging
}
```

### SatoCardsResponse
```typescript
{
  emotion: 'calm' | 'curied' | 'excited' | 'surprised';
  moodBadge: 'green' | 'amber' | 'orange' | 'red';
  narrative: string;
  questionOrOffer?: string;
  voice: 'warm' | 'practical' | 'calm' | 'analytical';
  cards: EmotionalCard[];  // Emotionally enriched cards
}
```

## API Endpoints

### Sato Endpoints (Default View)

```
GET  /api/t1d/sato/greeting          # Emotional greeting
POST /api/t1d/sato/cards             # Sato-enriched cards
GET  /api/t1d/sato/atlas/memory      # Sato-augmented atlas
POST /api/t1d/sato/atlas/explorer    # Interactive atlas
```

### Nerd Stats Endpoints (Power User View)

```
POST /api/t1d/nerd-stats/cards       # All raw cards
GET  /api/t1d/nerd-stats/charts      # 14-day trend charts
GET  /api/t1d/nerd-stats/graphs      # CGM graphs
```

## Emotional Intensity Calculation

The emotional score is calculated from nutritional data:

```
Emotional Score = (carbs * 1.5 + protein * 1.0 + fat * 0.5) * 0.7
                  + (trend_carbs * 1.5 + trend_protein * 1.0 + trend_fat * 0.5) * 0.3
```

**Thresholds:**
- `< 30`: calm (green)
- `30 - 70`: curious (amber)
- `70 - 150`: excited (orange)
- `>= 150`: surprised (red)

## Mood Badge Mapping

Different card types map to mood badges:

| Card Type | Mood Logic |
|-----------|-----------|
| **Forecast** | Delta (peak - baseline) → mood badges |
| **Meal Memory** | Historical avg peak rise → mood badges |
| **Food Evidence** | Confidence tier → intensity → mood badges |
| **Confidence** | Weighted confidence + consistency → mood badges |
| **Pattern Genome** | Average trait confidence → mood badges |

## Narrative Generation

### Template System (95% of cases)
- Uses pre-written templates with variable substitution
- Examples: SIMPLE_MATCH_TEMPLATE, MULTIPLE_FOODS_TEMPLATE, VAGUE_MATCH_TEMPLATE
- Fast (<50ms), deterministic, no hallucinations

### LLM Fallback (5% of complex cases)
- Uses `satoNarratorService` for complex scenarios
- Complexity threshold: 0.7 (higher complexity = LLM fallback)
- Slower but more nuanced for complex pattern analysis

## Data Flow

### Step 1: Raw Context Query
```typescript
const rawContext = await getCompanionDataContext(userId);
// Returns: 5 tables, 10+ columns
// t1d_profiles, food_entries (x2), t1d_cgm_entries, t1d_meal_reviews, t1d_vector_documents
```

### Step 2: Emotional Intensity Calculation
```typescript
const intensity = calculateEmotionalIntensity(latestDaily, trend14Day);
// Returns: score (0-1000)
```

### Step 3: Mood Mapping
```typescript
const mood = mapEmotionalIntensityToMood(intensity);
const moodBadge = mapMoodToBadge(mood);
// Returns: 'calm' → 'green', 'curied' → 'amber', etc.
```

### Step 4: Narrative Generation
```typescript
const greeting = await getSatoGreeting(userId, text);
// Returns: EmotionalGreetingResponse with narrative, emotion, voice
```

### Step 5: Card Transformation
```typescript
const satoCards = await getSatoCards(intent, text, rawContext, rawCards, greeting);
// Returns: SatoCardsResponse with emotionally enriched cards
```

## Filters

### Essential Cards (Sato View)
Only these cards are shown in Sato view:
- ✅ parsedFoods
- ✅ foodEvidence
- ✅ forecast
- ✅ mealMemory

### Technical Cards (Hidden in Sato)
These are hidden in Sato view:
- ❌ whatIfScenarios
- ❌ monitoring
- ❌ confidence
- ❌ patternGenome

**Nerd Stats Toggle:**
- User can click "🔬 Show Nerd Stats" to see all cards
- Shows full technical details, charts, graphs, metrics

## Mounting Routes

### In SparkyFitnessServer.ts

```typescript
// sparky-bloom/server/SparkyFitnessServer.ts

import t1dCompanionRoutes from './routes/t1dCompanionRoutes';
import t1dSatoRoutes from './routes/t1dSatoRoutes';
import t1dNerdStatsRoutes from './routes/t1dNerdStatsRoutes';

// EXISTING: Original companion endpoints (unchanged)
server.use('/api/t1d/companion', t1dCompanionRoutes);

// NEW: Sato-aware endpoints (parallel)
server.use('/api/t1d/sato', t1dSatoRoutes);

// NEW: Nerd Stats endpoints (parallel)
server.use('/api/t1d/nerd-stats', t1dNerdStatsRoutes);
```

## Testing

### Manual Testing

1. **Test Greeting Endpoint:**
```bash
curl -X GET http://localhost:3000/api/t1d/sato/greeting \
  -H "Cookie: sparky_active_user_id=your_user_id"
```

2. **Test Cards Endpoint:**
```bash
curl -X POST http://localhost:3000/api/t1d/sato/cards \
  -H "Cookie: sparky_active_user_id=your_user_id" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "meal",
    "text": "I had pizza and salad"
  }'
```

### Integration Testing

Once the Docker indexing is complete:

1. **Commit code changes:**
```bash
git add sparky-bloom/server/
git commit -m "feat: add Sato emotional greeting layer"
```

2. **Deploy to dev:**
```bash
# After indexing completes
docker-compose up -d --build
```

3. **Verify routes mount:**
```bash
curl http://localhost:3000/api/t1d/sato/greeting
```

4. **Verify server health:**
```bash
curl http://localhost:3000/health
```

## Future Enhancements

### Phase 2: Nerd Stats Toggle
- Implement toggle logic in frontend
- Wire up nerd stats API endpoints
- Add charts (14-day trend, CGM)
- Add technical metrics

### Phase 3: Sato History
- Meal history view
- Weekly insights
- Emotional trend analysis

### Phase 4: Advanced Features
- Sato alerts based on mood patterns
- Personalized recommendations by mood
- Sato challenge system (gamification)

## Migration Path

1. **Parallel Deployment** (Weeks 1-2)
   - Deploy new `/api/t1d/sato/*` endpoints
   - Keep existing `/api/t1d/companion/*` endpoints
   - No breaking changes

2. **Frontend Update** (Weeks 3-6)
   - Mobile app updates to consume Sato endpoints
   - No need in V1.1 scope

3. **Deprecation** (Months 3-6)
   - Monitor usage patterns
   - Deprecate standard endpoints
   - Update API documentation

## Notes

- **No database changes required** — Sato wraps existing queries
- **No breaking changes** — Existing endpoints remain functional
- **Incremental rollout** — Gradual migration possible
- **Future-proof** — Easy to deprecate old endpoints later

## Troubleshooting

### "No recent meal data found"
- Check if user has logged any meals
- Verify `getCompanionDataContext` is working
- Check database connectivity

### "DiskFullError" during indexing
- Verify `/dev/shm` has enough space (at least 8GB)
- Check `maintenance_work_mem` setting

### "Failed to generate Sato greeting"
- Check `satoNarratorService` is working
- Verify `companion_system.txt` prompt exists
- Check error logs for details

## Contact

For questions about Sato implementation:
- Open an issue in the repository
- Reference this documentation file
- Tag @commander for clarifications