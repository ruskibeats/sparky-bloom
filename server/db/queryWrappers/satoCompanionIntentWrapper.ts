// sparky-bloom/server/db/queryWrappers/satoCompanionIntentWrapper.ts

/**
 * Sato Companion Intent Wrapper
 *
 * Generates emotional greeting based on nutrition data.
 * Uses emotional intensity calculation to determine mood and narrative tone.
 */

import {
  getCompanionDataContext,
  getLiveCompanionContext
} from '../../services/t1dCompanionService.js';
import type {
  EmotionalGreetingData,
  EmotionalGreetingResponse,
  RawCompanionContext,
  DailyNutritionSummary,
  MealSummary
} from '../../types/sato.js';
import {
  calculateEmotionalIntensity,
  mapEmotionalIntensityToMood,
  mapMoodToBadge,
  mapMoodToVoice
} from '../../utils/emotionalScoreMapper.js';
import {
  extractFoodNamesFromMeals,
  calculateRepeatCount,
  calculateAvgCalories,
  createSatoGreetingResponse
} from '../../utils/moodBadgeMapper.js';

/**
 * Gets Sato emotional greeting for a user
 */
export async function getSatoGreeting(
  userId: string,
  text: string = ''
): Promise<EmotionalGreetingResponse> {
  // Step 1: Get raw context from existing Layer 1
  const rawContext = await getCompanionDataContext(userId);

  if (!rawContext.latestDate) {
    throw new Error('No recent meal data found for user');
  }

  // Step 2: Transform raw context to emotional data
  const emotionalData = transformToEmotionalGreeting(rawContext);

  // Step 3: Generate narrative using Sato Narrator
  const narrativeResponse = await narrateMealGreeting(emotionalData);

  // Step 4: Wrap response
  return {
    emotion: narrativeResponse.emotion,
    mood_badge: mapMoodToBadge(narrativeResponse.emotion),
    narrative: narrativeResponse.narrative,
    questionOrOffer: narrativeResponse.questionOrOffer,
    voice: narrativeResponse.voice,
    raw: rawContext
  };
}

/**
 * Transforms raw context to emotional data
 */
function transformToEmotionalGreeting(
  raw: RawCompanionContext
): EmotionalGreetingData {
  const intensity = calculateEmotionalIntensity(
    raw.latestDaily!,
    raw.trend14Day!
  );

  const mood = mapEmotionalIntensityToMood(intensity);

  const repeatInfo = calculateRepeatMeals(raw.latestMeals);

  return {
    profileName: raw.profileName,
    latestDate: raw.latestDate!,
    dailyNutrition: {
      carbs: raw.latestDaily!.carbs,
      fat: raw.latestDaily!.fat,
      protein: raw.latestDaily!.protein,
      score: intensity
    },
    mood: mood,
    moodBadge: mapMoodToBadge(mood),
    repeatInfo: repeatInfo,
    14dayTrend: {
      carbs: raw.trend14Day.carbs,
      fat: raw.trend14Day.fat,
      protein: raw.trend14Day.protein
    },
    availableContext: {
      vectorTitles: raw.vectorTitles,
      cgmCount: raw.cgmCount,
      mealReviewCount: raw.mealReviewCount
    }
  };
}

/**
 * Calculates repeat meal info from latest meals
 */
function calculateRepeatMeals(meals: MealSummary[]) {
  const foodNames = extractFoodNamesFromMeals(meals);
  const repeatCount = calculateRepeatCount(foodNames, meals);
  const avgCalories = calculateAvgCalories(meals);

  const mostFrequentMealType = meals[0]?.mealType || 'unknown';

  return {
    foodNames: foodNames,
    count: repeatCount || 1,  // Minimum 1 if there are foods
    mostFrequentMealType: mostFrequentMealType,
    avgCalories: avgCalories
  };
}

/**
 * Generates narrative using Sato Narrator
 */
async function narrateMealGreeting(
  data: EmotionalGreetingData
): Promise<{ narrative: string; emotion: any; voice: any; questionOrOffer?: string }> {
  // This is a placeholder - actual implementation would use satoNarratorService
  // For now, we'll return basic narrative

  const mood = data.mood;
  const foodNames = data.repeatInfo.foodNames.join(', ');

  let narrative = '';
  let questionOrOffer = '';

  if (mood === 'calm') {
    narrative = `Your ${foodNames} feel... calm and steady. You've explored these foods ${data.repeatInfo.count} time${data.repeatInfo.count > 1 ? 's' : ''} before. Your meals have a calm rhythm.`;
  } else if (mood === 'curied') {
    narrative = `Your ${foodNames} feel... interesting and unexpected. This is your ${data.repeatInfo.count}rd time with this combination. Something in your nutrition feels inquisitive today.`;
    questionOrOffer = 'Would you like to see what happened last time you ate these foods?';
  } else if (mood === 'excited') {
    narrative = `Your ${foodNames} feel... energetic and impactful. Your meals have some kick this time. ${build14DayContext(data)}`;
  } else {  // surprised
    narrative = `Your ${foodNames} feel... a surprising outcome. Not quite what you might expect from your pattern. ${build14DayContext(data)}`;
  }

  return {
    narrative,
    emotion: mood,
    voice: mood,
    questionOrOffer
  };
}

/**
 * Builds 14-day trend context for narrative
 */
function build14DayContext(data: EmotionalGreetingData): string {
  const { carbs, fat } = data.14dayTrend;

  if (carbs > 250 || fat > 100) {
    return 'Your 14-day pattern shows higher intake.';
  }

  if (carbs < 150 || fat < 50) {
    return 'Your 14-day pattern shows lighter meals.';
  }

  return '';
}