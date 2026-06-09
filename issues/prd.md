# PRD: Sparky Bloom — Metabolic Health Companion

## Problem Statement

Most health apps stop at:

Data → Charts

You log food, you see progress bars. You track sleep, you see a timeline. You exercise, you see rings. It is arithmetic dressed as insight.

The T1D Companion project proved that meal impact *forecasting* and *pattern detection* are technically feasible, but it remained a Python CLI tool — no mobile UX, no visual language.

What's missing is a product that makes you *feel* your metabolic state, not read it. A product that doesn't just record what you did, but reflects who you are metabolically — a living self-portrait, not a dashboard.

SparkyFitness is the **system of record**. The T1D engine is the **system of intelligence**. Bloom should become the **system of reflection** — the piece nobody else is building.

People don't fall in love with analytics. People fall in love with mirrors.

## Solution

**Sparky Bloom** — a self-hosted metabolic health companion built on four integrated layers:

| Layer | Name | Role |
|-------|------|------|
| **Bones** | SparkyFitnessServer | System of record: auth, food CRUD, diary, exercise, sleep, health integrations |
| **Skin** | SparkyFitnessMobile + Simple Calorie Tracker | App shell: diary UI patterns, barcode scanning, macro progress |
| **Mind** | T1D AI (Python sidecar) | System of intelligence: meal impact forecasting, pattern detection |
| **Soul** | Bloom | System of reflection: metabolic self-portrait, weather layer, identity |

### Core principle: the Bloom is not a chart

If the Bloom becomes another radial chart, we have failed. If a user opens the app and instantly knows — without reading numbers — "today feels turbulent… calm… reactive… stable" — then we've built something novel.

**The Bloom paints predicted metabolic response, not logged inputs.**

Not: breakfast logged → orange pigment.

Instead: oats → steady expanding wash. Donut → sharp burst. Pizza → delayed bloom that comes alive hours later. Run → green clearing.

The Bloom is a living forecast, not a log.

### The Weather Layer

Metabolic state is expressed as *weather conditions*, not clinical numbers:

| Condition | Feeling |
|-----------|---------|
| **Calm** | Stable, even, nothing remarkable |
| **Clear** | Open, responsive, good energy |
| **Foggy** | Sluggish, unclear, hard to read |
| **Reactive** | Spiky, volatile, sensitive |
| **Heavy** | Dense, slow, stuck |
| **Restored** | Recovered, refreshed, balanced |
| **Charged** | High energy, ready, sharp |

"Today's forecast: Mostly calm morning. Reactive period around lunch. Recovery after exercise."

People remember weather. Nobody remembers "average glycemic load = 43".

### Architecture overview

```
┌────────────────────────────────────────────────────────────┐
│                   Mobile App (Expo)                        │
│                                                           │
│  ┌──────────────────────────────────────────────────┐     │
│  │  BLOOM (Primary Home)                            │     │
│  │  ┌──────────────────────┐   ┌────────────────┐   │     │
│  │  │  Living watercolor   │   │  Today's       │   │     │
│  │  │  portrait            │   │  Forecast      │   │     │
│  │  │  (continuous, no     │   │  Calm morning  │   │     │
│  │  │  visible segments)   │   │  Reactive lunch │   │     │
│  │  └──────────────────────┘   └────────────────┘   │     │
│  └──────────────────────────────────────────────────┘     │
│                                                           │
│  ┌──────────┐ ┌──────────────┐ ┌──────────────────────┐  │
│  │  Diary   │ │  Food        │ │  Ask Bloom           │  │
│  │  + Bloom │ │  Search      │ │  (AI explains the    │  │
│  │  Impact  │ │  + Barcode   │ │  painting)           │  │
│  └──────────┘ └──────────────┘ └──────────────────────┘  │
│                                                           │
└───────────────────────┬───────────────────────────────────┘
                        │
          ┌─────────────┴─────────────┐
          ▼                           ▼
┌────────────────────┐     ┌──────────────────────┐
│ SparkyFitness      │     │ T1D AI Sidecar       │
│ Server (Node.js)   │     │ (Python/FastAPI)     │
│                    │     │                      │
│ Food/Exercise/Sleep│     │ Meal impact forecast │
│ Auth/MFA/Family    │     │ Pattern detection    │
│ Health integrations│────▶│ Bloom window calc    │
│ PostgreSQL         │     │ Weather conditions   │
│                    │     │ Ask Bloom agent      │
└────────────────────┘     └──────────────────────┘
```

