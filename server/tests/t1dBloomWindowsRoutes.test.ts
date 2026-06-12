import { describe, expect, it, vi, beforeEach } from 'vitest';
// @ts-expect-error TS(7016): Could not find a declaration file for module 'supertest'.
import request from 'supertest';
import express from 'express';

// Hoist mocks before any imports that use them
vi.mock('../models/t1dProfileRepository.js', () => ({
  __esModule: true,
  default: {
    getOrCreateProfileForSparkyUser: vi.fn().mockResolvedValue({
      id: 'profile-123',
      sparky_user_id: 'test-user-id',
      subject_type: 'real',
    }),
  },
}));

vi.mock('../models/t1dCgmEntryRepository.js', () => ({
  __esModule: true,
  default: {
    getCgmEntriesByDateRange: vi.fn().mockResolvedValue([
      {
        id: 'cgm-1',
        t1d_profile_id: 'profile-123',
        source: 'nightscout',
        sourceEntryId: 'ns-1',
        measuredAt: new Date('2026-06-12T08:00:00.000Z'),
        valueMgDl: 120,
        valueMmolL: 6.66,
        units: 'mg/dL',
        trend: 4,
        direction: 'Flat',
        device: 'dexcom',
        rawJson: {},
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'cgm-2',
        t1d_profile_id: 'profile-123',
        source: 'nightscout',
        sourceEntryId: 'ns-2',
        measuredAt: new Date('2026-06-12T10:00:00.000Z'),
        valueMgDl: 180,
        valueMmolL: 9.99,
        units: 'mg/dL',
        trend: 3,
        direction: 'FortyFiveUp',
        device: 'dexcom',
        rawJson: {},
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]),
  },
}));

vi.mock('../models/t1dVectorDocumentRepository.js', () => ({
  __esModule: true,
  default: {
    searchVectorDocuments: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../services/t1dEmbeddingService.js', () => ({
  __esModule: true,
  embedT1DText: vi.fn().mockResolvedValue({ embedding: new Array(768).fill(0) }),
}));

vi.mock('../services/t1dNightscoutImportService.js', () => ({
  __esModule: true,
  default: {
    importNightscoutEntriesForSparkyUser: vi.fn().mockResolvedValue({
      profileId: 'profile-123',
      sourceLabel: 'Nightscout',
      normalizedCount: 0,
      insertedCgmCount: 0,
      duplicateCgmCount: 0,
      healthMetricCount: 0,
      vectorDocumentId: null,
      summary: { start: '', end: '', minMgDl: 0, maxMgDl: 0, avgMgDl: 0 },
    }),
  },
}));

vi.mock('../routes/t1dProfileRoutes.js', () => ({
  __esModule: true,
  default: express.Router(),
}));

vi.mock('../routes/t1dForecastEnvelopeRoutes.js', () => ({
  __esModule: true,
  default: express.Router(),
}));

// Mock bloom window CGM service
vi.mock('../services/bloomWindowCgmService.js', () => ({
  __esModule: true,
  computeBloomWindowsFromCGM: vi.fn().mockReturnValue({
    profileId: 'profile-123',
    windows: [
      {
        id: 'bw-cgm-profile-123-0',
        startHour: 6,
        endHour: 8,
        label: 'Window 1 (6:00-8:00)',
        value: 0.4,
        confidence: 0.35,
        variability: 0,
        intensity: 0,
        state: 'balanced',
        pigmentKey: 'baseline',
        glucoseAvg: 120,
        glucosePeak: 120,
        rateOfChange: 'FLAT',
        dataCompleteness: 0.5,
        eventContext: 'cgm:1',
        classificationReason: 'Derived from 1 CGM reading(s)',
      },
      {
        id: 'bw-cgm-profile-123-1',
        startHour: 8,
        endHour: 10,
        label: 'Window 2 (8:00-10:00)',
        value: 0.6,
        confidence: 0.45,
        variability: 40,
        intensity: 0.4,
        state: 'balanced',
        pigmentKey: 'fastSugar',
        glucoseAvg: 150,
        glucosePeak: 180,
        rateOfChange: 'UP',
        dataCompleteness: 0.5,
        eventContext: 'cgm:2',
        classificationReason: 'Derived from 2 CGM reading(s)',
      },
      {
        id: 'bw-cgm-profile-123-2',
        startHour: 10,
        endHour: 12,
        label: 'Window 3 (10:00-12:00)',
        value: 0.4,
        confidence: 0.1,
        variability: 0,
        intensity: 0,
        state: 'balanced',
        pigmentKey: 'baseline',
        glucoseAvg: null,
        glucosePeak: null,
        rateOfChange: 'FLAT',
        dataCompleteness: 0,
        eventContext: 'no-data',
        classificationReason: 'No CGM data available for this window',
      },
    ],
  }),
}));

import t1dRoutes from '../integrations/healthData/t1dRoutes.js';
import t1dCgmEntryRepository from '../models/t1dCgmEntryRepository.js';

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  req.userId = 'test-user-id';
  next();
});
app.use('/health-data', t1dRoutes);

