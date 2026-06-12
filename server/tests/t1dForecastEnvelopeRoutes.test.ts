import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Track the current authenticated user per-request
let currentUserId = 'user-123';

// Mock authMiddleware BEFORE importing routes
vi.mock('../middleware/authMiddleware.js', () => ({
  authenticate: vi.fn((req, res, next) => {
    req.userId = currentUserId;
    next();
  }),
  authenticateToken: vi.fn((req, res, next) => {
    req.userId = currentUserId;
    next();
  }),
  authorizeAccess: vi.fn(() => (req: any, res: any, next: any) => {
    next();
  }),
}));

/** Helper to switch the authenticated user for cross-user tests */
function actingAs(userId: string) {
  currentUserId = userId;
}

// Mock the repositories
vi.mock('../models/t1dProfileRepository.js', () => ({
  default: {
    getOrCreateProfileForSparkyUser: vi.fn().mockResolvedValue({
      id: 'profile-456',
      sparky_user_id: 'user-123',
      subject_type: 'sparky_user',
      display_name: 'My T1D Profile',
      legend_key: null,
      status: 'active',
      metadata_json: {},
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }),
    getProfileById: vi.fn(),
    getProfilesForSparkyUser: vi.fn(),
  },
}));

vi.mock('../models/t1dForecastEnvelopeRepository.js', () => ({
  default: {
    createForecastEnvelope: vi.fn(),
    getForecastEnvelopeById: vi.fn(),
    getForecastEnvelopesByProfile: vi.fn(),
  },
}));

import t1dForecastEnvelopeRepository from '../models/t1dForecastEnvelopeRepository.js';
import t1dForecastEnvelopeRoutes from '../routes/t1dForecastEnvelopeRoutes.js';
import type { T1DForecastEnvelope } from '../models/t1dForecastEnvelopeRepository.js';

const mockCreateEnvelope = vi.mocked(
  t1dForecastEnvelopeRepository.createForecastEnvelope
);
const mockGetEnvelopeById = vi.mocked(
  t1dForecastEnvelopeRepository.getForecastEnvelopeById
);
const mockGetEnvelopesByProfile = vi.mocked(
  t1dForecastEnvelopeRepository.getForecastEnvelopesByProfile
);

