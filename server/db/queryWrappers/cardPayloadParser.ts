// sparky-bloom/server/db/queryWrappers/cardPayloadParser.ts

/**
 * Card Payload Parser
 *
 * Parses raw companion card strings into structured payloads.
 */

import type { CardKind } from '../../types/sato.js';

/**
 * Parses raw card string into structured payload
 */
export function parseCardPayload(rawCard: string) {
  const lines = rawCard.split('\n').filter(line => line.trim());

  const kind = identifyCardKind(rawCard);
  const payload = extractPayloadFromLines(lines, kind);

  return {
    kind: kind,
    raw: rawCard,
    payload: payload
  };
}

/**
 * Identifies card kind from raw card string
 */
export function identifyCardKind(rawCard: string): CardKind {
  const trimmed = rawCard.trim();

  // Morning call
  if (trimmed.includes('Morning Call') || trimmed.includes('☀️')) {
    return 'parsedFoods';
  }

  // Food evidence
  if (trimmed.includes('Food Evidence') || trimmed.includes('🔍')) {
    return 'foodEvidence';
  }

  // Forecast
  if (trimmed.includes('Forecast') || trimmed.includes('📊')) {
    return 'forecast';
  }

  // Meal memory
  if (trimmed.includes('Meal Memory') || trimmed.includes('📜')) {
    return 'mealMemory';
  }

  // What if scenarios
  if (trimmed.includes('What If') || trimmed.includes('💭')) {
    return 'whatIfScenarios';
  }

  // Monitoring
  if (trimmed.includes('Monitoring') || trimmed.includes('⚠️')) {
    return 'monitoring';
  }

  // Confidence
  if (trimmed.includes('Confidence') || trimmed.includes('✅')) {
    return 'confidence';
  }

  // Pattern genome
  if (trimmed.includes('Pattern Genome') || trimmed.includes('🕸️')) {
    return 'patternGenome';
  }

  // Default to parsed foods
  return 'parsedFoods';
}

/**
 * Extracts payload from card lines
 */
function extractPayloadFromLines(lines: string[], kind: CardKind): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  switch (kind) {
    case 'parsedFoods':
      // Extract foods from card
      const foods = lines.filter(line => line.trim() && !line.includes('━━━') && !line.includes('📊'));
      if (foods.length > 0) {
        payload.foods = foods.map(line => line.replace(/^•\s*/, '').trim());
      }
      break;

    case 'foodEvidence':
      // Extract nutrition info
      const nutritionLines = lines.filter(line =>
        line.includes('Carbs') ||
        line.includes('Protein') ||
        line.includes('Fat') ||
        line.includes('Calories') ||
        line.includes('Sugars')
      );

      nutritionLines.forEach(line => {
        const parts = line.split(/:\s*|\s+-/).map(p => p.trim());
        if (parts.length >= 2) {
          const key = parts[0];
          const valueStr = parts.slice(1).join(' ');
          const value = parseFloat(valueStr.replace(/[^\d.-]/g, '')) || valueStr;
          payload[key] = value;
        }
      });

      // Extract confidence
      const confidenceMatch = lines.find(line => line.includes('Confidence'));
      if (confidenceMatch) {
        const confidence = confidenceMatch.match(/(\d+)%|(\w+)/i);
        if (confidence) {
          payload.confidence = confidence[1] || confidence[2];
        }
      }

      break;

    case 'forecast':
      // Extract forecast data
      const peakMatch = lines.find(line => line.includes('Peak'));
      if (peakMatch) {
        const peakMatch = peakMatch.match(/(\d+)\s*mg\/dL/i);
        if (peakMatch) {
          payload.forecast = {
            peak: parseInt(peakMatch[1]),
            baseline: 142  // Default baseline
          };
        }
      }

      const timeMatch = lines.find(line => line.includes('Time to peak'));
      if (timeMatch) {
        const timeMatch = timeMatch.match(/(\d+)\s*min/i);
        if (timeMatch) {
          payload.forecast = payload.forecast || {};
          payload.forecast.time_to_peak_minutes = parseInt(timeMatch[1]);
        }
      }
      break;

    case 'mealMemory':
      // Extract meal memory data
      const similarMatch = lines.find(line => line.includes('similar'));
      if (similarMatch) {
        const similarMatch = similarMatch.match(/(\d+)/i);
        if (similarMatch) {
          payload.historicalContext = {
            similar_meals_count: parseInt(similarMatch[1])
          };
        }
      }

      const avgMatch = lines.find(line => line.includes('avg peak'));
      if (avgMatch) {
        const avgMatch = avgMatch.match(/(\d+)/i);
        if (avgMatch) {
          payload.historicalContext = payload.historicalContext || {};
          payload.historicalContext.avg_peak_rise_mg_dl = parseInt(avgMatch[1]);
        }
      }
      break;

    case 'confidence':
      // Extract confidence tier
      const confidenceLine = lines.find(line => line.includes('Confidence'));
      if (confidenceLine) {
        const confidenceMatch = confidenceLine.match(/(\d+)%|(\w+)/i);
        if (confidenceMatch) {
          payload.confidence = {
            confidence_tier: confidenceMatch[1] || confidenceMatch[2],
            consistency_score: 0.7
          };
        }
      }
      break;

    default:
      // Generic payload for other card types
      payload.kind = kind;
      payload.raw = lines.join('\n');
  }

  return payload;
}