## Bloom Experience Principles

### Core Principle

Bloom is not a visualization of inputs.

Bloom is a visualization of predicted metabolic experience.

Meals, exercise, sleep, recovery, timing, and behavioral patterns influence the Bloom, but the Bloom itself represents the body's expected response to those inputs, not the inputs themselves.

A meal is not painted because it was eaten.

A meal is painted because of how it is expected to affect the user.

The distinction is fundamental.

Bloom is not a diary rendered as art.

Bloom is the user's metabolic self-portrait.

---

### Product Promise

A self-hosted metabolic companion that paints your day as art, explains why it looks that way, and tells you one thing to do next.

Every state within the system must resolve into three things:

1. **A feeling**
2. **An explanation**
3. **An action**

If any of those elements are missing, the experience is incomplete.

---

### The Four-Part User Loop

Every day Bloom should help the user:

**See**

View a living portrait of their metabolic state.

Not numbers.

Not charts.

Not progress bars.

A portrait.

**Understand**

Discover the primary drivers behind the portrait through the "Why This Bloom?" experience.

Users should be able to understand what influenced their day without needing to interpret complex health data.

**Act**

Receive exactly one actionable recommendation.

Not five.

Not ten.

One.

The goal is behavior change, not information overload.

**Reflect**

Explore meals, exercise, sleep, patterns, and outcomes through interaction with the portrait.

The Bloom is not static artwork.

It is inspectable art.

---

### Bloom Conditions

The system maintains internal physiological classifications but presents memorable emotional conditions to users.

| Internal State | User Condition |
|---|---|
| balanced | Clear |
| reactive | Stormy |
| fatDelayed | Heavy |
| underFueled | Fading |
| sleepDebt | Foggy |
| recovered | Bright |
| exerciseEnhanced | Charged |

Users should remember how their day felt.

They should never need to memorize metabolic terminology.

Example:

> "Today's Conditions: Heavy"
> Delayed energy patterns detected. Likely influenced by yesterday evening's meal.

---

### The One-Second Rule

A user should be able to open the app for one second, look at the Bloom, and correctly identify how their day feels before reading any numbers.

This rule supersedes all dashboard conventions.

If a design decision makes the Bloom feel more like a chart, it is the wrong decision.

If a design decision makes the Bloom feel more alive, intuitive, and emotionally recognizable, it is the correct decision.

---

### Memory Layer

The Bloom remembers.

Today's portrait is dominant.

Yesterday remains faintly visible.

The previous week leaves subtle traces.

Historical patterns become ghost pigments embedded within the portrait.

Users should feel that they are looking at a living organism shaped by time, not a disposable daily chart.

---

### Seasonal Bloom

Beyond the daily portrait, the system generates a longer-term Seasonal Bloom.

The Seasonal Bloom accumulates approximately ninety days of metabolic history.

Its purpose is not to explain a meal.

Its purpose is to reveal trajectory.

Daily Bloom answers:

> "What happened today?"

Seasonal Bloom answers:

> "Who am I becoming?"

---

### Reflection Feedback

Bloom continuously learns through lightweight reflection.

Instead of asking users to complete journals, Bloom presents simple observations:

> "This bloom looks calmer than yesterday."

The user may respond:

* Yes
* No
* Somewhat

These responses become training signals for personalization, confidence calibration, and future recommendations.

---

### Trust and Uncertainty

Every prediction must include confidence.

Bloom never presents certainty where uncertainty exists.

Low-confidence predictions must be visibly softer, less assertive, and accompanied by appropriate caveats.

