/**
 * SATO PIGMENT SYSTEM
 *
 * Canonical pigment definitions for metabolic visualization.
 * Both server (bloom window calculation) and mobile (BloomClock rendering)
 * source their pigments from this single registry.
 *
 * These colors are not labels. They are metabolic pigments.
 * Food, movement, rest and stress mix into watercolor stains.
 * The user should never see this reference chart directly.
 * It exists internally so the Bloom Engine can paint consistently.
 */

import type { BloomCondition, BloomConditionDef, MetabolicPigmentKey, PigmentDef } from "./types";

export const SATO_PIGMENTS: Record<MetabolicPigmentKey, PigmentDef> = {
  baseline: {
    name: "Rice Paper",
    hex: "#F7EEDC",
    meaning: "neutral body state / background vessel",
    opacityBias: 0.08,
    spreadBias: 0.8,
    granulationBias: 0.15,
  },
  slowCarb: {
    name: "Warm Oat",
    hex: "#D9BC78",
    meaning: "slow carbohydrate energy, gradual rise",
    opacityBias: 0.16,
    spreadBias: 0.72,
    granulationBias: 0.28,
  },
  fastSugar: {
    name: "Persimmon Wash",
    hex: "#E88B55",
    meaning: "fast glucose rise, quick metabolic response",
    opacityBias: 0.22,
    spreadBias: 0.86,
    granulationBias: 0.42,
  },
  fatDelay: {
    name: "Toasted Sesame",
    hex: "#B9915E",
    meaning: "delayed digestion, slow tail, extended response",
    opacityBias: 0.18,
    spreadBias: 0.58,
    granulationBias: 0.48,
  },
  proteinSteady: {
    name: "Soft Soy",
    hex: "#A7A982",
    meaning: "steadying meal influence",
    opacityBias: 0.14,
    spreadBias: 0.62,
    granulationBias: 0.22,
  },
  movement: {
    name: "Moss Breath",
    hex: "#789A7A",
    meaning: "movement, walk, run, insulin sensitivity support",
    opacityBias: 0.15,
    spreadBias: 0.74,
    granulationBias: 0.18,
  },
  recovery: {
    name: "Blue Mineral",
    hex: "#7FAFC4",
    meaning: "returning to baseline, recovery, settling",
    opacityBias: 0.15,
    spreadBias: 0.78,
    granulationBias: 0.2,
  },
  stress: {
    name: "Muted Violet",
    hex: "#9B8ABD",
    meaning: "stress, hormonal friction, unexplained resistance",
    opacityBias: 0.16,
    spreadBias: 0.54,
    granulationBias: 0.36,
  },
  sleepDebt: {
    name: "Indigo Fog",
    hex: "#657E9E",
    meaning: "sleep debt, overnight instability, fatigue",
    opacityBias: 0.18,
    spreadBias: 0.68,
    granulationBias: 0.34,
  },
  settling: {
    name: "Sage Water",
    hex: "#A9B99C",
    meaning: "balance returning, gentler metabolic rhythm",
    opacityBias: 0.13,
    spreadBias: 0.82,
    granulationBias: 0.16,
  },
  unknown: {
    name: "Smoke Wash",
    hex: "#AFA79B",
    meaning: "uncertain cause, incomplete context",
    opacityBias: 0.1,
    spreadBias: 0.65,
    granulationBias: 0.3,
  },
};

export function pigmentForKey(key: MetabolicPigmentKey): PigmentDef {
  return SATO_PIGMENTS[key];
}

/** Interpolate between two hex colors (simple linear blend). */
export function interpolateHex(a: string, b: string, t: number): string {
  const ah = parseInt(a.replace("#", ""), 16);
  const bh = parseInt(b.replace("#", ""), 16);
  const ar = (ah >> 16) & 0xff,
    ag = (ah >> 8) & 0xff,
    ab = ah & 0xff;
  const br = (bh >> 16) & 0xff,
    bg = (bh >> 8) & 0xff,
    bb = bh & 0xff;
  const rr = Math.round(ar + (br - ar) * t);
  const rg = Math.round(ag + (bg - ag) * t);
  const rb = Math.round(ab + (bb - ab) * t);
  return `#${((1 << 24) | (rr << 16) | (rg << 8) | rb).toString(16).slice(1)}`;
}

/**
 * Weather conditions map — the Bloom's primary vocabulary.
 * Each condition has a hex tint that is blended into the watercolor
 * background, a human-readable label, and typical triggers.
 */
export const BLOOM_CONDITIONS: Record<BloomCondition, BloomConditionDef> = {
  calm: {
    label: "Calm",
    hex: "#E8E0D4",
    description: "Stable, even, nothing remarkable",
    typicalTriggers: ["consistent meals", "good sleep", "low stress"],
  },
  clear: {
    label: "Clear",
    hex: "#D4E0E8",
    description: "Open, responsive, good energy",
    typicalTriggers: ["morning exercise", "balanced diet", "good recovery"],
  },
  foggy: {
    label: "Foggy",
    hex: "#C8C4C0",
    description: "Sluggish, unclear, hard to read",
    typicalTriggers: ["poor sleep", "high-carb dinner", "illness"],
  },
  reactive: {
    label: "Reactive",
    hex: "#E8B4A0",
    description: "Spiky, volatile, sensitive",
    typicalTriggers: ["high-sugar meals", "stress", "skipped meals"],
  },
  heavy: {
    label: "Heavy",
    hex: "#C4B8A8",
    description: "Dense, slow, stuck",
    typicalTriggers: ["high-fat meal", "overeating", "low activity"],
  },
  restored: {
    label: "Restored",
    hex: "#B4D4C0",
    description: "Recovered, refreshed, balanced",
    typicalTriggers: ["post-exercise recovery", "good sleep", "fasting"],
  },
  charged: {
    label: "Charged",
    hex: "#D4C8E8",
    description: "High energy, ready, sharp",
    typicalTriggers: ["caffeine", "morning after rest day", "pre-exercise"],
  },
};

export function conditionFor(key: BloomCondition): BloomConditionDef {
  return BLOOM_CONDITIONS[key];
}

/** Parse a hex color into RGBA components. */
export function rgba(hex: string, alpha: number): string {
  const h = parseInt(hex.replace("#", ""), 16);
  const r = (h >> 16) & 0xff;
  const g = (h >> 8) & 0xff;
  const b = h & 0xff;
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Map a macro mix to a dominant pigment key.
 * Used when computing bloom windows from food entries.
 */
export function pigmentForMacros(
  carbsRatio: number,
  fatRatio: number,
  proteinRatio: number,
  isFastSugar: boolean
): MetabolicPigmentKey {
  if (isFastSugar) return "fastSugar";
  if (fatRatio > 0.4) return "fatDelay";
  if (proteinRatio > 0.35) return "proteinSteady";
  if (carbsRatio > 0.5) return "slowCarb";
  return "baseline";
}