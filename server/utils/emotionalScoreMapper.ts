// sparky-bloom/server/utils/emotionalScoreMapper.ts

/**
 * Emotional Score Mapper
 *
 * Maps nutritional data to emotional intensity scores that drive
 * the Sato emotional greeting layer.
 */

import type { Mood, EmotionalIntensity } from '../types/sato.js';
import type { DailyNutritionSummary } from '../types/sato.js';

const THRESHOLDS = {
  calm: 30,
  curious: 70,
  excited: 150,
  surprised: 99999  // All values >= 150 are surprised
};

/**
 * Maps nutritional data to emotional intensity score (0-1000)
 *
 * Calculates emotional intensity based on:
 * - Recent day's macronutrients (70% weight)
 * - 14-day trend macronutrients (30% weight)
 *
 * Nutrient weights:
 * - Carbs: 1.5x (primary contributor)
 * - Protein: 1.0x (moderate contributor)
 * - Fat: 0.5x (minor contributor)
 */
export function calculateEmotionalIntensity(
  latest: DailyNutritionSummary,
  trend: DailyNutritionSummary
): number {
  // Calculate recent score
  const recentScore = (
    latest.carbs * 1.5 +
    latest.protein * 1.0 +
    latest.fat * 0.5
  );

  // Calculate trend score
  const trendScore = (
    trend.carbs * 1.5 +
    trend.protein * 1.0 +
    trend.fat * 0.5
  );

  // Weighted average: 70% recent, 30% trend
  const emotionalScore = (recentScore * 0.7) + (trendScore * 0.3);

  return emotionalScore;
}

/**
 * Maps emotional intensity score to mood
 */
export function mapEmotionalIntensityToMood(intensity: number): Mood {
  if (intensity < THRESHOLDS.calm) {
    return 'calm';
  } else if (intensity < THRESHOLDS.curied) {
    return 'curied';
  } else if (intensity < THRESHOLDS.excited) {
    return 'excited';
  } else {
    return 'surprised';
  }
}

/**
 * Maps mood to mood badge color
 */
export function mapMoodToBadge(mood: Mood): string {
  const badges: Record<Mood, string> = {
    calm: 'green',
    curied: 'amber',
    excited: 'orange',
    surprised: 'red'
  };
  return badges[mood];
}

/**
 * Maps mood to voice style
 */
export function mapMoodToVoice(mood: Mood): string {
  const voices: Record<Mood, string> = {
    calm: 'calm',
    curied: 'curied',
    excited: 'warm',
    surprised: 'surprised'
  };
  return voices[mood];
}