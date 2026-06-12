/**
 * SATO_THEME — the canonical Sato skin theme contract.
 *
 * Centralizes palette, pigment metadata, surfaces, typography metadata,
 * and visual-token vocabulary in a backend-safe, serializable form.
 * Reuses the existing SATO_PIGMENTS registry — no duplicate pigment definitions.
 */

import { SATO_PIGMENTS } from '../pigments/palette.js';
import type {
  SatoPalette,
  SatoSurfaces,
  SatoTheme,
  SatoTypography,
  SatoVisualTokenVocabulary,
} from './types.js';

/** Sato watercolor palette — sourced from the Sato prototype. */
export const SATO_PALETTE: SatoPalette = {
  // watercolor stains
  mutedTeal: '#6F9FA0',
  blueGrey: '#8FB3C2',
  mossGreen: '#9FAE86',
  warmOchre: '#D7B36A',
  apricot: '#E3A061',
  softCoral: '#DB8A6F',
  fadedClay: '#C47B61',

  // vessel neutrals
  vesselWarm: '#D9C49D',
  vesselNeutral: '#C9B49A',

  // ink & labels
  ink: '#211F1B',
  inkWarm: '#5A5249',
  captionBlue: '#5795C7',
  muted: '#8C8175',
  mutedLight: '#A89F95',

  // paper
  paper: '#FBF3E6',
  paperDeep: '#F7EEDC',
  paperCream: '#FFF9EF',
};

/** Surface tokens — semantic assignments from the Sato palette. */
export const SATO_SURFACES: SatoSurfaces = {
  background: SATO_PALETTE.paper,
  card: SATO_PALETTE.paperCream,
  elevated: SATO_PALETTE.paperDeep,
  subtle: SATO_PALETTE.mutedLight,
  ink: SATO_PALETTE.ink,
};

/**
 * Typography metadata — serializable token definitions.
 * Based on the Sato prototype's Georgia-style serif system.
 * Plain metadata only; no React Native StyleSheet or Skia dependencies.
 */
export const SATO_TYPOGRAPHY: SatoTypography = {
  display: {
    fontFamily: 'Georgia',
    fontSize: 58,
    lineHeight: 62,
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  headline: {
    fontFamily: 'Georgia',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '300',
    letterSpacing: 0.3,
  },
  body: {
    fontFamily: 'Georgia',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  caption: {
    fontFamily: 'Georgia',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '300',
    letterSpacing: 0.1,
  },
};

/**
 * Visual token vocabulary — default watercolor rendering parameters.
 * Derived from the Sato art-engine (sato-skia) but expressed as plain
 * serializable values, not renderer-specific types.
 */
export const SATO_VISUAL_TOKENS: SatoVisualTokenVocabulary = {
  palette: [
    SATO_PALETTE.mutedTeal,
    SATO_PALETTE.blueGrey,
    SATO_PALETTE.mossGreen,
    SATO_PALETTE.warmOchre,
    SATO_PALETTE.apricot,
    SATO_PALETTE.softCoral,
  ],
  ellipseCount: 12,
  spreadX: 0.35,
  spreadY: 0.28,
  blur: 0.6,
  noise: 0.15,
  accentCount: 3,
  rotationBias: 0.05,
  opacityBase: 0.12,
  elongation: 1.4,
  edgeSoftness: 0.8,
};

/** The canonical Sato theme contract. */
export const SATO_THEME: SatoTheme = {
  name: 'Sato',
  version: '1.0.0',
  palette: SATO_PALETTE,
  pigments: SATO_PIGMENTS,
  surfaces: SATO_SURFACES,
  typography: SATO_TYPOGRAPHY,
  visualTokens: SATO_VISUAL_TOKENS,
};
