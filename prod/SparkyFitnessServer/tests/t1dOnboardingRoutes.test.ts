import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import supertest from 'supertest';

vi.mock('../middleware/authMiddleware.js', () => ({
  authenticate: vi.fn((req, res, next) => {
    req.userId = 'user-123';
    next();
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let t1dOnboardingService: any;

beforeEach(async () => {
  vi.resetModules();
  t1dOnboardingService = (await import('../services/t1dOnboardingService.js')).default;
  vi.spyOn(t1dOnboardingService, 'saveT1dOnboarding').mockResolvedValue({
    id: 'onboarding-456',
    t1d_profile_id: 'profile-789',
    diabetes_type: 'type_1',
    insulin_regimen: 'mdi',
    cgm_source: 'nightscout',
    carb_ratio_g_per_unit: 15,
    insulin_sensitivity_factor_mg_dl_per_unit: 50,
    baseline_glucose_target_mg_dl: 100,
    hypo_threshold_mg_dl: 70,
    hyper_threshold_mg_dl: 180,
    clinician_guidance_notes: null,
    onboarding_completed_at: '2026-06-13T00:00:00.000Z',
    created_at: '2026-06-13T00:00:00.000Z',
    updated_at: '2026-06-13T00:00:00.000Z',
  });
  vi.spyOn(t1dOnboardingService, 'getT1dOnboarding').mockResolvedValue(null);
  vi.spyOn(t1dOnboardingService, 'checkT1dOnboardingStatus').mockResolvedValue({
    t1dOnboardingComplete: false,
  });
});

describe('POST /t1d/onboarding', () => {
  // Issue #75 TDD tracer bullet: verify onboarding decision behavior
  // Decision: T1D onboarding uses a SEPARATE table (t1d_onboarding_data)
  // rather than extending existing fitness onboarding data.
  it('creates T1D onboarding record and returns 201 with saved data (Issue #75 decision verification)', async () => {
    const { default: routes } = await import('../routes/t1dOnboardingRoutes.js');
    const app = express();
    app.use(express.json());
    app.use('/t1d/onboarding', routes);

    const res = await supertest(app)
      .post('/t1d/onboarding')
      .send({
        diabetes_type: 'type_1',
        insulin_regimen: 'mdi',
        cgm_source: 'nightscout',
        carb_ratio_g_per_unit: 15,
        insulin_sensitivity_factor_mg_dl_per_unit: 50,
        baseline_glucose_target_mg_dl: 100,
        hypo_threshold_mg_dl: 70,
        hyper_threshold_mg_dl: 180,
      });

    // RED → GREEN: route should return 201 with saved onboarding data
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id', 'onboarding-456');
    expect(res.body).toHaveProperty('diabetes_type', 'type_1');
    expect(res.body).toHaveProperty('insulin_regimen', 'mdi');
    expect(res.body).toHaveProperty('cgm_source', 'nightscout');

    // Verify service was called (separate table approach via t1dOnboardingService)
    expect(t1dOnboardingService.saveT1dOnboarding).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({
        diabetes_type: 'type_1',
        insulin_regimen: 'mdi',
      })
    );
  });

  it('rejects invalid onboarding payload with 400 when diabetes_type is invalid', async () => {
    const { default: routes } = await import('../routes/t1dOnboardingRoutes.js');
    const app = express();
    app.use(express.json());
    app.use('/t1d/onboarding', routes);

    const res = await supertest(app)
      .post('/t1d/onboarding')
      .send({
        diabetes_type: 'invalid_type',
        insulin_regimen: 'mdi',
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('Invalid T1D onboarding data');
  });

  it('accepts partial payload with 201 (all fields optional in schema)', async () => {
    const { default: routes } = await import('../routes/t1dOnboardingRoutes.js');
    const app = express();
    app.use(express.json());
    app.use('/t1d/onboarding', routes);

    const res = await supertest(app)
      .post('/t1d/onboarding')
      .send({ diabetes_type: 'type_1' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id', 'onboarding-456');
    expect(t1dOnboardingService.saveT1dOnboarding).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({ diabetes_type: 'type_1' })
    );
  });
});

describe('GET /t1d/onboarding', () => {
  it('returns 404 when no onboarding data exists', async () => {
    const { default: routes } = await import('../routes/t1dOnboardingRoutes.js');
    const app = express();
    app.use(express.json());
    app.use('/t1d/onboarding', routes);

    const res = await supertest(app).get('/t1d/onboarding');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('message', 'No T1D onboarding data found.');
  });
});

describe('GET /t1d/onboarding/status', () => {
  it('returns onboarding completion status', async () => {
    const { default: routes } = await import('../routes/t1dOnboardingRoutes.js');
    const app = express();
    app.use(express.json());
    app.use('/t1d/onboarding', routes);

    const res = await supertest(app).get('/t1d/onboarding/status');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('t1dOnboardingComplete', false);
  });
});
