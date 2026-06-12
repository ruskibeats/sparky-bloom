import express from 'express';
import { log } from '../../config/logging.js';
import t1dCgmEntryRepository from '../../models/t1dCgmEntryRepository.js';
import t1dProfileRepository from '../../models/t1dProfileRepository.js';
import t1dVectorDocumentRepository from '../../models/t1dVectorDocumentRepository.js';
import t1dProfileRoutes from '../../routes/t1dProfileRoutes.js';
import t1dForecastEnvelopeRoutes from '../../routes/t1dForecastEnvelopeRoutes.js';
import t1dOnboardingRoutes from '../../routes/t1dOnboardingRoutes.js';
import {
  ImportNightscoutCgmBodySchema,
  NightscoutImportRequestSchema,
  T1DVectorSearchBodySchema,
} from '../../schemas/t1dNightscoutSchema.js';
import t1dNightscoutImportService from '../../services/t1dNightscoutImportService.js';
import { embedT1DText } from '../../services/t1dEmbeddingService.js';
import { computeBloomWindowsFromCGM } from '../../services/bloomWindowCgmService.js';

const router = express.Router();

// Mount profile routes
router.use(t1dProfileRoutes);
router.use(t1dForecastEnvelopeRoutes);
router.use(t1dOnboardingRoutes);

router.post('/t1d/nightscout/import', async (req, res, next) => {
  const parsed = ImportNightscoutCgmBodySchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid Nightscout CGM import request.',
      details: parsed.error.flatten(),
    });
  }

  try {
    const importOptions = {
      ...parsed.data,
      actorUserId: req.userId,
    };
    const result =
      await t1dNightscoutImportService.importNightscoutEntriesForSparkyUser(
        req.userId,
        req.userId,
        importOptions
      );

    return res.status(201).json(result);
  } catch (error) {
    log('error', '[t1dRoutes] Nightscout import failed:', error);

    // @ts-expect-error TS(2571): Object is of type 'unknown'.
    if (error.message?.startsWith('{') && error.message?.endsWith('}')) {
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      return res.status(400).json(JSON.parse(error.message));
    }

    return next(error);
  }
});

/**
 * @swagger
 * /health-data/t1d/nightscout/validate:
 *   post:
 *     summary: Validate Nightscout import request without persisting
 *     tags: [T1D]
 *     description: |
 *       Validates a Nightscout import request payload (baseUrl, days, entries)
 *       without fetching data or persisting anything. Use this to check payload
 *       validity before attempting a full import.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - baseUrl
 *               - entries
 *             properties:
 *               baseUrl:
 *                 type: string
 *                 format: uri
 *                 description: Nightscout API base URL
 *               days:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 365
 *                 default: 90
 *                 description: Days of history to import
 *               skip:
 *                 type: integer
 *                 minimum: 0
 *                 description: Number of entries to skip (pagination)
 *               count:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 1000
 *                 description: Entries per page (pagination)
 *               entries:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - sgv
 *                   properties:
 *                     _id:
 *                       type: string
 *                     sgv:
 *                       type: number
 *                     date:
 *                       type: number
 *                     dateString:
 *                       type: string
 *                     direction:
 *                       type: string
 *                     device:
 *                       type: string
 *     responses:
 *       200:
 *         description: Payload is valid.
 *       400:
 *         description: Invalid payload with clear error details.
 */
router.post('/t1d/nightscout/validate', async (req, res, _next) => {
  const parsed = NightscoutImportRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid Nightscout import request.',
      details: parsed.error.flatten(),
    });
  }

  return res.status(200).json({
    valid: true,
    data: {
      baseUrl: parsed.data.baseUrl,
      days: parsed.data.days,
      skip: parsed.data.skip ?? null,
      count: parsed.data.count ?? null,
      entryCount: parsed.data.entries.length,
    },
  });
});

