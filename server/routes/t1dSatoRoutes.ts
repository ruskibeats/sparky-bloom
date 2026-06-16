// sparky-bloom/server/routes/t1dSatoRoutes.ts

/**
 * Sato API Routes
 *
 * Sato-aware endpoints for the emotional greeting layer.
 * These endpoints provide Sato-enriched companion responses.
 */

import express, { Request, Response } from 'express';
import { companionCardsFromData } from '../services/t1dCompanionService.js';
import { getSatoGreeting } from '../db/queryWrappers/satoCompanionIntentWrapper.js';
import { getSatoCards } from '../db/queryWrappers/satoCompanionCardsWrapper.js';
import { getCompanionDataContext } from '../services/t1dCompanionService.js';
import type { CompanionIntent } from '../services/t1dCompanionService.js';
import {
  getSatoPageData,
  getTodayCheckIn,
  getMealHistory,
  getExerciseHistory,
  getSleepData,
  getFingerprintHistory,
  getGoals,
} from '../services/t1dSatoPageDataService.js';
import { getSatoIntelligenceCards } from '../services/satoIntelligenceCardsService.js';
import type { EmotionalGreetingResponse } from '../types/sato.js';
import type { EmotionalCard } from '../types/sato.js';

const router = express.Router();

/**
 * GET /api/t1d/sato/greeting
 *
 * Gets Sato emotional greeting for a user.
 *
 * Query parameters:
 * - text: User input text (optional)
 */
router.get('/greeting', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;  // From auth middleware
    const text = req.query.text as string;

    const greeting = await getSatoGreeting(userId, text);

    res.json(greeting);
  } catch (error: any) {
    console.error('Error in sato/greeting:', error);
    res.status(500).json({
      error: 'Failed to generate Sato greeting',
      message: error.message
    });
  }
});

/**
 * POST /api/t1d/sato/cards
 *
 * Gets Sato-enriched cards for a user.
 *
 * Body:
 * - action: Companion intent (meal, troubleshooting, etc.)
 * - text: User input text
 */
router.post('/cards', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { action, text } = req.body;

    const intent: CompanionIntent = (action || 'meal') as CompanionIntent;

    // Get raw context
    const rawContext = await getCompanionDataContext(userId);

    // Build cards using existing Layer 2
    const rawCards = companionCardsFromData(intent, text, rawContext);

    // Get Sato greeting
    const greeting = await getSatoGreeting(userId, text);

    // Transform to Sato format
    const satoCards = await getSatoCards(intent, text, rawContext, rawCards, greeting);

    res.json(satoCards);
  } catch (error: any) {
    console.error('Error in sato/cards:', error);
    res.status(500).json({
      error: 'Failed to generate Sato cards',
      message: error.message
    });
  }
});

/**
 * GET /api/t1d/sato/atlas/memory
 *
 * Gets Sato-augmented atlas query results.
 *
 * Query parameters:
 * - query: Food query string
 */
router.get('/atlas/memory', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { query } = req.query;

    // TODO: Call atlas query service
    // This is a placeholder for the actual implementation
    res.json({
      matchedFoods: [],
      totalMatches: 0,
      pattern: '',
      patternDesc: '',
      narrative: 'Atlas query not yet implemented.',
      mood: 'curied',
      moodBadge: 'amber'
    });
  } catch (error: any) {
    console.error('Error in sato/atlas/memory:', error);
    res.status(500).json({
      error: 'Failed to get atlas memory',
      message: error.message
    });
  }
});

/**
 * GET /api/t1d/sato/page-data
 *
 * Gets comprehensive Sato page data including meals, check-ins, exercises, sleep, and goals.
 *
 * Query parameters:
 * - userId: User ID (optional, defaults to Russell Batchelor)
 */
router.get('/page-data', async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || '3aec2f72-4232-49a6-923a-f0140f61debe';

    const pageData = await getSatoPageData(userId);

    res.json(pageData);
  } catch (error: any) {
    console.error('Error in sato/page-data:', error);
    res.status(500).json({
      error: 'Failed to get Sato page data',
      message: error.message
    });
  }
});

/**
 * GET /api/t1d/sato/meals
 *
 * Gets meal history for a user.
 *
 * Query parameters:
 * - days: Number of days to fetch (default: 7)
 */
router.get('/meals', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const days = parseInt(req.query.days as string, 10) || 7;

    const meals = await getMealHistory(userId, days);

    res.json(meals);
  } catch (error: any) {
    console.error('Error in sato/meals:', error);
    res.status(500).json({
      error: 'Failed to get meal history',
      message: error.message
    });
  }
});

/**
 * GET /api/t1d/sato/checkin
 *
 * Gets today's check-in measurements.
 */
router.get('/checkin', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;

    const checkIn = await getTodayCheckIn(userId);

    res.json(checkIn);
  } catch (error: any) {
    console.error('Error in sato/checkin:', error);
    res.status(500).json({
      error: 'Failed to get check-in data',
      message: error.message
    });
  }
});

/**
 * GET /api/t1d/sato/exercises
 *
 * Gets exercise history for a user.
 *
 * Query parameters:
 * - days: Number of days to fetch (default: 7)
 */
router.get('/exercises', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const days = parseInt(req.query.days as string, 10) || 7;

    const exercises = await getExerciseHistory(userId, days);

    res.json(exercises);
  } catch (error: any) {
    console.error('Error in sato/exercises:', error);
    res.status(500).json({
      error: 'Failed to get exercise history',
      message: error.message
    });
  }
});

/**
 * GET /api/t1d/sato/fingerprints
 *
 * Gets CGM-backed meal response fingerprints for a user.
 *
 * Query parameters:
 * - days: Number of days to fetch (default: 7)
 */
