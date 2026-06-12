import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { log } from '../config/logging.js';
import t1dProfileRepository from '../models/t1dProfileRepository.js';
import t1dForecastEnvelopeRepository from '../models/t1dForecastEnvelopeRepository.js';
import type { T1DForecastEnvelope } from '../models/t1dForecastEnvelopeRepository.js';
import { CreateForecastEnvelopeBodySchema } from '../schemas/t1dNightscoutSchema.js';

function mapEnvelopeResponse(envelope: T1DForecastEnvelope) {
  return {
    ...envelope,
    provenance: envelope.provenance_json,
  };
}

const router = express.Router();

/**
 * @swagger
 * /t1d/forecast-envelopes:
 *   get:
 *     summary: List forecast envelopes for the authenticated user
 *     tags: [T1D Forecast Envelopes]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of forecast envelopes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   t1d_profile_id:
 *                     type: string
 *                     format: uuid
 *                   run_id:
 *                     type: string
 *                   phase:
 *                     type: string
 *                     enum: [draft, forecast, review, archived]
 *                   provenance:
 *                     type: object
 *                     properties:
 *                       sourceType:
 *                         type: string
 *                         enum: [simulation, model, manual, imported_cgm, nightscout]
 *                       sourceId:
 *                         type: string
 *                       confidence:
 *                         type: number
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const profile = await t1dProfileRepository.getOrCreateProfileForSparkyUser(
      req.userId,
      req.userId
    );
    const envelopes =
      await t1dForecastEnvelopeRepository.getForecastEnvelopesByProfile(
        profile.id,
        req.userId
      );
    res.status(200).json(envelopes.map(mapEnvelopeResponse));
  } catch (error) {
    log('error', '[t1dForecastEnvelopeRoutes] List failed:', error);
    next(error);
  }
});

/**
 * @swagger
 * /t1d/forecast-envelopes/{id}:
 *   get:
 *     summary: Get a forecast envelope by ID
 *     tags: [T1D Forecast Envelopes]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Forecast envelope
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 t1d_profile_id:
 *                   type: string
 *                   format: uuid
 *                 run_id:
 *                   type: string
 *                 provenance:
 *                   type: object
 *                   properties:
 *                     sourceType:
 *                       type: string
 *                       enum: [simulation, model, manual, imported_cgm, nightscout]
 *                     sourceId:
 *                       type: string
 *                     confidence:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Forecast envelope not found
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const envelope =
      await t1dForecastEnvelopeRepository.getForecastEnvelopeById(
        req.params.id,
        req.userId
      );
    if (!envelope) {
      return res.status(404).json({ message: 'Forecast envelope not found.' });
    }
    res.status(200).json(mapEnvelopeResponse(envelope));
  } catch (error) {
    log('error', '[t1dForecastEnvelopeRoutes] Get by ID failed:', error);
    next(error);
  }
});

/**
 * @swagger
 * /t1d/forecast-envelopes:
 *   post:
 *     summary: Create a forecast envelope
 *     tags: [T1D Forecast Envelopes]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - runId
 *             properties:
 *               runId:
 *                 type: string
 *                 description: Unique run identifier
 *               phase:
 *                 type: string
 *                 enum: [draft, forecast, review, archived]
 *                 default: forecast
 *               routeRecommendation:
 *                 type: string
 *               dataMode:
 *                 type: string
 *                 enum: [demo, simulated, nightscout, manual]
 *                 default: demo
 *               sourceLabel:
 *                 type: string
 *               parsedFoods:
 *                 type: array
 *                 items:
 *                   type: object
 *               cards:
 *                 type: array
 *                 items:
 *                   type: object
 *               safety:
 *                 type: object
 *               schemaVersion:
 *                 type: string
 *                 default: mobile-card-v1
 *               provenance:
 *                 type: object
 *                 description: Provenance metadata describing where the prediction came from.
 *                 properties:
 *                   sourceType:
 *                     type: string
 *                     enum: [simulation, model, manual, imported_cgm, nightscout]
 *                   sourceId:
 *                     type: string
 *                     description: Reference to the origin (e.g., legend ID, model name)
 *                   confidence:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 1
 *     responses:
 *       201:
 *         description: Created forecast envelope
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 t1d_profile_id:
 *                   type: string
 *                   format: uuid
 *                 run_id:
 *                   type: string
 *                 provenance:
 *                   type: object
 *                   properties:
 *                     sourceType:
 *                       type: string
 *                       enum: [simulation, model, manual, imported_cgm, nightscout]
 *                     sourceId:
 *                       type: string
 *                     confidence:
 *                       type: number
 *       400:
 *         description: Invalid request payload
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticate, async (req, res, next) => {
  const parsed = CreateForecastEnvelopeBodySchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid forecast envelope payload.',
      details: parsed.error.flatten(),
    });
  }

  const body = parsed.data;

  try {
    const profile = await t1dProfileRepository.getOrCreateProfileForSparkyUser(
      req.userId,
      req.userId
    );
    const envelope = await t1dForecastEnvelopeRepository.createForecastEnvelope(
      profile.id,
      req.userId,
      {
        runId: body.runId,
        phase: body.phase,
        routeRecommendation: body.routeRecommendation,
        dataMode: body.dataMode,
        sourceLabel: body.sourceLabel,
        parsedFoods: body.parsedFoods,
        cards: body.cards,
        safety: body.safety,
        schemaVersion: body.schemaVersion,
        provenance: body.provenance,
      }
    );

    res.status(201).json(mapEnvelopeResponse(envelope));
  } catch (error) {
    log('error', '[t1dForecastEnvelopeRoutes] Create failed:', error);
    next(error);
  }
});

export default router;
