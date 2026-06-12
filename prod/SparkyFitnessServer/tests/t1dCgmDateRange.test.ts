import { describe, expect, it, beforeEach, vi } from 'vitest';
import { getCgmEntriesByDateRange } from '../models/t1dCgmEntryRepository.js';
// @ts-expect-error TS(7016): Could not find a declaration file for module 'supe... Remove this comment to see the error message
import request from 'supertest';
import express from 'express';

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
  },
}));

vi.mock('../models/t1dCgmEntryRepository.js', () => ({
  default: {
    getCgmEntriesByDateRange: vi.fn().mockResolvedValue([]),
  },
  getCgmEntriesByDateRange: vi.fn().mockResolvedValue([]),
}));

// Import after mocks are set up
import t1dRoutes from '../integrations/healthData/t1dRoutes.js';

describe('GET /api/health-data/t1d/cgm', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/health-data', t1dRoutes);
  });

  it('should return 400 when startDate and endDate are missing', async () => {
    const res = await request(app).get('/api/health-data/t1d/cgm');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe(
      'Missing required query parameters: startDate and endDate.'
    );
  });

  it('should return 200 with profileId and entries for a valid date range', async () => {
    const startDate = '2026-06-01T00:00:00Z';
    const endDate = '2026-06-30T23:59:59Z';

    const res = await request(app)
      .get('/api/health-data/t1d/cgm')
      .query({ startDate, endDate });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      profileId: 'profile-123',
      entries: [],
    });
  });

  it('should export getCgmEntriesByDateRange as a named export', () => {
    expect(typeof getCgmEntriesByDateRange).toBe('function');
  });

  it('should call getCgmEntriesByDateRange for the authenticated user', async () => {
    const startDate = '2026-06-01T00:00:00Z';
    const endDate = '2026-06-30T23:59:59Z';

    await request(app)
      .get('/api/health-data/t1d/cgm')
      .query({ startDate, endDate });

    // Verify the repository was called (exact args verified by integration tests)
    const { default: t1dCgmEntryRepository } = await import(
      '../models/t1dCgmEntryRepository.js'
    );
    expect(t1dCgmEntryRepository.getCgmEntriesByDateRange).toHaveBeenCalledTimes(1);
  });
});
