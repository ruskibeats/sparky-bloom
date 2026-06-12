import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import t1dMealReviewRepository from '../models/t1dMealReviewRepository.js';

// Safety validation constants — mirrors t1d-v2/app/ai/safety_policy.py
const BANNED_WORDS = [
  'insulin', 'bolus', 'injection', 'dose', 'deliver',
  'pump', 'basal', 'temp basal', 'tbr',
  'smb', 'microbolus', 'correction',
];

const DOSING_PATTERNS = [
  /\btake\b\s+\d+(?:\.\d+)?\s*(?:units?|u)\b/i,
  /\bgive\b\s+\d+(?:\.\d+)?\s*(?:units?|u)\b/i,
  /\binject\b\s+\d+(?:\.\d+)?\s*(?:units?|u)\b/i,
  /\bdose\b\s+\d+(?:\.\d+)?\s*(?:units?|u)\b/i,
  /\b\d+(?:\.\d+)?\s*(?:units?|u)\s+of\s+insulin\b/i,
  /\b(?:take|give|inject)\b\s+(?:a\s+)?\d+(?:\.\d+)?\s*(?:unit|u)\b/i,
  /\b(?:pre[- ]?bolus|split bolus|extended bolus|square wave)\b/i,
];

const TREATMENT_PATTERNS = [
  /\bchange\b.*\btreatment\b/i,
  /\bstop\b.*\binsulin\b/i,
  /\bdiscontinue\b.*\bmedication\b/i,
  /\bincrease\b.*\bbasal\b/i,
  /\bdecrease\b.*\bbasal\b/i,
];

interface SafetyValidationResult {
  valid: boolean;
  error?: string;
  blockedPhrases?: string[];
}

function validateSafetyJson(safetyJson: Record<string, unknown> | undefined | null): SafetyValidationResult {
  if (!safetyJson || typeof safetyJson !== 'object' || Object.keys(safetyJson).length === 0) {
    return {
      valid: false,
      error: 'safetyJson is required for meal reviews and must not be empty.',
    };
  }

  if (safetyJson.content_safety_verified !== true) {
    return {
      valid: false,
      error: 'safetyJson.content_safety_verified must be true for saved meal reviews.',
    };
  }

  const validRiskLevels = ['none', 'low', 'moderate', 'high'];
  if (!safetyJson.risk_level || !validRiskLevels.includes(safetyJson.risk_level as string)) {
    return {
      valid: false,
      error: `safetyJson.risk_level must be one of: ${validRiskLevels.join(', ')}.`,
    };
  }

  return { valid: true };
}

function checkDosingLanguage(text: string): string[] {
  const found: string[] = [];

  for (const word of BANNED_WORDS) {
    if (text.toLowerCase().includes(word)) {
      found.push(word);
    }
  }

  for (const pattern of DOSING_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      found.push(match[0]);
    }
  }

  for (const pattern of TREATMENT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      found.push(match[0]);
    }
  }

  return found;
}

function validateNoDosingContent(obj: unknown, path: string): string[] {
  const violations: string[] = [];

  if (typeof obj === 'string') {
    violations.push(...checkDosingLanguage(obj).map(v => `${path}: "${v}"`));
  } else if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      violations.push(...validateNoDosingContent(obj[i], `${path}[${i}]`));
    }
  } else if (obj !== null && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      violations.push(...validateNoDosingContent(value, `${path}.${key}`));
    }
  }

  return violations;
}

const router = express.Router();

