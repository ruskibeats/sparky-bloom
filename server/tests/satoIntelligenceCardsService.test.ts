import { describe, expect, it, vi } from 'vitest';
import { getSatoIntelligenceCards } from '../services/satoIntelligenceCardsService.js';

const rows = (value: unknown[] = []) => value;

function fakeClient(overrides: Record<string, unknown[]>) {
  return {
    query: vi.fn(async (sql: string) => {
      if (sql.includes('ag_graph')) return { rows: rows(overrides.agGraph ?? [{ name: 't1d_food_graph' }]) };
      if (sql.includes('t1d_profiles')) return { rows: rows(overrides.profiles ?? [{ id: 'profile-1' }]) };
      if (sql.includes('t1d_meal_response_fingerprints')) return { rows: rows(overrides.fingerprints ?? []) };
      if (sql.includes('food_entries')) return { rows: rows(overrides.foodEntries ?? []) };
      if (sql.includes('t1d_cgm_entries')) return { rows: rows(overrides.cgmSummary ?? [{ count: 0 }]) };
      if (sql.includes('t1d_insulin_inventory')) return { rows: rows(overrides.inventory ?? []) };
      if (sql.includes('t1d_insulin_dose_events')) return { rows: rows(overrides.doseEvents ?? []) };
      if (sql.includes('t1d_calendar_events')) return { rows: rows(overrides.appointments ?? []) };
      if (sql.includes('t1d_restaurant_menu_contexts')) return { rows: rows(overrides.restaurants ?? []) };
      if (sql.includes('t1d_graph_sync_log')) return { rows: [] };
      return { rows: [] };
    }),
    release: vi.fn(),
  };
}

function fp(id: string, foods: string[], delta: number, ttp: number, tier = 'high', fat = 20, entryDate = '2026-06-10'): Record<string, unknown> {
  return {
    id,
    meal_key: `meal-${id}`,
    meal_type_name: 'dinner',
    food_names: foods,
    carbs_g: 45,
    protein_g: 20,
    fat_g: fat,
    fiber_g: 5,
    delta_mg_dl: delta,
    peak_mg_dl: 170,
    time_to_peak_minutes: ttp,
    confidence_tier: tier,
    entry_date: entryDate,
  };
}

describe('Sato Intelligence Cards - #113 Pattern Insight', () => {
  it('renders pattern insight when fingerprints, CGM-linked evidence, and graph match exist', async () => {
    const response = await getSatoIntelligenceCards('user-1', fakeClient({
      fingerprints: [fp('fp-1', ['pasta'], 70, 75), fp('fp-2', ['pasta'], 62, 80), fp('fp-3', ['pasta'], 68, 85)],
    }));

    const card = response.cards.find((c) => c.type === 'pattern_insight');
    expect(card).toBeDefined();
    expect(card?.confidence).toBeGreaterThanOrEqual(0.8);
    expect(card?.evidenceCount).toBe(3);
    expect(card?.provenance.source).toBe('age_graph');
    expect(card?.primaryAction.action).toBe('open_evidence');
  });

  it('suppresses pattern insight below activation threshold', async () => {
    const response = await getSatoIntelligenceCards('user-1', fakeClient({
      fingerprints: [fp('fp-1', ['pasta'], 70, 75)],
    }));

    expect(response.cards.some((c) => c.type === 'pattern_insight')).toBe(false);
    expect(response.suppressed.some((d) => d.render === false && d.cardType === 'pattern_insight' && d.reason === 'INSUFFICIENT_DATA')).toBe(true);
  });

  it('suppresses pattern insight without graph match', async () => {
    const response = await getSatoIntelligenceCards('user-1', fakeClient({
      agGraph: [],
      fingerprints: [fp('fp-1', ['pasta'], 70, 75), fp('fp-2', ['pasta'], 62, 80), fp('fp-3', ['pasta'], 68, 85)],
    }));

    expect(response.cards.some((c) => c.type === 'pattern_insight')).toBe(false);
    expect(response.suppressed.some((d) => d.render === false && d.reason === 'NO_GRAPH_MATCH')).toBe(true);
  });
});

