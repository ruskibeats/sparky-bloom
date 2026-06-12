import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import { ImportNightscoutCgmBodySchema } from '../schemas/t1dNightscoutSchema.js';
import t1dNightscoutImportService from '../services/t1dNightscoutImportService.js';
import t1dProfileRepository from '../models/t1dProfileRepository.js';

const router = express.Router();

/**
 * @swagger
 * /t1d/cgm/nightscout/import:
 *   post:
 *     summary: Import CGM entries from Nightscout
 *     tags: [T1D Nightscout]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entries
 *             properties:
 *               entries:
 *                 type: array
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
 *                     trend:
 *                       type: number
 *                     device:
 *                       type: string
 *               sourceLabel:
 *                 type: string
 *               sourceId:
 *                 type: string
 *               baseUrl:
 *                 type: string
 *               importSparkyHealthMetrics:
 *                 type: boolean
 *               createVectorSummary:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Nightscout CGM import completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 profileId:
 *                   type: string
 *                 sourceLabel:
 *                   type: string
 *                 normalizedCount:
 *                   type: number
 *                 insertedCgmCount:
 *                   type: number
 *                 duplicateCgmCount:
 *                   type: number
 *                 healthMetricCount:
 *                   type: number
 *                 vectorDocumentId:
 *                   type: string
 *                   nullable: true
 *                 summary:
 *                   type: object
 *                   properties:
 *                     start:
 *                       type: string
 *                     end:
 *                       type: string
 *                     minMgDl:
 *                       type: number
 *                     maxMgDl:
 *                       type: number
 *                     avgMgDl:
 *                       type: number
 *       400:
 *         description: Invalid request payload
 *       401:
 *         description: Unauthorized
 */
router.post('/nightscout/import', authenticate, async (req, res, next) => {
  try {
    const parseResult = ImportNightscoutCgmBodySchema.safeParse(req.body);

    if (!parseResult.success) {
      const formatted = parseResult.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      return res.status(400).json({
        message: 'Invalid Nightscout import payload.',
        errors: formatted,
      });
    }

    const body = parseResult.data;

    const profile = await t1dProfileRepository.getOrCreateProfileForSparkyUser(
      req.userId,
      req.userId,
      {
        metadata_json: {
          t1dPlatform: 'sparky-bloom',
          nightscoutEnabled: true,
        },
      }
    );

    const result = await t1dNightscoutImportService.importNightscoutBatch({
      profileId: profile.id,
      actorUserId: req.userId,
      entries: body.entries,
      sourceLabel: body.sourceLabel,
      sourceId: body.sourceId,
      baseUrl: body.baseUrl,
      importSparkyHealthMetrics: body.importSparkyHealthMetrics,
      createVectorSummary: body.createVectorSummary,
      embedding: body.embedding,
    });

    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
