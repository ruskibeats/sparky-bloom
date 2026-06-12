import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  buildSparkyHealthRecord,
  buildVectorSummaryContent,
  normalizeNightscoutEntries,
  parseNightscoutTimestamp,
  summarizeCgmEntries,
  importNightscoutBatch,
} from '../services/t1dNightscoutImportService.js';
import t1dCgmEntryRepository from '../models/t1dCgmEntryRepository.js';
import t1dProfileRepository from '../models/t1dProfileRepository.js';
import t1dVectorDocumentRepository from '../models/t1dVectorDocumentRepository.js';
import measurementService from '../services/measurementService.js';
import { embedT1DText } from '../services/t1dEmbeddingService.js';

// Mock all external dependencies
vi.mock('../models/t1dCgmEntryRepository.js', () => ({
  default: {
    upsertCgmEntries: vi.fn(),
    getCgmEntriesByDateRange: vi.fn(),
    upsertNightscoutSource: vi.fn(),
  },
}));

vi.mock('../models/t1dProfileRepository.js', () => ({
  default: {
    getProfileById: vi.fn(),
    getOrCreateProfileForSparkyUser: vi.fn(),
  },
}));

vi.mock('../models/t1dVectorDocumentRepository.js', () => ({
  default: {
    upsertVectorDocument: vi.fn(),
  },
}));

vi.mock('../services/measurementService.js', () => ({
  default: {
    processHealthData: vi.fn(),
  },
}));

vi.mock('../services/t1dEmbeddingService.js', () => ({
  embedT1DText: vi.fn(),
}));

