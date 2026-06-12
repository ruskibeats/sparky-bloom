import { describe, expect, it, vi, beforeEach } from 'vitest';
// @ts-expect-error TS(7016): Could not find a declaration file for module 'supertest'.
import request from 'supertest';
import express from 'express';

// Hoist mocks before any imports that use them
vi.mock('../models/t1dProfileRepository.js', () => ({
  __esModule: true,
  default: {
    getOrCreateProfileForSparkyUser: vi.fn(),
  },
}));

vi.mock('../models/t1dCgmEntryRepository.js', () => ({
  __esModule: true,
  default: {
    getCgmEntriesByDateRange: vi.fn(),
  },
}));

vi.mock('../models/t1dVectorDocumentRepository.js', () => ({
  __esModule: true,
  default: {
    searchVectorDocuments: vi.fn(),
  },
}));

vi.mock('../services/t1dEmbeddingService.js', () => ({
  __esModule: true,
  embedT1DText: vi.fn(),
}));

vi.mock('../services/t1dNightscoutImportService.js', () => ({
  __esModule: true,
  default: {
    importNightscoutEntriesForSparkyUser: vi.fn(),
  },
}));

vi.mock('../routes/t1dProfileRoutes.js', () => ({
  default: express.Router(),
}));

vi.mock('../routes/t1dForecastEnvelopeRoutes.js', () => ({
  default: express.Router(),
}));

import t1dRoutes from '../integrations/healthData/t1dRoutes.js';
import t1dProfileRepository from '../models/t1dProfileRepository.js';
import t1dCgmEntryRepository from '../models/t1dCgmEntryRepository.js';

const mockGetOrCreateProfile =
  t1dProfileRepository.getOrCreateProfileForSparkyUser as ReturnType<
    typeof vi.fn
  >;
const mockGetCgmEntries =
  t1dCgmEntryRepository.getCgmEntriesByDateRange as ReturnType<
    typeof vi.fn
  >;

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.userId = 'test-user-uuid';
    next();
  });
  app.use('/health-data', t1dRoutes);
  return app;
}

describe('GET /health-data/t1d/cgm/summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('RED→GREEN: should return CGM summary metrics for a date range', async () => {
    // Arrange: mock profile + 3 entries
    const mockProfile = { id: 'profile-uuid-1' };
    const mockEntries = [
      {
        id: 'entry-1',
        t1d_profile_id: 'profile-uuid-1',
        source: 'nightscout',
        measuredAt: new Date('2026-06-12T07:30:00.000Z'),
        valueMgDl: 90,
        valueMmolL: 5.0,
        units: 'mg/dL',
        trend: null,
        direction: 'Flat',
        device: 'DexcomG7',
        rawJson: {},
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'entry-2',
        t1d_profile_id: 'profile-uuid-1',
        source: 'nightscout',
        measuredAt: new Date('2026-06-12T08:30:00.000Z'),
        valueMgDl: 150,
        valueMmolL: 8.3,
        units: 'mg/dL',
        trend: null,
        direction: 'FortyFiveUp',
        device: 'DexcomG7',
        rawJson: {},
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'entry-3',
        t1d_profile_id: 'profile-uuid-1',
        source: 'nightscout',
        measuredAt: new Date('2026-06-12T09:30:00.000Z'),
        valueMgDl: 120,
        valueMmolL: 6.7,
        units: 'mg/dL',
        trend: null,
        direction: 'Flat',
        device: 'DexcomG7',
        rawJson: {},
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    mockGetOrCreateProfile.mockResolvedValue(mockProfile as never);
    mockGetCgmEntries.mockResolvedValue(mockEntries as never);

    // Act
    const app = createTestApp();
    const res = await request(app)
      .get('/health-data/t1d/cgm/summary')
      .query({
        startDate: '2026-06-12T00:00:00.000Z',
        endDate: '2026-06-12T23:59:59.999Z',
      });

    // Debug: log error if not 200
    if (res.status !== 200) {
      console.error('CGM summary error response:', JSON.stringify(res.body, null, 2));
    }

    // Assert
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/json/);

    const body = res.body;
    expect(body.profileId).toBe('profile-uuid-1');
    expect(body.summary).toBeDefined();
    expect(body.summary.minMgDl).toBe(90);
    expect(body.summary.maxMgDl).toBe(150);
    expect(body.summary.avgMgDl).toBe(120);
    expect(body.summary.count).toBe(3);
    expect(body.summary.start).toBe('2026-06-12T07:30:00.000Z');
    expect(body.summary.end).toBe('2026-06-12T09:30:00.000Z');

    // Verify correct calls
    expect(mockGetOrCreateProfile).toHaveBeenCalledWith(
      'test-user-uuid',
      'test-user-uuid'
    );
    expect(mockGetCgmEntries).toHaveBeenCalledWith(
      'profile-uuid-1',
      'test-user-uuid',
      '2026-06-12T00:00:00.000Z',
      '2026-06-12T23:59:59.999Z'
    );
  });

  it('should return 400 when startDate or endDate is missing', async () => {
    const app = createTestApp();

    const res = await request(app)
      .get('/health-data/t1d/cgm/summary')
      .query({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe(
      'Missing required query parameters: startDate and endDate.'
    );
  });

  it('should return null summary fields when no entries exist', async () => {
    mockGetOrCreateProfile.mockResolvedValue({
      id: 'profile-uuid-2',
    } as never);
    mockGetCgmEntries.mockResolvedValue([] as never);

    const app = createTestApp();
    const res = await request(app)
      .get('/health-data/t1d/cgm/summary')
      .query({
        startDate: '2026-06-01T00:00:00.000Z',
        endDate: '2026-06-30T23:59:59.999Z',
      });

    expect(res.status).toBe(200);
    expect(res.body.summary.minMgDl).toBeNull();
    expect(res.body.summary.maxMgDl).toBeNull();
    expect(res.body.summary.avgMgDl).toBeNull();
    expect(res.body.summary.count).toBe(0);
    expect(res.body.summary.start).toBeNull();
    expect(res.body.summary.end).toBeNull();
  });
});
