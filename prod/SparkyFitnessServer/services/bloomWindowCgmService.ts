/**
 * Bloom Window CGM Import Integration Service
 *
 * Computes Bloom windows from imported CGM (Nightscout) data so that
 * Bloom windows reflect real glucose summaries instead of synthetic fixtures.
 *
 * Deterministic: same CGM entries always produce the same Bloom windows.
 * Pure computation — no DB, no HTTP, no side effects.
 *
 * When CGM data is missing or sparse, confidence is lowered rather than
 * inventing certainty.
 */

import type {
  BloomWindow,
  MetabolicPigmentKey,
  BloomState,
} from '@workspace/shared';
import type { T1DCGMEntry } from '../models/t1dCgmEntryRepository.js';

// ── Types ──────────────────────────────────────────────────────────────────

export interface CgmBloomWindowInput {
  profileId: string;
  startHour: number;
  endHour: number;
  entries: T1DCGMEntry[];
}

/** Simplified input for direct CGM data entry (used in tests and lightweight callers). */
export interface CgmBloomInput {
  profileId: string;
  startHour: number;
  endHour: number;
  entries: Array<{
    measuredAt: string;
    valueMgDl: number;
    id?: string;
    t1d_profile_id?: string;
    source?: string;
    sourceEntryId?: string | null;
    valueMmolL?: number;
    units?: string;
    trend?: number | null;
    direction?: string | null;
    device?: string | null;
    rawJson?: Record<string, unknown> | null;
    created_at?: Date;
    updated_at?: Date;
  }>;
}

interface CgmEntryInternal {
  id: string;
  measuredAt: Date;
  valueMgDl: number;
}

