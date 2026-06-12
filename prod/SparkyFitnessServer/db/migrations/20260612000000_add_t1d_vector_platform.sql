-- SparkyFitness T1D intelligence layer
-- Enables pgvector-backed T1D profiles, CGM imports, meal-review history,
-- forecast envelopes, and vector documents without collapsing T1D evidence into
-- normal Sparky food/fitness tables.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.t1d_legends (
    key TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    anchor_label TEXT,
    profile_summary TEXT NOT NULL,
    known_routine TEXT,
    baseline_patterns JSONB NOT NULL DEFAULT '{}'::jsonb,
    meal_patterns JSONB NOT NULL DEFAULT '{}'::jsonb,
    cgm_patterns JSONB NOT NULL DEFAULT '{}'::jsonb,
    confidence_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.t1d_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sparky_user_id UUID REFERENCES public."user"(id) ON DELETE CASCADE,
    subject_type TEXT NOT NULL DEFAULT 'sparky_user' CHECK (subject_type IN ('sparky_user', 'simulated', 'legend')),
    display_name TEXT NOT NULL,
    legend_key TEXT REFERENCES public.t1d_legends(key) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'disabled')),
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_t1d_profiles_sparky_user_once
    ON public.t1d_profiles(sparky_user_id)
    WHERE sparky_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_t1d_profiles_subject_type
    ON public.t1d_profiles(subject_type, status);

CREATE TABLE IF NOT EXISTS public.t1d_simulated_users (
    id UUID PRIMARY KEY REFERENCES public.t1d_profiles(id) ON DELETE CASCADE,
    scenario_label TEXT NOT NULL,
    scenario_summary TEXT NOT NULL,
    baseline_mg_dl DOUBLE PRECISION,
    insulin_sensitivity_factor_mg_dl_per_unit DOUBLE PRECISION,
    carb_ratio_g_per_unit DOUBLE PRECISION,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.t1d_nightscout_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    t1d_profile_id UUID NOT NULL REFERENCES public.t1d_profiles(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    base_url TEXT NOT NULL,
    api_token_kid TEXT,
    api_token_encrypted TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'needs_auth', 'error')),
    last_checked_at TIMESTAMPTZ,
    last_error TEXT,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_t1d_nightscout_sources_profile
    ON public.t1d_nightscout_sources(t1d_profile_id, status);