Trust is more important than apparent intelligence.

A modestly accurate system that admits uncertainty is preferable to an impressive system that overstates confidence.

---

### Design Philosophy

Users do not fall in love with analytics.

Users fall in love with mirrors.

Sparky Fitness is the system of record.

The AI engine is the system of intelligence.

Bloom is the system of reflection.

The portrait should always come first.

Understanding comes second.

Data comes third.

---

## User Stories

### Food & Diary (Bones + Skin)

1. As a person tracking my food, I want to log what I ate by name or barcode, so that my meals are recorded without manual data entry.

2. As a person tracking my food, I want to see a daily diary of everything I've eaten organized by meal (breakfast/lunch/dinner/snacks), so I can review my day at a glance.

3. As a person tracking my nutrition, I want to see my calorie and macro totals with progress indicators, so I know how close I am to my daily targets.

4. As a person logging a meal, I want to see a **Bloom Impact** label under each entry ("Slow release, Stable energy" or "Delayed response, Reactive window expected"), so I understand how that food will affect me before I feel it.

5. As a person choosing what to eat, I want to browse foods by barcode scan or text search via OpenFoodFacts and USDA, so I have a comprehensive nutrition database.

6. As a person who eats the same foods often, I want my most-used and favorite foods surfaced first, so I can log meals quickly.

7. As a person logging a custom food, I want to manually enter nutrition values (calories, protein, carbs, fat), so I can track home-cooked or restaurant meals.

### Bloom: The Living Portrait (Soul)

8. As a person opening the app, I want to see a Bloom portrait that captures my metabolic day as a continuous living watercolor, so I intuitively know how today feels without reading any numbers.

9. As a person viewing my Bloom, I want the pigment to reflect **predicted metabolic response** (not just what I logged), so a fatty meal creates a delayed bloom and a run creates a green clearing — not just "lunch logged → orange."

10. As a person viewing my Bloom, I want to see **today's weather**: a single condition label ("Calm", "Reactive", "Foggy", "Restored") and a short forecast ("Mostly calm morning, reactive window around lunch"), so I can plan my day.

11. As a person opening the app, I want the Bloom portrait to feel uniquely mine (identity bloom with personal seed, asymmetric petal bias), so the experience feels personal.

12. As a person viewing the Bloom, I want to tap on any region to see what events and predictions shaped that part of the portrait, so I can explore the data behind the reflection.

13. As a person who exercises, I want movement to appear as a moss-green clearing in the Bloom, so I can see how exercise shapes my metabolic landscape.

14. As a person who tracks sleep, I want sleep quality to affect the Bloom's background — deep sleep deepens calm tones, broken sleep adds fog — so I see the connection between rest and metabolic state.

### Prediction & Intelligence (Mind)

15. As a person curious about a specific meal, I want to ask "what will happen if I eat this pizza?" and get a forecast of how my body will respond, so I can make informed decisions.

16. As a person using the app over time, I want the system to detect patterns ("you spike after high-fat lunches", "morning exercise stabilizes your afternoon"), so I learn my body's responses without manual analysis.

17. As a person using the Bloom, I want to ask AI questions about the painting itself: "Why did today feel heavy? What caused the orange wash? Why am I tired after lunch?" through **Ask Bloom**, so the AI explains my metabolic portrait in plain language.

18. As a person logging by voice/text, I want to say "I had two eggs and toast for breakfast" through **Ask Bloom**, so conversation is a natural input alongside scanning and browsing.

### Insights, Patterns & Decision Support (Mind)

#### Insight Discovery

19. As a person reviewing my glucose data, I want the app to identify patterns I would not normally notice, so that I can learn things about my management that are difficult to see from daily graphs.

20. As a person reviewing my history, I want the app to analyse weeks and months of data, so that I can understand long-term trends rather than focusing only on individual events.

21. As a person managing my health, I want the system to connect food, exercise, sleep and outcomes together, so that I can understand what factors are influencing my results.

#### Pattern Detection

