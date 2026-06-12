import { describe, it, expect } from 'vitest';
import {
  computeBloomWindowsFromCGM,
  type CgmBloomWindowInput,
} from '../services/bloomWindowCgmService.js';
import type { T1DCGMEntry } from '../models/t1dCgmEntryRepository.js';

describe('computeBloomWindowsFromCGM', () => {
  it('computes deterministic Bloom windows with glucose stats from CGM entries', () => {
    const entries: T1DCGMEntry[] = [
      {
        id: 'e1', t1d_profile_id: 'p1', source: 'nightscout',
        sourceEntryId: 'sgv-1', measuredAt: new Date('2026-06-12T07:00:00Z'),
        valueMgDl: 95, valueMmolL: 5.3, units: 'mg/dL',
        trend: null, direction: 'Flat', device: 'dexcom', rawJson: {},
        created_at: new Date(), updated_at: new Date(),
      },
      {
        id: 'e2', t1d_profile_id: 'p1', source: 'nightscout',
        sourceEntryId: 'sgv-2', measuredAt: new Date('2026-06-12T08:00:00Z'),
        valueMgDl: 110, valueMmolL: 6.1, units: 'mg/dL',
        trend: null, direction: 'Flat', device: 'dexcom', rawJson: {},
        created_at: new Date(), updated_at: new Date(),
      },
      {
        id: 'e3', t1d_profile_id: 'p1', source: 'nightscout',
        sourceEntryId: 'sgv-3', measuredAt: new Date('2026-06-12T09:00:00Z'),
        valueMgDl: 180, valueMmolL: 10.0, units: 'mg/dL',
        trend: null, direction: 'SingleUp', device: 'dexcom', rawJson: {},
        created_at: new Date(), updated_at: new Date(),
      },
      {
        id: 'e4', t1d_profile_id: 'p1', source: 'nightscout',
        sourceEntryId: 'sgv-4', measuredAt: new Date('2026-06-12T10:00:00Z'),
        valueMgDl: 150, valueMmolL: 8.3, units: 'mg/dL',
        trend: null, direction: 'FortyFiveDown', device: 'dexcom', rawJson: {},
        created_at: new Date(), updated_at: new Date(),
      },
      {
        id: 'e5', t1d_profile_id: 'p1', source: 'nightscout',
        sourceEntryId: 'sgv-5', measuredAt: new Date('2026-06-12T11:00:00Z'),
        valueMgDl: 120, valueMmolL: 6.7, units: 'mg/dL',
        trend: null, direction: 'Flat', device: 'dexcom', rawJson: {},
        created_at: new Date(), updated_at: new Date(),
      },
    ];

    const input: CgmBloomWindowInput = {
      profileId: 'profile-123',
      startHour: 6,
      endHour: 12,
      entries,
    };

    const result = computeBloomWindowsFromCGM(input);

    // Windows exist and cover the range
    expect(result.windows.length).toBeGreaterThan(0);

    // Each window has required BloomWindow fields
    for (const window of result.windows) {
      expect(window).toHaveProperty('id');
      expect(window).toHaveProperty('label');
      expect(window).toHaveProperty('value');
      expect(window).toHaveProperty('state');
      expect(window).toHaveProperty('pigmentKey');
      expect(window).toHaveProperty('glucoseAvg');
      expect(window).toHaveProperty('glucosePeak');
      expect(window).toHaveProperty('rateOfChange');
      expect(window).toHaveProperty('dataCompleteness');
    }

    // glucosePeak should match the max CGM value (180)
    const peaks = result.windows
      .map((w) => w.glucosePeak)
      .filter((v): v is number => v !== undefined);
    expect(peaks.length).toBeGreaterThan(0);
    expect(Math.max(...peaks)).toBe(180);

    // glucoseAvg should be > 0 for windows with data
    const avgs = result.windows
      .map((w) => w.glucoseAvg)
      .filter((v): v is number => v !== undefined && v > 0);
    expect(avgs.length).toBeGreaterThan(0);

    // rateOfChange should be a valid string
    for (const window of result.windows) {
      expect(['UP', 'DOWN', 'FLAT']).toContain(window.rateOfChange);
    }

    // dataCompleteness should be > 0.5 with 5 entries across 6 hours
    const completenessValues = result.windows
      .map((w) => w.dataCompleteness)
      .filter((v): v is number => v !== undefined);
    expect(completenessValues.length).toBeGreaterThan(0);
    expect(completenessValues.some((v) => v > 0.5)).toBe(true);
  });

  it('lowers confidence when CGM data is sparse', () => {
    const sparseEntries: T1DCGMEntry[] = [
      {
        id: 'e1', t1d_profile_id: 'p1', source: 'nightscout',
        sourceEntryId: 'sgv-1', measuredAt: new Date('2026-06-12T08:00:00Z'),
        valueMgDl: 120, valueMmolL: 6.7, units: 'mg/dL',
        trend: null, direction: 'Flat', device: 'dexcom', rawJson: {},
        created_at: new Date(), updated_at: new Date(),
      },
    ];

    const input: CgmBloomWindowInput = {
      profileId: 'profile-123',
      startHour: 6,
      endHour: 12,
      entries: sparseEntries,
    };

    const result = computeBloomWindowsFromCGM(input);

    // With only 1 entry across 6 hours, all windows should have completeness <= 0.5
    // (one window has 1 entry / 2 hours = 0.5, other windows have 0)
    const completenessValues = result.windows
      .map((w) => w.dataCompleteness)
      .filter((v): v is number => v !== undefined);
    expect(completenessValues.every((v) => v <= 0.5)).toBe(true);

    // Confidence should also be low
    const confidences = result.windows
      .map((w) => w.confidence)
      .filter((v): v is number => v !== undefined);
    expect(confidences.some((v) => v < 0.5)).toBe(true);
  });

  it('produces deterministic output for the same input data', () => {
    const entries: T1DCGMEntry[] = [
      {
        id: 'e1', t1d_profile_id: 'p1', source: 'nightscout',
        sourceEntryId: 'sgv-1', measuredAt: new Date('2026-06-12T07:00:00Z'),
        valueMgDl: 95, valueMmolL: 5.3, units: 'mg/dL',
        trend: null, direction: 'Flat', device: 'dexcom', rawJson: {},
        created_at: new Date(), updated_at: new Date(),
      },
      {
        id: 'e2', t1d_profile_id: 'p1', source: 'nightscout',
        sourceEntryId: 'sgv-2', measuredAt: new Date('2026-06-12T08:00:00Z'),
        valueMgDl: 110, valueMmolL: 6.1, units: 'mg/dL',
        trend: null, direction: 'Flat', device: 'dexcom', rawJson: {},
        created_at: new Date(), updated_at: new Date(),
      },
    ];

    const input: CgmBloomWindowInput = {
      profileId: 'p1',
      startHour: 6,
      endHour: 10,
      entries,
    };

    const first = computeBloomWindowsFromCGM(input);
    const second = computeBloomWindowsFromCGM(input);

    expect(first).toEqual(second);
  });
});
