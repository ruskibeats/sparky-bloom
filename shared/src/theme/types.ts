/**
 * Sato theme types — serializable shared theme contract.
 *
 * These types are backend-safe: no React Native, Skia, or renderer imports.
 * Both `sparky-bloom/server` and `sparky-bloom/mobile` consume via `@workspace/shared`.
 */

import type { MetabolicPigmentKey, PigmentDef } from '../pigments/types.js';

/** Sato watercolor palette — flat color tokens. */
export interface SatoPalette {
  // watercolor stains
  mutedTeal: string;
  blueGrey: string;
  mossGreen: string;
  warmOchre: string;
  apricot: string;
  softCoral: string;
  fadedClay: string;

  // vessel neutrals
  vesselWarm: string;
  vesselNeutral: string;

  // ink & labels
  ink: string;
  inkWarm: string;
  captionBlue: string;
  muted: string;
  mutedLight: string;

  // paper
  paper: string;
  paperDeep: string;
  paperCream: string;
}

/** Surface tokens — semantic color assignments from the palette. */
export interface SatoSurfaces {
  background: string;
  card: string;
  elevated: string;
  subtle: string;
  ink: string;
}

/** Typography metadata — serializable, not React Native style objects. */
export interface SatoTypographyEntry {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: string;
  letterSpacing?: number;
}

/** Typography scale for the Sato skin. */
export interface SatoTypography {
  display: SatoTypographyEntry;
  headline: SatoTypographyEntry;
  body: SatoTypographyEntry;
  caption: SatoTypographyEntry;
}

/**
 * Visual token vocabulary — art-engine metadata as plain values.
 * These describe watercolor rendering parameters without importing Skia.
 */
export interface SatoVisualTokenVocabulary {
  palette: string[];
  ellipseCount: number;
  spreadX: number;
  spreadY: number;
  blur: number;
  noise: number;
  accentCount: number;
  rotationBias: number;
  opacityBase: number;
  elongation: number;
  edgeSoftness: number;
}

/** The top-level Sato theme contract. */
export interface SatoTheme {
  name: string;
  version: string;
  palette: SatoPalette;
  pigments: Record<MetabolicPigmentKey, PigmentDef>;
  surfaces: SatoSurfaces;
  typography: SatoTypography;
  visualTokens: SatoVisualTokenVocabulary;
}
