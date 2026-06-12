import { describe, expect, it } from 'vitest';
// @ts-expect-error TS(7016): Could not find a declaration file for module 'supertest'
import request from 'supertest';
import express from 'express';
import {
  NightscoutImportRequestSchema,
  ImportNightscoutCgmBodySchema,
} from '../schemas/t1dNightscoutSchema.js';

/**
 * Issue #62: Nightscout Import Validation
 *
 * TDD Guardrail #82:
 * RED → Write one failing test for validation behavior
 * GREEN → Minimal schema/validation code to pass
 * REFACTOR → Only while tests are green
 *
 * Tests verify PUBLIC BEHAVIOR: what the API returns for valid/invalid payloads.
 * Tests do NOT verify implementation details.
 */

// Mock auth middleware for API-level tests
vi.mock('../middleware/authMiddleware.js', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  authenticate: vi.fn((req: any, res: any, next: any) => {
    req.userId = 'user-123';
    next();
  }),
}));

vi.mock('../models/t1dProfileRepository.js', () => ({
  default: {
    getOrCreateProfileForSparkyUser: vi.fn().mockResolvedValue({
      id: 'profile-123',
      sparky_user_id: 'user-123',
    }),
    getProfileById: vi.fn().mockResolvedValue({
      id: 'profile-123',
      sparky_user_id: 'user-123',
      subject_type: 'sparky_user',
      display_name: 'Test User',
      status: 'active',
    }),
  },
}));

