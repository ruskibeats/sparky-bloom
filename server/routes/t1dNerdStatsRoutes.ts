// sparky-bloom/server/routes/t1dNerdStatsRoutes.ts

/**
 * Nerd Stats API Routes
 *
 * Provides access to all raw companion data for power users.
 * These endpoints show detailed technical information.
 */

import express, { Request, Response } from 'express';
import { companionCardsFromData } from '../services/t1dCompanionService.js';
import { getCompanionDataContext } from '../services/t1dCompanionService.js';
import type { CompanionIntent } from '../services/t1dCompanionService.js';
import type { RawCompanionContext } from '../types/sato.js';

const router = express.Router();

/**
 * POST /api/t1d/nerd-stats/cards
 *
 * Gets all raw companion cards for a user.
 * This includes all technical details, charts, and metrics.
 *
 * Body:
 * - action: Companion intent (meal, troubleshooting, etc.)
 * - text: User input text
 */
router.post('/nerd-stats/cards', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { action, text } = req.body;

    const intent: CompanionIntent = (action || 'meal') as CompanionIntent;

    // Get raw context
    const rawContext = await getCompanionDataContext(userId);

    // Build all cards using existing Layer 2
    const rawCards = companionCardsFromData(intent, text, rawContext);

    res.json({
      cards: rawCards,
      context: rawContext,
      mode: 'nerd_stats'
    });
  } catch (error: any) {
    console.error('Error in nerd-stats/cards:', error);
    res.status(500).json({
      error: 'Failed to get nerd stats cards',
      message: error.message
    });
  }
});

/**
 * GET /api/t1d/nerd-stats/charts
 *
 * Gets chart data for 14-day trends and visualizations.
 *
 * Query parameters:
 * - metric: Chart metric (calories, carbs, protein, fat, tir)
 */
router.get('/nerd-stats/charts', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { metric = 'calories' } = req.query;

    // TODO: Implement chart data generation
    // This would query the database for 14-day trend data
    res.json({
      metric,
      data: [],
      mode: 'nerd_stats'
    });
  } catch (error: any) {
    console.error('Error in nerd-stats/charts:', error);
    res.status(500).json({
      error: 'Failed to get chart data',
      message: error.message
    });
  }
});

/**
 * GET /api/t1d/nerd-stats/graphs
 *
 * Gets CGM graph data and visualizations.
 *
 * Query parameters:
 * - start_date: Start date (ISO format)
 * - end_date: End date (ISO format)
 */
router.get('/nerd-stats/graphs', async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { start_date, end_date } = req.query;

    // TODO: Implement CGM graph data generation
    res.json({
      start_date,
      end_date,
      data: [],
      mode: 'nerd_stats'
    });
  } catch (error: any) {
    console.error('Error in nerd-stats/graphs:', error);
    res.status(500).json({
      error: 'Failed to get graph data',
      message: error.message
    });
  }
});

export default router;