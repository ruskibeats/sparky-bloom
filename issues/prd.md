# PRD: Sparky Bloom — Metabolic Health Companion

## Problem Statement

Self-hosted fitness apps like SparkyFitness provide comprehensive food, exercise, and health tracking, but their visual language is utilitarian — progress bars, numbers, and charts. Users don't *feel* their metabolic state; they read it.

Existing calorie trackers (MyFitnessPal, Yazio, Cronometer) treat food as fuel arithmetic: calories in, macros tracked, goals met. They strip away the embodied experience of eating — the delayed rise of a fatty meal, the steadying effect of protein, the quick spike of sugar.

Meanwhile, the T1D Companion project proved that meal impact *forecasting* and *pattern detection* are technically feasible, but it remained a Python CLI tool — no mobile UX.

What's missing is a unified product that:

- Tracks food, exercise, sleep, and health data (SparkyFitness backbone)
- Visualizes that data not as sterile charts but as a living watercolor portrait of your metabolic state (Bloom)
- Predicts how meals will affect you and surfaces patterns you'd never notice (T1D AI)
- Feels personal and beautiful, not clinical

## Solution

**Sparky Bloom** — a self-hosted metabolic health companion that replaces progress bars with watercolor pigment washes, replaces daily totals with a Bloom portrait, and adds meal-impact intelligence to the SparkyFitness foundation.

The system is composed of four integrated layers:

| Layer | Source | Role |
|-------|--------|------|
| **Bones** | SparkyFitnessServer (Node.js/Express/PostgreSQL) | User auth, food CRUD, diary entries, exercise, sleep, health integrations |
| **Skin** | SparkyFitnessMobile + Simple Calorie Tracker (Expo/RN) | Mobile app shell, diary UI patterns, barcode scanning, macro progress |
| **Mind** | T1D Companion (Python/FastAPI, deployed as sidecar) | Meal impact forecasting, pattern detection, conversational AI |
| **Soul** | Sato Bloom (Skia pigment system + BloomClock) | Metabolic watercolor visualization, identity bloom, memory marks |

### Architecture overview

```
┌──────────────────────────────────────────────────────┐
│                   Mobile App (Expo 55)               │
│ ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌────────┐ │
│ │  Bloom   │ │  Diary   │ │  Search    │ │Profile │ │
│ │Dashboard │ │  Screen  │ │  + Scan    │ │Settings│ │
│ └────┬─────┘ └────┬─────┘ └──────┬─────┘ └───┬────┘ │
│      └────────────┴──────────────┴────────────┘      │
│                      │ HTTP/JSON                      │
└──────────────────────┼────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
┌─────────────────┐ ┌──────────────────┐
│ SparkyFitness   │ │ T1D AI Sidecar   │
│ Server (Node)   │ │ (Python/FastAPI) │
│                 │ │                  │
│ Food/Exercise/  │ │ Meal impact      │
│ Sleep APIs      │ │ forecast         │
│ Auth/MFA/Family │ │ Pattern detect   │
│ Health integ.   │ │ Chat agent       │
│ PostgreSQL      │ │ pgvector         │
└─────────────────┘ └──────────────────┘
```

## User Stories

1. As a person tracking my food, I want to log what I ate by name or barcode, so that my meals are recorded without manual data entry.

2. As a person tracking my food, I want to see a daily diary of everything I've eaten organized by meal (breakfast/lunch/dinner/snacks), so I can review my day at a glance.

3. As a person tracking my nutrition, I want to see my calorie and macro totals with progress indicators, so I know how close I am to my daily targets.

4. As a person viewing my dashboard, I want to see a Bloom portrait that visualizes my day as a living watercolor, so I can intuitively sense my metabolic state without reading numbers.

5. As a person viewing my Bloom portrait, I want each hour's pigment to reflect my actual food/exercise/rest data, so that the visualization is truthful and data-driven.

6. As a person logging a meal, I want to see the meal represented in the Bloom as a pigment wash (fast sugar → persimmon, fatty delay → toasted sesame), so I connect what I ate to how it affects me.

7. As a person who exercises, I want movement logged through the app or auto-synced from Fitbit/Garmin/Apple Health, so my exercise appears as a moss-green pigment in my Bloom.

