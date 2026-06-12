import { v4 as uuidv4 } from 'uuid';
import { getClient } from '../db/poolManager.js';
import { getOllamaEmbeddingDimension } from '../services/embeddingService.js';

const embeddingDimension = getOllamaEmbeddingDimension();

export interface T1DVectorDocumentInput {
  id?: string;
  domain: string;
  sourceType: string;
  sourceId?: string | null;
  title?: string | null;
  contentText: string;
  metadataJson?: Record<string, unknown> | null;
  embedding?: number[] | null;
}

export interface T1DVectorDocument extends T1DVectorDocumentInput {
  id: string;
  t1d_profile_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface T1DVectorSearchResult extends T1DVectorDocument {
  similarity?: number;
}

async function upsertVectorDocument(
  profileId: string,
  actingUserId: string,
  document: T1DVectorDocumentInput
): Promise<T1DVectorDocument> {
  const id = document.id ?? uuidv4();
  const client = await getClient(actingUserId);
  try {
    const result = await client.query(
      `
      INSERT INTO public.t1d_vector_documents (
        id,
        t1d_profile_id,
        domain,
        source_type,
        source_id,
        title,
        content_text,
        metadata_json,
        embedding
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::halfvec(${embeddingDimension}))
      ON CONFLICT (t1d_profile_id, domain, source_type, COALESCE(source_id, '')) DO UPDATE SET
        title = EXCLUDED.title,
        content_text = EXCLUDED.content_text,
        metadata_json = EXCLUDED.metadata_json,
        embedding = EXCLUDED.embedding,
        updated_at = NOW()
      RETURNING *
      `,
      [
        id,
        profileId,
        document.domain,
        document.sourceType,
        document.sourceId ?? null,
        document.title ?? null,
        document.contentText,
        JSON.stringify(document.metadataJson ?? {}),
        document.embedding ? `[${document.embedding.join(',')}]` : null,
      ]
    );

    return result.rows[0] as T1DVectorDocument;
  } finally {
    client.release();
  }
}

async function searchVectorDocuments(
  profileId: string,
  userId: string,
  query: string,
  embedding: number[] | null | undefined,
  limit = 5
): Promise<T1DVectorSearchResult[]> {
  const client = await getClient(userId);
  try {
    if (embedding && embedding.length > 0) {
      const embeddingLiteral = `[${embedding.join(',')}]`;
      const result = await client.query(
        `
        SELECT
          id,
          t1d_profile_id,
          domain,
          source_type,
          source_id,
          title,
          content_text,
          metadata_json,
          embedding,
          created_at,
          updated_at,
          1 - (embedding <=> $4::halfvec(${embeddingDimension})) AS similarity
        FROM public.t1d_vector_documents
        WHERE t1d_profile_id = $1
          AND embedding IS NOT NULL
        ORDER BY embedding <=> $4::halfvec(${embeddingDimension})
        LIMIT $3
        `,
        [profileId, query, Math.max(1, Math.min(limit, 50)), embeddingLiteral]
      );

      return result.rows as T1DVectorSearchResult[];
    }

    const result = await client.query(
      `
      SELECT
        id,
        t1d_profile_id,
        domain,
        source_type,
        source_id,
        title,
        content_text,
        metadata_json,
        embedding,
        created_at,
        updated_at,
        ts_rank(to_tsvector('english', content_text), websearch_to_tsquery('english', $2)) AS similarity
      FROM public.t1d_vector_documents
      WHERE t1d_profile_id = $1
        AND to_tsvector('english', content_text) @@ websearch_to_tsquery('english', $2)
      ORDER BY similarity DESC
      LIMIT $3
      `,
      [profileId, query, Math.max(1, Math.min(limit, 50))]
    );

    return result.rows as T1DVectorSearchResult[];
  } finally {
    client.release();
  }
}

export default {
  upsertVectorDocument,
  searchVectorDocuments,
};
