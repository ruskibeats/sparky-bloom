import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import t1dOnboardingService from '../services/t1dOnboardingService.js';
import { saveT1dOnboardingBodySchema } from '../schemas/t1dOnboarding.zod.js';

const router = express.Router();

/**
 * @swagger
 * /t1d/onboarding:
 *   post:
 *     summary: Save T1D onboarding data
 *     tags: [T1D Onboarding]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               diabetes_type:
 *                 type: string
 *                 enum: [type_1, type_2, lada, gestational, other]
 *               insulin_regimen:
 *                 type: string
 *                 enum: [mdi, pump, hybrid_closed_loop, none]
 *               cgm_source:
 *                 type: string
 *                 enum: [nightscout, dexcom, libre, manual, none]
 *               carb_ratio_g_per_unit:
 *                 type: number
 *               insulin_sensitivity_factor_mg_dl_per_unit:
 *                 type: number
 *               baseline_glucose_target_mg_dl:
 *                 type: number
 *               hypo_threshold_mg_dl:
 *                 type: number
 *               hyper_threshold_mg_dl:
 *                 type: number
 *               clinician_guidance_notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: T1D onboarding data saved.
 *       400:
 *         description: Invalid request body.
 *       401:
 *         description: Unauthorized.
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.userId;
    const parseResult = saveT1dOnboardingBodySchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Invalid T1D onboarding data.',
        details: parseResult.error.flatten(),
      });
    }

    const saved = await t1dOnboardingService.saveT1dOnboarding(userId, parseResult.data);
    res.status(201).json(saved);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /t1d/onboarding:
 *   get:
 *     summary: Get T1D onboarding data for the current user
 *     tags: [T1D Onboarding]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: T1D onboarding data.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: No T1D onboarding data found.
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const userId = req.userId;
    const data = await t1dOnboardingService.getT1dOnboarding(userId);

    if (!data) {
      return res.status(404).json({ message: 'No T1D onboarding data found.' });
    }

    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /t1d/onboarding/status:
 *   get:
 *     summary: Check T1D onboarding completion status
 *     tags: [T1D Onboarding]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: T1D onboarding status.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 t1dOnboardingComplete:
 *                   type: boolean
 */
router.get('/status', authenticate, async (req, res, next) => {
  try {
    const userId = req.userId;
    const status = await t1dOnboardingService.checkT1dOnboardingStatus(userId);
    res.status(200).json(status);
  } catch (error) {
    next(error);
  }
});

export default router;