8. As a person who tracks sleep, I want sleep data (duration, quality) visible as indigo fog pigment in the Bloom, so I see the relationship between rest and metabolic state.

9. As a person curious about a specific meal, I want to ask "what will happen if I eat this pizza?" and get a glucose impact forecast, so I can make informed decisions.

10. As a person using the app over time, I want the system to detect patterns ("you spike after high-fat lunches"), so I learn my body's responses.

11. As a person who cares about privacy, I want all my data stored on my own server, so I maintain full control of my health information.

12. As a SparkyFitness user, I want my existing data (food library, diary history, exercise logs) to be preserved, so I don't lose years of tracking.

13. As a person sharing a server with my family, I want family access controls (already in SparkyFitness), so each person gets their own Bloom portrait.

14. As a person opening the app, I want the Bloom portrait to feel unique to me (identity bloom with personal seed), so the experience feels personalized.

15. As a person logging a custom food, I want to manually enter nutrition values (calories, protein, carbs, fat), so I can track home-cooked or restaurant meals.

16. As a person choosing what to eat, I want to browse foods by barcode scan or text search via OpenFoodFacts and USDA, so I have a comprehensive nutrition database.

17. As a person who eats the same foods often, I want my most-used and favorite foods surfaced first, so I can log meals quickly.

18. As a person viewing the Bloom, I want to tap on a pigment wash to see what events contributed (specific meals, exercise sessions, sleep), so I can explore the data behind the art.

19. As a developer self-hosting, I want the system to run via Docker Compose, so deployment is straightforward.

20. As a person using the AI chat, I want to log food by conversation ("I had two eggs and toast for breakfast"), so text entry is available alongside manual logging.

## Implementation Decisions

### Module Architecture

**SparkyFitnessServer — New Service: Meal Impact Predictor**

- A new route `/api/v2/food/meal-impact` that accepts meal item descriptions and returns a structured impact forecast.
- Backed by a `MealImpactService` that delegates to the T1D sidecar over HTTP, with a fallback rules-based estimator if the sidecar is unavailable.
- The T1D sidecar runs as a separate Python container exposing a `/predict` endpoint.

**SparkyFitnessServer — New Service: Pattern Detector**

- A new scheduled task (node-cron) that runs daily: reads the last 30 days of food entries + health metrics and calls the T1D sidecar's `/patterns` endpoint.
- Produces pattern summaries stored in a new `detected_patterns` table (pattern type, severity, time window, supporting evidence).

**SparkyFitnessMobile — Bloom Dashboard Screen**

- Replaces the current SparkyFitnessMobile dashboard with the BloomClock from sato-bloom.
- The BloomClock reads time-windowed metabolic data from the server (a new `/api/v2/bloom/windows` endpoint).
- Each BloomWindow is mapped to a pigment key server-side — the mobile app only renders.
- The screen includes greeting text, a contextual headline ("Your bloom feels more reactive today"), and the BloomClock canvas.

**SparkyFitnessMobile — Diary Screen (Merged)**

