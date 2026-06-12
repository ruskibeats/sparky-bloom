import { describe, expect, it } from 'vitest';
// @ts-expect-error TS(7016): Could not find a declaration file for module 'supe... Remove this comment to see the error message
import request from 'supertest';
import express from 'express';
import satoThemeRoutes from '../routes/satoThemeRoutes.js';

const app = express();
app.use('/theme', satoThemeRoutes);

describe('Sato Theme Routes', () => {
  describe('GET /theme/sato', () => {
    it('should return the Sato theme contract', async () => {
      const res = await request(app).get('/theme/sato');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/json/);

      const body = res.body;
      expect(body.name).toBe('Sato');
      expect(body.version).toBeTypeOf('string');
      expect(body.palette).toBeTypeOf('object');
      expect(body.pigments).toBeTypeOf('object');
      expect(body.surfaces).toBeTypeOf('object');
      expect(body.typography).toBeTypeOf('object');

      // Verify pigment metadata shape
      const pigmentKeys = [
        'slowCarb', 'fastSugar', 'fatDelay', 'proteinSteady',
        'movement', 'recovery', 'stress', 'sleepDebt',
        'settling', 'baseline', 'unknown',
      ];
      for (const key of pigmentKeys) {
        expect(body.pigments[key]).toBeDefined();
        expect(body.pigments[key].name).toBeTypeOf('string');
        expect(body.pigments[key].hex).toBeTypeOf('string');
        expect(body.pigments[key].meaning).toBeTypeOf('string');
        expect(body.pigments[key].opacityBias).toBeTypeOf('number');
        expect(body.pigments[key].spreadBias).toBeTypeOf('number');
        expect(body.pigments[key].granulationBias).toBeTypeOf('number');
      }
    });
  });
});
