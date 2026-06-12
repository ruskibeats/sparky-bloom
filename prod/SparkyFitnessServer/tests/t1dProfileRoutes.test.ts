// Set required env vars BEFORE any imports that trigger auth module loading
process.env.BETTER_AUTH_SECRET =
  'dGhpcyBpcyBhIDMyIGJ5dGUgc2VjcmV0IGtleSE=';

import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock the repository BEFORE importing routes
vi.mock('../models/t1dProfileRepository.js', () => ({
  default: {
    getOrCreateProfileForSparkyUser: vi.fn(),
    getProfileById: vi.fn(),
    getProfilesForSparkyUser: vi.fn(),
  },
}));

// Mock auth middleware to bypass actual auth
vi.mock('../middleware/authMiddleware.js', () => ({
  authenticate: vi.fn((req: any, res: any, next: any) => {
    const testUserId = req.headers['x-test-user-id'];
    // Simulate unauthenticated when x-test-user-id is empty string
    if (testUserId === '') {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    // Simulate authenticated user
    req.userId = testUserId || 'user-123';
    req.authenticatedUserId = req.userId;
    next();
  }),
}));

// Import routes AFTER mocks are set up
import t1dProfileRepository, {
  T1DProfileSubjectType,
} from '../models/t1dProfileRepository.js';
import t1dProfileRoutes from '../routes/t1dProfileRoutes.js';

const mockGetOrCreateProfileForSparkyUser = vi.mocked(
  t1dProfileRepository.getOrCreateProfileForSparkyUser
);
const mockGetProfileById = vi.mocked(t1dProfileRepository.getProfileById);
const mockGetProfilesForSparkyUser = vi.mocked(
  t1dProfileRepository.getProfilesForSparkyUser
);

const app = express();
app.use(express.json());
app.use('/t1d-profiles', t1dProfileRoutes);

describe('T1D Profile Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /t1d-profiles', () => {
    it('should create a T1D profile for the authenticated user', async () => {
      const mockProfile = {
        id: 'profile-456',
        sparky_user_id: 'user-123',
        subject_type: 'sparky_user' as T1DProfileSubjectType,
        display_name: 'My T1D Profile',
        legend_key: null,
        status: 'active',
        metadata_json: {},
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      } as any;

      mockGetOrCreateProfileForSparkyUser.mockResolvedValue(mockProfile);

      const res = await request(app)
        .post('/t1d-profiles')
        .send({ display_name: 'My T1D Profile' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe('profile-456');
      expect(res.body.sparky_user_id).toBe('user-123');
      expect(res.body.display_name).toBe('My T1D Profile');
      expect(res.body.subject_type).toBe('sparky_user');
      expect(res.body.status).toBe('active');
      expect(mockGetOrCreateProfileForSparkyUser).toHaveBeenCalledWith(
        'user-123',
        'user-123',
        expect.objectContaining({ display_name: 'My T1D Profile' })
      );
    });
  });

  describe('GET /t1d-profiles/:id', () => {
    it('should retrieve a T1D profile by ID', async () => {
      const mockProfile = {
        id: 'profile-456',
        sparky_user_id: 'user-123',
        subject_type: 'sparky_user' as T1DProfileSubjectType,
        display_name: 'My T1D Profile',
        legend_key: null,
        status: 'active',
        metadata_json: {},
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      } as any;

      mockGetProfileById.mockResolvedValue(mockProfile);

      const res = await request(app).get('/t1d-profiles/profile-456');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('profile-456');
      expect(res.body.sparky_user_id).toBe('user-123');
      expect(res.body.display_name).toBe('My T1D Profile');
      expect(mockGetProfileById).toHaveBeenCalledWith(
        'profile-456',
        'user-123'
      );
    });

    it('should return 404 when profile not found', async () => {
      mockGetProfileById.mockResolvedValue(null);

      const res = await request(app).get('/t1d-profiles/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('T1D profile not found.');
    });

    it('should return 403 when user tries to access another user\'s profile', async () => {
      const otherUserProfile = {
        id: 'profile-789',
        sparky_user_id: 'user-456',
        subject_type: 'sparky_user' as T1DProfileSubjectType,
        display_name: 'Other User\'s Profile',
        legend_key: null,
        status: 'active',
        metadata_json: {},
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      } as any;

      mockGetProfileById.mockResolvedValue(otherUserProfile);

      const res = await request(app).get('/t1d-profiles/profile-789');

      expect(res.status).toBe(403);
      expect(res.body.message).toBe(
        'You do not have access to this T1D profile.'
      );
    });

    it('should return 401 for unauthenticated requests', async () => {
      const res = await request(app)
        .get('/t1d-profiles/profile-456')
        .set('x-test-user-id', '');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /t1d-profiles (list)', () => {
    it('should return 401 for unauthenticated requests', async () => {
      const res = await request(app)
        .get('/t1d-profiles')
        .set('x-test-user-id', '');

      expect(res.status).toBe(401);
    });
  });

  describe('GET /t1d-profiles', () => {
    it('should list T1D profiles for the authenticated user', async () => {
      const mockProfiles = [
        {
          id: 'profile-456',
          sparky_user_id: 'user-123',
          subject_type: 'sparky_user' as T1DProfileSubjectType,
          display_name: 'My T1D Profile',
          legend_key: null,
          status: 'active',
          metadata_json: {},
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ] as any;

      mockGetProfilesForSparkyUser.mockResolvedValue(mockProfiles);

      const res = await request(app).get('/t1d-profiles');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe('profile-456');
      expect(mockGetProfilesForSparkyUser).toHaveBeenCalledWith('user-123');
    });
  });
});