22. As a person eating similar meals regularly, I want the app to detect recurring meal-response patterns, so that I can understand which foods consistently work well or poorly for me.

23. As a person who exercises regularly, I want the app to identify exercise-related patterns, so that I can better prepare for highs and lows around physical activity.

24. As a person using insulin, I want the system to identify situations where my insulin-to-carb ratio may not be optimal, so that I can discuss potential adjustments with my healthcare team.

25. As a menstruating person, I want the system to detect changes in sensitivity across my menstrual cycle, so that I can anticipate periods of increased or decreased requirements.

26. As a person experiencing post-hypo rebounds, I want the app to detect recurring overcorrection behaviours, so that I can reduce unnecessary rebound highs.

#### Decision Support

27. As a person receiving insights, I want the app to suggest practical actions, so that insights can be turned into meaningful behaviour changes.

28. As a person reviewing a detected pattern, I want the system to explain the evidence behind its recommendation, so that I understand why it was made.

29. As a person making daily decisions, I want the app to suggest one clear next step, so that I am not overwhelmed with multiple competing recommendations.

30. As a person preparing to eat, I want the app to forecast likely outcomes for a meal before I eat it, so that I can make informed decisions.

#### Decision Fatigue Reduction

31. As a person managing daily, I want the app to reduce the number of decisions I have to make manually, so that I experience less decision fatigue.

32. As a person reviewing my dashboard, I want the app to summarise the most important thing I should know today, so that I can focus on action instead of analysing charts.

33. As a person using the system, I want it to transform data into recommendations, so that I spend less time interpreting graphs and more time acting on useful information.

#### Trust & Explainability

34. As a person receiving AI-generated insights, I want every insight to include supporting evidence, so that I can trust the recommendation.

35. As a person using predictive features, I want the system to communicate confidence levels, so that I understand the certainty of each recommendation.

36. As a person relying on the app, I want the system to clearly distinguish between observed patterns and predicted outcomes, so that I know what is based on evidence and what is based on forecasts.

37. As a person who values trustworthy AI, I want to see explicit evidence backing every insight, so that I never have to wonder whether a recommendation is based on my own data or generic assumptions.

### Platform (Bones)

19. As a person who cares about privacy, I want all my data stored on my own server, so I maintain full control of my health information.

20. As a SparkyFitness user, I want my existing data (food library, diary history, exercise logs) to be preserved, so I don't lose years of tracking.

21. As a person sharing a server with my family, I want family access controls (already in SparkyFitness), so each person gets their own Bloom portrait.

22. As a developer self-hosting, I want the system to run via Docker Compose, so deployment is straightforward.

## Implementation Decisions

### Core Architectural Decision: The Bloom paints prediction, not inputs

The Bloom server-side computation is fundamentally a *prediction engine*, not a *data mapper*. The pipeline is:

```
Food Entry → Macro calculation → Meal Impact Forecast → BloomWindow
Exercise Entry → Duration/Intensity → Recovery Forecast → BloomWindow
Sleep Entry → Quality/Duration → Restorative State → BloomWindow
                                                            ↓
                                              Weather Condition (Calm/Foggy/Reactive/...)
```

Each BloomWindow is computed by forecasting forward from an event, not by looking at what was logged. A pizza at noon creates a BloomWindow that *intensifies at 2-3pm* — the delayed response. A run at 5pm creates a BloomWindow that *clears* the preceding pigment. This is the critical difference between a chart and a portrait.

### Weather Layer: Conditions as a first-class type

A new shared type is added to `shared/src/pigments/`:

```typescript
type BloomCondition = 
  | "calm" | "clear" | "foggy" 
  | "reactive" | "heavy" 
  | "restored" | "charged"
```

Each condition has: a human label, a hex tint (blended into the watercolor), a short description, and typical triggers. The server computes a daily condition and per-window conditions based on forecasted volatility and predicted response curves.

### No visible segmentation