describe('GET /health-data/t1d/bloom-windows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns Sato-compatible Bloom windows for a date range with CGM-derived data', async () => {
    const res = await request(app)
      .get('/health-data/t1d/bloom-windows')
      .query({
        startDate: '2026-06-12T00:00:00.000Z',
        endDate: '2026-06-12T23:59:59.000Z',
        startHour: 6,
        endHour: 12,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('profileId', 'profile-123');
    expect(res.body).toHaveProperty('windows');
    expect(Array.isArray(res.body.windows)).toBe(true);
    expect(res.body.windows.length).toBeGreaterThan(0);

    // Each window matches Sato BloomWindow shape
    for (const window of res.body.windows) {
      expect(window).toHaveProperty('id');
      expect(window).toHaveProperty('startHour');
      expect(window).toHaveProperty('endHour');
      expect(window).toHaveProperty('label');
      expect(window).toHaveProperty('value');
      expect(window).toHaveProperty('confidence');
      expect(window).toHaveProperty('state');
      expect(window).toHaveProperty('pigmentKey');
      // CGM-specific fields
      expect(window).toHaveProperty('glucoseAvg');
      expect(window).toHaveProperty('glucosePeak');
      expect(window).toHaveProperty('rateOfChange');
      expect(window).toHaveProperty('dataCompleteness');
    }
  });

  it('returns 400 when startDate is missing', async () => {
    const res = await request(app)
      .get('/health-data/t1d/bloom-windows')
      .query({
        endDate: '2026-06-12T23:59:59.000Z',
        startHour: 6,
        endHour: 12,
      });

    expect(res.status).toBe(400);
  });

  it('returns 400 when endDate is missing', async () => {
    const res = await request(app)
      .get('/health-data/t1d/bloom-windows')
      .query({
        startDate: '2026-06-12T00:00:00.000Z',
        startHour: 6,
        endHour: 12,
      });

    expect(res.status).toBe(400);
  });

  it('enforces profile ownership via repository calls', async () => {
    const mockGetCgm = vi.mocked(t1dCgmEntryRepository.getCgmEntriesByDateRange);

    await request(app)
      .get('/health-data/t1d/bloom-windows')
      .query({
        startDate: '2026-06-12T00:00:00.000Z',
        endDate: '2026-06-12T23:59:59.000Z',
        startHour: 6,
        endHour: 12,
      });

    // Verify the repository was called with the authenticated user's ID
    expect(mockGetCgm).toHaveBeenCalledWith(
      expect.any(String),
      'test-user-id',
      expect.any(String),
      expect.any(String)
    );
  });

  it('returns summary with glucose stats', async () => {
    const res = await request(app)
      .get('/health-data/t1d/bloom-windows')
      .query({
        startDate: '2026-06-12T00:00:00.000Z',
        endDate: '2026-06-12T23:59:59.000Z',
        startHour: 6,
        endHour: 12,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('summary');
    expect(res.body.summary).toHaveProperty('totalEntries');
    expect(res.body.summary).toHaveProperty('glucoseAvg');
    expect(res.body.summary).toHaveProperty('glucosePeak');
  });

  it('accepts optional startHour and endHour params', async () => {
    const res = await request(app)
      .get('/health-data/t1d/bloom-windows')
      .query({
        startDate: '2026-06-12T00:00:00.000Z',
        endDate: '2026-06-12T23:59:59.000Z',
      });

    expect(res.status).toBe(200);
    expect(res.body.windows.length).toBeGreaterThan(0);
  });
});
