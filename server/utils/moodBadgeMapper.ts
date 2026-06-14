// sparky-bloom/server/utils/moodBadgeMapper.ts

/**
 * Mood Badge Mapper
 *
 * Maps various data sources to mood badges and generates narratives
 * for the Sato emotional greeting layer.
 */

import type {
  Mood,
  MoodBadge,
  Voice,
  TemplateData,
  MultipleFoodsData,
  VagueMatchData,
  EmotionalGreetingResponse,
  RawCompanionContext
} from '../types/sato.js';
import { calculateEmotionalIntensity, mapEmotionalIntensityToMood, mapMoodToBadge, mapMoodToVoice } from './emotionalScoreMapper.js';

// ============================================================================
// MOOD CONSTANTS
// ============================================================================

const MOOD_PHRASES = {
  calm: 'calm and steady',
  curied: 'interesting and unexpected',
  excited: 'energetic and impactful',
  surprised: 'a surprising outcome'
};

const NOUN_PHRASES = {
  calm: 'this meal',
  curied: 'these foods',
  excited: 'this combination',
  surprised: 'this selection'
};

const MOOD_EMOTIONAL = {
  calm: 'grounded',
  curied: 'inquisitive',
  excited: 'alive',
  surprised: 'alarming'
};

const MOOD_ADJECTIVES = {
  calm: 'unremarkable',
  curied: 'somewhat unexpected',
  excited: 'noticeably impactful',
  surprised: 'surprising'
};

const MOOD_EMOTIONAL2 = {
  calm: 'reliable',
  curied: 'complex',
  excited: 'intense',
  surprised: 'volatile'
};

// ============================================================================
// FORECAST CARD MAPPING
// ============================================================================

export interface ForecastData {
  peak: number | null;
  baseline: number | null;
  uncertainty_band?: {
    peak_range_mg_dl: [number, number];
    peak_time_range_minutes: [number, number];
  };
  time_to_peak_minutes: number | null;
}

export function mapForecastToMood(forecast: ForecastData): Mood {
  if (!forecast.peak || !forecast.baseline) {
    return 'curied';
  }

  const delta = forecast.peak - forecast.baseline;
  const peak_range = forecast.uncertainty_band
    ? [forecast.peak - forecast.uncertainty_band.peak_range_mg_dl[0], forecast.peak + forecast.uncertainty_band.peak_range_mg_dl[1]]
    : [forecast.peak - 30, forecast.peak + 30];

  const relative_peak = forecast.peak - peak_range[0];

  // Step 1: Map delta → mood
  let mood: Mood = mapEmotionalIntensityToMood(delta);

  // Step 2: Adjust for uncertainty
  if (relative_peak > 30) {
    mood = 'curied';
  }

  // Step 3: Adjust based on time_to_peak_minutes
  if (forecast.time_to_peak_minutes && forecast.time_to_peak_minutes > 180) {
    mood = 'curied';
  }

  return mood;
}

export function mapForecastToBadge(forecast: ForecastData): MoodBadge {
  const mood = mapForecastToMood(forecast);
  return mapMoodToBadge(mood);
}

// ============================================================================
// MEAL MEMORY CARD MAPPING
// ============================================================================

export interface MealMemoryData {
  similar_meals_count: number;
  avg_peak_rise_mg_dl: number | null;
  peak_rise_range_mg_dl: [number, number] | null;
  avg_peak_time_minutes: number | null;
  consistency_tier: string;
  consistency_score: number;
  confidence_tier: string;
}

export function mapMealMemoryToMood(memory: MealMemoryData): Mood {
  const avg_peak = memory.avg_peak_rise_mg_dl;
  if (!avg_peak) return 'curied';

  let mood = mapEmotionalIntensityToMood(avg_peak);

  // Adjust based on consistency_score
  if (memory.consistency_score >= 0.80 && avg_peak < 50) {
    mood = 'calm';
  }

  if (memory.consistency_score < 0.60) {
    mood = 'excited';
  }

  return mood;
}

export function mapMealMemoryToBadge(memory: MealMemoryData): MoodBadge {
  const mood = mapMealMemoryToMood(memory);
  return mapMoodToBadge(mood);
}

// ============================================================================
// FOOD EVIDENCE CARD MAPPING
// ============================================================================

export function mapFoodEvidenceToMood(foodEvidence: any): Mood {
  const confidence = foodEvidence.confidence || 'medium';
  const intensity = getConfidenceToIntensity(confidence);
  return mapEmotionalIntensityToMood(intensity);
}

export function mapFoodEvidenceToBadge(foodEvidence: any): MoodBadge {
  const mood = mapFoodEvidenceToMood(foodEvidence);
  return mapMoodToBadge(mood);
}

function getConfidenceToIntensity(confidence: string): number {
  const intensityMap: Record<string, number> = {
    high: 600,
    medium: 500,
    low: 400
  };
  return intensityMap[confidence] || 500;
}

// ============================================================================
// CONFIDENCE CARD MAPPING
// ============================================================================