The Bloom renders as **continuous watercolor** only. Internally the server may use 24 one-hour windows or 48 half-hour windows — the mobile app receives a dense array of (time, pigment, opacity, spread) tuples and renders a continuous wash. No 24-segment clock face. No petal boundaries. No radial chart appearance.

The `BloomWindow` type exists only in the server → mobile API contract. The Skia renderer draws a continuous field from it.

### Bloom Impact per meal

Every diary entry gets a **bloom_impact** field in the API response, computed by the T1D sidecar:

```json
{
  "food_name": "Pepperoni Pizza",
  "calories": 850,
  "bloom_impact": {
    "effect": "delayed_response",
    "expected_duration_hours": 3,
    "pigment_key": "fatDelay",
    "description": "Delayed response, reactive window expected, recovery ~3 hrs"
  }
}
```

This is displayed inline under each food entry in the diary — no separate forecast screen needed.

### Ask Bloom

The AI chat is rebranded and reframed. Not "ChatGPT but food." Instead, **Ask Bloom** — an AI that explains the painting.

Prompt framing: "You are Bloom, a metabolic reflection guide. You see the user's Bloom portrait and their logged data. You answer questions about *what the portrait shows and why*."

Example queries:
- "Why did today feel heavy?"
- "What caused the orange bloom this afternoon?"
- "What should I eat before cycling tomorrow?"
- "Why am I tired after lunch every day?"

The chat UI appears as a natural part of the Bloom home screen (a floating input or bottom sheet), not a separate tab.

### Module Architecture

**SparkyFitnessServer — Bloom Service (new)**

- `GET /api/v2/bloom/today` — returns the full Bloom payload: continuous wash data (dense array of time/pigment/opacity/spread tuples), weather condition and forecast, daily condition label, identity bloom metadata.
- Computation: reads food entries + exercise + sleep for the day, sends macro/time data to the T1D sidecar for prediction, assembles BloomWindows from predicted responses, downsamples to continuous wash data.
- `GET /api/v2/bloom/identity` — returns the user's IdentityBloom (seed, petalNoise, asymmetry).

**SparkyFitnessServer — Bloom Impact on Diary**

- The existing diary entries endpoint gains a `bloom_impact` field on each entry, populated by calling the T1D sidecar's per-meal impact predictor at log time (or async, cached).

**SparkyFitnessServer — Pattern Detector**

- A new scheduled task (node-cron) runs daily: reads the last 30 days of food entries + health metrics and calls the T1D sidecar's `/patterns` endpoint.
- Produces pattern summaries stored in a new `detected_patterns` table.

**SparkyFitnessMobile — Bloom Home Screen**

- The primary screen. Not a dashboard with Bloom as a widget — the Bloom *is* the home screen.
- Shows: continuous Skia watercolor portrait, "Today's Forecast" weather card below, Ask Bloom input at the bottom.
- Tap on the watercolor → inspect what events/predictions shaped that region.
- No visible segmentation, no clock face, no radial chart appearance.

**SparkyFitnessMobile — Diary Screen**

- Port the simple-calorie-tracker diary layout: meal-type sections (breakfast/lunch/dinner/snacks), NutritionSummary with macro progress.
- Each food entry shows Bloom Impact inline.
- Macro progress bars use Bloom pigment colors.

**SparkyFitnessMobile — Food Search & Barcode Scan**

- SparkyFitnessMobile already has barcode scanning and OpenFoodFacts/USDA integration. Keep existing flow.
- Merge search UX from simple-calorie-tracker: tab selector (generic vs branded), loading/error states.

**Shared — Pigment System + Conditions**

- `SATO_PIGMENTS` map and `pigmentForKey()` in `shared/src/pigments/` (done).
- Add `BloomCondition` type and weather-labels mapping.
- `pigmentForMacros()` moved to server-side only; shared keeps the pigment definitions.

### Schema Changes

- **New table: `detected_patterns`** — stores T1D pattern detection results (user_id, pattern_type, severity, first_observed, last_observed, metadata JSONB).
- **New table: `bloom_windows_cache`** — stores daily bloom computation results per user (user_id, date, wash_data JSONB, condition TEXT, computed_at).
- **New column on `food_entries`: `bloom_impact_cache`** (JSONB) — cached bloom impact for the entry, computed at log time.

