import { getClient } from '../db/poolManager.js';

export interface T1DCGMEntryInput {
  source: string;
  sourceEntryId?: string | null;
  measuredAt: Date;
  valueMgDl: number;
  valueMmolL: number;
  units?: 'mg/dL' | 'mmol/L';
  trend?: number | null;
  direction?: string | null;
  device?: string | null;
  rawJson?: Record<string, unknown> | null;
}

export interface T1DCGMEntry extends T1DCGMEntryInput {
  id: string;
  t1d_profile_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface T1DNightscoutSourceInput {
  label: string;
  baseUrl: string;
  apiTokenKid?: string | null;
  apiTokenEncrypted?: string | null;
  status?: 'active' | 'disabled' | 'needs_auth' | 'error';
  metadataJson?: Record<string, unknown> | null;
}

export interface T1DNightscoutSource extends T1DNightscoutSourceInput {
  id: string;
  t1d_profile_id: string;
  last_checked_at: Date | null;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UpsertCgmEntriesResult {
  entries: T1DCGMEntry[];
  insertedCount: number;
  duplicateCount: number;
}

async function upsertCgmEntries(
  profileId: string,
  actingUserId: string,
  entries: T1DCGMEntryInput[]
): Promise<UpsertCgmEntriesResult> {
  if (entries.length === 0) {
    return { entries: [], insertedCount: 0, duplicateCount: 0 };
  }

  const client = await getClient(actingUserId);
  try {
    await client.query('BEGIN');

    const values: unknown[] = [];
    const rows = entries
      .map((entry, index) => {
        const base = index * 11;
        values.push(
          profileId,
          entry.source,
          entry.sourceEntryId ?? '',
          entry.measuredAt,
          entry.valueMgDl,
          entry.valueMmolL,
          entry.units ?? 'mg/dL',
          entry.trend ?? null,
          entry.direction ?? null,
          entry.device ?? null,
          entry.rawJson ?? {}
        );

        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10}, $${base + 11}::jsonb)`;
      })
      .join(', ');

    const result = await client.query(
      `
      INSERT INTO public.t1d_cgm_entries (
        t1d_profile_id,
        source,
        source_entry_id,
        measured_at,
        value_mg_dl,
        value_mmol_l,
        units,
        trend,
        direction,
        device,
        raw_json
      )
      VALUES ${rows}
      ON CONFLICT (t1d_profile_id, source, measured_at, COALESCE(source_entry_id, '')) DO UPDATE SET
        value_mg_dl = EXCLUDED.value_mg_dl,
        value_mmol_l = EXCLUDED.value_mmol_l,
        units = EXCLUDED.units,
        trend = EXCLUDED.trend,
        direction = EXCLUDED.direction,
        device = EXCLUDED.device,
        raw_json = EXCLUDED.raw_json,
        updated_at = NOW()
      RETURNING *, (xmax = 0) AS is_insert
      `,
      values
    );

    await client.query('COMMIT');
    const allEntries = result.rows as Array<T1DCGMEntry & { is_insert: boolean }>;
    const insertedCount = allEntries.filter((row) => row.is_insert).length;
    const duplicateCount = allEntries.length - insertedCount;
    return {
      entries: allEntries.map(({ is_insert: _is_insert, ...entry }) => entry as T1DCGMEntry),
      insertedCount,
      duplicateCount,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function getCgmEntriesByDateRange(
  profileId: string,
  userId: string,
  startDate: string,
  endDate: string
): Promise<T1DCGMEntry[]> {
  const client = await getClient(userId);
  try {
    const result = await client.query(
      `
      SELECT *
      FROM public.t1d_cgm_entries
      WHERE t1d_profile_id = $1
        AND measured_at >= $2::timestamptz
        AND measured_at < $3::timestamptz
      ORDER BY measured_at ASC
      `,
      [profileId, startDate, endDate]
    );

    return result.rows as T1DCGMEntry[];
  } finally {
    client.release();
  }
}

async function upsertNightscoutSource(
  profileId: string,
  actingUserId: string,
  source: T1DNightscoutSourceInput
): Promise<T1DNightscoutSource> {
  const client = await getClient(actingUserId);
  try {
    const result = await client.query(
      `
      INSERT INTO public.t1d_nightscout_sources (
        t1d_profile_id,
        label,
        base_url,
        api_token_kid,
        api_token_encrypted,
        status,
        metadata_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      ON CONFLICT DO NOTHING
      RETURNING *
      `,
      [
        profileId,
        source.label,
        source.baseUrl,
        source.apiTokenKid ?? null,
        source.apiTokenEncrypted ?? null,
        source.status ?? 'active',
        JSON.stringify(source.metadataJson ?? {}),
      ]
    );

    if (result.rows[0]) {
      return result.rows[0] as T1DNightscoutSource;
    }

    const existing = await client.query(
      `
      SELECT *
      FROM public.t1d_nightscout_sources
      WHERE t1d_profile_id = $1
        AND label = $2
        AND base_url = $3
      ORDER BY updated_at DESC
      LIMIT 1
      `,
      [profileId, source.label, source.baseUrl]
    );

    return existing.rows[0] as T1DNightscoutSource;
  } finally {
    client.release();
  }
}

export default {
  upsertCgmEntries,
  getCgmEntriesByDateRange,
  upsertNightscoutSource,
};
