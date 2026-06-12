import { getClient } from '../db/poolManager.js';

export interface T1DMealReviewInput {
  t1dProfileId: string;
  legendKey?: string | null;
  dataMode?: 'demo' | 'simulated' | 'nightscout' | 'manual';
  sourceLabel?: string | null;
  normalizedJson?: Record<string, unknown>;
  envelopeSnapshotJson?: Record<string, unknown>;
  safetyJson?: Record<string, unknown>;
  schemaVersion?: string;
  copyVersion?: string;
  dataSource?: string;
  lifecycleStatus?: 'draft' | 'saved' | 'discussed' | 'archived';
  savedChatThreadId?: string | null;
}

export interface T1DMealReview {
  id: string;
  t1d_profile_id: string;
  legend_key: string | null;
  data_mode: string;
  source_label: string | null;
  normalized_json: Record<string, unknown>;
  envelope_snapshot_json: Record<string, unknown>;
  safety_json: Record<string, unknown>;
  schema_version: string;
  copy_version: string;
  data_source: string;
  lifecycle_status: string;
  saved_chat_thread_id: string | null;
  created_at: string;
  updated_at: string;
}

async function createMealReview(
  userId: string,
  input: T1DMealReviewInput
): Promise<T1DMealReview> {
  const client = await getClient(userId);
  try {
    const result = await client.query(
      `
      INSERT INTO public.t1d_meal_reviews (
        t1d_profile_id,
        legend_key,
        data_mode,
        source_label,
        normalized_json,
        envelope_snapshot_json,
        safety_json,
        schema_version,
        copy_version,
        data_source,
        lifecycle_status,
        saved_chat_thread_id
      ) VALUES (
        $1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9, $10, $11, $12
      )
      RETURNING *
      `,
      [
        input.t1dProfileId,
        input.legendKey ?? null,
        input.dataMode ?? 'demo',
        input.sourceLabel ?? null,
        JSON.stringify(input.normalizedJson ?? {}),
        JSON.stringify(input.envelopeSnapshotJson ?? {}),
        JSON.stringify(input.safetyJson ?? {}),
        input.schemaVersion ?? 'mobile-card-v1',
        input.copyVersion ?? 'sparky-t1d-v1',
        input.dataSource ?? 'mobile_demo',
        input.lifecycleStatus ?? 'saved',
        input.savedChatThreadId ?? null,
      ]
    );

    return result.rows[0] as T1DMealReview;
  } finally {
    client.release();
  }
}

async function getMealReviewById(
  reviewId: string,
  userId: string
): Promise<T1DMealReview | null> {
  const client = await getClient(userId);
  try {
    const result = await client.query(
      `
      SELECT mr.*
      FROM public.t1d_meal_reviews mr
      INNER JOIN public.t1d_profiles p ON p.id = mr.t1d_profile_id
      WHERE mr.id = $1
        AND p.sparky_user_id = $2
      LIMIT 1
      `,
      [reviewId, userId]
    );

    return (result.rows[0] as T1DMealReview | undefined) ?? null;
  } finally {
    client.release();
  }
}

async function getMealReviewsForProfile(
  profileId: string,
  userId: string
): Promise<T1DMealReview[]> {
  const client = await getClient(userId);
  try {
    const result = await client.query(
      `
      SELECT mr.*
      FROM public.t1d_meal_reviews mr
      INNER JOIN public.t1d_profiles p ON p.id = mr.t1d_profile_id
      WHERE mr.t1d_profile_id = $1
        AND p.sparky_user_id = $2
      ORDER BY mr.created_at DESC
      `,
      [profileId, userId]
    );

    return result.rows as T1DMealReview[];
  } finally {
    client.release();
  }
}

export default {
  createMealReview,
  getMealReviewById,
  getMealReviewsForProfile,
};