export function mapConfidenceToMood(confidence: any): Mood {
  const confidence_tier = confidence.confidence?.confidence_tier || 'medium';
  const consistency_score = confidence.historicalContext?.consistency_score || 0.7;

  const intensity = getConfidenceToIntensity(confidence_tier);

  // Weight by consistency_score
  const weightedIntensity = intensity * (0.7 + (consistency_score * 0.3));

  return mapEmotionalIntensityToMood(weightedIntensity);
}

export function mapConfidenceToBadge(confidence: any): MoodBadge {
  const mood = mapConfidenceToMood(confidence);
  return mapMoodToBadge(mood);
}

// ============================================================================
// TEMPLATE NARRATIVES
// ============================================================================

/**
 * Simple Match Narrative Template
 */
const SIMPLE_MATCH_TEMPLATE = `{{noun}} feels... {{mood_phrase}}.

You've explored {{foodName}} {{count}} time{{count > 1 ? 's' : ''}} before. {% if context.dietType !== 'balanced' %}Your {{context.dietType}} meals tend to be {{context.patterns[0]}}.{% endif %}{% if avgPeak %}Similar meals in your history had an average peak of ~{{avgPeak}} mg/dL at ~{{avgTimeToPeak}} min.{% endif %}{% if avgDelta && avgDelta < 70 %}This fits within your {{mood}} zone — noticeable, but still manageable.{% else if avgDelta >= 150 %}This {{foodName}} pushes into the {{mood}} territory — it's {{moodBadge === 'red' ? 'more intense than usual' : 'a meaningful variation'}}.{% endif %}Would you like to see what happened last time you ate {{foodName}}?`;

/**
 * Multiple Foods Narrative Template
 */
const MULTIPLE_FOODS_TEMPLATE = `The foods {{food_list}} interact in {{pattern_desc}} ways.

You've had {{totalMatches}} meals involving these items. The pattern feels {{mood_lower}} — slightly {{mood_adjective}}.

Most recent example: {{sample_meal}}

The {{pattern}} pattern suggests:
  • Peak timing: around {{avg_time_to_peak}}
  • Average glucose shift: ±{{avg_delta}}
  • Emotional tone: {{mood_emotional}}

Would you like me to track how this pattern evolves?`;

/**
 * Vague Match Narrative Template
 */
const VAGUE_MATCH_TEMPLATE = `Hmm, let me think about that...

Your query {{query}} seems to match a few different food types. I found {{context_foods}} that might be what you're thinking of.

You have {{historical_count}} meals in this general area, but this particular combination might be new to you.

The emotional tone here is curious — this is an {{mood_emotional}} territory with {{mood_emotional2}} vibes.

Would you like me to help you explore similar foods that might match better? Or should we look at a different angle?`;

// ============================================================================
// TEMPLATE RENDERER
// ============================================================================

export function renderSimpleMatchNarrative(data: TemplateData): string {
  let narrative = SIMPLE_MATCH_TEMPLATE;

  // Substitute variables
  if (data.foodName) narrative = narrative.replace(/{{food_name}}/gi, data.foodName);
  if (data.similarity !== undefined) narrative = narrative.replace(/{{similarity}}/gi, `${(data.similarity * 100).toFixed(0)}%`);
  if (data.count !== undefined) narrative = narrative.replace(/{{count}}/gi, data.count.toString());
  if (data.mood) narrative = narrative.replace(/{{mood}}/gi, data.mood);

  if (data.mood) {
    narrative = narrative.replace(/{{mood_phrase}}/gi, MOOD_PHRASES[data.mood]);
    narrative = narrative.replace(/{{mood_lower}}/gi, data.mood.toLowerCase());
    narrative = narrative.replace(/{{mood_adjective}}/gi, MOOD_ADJECTIVES[data.mood]);
    narrative = narrative.replace(/{{mood_emotional}}/gi, MOOD_EMOTIONAL[data.mood]);
  }

  if (data.avgPeak !== undefined) narrative = narrative.replace(/{{avg_peak}}/gi, data.avgPeak.toFixed(0));
  if (data.avgDelta !== undefined) narrative = narrative.replace(/{{avg_delta}}/gi, `+${data.avgDelta.toFixed(0)}`);
  if (data.avgTimeToPeak !== undefined) narrative = narrative.replace(/{{avg_time_to_peak}}/gi, data.avgTimeToPeak.toFixed(0));

  if (data.moodBadge) narrative = narrative.replace(/{{mood_badge}}/gi, data.moodBadge);

  if (data.context) {
    if (data.context.dietType && data.context.dietType !== 'balanced') {
      narrative = narrative.replace(/{{diet_type}}/gi, data.context.dietType);
    }
    if (data.context.patterns && data.context.patterns.length > 0) {
      narrative = narrative.replace(/{{context_patterns}}/gi, data.context.patterns.join(', '));
    }
  }

  if (data.foodName) narrative = narrative.replace(/{{noun}}/gi, NOUN_PHRASES[data.mood] || 'this meal');

  return narrative;
}

