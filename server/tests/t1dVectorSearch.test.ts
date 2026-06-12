import { describe, expect, it, beforeEach, vi } from 'vitest';
// @ts-expect-error TS(7016): Could not find a declaration file for module 'supe... Remove this comment to see the error message
import request from 'supertest';
import express from 'express';
import {
  T1DVectorSearchBodySchema,
  T1DVectorSearchResponseSchema,
} from '../schemas/t1dNightscoutSchema.js';

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

vi.mock('../models/t1dVectorDocumentRepository.js', () => ({
  default: {
    searchVectorDocuments: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../services/t1dEmbeddingService.js', () => ({
  embedT1DText: vi.fn().mockResolvedValue({
    embedding: new Array(768).fill(0.1),
    dimension: 768,
  }),
}));

// Import after mocks are set up
import t1dRoutes from '../integrations/healthData/t1dRoutes.js';
import { authenticate } from '../middleware/authMiddleware.js';

describe('POST /api/health-data/t1d/vector/search', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use(authenticate);
    app.use('/api/health-data', t1dRoutes);
  });

  it('should return 400 for empty query', async () => {
    const res = await request(app)
      .post('/api/health-data/t1d/vector/search')
      .send({ query: '', limit: 5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid T1D vector search request.');
  });

  it('should return 200 with profileId and results for a valid query', async () => {
    const { default: t1dVectorDocumentRepository } = await import(
      '../models/t1dVectorDocumentRepository.js'
    );

    const mockResults = [
      {
        id: 'doc-1',
        t1d_profile_id: 'profile-123',
        domain: 'meal_review',
        source_type: 'manual',
        source_id: null,
        title: null,
        content_text: 'My lunch was fine, BG remained stable.',
        metadata_json: null,
        embedding: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
        similarity: 0.95,
      },
    ];

    vi.mocked(t1dVectorDocumentRepository.searchVectorDocuments).mockResolvedValue(
      mockResults
    );

    const res = await request(app)
      .post('/api/health-data/t1d/vector/search')
      .send({ query: 'lunch BG stable', limit: 5 });

    expect(res.status).toBe(200);
    expect(res.body.profileId).toBe('profile-123');
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].content_text).toContain('lunch');
  });

  it('should reject invalid embedding dimension', async () => {
    const res = await request(app)
      .post('/api/health-data/t1d/vector/search')
      .send({
        query: 'test',
        embedding: [1, 2, 3, 4, 5],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid T1D vector search request.');
  });

  it('should call searchVectorDocuments with the authenticated user profile', async () => {
    const { default: t1dVectorDocumentRepository } = await import(
      '../models/t1dVectorDocumentRepository.js'
    );
    const searchMock = vi.mocked(
      t1dVectorDocumentRepository.searchVectorDocuments
    );

    await request(app)
      .post('/api/health-data/t1d/vector/search')
      .send({ query: 'test query' });

    expect(searchMock).toHaveBeenCalledTimes(1);
    const callArgs = searchMock.mock.calls[0];
    expect(callArgs[0]).toBe('profile-123');
    expect(callArgs[2]).toBe('test query');
    expect(callArgs[3]).toHaveLength(768);
    expect(callArgs[4]).toBe(5);
  });

  it('should return a response that matches T1DVectorSearchResponseSchema', async () => {
    const { default: t1dVectorDocumentRepository } = await import(
      '../models/t1dVectorDocumentRepository.js'
    );

    const mockResults = [
      {
        id: 'doc-1',
        t1d_profile_id: 'profile-123',
        domain: 'meal_review',
        source_type: 'manual',
        source_id: null,
        title: 'Test result',
        content_text: 'My lunch was fine, BG remained stable.',
        metadata_json: { source: 'test' },
        embedding: null,
        similarity: 0.95,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ];

    vi.mocked(t1dVectorDocumentRepository.searchVectorDocuments).mockResolvedValue(
      mockResults
    );

    const res = await request(app)
      .post('/api/health-data/t1d/vector/search')
      .send({ query: 'lunch BG stable', limit: 5 });

    expect(res.status).toBe(200);

    // Validate response shape against the contract schema
    const responseParse = T1DVectorSearchResponseSchema.safeParse(res.body);
    expect(responseParse.success).toBe(true);

    if (responseParse.success) {
      expect(responseParse.data.profileId).toBe('profile-123');
      expect(responseParse.data.results).toHaveLength(1);
      expect(responseParse.data.results[0].id).toBe('doc-1');
      expect(responseParse.data.results[0].t1d_profile_id).toBe('profile-123');
      expect(responseParse.data.results[0].domain).toBe('meal_review');
      expect(responseParse.data.results[0].similarity).toBe(0.95);
    }
  });

  it('should enforce profile ownership — results only from authenticated user profile', async () => {
    const { default: t1dVectorDocumentRepository } = await import(
      '../models/t1dVectorDocumentRepository.js'
    );
    const { default: t1dProfileRepository } = await import(
      '../models/t1dProfileRepository.js'
    );

    // Simulate a different user's profile
    vi.mocked(t1dProfileRepository.getOrCreateProfileForSparkyUser).mockResolvedValue({
      id: 'profile-456',
      sparky_user_id: 'user-456',
    });

    const mockResults = [
      {
        id: 'doc-2',
        t1d_profile_id: 'profile-456',
        domain: 'cgm',
        source_type: 'nightscout_import',
        source_id: null,
        title: null,
        content_text: 'CGM data for user-456.',
        metadata_json: null,
        embedding: null,
        similarity: 0.88,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ];

    vi.mocked(t1dVectorDocumentRepository.searchVectorDocuments).mockResolvedValue(
      mockResults
    );

    const res = await request(app)
      .post('/api/health-data/t1d/vector/search')
      .send({ query: 'CGM data' });

    expect(res.status).toBe(200);
    expect(res.body.profileId).toBe('profile-456');

    // All results must belong to the authenticated user's profile
    expect(
      res.body.results.every(
        (r: any) => r.t1d_profile_id === 'profile-456'
      )
    ).toBe(true);

    // Verify searchVectorDocuments was called with the correct profile
    const searchMock = vi.mocked(t1dVectorDocumentRepository.searchVectorDocuments);
    expect(searchMock.mock.calls[0][0]).toBe('profile-456');
  });

  it('should reject limit outside 1-50 range', async () => {
    const res = await request(app)
      .post('/api/health-data/t1d/vector/search')
      .send({ query: 'test', limit: 100 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid T1D vector search request.');
  });

  it('should reject missing query field', async () => {
    const res = await request(app)
      .post('/api/health-data/t1d/vector/search')
      .send({ limit: 5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid T1D vector search request.');
  });

  it('should validate T1DVectorSearchBodySchema accepts valid input', () => {
    const valid = T1DVectorSearchBodySchema.safeParse({
      query: 'overnight glucose stability',
      limit: 10,
    });
    expect(valid.success).toBe(true);
  });

  it('should validate T1DVectorSearchBodySchema rejects invalid embedding dimension', () => {
    const invalid = T1DVectorSearchBodySchema.safeParse({
      query: 'test',
      embedding: [0.1, 0.2, 0.3],
    });
    expect(invalid.success).toBe(false);
  });
});
