import { describe, it, expect } from 'vitest';
import {
  computeBloomWindowsFromFixture,
  type BloomWindowFixtureInput,
} from '../services/bloomWindowFixtureService.js';

describe('bloomWindowFixtureService', () => {
  it('produces deterministic Bloom windows from a fixed fixture', () => {
    const fixture: BloomWindowFixtureInput = {
      profileId: 'test-profile-001',
      startHour: 6,
      endHour: 22,
      readings: [
        { hour: 6, glucoseMgDl: 95, eventType: 'fasting' as const },
        { hour: 8, glucoseMgDl: 140, eventType: 'meal' as const, eventLabel: 'breakfast' },
        { hour: 10, glucoseMgDl: 180, eventType: 'peak' as const },
        { hour: 12, glucoseMgDl: 150, eventType: 'meal' as const, eventLabel: 'lunch' },
        { hour: 14, glucoseMgDl: 200, eventType: 'peak' as const },
        { hour: 17, glucoseMgDl: 120, eventType: 'exercise' as const },
        { hour: 19, glucoseMgDl: 110, eventType: 'meal' as const, eventLabel: 'dinner' },
        { hour: 21, glucoseMgDl: 100, eventType: 'rest' as const },
      ],
    };

    const first = computeBloomWindowsFromFixture(fixture);
    const second = computeBloomWindowsFromFixture(fixture);

    // Deterministic: same fixture → same output
    expect(first).toEqual(second);

    // Each window has required fields
    expect(first.windows.length).toBeGreaterThan(0);
    for (const window of first.windows) {
      expect(window).toHaveProperty('label');
      expect(window).toHaveProperty('value');
      expect(window).toHaveProperty('confidence');
      expect(window).toHaveProperty('variability');
      expect(window).toHaveProperty('intensity');
      expect(window).toHaveProperty('state');
      expect(window).toHaveProperty('pigmentKey');
    }

    // Windows cover the requested range
    expect(first.windows[0].startHour).toBe(6);
    expect(first.windows[first.windows.length - 1].endHour).toBe(22);
  });
});
