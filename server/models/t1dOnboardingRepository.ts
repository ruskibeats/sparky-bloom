import { getClient } from '../db/poolManager.js';
import type { SaveT1dOnboardingBody } from '../schemas/t1dOnboarding.zod.js';

export interface T1dOnboardingData {
  id: string;
  t1d_profile_id: string;
  diabetes_type: string | null;
  insulin_regimen: string | null;
  cgm_source: string | null;
  carb_ratio_g_per_unit: number | null;
  insulin_sensitivity_factor_mg_dl_per_unit: number | null;
  baseline_glucose_target_mg_dl: number | null;
  hypo_threshold_mg_dl: number | null;
  hyper_threshold_mg_dl: number | null;
  clinician_guidance_notes: string | null;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

async function saveT1dOnboardingData(
  t1dProfileId: string,
  userId: string,
  data: SaveT1dOnboardingBody
): Promise<T1dOnboardingData> {
  const client = await getClient(userId);
  try {
    const result = await client.query(
      `
      INSERT INTO public.t1d_onboarding_data (
        t1d_profile_id,
        diabetes_type,
        insulin_regimen,
        cgm_source,
        carb_ratio_g_per_unit,
        insulin_sensitivity_factor_mg_dl_per_unit,
        baseline_glucose_target_mg_dl,
        hypo_threshold_mg_dl,
        hyper_threshold_mg_dl,
        clinician_guidance_notes,
        onboarding_completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CASE WHEN $2 IS NOT NULL THEN NOW() ELSE NULL END)
      ON CONFLICT (t1d_profile_id) DO UPDATE SET
        diabetes_type = EXCLUDED.diabetes_type,
        insulin_regimen = EXCLUDED.insulin_regimen,
        cgm_source = EXCLUDED.cgm_source,
        carb_ratio_g_per_unit = EXCLUDED.carb_ratio_g_per_unit,
        insulin_sensitivity_factor_mg_dl_per_unit = EXCLUDED.insulin_sensitivity_factor_mg_dl_per_unit,
        baseline_glucose_target_mg_dl = EXCLUDED.baseline_glucose_target_mg_dl,
        hypo_threshold_mg_dl = EXCLUDED.hypo_threshold_mg_dl,
        hyper_threshold_mg_dl = EXCLUDED.hyper_threshold_mg_dl,
        clinician_guidance_notes = EXCLUDED.clinician_guidance_notes,
        onboarding_completed_at = CASE WHEN EXCLUDED.diabetes_type IS NOT NULL THEN NOW() ELSE public.t1d_onboarding_data.onboarding_completed_at END,
        updated_at = NOW()
      RETURNING *
      `,
      [
        t1dProfileId,
        data.diabetes_type ?? null,
        data.insulin_regimen ?? null,
        data.cgm_source ?? null,
        data.carb_ratio_g_per_unit ?? null,
        data.insulin_sensitivity_factor_mg_dl_per_unit ?? null,
        data.baseline_glucose_target_mg_dl ?? null,
        data.hypo_threshold_mg_dl ?? null,
        data.hyper_threshold_mg_dl ?? null,
        data.clinician_guidance_notes ?? null,
      ]
    );

    return result.rows[0] as T1dOnboardingData;
  } finally {
    client.release();
  }
}

async function getT1dOnboardingByProfileId(
  t1dProfileId: string,
  userId: string
): Promise<T1dOnboardingData | null> {
  const client = await getClient(userId);
  try {
    const result = await client.query(
      `
      SELECT od.*
      FROM public.t1d_onboarding_data od
      INNER JOIN public.t1d_profiles p ON p.id = od.t1d_profile_id
      WHERE od.t1d_profile_id = $1
        AND p.sparky_user_id = $2
      LIMIT 1
      `,
      [t1dProfileId, userId]
    );

    return (result.rows[0] as T1dOnboardingData | undefined) ?? null;
  } finally {
    client.release();
  }
}

async function isT1dOnboardingComplete(userId: string): Promise<boolean> {
  const client = await getClient(userId);
  try {
    const result = await client.query(
      `
      SELECT onboarding_completed_at IS NOT NULL AS complete
      FROM public.t1d_onboarding_data od
      INNER JOIN public.t1d_profiles p ON p.id = od.t1d_profile_id
      WHERE p.sparky_user_id = $1
      LIMIT 1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return false;
    }

    return result.rows[0].complete as boolean;
  } finally {
    client.release();
  }
}

export default {
  saveT1dOnboardingData,
  getT1dOnboardingByProfileId,
  isT1dOnboardingComplete,
};