- Port the simple-calorie-tracker diary layout into SparkyFitnessMobile: meal-type sections (breakfast/lunch/dinner/snacks), NutritionSummary with macro progress, and the CalorieSummaryProgress ring.
- The macro progress bars are rendered with Skia and use Bloom pigment colors instead of generic brand colors — e.g., protein progress uses Soft Soy (#A7A982), carbs use Warm Oat (#D9BC78), fat uses Toasted Sesame (#B9915E).
- The outer ring becomes a mini Bloom ring that shows the user's current overall state.

**SparkyFitnessMobile — Food Search & Barcode Scan**

- SparkyFitnessMobile already has barcode scanning and OpenFoodFacts/USDA integration. Keep the existing flow.
- Merge the search UX patterns from simple-calorie-tracker: tab selector (generic vs. branded), loading states, error handling, and the search-bar-as-header pattern.

**Sato Bloom — Pigment System (Adopted as-is)**

- The 11-pigment `SATO_PIGMENTS` map from sato-bloom becomes the canonical color system for the entire app.
- `pigmentForKey()` is ported into `@workspace/shared` so both the server (Bloom window calculation) and mobile app (rendering) use the same pigment definitions.

**Sato Bloom — BloomClock (Adopted as-is)**

- The `BloomClock.tsx` component moves into SparkyFitnessMobile's component tree.
- It reads bloom windows from the API instead of sample data.
- The identity bloom system (`placeholderIdentityBloom`) is persisted server-side and seeded from the user's account creation timestamp.

### Schema Changes

- **New table: `detected_patterns`** — stores T1D pattern detection results (user_id, pattern_type, severity, first_observed, last_observed, metadata JSONB).
- **New table: `bloom_windows`** — stores cached daily bloom windows per user (user_id, date, window_data JSONB, computed_at).
- **New column on `food_entries`: `bloom_pigment_key`** — the metabolic pigment key assigned to this food entry, set at log time.

### API Contracts

- `GET /api/v2/bloom/windows?date=2026-06-09` — returns 12 or 24 BloomWindows for the given date, each with pigmentKey, glucoseAvg, state, intensity, confidence, and eventContext.
- `POST /api/v2/food/meal-impact` — accepts `{ items: string[], eaten_at?: ISO8601 }`, returns `{ windows: ForecastWindow[], totalCarbs, confidence, disclaimer }`.
- `GET /api/v2/bloom/identity` — returns the user's IdentityBloom (seed, petalNoise, asymmetry, etc.).

### Sidecar Communication

- The T1D sidecar exposes HTTP on port 8100.
- SparkyFitnessServer proxies meal-impact and pattern requests to it.
- The sidecar is optional — if unreachable, the app degrades gracefully (no forecast tab, static Bloom pigmentation based on pure macro ratios).

## Testing Decisions

- **Good tests** assert external behavior, not implementation internals. For the BloomClock, test that given a set of BloomWindow inputs, the correct number of pigment layers are rendered — not that specific Skia Path commands are called.
- **MealImpactService** should be tested with known meal inputs against expected forecast shapes (not exact values, since the physiology model involves randomness). Golden data from the T1D project's test matrix can be ported.
- **Bloom window calculation** (server-side) should be unit-tested: given a day of food entries + exercise + sleep, does it produce the expected set of BloomWindows with correct pigmentKey assignments?
- **Diary screen merging** should be verified by snapshot tests — the meal-type sections should render with the correct macro calculations matching the simple-calorie-tracker reference.
- **Pigment system** (in shared workspace) gets pure-unit tests: no mocks, just assert that `pigmentForKey("fastSugar").hex === "#E88B55"` and that the opacity/spread/granulation biases are within expected ranges.

## Out of Scope

- T1D-specific medical features: CGM integration, nightscout sync, insulin logging, hypo alerts. These remain in the T1D Companion project.
- Food photo estimation (AI from photos) — SparkyFitness has this already; it's preserved but not enhanced here.
- Apple Health / Google Health Connect sync — already in SparkyFitnessMobile, unchanged.
- Internationalization — the simple-calorie-tracker explicitly lacks it; no i18n work in this phase.
- Past-day diary navigation — simple-calorie-tracker only supports current-day; multi-day diary browsing is deferred.
- Web frontend redesign — the SparkyFitnessFrontend web dashboard is left unchanged. This PRD targets the mobile experience only.
- Push notifications — deferred to a future phase.

## Further Notes

- The Bloom pigment system is designed to feel, not explain. Users should not see "PigmentKey: fastSugar" — they see a persimmon wash spreading across their daily clock. The legend is discoverable through interaction (tap to inspect).
- The project name "Sparky Bloom" is a placeholder — the final product name is TBD. The codebase uses `sparky-bloom` as the working name.
- All four source repositories (SparkyFitness, T1D Companion, simple-calorie-tracker, sato-bloom) are "upstream" — we pull their code into the sparky-bloom working tree rather than installing them as dependencies. The Bloom pigment system and BloomClock are the exceptions: they're small enough to adopt wholesale.
- The `@workspace/shared` package (already in SparkyFitness's pnpm workspace) is the right home for shared types including the pigment system, BloomWindow types, and IdentityBloom schema.
- Simple-calorie-tracker is MIT-licensed and SparkyFitness is ISC-licensed — both permit derivative use.
