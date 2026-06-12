/**
 * Bloom Window CGM Import Integration Service
 *
 * Computes Bloom windows from real CGM database entries.
 * Deterministic: same input → same output. Pure computation — no DB, no HTTP, no side effects.
 *
 * Each window includes glucoseAvg, glucosePeak, rateOfChange derived from CGM data.
 * Missing CGM data lowers confidence rather than inventing certainty.
 */

import type { MetabolicPigmentKey, BloomState } from '@workspace/shared';

// ── Types ──────────────────────────────────────────────────────────────────

export interface CgmEntry {
  id: string;
  measuredAt: string; // ISO timestamp
  valueMgDl: number;
}

export type CgmBloomInput = CgmWindowComputationInput;

export interface CgmWindowComputationInput {
  profileId: string;
  startHour: number;
  endHour: number;
  entries: CgmEntry[];
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
}

export interface CgmWindowComputationResult {
  profileId: string;
  windowCount: number;
  windows: ComputedBloomWindow[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hourFromIso(iso: string): number {
  return new Date(iso).getUTCHours();
}

function computeGlucoseStats(entries: CgmEntry[]): {
  avg: number;
  peak: number;
  min: number;
} {
  if (entries.length === 0) return { avg: 0, peak: 0, min: 0 };
  const values = entries.map((e) => e.valueMgDl);
  return {
    avg: Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10,
    peak: Math.max(...values),
    min: Math.min(...values),
  };
}

function computeRateOfChange(entries: CgmEntry[]): string {
  if (entries.length < 2) return 'stable';
  const sorted = [...entries].sort(
    (a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime()
  );
  const first = sorted[0].valueMgDl;
  const last = sorted[sorted.length - 1].valueMgDl;
  const delta = last - first;
  if (Math.abs(delta) < 10) return 'stable';
  return delta > 0 ? `rising (${delta > 30 ? 'fast' : 'moderate'})` : `falling (${delta < -30 ? 'fast' : 'moderate'})`;
}

function pigmentKeyForWindow(avg: number, peak: number): MetabolicPigmentKey {
  if (peak > 180) return 'fastSugar';
  if (avg < 70) return 'sleepDebt';
  if (avg > 160) return 'fastSugar';
  if (avg >= 80 && avg <= 140) return 'baseline';
  return 'slowCarb';
}

function stateForWindow(avg: number, variability: number): BloomState {
  if (variability > 60) return 'reactive';
  if (avg > 180 || avg < 70) return 'reactive';
  if (avg >= 80 && avg <= 140 && variability < 30) return 'calm';
  return 'balanced';
}

function confidenceForWindow(
  entriesInWindow: number,
  totalEntries: number,
  hoursSpan: number
): number {
  if (entriesInWindow === 0) return 0.1;
  const density = entriesInWindow / Math.max(1, hoursSpan / 2);
  const coverage = totalEntries > 0 ? entriesInWindow / totalEntries : 0;
  const raw = clamp(density * 0.6 + coverage * 0.4, 0.1, 1.0);
  return Math.round(raw * 100) / 100;
}

// ── Main function ──────────────────────────────────────────────────────────

/**
 * Compute Bloom windows from CGM database entries.
 *
 * Deterministic: same input → same output. Pure computation.
 * Windows are split into 2-hour blocks within the requested hour range.
 * Each window includes glucoseAvg, glucosePeak, rateOfChange derived from CGM data.
 * Missing CGM data lowers confidence rather than inventing certainty.
 */
export function computeBloomWindowsFromCGM(
  input: CgmWindowComputationInput
): CgmWindowComputationResult {
  const { profileId, startHour, endHour, entries } = input;

  if (entries.length === 0 || startHour >= endHour) {
    return { profileId, windowCount: 0, windows: [] };
  }

  // Sort entries by measuredAt
  const sorted = [...entries].sort(
    (a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime()
  );

  const windows: ComputedBloomWindow[] = [];
  let windowStart = startHour;
  let windowIndex = 0;

  while (windowStart < endHour) {
    const windowEnd = Math.min(windowStart + 2, endHour);

    // Find entries whose hour falls within this window
    const windowEntries = sorted.filter((e) => {
      const h = hourFromIso(e.measuredAt);
      return h >= windowStart && h < windowEnd;
    });

    const stats = computeGlucoseStats(windowEntries);
    const variability =
      windowEntries.length > 1
        ? Math.round(((stats.peak - stats.min) / Math.max(stats.avg, 1)) * 100 * 10) / 10
        : 0;

    const pigmentKey = pigmentKeyForWindow(stats.avg, stats.peak);
    const state = stateForWindow(stats.avg, variability);
    const hoursSpan = windowEnd - windowStart;

    const rateOfChange = computeRateOfChange(windowEntries);

    // Intensity: 0..1 based on how far from ideal range (70-140 mg/dL)
    const deviation = Math.max(0, stats.avg - 140, 70 - stats.avg);
    const intensity = clamp(deviation / 100, 0, 1);

    windows.push({
      id: `bw-${profileId}-${windowStart}-${windowEnd}`,
      label: `Window ${windowIndex + 1} (${windowStart}:00-${windowEnd}:00)`,
      startHour: windowStart,
      endHour: windowEnd,
      value: clamp(stats.avg / 250, 0, 1),
      confidence: confidenceForWindow(
        windowEntries.length,
        sorted.length,
        hoursSpan
      ),
      variability,
      intensity: Math.round(intensity * 100) / 100,
      state,
      pigmentKey,
      glucoseAvg: stats.avg,
      glucosePeak: stats.peak,
      rateOfChange,
      dataCompleteness:
        Math.round(
          (windowEntries.length / Math.max(1, hoursSpan)) * 100
        ) / 100,
      eventContext:
        windowEntries.length > 0
          ? `CGM: ${windowEntries.length} reading(s), avg ${stats.avg} mg/dL`
          : 'no-data',
    });

    windowStart = windowEnd;
    windowIndex++;
  }

  return { profileId, windowCount: windows.length, windows };
}
