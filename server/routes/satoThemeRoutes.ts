import express from 'express';
import { SATO_THEME } from '@workspace/shared';

const router = express.Router();

/**
 * @swagger
 * /theme/sato:
 *   get:
 *     summary: Get the Sato skin theme contract
 *     tags: [Theme]
 *     responses:
 *       200:
 *         description: The Sato skin theme contract including palette, pigments, surfaces, and typography.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   example: Sato
 *                 version:
 *                   type: string
 *                 palette:
 *                   type: object
 *                 pigments:
 *                   type: object
 *                 surfaces:
 *                   type: object
 *                 typography:
 *                   type: object
 */
router.get('/sato', (_req, res) => {
  res.json(SATO_THEME);
});

export default router;
