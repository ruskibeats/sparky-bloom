import { describe, it, expect } from 'vitest';
import {
  computeBloomWindowsFromCGM,
  type CgmWindowComputationInput,
} from '../services/bloomWindowCgmService.js';

describe('bloomWindowCgmService', () => {
  it('computes Bloom windows with glucose stats from CGM entries', () => {
    const input: CgmWindowComputationInput = {
      profileId: 'profile-123',
      startHour: 6,
      endHour: 12,
      entries: [
        { id: 'e1', measuredAt: '2026-06-12T06:00:00.000Z', valueMgDl: 95 },
        { id: 'e2', measuredAt: '2026-06-12T08:00:00.000Z', valueMgDl: 140 },
        { id: 'e3', measuredAt: '2026-06-12T10:00:00.000Z', valueMgDl: 180 },
      ],
    };

    const result = computeBloomWindowsFromCGM(input);

    // Windows exist
    expect(result.windows.length).toBeGreaterThan(0);

    // Every window has required glucose fields
    for (const window of result.windows) {
      expect(window).toHaveProperty('id');
      expect(window).toHaveProperty('label');
      expect(window).toHaveProperty('value');
      expect(window).toHaveProperty('confidence');
      expect(window).toHaveProperty('variability');
      expect(window).toHaveProperty('intensity');
      expect(window).toHaveProperty('state');
      expect(window).toHaveProperty('pigmentKey');
      expect(window).toHaveProperty('glucoseAvg');
      expect(window).toHaveProperty('glucosePeak');
      expect(window).toHaveProperty('rateOfChange');
      expect(window).toHaveProperty('dataCompleteness');
    }

    // Glucose stats are derived from actual CGM data, not invented
    const windowsWithData = result.windows.filter(
      (w) => (w.glucoseAvg ?? 0) > 0 && (w.glucosePeak ?? 0) > 0
    );
    expect(windowsWithData.length).toBeGreaterThan(0);

    // Peak should match the max CGM value (180)
    const maxPeak = Math.max(...windowsWithData.map((w) => w.glucosePeak ?? 0));
    expect(maxPeak).toBe(180);

    // CGM-derived windows should have reasonable glucose averages
    for (const w of windowsWithData) {
      expect(w.glucoseAvg).toBeGreaterThanOrEqual(70);
      expect(w.glucoseAvg).toBeLessThanOrEqual(250);
    }
  });

  it('is deterministic for the same input data', () => {
    const input: CgmWindowComputationInput = {
      profileId: 'profile-456',
      startHour: 8,
      endHour: 14,
      entries: [
        { id: 'e1', measuredAt: '2026-06-12T08:30:00.000Z', valueMgDl: 110 },
        { id: 'e2', measuredAt: '2026-06-12T10:00:00.000Z', valueMgDl: 160 },
        { id: 'e3', measuredAt: '2026-06-12T12:00:00.000Z', valueMgDl: 130 },
      ],
    };

    const first = computeBloomWindowsFromCGM(input);
    const second = computeBloomWindowsFromCGM(input);

    expect(first).toEqual(second);
  });

  it('lowers confidence when CGM data is sparse', () => {
    const input: CgmWindowComputationInput = {
      profileId: 'profile-789',
      startHour: 6,
      endHour: 18,
      entries: [
        { id: 'e1', measuredAt: '2026-06-12T09:00:00.000Z', valueMgDl: 120 },
      ],
    };

    const result = computeBloomWindowsFromCGM(input);

    // With only 1 reading across 12 hours, most windows should be low confidence
    const lowConfidenceWindows = result.windows.filter(
      (w) => w.confidence < 0.5
    );
    expect(lowConfidenceWindows.length).toBeGreaterThan(0);

    // Data completeness should be low for sparse windows
    const sparseWindows = result.windows.filter(
      (w) => (w.dataCompleteness ?? 0) < 0.5
    );
    expect(sparseWindows.length).toBeGreaterThan(0);

    // But glucose stats should still be present (using available data)
    const windowWithEntry = result.windows.find((w) => (w.glucoseAvg ?? 0) > 0);
    expect(windowWithEntry).toBeDefined();
    if (windowWithEntry) {
      expect(windowWithEntry.glucoseAvg).toBe(120);
      expect(windowWithEntry.glucosePeak).toBe(120);
    }
  });
});