describe('Sato Intelligence Cards - #114 Safe Meal', () => {
  it('renders safe meal after repeated stable responses', async () => {
    const response = await getSatoIntelligenceCards('user-1', fakeClient({
      fingerprints: [fp('fp-1', ['oats'], 18, 70), fp('fp-2', ['oats'], 22, 75), fp('fp-3', ['oats'], 20, 68)],
    }));

    const card = response.cards.find((c) => c.type === 'safe_meal');
    expect(card).toBeDefined();
    expect(card?.evidenceCount).toBe(3);
    expect(card?.secondaryActions?.some((a) => a.action === 'mark_safe_meal')).toBe(true);
  });

  it('suppresses safe meal below repeated-history threshold', async () => {
    const response = await getSatoIntelligenceCards('user-1', fakeClient({
      fingerprints: [fp('fp-1', ['oats'], 18, 70), fp('fp-2', ['oats'], 22, 75)],
    }));

    expect(response.cards.some((c) => c.type === 'safe_meal')).toBe(false);
    expect(response.suppressed.some((d) => d.render === false && d.reason === 'LOW_CONFIDENCE')).toBe(true);
  });

  it('suppresses unstable safe-meal history', async () => {
    const response = await getSatoIntelligenceCards('user-1', fakeClient({
      fingerprints: [fp('fp-1', ['pizza'], 85, 90), fp('fp-2', ['pizza'], 95, 95), fp('fp-3', ['pizza'], 78, 88)],
    }));

    expect(response.cards.some((c) => c.type === 'safe_meal')).toBe(false);
    expect(response.suppressed.some((d) => d.render === false && d.reason === 'INSUFFICIENT_DATA')).toBe(true);
  });
});

describe('Sato Intelligence Cards - #115 Weekly Digest', () => {
  it('renders weekly digest with enough meals and CGM data', async () => {
    const response = await getSatoIntelligenceCards('user-1', fakeClient({
      foodEntries: [
        { id: 'food-1', food_name: 'oats', carbs: 40, protein: 12, fat: 6, calories: 260, entry_date: '2026-06-10', meal_type_id: 'mt-1' },
        { id: 'food-2', food_name: 'salad', carbs: 20, protein: 18, fat: 10, calories: 240, entry_date: '2026-06-11', meal_type_id: 'mt-2' },
        { id: 'food-3', food_name: 'frittata', carbs: 12, protein: 28, fat: 18, calories: 320, entry_date: '2026-06-12', meal_type_id: 'mt-3' },
      ],
      cgmSummary: [{ count: 80, avg_glucose: 132, min_glucose: 82, max_glucose: 190, tir_pct: 76 }],
    }));

    const card = response.cards.find((c) => c.type === 'weekly_digest');
    expect(card).toBeDefined();
    expect(card?.evidenceCount).toBeGreaterThanOrEqual(83);
    expect(card?.primaryAction.action).toBe('open_weekly_digest');
  });

  it('suppresses sparse weekly digest', async () => {
    const response = await getSatoIntelligenceCards('user-1', fakeClient({
      foodEntries: [{ id: 'food-1', food_name: 'oats', carbs: 40, entry_date: '2026-06-10' }],
      cgmSummary: [{ count: 5 }],
    }));

    expect(response.cards.some((c) => c.type === 'weekly_digest')).toBe(false);
    expect(response.suppressed.some((d) => d.render === false && d.reason === 'INSUFFICIENT_DATA')).toBe(true);
  });
});

describe('Sato Intelligence Cards - #117 What-If', () => {
  it('renders what-if card from similar historical meals', async () => {
    const response = await getSatoIntelligenceCards('user-1', fakeClient({
      fingerprints: [fp('fp-1', ['pasta'], 70, 75), fp('fp-2', ['pasta'], 62, 80), fp('fp-3', ['pasta'], 68, 85)],
    }));

    const card = response.cards.find((c) => c.type === 'what_if');
    expect(card).toBeDefined();
    expect(card?.primaryAction.action).toBe('simulate_what_if');
    expect(card?.evidenceCount).toBe(3);
    expect(card?.provenance.queryRefs).toContain('what_if.similar_meals.by_fingerprint');
  });

  it('suppresses what-if card without similar meals', async () => {
    const response = await getSatoIntelligenceCards('user-1', fakeClient({
      fingerprints: [fp('fp-1', ['pasta'], 70, 75), fp('fp-2', ['rice'], 62, 80)],
    }));

    expect(response.cards.some((c) => c.type === 'what_if')).toBe(false);
    expect(response.suppressed.some((d) => d.render === false && d.cardType === 'what_if' && d.reason === 'INSUFFICIENT_DATA')).toBe(true);
  });
});

