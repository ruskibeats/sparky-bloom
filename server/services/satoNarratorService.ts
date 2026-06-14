// sparky-bloom/server/services/satoNarratorService.ts

/**
 * Sato Narrator Service
 *
 * Provides narrative generation using LLM for complex cases.
 * For simple cases, uses template-based narratives.
 */

import fs from 'fs/promises';
import { callLLM } from '../integrations/ollama.js';
import type {
  NarrateMealGreetingRequest,
  NarrateMealGreetingResponse,
  EmotionalGreetingData
} from '../types/sato.js';

/**
 * Maximum complexity score for template fallback
 * If complexity > 0.7, use LLM instead of templates
 */
const COMPLEXITY_THRESHOLD = 0.7;

/**
 * Reads the companion system prompt from file
 */
async function readCompanionSystemPrompt(): Promise<string> {
  try {
    const prompt = await fs.readFile('/root/tld-v2/prompts/companion_system.txt', 'utf-8');
    return prompt;
  } catch (error) {
    console.error('Failed to read companion system prompt:', error);
    return '';
  }
}

/**
 * Calculates complexity score for atlas query
 */
export function calculateAtlasComplexity(matchedFoods: any[]): number {
  let score = 0;

  // High food count = more complex
  if (matchedFoods.length >= 5) score += 0.2;

  // Mixed similarity = more complex
  const avgSimilarity = matchedFoods.reduce((sum, f) => sum + f.similarity, 0) / matchedFoods.length;
  if (avgSimilarity < 0.6) score += 0.2;

  // Mixed delta ranges = more complex
  const avgDelta = matchedFoods.reduce((sum, f) => sum + (f.avgDelta || 0), 0) / matchedFoods.length;
  if (avgDelta > 100) score += 0.2;

  return Math.min(score, 1.0);
}

/**
 * Generates greeting for Sato companion
 */
export async function narrateMealGreeting(
  request: NarrateMealGreetingRequest
): Promise<NarrateMealGreetingResponse> {
  const systemPrompt = await readCompanionSystemPrompt();

  if (!systemPrompt) {
    // Fallback if prompt file doesn't exist
    return {
      headline: '',
      narrative: `Good morning, ${request.profileName}. Your meals feel ${request.mood}.`,
      emotion: request.mood,
      voice: request.mood
    };
  }

  // Build user message with personal context
  const userMessage = buildGreetingMessage(request);

  // Call LLM
  const response = await callLLM(
    systemPrompt,
    userMessage,
    'deepseek-r1',
    2048
  );

  return parseGreetingResponse(response);
}

/**
 * Builds greeting message for LLM
 */
function buildGreetingMessage(request: NarrateMealGreetingRequest): string {
  const repeatInfo = request.repeatInfo;
  const nutrients = request.dailyNutrition;
  const mood = request.mood;

  let narrative = '';

  if (mood === 'calm') {
    narrative = `Your latest meal on ${request.latestDate} (${request.profileName}) feels... ${MOOD_PHRASES.calm}. `;
    narrative += repeatInfo.foodNames.length > 0
      ? `You've explored these foods ${repeatInfo.count} time${repeatInfo.count > 1 ? 's' : ''} before. `
      : '';
    narrative += `Your meals have a calm rhythm. ${buildContextInfo(request)}`;
  } else if (mood === 'curied') {
    narrative = `Your latest meal on ${request.latestDate} (${request.profileName}) feels... ${MOOD_PHRASES.curied}. `;
    narrative += repeatInfo.foodNames.length > 0
      ? `This is your ${repeatInfo.count}rd time with these combinations. `
      : '';
    narrative += `Something in your nutrition feels inquisitive today. ${buildContextInfo(request)}`;
  } else if (mood === 'excited') {
    narrative = `Your latest meal on ${request.latestDate} (${request.profileName}) feels... ${MOOD_PHRASES.excited}. `;
    narrative += `Your meals have some energy and impact. ${buildContextInfo(request)}`;
  } else {  // surprised
    narrative = `Your latest meal on ${request.latestDate} (${request.profileName}) feels... ${MOOD_PHRASES.surprised}. `;
    narrative += `It's ${MOOD_EMOTIONAL.surprised} — not quite what you'd expect. ${buildContextInfo(request)}`;
  }

  return narrative;
}

/**
 * Builds context information for narrative
 */
function buildContextInfo(request: NarrateMealGreetingRequest): string {
  const context = [];

  if (request.availableContext.vectorTitles && request.availableContext.vectorTitles.length > 0) {
    context.push(`You have memory of: ${request.availableContext.vectorTitles.slice(0, 3).join(', ')}`);
  }

  if (request.availableContext.cgmCount > 0) {
    context.push(`You have ${request.availableContext.cgmCount} CGM readings.`);
  }

  if (request.availableContext.mealReviewCount > 0) {
    context.push(`You've reviewed ${request.availableContext.mealReviewCount} meals.`);
  }

  return context.length > 0 ? context.join(' ') : '';
}

/**
 * Parses LLM greeting response
 */
function parseGreetingResponse(response: string): NarrateMealGreetingResponse {
  try {
    // Try to parse JSON response first
    const parsed = JSON.parse(response);
    return {
      headline: parsed.headline || '',
      narrative: parsed.narrative || '',
      emotion: parsed.emotion || 'curied',
      voice: parsed.voice || 'warm'
    };
  } catch (error) {
    // Fallback: extract emotion from response
    let emotion = 'curied';

    if (response.toLowerCase().includes('calm')) emotion = 'calm';
    else if (response.toLowerCase().includes('excited')) emotion = 'excited';
    else if (response.toLowerCase().includes('surprised')) emotion = 'surprised';

    return {
      headline: '',
      narrative: response,
      emotion,
      voice: emotion
    };
  }
}

// ============================================================================
// MOOD PHRASES
// ============================================================================

const MOOD_PHRASES = {
  calm: 'calm and steady',
  curied: 'interesting and unexpected',
  excited: 'energetic and impactful',
  surprised: 'a surprising outcome'
};

const MOOD_EMOTIONAL = {
  calm: 'grounded',
  curied: 'inquisitive',
  excited: 'alive',
  surprised: 'alarming'
};

// ============================================================================
// LLM CALL WRAPPER
// ============================================================================

/**
 * Calls Ollama LLM for narrative generation
 * Note: This will need to be replaced with actual LLM integration
 */
async function callLLM(
  systemPrompt: string,
  userMessage: string,
  model: string,
  maxTokens: number
): Promise<string> {
  // Placeholder - actual implementation would use Ollama SDK or similar
  // This is a stub for development
  return JSON.stringify({
    headline: '',
    narrative: userMessage,
    emotion: 'curied',
    voice: 'warm'
  });
}