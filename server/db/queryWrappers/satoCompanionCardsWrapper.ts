// sparky-bloom/server/db/queryWrappers/satoCompanionCardsWrapper.ts

/**
 * Sato Companion Cards Wrapper
 *
 * Wraps the existing companionCardsFromData to add emotional shaping
 * to card payloads.
 */

import { companionCardsFromData } from '../../services/t1dCompanionService.js';
import type {
  CompanionIntent,
  EmotionalCard,
  SatoCardsResponse,
  RawCompanionContext
} from '../../types/sato.js';
import { getSatoGreeting } from './satoCompanionIntentWrapper.js';
import { filterEssentialCards, getAllCards, identifyCardKind } from '../../utils/satoFilters.js';
import { mapForecastToMood, mapForecastToBadge } from '../../utils/moodBadgeMapper.js';
import { mapMealMemoryToMood, mapMealMemoryToBadge } from '../../utils/moodBadgeMapper.js';
import { mapFoodEvidenceToMood, mapFoodEvidenceToBadge } from '../../utils/moodBadgeMapper.js';
import { parseCardPayload } from './cardPayloadParser.js';

/**
 * Gets Sato-enriched cards for a user
 * @param intent - Companion intent
 * @param text - User input text
 * @param rawContext - Raw companion context
 * @param rawCards - Raw cards from existing layer
 * @param greeting - Emotional greeting (optional, will be generated if not provided)
 */
export async function getSatoCards(
  intent: CompanionIntent,
  text: string,
  rawContext: RawCompanionContext,
  rawCards: string[],
  greeting?: any
): Promise<SatoCardsResponse> {
  // Step 1: Generate greeting if not provided
  if (!greeting) {
    greeting = await getSatoGreeting(rawContext.profileName, text);
  }

  // Step 2: Transform each card to Sato form
  const transformedCards = await Promise.all(
    rawCards.map(async (rawCard) => {
      const parsed = parseCardPayload(rawCard);
      const transformed = await transformCardToSatoForm(
        parsed,
        intent,
        rawContext
      );
      return transformed;
    })
  );

  // Step 3: Return Sato response
  return {
    emotion: greeting.emotion,
    moodBadge: greeting.mood_badge,
    narrative: greeting.narrative,
    questionOrOffer: greeting.questionOrOffer,
    voice: greeting.voice,
    cards: transformedCards
  };
}

/**
 * Transforms a single card to Sato form
 */
async function transformCardToSatoForm(
  card: any,
  intent: CompanionIntent,
  rawContext: RawCompanionContext
): Promise<EmotionalCard> {
  const kind = identifyCardKind(card.raw);
  let mood: any = 'curied';
  let moodBadge: any = 'amber';
  let narrative: string = '';

  switch (kind) {
    case 'parsedFoods':
      mood = 'curied';
      moodBadge = 'amber';
      narrative = generateParsedFoodsNarrative(card, rawContext);
      break;

    case 'foodEvidence':
      mood = mapFoodEvidenceToMood(card.payload);
      moodBadge = mapFoodEvidenceToBadge(card.payload);
      narrative = generateFoodEvidenceNarrative(card);
      break;

    case 'forecast':
      mood = mapForecastToMood(card.payload.forecast);
      moodBadge = mapForecastToBadge(card.payload.forecast);
      narrative = generateForecastNarrative(card);
      break;

    case 'mealMemory':
      mood = mapMealMemoryToMood(card.payload.historicalContext);
      moodBadge = mapMealMemoryToBadge(card.payload.historicalContext);
      narrative = generateMealMemoryNarrative(card);
      break;

    default:
      mood = 'curied';
      moodBadge = 'amber';
      narrative = '';
  }

  return {
    kind: kind,
    mood: mood,
    moodBadge: moodBadge,
    narrative: narrative,
    payload: card.payload
  };
}

/**
 * Generates narrative for parsed foods card
 */
function generateParsedFoodsNarrative(card: any, rawContext: any): string {
  const foods = card.payload.foods || [];
  if (foods.length === 0) return '';

  const foodNames = foods.join(', ');
  return `You logged: ${foodNames}`;
}

/**
 * Generates narrative for food evidence card
 */
function generateFoodEvidenceNarrative(card: any): string {
  const confidence = card.payload.confidence || 'medium';

  if (confidence === 'high') {
    return 'Your food identification is confident.';
  }

  if (confidence === 'medium') {
    return 'This looks like a reasonable match, but there may be some uncertainty.';
  }

  return 'Your food identification needs review.';
}

/**
 * Generates narrative for forecast card
 */
function generateForecastNarrative(card: any): string {
  const forecast = card.payload.forecast;

  if (!forecast.peak || !forecast.baseline) {
    return 'Forecast unavailable.';
  }

  const delta = forecast.peak - forecast.baseline;

  if (delta < 30) {
    return `This meal is predicted to have a ${delta > 0 ? '+' : ''}${delta} mg/dL increase.`;
  }

  if (delta >= 150) {
    return `This meal is predicted to be quite impactful (${delta} mg/dL increase).`;
  }

  return `This meal is predicted to have a ${delta > 0 ? '+' : ''}${delta} mg/dL increase.`;
}

/**
 * Generates narrative for meal memory card
 */
function generateMealMemoryNarrative(card: any): string {
  const memory = card.payload.historicalContext;

  if (!memory.similar_meals_count) {
    return 'This seems to be a new combination.';
  }

  if (memory.consistency_tier === 'high') {
    return `You've had similar meals ${memory.similar_meals_count} times. High consistency.`;
  }

  if (memory.consistency_tier === 'medium') {
    return `You've had similar meals ${memory.similar_meals_count} times. This is moderately consistent.`;
  }

  return `You've had similar meals ${memory.similar_meals_count} times. This may vary.`;
}