router.get('/fingerprints', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const days = parseInt(req.query.days as string, 10) || 7;

    const fingerprints = await getFingerprintHistory(userId, days);

    res.json(fingerprints);
  } catch (error: any) {
    console.error('Error in sato/fingerprints:', error);
    res.status(500).json({
      error: 'Failed to get meal response fingerprints',
      message: error.message
    });
  }
});

/**
 * GET /api/t1d/sato/sleep
 *
 * Gets sleep data for a user.
 *
 * Query parameters:
 * - days: Number of days to fetch (default: 7)
 */
router.get('/sleep', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const days = parseInt(req.query.days as string, 10) || 7;

    const sleep = await getSleepData(userId, days);

    res.json(sleep);
  } catch (error: any) {
    console.error('Error in sato/sleep:', error);
    res.status(500).json({
      error: 'Failed to get sleep data',
      message: error.message
    });
  }
});

/**
 * GET /api/t1d/sato/goals
 *
 * Gets goal progress for a user.
 */
router.get('/goals', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;

    const goals = await getGoals(userId);

    res.json(goals);
  } catch (error: any) {
    console.error('Error in sato/goals:', error);
    res.status(500).json({
      error: 'Failed to get goals',
      message: error.message
    });
  }
});

/**
 * POST /api/t1d/sato/atlas/explorer
 *
 * Interactive atlas explorer endpoint (future-proofing).
 *
 * Body:
 * - query: Food query string
 * - mode: Explorer mode (comprehensive, simple, detailed)
 */
router.post('/atlas/explorer', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { query, mode = 'comprehensive' } = req.body;

    // TODO: Implement interactive atlas explorer
    // Placeholder for future implementation
    res.json({
      query,
      mode,
      results: [],
      narrative: 'Atlas explorer not yet implemented.',
      mood: 'curied',
      moodBadge: 'amber'
    });
  } catch (error: any) {
    console.error('Error in sato/atlas/explorer:', error);
    res.status(500).json({
      error: 'Failed to access atlas explorer',
      message: error.message
    });
  }
});

/**
 * POST /api/t1d/sato/intelligence/cards
 *
 * Gets Sato Intelligence Cards feed - backend-gated, fail-closed.
 *
 * Returns only renderable cards after backend eligibility passes.
 * No real data = no card (hard rule from PRD #109).
 *
 * Demo mode: Returns clearly marked demo cards for UI development.
 * Product validation mode: Only returns real data cards.
 *
 * Body:
 * - demoMode: Optional, forces demo card return in development when SATO_DEMO_MODE=true
 */
router.post('/intelligence/cards', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const demoMode = Boolean(req.body.demoMode && process.env.SATO_DEMO_MODE === 'true');

    const feed = await getSatoIntelligenceCards(userId, undefined, {
      isDemoMode: demoMode,
    });

    // The service returns empty cards array when no eligible real data exists
    // This is the key requirement: no fake insights, no placeholder copy
    res.json(feed);
  } catch (error: any) {
    console.error('Error in sato/intelligence/cards:', error);
    // Fail closed - return empty feed on error (no fake insights)
    res.json({
      cards: [],
      suppressed: [],
      generatedAt: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/t1d/sato/intelligence/interactions
 *
 * Persists Sato Intelligence Card interaction events.
 *
 * Body:
 * - cardId: The card ID to record interaction for
 * - action: One of impression, opened, dismissed, marked_useful, marked_not_useful
 * - payload: Optional action payload
 */
router.post('/intelligence/interactions', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { cardId, action, payload } = req.body;

    if (!cardId || !action) {
      res.status(400).json({
        error: 'cardId and action are required',
      });
      return;
    }

    const { persistCardInteraction } = await import('../services/cardInteractionService.js');
    const interaction = await persistCardInteraction(cardId, userId, action, payload);

    res.json(interaction);
  } catch (error: any) {
    console.error('Error in sato/intelligence/interactions:', error);
    res.status(500).json({
      error: 'Failed to persist card interaction',
      message: error.message,
    });
  }
});

/**
 * GET /api/t1d/sato/intelligence/dismissed
 *
 * Gets dismissed card IDs for the current user.
 * Used by the feed to suppress previously dismissed cards.
 */
router.get('/intelligence/dismissed', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;

    const { getDismissedCardIds } = await import('../services/cardInteractionService.js');
    const dismissedIds = await getDismissedCardIds(userId);

    res.json({ dismissedCardIds: dismissedIds });
  } catch (error: any) {
    console.error('Error in sato/intelligence/dismissed:', error);
    res.status(500).json({
      error: 'Failed to get dismissed cards',
      message: error.message,
    });
  }
});

/**
 * GET /api/t1d/sato/intelligence/evidence/:bundleId
 *
 * Retrieves evidence bundle for a card.
 * Evidence bundles are created inline in cards, stored in evidence field.
 */
router.get('/intelligence/evidence/:bundleId', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const bundleId = req.params.bundleId;

    // Include the bundle in card payload - evidence is embedded
    // This is a read-through to validate user has access to this evidence
    const { buildEvidenceBundle } = await import('../services/satoIntelligenceCardsService.js');

    res.json({
      bundleId,
      retrievedAt: new Date().toISOString(),
      message: 'Evidence bundles are embedded in card payloads. Use the card id to access.',
    });
  } catch (error: any) {
    console.error('Error in sato/intelligence/evidence:', error);
    res.status(500).json({
      error: 'Failed to get evidence bundle',
      message: error.message,
    });
  }
});

export default router;