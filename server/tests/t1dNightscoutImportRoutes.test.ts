// Set required env vars BEFORE any imports that trigger auth module loading
process.env.BETTER_AUTH_SECRET =
  'dGhpcyBpcyBhIDMyIGJ5dGUgc2VjcmV0IGtleSE=';

import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock the Nightscout import service BEFORE importing routes
vi.mock('../services/t1dNightscoutImportService.js', () => ({
  default: {
    importNightscoutBatch: vi.fn(),
  },
}));

// Mock auth middleware to bypass actual auth
vi.mock('../middleware/authMiddleware.js', () => ({
  authenticate: vi.fn((req: any, res: any, next: any) => {
    const testUserId = req.headers['x-test-user-id'];
    if (testUserId === '') {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    req.userId = testUserId || 'user-123';
    req.authenticatedUserId = req.userId;
    next();
  }),
}));

// Import routes AFTER mocks are set up
import t1dNightscoutRoutes from '../routes/t1dNightscoutRoutes.js';
import t1dNightscoutImportService from '../services/t1dNightscoutImportService.js';

const mockImportNightscoutBatch = vi.mocked(
  t1dNightscoutImportService.importNightscoutBatch
);

const app = express();
app.use(express.json());
app.use('/t1d/cgm', t1dNightscoutRoutes);

describe('POST /t1d/cgm/nightscout/import', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject invalid payload with missing entries array', async () => {
    const res = await request(app)
      .post('/t1d/cgm/nightscout/import')
      .set('x-test-user-id', 'user-123')
      .send({ sourceLabel: 'Nightscout' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
    expect(res.body).toHaveProperty('errors');
    expect(res.body.errors.length).toBeGreaterThan(0);
    expect(res.body.errors[0].path).toMatch(/entries/);
  });

  it('should reject entries with missing sgv', async () => {
    const res = await request(app)
      .post('/t1d/cgm/nightscout/import')
      .set('x-test-user-id', 'user-123')
      .send({
        entries: [
          { dateString: '2026-01-01T00:00:00.000Z' },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
  });

  it('should reject entries with missing date and dateString', async () => {
    const res = await request(app)
      .post('/t1d/cgm/nightscout/import')
      .set('x-test-user-id', 'user-123')
      .send({
        entries: [
          { sgv: 120 },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('message');
  });

  it('should reject unauthenticated requests', async () => {
    const res = await request(app)
      .post('/t1d/cgm/nightscout/import')
      .set('x-test-user-id', '')
      .send({
        entries: [
          { sgv: 120, dateString: '2026-01-01T00:00:00.000Z' },
        ],
      });

    expect(res.status).toBe(401);
  });
});
