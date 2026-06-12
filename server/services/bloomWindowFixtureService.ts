/**
 * Bloom Window Fixture Computation Service
 *
 * Deterministic: same fixture input always produces the same Bloom windows.
 * Pure computation — no DB, no HTTP, no side effects.
 *
 * Each window includes label, value, confidence, variability, intensity,
 * state, and pigment key. Low-data windows receive low confidence.
 */

import type { MetabolicPigmentKey, BloomState } from '@workspace/shared';

// ── Types ──────────────────────────────────────────────────────────────────

export interface CgmReadingFixture {
  hour: number;
  glucoseMgDl: number;
  eventType: 'fasting' | 'meal' | 'peak' | 'exercise' | 'rest' | 'sleep';
  eventLabel?: string;
}

export interface BloomWindowFixtureInput {
  profileId: string;
  startHour: number;
  endHour: number;
  readings: CgmReadingFixture[];
}

export interface BloomWindowFixtureResult {
  profileId: string;
  windowCount: number;
  windows: ComputedBloomWindow[];
}

export interface ComputedBloomWindow {
  id: string;
  label: string;
  startHour: number;
  endHour: number;
  value: number;
  confidence: number;
  variability: number;
  intensity: number;
  state: BloomState;
  pigmentKey: MetabolicPigmentKey;
  glucoseAvg: number;
  glucosePeak: number;
  rateOfChange: string;
  dataCompleteness: number;
  eventContext: string;
  note?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function computeGlucoseStats(readings: CgmReadingFixture[]): {
  avg: number;
  peak: number;
  min: number;
} {
  if (readings.length === 0) return { avg: 0, peak: 0, min: 0 };
  const values = readings.map((r) => r.glucoseMgDl);
  return {
    avg: Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10,
    peak: Math.max(...values),
    min: Math.min(...values),
  };
}

function computeRateOfChange(readings: CgmReadingFixture[]): string {
  if (readings.length < 2) return 'unknown';
  const sorted = [...readings].sort((a, b) => a.hour - b.hour);
  const first = sorted[0].glucoseMgDl;
  const last = sorted[sorted.length - 1].glucoseMgDl;
  const delta = last - first;
  if (Math.abs(delta) < 10) return 'stable';
  return delta > 0 ? `rising (${delta > 30 ? 'fast' : 'moderate'})` : `falling (${delta < -30 ? 'fast' : 'moderate'})`;
}

/**
 * Map dominant event type to a metabolic pigment key.
 * Pure function — deterministic mapping from event context to pigment.
 */
function dominantPigmentForWindow(readings: CgmReadingFixture[]): MetabolicPigmentKey {
  if (readings.length === 0) return 'unknown';

  // Count event types
  const counts: Record<string, number> = {};
  for (const r of readings) {
    counts[r.eventType] = (counts[r.eventType] || 0) + 1;
  }

  // Priority mapping: exercise → movement, meal → fastSugar/slowCarb,
  // peak → fastSugar, rest → baseline, sleep → sleepDebt, fasting → baseline
  if (counts.exercise) return 'movement';
  if (counts.peak) return 'fastSugar';
  if (counts.meal) {
    // If average glucose is high during meal windows, use fastSugar; otherwise slowCarb
    const mealReadings = readings.filter((r) => r.eventType === 'meal');
    const avgGlucose =
      mealReadings.reduce((s, r) => s + r.glucoseMgDl, 0) / mealReadings.length;
    return avgGlucose > 160 ? 'fastSugar' : 'slowCarb';
  }
  if (counts.fasting) return 'baseline';
  if (counts.sleep) return 'sleepDebt';
  if (counts.rest) return 'settling';

  return 'unknown';
}

/**
 * Map glucose average and variability to a Bloom state.
 */
function stateForWindow(avg: number, variability: number): BloomState {
  if (variability > 0.6) return 'reactive';
  if (avg > 180 || avg < 70) return 'reactive';
  if (avg >= 80 && avg <= 140 && variability < 0.3) return 'calm';
  return 'balanced';
}

/**
 * Compute confidence based on data completeness and reading count.
 * Low-data windows get low confidence.
 */
function confidenceForWindow(
  readingsInWindow: number,
  totalReadings: number,
  hoursSpan: number
): number {
  if (readingsInWindow === 0) return 0.1;
  // Ideal: at least 1 reading per 2 hours
  const density = readingsInWindow / Math.max(1, hoursSpan / 2);
  const coverage = totalReadings > 0 ? readingsInWindow / totalReadings : 0;
  const raw = clamp(density * 0.6 + coverage * 0.4, 0.1, 1.0);
  return Math.round(raw * 100) / 100;
}

// ── Main function ──────────────────────────────────────────────────────────

/**
 * Compute Bloom windows from a fixed fixture input.
 *
 * Deterministic: same input → same output. Pure computation.
 * Windows are split at event boundaries within the requested hour range.
 */
export function computeBloomWindowsFromFixture(
  input: BloomWindowFixtureInput
): BloomWindowFixtureResult {
  const { profileId, startHour, endHour, readings } = input;

  if (readings.length === 0 || startHour >= endHour) {
    return { profileId, windowCount: 0, windows: [] };
  }

  // Sort readings by hour
  const sorted = [...readings].sort((a, b) => a.hour - b.hour);

  // Split into windows at event boundaries (every 2 hours or at event type change)
  const windows: ComputedBloomWindow[] = [];
  let windowStart = startHour;
  let windowIndex = 0;

  while (windowStart < endHour) {
    const windowEnd = Math.min(windowStart + 2, endHour);
    const windowReadings = sorted.filter(
      (r) => r.hour >= windowStart && r.hour < windowEnd
    );

    const stats = computeGlucoseStats(windowReadings);
    const rawVariability =
      windowReadings.length > 1
        ? (stats.peak - stats.min) / stats.avg
        : 0;
    const variability = Math.min(Math.round(rawVariability * 1000) / 1000, 1);

    const pigmentKey = dominantPigmentForWindow(windowReadings);
    const state = stateForWindow(stats.avg, variability);
    const hoursSpan = windowEnd - windowStart;

    // Build event context
    const eventTypes = [...new Set(windowReadings.map((r) => r.eventType))];
    const eventContext =
      eventTypes.length > 0 ? eventTypes.join(', ') : 'no-data';

    // Intensity: 0..1 based on how far from ideal range (70-140 mg/dL)
    const deviation = Math.max(0, stats.avg - 140, 70 - stats.avg);
    const intensity = clamp(deviation / 100, 0, 1);

    windows.push({
      id: `bw-fixture-${profileId.slice(-8)}-${windowIndex}`,
      label: `Window ${windowIndex + 1} (${windowStart}:00-${windowEnd}:00)`,
      startHour: windowStart,
      endHour: windowEnd,
      value: clamp(stats.avg / 250, 0, 1), // Normalized 0..1
      confidence: confidenceForWindow(
        windowReadings.length,
        sorted.length,
        hoursSpan
      ),
      variability,
      intensity: Math.round(intensity * 100) / 100,
      state,
      pigmentKey,
      glucoseAvg: stats.avg,
      glucosePeak: stats.peak,
      rateOfChange: computeRateOfChange(windowReadings),
      dataCompleteness:
        Math.round(
          (windowReadings.length / Math.max(1, hoursSpan)) * 100
        ) / 100,
      eventContext,
    });

    windowStart = windowEnd;
    windowIndex++;
  }

  return { profileId, windowCount: windows.length, windows };
}
