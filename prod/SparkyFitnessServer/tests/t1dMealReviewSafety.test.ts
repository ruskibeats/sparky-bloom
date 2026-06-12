// Set required env vars BEFORE any imports that trigger auth module loading
process.env.BETTER_AUTH_SECRET =
  'dGhpcyBpcyBhIDMyIGJ5dGUgc2VjcmV0IGtleSE=';

import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock the repository BEFORE importing routes
vi.mock('../models/t1dMealReviewRepository.js', () => ({
  default: {
    createMealReview: vi.fn(),
    getMealReviewById: vi.fn(),
    getMealReviewsForProfile: vi.fn(),
  },
}));

// Mock auth middleware to bypass actual auth
vi.mock('../middleware/authMiddleware.js', () => ({
  authenticate: vi.fn((req: any, _res: any, next: any) => {
    req.userId = req.headers['x-test-user-id'] || 'user-123';
    req.authenticatedUserId = req.userId;
    next();
  }),
}));

// Import routes AFTER mocks are set up
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
app.use('/t1d-meal-reviews', t1dMealReviewRoutes);

describe('T1D Meal Review Safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /t1d-meal-reviews — safety metadata required', () => {
    it('should reject a meal review without safety metadata (missing safetyJson)', async () => {
      const res = await request(app)
        .post('/t1d-meal-reviews')
        .set('x-test-user-id', 'user-123')
        .send({
          t1dProfileId: 'profile-456',
          dataMode: 'demo',
          lifecycleStatus: 'saved',
          // safetyJson is intentionally missing
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/safety/i);
    });

    it('should reject a meal review with empty safetyJson', async () => {
      const res = await request(app)
        .post('/t1d-meal-reviews')
        .set('x-test-user-id', 'user-123')
        .send({
          t1dProfileId: 'profile-456',
          dataMode: 'demo',
          lifecycleStatus: 'saved',
          safetyJson: {},
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/safety/i);
    });

    it('should reject a meal review with dosing language in normalizedJson', async () => {
      const res = await request(app)
        .post('/t1d-meal-reviews')
        .set('x-test-user-id', 'user-123')
        .send({
          t1dProfileId: 'profile-456',
          dataMode: 'demo',
          lifecycleStatus: 'saved',
          safetyJson: {
            content_safety_verified: true,
            risk_level: 'none',
          },
          normalizedJson: {
            summary: 'Take 3 units of insulin before eating',
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/dosing|treatment|safety/i);
    });

    it('should reject a meal review with banned words in normalizedJson', async () => {
      const res = await request(app)
        .post('/t1d-meal-reviews')
        .set('x-test-user-id', 'user-123')
        .send({
          t1dProfileId: 'profile-456',
          dataMode: 'demo',
          lifecycleStatus: 'saved',
          safetyJson: {
            content_safety_verified: true,
            risk_level: 'none',
          },
          normalizedJson: {
            summary: 'Bolus 5 units for the meal',
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/dosing|treatment|safety/i);
    });

    it('should accept a meal review with valid safety metadata', async () => {
      const mockReview = {
        id: 'review-789',
        t1d_profile_id: 'profile-456',
        legend_key: null,
        data_mode: 'demo',
        source_label: null,
        normalized_json: { summary: 'Educational meal review with carb counting' },
        envelope_snapshot_json: {},
        safety_json: {
          content_safety_verified: true,
          risk_level: 'none',
          blocked_phrases: [],
          disclaimer_required: false,
        },
        schema_version: 'mobile-card-v1',
        copy_version: 'sparky-t1d-v1',
        data_source: 'mobile_demo',
        lifecycle_status: 'saved',
        saved_chat_thread_id: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      };

      mockCreateMealReview.mockResolvedValue(mockReview);

      const res = await request(app)
        .post('/t1d-meal-reviews')
        .set('x-test-user-id', 'user-123')
        .send({
          t1dProfileId: 'profile-456',
          dataMode: 'demo',
          lifecycleStatus: 'saved',
          safetyJson: {
            content_safety_verified: true,
            risk_level: 'none',
            blocked_phrases: [],
            disclaimer_required: false,
          },
          normalizedJson: {
            summary: 'Educational meal review with carb counting',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('review-789');
      expect(res.body.safety_json.content_safety_verified).toBe(true);
    });
  });

  describe('GET /t1d-meal-reviews/:id — cross-user access rejection', () => {
    it('should return 404 when a user tries to access another user\'s meal review', async () => {
      mockGetMealReviewById.mockResolvedValue(null);

      const res = await request(app)
        .get('/t1d-meal-reviews/review-other-user')
        .set('x-test-user-id', 'user-123');

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Meal review not found.');
    });

    it('should return the meal review with safety metadata for the owner', async () => {
      const mockReview = {
        id: 'review-789',
        t1d_profile_id: 'profile-456',
        legend_key: null,
        data_mode: 'demo',
        source_label: null,
        normalized_json: { summary: 'Educational meal review' },
        envelope_snapshot_json: {},
        safety_json: {
          content_safety_verified: true,
          risk_level: 'none',
          blocked_phrases: [],
          disclaimer_required: false,
        },
        schema_version: 'mobile-card-v1',
        copy_version: 'sparky-t1d-v1',
        data_source: 'mobile_demo',
        lifecycle_status: 'saved',
        saved_chat_thread_id: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      };

      mockGetMealReviewById.mockResolvedValue(mockReview);

      const res = await request(app)
        .get('/t1d-meal-reviews/review-789')
        .set('x-test-user-id', 'user-123');

      expect(res.status).toBe(200);
      expect(res.body.safety_json).toBeDefined();
      expect(res.body.safety_json.content_safety_verified).toBe(true);
      expect(res.body.safety_json.risk_level).toBe('none');
    });
  });
});
