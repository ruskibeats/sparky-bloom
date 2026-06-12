import { describe, it, expect } from 'vitest';
import { SATO_THEME } from '@workspace/shared';

describe('Sato shared theme contract', () => {
  it('exports a deterministic SATO_THEME with palette, pigments, surfaces, typography, and visualTokens', () => {
    // Top-level identity
    expect(SATO_THEME).toBeTypeOf('object');
    expect(SATO_THEME.name).toBe('Sato');
    expect(SATO_THEME.version).toBeTypeOf('string');

    // Required top-level keys
    expect(SATO_THEME).toHaveProperty('palette');
    expect(SATO_THEME).toHaveProperty('pigments');
    expect(SATO_THEME).toHaveProperty('surfaces');
    expect(SATO_THEME).toHaveProperty('typography');
    expect(SATO_THEME).toHaveProperty('visualTokens');

    // Palette: Sato watercolor keys from prototype
    const palette = SATO_THEME.palette;
    expect(palette.paper).toBe('#FBF3E6');
    expect(palette.paperDeep).toBe('#F7EEDC');
    expect(palette.paperCream).toBe('#FFF9EF');
    expect(palette.ink).toBe('#211F1B');
    expect(palette.inkWarm).toBe('#5A5249');
    expect(palette.mutedTeal).toBe('#6F9FA0');
    expect(palette.blueGrey).toBe('#8FB3C2');
    expect(palette.mossGreen).toBe('#9FAE86');
    expect(palette.warmOchre).toBe('#D7B36A');
    expect(palette.apricot).toBe('#E3A061');
    expect(palette.softCoral).toBe('#DB8A6F');

    // Pigments: all canonical keys present with required metadata fields
    const pigments = SATO_THEME.pigments;
    const expectedPigmentKeys = [
      'baseline', 'slowCarb', 'fastSugar', 'fatDelay', 'proteinSteady',
      'movement', 'recovery', 'stress', 'sleepDebt', 'settling', 'unknown',
    ];
    for (const key of expectedPigmentKeys) {
      expect(pigments).toHaveProperty(key);
      const p = (pigments as unknown as Record<string, { name: string; hex: string; meaning: string; opacityBias: number; spreadBias: number; granulationBias: number }>)[key];
      expect(p.name).toBeTypeOf('string');
      expect(p.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(p.meaning).toBeTypeOf('string');
      expect(p.opacityBias).toBeTypeOf('number');
      expect(p.spreadBias).toBeTypeOf('number');
      expect(p.granulationBias).toBeTypeOf('number');
    }

    // Surfaces: paper/background/card-ish tokens using palette values
    const surfaces = SATO_THEME.surfaces;
    expect(surfaces.background).toBeTypeOf('string');
    expect(surfaces.card).toBeTypeOf('string');
    expect(surfaces.elevated).toBeTypeOf('string');
    expect(surfaces.subtle).toBeTypeOf('string');
    expect(surfaces.ink).toBeTypeOf('string');

    // Typography: serializable metadata (not RN styles)
    const typography = SATO_THEME.typography;
    expect(typography).toHaveProperty('display');
    expect(typography).toHaveProperty('headline');
    expect(typography).toHaveProperty('body');
    expect(typography).toHaveProperty('caption');
    for (const key of ['display', 'headline', 'body', 'caption'] as const) {
      const t = (typography as unknown as Record<string, { fontFamily: string; fontSize: number; lineHeight: number; fontWeight: string; letterSpacing?: number }>)[key];
      expect(t.fontFamily).toBeTypeOf('string');
      expect(t.fontSize).toBeTypeOf('number');
      expect(t.lineHeight).toBeTypeOf('number');
      expect(t.fontWeight).toBeTypeOf('string');
    }

    // Visual tokens: vocabulary keys from art-engine evidence
    const vt = SATO_THEME.visualTokens;
    expect(vt).toHaveProperty('palette');
    expect(vt).toHaveProperty('ellipseCount');
    expect(vt).toHaveProperty('spreadX');
    expect(vt).toHaveProperty('spreadY');
    expect(vt).toHaveProperty('blur');
    expect(vt).toHaveProperty('noise');
    expect(vt).toHaveProperty('accentCount');
    expect(vt).toHaveProperty('rotationBias');
    expect(vt).toHaveProperty('opacityBase');
    expect(vt).toHaveProperty('elongation');
    expect(vt).toHaveProperty('edgeSoftness');
  });
});