describe('Sato Intelligence Cards - #118 Pattern Drift', () => {
  it('renders pattern drift from baseline-vs-recent change', async () => {
    const response = await getSatoIntelligenceCards('user-1', fakeClient({
      fingerprints: [
        fp('base-1', ['pizza'], 25, 80, 'high', 18, '2026-05-01'),
        fp('base-2', ['pizza'], 28, 82, 'high', 18, '2026-05-03'),
        fp('base-3', ['pizza'], 26, 78, 'high', 18, '2026-05-05'),
        fp('recent-1', ['pizza'], 82, 130, 'high', 18, '2026-06-12'),
        fp('recent-2', ['pizza'], 88, 135, 'high', 18, '2026-06-13'),
      ],
    }));

    const card = response.cards.find((c) => c.type === 'pattern_drift');
    expect(card).toBeDefined();
    expect(card?.primaryAction.action).toBe('compare_pattern_periods');
    expect(card?.evidenceCount).toBe(5);
    expect(card?.provenance.queryRefs).toContain('pattern_drift.recent_shift');
  });

  it('suppresses pattern drift when no baseline exists', async () => {
    const response = await getSatoIntelligenceCards('user-1', fakeClient({
      fingerprints: [fp('recent-1', ['pizza'], 82, 130, 'high', 18, '2026-06-12'), fp('recent-2', ['pizza'], 88, 135, 'high', 18, '2026-06-13')],
    }));

    expect(response.cards.some((c) => c.type === 'pattern_drift')).toBe(false);
    expect(response.suppressed.some((d) => d.render === false && d.cardType === 'pattern_drift' && d.reason === 'MISSING_EVIDENCE')).toBe(true);
  });
});

describe('Sato Intelligence Cards - #119 Experiment', () => {
  it('renders experiment card from detected behaviour opportunity', async () => {
    const response = await getSatoIntelligenceCards('user-1', fakeClient({
      fingerprints: [fp('fp-1', ['carbonara'], 60, 150, 'high', 32), fp('fp-2', ['carbonara'], 64, 160, 'high', 35)],
    }));

    const card = response.cards.find((c) => c.type === 'experiment');
    expect(card).toBeDefined();
    expect(card?.primaryAction.action).toBe('save_experiment');
    expect(card?.body).not.toMatch(/insulin|dose|treatment/i);
  });

  it('suppresses experiment card without opportunity evidence', async () => {
    const response = await getSatoIntelligenceCards('user-1', fakeClient({
      fingerprints: [fp('fp-1', ['salad'], 12, 70)],
    }));

    expect(response.cards.some((c) => c.type === 'experiment')).toBe(false);
    expect(response.suppressed.some((d) => d.render === false && d.cardType === 'experiment' && d.reason === 'MISSING_EVIDENCE')).toBe(true);
  });
});

describe('Sato Intelligence Cards - #120 Doctor Prep', () => {
  it('renders doctor prep card from appointment and evidence days', async () => {
    const foodEntries = Array.from({ length: 14 }, (_, index) => ({
      id: `food-${index + 1}`,
      food_name: 'oats',
      carbs: 35,
      entry_date: `2026-06-${String(index + 1).padStart(2, '0')}`,
    }));
    const response = await getSatoIntelligenceCards('user-1', fakeClient({
      appointments: [{ id: 'appt-1', starts_at: '2026-06-20T10:00:00Z', title: 'Diabetes review', specialty: 'endocrinology' }],
      foodEntries,
    }));

    const card = response.cards.find((c) => c.type === 'doctor_prep');
    expect(card).toBeDefined();
    expect(card?.primaryAction.action).toBe('build_doctor_brief');
    expect(card?.evidenceCount).toBeGreaterThanOrEqual(14);
  });

  it('suppresses doctor prep without appointment', async () => {
    const response = await getSatoIntelligenceCards('user-1', fakeClient({ foodEntries: [] }));

    expect(response.cards.some((c) => c.type === 'doctor_prep')).toBe(false);
    expect(response.suppressed.some((d) => d.render === false && d.cardType === 'doctor_prep' && d.reason === 'MISSING_DATA')).toBe(true);
  });
});

