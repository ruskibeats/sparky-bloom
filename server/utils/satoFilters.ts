// sparky-bloom/server/utils/satoFilters.ts

/**
 * Sato Filters
 *
 * Filters and curates companion cards for the Sato emotional presentation layer.
 * Keeps only essential cards (Foods, Forecast, Meal Memory) and hides technical
 * cards (What If, Monitoring, Confidence, Pattern Genome).
 */

import type { CardKind } from '../types/sato.js';

/**
 * Essential cards for Sato view (high-level emotional greeting)
 */
const ESSENTIAL_CARD_KINDS: CardKind[] = [
  'parsedFoods',
  'foodEvidence',
  'forecast',
  'mealMemory'
];

/**
 * Technical cards that are hidden in Sato view but shown in Nerd Stats
 */
const TECHNICAL_CARD_KINDS: CardKind[] = [
  'whatIfScenarios',
  'monitoring',
  'confidence',
  'patternGenome'
];

/**
 * Determines if a card is essential for Sato view
 */
export function isEssentialCard(cardKind: CardKind): boolean {
  return ESSENTIAL_CARD_KINDS.includes(cardKind);
}

/**
 * Determines if a card is technical (hidden in Sato view)
 */
export function isTechnicalCard(cardKind: CardKind): boolean {
  return TECHNICAL_CARD_KINDS.includes(cardKind);
}

/**
 * Filters raw cards to keep only essential cards for Sato view
 */
export function filterEssentialCards(rawCards: string[]): string[] {
  return rawCards.filter(rawCard => {
    const kind = identifyCardKind(rawCard);
    return isEssentialCard(kind);
  });
}

/**
 * Gets all cards (returns all cards for nerd stats view)
 */
export function getAllCards(rawCards: string[]): string[] {
  return rawCards;  // Return all cards for nerd stats
}

/**
 * Converts raw card string to card kind
 */
export function identifyCardKind(rawCard: string): CardKind {
  const lines = rawCard.split('\n');

  // Try to identify card type from first few lines
  if (lines[0]?.includes('━━━ Morning Call')) {
    return 'parsedFoods';
  }

  if (lines[0]?.includes('🔍')) {
    return 'foodEvidence';
  }

  if (lines[0]?.includes('📊')) {
    return 'forecast';
  }

  if (lines[0]?.includes('📜')) {
    return 'mealMemory';
  }

  if (lines[0]?.includes('💭')) {
    return 'whatIfScenarios';
  }

  if (lines[0]?.includes('⚠️') || lines[0]?.includes('MONITORING')) {
    return 'monitoring';
  }

  if (lines[0]?.includes('✅') || lines[0]?.includes('CONFIDENCE')) {
    return 'confidence';
  }

  if (lines[0]?.includes('🕸️') || lines[0]?.includes('PATTERN')) {
    return 'patternGenome';
  }

  return 'parsedFoods';  // Default fallback
}

/**
 * Checks if card has content (non-empty)
 */
export function hasCardContent(rawCard: string): boolean {
  const trimmed = rawCard.trim();
  return trimmed.length > 0 && !trimmed.startsWith('\n━━━');
}