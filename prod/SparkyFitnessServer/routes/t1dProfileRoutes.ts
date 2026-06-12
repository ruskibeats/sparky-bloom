import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import t1dProfileRepository from '../models/t1dProfileRepository.js';

const router = express.Router();

/**
 * @swagger
 * /t1d-profiles:
 *   get:
 *     summary: List T1D profiles for the authenticated user
 *     tags: [T1D Profiles]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of T1D profiles
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
 *                   sparky_user_id:
 *                     type: string
 *                     format: uuid
 *                   subject_type:
 *                     type: string
 *                     enum: [sparky_user, simulated, legend]
 *                   display_name:
 *                     type: string
 *                   legend_key:
 *                     type: string
 *                     nullable: true
 *                   status:
 *                     type: string
 *                     enum: [active, archived, disabled]
 *                   metadata_json:
 *                     type: object
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                   updated_at:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const profiles = await t1dProfileRepository.getProfilesForSparkyUser(
      req.userId
    );
    res.status(200).json(profiles);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /t1d-profiles:
 *   post:
 *     summary: Create a T1D profile for the authenticated user
 *     tags: [T1D Profiles]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               display_name:
 *                 type: string
 *                 description: Display name for the T1D profile
 *               subject_type:
 *                 type: string
 *                 enum: [sparky_user, simulated, legend]
 *               status:
 *                 type: string
 *                 enum: [active, archived, disabled]
 *               legend_key:
 *                 type: string
 *               metadata_json:
 *                 type: object
 *     responses:
 *       201:
 *         description: Profile created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 sparky_user_id:
 *                   type: string
 *                   format: uuid
 *                 subject_type:
 *                   type: string
 *                 display_name:
 *                   type: string
 *                 legend_key:
 *                   type: string
 *                   nullable: true
 *                 status:
 *                   type: string
 *                 metadata_json:
 *                   type: object
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Profile already exists for this user
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { display_name, metadata_json } = req.body;

    const profile =
      await t1dProfileRepository.getOrCreateProfileForSparkyUser(
        req.userId,
        req.userId,
        {
          display_name,
          metadata_json,
        }
      );

    res.status(201).json(profile);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /t1d-profiles/{id}:
 *   get:
 *     summary: Get a T1D profile by ID
 *     tags: [T1D Profiles]
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
 *         description: T1D profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 sparky_user_id:
 *                   type: string
 *                   format: uuid
 *                 subject_type:
 *                   type: string
 *                   enum: [sparky_user, simulated, legend]
 *                 display_name:
 *                   type: string
 *                 legend_key:
 *                   type: string
 *                   nullable: true
 *                 status:
 *                   type: string
 *                   enum: [active, archived, disabled]
 *                 metadata_json:
 *                   type: object
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - cannot access another user's profile
 *       404:
 *         description: Profile not found
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const profile = await t1dProfileRepository.getProfileById(
      req.params.id,
      req.userId
    );
    if (!profile) {
      return res.status(404).json({ message: 'T1D profile not found.' });
    }
    // Enforce ownership: reject cross-user access
    if (
      profile.sparky_user_id !== null &&
      profile.sparky_user_id !== req.userId
    ) {
      return res
        .status(403)
        .json({ message: 'You do not have access to this T1D profile.' });
    }
    res.status(200).json(profile);
  } catch (error) {
    next(error);
  }
});

export default router;