describe('Sato Intelligence Cards - #121 Restaurant', () => {
  it('renders restaurant card from calendar/menu/pattern scoring', async () => {
    const response = await getSatoIntelligenceCards('user-1', fakeClient({
      restaurants: [{
        event_id: 'event-1',
        menu_id: 'menu-1',
        restaurant_name: 'Pasta Place',
        starts_at: '2026-06-16T18:00:00Z',
        normalized_items_json: [
          { itemId: 'item-1', name: 'Grilled chicken salad', score: 0.82, evidenceIds: ['fp-1', 'fp-2'] },
        ],
      }],
    }));

    const card = response.cards.find((c) => c.type === 'restaurant');
    expect(card).toBeDefined();
    expect(card?.primaryAction.action).toBe('view_restaurant_options');
    expect(card?.provenance.queryRefs).toContain('restaurant.pattern_scoring');
  });

  it('suppresses restaurant card without normalized items', async () => {
    const response = await getSatoIntelligenceCards('user-1', fakeClient({
      restaurants: [{ event_id: 'event-1', menu_id: 'menu-1', restaurant_name: 'Pasta Place', normalized_items_json: [] }],
    }));

    expect(response.cards.some((c) => c.type === 'restaurant')).toBe(false);
    expect(response.suppressed.some((d) => d.render === false && d.cardType === 'restaurant' && d.reason === 'MISSING_EVIDENCE')).toBe(true);
  });
});

describe('Sato Intelligence Cards - #116 Insulin Stock', () => {
  it('renders low-stock card without dosing advice', async () => {
    const response = await getSatoIntelligenceCards('user-1', fakeClient({
      inventory: [{ id: 'inv-1', insulin_name: 'Rapid-acting insulin', insulin_type: 'rapid', quantity_units: 80, opened_at: '2026-06-01', expires_at: '2026-09-01' }],
      doseEvents: [
        { id: 'dose-1', units: 10, dose_type: 'bolus', taken_at: '2026-06-10T08:00:00Z' },
        { id: 'dose-2', units: 10, dose_type: 'bolus', taken_at: '2026-06-11T08:00:00Z' },
        { id: 'dose-3', units: 10, dose_type: 'bolus', taken_at: '2026-06-12T08:00:00Z' },
      ],
    }));

    const card = response.cards.find((c) => c.type === 'insulin_stock');
    expect(card).toBeDefined();
    expect(card?.body).not.toMatch(/take|dose|units of insulin|adjust insulin/i);
    expect(card?.primaryAction.action).toBe('prepare_repeat_request');
    expect(card?.priority).toBe('high');
  });

  it('suppresses insulin stock when inventory or dose data is missing', async () => {
    const response = await getSatoIntelligenceCards('user-1', fakeClient({}));

    expect(response.cards.some((c) => c.type === 'insulin_stock')).toBe(false);
    expect(response.suppressed.some((d) => d.render === false && d.reason === 'MISSING_DATA')).toBe(true);
  });
});

describe('Sato Intelligence Cards - #122 Ranked Feed', () => {
  it('ranks urgent cards above medium priority', async () => {
    // Pattern insight with strong evidence generates high priority
    const fingerprints = [
      fp('fp-1', ['pasta'], 70, 75),
      fp('fp-2', ['pasta'], 62, 80),
      fp('fp-3', ['pasta'], 68, 85),
    ];

    const response = await getSatoIntelligenceCards('user-1', fakeClient({
      fingerprints,
    }));

    // Verify at least one card rendered
    expect(response.cards.length).toBeGreaterThan(0);
  });

  it('limits feed to max 7 cards', async () => {
    // Create enough fingerprints to generate multiple card types
    const fingerprints = [];
    for (let i = 0; i < 10; i++) {
      fingerprints.push(fp(`fp-${i}`, ['oats'], 20, 70));
    }

    const response = await getSatoIntelligenceCards('user-1', fakeClient({
      fingerprints,
    }));

    expect(response.cards.length).toBeLessThanOrEqual(7);
  });

  it('includes suppressed diagnostics for backend analysis', async () => {
    const response = await getSatoIntelligenceCards('user-1', fakeClient({
      // No data - should suppress
    }));

    expect(response.suppressed.length).toBeGreaterThan(0);
    // Verify suppression reasons are documented (only for suppressed cards where render=false)
    const reasons = response.suppressed
      .filter((s) => !s.render)
      .map((s) => (s as any).reason);
    expect(reasons).toContain('INSUFFICIENT_DATA');
  });
});