vi.mock('../models/t1dCgmEntryRepository.js', () => ({
  default: {
    upsertCgmEntries: vi.fn().mockResolvedValue({ entries: [], insertedCount: 1, duplicateCount: 0 }),
    upsertNightscoutSource: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../models/t1dVectorDocumentRepository.js', () => ({
  default: {
    upsertVectorDocument: vi.fn().mockResolvedValue({ id: 'vec-123' }),
  },
}));

vi.mock('../services/measurementService.js', () => ({
  default: {
    processHealthData: vi.fn().mockResolvedValue({ processed: [] }),
  },
}));

vi.mock('../services/t1dEmbeddingService.js', () => ({
  embedT1DText: vi.fn().mockResolvedValue({
    embedding: new Array(768).fill(0.01),
  }),
}));

// Build a minimal Express app that uses the NightscoutImportRequestSchema directly
function createValidationApp() {
  const app = express();
  app.use(express.json());

  app.post('/api/t1d/nightscout/validate', (req, res) => {
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

  return app;
}

describe('Issue #62: Nightscout Import Validation', () => {
  describe('NightscoutImportRequestSchema — valid requests', () => {
    it('accepts a valid import request with baseUrl and entries', () => {
      const result = NightscoutImportRequestSchema.safeParse({
        baseUrl: 'https://nightscout.example.com/api/v1',
        entries: [
          {
            _id: 'ns-1',
            sgv: 126,
            dateString: '2026-06-12T08:30:00.000Z',
          },
        ],
      });

      expect(result.success).toBe(true);
    });

    it('accepts a valid request with optional days and skip fields', () => {
      const result = NightscoutImportRequestSchema.safeParse({
        baseUrl: 'https://nightscout.example.com/api/v1',
        days: 30,
        skip: 0,
        count: 100,
        entries: [
          {
            _id: 'ns-1',
            sgv: 126,
            dateString: '2026-06-12T08:30:00.000Z',
          },
        ],
      });

      expect(result.success).toBe(true);
    });

    it('defaults days to 90 when not provided', () => {
      const result = NightscoutImportRequestSchema.safeParse({
        baseUrl: 'https://nightscout.example.com/api/v1',
        entries: [
          {
            _id: 'ns-1',
            sgv: 126,
            dateString: '2026-06-12T08:30:00.000Z',
          },
        ],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.days).toBe(90);
      }
    });
  });

  describe('NightscoutImportRequestSchema — missing required fields', () => {
    it('rejects when baseUrl is missing', () => {
      const result = NightscoutImportRequestSchema.safeParse({
        entries: [
          {
            _id: 'ns-1',
            sgv: 126,
            dateString: '2026-06-12T08:30:00.000Z',
          },
        ],
      });

      expect(result.success).toBe(false);
    });

    it('rejects when entries is missing', () => {
      const result = NightscoutImportRequestSchema.safeParse({
        baseUrl: 'https://nightscout.example.com/api/v1',
      });

      expect(result.success).toBe(false);
    });

    it('rejects when entries array is empty', () => {
      const result = NightscoutImportRequestSchema.safeParse({
        baseUrl: 'https://nightscout.example.com/api/v1',
        entries: [],
      });

      expect(result.success).toBe(false);
    });
  });

  describe('NightscoutImportRequestSchema — invalid field values', () => {
    it('rejects an invalid URL for baseUrl', () => {
      const result = NightscoutImportRequestSchema.safeParse({
        baseUrl: 'not-a-url',
        entries: [
          {
            _id: 'ns-1',
            sgv: 126,
            dateString: '2026-06-12T08:30:00.000Z',
          },
        ],
      });

      expect(result.success).toBe(false);
    });

    it('rejects days below minimum (1)', () => {
      const result = NightscoutImportRequestSchema.safeParse({
        baseUrl: 'https://nightscout.example.com/api/v1',
        days: 0,
        entries: [
          {
            _id: 'ns-1',
            sgv: 126,
            dateString: '2026-06-12T08:30:00.000Z',
          },
        ],
      });

      expect(result.success).toBe(false);
    });

    it('rejects days above maximum (365)', () => {
      const result = NightscoutImportRequestSchema.safeParse({
        baseUrl: 'https://nightscout.example.com/api/v1',
        days: 500,
        entries: [
          {
            _id: 'ns-1',
            sgv: 126,
            dateString: '2026-06-12T08:30:00.000Z',
          },
        ],
      });

      expect(result.success).toBe(false);
    });

    it('rejects negative skip value', () => {
      const result = NightscoutImportRequestSchema.safeParse({
        baseUrl: 'https://nightscout.example.com/api/v1',
        skip: -1,
        entries: [
          {
            _id: 'ns-1',
            sgv: 126,
            dateString: '2026-06-12T08:30:00.000Z',
          },
        ],
      });

      expect(result.success).toBe(false);
    });

    it('rejects count below minimum (1)', () => {
      const result = NightscoutImportRequestSchema.safeParse({
        baseUrl: 'https://nightscout.example.com/api/v1',
        count: 0,
        entries: [
          {
            _id: 'ns-1',
            sgv: 126,
            dateString: '2026-06-12T08:30:00.000Z',
          },
        ],
      });

      expect(result.success).toBe(false);
    });
  });

  describe('NightscoutImportRequestSchema — entry-level validation', () => {
    it('rejects entries with missing sgv', () => {
      const result = NightscoutImportRequestSchema.safeParse({
        baseUrl: 'https://nightscout.example.com/api/v1',
        entries: [
          {
            _id: 'ns-1',
            dateString: '2026-06-12T08:30:00.000Z',
          },
        ],
      });

      expect(result.success).toBe(false);
    });

    it('rejects entries with non-positive sgv', () => {
      const result = NightscoutImportRequestSchema.safeParse({
        baseUrl: 'https://nightscout.example.com/api/v1',
        entries: [
          {
            _id: 'ns-1',
            sgv: 0,
            dateString: '2026-06-12T08:30:00.000Z',
          },
        ],
      });

      expect(result.success).toBe(false);
    });

    it('rejects entries with missing both date and dateString', () => {
      const result = NightscoutImportRequestSchema.safeParse({
        baseUrl: 'https://nightscout.example.com/api/v1',
        entries: [
          {
            _id: 'ns-1',
            sgv: 126,
          },
        ],
      });

      expect(result.success).toBe(false);
    });
  });

  describe('API-level validation (supertest)', () => {
    let app: express.Application;

    beforeEach(() => {
      vi.clearAllMocks();
      app = createValidationApp();
    });

    it('returns 400 with clear error for missing baseUrl', async () => {
      const res = await request(app)
        .post('/api/t1d/nightscout/validate')
        .send({
          entries: [
            {
              _id: 'ns-1',
              sgv: 126,
              dateString: '2026-06-12T08:30:00.000Z',
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid');
      expect(res.body.details).toBeDefined();
    });

    it('returns 400 with clear error for invalid baseUrl', async () => {
      const res = await request(app)
        .post('/api/t1d/nightscout/validate')
        .send({
          baseUrl: 'not-a-url',
          entries: [
            {
              _id: 'ns-1',
              sgv: 126,
              dateString: '2026-06-12T08:30:00.000Z',
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid');
      expect(res.body.details).toBeDefined();
    });

    it('returns 400 with clear error for empty entries', async () => {
      const res = await request(app)
        .post('/api/t1d/nightscout/validate')
        .send({
          baseUrl: 'https://nightscout.example.com/api/v1',
          entries: [],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid');
      expect(res.body.details).toBeDefined();
    });

    it('returns 400 with clear error for entry missing sgv', async () => {
      const res = await request(app)
        .post('/api/t1d/nightscout/validate')
        .send({
          baseUrl: 'https://nightscout.example.com/api/v1',
          entries: [
            {
              _id: 'ns-1',
              dateString: '2026-06-12T08:30:00.000Z',
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid');
      expect(res.body.details).toBeDefined();
    });

    it('returns 400 with clear error for entry with non-positive sgv', async () => {
      const res = await request(app)
        .post('/api/t1d/nightscout/validate')
        .send({
          baseUrl: 'https://nightscout.example.com/api/v1',
          entries: [
            {
              _id: 'ns-1',
              sgv: 0,
              dateString: '2026-06-12T08:30:00.000Z',
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid');
      expect(res.body.details).toBeDefined();
    });

    it('returns 400 with clear error for entry missing both date and dateString', async () => {
      const res = await request(app)
        .post('/api/t1d/nightscout/validate')
        .send({
          baseUrl: 'https://nightscout.example.com/api/v1',
          entries: [
            {
              _id: 'ns-1',
              sgv: 126,
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid');
      expect(res.body.details).toBeDefined();
    });

    it('returns 200 for a valid import request', async () => {
      const res = await request(app)
        .post('/api/t1d/nightscout/validate')
        .send({
          baseUrl: 'https://nightscout.example.com/api/v1',
          entries: [
            {
              _id: 'ns-1',
              sgv: 126,
              dateString: '2026-06-12T08:30:00.000Z',
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
    });

    it('defaults days to 90 when not provided', async () => {
      const res = await request(app)
        .post('/api/t1d/nightscout/validate')
        .send({
          baseUrl: 'https://nightscout.example.com/api/v1',
          entries: [
            {
              _id: 'ns-1',
              sgv: 126,
              dateString: '2026-06-12T08:30:00.000Z',
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.days).toBe(90);
    });
  });

  describe('ImportNightscoutCgmBodySchema — existing body schema still works', () => {
    it('still validates the entries-only body format', () => {
      const result = ImportNightscoutCgmBodySchema.safeParse({
        entries: [
          {
            _id: 'ns-1',
            sgv: 126,
            dateString: '2026-06-12T08:30:00.000Z',
          },
        ],
      });

      expect(result.success).toBe(true);
    });

    it('rejects empty entries array', () => {
      const result = ImportNightscoutCgmBodySchema.safeParse({
        entries: [],
      });

      expect(result.success).toBe(false);
    });
  });
});
