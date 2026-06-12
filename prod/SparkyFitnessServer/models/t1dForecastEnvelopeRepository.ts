import { getClient } from '../db/poolManager.js';

export interface T1DForecastEnvelopeProvenance {
  sourceType?: 'simulation' | 'model' | 'manual' | 'imported_cgm' | 'nightscout';
  sourceId?: string;
  confidence?: number;
  [key: string]: unknown;
}

export interface T1DForecastEnvelopeInput {
  runId: string;
  phase?: 'draft' | 'forecast' | 'review' | 'archived';
  routeRecommendation?: string | null;
  dataMode?: 'demo' | 'simulated' | 'nightscout' | 'manual';
  sourceLabel?: string | null;
  parsedFoods?: unknown[];
  cards?: unknown[];
  safety?: Record<string, unknown>;
  schemaVersion?: string;
  provenance?: T1DForecastEnvelopeProvenance;
}

export interface T1DForecastEnvelope {
  id: string;
  t1d_profile_id: string;
  run_id: string;
  phase: string;
  route_recommendation: string | null;
  data_mode: string;
  source_label: string | null;
  parsed_foods_json: unknown[];
  cards_json: unknown[];
  safety_json: Record<string, unknown>;
  schema_version: string;
  provenance_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

async function createForecastEnvelope(
  profileId: string,
  actingUserId: string,
  input: T1DForecastEnvelopeInput
): Promise<T1DForecastEnvelope> {
  const client = await getClient(actingUserId);
  try {
    const result = await client.query(
      `
      INSERT INTO public.t1d_forecast_envelopes (
        t1d_profile_id,
        run_id,
        phase,
        route_recommendation,
        data_mode,
        source_label,
        parsed_foods_json,
        cards_json,
        safety_json,
        schema_version,
        provenance_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11::jsonb)
      RETURNING *
      `,
      [
        profileId,
        input.runId,
        input.phase ?? 'forecast',
        input.routeRecommendation ?? null,
        input.dataMode ?? 'demo',
        input.sourceLabel ?? null,
        JSON.stringify(input.parsedFoods ?? []),
        JSON.stringify(input.cards ?? []),
        JSON.stringify(input.safety ?? {}),
        input.schemaVersion ?? 'mobile-card-v1',
        JSON.stringify(input.provenance ?? {}),
      ]
    );

    return result.rows[0] as T1DForecastEnvelope;
  } finally {
    client.release();
  }
}

async function getForecastEnvelopeById(
  envelopeId: string,
  actingUserId: string
): Promise<T1DForecastEnvelope | null> {
  const client = await getClient(actingUserId);
  try {
    const result = await client.query(
      `
      SELECT fe.*
      FROM public.t1d_forecast_envelopes fe
      INNER JOIN public.t1d_profiles p ON p.id = fe.t1d_profile_id
      WHERE fe.id = $1
        AND p.sparky_user_id = $2
      LIMIT 1
      `,
      [envelopeId, actingUserId]
    );

    return (result.rows[0] as T1DForecastEnvelope | undefined) ?? null;
  } finally {
    client.release();
  }
}

async function getForecastEnvelopesByProfile(
  profileId: string,
  actingUserId: string
): Promise<T1DForecastEnvelope[]> {
  const client = await getClient(actingUserId);
  try {
    const result = await client.query(
      `
      SELECT fe.*
      FROM public.t1d_forecast_envelopes fe
      INNER JOIN public.t1d_profiles p ON p.id = fe.t1d_profile_id
      WHERE fe.t1d_profile_id = $1
        AND p.sparky_user_id = $2
      ORDER BY fe.created_at DESC
      `,
      [profileId, actingUserId]
    );

    return result.rows as T1DForecastEnvelope[];
  } finally {
    client.release();
  }
}

export default {
  createForecastEnvelope,
  getForecastEnvelopeById,
  getForecastEnvelopesByProfile,
};
