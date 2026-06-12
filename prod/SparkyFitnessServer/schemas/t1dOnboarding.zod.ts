import { z } from 'zod';

export const diabetesTypeSchema = z.enum(['type_1', 'type_2', 'lada', 'gestational', 'other']).nullable().optional();
export const insulinRegimenSchema = z.enum(['mdi', 'pump', 'hybrid_closed_loop', 'none']).nullable().optional();
export const cgmSourceSchema = z.enum(['nightscout', 'dexcom', 'libre', 'manual', 'none']).nullable().optional();

export const saveT1dOnboardingBodySchema = z.object({
  diabetes_type: diabetesTypeSchema,
  insulin_regimen: insulinRegimenSchema,
  cgm_source: cgmSourceSchema,
  carb_ratio_g_per_unit: z.number().positive().max(500).nullable().optional(),
  insulin_sensitivity_factor_mg_dl_per_unit: z.number().positive().max(500).nullable().optional(),
  baseline_glucose_target_mg_dl: z.number().positive().max(500).nullable().optional(),
  hypo_threshold_mg_dl: z.number().positive().max(500).nullable().optional(),
  hyper_threshold_mg_dl: z.number().positive().max(500).nullable().optional(),
  clinician_guidance_notes: z.string().max(2000).nullable().optional(),
});

export const t1dOnboardingDataSchema = z.object({
  id: z.string().uuid(),
  t1d_profile_id: z.string().uuid(),
  diabetes_type: diabetesTypeSchema,
  insulin_regimen: insulinRegimenSchema,
  cgm_source: cgmSourceSchema,
  carb_ratio_g_per_unit: z.number().nullable(),
  insulin_sensitivity_factor_mg_dl_per_unit: z.number().nullable(),
  baseline_glucose_target_mg_dl: z.number().nullable(),
  hypo_threshold_mg_dl: z.number().nullable(),
  hyper_threshold_mg_dl: z.number().nullable(),
  clinician_guidance_notes: z.string().nullable(),
  onboarding_completed_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type SaveT1dOnboardingBody = z.infer<typeof saveT1dOnboardingBodySchema>;
export type T1dOnboardingData = z.infer<typeof t1dOnboardingDataSchema>;