### API Contracts

- `GET /api/v2/bloom/today?date=2026-06-09` — returns the day's Bloom payload:
  - `wash`: dense array of `{ time, pigmentKey, opacity, spread, granulation }` tuples for continuous rendering
  - `condition`: today's overall weather condition ("calm", "reactive", etc.)
  - `forecast`: human-readable short forecast ("Mostly calm morning. Reactive period around lunch.")
  - `identity`: the user's IdentityBloom for personal rendering bias
- `GET /api/v2/diary/entries?date=...` — existing endpoint, augmented with `bloom_impact` per entry
- `POST /api/v2/food/meal-impact` — accepts `{ items: string[], eaten_at?: ISO8601 }`, returns forecast
- `GET /api/v2/bloom/identity` — returns IdentityBloom (seed, petalNoise, asymmetry, etc.)

### Sidecar Communication

- The T1D sidecar exposes HTTP on port 8100.
- Endpoints: `/predict` (meal impact), `/patterns` (pattern detection), `/bloom/compute` (day wash from event data), `/ask` (Ask Bloom chat).
- The sidecar is optional — if unreachable, the Bloom degrades gracefully (static pigmentation based on macro ratios, no forecast, no Ask Bloom).

## Testing Decisions

- **Good tests** assert external behavior, not implementation internals. For the Bloom wash renderer, test that a known set of wash tuples produces a known output shape and pixel coverage — not that specific Skia Path calls are made.
- **Bloom wash computation** (server-side) should be the most heavily tested module: given a day of food + exercise + sleep, does the wash array correctly encode delayed peaks (pizza → 2-hour-delayed bloom), fast bursts (sugar → immediate sharp wash), and clearing (exercise → reduced opacity)?
- **Bloom Impact** on diary entries should be tested with golden meal data: known foods produce known impact descriptions and pigment keys.
- **BloomCondition** computation should be tested against synthetic day profiles: a volatile day with 3 reactive meals → "reactive" condition. A day with exercise + clean food → "calm" or "clear."
- **Pigment system** gets pure-unit tests: assert hex values, opacity/spread/granulation ranges.
- **Diary screen merging** gets snapshot tests for meal-type section layout and macro calculation accuracy.

## Out of Scope

- T1D-specific medical features: CGM integration, nightscout sync, insulin logging, hypo alerts. These remain in the T1D Companion project.
- Food photo estimation (AI from photos) — SparkyFitness has this already; preserved but not enhanced.
- Apple Health / Google Health Connect sync — already in SparkyFitnessMobile, unchanged.
- Internationalization — deferred.
- Past-day diary navigation — current-day only for MVP; multi-day browsing deferred.
- Web frontend redesign — SparkyFitnessFrontend web dashboard unchanged. Mobile-first.
- Push notifications — deferred.
- Visible segmentation: no 12/24-segment clock face, no petal boundaries, no radial chart UI. The 24-window model is purely internal.
- Customizable weather conditions — the initial set of 7 conditions is fixed for MVP.

## Further Notes

- The Bloom pigment system is designed to *feel*, not explain. Users never see "PigmentKey: fastSugar" — they see a persimmon wash spreading across their morning. The legend is discoverable through interaction (tap to inspect).
- "Ask Bloom" is the AI's identity. Not "AI chat", not "SparkyAI". Ask Bloom. The AI explains the painting.
- The 7 weather conditions were chosen for memorability and emotional resonance, not clinical precision. They may evolve.
- The project name "Sparky Bloom" is a working name. The four-layer model (Bones, Skin, Mind, Soul) is the architectural north star.
- All four source repositories are "upstream" — we pull their code into the sparky-bloom working tree rather than installing them as dependencies.
- Simple-calorie-tracker is MIT-licensed and SparkyFitness is ISC-licensed — both permit derivative use.