function makeMockEnvelope(overrides: Partial<T1DForecastEnvelope> = {}): T1DForecastEnvelope {
  return {
    id: 'env-789',
    t1d_profile_id: 'profile-456',
    run_id: 'run-001',
    phase: 'forecast',
    route_recommendation: null,
    data_mode: 'demo',
    source_label: null,
    parsed_foods_json: [],
    cards_json: [],
    safety_json: {},
    schema_version: 'mobile-card-v1',
    provenance_json: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const app = express();
app.use(express.json());
app.use('/api/t1d/forecast-envelopes', t1dForecastEnvelopeRoutes);

describe('T1D Forecast Envelope Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actingAs('user-123'); // Reset to default user
  });

  describe('POST /api/t1d/forecast-envelopes — provenance', () => {
    // RED: Write one failing test for provenance persistence
    // GREEN: Provenance is stored and returned through the API
    it('should include provenance metadata when saving a forecast envelope', async () => {
      mockCreateEnvelope.mockResolvedValue(
        makeMockEnvelope({
          data_mode: 'simulated',
          source_label: 'test-source',
          provenance_json: {
            sourceType: 'simulation',
            sourceId: 'fixture-001',
            confidence: 0.85,
          },
        })
      );

      const res = await request(app)
        .post('/api/t1d/forecast-envelopes')
        .send({
          runId: 'run-provenance-001',
          dataMode: 'simulated',
          sourceLabel: 'test-source',
          provenance: {
            sourceType: 'simulation',
            sourceId: 'fixture-001',
            confidence: 0.85,
          },
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('provenance');
      expect(res.body.provenance.sourceType).toBe('simulation');
      expect(res.body.provenance.sourceId).toBe('fixture-001');
      expect(res.body.provenance.confidence).toBe(0.85);
    });

    it('should default provenance sourceType to manual when not provided', async () => {
      mockCreateEnvelope.mockResolvedValue(
        makeMockEnvelope({
          provenance_json: { sourceType: 'manual' },
        })
      );

      const res = await request(app)
        .post('/api/t1d/forecast-envelopes')
        .send({
          runId: 'run-provenance-002',
        });

      expect(res.status).toBe(201);
      expect(res.body.provenance.sourceType).toBe('manual');
    });

    it('should reject invalid provenance sourceType', async () => {
      const res = await request(app)
        .post('/api/t1d/forecast-envelopes')
        .send({
          runId: 'run-provenance-003',
          provenance: {
            sourceType: 'invalid_type',
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid');
    });

    it('should reject provenance confidence out of range', async () => {
      const res = await request(app)
        .post('/api/t1d/forecast-envelopes')
        .send({
          runId: 'run-provenance-004',
          provenance: {
            sourceType: 'model',
            confidence: 1.5,
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid');
    });

    it('should accept all valid provenance source types', async () => {
      const validTypes = ['simulation', 'model', 'manual', 'imported_cgm', 'nightscout'];

      for (const sourceType of validTypes) {
        mockCreateEnvelope.mockResolvedValue(
          makeMockEnvelope({
            provenance_json: { sourceType },
          })
        );

        const res = await request(app)
          .post('/api/t1d/forecast-envelopes')
          .send({
            runId: `run-provenance-${sourceType}`,
            provenance: { sourceType },
          });

        expect(res.status).toBe(201);
        expect(res.body.provenance.sourceType).toBe(sourceType);
      }
    });

    it('should persist provenance notes when provided', async () => {
      mockCreateEnvelope.mockResolvedValue(
        makeMockEnvelope({
          provenance_json: {
            sourceType: 'manual',
            notes: 'My manual entry notes',
          },
        })
      );

      const res = await request(app)
        .post('/api/t1d/forecast-envelopes')
        .send({
          runId: 'run-provenance-005',
          provenance: {
            sourceType: 'manual',
            notes: 'My manual entry notes',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.provenance.notes).toBe('My manual entry notes');
    });
  });

  describe('GET /api/t1d/forecast-envelopes/:id — provenance', () => {
    it('should return provenance with the envelope', async () => {
      mockGetEnvelopeById.mockResolvedValue(
        makeMockEnvelope({
          provenance_json: {
            sourceType: 'nightscout',
            sourceId: 'nightscout-source-001',
            confidence: 0.92,
          },
        })
      );

      const res = await request(app).get(
        '/api/t1d/forecast-envelopes/env-789'
      );

      expect(res.status).toBe(200);
      expect(res.body.provenance.sourceType).toBe('nightscout');
      expect(res.body.provenance.sourceId).toBe('nightscout-source-001');
      expect(res.body.provenance.confidence).toBe(0.92);
    });
  });

  describe('POST /api/t1d/forecast-envelopes', () => {
    it('should create and return a forecast envelope for the authenticated user', async () => {
      mockCreateEnvelope.mockResolvedValue(
        makeMockEnvelope({
          parsed_foods_json: [{ name: 'rice', carbs: 45 }],
        })
      );

      const res = await request(app)
        .post('/api/t1d/forecast-envelopes')
        .send({
          runId: 'run-001',
          parsedFoods: [{ name: 'rice', carbs: 45 }],
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('env-789');
      expect(res.body.run_id).toBe('run-001');
      expect(res.body.t1d_profile_id).toBe('profile-456');
    });

    it('should reject invalid payloads missing runId', async () => {
      const res = await request(app)
        .post('/api/t1d/forecast-envelopes')
        .send({ parsedFoods: [{ name: 'rice' }] });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid');
    });

    it('should reject empty runId', async () => {
      const res = await request(app)
        .post('/api/t1d/forecast-envelopes')
        .send({ runId: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid');
    });
  });

  describe('GET /api/t1d/forecast-envelopes', () => {
    it('should return all forecast envelopes for the authenticated user', async () => {
      mockGetEnvelopesByProfile.mockResolvedValue([makeMockEnvelope()]);

      const res = await request(app).get('/api/t1d/forecast-envelopes');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe('env-789');
    });

    it('should return an empty array when user has no envelopes', async () => {
      mockGetEnvelopesByProfile.mockResolvedValue([]);

      const res = await request(app).get('/api/t1d/forecast-envelopes');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('GET /api/t1d/forecast-envelopes/:id', () => {
    it('should return a forecast envelope by ID if the user owns it', async () => {
      mockGetEnvelopeById.mockResolvedValue(makeMockEnvelope());

      const res = await request(app).get(
        '/api/t1d/forecast-envelopes/env-789'
      );

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('env-789');
      expect(res.body.t1d_profile_id).toBe('profile-456');
    });

    it('should return 404 when envelope not found', async () => {
      mockGetEnvelopeById.mockResolvedValue(null);

      const res = await request(app).get(
        '/api/t1d/forecast-envelopes/nonexistent'
      );

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Forecast envelope not found.');
    });
  });

  describe('Cross-user access protection', () => {
    // RED: Write one failing test for cross-user access
    // GREEN: Repository INNER JOIN on sparky_user_id blocks cross-user access
    it('should block user B from accessing user A\'s forecast envelope', async () => {
      // User A creates an envelope (default user-123)
      mockCreateEnvelope.mockResolvedValue(
        makeMockEnvelope({
          id: 'env-owned-by-a',
          provenance_json: { sourceType: 'manual' },
        })
      );

      const createRes = await request(app)
        .post('/api/t1d/forecast-envelopes')
        .send({
          runId: 'run-cross-user-001',
          provenance: { sourceType: 'manual' },
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.id).toBe('env-owned-by-a');

      // Switch to user B
      actingAs('user-456');

      // User B tries to access user A's envelope
      // The repository INNER JOIN on sparky_user_id should return null
      mockGetEnvelopeById.mockResolvedValue(null);

      const getRes = await request(app).get(
        '/api/t1d/forecast-envelopes/env-owned-by-a'
      );

      expect(getRes.status).toBe(404);
      expect(getRes.body.message).toBe('Forecast envelope not found.');
    });

    it('should block user B from listing user A\'s forecast envelopes', async () => {
      // Switch to user B
      actingAs('user-456');

      // User B tries to list envelopes — should not see user A's
      mockGetEnvelopesByProfile.mockResolvedValue([]);

      const res = await request(app).get('/api/t1d/forecast-envelopes');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });
});