/**
 * @swagger
 * /health-data/t1d/cgm/summary:
 *   get:
 *     summary: Get CGM summary metrics for a date range
 *     tags: [T1D]
 *     description: |
 *       Returns min, max, average, count, and time-in-range metadata for CGM
 *       entries in the specified date range. Entries are scoped to the
 *       authenticated user's T1D profile via RLS.
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start of the date range (ISO 8601)
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End of the date range (ISO 8601)
 *     responses:
 *       200:
 *         description: CGM summary metrics for the date range.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 profileId:
 *                   type: string
 *                   description: T1D profile ID
 *                 summary:
 *                   type: object
 *                   properties:
 *                     minMgDl:
 *                       type: number
 *                       nullable: true
 *                     maxMgDl:
 *                       type: number
 *                       nullable: true
 *                     avgMgDl:
 *                       type: number
 *                       nullable: true
 *                     count:
 *                       type: integer
 *                     start:
 *                       type: string
 *                       nullable: true
 *                     end:
 *                       type: string
 *                       nullable: true
 *                     timeInRange:
 *                       type: object
 *                       properties:
 *                         inRange:
 *                           type: integer
 *                         belowRange:
 *                           type: integer
 *                         aboveRange:
 *                           type: integer
 *       400:
 *         description: Missing required query parameters.
 *       500:
 *         description: Server error.
 */

router.get('/t1d/cgm/summary', async (req, res, next) => {
  const { startDate, endDate } = req.query;

  if (typeof startDate !== 'string' || typeof endDate !== 'string') {
    return res.status(400).json({
      error: 'Missing required query parameters: startDate and endDate.',
    });
  }

  try {
    const profile = await t1dProfileRepository.getOrCreateProfileForSparkyUser(
      req.userId,
      req.userId
    );
    const entries = await t1dCgmEntryRepository.getCgmEntriesByDateRange(
      profile.id,
      req.userId,
      startDate,
      endDate
    );

    if (entries.length === 0) {
      return res.status(200).json({
        profileId: profile.id,
        summary: {
          minMgDl: null,
          maxMgDl: null,
          avgMgDl: null,
          count: 0,
          start: null,
          end: null,
          timeInRange: { inRange: 0, belowRange: 0, aboveRange: 0 },
        },
      });
    }

    const values = entries.map((entry: any) => entry.value_mg_dl ?? entry.valueMgDl);
    const minMgDl = Math.min(...values);
    const maxMgDl = Math.max(...values);
    const avgMgDl = Number(
      (values.reduce((sum: number, value: number) => sum + value, 0) / values.length).toFixed(1)
    );
    const sortedByTime = [...entries].sort(
      (left: any, right: any) =>
        new Date(left.measuredAt).getTime() -
        new Date(right.measuredAt).getTime()
    );

    const inRange = values.filter((v: number) => v >= 70 && v <= 180).length;
    const belowRange = values.filter((v: number) => v < 70).length;
    const aboveRange = values.filter((v: number) => v > 180).length;

    return res.status(200).json({
      profileId: profile.id,
      summary: {
        minMgDl,
        maxMgDl,
        avgMgDl,
        count: entries.length,
        start: new Date(sortedByTime[0].measuredAt).toISOString(),
        end: new Date(sortedByTime[sortedByTime.length - 1].measuredAt).toISOString(),
        timeInRange: { inRange, belowRange, aboveRange },
      },
    });
  } catch (error) {
    log('error', '[t1dRoutes] CGM summary failed:', error);
    return next(error);
  }
});

router.get('/t1d/cgm', async (req, res, next) => {
  const { startDate, endDate } = req.query;

  if (typeof startDate !== 'string' || typeof endDate !== 'string') {
    return res.status(400).json({
      error: 'Missing required query parameters: startDate and endDate.',
    });
  }

  try {
    const profile = await t1dProfileRepository.getOrCreateProfileForSparkyUser(
      req.userId,
      req.userId
    );
    const entries = await t1dCgmEntryRepository.getCgmEntriesByDateRange(
      profile.id,
      req.userId,
      startDate,
      endDate
    );

    return res.status(200).json({ profileId: profile.id, entries });
  } catch (error) {
    log('error', '[t1dRoutes] CGM fetch failed:', error);
    return next(error);
  }
});

