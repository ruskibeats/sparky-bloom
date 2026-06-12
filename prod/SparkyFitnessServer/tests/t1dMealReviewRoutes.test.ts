import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('../middleware/authMiddleware.js', () => ({
  authenticate: vi.fn((req, res, next) => {
    req.userId = 'user-123';
    next();
  }),
  authenticateToken: vi.fn((req, res, next) => {
    req.userId = 'user-123';
    next();
  }),
  authorizeAccess: vi.fn(() => (req: any, res: any, next: any) => {
    next();
  }),
}));

vi.mock('../models/t1dMealReviewRepository.js', () => ({
  default: {
    createMealReview: vi.fn(),
    getMealReviewById: vi.fn(),
  },
}));

vi.mock('../models/t1dProfileRepository.js', () => ({
  default: {
    getOrCreateProfileForSparkyUser: vi.fn(),
    getProfileById: vi.fn(),
    getProfilesForSparkyUser: vi.fn(),
  },
}));

import t1dMealReviewRepository from '../models/t1dMealReviewRepository.js';
import t1dMealReviewRoutes from '../routes/t1dMealReviewRoutes.js';

const mockCreateMealReview = vi.mocked(
  t1dMealReviewRepository.createMealReview
);
const mockGetMealReviewById = vi.mocked(
  t1dMealReviewRepository.getMealReviewById
);

const app = express();
app.use(express.json());
app.use('/api/t1d-meal-reviews', t1dMealReviewRoutes);

describe('T1D Meal Review Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/t1d-meal-reviews', () => {
    it('should allow an authenticated user to create a meal review', async () => {
      const mockReview = {
        id: 'review-456',
        t1d_profile_id: 'profile-789',
        legend_key: null,
        data_mode: 'demo',
        source_label: 'test',
        normalized_json: { meal: 'pizza' },
        envelope_snapshot_json: {},
        safety_json: {},
        schema_version: 'mobile-card-v1',
        copy_version: 'sparky-t1d-v1',
        data_source: 'mobile_demo',
        lifecycle_status: 'saved',
        saved_chat_thread_id: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };

      mockCreateMealReview.mockResolvedValue(mockReview);

      const res = await request(app)
        .post('/api/t1d-meal-reviews')
        .send({
          t1dProfileId: 'profile-789',
          sourceLabel: 'test',
          normalizedJson: { meal: 'pizza' },
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('review-456');
      expect(mockCreateMealReview).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          t1dProfileId: 'profile-789',
          sourceLabel: 'test',
        })
      );
    });

    it('should reject creation without t1dProfileId', async () => {
      const res = await request(app)
        .post('/api/t1d-meal-reviews')
        .send({ sourceLabel: 'test' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('t1dProfileId');
      expect(mockCreateMealReview).not.toHaveBeenCalled();
    });

    it('should reject creation with invalid dataMode', async () => {
      const res = await request(app)
        .post('/api/t1d-meal-reviews')
        .send({ t1dProfileId: 'profile-789', dataMode: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('dataMode');
      expect(mockCreateMealReview).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/t1d-meal-reviews/:id', () => {
    it('should allow an authenticated user to retrieve their own meal review', async () => {
      const mockReview = {
        id: 'review-456',
        t1d_profile_id: 'profile-789',
        legend_key: null,
        data_mode: 'demo',
        source_label: 'test',
        normalized_json: { meal: 'pizza' },
        envelope_snapshot_json: {},
        safety_json: {},
        schema_version: 'mobile-card-v1',
        copy_version: 'sparky-t1d-v1',
        data_source: 'mobile_demo',
        lifecycle_status: 'saved',
        saved_chat_thread_id: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };

      mockGetMealReviewById.mockResolvedValue(mockReview);

      const res = await request(app).get('/api/t1d-meal-reviews/review-456');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('review-456');
      expect(mockGetMealReviewById).toHaveBeenCalledWith(
        'review-456',
        'user-123'
      );
    });

    it('should return 404 when meal review not found', async () => {
      mockGetMealReviewById.mockResolvedValue(null);

      const res = await request(app).get(
        '/api/t1d-meal-reviews/nonexistent'
      );

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Meal review not found.');
    });
  });
});
