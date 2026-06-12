import { getClient } from '../db/poolManager.js';

export type T1DProfileSubjectType = 'sparky_user' | 'simulated' | 'legend';

export interface T1DProfile {
  id: string;
  sparky_user_id: string | null;
  subject_type: T1DProfileSubjectType;
  display_name: string;
  legend_key: string | null;
  status: string;
  metadata_json: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

async function getOrCreateProfileForSparkyUser(
  userId: string,
  actingUserId: string,
  overrides: Partial<Pick<T1DProfile, 'display_name' | 'metadata_json'>> = {}
): Promise<T1DProfile> {
  const client = await getClient(actingUserId);
  try {
    const result = await client.query(
      `
      INSERT INTO public.t1d_profiles (
        sparky_user_id,
        subject_type,
        display_name,
        status,
        metadata_json
      ) VALUES ($1, 'sparky_user', COALESCE($2, 'T1D Profile'), 'active', COALESCE($3, '{}'::jsonb))
      ON CONFLICT (sparky_user_id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        metadata_json = public.t1d_profiles.metadata_json || EXCLUDED.metadata_json,
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING *
      `,
      [
        userId,
        overrides.display_name ?? null,
        JSON.stringify(overrides.metadata_json ?? {}),
      ]
    );

    return result.rows[0] as T1DProfile;
  } finally {
    client.release();
  }
}

async function getProfileById(
  profileId: string,
  userId: string
): Promise<T1DProfile | null> {
  const client = await getClient(userId);
  try {
    const result = await client.query(
      `
      SELECT *
      FROM public.t1d_profiles
      WHERE id = $1
      LIMIT 1
      `,
      [profileId]
    );

    return (result.rows[0] as T1DProfile | undefined) ?? null;
  } finally {
    client.release();
  }
}

async function getProfilesForSparkyUser(userId: string): Promise<T1DProfile[]> {
  const client = await getClient(userId);
  try {
    const result = await client.query(
      `
      SELECT *
      FROM public.t1d_profiles
      WHERE sparky_user_id = $1
      ORDER BY created_at DESC
      `,
      [userId]
    );

    return result.rows as T1DProfile[];
  } finally {
    client.release();
  }
}

export default {
  getOrCreateProfileForSparkyUser,
  getProfileById,
  getProfilesForSparkyUser,
};
