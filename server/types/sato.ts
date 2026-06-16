/**
 * Sato Types - Emotional Presentation Layer for T1D Companion
 *
 * This module defines the types for the Sato emotional greeting layer,
 * which transforms raw T1D data into emotionally resonant narratives.
 */

// Re-export Intelligence Card types from the service (single source of truth)
export type {
  SatoCardType as SatoInsightCardType,
  SatoCardPriority as CardPriority,
  SuppressionReason as CardRenderDecisionReason,
  SatoCardAction,
  SatoCardProvenance as CardProvenance,
  SatoEvidenceBundle,
  SatoIntelligenceCard,
  CardRenderDecision,
  SatoIntelligenceCardsResponse as SatoCardsFeedResponse,
} from '../services/satoIntelligenceCardsService.js';

// Re-export CardInteractionAction from service
export type { CardInteractionAction } from '../services/cardInteractionService.js';

// ============================================================================
// EMOTIONAL SCORE & MOOD TYPES
// ============================================================================

export type Mood = 'calm' | 'curied' | 'excited' | 'surprised';
export type MoodBadge = 'green' | 'amber' | 'orange' | 'red';
export type Voice = 'warm' | 'practical' | 'calm' | 'analytical';

export interface EmotionalIntensity {
  score: number;        // 0-1000, calculated from nutrition data
  recentScore: number;  // Recent day's nutrition intensity
  trendScore: number;   // 14-day trend nutrition intensity
}

export interface MoodConfig {
  mood: Mood;
  moodBadge: MoodBadge;
  voice: Voice;
}

// ============================================================================
// EMOTIONAL GREETING TYPES
// ============================================================================

export interface EmotionalGreetingData {
  profileName: string;
  latestDate: string;
  dailyNutrition: {
    carbs: number;
    fat: number;
    protein: number;
    score: number;  // Emotional intensity score (0-1000)
  };
  mood: Mood;
  moodBadge: MoodBadge;
  repeatInfo: {
    foodNames: string[];
    count: number;
    mostFrequentMealType: string;
    avgCalories: number;
  };
  '14dayTrend': {
    carbs: number;
    fat: number;
    protein: number;
  };
  availableContext: {
    vectorTitles: string[];
    cgmCount: number;
    mealReviewCount: number;
  };
}

export interface EmotionalGreetingResponse {
  emotion: Mood;
  mood_badge: MoodBadge;
  narrative: string;
  questionOrOffer?: string;
  voice: Voice;
  raw: RawCompanionContext;  // Preserve for debugging
}

export interface RawCompanionContext {
  profileName: string;
  latestDate: string | null;
  latestMeals: MealSummary[];
  latestDaily: DailyNutritionSummary | null;
  trend14Day: DailyNutritionSummary | null;
  vectorTitles: string[];
  cgmCount: number;
  mealReviewCount: number;
}

// ============================================================================
// CARD TYPES
// ============================================================================

export type CardKind =
  | 'parsedFoods'
  | 'foodEvidence'
  | 'forecast'
  | 'mealMemory'
  | 'whatIfScenarios'
  | 'monitoring'
  | 'confidence'
  | 'patternGenome';

export interface EmotionalCard {
  kind: CardKind;
  mood: Mood;
  moodBadge: MoodBadge;
  narrative: string;
  payload: Record<string, unknown>;
}

export interface SatoCardsResponse {
  emotion: Mood;
  moodBadge: MoodBadge;
  narrative: string;
  questionOrOffer?: string;
  voice: Voice;
  cards: EmotionalCard[];
}

// ============================================================================
// NARRATIVE & TEMPLATE TYPES
// ============================================================================

export interface NarrativeTemplateData {
  foodName?: string;
  similarity?: number;
  count?: number;
  mood: Mood;
  moodBadge: MoodBadge;
  avgPeak?: number | null;
  avgDelta?: number | null;
  avgTimeToPeak?: number | null;
  sampleDates?: string[];
  context?: {
    dietType?: string;
    patterns?: string[];
  };
}

export interface TemplateRegistry {
  id: string;
  template: string;
  priority: number;           // 1 = most common
  condition: (data: any) => boolean;
}

// ============================================================================
// NERD STATS TYPES
// ============================================================================

export interface NerdStatsResponse {
  cards: string[];  // All raw cards from existing layer
  chartData: ChartData;
  graphData: GraphData;
  rawContext: RawCompanionContext;
}

export interface ChartData {
  calories14Day: Array<{ date: string; calories: number }>;
  carbs14Day: Array<{ date: string; carbs: number }>;
  protein14Day: Array<{ date: string; protein: number }>;
  fat14Day: Array<{ date: string; fat: number }>;
  tir14Day: Array<{ date: string; tir: number }>;
}

export interface GraphData {
  cgmHistory: Array<{ time: string; glucose: number }>;
  peakPredictions: Array<{ time: string; peak: number }>;
  baseline: number;
}

// ============================================================================
// ATLAS QUERY TYPES
// ============================================================================

export interface SatoAtlasQueryData {
  matchedFoods: Array<{
    foodName: string;
    similarity: number;
    avgDelta: number | null;
    count: number;
  }>;
  totalMatches: number;
  pattern: string;
  patternDesc: string;
  sampleMeals: Array<{
    date: string;
    foods: string[];
    delta: number;
    peak: number;
  }>;
  mood: Mood;
  moodBadge: MoodBadge;
}

export interface SatoAtlasQueryResponse {
  matchedFoods: Array<{
    foodName: string;
    similarity: number;
    avgDelta: number | null;
    count: number;
    mood: Mood;
    moodBadge: MoodBadge;
    narrative: string;
  }>;
  totalMatches: number;
  pattern: string;
  patternDesc: string;
  narrative: string;
  mood: Mood;
  moodBadge: MoodBadge;
}

// ============================================================================
// HELPER INTERFACES
// ============================================================================

export interface DailyNutritionSummary {
  entryDate: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugars: number;
  sodium: number;
}

export interface MealSummary {
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  foods: string[];
}