/**
 * @swagger
 * /t1d/bloom-windows:
 *   get:
 *     summary: Get Bloom windows for a date range
 *     tags: [T1D]
 *     description: |
 *       Compute Sato-compatible Bloom windows from imported CGM data for a
 *       given date range and hour window. Windows reflect real glucose
 *       summaries derived from Nightscout/CGM import.
 *     parameters:
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start of the date range (ISO 8601).
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End of the date range (ISO 8601).
 *       - in: query
 *         name: startHour
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 0
 *           maximum: 23
 *           default: 6
 *         description: Start hour of the daily window (0-23).
 *       - in: query
 *         name: endHour
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 24
 *           default: 22
 *         description: End hour of the daily window (1-24).
 *     responses:
 *       200:
 *         description: Sato-compatible Bloom windows with glucose summary.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 profileId:
 *                   type: string
 *                   format: uuid
 *                 windows:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BloomWindow'
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalEntries:
 *                       type: integer
 *                     glucoseAvg:
 *                       type: number
 *                     glucosePeak:
 *                       type: integer
 *       400:
 *         description: Missing or invalid query parameters.
 */
router.get('/t1d/bloom-windows', async (req, res, next) => {
  const { startDate, endDate, startHour, endHour } = req.query;

  if (typeof startDate !== 'string' || typeof endDate !== 'string') {
    return res.status(400).json({
      error: 'Missing required query parameters: startDate and endDate.',
    });
  }

  const startHourNum =
    typeof startHour === 'string' ? parseInt(startHour, 10) : 6;
  const endHourNum =
    typeof endHour === 'string' ? parseInt(endHour, 10) : 22;

  if (
    isNaN(startHourNum) ||
    isNaN(endHourNum) ||
    startHourNum < 0 ||
    startHourNum > 23 ||
    endHourNum < 1 ||
    endHourNum > 24 ||
    startHourNum >= endHourNum
  ) {
    return res.status(400).json({
      error:
        'Invalid hour range: startHour (0-23) and endHour (1-24) required, startHour < endHour.',
    });
  }

  try {
    const profile =
      await t1dProfileRepository.getOrCreateProfileForSparkyUser(
        req.userId,
        req.userId
      );
    const entries = await t1dCgmEntryRepository.getCgmEntriesByDateRange(
      profile.id,
      req.userId,
      startDate,
      endDate
    );

    const result = computeBloomWindowsFromCGM({
      profileId: profile.id,
      startHour: startHourNum,
      endHour: endHourNum,
      entries: entries as any,
    });

    const values = entries.map((e: any) => e.valueMgDl);
    const summary =
      values.length > 0
        ? {
            totalEntries: entries.length,
            glucoseAvg: Number(
              (
                values.reduce((s: number, v: number) => s + v, 0) /
                values.length
              ).toFixed(1)
            ),
            glucosePeak: Math.max(...values),
          }
        : { totalEntries: 0, glucoseAvg: null, glucosePeak: null };

    return res.status(200).json({
      profileId: profile.id,
      windows: result.windows,
      summary,
    });
  } catch (error) {
    log('error', '[t1dRoutes] Bloom windows failed:', error);
    return next(error);
  }
});

/**
 * @swagger
 * /health-data/t1d/vector/search:
 *   post:
 *     summary: Search T1D vector documents
 *     tags: [T1D]
 *     description: |
 *       Search T1D vector documents by text query or embedding.
 *       Results are scoped to the authenticated user's T1D profile.
 *       Embedding is optional; if not provided, it will be generated from the query text.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 minLength: 1
 *                 description: Search query text
 *               embedding:
 *                 type: array
 *                 items:
 *                   type: number
 *                 description: Optional 768-dimensional embedding vector
 *               limit:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 50
 *                 default: 5
 *                 description: Maximum number of results
 *     responses:
 *       200:
 *         description: Vector search results scoped to the authenticated user's profile.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 profileId:
 *                   type: string
 *                   format: uuid
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Invalid request (empty query, wrong embedding dimension, invalid limit).
 */
router.post('/t1d/vector/search', async (req, res, next) => {
  const parsed = T1DVectorSearchBodySchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid T1D vector search request.',
      details: parsed.error.flatten(),
    });
  }

  try {
    const profile = await t1dProfileRepository.getOrCreateProfileForSparkyUser(
      req.userId,
      req.userId
    );
    const embedding =
      parsed.data.embedding ??
      (await embedT1DText(parsed.data.query)).embedding;
    const results = await t1dVectorDocumentRepository.searchVectorDocuments(
      profile.id,
      req.userId,
      parsed.data.query,
      embedding,
      parsed.data.limit
    );

    return res.status(200).json({ profileId: profile.id, results });
  } catch (error) {
    log('error', '[t1dRoutes] T1D vector search failed:', error);
    return next(error);
  }
});

export default router;