describe('POST /api/health-data/t1d/nightscout/import — idempotency', () => {
  it('should not duplicate CGM entries when importing the same payload twice', async () => {
    // Arrange: set up mocks for two sequential imports
    const mockProfile = {
      id: 'profile-789',
      sparky_user_id: 'user-123',
      subject_type: 'sparky_user',
      display_name: 'Test T1D Profile',
      legend_key: null,
      status: 'active',
      metadata_json: { t1dPlatform: 'sparky-bloom', nightscoutEnabled: true },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const mockCgmEntry = {
      id: 'cgm-001',
      t1d_profile_id: 'profile-789',
      source: 'Test Nightscout',
      source_entry_id: 'ns-1',
      measured_at: '2026-06-12T08:30:00.000Z',
      value_mg_dl: 126,
      value_mmol_l: 6.99,
      units: 'mg/dL',
      trend: 2,
      direction: 'FortyFiveUp',
      device: 'DexcomG7',
      raw_json: {},
    };

    const mockUpsertCgmEntries = vi.mocked(t1dCgmEntryRepository.upsertCgmEntries);
    const mockGetProfileById = vi.mocked(t1dProfileRepository.getProfileById);
    const mockGetOrCreateProfile = vi.mocked(t1dProfileRepository.getOrCreateProfileForSparkyUser);
    const mockProcessHealthData = vi.mocked(measurementService.processHealthData);
    const mockUpsertVectorDoc = vi.mocked(t1dVectorDocumentRepository.upsertVectorDocument);
    const mockEmbedT1DText = vi.mocked(embedT1DText);

    // Both calls return the same profile
    mockGetOrCreateProfile.mockResolvedValue(mockProfile);
    mockProfile.id = 'profile-789';

    // First call: return the entry as if inserted; second call: return the same entry (upsert behavior)
    mockUpsertCgmEntries.mockResolvedValueOnce({
      entries: [mockCgmEntry],
      insertedCount: 1,
      duplicateCount: 0,
    });
    mockUpsertCgmEntries.mockResolvedValueOnce({
      entries: [mockCgmEntry],
      insertedCount: 0,
      duplicateCount: 1,
    });

    // getProfileById is called by importNightscoutEntries (not importNightscoutEntriesForSparkyUser)
    // but the route calls importNightscoutEntriesForSparkyUser which uses getOrCreateProfileForSparkyUser
    // Then importNightscoutEntries uses getProfileById
    mockGetProfileById.mockResolvedValue(mockProfile);

    mockProcessHealthData.mockResolvedValue({ processed: [mockCgmEntry] });

    const mockVectorDoc = {
      id: 'vec-001',
      t1d_profile_id: 'profile-789',
      domain: 'cgm',
      source_type: 'nightscout_import',
      source_id: 'nightscout:Test Nightscout:2026-06-12T08:30:00.000Z:2026-06-12T08:30:00.000Z',
      title: 'Nightscout CGM import: Test Nightscout',
      content_text: 'Nightscout CGM import for Test Nightscout.',
      metadata_json: {},
    };
    mockUpsertVectorDoc.mockResolvedValue(mockVectorDoc);

    mockEmbedT1DText.mockResolvedValue({ embedding: new Array(768).fill(0.01) });

    // We need to test through the actual service layer since the route handler
    // requires full Express middleware setup. Call importNightscoutBatch twice
    // with the same payload to verify idempotency at the service level.
    const payload = {
      entries: [
        {
          _id: 'ns-1',
          sgv: 126,
          dateString: '2026-06-12T08:30:00.000Z',
          direction: 'FortyFiveUp',
          trend: 2,
          device: 'DexcomG7',
        },
      ],
      sourceLabel: 'Test Nightscout',
      sourceId: null,
      baseUrl: null,
      importSparkyHealthMetrics: false,
      createVectorSummary: false,
    };

    // First import
    const result1 = await importNightscoutBatch({
      ...payload,
      profileId: 'profile-789',
      actorUserId: 'user-123',
    });

    // Second import — same payload
    const result2 = await importNightscoutBatch({
      ...payload,
      profileId: 'profile-789',
      actorUserId: 'user-123',
    });

    // Assert: First import inserts, second import reports duplicates
    expect(result1.normalizedCount).toBe(1);
    expect(result1.insertedCgmCount).toBe(1);
    expect(result1.duplicateCgmCount).toBe(0);
    expect(result2.normalizedCount).toBe(1);
    expect(result2.insertedCgmCount).toBe(0);
    expect(result2.duplicateCgmCount).toBe(1);

    // The summary should be identical
    expect(result1.summary).toEqual(result2.summary);
    expect(result1.summary).toEqual({
      start: '2026-06-12T08:30:00.000Z',
      end: '2026-06-12T08:30:00.000Z',
      minMgDl: 126,
      maxMgDl: 126,
      avgMgDl: 126,
    });

    // Verify upsertCgmEntries was called twice with the same data
    expect(mockUpsertCgmEntries).toHaveBeenCalledTimes(2);
    expect(mockUpsertCgmEntries.mock.calls[0][2]).toHaveLength(1);
    expect(mockUpsertCgmEntries.mock.calls[1][2]).toHaveLength(1);
  });
});

describe('t1dNightscoutImportService pure helpers', () => {
  it('normalizes Nightscout sgv/dateString entries into CGM inputs', () => {
    const result = normalizeNightscoutEntries(
      [
        {
          _id: 'ns-1',
          sgv: 126,
          dateString: '2026-06-12T08:30:00.000Z',
          direction: 'FortyFiveUp',
          trend: 2,
          device: 'DexcomG7',
        },
      ],
      'Tom Nightscout'
    );

    expect(result.errors).toEqual([]);
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({
      source: 'Tom Nightscout',
      sourceEntryId: 'ns-1',
      valueMgDl: 126,
      valueMmolL: 6.99,
      units: 'mg/dL',
      direction: 'FortyFiveUp',
      trend: 2,
      device: 'DexcomG7',
    });
    expect(result.entries[0].measuredAt.toISOString()).toBe(
      '2026-06-12T08:30:00.000Z'
    );
  });

  it('supports Nightscout numeric epoch dates', () => {
    const parsed = parseNightscoutTimestamp({
      sgv: 98,
      date: 1_781_253_000_000,
    });

    expect(parsed?.toISOString()).toBe('2026-06-12T08:30:00.000Z');
  });

  it('rejects entries missing a positive sgv', () => {
    const result = normalizeNightscoutEntries(
      [
        {
          sgv: 0,
          dateString: '2026-06-12T08:30:00.000Z',
        },
      ],
      'Nightscout'
    );

    expect(result.entries).toHaveLength(0);
    expect(result.errors[0].error).toContain('positive sgv');
  });

  it('builds Sparky BloodGlucose health records in mmol/L', () => {
    const [entry] = normalizeNightscoutEntries(
      [
        {
          sgv: 180,
          dateString: '2026-06-12T08:30:00.000Z',
        },
      ],
      'Nightscout'
    ).entries;

    expect(buildSparkyHealthRecord(entry, 'Nightscout')).toMatchObject({
      type: 'BloodGlucose',
      value: 9.99,
      source: 'Nightscout:Nightscout',
      unit: 'mmol/L',
      measurementType: 'mmol/L',
    });
  });

  it('summarizes CGM ranges and builds safety-boundary vector text', () => {
    const [first, second] = normalizeNightscoutEntries(
      [
        { sgv: 90, dateString: '2026-06-12T07:30:00.000Z' },
        { sgv: 150, dateString: '2026-06-12T08:30:00.000Z' },
      ],
      'Nightscout'
    ).entries;
    const summary = summarizeCgmEntries([first, second]);

    expect(summary).toEqual({
      start: '2026-06-12T07:30:00.000Z',
      end: '2026-06-12T08:30:00.000Z',
      minMgDl: 90,
      maxMgDl: 150,
      avgMgDl: 120,
    });
    expect(buildVectorSummaryContent('Nightscout', summary, 2)).toContain(
      'not dosing or treatment advice'
    );
  });
});

describe('importNightscoutBatch idempotency', () => {
  const mockProfile = {
    id: 'profile-uuid-123',
    sparky_user_id: 'user-uuid-456',
    subject_type: 'sparky_user',
    display_name: 'Test User',
    status: 'active',
  };

  const mockEntries = [
    {
      _id: 'ns-1',
      sgv: 126,
      dateString: '2026-06-12T08:30:00.000Z',
      direction: 'Flat',
    },
    {
      _id: 'ns-2',
      sgv: 140,
      dateString: '2026-06-12T08:35:00.000Z',
      direction: 'Flat',
    },
  ];

  const mockCgmEntries = [
    {
      id: 'cgm-uuid-1',
      t1d_profile_id: 'profile-uuid-123',
      source: 'Nightscout',
      sourceEntryId: 'ns-1',
      measuredAt: new Date('2026-06-12T08:30:00.000Z'),
      valueMgDl: 126,
      valueMmolL: 6.99,
      units: 'mg/dL',
      trend: null,
      direction: 'Flat',
      device: null,
      rawJson: {},
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 'cgm-uuid-2',
      t1d_profile_id: 'profile-uuid-123',
      source: 'Nightscout',
      sourceEntryId: 'ns-2',
      measuredAt: new Date('2026-06-12T08:35:00.000Z'),
      valueMgDl: 140,
      valueMmolL: 7.77,
      units: 'mg/dL',
      trend: null,
      direction: 'Flat',
      device: null,
      rawJson: {},
      created_at: new Date(),
      updated_at: new Date(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(t1dProfileRepository.getProfileById).mockResolvedValue(
      mockProfile as any
    );
    vi.mocked(t1dCgmEntryRepository.upsertCgmEntries).mockResolvedValue(
      mockCgmEntries as any
    );
    vi.mocked(measurementService.processHealthData).mockResolvedValue({
      processed: [],
    } as any);
    vi.mocked(embedT1DText).mockResolvedValue({
      embedding: new Array(768).fill(0.01),
      dimension: 768,
    });
    vi.mocked(
      t1dVectorDocumentRepository.upsertVectorDocument
    ).mockResolvedValue({ id: 'vec-doc-uuid' } as any);
  });

  it('returns duplicateCgmCount=0 on first import and duplicateCgmCount>0 on re-import', async () => {
    vi.mocked(t1dCgmEntryRepository.upsertCgmEntries).mockResolvedValue({
      entries: mockCgmEntries as any,
      insertedCount: 2,
      duplicateCount: 0,
    });

    const firstResult = await importNightscoutBatch({
      profileId: 'profile-uuid-123',
      entries: mockEntries as any,
      sourceLabel: 'Nightscout',
      actorUserId: 'user-uuid-456',
    });

    expect(firstResult.normalizedCount).toBe(2);
    expect(firstResult.insertedCgmCount).toBe(2);
    expect(firstResult.duplicateCgmCount).toBe(0);
    expect(firstResult.summary).toEqual({
      start: '2026-06-12T08:30:00.000Z',
      end: '2026-06-12T08:35:00.000Z',
      minMgDl: 126,
      maxMgDl: 140,
      avgMgDl: 133,
    });

    vi.mocked(t1dCgmEntryRepository.upsertCgmEntries).mockResolvedValue({
      entries: mockCgmEntries as any,
      insertedCount: 0,
      duplicateCount: 2,
    });

    const secondResult = await importNightscoutBatch({
      profileId: 'profile-uuid-123',
      entries: mockEntries as any,
      sourceLabel: 'Nightscout',
      actorUserId: 'user-uuid-456',
    });

    expect(secondResult.normalizedCount).toBe(2);
    expect(secondResult.insertedCgmCount).toBe(0);
    expect(secondResult.duplicateCgmCount).toBe(2);
    expect(secondResult.summary).toEqual(firstResult.summary);
  });
});
