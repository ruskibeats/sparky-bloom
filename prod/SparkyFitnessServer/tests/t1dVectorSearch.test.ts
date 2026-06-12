import { describe, expect, it, beforeEach, vi } from 'vitest';
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
        domain: 'meal_review',
        sourceType: 'manual',
        sourceId: null,
        title: null,
        contentText: 'My lunch was fine, BG remained stable.',
        metadataJson: null,
        embedding: null,
        t1d_profile_id: 'profile-123',
        created_at: new Date('2026-01-01T00:00:00Z'),
        updated_at: new Date('2026-01-01T00:00:00Z'),
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
    expect(res.body.results[0].contentText).toContain('lunch');
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
});