export interface CgmBloomWindowResult {
  profileId: string;
  windows: BloomWindow[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Compute glucose stats from CGM entries that fall within a window's hour range.
 */
function computeGlucoseStats(
  entries: CgmEntryInternal[],
  windowStart: number,
  windowEnd: number
): { avg: number | null; peak: number | null; min: number | null; count: number } {
  const windowEntries = entries.filter((e) => {
    const hour = e.measuredAt.getUTCHours();
    return hour >= windowStart && hour < windowEnd;
  });

  if (windowEntries.length === 0) {
    return { avg: null, peak: null, min: null, count: 0 };
  }

  const values = windowEntries.map((e) => e.valueMgDl);
  const sum = values.reduce((s, v) => s + v, 0);
  return {
    avg: Math.round((sum / values.length) * 10) / 10,
    peak: Math.max(...values),
    min: Math.min(...values),
    count: windowEntries.length,
  };
}

/**
 * Compute rate of change across time-sorted entries within a window.
 * Returns a human-readable string describing the trend.
 */
function computeRateOfChange(entries: CgmEntryInternal[]): string {
  if (entries.length < 2) return 'FLAT';

  const sorted = [...entries].sort(
    (a, b) => a.measuredAt.getTime() - b.measuredAt.getTime()
  );
  const first = sorted[0].valueMgDl;
  const last = sorted[sorted.length - 1].valueMgDl;
  const delta = last - first;

  if (delta > 15) return 'UP';
  if (delta < -15) return 'DOWN';
  return 'FLAT';
}

/**
 * Determine data completeness for a window based on reading density.
 * Ideal: at least 1 reading per 2 hours.
 */
function computeDataCompleteness(
  entriesInWindow: number,
  hoursSpan: number
): number {
  if (hoursSpan <= 0) return 0;
  // Ideal: at least 1 reading per hour within the window
  const ideal = Math.max(1, hoursSpan);
  const ratio = Math.min(entriesInWindow / ideal, 1.0);
  return Math.round(ratio * 100) / 100;
}

/**
 * Derive a Bloom state from glucose statistics.
 */
function deriveBloomState(
  avg: number | null,
  peak: number | null,
  variability: number
): BloomState {
  if (avg === null) return 'balanced'; // default when no data
  if (variability > 60 || avg > 180 || avg < 70) return 'reactive';
  if (avg >= 80 && avg <= 140 && variability < 30) return 'calm';
  return 'balanced';
}

/**
 * Derive a metabolic pigment key from glucose characteristics.
 */
function derivePigmentKey(
  avg: number | null,
  peak: number | null,
  variability: number,
  rateOfChangeLabel: string
): MetabolicPigmentKey {
  if (avg === null) return 'unknown';

  if (peak !== null && peak > 180) return 'fastSugar';
  if (variability > 50) return 'stress';
  if (avg > 160 && rateOfChangeLabel === 'UP') return 'fastSugar';
  if (avg < 80) return 'sleepDebt';
  if (avg >= 80 && avg <= 140 && variability < 30) return 'baseline';
  if (rateOfChangeLabel === 'DOWN') return 'settling';

  return 'baseline';
}

function generateWindowId(profileId: string, windowIndex: number): string {
  return `bw-cgm-${profileId.slice(-8)}-${windowIndex}`;
}

// ── Main function ──────────────────────────────────────────────────────────

/**
 * Compute Bloom windows from imported CGM entries.
 *
 * This integrates real CGM data with the Bloom window computation so windows
 * reflect actual glucose summaries from Nightscout/CGM import.
 *
 * - Deterministic: same entries → same windows
 * - Missing data → lower confidence (never invented certainty)
 * - Each window includes glucoseAvg, glucosePeak, rateOfChange
 */
export function computeBloomWindowsFromCGM(
  input: CgmBloomWindowInput | CgmBloomInput
): CgmBloomWindowResult {
  const { profileId, startHour, endHour } = input;

  // Normalize entries to internal format
  const entries: CgmEntryInternal[] = input.entries.map((e, idx) => {
    const measuredAt = new Date(
      'measuredAt' in e && e.measuredAt
        ? (typeof e.measuredAt === 'string' ? e.measuredAt : e.measuredAt.toISOString())
        : new Date().toISOString()
    );
    const valueMgDl =
      'valueMgDl' in e ? e.valueMgDl : 0;
    return {
      id: 'id' in e && e.id ? e.id : `cgm-${idx}`,
      measuredAt,
      valueMgDl,
    };
  });

  if (entries.length === 0 || startHour >= endHour) {
    return { profileId, windows: [] };
  }

  // Sort entries by measuredAt for deterministic processing
  const sorted = [...entries].sort(
    (a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime()
  );

  const windows: BloomWindow[] = [];
  let windowStart = startHour;
  let windowIndex = 0;

  while (windowStart < endHour) {
    const windowEnd = Math.min(windowStart + 2, endHour);
    const hoursSpan = windowEnd - windowStart;

    // Find entries in this window
    const windowEntries = sorted.filter((e) => {
      const hour = new Date(e.measuredAt).getUTCHours();
      return hour >= windowStart && hour < windowEnd;
    });

    const stats = computeGlucoseStats(entries, windowStart, windowEnd);
    const rateOfChange = computeRateOfChange(windowEntries);
    const dataCompleteness = computeDataCompleteness(
      windowEntries.length,
      hoursSpan
    );

    // Variability: coefficient of variation proxy
    const variability =
      stats.avg !== null && stats.avg > 0 && stats.peak !== null && stats.min !== null
        ? Math.round(((stats.peak - stats.min) / stats.avg) * 100 * 10) / 10
        : 0;

    const state = deriveBloomState(stats.avg, stats.peak, variability);
    const pigmentKey = derivePigmentKey(
      stats.avg,
      stats.peak,
      variability,
      rateOfChange
    );

    // Confidence: based on data completeness, lowered for sparse data.
    // Also factor in overall entry density across the full range.
    const totalPossibleSlots = Math.max(1, (endHour - startHour) / 2);
    const overallDensity = Math.min(entries.length / totalPossibleSlots, 1.0);
    const confidence = stats.count > 0
      ? clamp(dataCompleteness * 0.7 + overallDensity * 0.2 + 0.1, 0.1, 0.95)
      : 0.1;

    // Intensity: 0..1 based on how far from ideal glucose range (70-140)
    const avgForIntensity = stats.avg ?? 100;
    const deviation = Math.max(0, avgForIntensity - 140, 70 - avgForIntensity);
    const intensity = clamp(deviation / 100, 0, 1);

    windows.push({
      id: generateWindowId(profileId, windowIndex),
      startHour: windowStart,
      endHour: windowEnd,
      label: `Window ${windowIndex + 1} (${windowStart}:00-${windowEnd}:00)`,
      value: clamp(avgForIntensity / 250, 0, 1),
      confidence: Math.round(confidence * 100) / 100,
      variability,
      intensity: Math.round(intensity * 100) / 100,
      state,
      pigmentKey,
      glucoseAvg: stats.avg ?? undefined,
      glucosePeak: stats.peak ?? undefined,
      rateOfChange,
      dataCompleteness,
      eventContext:
        windowEntries.length > 0
          ? `cgm:${windowEntries.length}`
          : 'no-data',
      classificationReason:
        stats.count > 0
          ? `Derived from ${stats.count} CGM reading(s), Completeness ${(dataCompleteness * 100).toFixed(0)}%`
          : 'No CGM data available for this window',
    });

    windowStart = windowEnd;
    windowIndex++;
  }

  return { profileId, windows };
}
