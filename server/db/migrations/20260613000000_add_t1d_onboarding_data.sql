-- Migration: Add T1D onboarding data table
-- Issue: #75 (decision) → #76 (implementation)
-- Date: 2026-06-13

CREATE TABLE IF NOT EXISTS public.t1d_onboarding_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    t1d_profile_id UUID NOT NULL REFERENCES public.t1d_profiles(id) ON DELETE CASCADE,
    diabetes_type TEXT CHECK (diabetes_type IN ('type_1', 'type_2', 'lada', 'gestational', 'other')),
    insulin_regimen TEXT CHECK (insulin_regimen IN ('mdi', 'pump', 'hybrid_closed_loop', 'none')),
    cgm_source TEXT CHECK (cgm_source IN ('nightscout', 'dexcom', 'libre', 'manual', 'none')),
    carb_ratio_g_per_unit NUMERIC(6,2),
    insulin_sensitivity_factor_mg_dl_per_unit NUMERIC(6,2),
    baseline_glucose_target_mg_dl NUMERIC(6,2),
    hypo_threshold_mg_dl NUMERIC(6,2),
    hyper_threshold_mg_dl NUMERIC(6,2),
    clinician_guidance_notes TEXT,
    onboarding_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_t1d_onboarding_data_profile
    ON public.t1d_onboarding_data(t1d_profile_id);

-- RLS
ALTER TABLE public.t1d_onboarding_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own T1D onboarding data"
    ON public.t1d_onboarding_data
    FOR SELECT
    USING (
        t1d_profile_id IN (
            SELECT id FROM public.t1d_profiles
            WHERE sparky_user_id = current_setting('app.current_user_id')::uuid
        )
    );

CREATE POLICY "Users can insert own T1D onboarding data"
    ON public.t1d_onboarding_data
    FOR INSERT
    WITH CHECK (
        t1d_profile_id IN (
            SELECT id FROM public.t1d_profiles
            WHERE sparky_user_id = current_setting('app.current_user_id')::uuid
        )
    );

CREATE POLICY "Users can update own T1D onboarding data"
    ON public.t1d_onboarding_data
    FOR UPDATE
    USING (
        t1d_profile_id IN (
            SELECT id FROM public.t1d_profiles
            WHERE sparky_user_id = current_setting('app.current_user_id')::uuid
        )
    );

-- Optional: track T1D onboarding completion in onboarding_status
ALTER TABLE public.onboarding_status
    ADD COLUMN IF NOT EXISTS t1d_onboarding_complete BOOLEAN DEFAULT FALSE;