export function renderMultipleFoodsNarrative(data: MultipleFoodsData): string {
  let narrative = MULTIPLE_FOODS_TEMPLATE;

  if (data.foods && data.foods.length > 0) {
    narrative = narrative.replace(/{{food_list}}/gi,
      data.foods.length === 2
        ? `your ${data.foods[0].name} and ${data.foods[1].name}`
        : data.foods.length === 3
        ? `your ${data.foods[0].name}, ${data.foods[1].name}, and ${data.foods[2].name}`
        : `these ${data.foods.length} food items`
    );
  }

  if (data.totalMatches !== undefined) narrative = narrative.replace(/{{total_matches}}/gi, data.totalMatches.toString());
  if (data.mood) narrative = narrative.replace(/{{mood}}/gi, data.mood);

  if (data.mood) {
    narrative = narrative.replace(/{{mood_emotional}}/gi, MOOD_EMOTIONAL[data.mood] || data.mood_emotional);
    narrative = narrative.replace(/{{mood_emotional2}}/gi, MOOD_EMOTIONAL2[data.mood] || data.mood_emotional2);
  }

  if (data.sampleMeals && data.sampleMeals.length > 0) {
    const sample = data.sampleMeals[0];
    narrative = narrative.replace(/{{sample_meal}}/gi,
      `${sample.date}: ${sample.foods.join(', ')} (${sample.delta > 0 ? '+' : ''}${sample.delta.toFixed(0)})`
    );
  }

  if (data.pattern) narrative = narrative.replace(/{{pattern}}/gi, data.pattern);
  if (data.patternDesc) narrative = narrative.replace(/{{pattern_desc}}/gi, data.patternDesc);

  if (data.mood) narrative = narrative.replace(/{{mood_lower}}/gi, data.mood.toLowerCase());

  return narrative;
}

export function renderVagueMatchNarrative(data: VagueMatchData): string {
  let narrative = VAGUE_MATCH_TEMPLATE;

  if (data.query) narrative = narrative.replace(/{{query}}/gi, data.query);
  if (data.context_foods && data.context_foods.length > 0) {
    narrative = narrative.replace(/{{context_foods}}/gi, data.context_foods.join(', '));
  }
  if (data.historical_count !== undefined) {
    narrative = narrative.replace(/{{historical_count}}/gi, data.historical_count.toString());
  }

  if (data.mood) {
    narrative = narrative.replace(/{{mood_emotional}}/gi, MOOD_EMOTIONAL[data.mood] || data.mood_emotional);
    narrative = narrative.replace(/{{mood_emotional2}}/gi, MOOD_EMOTIONAL2[data.mood] || data.mood_emotional2);
  }

  return narrative;
}

// ============================================================================
// TEMPLATE REGISTRY
// ============================================================================

export const TEMPLATE_REGISTRY = [
  {
    id: 'simple_match',
    template: SIMPLE_MATCH_TEMPLATE,
    priority: 1,
    condition: (data: any) => data.count >= 1 && data.similarity > 0.70
  },
  {
    id: 'multiple_foods',
    template: MULTIPLE_FOODS_TEMPLATE,
    priority: 2,
    condition: (data: any) => data.foods && data.foods.length >= 2
  },
  {
    id: 'vague_match',
    template: VAGUE_MATCH_TEMPLATE,
    priority: 3,
    condition: (data: any) => data.similarity < 0.50 || data.count === 0
  }
];

export function selectTemplate(data: any) {
  const candidates = TEMPLATE_REGISTRY.filter(t => t.condition(data)).sort((a, b) => b.priority - a.priority);
  return candidates[0] || null;
}

// ============================================================================
// SUMMARY OUTPUT GENERATORS
// ============================================================================

export function createSatoGreetingResponse(
  rawContext: RawCompanionContext,
  greetingData: any
): EmotionalGreetingResponse {
  return {
    emotion: greetingData.mood || 'curied',
    mood_badge: mapMoodToBadge(greetingData.mood || 'curied'),
    narrative: greetingData.narrative || '',
    questionOrOffer: greetingData.questionOrOffer,
    voice: mapMoodToVoice(greetingData.mood || 'curied'),
    raw: rawContext
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function extractFoodNamesFromMeals(meals: any[]): string[] {
  const allFoodNames = new Set<string>();
  meals.forEach(meal => {
    (meal.foods || []).forEach(food => allFoodNames.add(food.toLowerCase()));
  });
  return Array.from(allFoodNames);
}

export function calculateRepeatCount(foodNames: string[], sampleMeals: any[]): number {
  return sampleMeals.reduce((count, meal) =>
    (meal.foods || []).filter(f => foodNames.includes(f.toLowerCase())).length, 0);
}

export function calculateAvgCalories(meals: any[]): number {
  if (meals.length === 0) return 0;
  return meals.reduce((sum, meal) => sum + (meal.calories || 0), 0) / meals.length;
}