CREATE TABLE IF NOT EXISTS public.t1d_cgm_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    t1d_profile_id UUID NOT NULL REFERENCES public.t1d_profiles(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    source_entry_id TEXT,
    measured_at TIMESTAMPTZ NOT NULL,
    value_mg_dl DOUBLE PRECISION NOT NULL CHECK (value_mg_dl > 0),
    value_mmol_l DOUBLE PRECISION NOT NULL CHECK (value_mmol_l > 0),
    units TEXT NOT NULL DEFAULT 'mg/dL' CHECK (units IN ('mg/dL', 'mmol/L')),
    trend INTEGER,
    direction TEXT,
    device TEXT,
    raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_t1d_cgm_entries_natural_key
    ON public.t1d_cgm_entries(t1d_profile_id, source, measured_at, COALESCE(source_entry_id, ''));

CREATE INDEX IF NOT EXISTS idx_t1d_cgm_entries_profile_time
    ON public.t1d_cgm_entries(t1d_profile_id, measured_at DESC);

CREATE TABLE IF NOT EXISTS public.t1d_meal_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    t1d_profile_id UUID NOT NULL REFERENCES public.t1d_profiles(id) ON DELETE CASCADE,
    legend_key TEXT REFERENCES public.t1d_legends(key) ON DELETE SET NULL,
    data_mode TEXT NOT NULL DEFAULT 'demo' CHECK (data_mode IN ('demo', 'simulated', 'nightscout', 'manual')),
    source_label TEXT,
    normalized_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    envelope_snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    safety_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    schema_version TEXT NOT NULL DEFAULT 'mobile-card-v1',
    copy_version TEXT NOT NULL DEFAULT 'sparky-t1d-v1',
    data_source TEXT NOT NULL DEFAULT 'mobile_demo',
    lifecycle_status TEXT NOT NULL DEFAULT 'saved' CHECK (lifecycle_status IN ('draft', 'saved', 'discussed', 'archived')),
    saved_chat_thread_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_t1d_meal_reviews_profile_created
    ON public.t1d_meal_reviews(t1d_profile_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.t1d_forecast_envelopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    t1d_profile_id UUID NOT NULL REFERENCES public.t1d_profiles(id) ON DELETE CASCADE,
    run_id TEXT NOT NULL,
    phase TEXT NOT NULL DEFAULT 'forecast' CHECK (phase IN ('draft', 'forecast', 'review', 'archived')),
    route_recommendation TEXT,
    data_mode TEXT NOT NULL DEFAULT 'demo' CHECK (data_mode IN ('demo', 'simulated', 'nightscout', 'manual')),
    source_label TEXT,
    parsed_foods_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    cards_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    safety_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    schema_version TEXT NOT NULL DEFAULT 'mobile-card-v1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_t1d_forecast_envelopes_profile_run
    ON public.t1d_forecast_envelopes(t1d_profile_id, run_id);

CREATE INDEX IF NOT EXISTS idx_t1d_forecast_envelopes_profile_created
    ON public.t1d_forecast_envelopes(t1d_profile_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.t1d_vector_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    t1d_profile_id UUID NOT NULL REFERENCES public.t1d_profiles(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_id TEXT,
    title TEXT,
    content_text TEXT NOT NULL,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    embedding HALFVEC(768),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_t1d_vector_documents_natural_key
    ON public.t1d_vector_documents(t1d_profile_id, domain, source_type, COALESCE(source_id, ''));

CREATE INDEX IF NOT EXISTS idx_t1d_vector_documents_profile_domain
    ON public.t1d_vector_documents(t1d_profile_id, domain);

CREATE INDEX IF NOT EXISTS idx_t1d_vector_documents_embedding_hnsw
    ON public.t1d_vector_documents
    USING hnsw (embedding halfvec_cosine_ops)
    WITH (m = 16, ef_construction = 64)
    WHERE embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_t1d_vector_documents_content_fts
    ON public.t1d_vector_documents
    USING gin (to_tsvector('english', content_text));

CREATE INDEX IF NOT EXISTS idx_t1d_vector_documents_metadata_gin
    ON public.t1d_vector_documents
    USING gin (metadata_json);

-- Seed first-class T1D legend/profile data. These are reference records, not
-- dosing recommendations.
INSERT INTO public.t1d_legends (
    key,
    name,
    anchor_label,
    profile_summary,
    known_routine,
    baseline_patterns,
    meal_patterns,
    cgm_patterns,
    confidence_profile,
    created_at,
    updated_at
) VALUES (
    'tom_batchelor_foot2floor',
    'Tom Batchelor / Foot2Floor',
    'Foot2Floor legend',
    'Reference legend profile for Tom Batchelor / Foot2Floor. Used to preserve provenance and domain language for T1D Companion-style simulations inside SparkyFitness.',
    'Public-facing cycling and endurance context is treated as educational legend metadata only. No dosing advice is implied.',
    '{"context":"legend_reference","medical_boundary":"educational_simulation_only"}'::jsonb,
    '{"source":"t1d_companion_seed","status":"seeded"}'::jsonb,
    '{"source":"t1d_companion_seed","status":"seeded"}'::jsonb,
    '{"provenance":"seeded_from_t1d_companion_context","confidence_label":"reference_only"}'::jsonb,
    NOW(),
    NOW()
) ON CONFLICT (key) DO UPDATE SET
    name = EXCLUDED.name,
    anchor_label = EXCLUDED.anchor_label,
    profile_summary = EXCLUDED.profile_summary,
    known_routine = EXCLUDED.known_routine,
    baseline_patterns = EXCLUDED.baseline_patterns,
    meal_patterns = EXCLUDED.meal_patterns,
    cgm_patterns = EXCLUDED.cgm_patterns,
    confidence_profile = EXCLUDED.confidence_profile,
    updated_at = NOW();

INSERT INTO public.t1d_profiles (
    id,
    sparky_user_id,
    subject_type,
    display_name,
    legend_key,
    status,
    metadata_json,
    created_at,
    updated_at
) VALUES (
    '11111111-1111-4111-8111-111111111111',
    NULL,
    'legend',
    'Tom Batchelor / Foot2Floor',
    'tom_batchelor_foot2floor',
    'active',
    '{"seed":"sparky-t1d-vector-platform","public_reference":true}'::jsonb,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    legend_key = EXCLUDED.legend_key,
    status = EXCLUDED.status,
    metadata_json = EXCLUDED.metadata_json,
    updated_at = NOW();

INSERT INTO public.t1d_profiles (
    id,
    sparky_user_id,
    subject_type,
    display_name,
    status,
    metadata_json,
    created_at,
    updated_at
) VALUES
    (
        '22222222-2222-4222-8222-222222222222',
        NULL,
        'simulated',
        'Simulated T1D User: adaptive carb day',
        'active',
        '{"seed":"sparky-t1d-vector-platform","scenario":"adaptive_carb_day"}'::jsonb,
        NOW(),
        NOW()
    ),
    (
        '33333333-3333-4333-8333-333333333333',
        NULL,
        'simulated',
        'Simulated T1D User: low-carb post-run',
        'active',
        '{"seed":"sparky-t1d-vector-platform","scenario":"low_carb_post_run"}'::jsonb,
        NOW(),
        NOW()
    ),
    (
        '44444444-4444-4444-8444-444444444444',
        NULL,
        'simulated',
        'Simulated T1D User: overnight stability',
        'active',
        '{"seed":"sparky-t1d-vector-platform","scenario":"overnight_stability"}'::jsonb,
        NOW(),
        NOW()
    )
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    status = EXCLUDED.status,
    metadata_json = EXCLUDED.metadata_json,
    updated_at = NOW();

INSERT INTO public.t1d_simulated_users (
    id,
    scenario_label,
    scenario_summary,
    baseline_mg_dl,
    insulin_sensitivity_factor_mg_dl_per_unit,
    carb_ratio_g_per_unit,
    metadata_json,
    created_at,
    updated_at
) VALUES
    (
        '22222222-2222-4222-8222-222222222222',
        'adaptive_carb_day',
        'Simulated day with CGM-aware meal timing and conservative confidence language.',
        110,
        NULL,
        NULL,
        '{"purpose":"demo_seed","medical_boundary":"educational_simulation_only"}'::jsonb,
        NOW(),
        NOW()
    ),
    (
        '33333333-3333-4333-8333-333333333333',
        'low_carb_post_run',
        'Simulated low-carbohydrate post-run review with saved meal-review context.',
        105,
        NULL,
        NULL,
        '{"purpose":"demo_seed","medical_boundary":"educational_simulation_only"}'::jsonb,
        NOW(),
        NOW()
    ),
    (
        '44444444-4444-4444-8444-444444444444',
        'overnight_stability',
        'Simulated overnight CGM stability scenario for vector search examples.',
        100,
        NULL,
        NULL,
        '{"purpose":"demo_seed","medical_boundary":"educational_simulation_only"}'::jsonb,
        NOW(),
        NOW()
    )
ON CONFLICT (id) DO UPDATE SET
    scenario_label = EXCLUDED.scenario_label,
    scenario_summary = EXCLUDED.scenario_summary,
    baseline_mg_dl = EXCLUDED.baseline_mg_dl,
    insulin_sensitivity_factor_mg_dl_per_unit = EXCLUDED.insulin_sensitivity_factor_mg_dl_per_unit,
    carb_ratio_g_per_unit = EXCLUDED.carb_ratio_g_per_unit,
    metadata_json = EXCLUDED.metadata_json,
    updated_at = NOW();

INSERT INTO public.t1d_vector_documents (
    id,
    t1d_profile_id,
    domain,
    source_type,
    source_id,
    title,
    content_text,
    metadata_json,
    created_at,
    updated_at
) VALUES
    (
        '55555555-5555-4555-8555-555555555555',
        '11111111-1111-4111-8111-111111111111',
        'legend',
        'profile_summary',
        'tom_batchelor_foot2floor',
        'Tom Batchelor / Foot2Floor legend profile',
        'Tom Batchelor / Foot2Floor is stored as a first-class T1D legend profile inside SparkyFitness. The profile preserves provenance, confidence language, and the educational boundary for T1D Companion-style simulations. It is not treatment or dosing advice.',
        '{"seed":"sparky-t1d-vector-platform","domain":"legend","confidence":"reference_only"}'::jsonb,
        NOW(),
        NOW()
    ),
    (
        '66666666-6666-4666-8666-666666666666',
        '22222222-2222-4222-8222-222222222222',
        'simulation',
        'profile_summary',
        'simulated_adaptive_carb_day',
        'Simulated adaptive carb day profile',
        'Simulated T1D user for adaptive carbohydrate day scenarios. Intended for meal forecast, saved review, and vector-search examples with conservative confidence and safety metadata.',
        '{"seed":"sparky-t1d-vector-platform","scenario":"adaptive_carb_day"}'::jsonb,
        NOW(),
        NOW()
    ),
    (
        '77777777-7777-4777-8777-777777777777',
        '33333333-3333-4333-8333-333333333333',
        'simulation',
        'profile_summary',
        'simulated_low_carb_post_run',
        'Simulated low-carb post-run profile',
        'Simulated T1D user for low-carb post-run review scenarios. Intended to preserve saved meal-review context and demonstrate SparkyFitness as the T1D vector platform.',
        '{"seed":"sparky-t1d-vector-platform","scenario":"low_carb_post_run"}'::jsonb,
        NOW(),
        NOW()
    ),
    (
        '88888888-8888-4888-8888-888888888888',
        '44444444-4444-4444-8444-444444444444',
        'simulation',
        'profile_summary',
        'simulated_overnight_stability',
        'Simulated overnight stability profile',
        'Simulated T1D user for overnight CGM stability scenarios. Intended for vector search and RAG examples over T1D context, not for dosing or treatment recommendations.',
        '{"seed":"sparky-t1d-vector-platform","scenario":"overnight_stability"}'::jsonb,
        NOW(),
        NOW()
    )
ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    content_text = EXCLUDED.content_text,
    metadata_json = EXCLUDED.metadata_json,
    updated_at = NOW();
