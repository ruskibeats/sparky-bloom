// sparky-bloom/server/routes/t1dSatoRoutes.ts

/**
 * Sato API Routes
 *
 * Sato-aware endpoints for the emotional greeting layer.
 * These endpoints provide Sato-enriched companion responses.
 */

import express, { Request, Response } from 'express';
import { getSatoGreeting } from '../services/t1dCompanionService.js';
import { companionCardsFromData } from '../services/t1dCompanionService.js';
import { getSatoCards } from '../db/queryWrappers/satoCompanionCardsWrapper.js';
import { getCompanionDataContext } from '../services/t1dCompanionService.js';
import type { CompanionIntent } from '../services/t1dCompanionService.js';
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
router.get('/sato/greeting', async (req: Request, res: Response) => {
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
router.post('/sato/cards', async (req: Request, res: Response) => {
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
router.get('/sato/atlas/memory', async (req: Request, res: Response) => {
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
 * POST /api/t1d/sato/atlas/explorer
 *
 * Interactive atlas explorer endpoint (future-proofing).
 *
 * Body:
 * - query: Food query string
 * - mode: Explorer mode (comprehensive, simple, detailed)
 */
router.post('/sato/atlas/explorer', async (req: Request, res: Response) => {
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

export default router;