/**
 * @swagger
 * /t1d-meal-reviews:
 *   post:
 *     summary: Create a T1D meal review
 *     tags: [T1D Meal Reviews]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - t1dProfileId
 *               - safetyJson
 *             properties:
 *               t1dProfileId:
 *                 type: string
 *                 format: uuid
 *               legendKey:
 *                 type: string
 *               dataMode:
 *                 type: string
 *                 enum: [demo, simulated, nightscout, manual]
 *               sourceLabel:
 *                 type: string
 *               normalizedJson:
 *                 type: object
 *                 description: Must not contain dosing/treatment language (e.g., insulin, bolus, units)
 *               envelopeSnapshotJson:
 *                 type: object
 *               safetyJson:
 *                 type: object
 *                 required:
 *                   - content_safety_verified
 *                   - risk_level
 *                 properties:
 *                   content_safety_verified:
 *                     type: boolean
 *                     description: Must be true for saved meal reviews
 *                   risk_level:
 *                     type: string
 *                     enum: [none, low, moderate, high]
 *                   blocked_phrases:
 *                     type: array
 *                     items:
 *                       type: string
 *                   disclaimer_required:
 *                     type: boolean
 *               schemaVersion:
 *                 type: string
 *               copyVersion:
 *                 type: string
 *               dataSource:
 *                 type: string
 *               lifecycleStatus:
 *                 type: string
 *                 enum: [draft, saved, discussed, archived]
 *               savedChatThreadId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Meal review created
 *       400:
 *         description: Invalid payload
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const {
      t1dProfileId,
      legendKey,
      dataMode,
      sourceLabel,
      normalizedJson,
      envelopeSnapshotJson,
      safetyJson,
      schemaVersion,
      copyVersion,
      dataSource,
      lifecycleStatus,
      savedChatThreadId,
    } = req.body ?? {};

    if (!t1dProfileId) {
      return res.status(400).json({
        error: 'Missing required field: t1dProfileId.',
      });
    }

    const validDataModes = ['demo', 'simulated', 'nightscout', 'manual'];
    if (dataMode && !validDataModes.includes(dataMode)) {
      return res.status(400).json({
        error: `Invalid dataMode. Must be one of: ${validDataModes.join(', ')}.`,
      });
    }

    const validLifecycleStatuses = ['draft', 'saved', 'discarded', 'archived'];
    if (lifecycleStatus && !validLifecycleStatuses.includes(lifecycleStatus)) {
      return res.status(400).json({
        error: `Invalid lifecycleStatus. Must be one of: ${validLifecycleStatuses.join(', ')}.`,
      });
    }

    // Safety validation: meal reviews must include valid safety metadata
    const safetyValidation = validateSafetyJson(
      safetyJson as Record<string, unknown> | undefined
    );
    if (!safetyValidation.valid) {
      return res.status(400).json({
        error: safetyValidation.error,
      });
    }

    // Safety validation: reject dosing/treatment language in normalizedJson
    if (normalizedJson && typeof normalizedJson === 'object') {
      const dosingViolations = validateNoDosingContent(normalizedJson, 'normalizedJson');
      if (dosingViolations.length > 0) {
        return res.status(400).json({
          error: `Meal review content contains dosing/treatment language and cannot be saved: ${dosingViolations.join(', ')}.`,
        });
      }
    }

    const review = await t1dMealReviewRepository.createMealReview(
      req.userId,
      {
        t1dProfileId,
        legendKey: legendKey ?? null,
        dataMode: dataMode ?? 'demo',
        sourceLabel: sourceLabel ?? null,
        normalizedJson: normalizedJson ?? {},
        envelopeSnapshotJson: envelopeSnapshotJson ?? {},
        safetyJson: safetyJson ?? {},
        schemaVersion: schemaVersion ?? 'mobile-card-v1',
        copyVersion: copyVersion ?? 'sparky-t1d-v1',
        dataSource: dataSource ?? 'mobile_demo',
        lifecycleStatus: lifecycleStatus ?? 'saved',
        savedChatThreadId: savedChatThreadId ?? null,
      }
    );

    return res.status(201).json(review);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /t1d-meal-reviews/{id}:
 *   get:
 *     summary: Get a T1D meal review by ID
 *     tags: [T1D Meal Reviews]
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
 *         description: Meal review
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Meal review not found
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const review = await t1dMealReviewRepository.getMealReviewById(
      req.params.id,
      req.userId
    );

    if (!review) {
      return res.status(404).json({
        message: 'Meal review not found.',
      });
    }

    return res.status(200).json(review);
  } catch (error) {
    next(error);
  }
});

export default router;
