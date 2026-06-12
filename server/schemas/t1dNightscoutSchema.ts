import { z } from 'zod/v4';
import { getOllamaEmbeddingDimension } from '../services/embeddingService.js';

const embeddingDimension = getOllamaEmbeddingDimension();
const embeddingArraySchema = z
  .array(z.number())
  .refine((value) => value.length === embeddingDimension, {
    message: `Embedding must have ${embeddingDimension} dimensions.`,
  });

export const NightscoutCgmEntrySchema = z
  .object({
    _id: z.string().optional(),
    sgv: z.union([z.number(), z.string()]),
    date: z.union([z.number(), z.string()]).optional(),
    dateString: z.string().optional(),
    direction: z.string().optional(),
    trend: z.union([z.number(), z.string()]).optional(),
    type: z.string().optional(),
    device: z.string().optional(),
  })
  .passthrough()
  .refine(
    (entry) => {
      const hasDate = entry.date !== undefined || entry.dateString !== undefined;
      return hasDate;
    },
    { message: 'Entry must have either date or dateString.' }
  )
  .refine(
    (entry) => {
      if (entry.sgv === undefined) return false;
      const num = typeof entry.sgv === 'string' ? parseFloat(entry.sgv) : entry.sgv;
      return !isNaN(num) && num > 0;
    },
    { message: 'Entry sgv must be a positive number.' }
  );

export type NightscoutCgmEntry = z.infer<typeof NightscoutCgmEntrySchema>;

export const NightscoutImportRequestSchema = z.object({
  baseUrl: z
    .string({
      required_error: 'baseUrl is required.',
    })
    .url('baseUrl must be a valid HTTP or HTTPS URL.')
    .min(1, 'baseUrl must not be empty.'),
  days: z
    .number({
      required_error: 'days is required.',
    })
    .int('days must be an integer.')
    .min(1, 'days must be at least 1.')
    .max(365, 'days must be at most 365.')
    .default(90),
  skip: z
    .number({
      required_error: 'skip must be a number if provided.',
    })
    .int('skip must be an integer.')
    .min(0, 'skip must be non-negative.')
    .optional(),
  count: z
    .number({
      required_error: 'count must be a number if provided.',
    })
    .int('count must be an integer.')
    .min(1, 'count must be at least 1.')
    .optional(),
  entries: z
    .array(
      z
        .object({
          _id: z.string().optional(),
          sgv: z
            .union([z.number(), z.string()])
            .refine(
              (val) => {
                if (typeof val === 'string') {
                  const parsed = Number(val);
                  return !isNaN(parsed) && parsed > 0;
                }
                return typeof val === 'number' && Number.isFinite(val) && val > 0;
              },
              { message: 'sgv must be a positive number.' }
            ),
          date: z.union([z.number(), z.string()]).optional(),
          dateString: z.string().optional(),
          direction: z.string().optional(),
          trend: z.union([z.number(), z.string()]).optional(),
          device: z.string().optional(),
        })
        .passthrough()
        .refine(
          (entry) => {
            return (
              entry.date !== undefined ||
              entry.dateString !== undefined
            );
          },
          {
            message:
              'Each entry must have a date or dateString field.',
          }
        )
    )
    .min(1, 'entries must contain at least one entry.'),
});

export type NightscoutImportRequest = z.infer<
  typeof NightscoutImportRequestSchema
>;

export const ImportNightscoutCgmBodySchema = z.object({
  entries: z.array(NightscoutCgmEntrySchema).min(1),
  sourceLabel: z.string().min(1).default('Nightscout'),
  sourceId: z.string().optional(),
  baseUrl: z.string().url().optional(),
  importSparkyHealthMetrics: z.boolean().optional().default(true),
  createVectorSummary: z.boolean().optional().default(true),
  embedding: embeddingArraySchema.optional(),
});

export type ImportNightscoutCgmBody = z.infer<
  typeof ImportNightscoutCgmBodySchema
>;

export const T1DVectorSearchBodySchema = z.object({
  query: z.string().min(1),
  embedding: embeddingArraySchema.optional(),
  limit: z.number().int().min(1).max(50).optional().default(5),
});

export type T1DVectorSearchBody = z.infer<typeof T1DVectorSearchBodySchema>;

export const T1DVectorSearchResultSchema = z.object({
  id: z.string(),
  t1d_profile_id: z.string(),
  domain: z.string(),
  source_type: z.string(),
  source_id: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  content_text: z.string(),
  metadata_json: z.record(z.string(), z.unknown()).nullable().optional(),
  embedding: z.array(z.number()).nullable().optional(),
  similarity: z.number().optional(),
  created_at: z.union([z.string(), z.date()]).optional(),
  updated_at: z.union([z.string(), z.date()]).optional(),
});

export type T1DVectorSearchResult = z.infer<typeof T1DVectorSearchResultSchema>;

export const T1DVectorSearchResponseSchema = z.object({
  profileId: z.string(),
  results: z.array(T1DVectorSearchResultSchema),
});

export type T1DVectorSearchResponse = z.infer<
  typeof T1DVectorSearchResponseSchema
>;

export const T1DForecastEnvelopeProvenanceSchema = z
  .object({
    sourceType: z
      .enum(['simulation', 'model', 'manual', 'imported_cgm', 'nightscout'])
      .default('manual'),
    sourceId: z.string().max(500).optional(),
    confidence: z.number().min(0).max(1).optional(),
    notes: z.string().max(2000).optional(),
  })
  .passthrough();

export type T1DForecastEnvelopeProvenance = z.infer<
  typeof T1DForecastEnvelopeProvenanceSchema
>;

export const CreateForecastEnvelopeBodySchema = z
  .object({
    runId: z
      .string()
      .min(1)
      .refine((value) => value.trim().length > 0, {
        message: 'runId must be a non-empty string.',
      }),
    phase: z
      .enum(['draft', 'forecast', 'review', 'archived'])
      .optional()
      .default('forecast'),
    routeRecommendation: z.string().max(1000).nullable().optional(),
    dataMode: z
      .enum(['demo', 'simulated', 'nightscout', 'manual'])
      .optional()
      .default('demo'),
    sourceLabel: z.string().max(500).nullable().optional(),
    parsedFoods: z.array(z.unknown()).optional().default([]),
    cards: z.array(z.unknown()).optional().default([]),
    safety: z.record(z.string(), z.unknown()).optional().default({}),
    schemaVersion: z.string().max(100).optional().default('mobile-card-v1'),
    provenance: T1DForecastEnvelopeProvenanceSchema.optional().default({
      sourceType: 'manual',
    }),
  })
  .passthrough();

export type CreateForecastEnvelopeBody = z.infer<
  typeof CreateForecastEnvelopeBodySchema
>;
