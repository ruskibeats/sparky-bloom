/**
 * Bloom types — the shared vocabulary for metabolic visualization.
 *
 * These types are used by the server (to compute bloom windows from
 * food/exercise/sleep data) and the mobile app (to render the BloomClock).
 */

/** The 11 canonical metabolic pigment keys. */
export type MetabolicPigmentKey =
  | "slowCarb"
  | "fastSugar"
  | "fatDelay"
  | "proteinSteady"
  | "movement"
  | "recovery"
  | "stress"
  | "sleepDebt"
  | "settling"
  | "baseline"
  | "unknown";

/** Metadata for one pigment — used by both server and renderer. */
export interface PigmentDef {
  name: string;
  hex: string;
  meaning: string;
  opacityBias: number;
  spreadBias: number;
  granulationBias: number;
}

export type BloomState = "balanced" | "reactive" | "calm";

/**
 * A single time window in a user's daily bloom.
 * Each window covers a contiguous block of hours and is assigned one
 * dominant pigment based on the metabolic events in that period.
 */
export interface BloomWindow {
  id: string;
  startHour: number;
  endHour: number;
  label: string;
  value: number;
  confidence: number;
  variability: number;
  intensity: number;
  state: BloomState;
  pigmentKey: MetabolicPigmentKey;
  glucoseAvg?: number;
  glucosePeak?: number;
  rateOfChange?: string;
  dataCompleteness?: number;
  eventContext?: string;
  classificationReason?: string;
  note?: string;
}

/**
 * A marker or "memory" anchored at a specific time and angle on the
 * BloomClock dial — used for exercise sessions, notable meals, etc.
 */
export interface BloomMemoryMark {
  id: string;
  startHour: number;
  angle: number;
  distance: number;
  intensity: number;
  color: string;
  pigmentKey?: MetabolicPigmentKey;
  size: number;
  softness?: number;
}

/**
 * A user's unique "identity bloom" — deterministic noise seed that
 * makes each person's BloomClock visually distinct.
 */
export interface IdentityBloom {
  seed: string;
  petalNoise: number[];
  asymmetry: number;
  haloBias: number;
  pigmentBias: number;
  createdAt: string;
  version: number;
}