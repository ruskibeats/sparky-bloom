import { log } from '../config/logging.js';
import measurementService from './measurementService.js';
import t1dCgmEntryRepository, {
  T1DCGMEntryInput,
} from '../models/t1dCgmEntryRepository.js';
import t1dProfileRepository from '../models/t1dProfileRepository.js';
import t1dVectorDocumentRepository from '../models/t1dVectorDocumentRepository.js';
import { embedT1DText } from './t1dEmbeddingService.js';

export const MG_DL_TO_MMOL_L_DIVISOR = 18.0182;

export type NightscoutEntry = Record<string, unknown> & {
  _id?: unknown;
  sgv?: unknown;
  date?: unknown;
  dateString?: unknown;
  direction?: unknown;
  trend?: unknown;
  type?: unknown;
  device?: unknown;
};

export type NormalizedT1DCGMEntry = T1DCGMEntryInput;

export interface NormalizationResult {
  entries: NormalizedT1DCGMEntry[];
  errors: Array<{ entry: NightscoutEntry; error: string }>;
}

export interface ImportNightscoutCgmOptions {
  profileId: string;
  entries: NightscoutEntry[];
  sourceLabel: string;
  sourceId?: string | null;
  baseUrl?: string | null;
  actorUserId: string;
  importSparkyHealthMetrics?: boolean;
  createVectorSummary?: boolean;
  embedding?: number[] | null;
}

export interface ImportNightscoutCgmResult {
  profileId: string;
  sourceLabel: string;
  normalizedCount: number;
  insertedCgmCount: number;
  duplicateCgmCount: number;
  healthMetricCount: number;
  vectorDocumentId: string | null;
  summary: {
    start: string;
    end: string;
    minMgDl: number;
    maxMgDl: number;
    avgMgDl: number;
  };
}

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toInteger(value: unknown): number | null {
  const numberValue = toNumber(value);
  return numberValue === null ? null : Math.trunc(numberValue);
}

export function parseNightscoutTimestamp(entry: NightscoutEntry): Date | null {
  const dateString = toNullableString(entry.dateString);
  if (dateString) {
    const parsed = new Date(dateString);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const dateValue = entry.date;
  if (typeof dateValue === 'number' && Number.isFinite(dateValue)) {
    const milliseconds =
      dateValue > 1_000_000_000_000 ? dateValue : dateValue * 1000;
    const parsed = new Date(milliseconds);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  if (typeof dateValue === 'string' && dateValue.trim().length > 0) {
    const parsed = new Date(dateValue);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

export function normalizeNightscoutEntries(
  entries: NightscoutEntry[],
  source: string
): NormalizationResult {
  const normalizedEntries: NormalizedT1DCGMEntry[] = [];
  const errors: Array<{ entry: NightscoutEntry; error: string }> = [];

  entries.forEach((entry, index) => {
    const measuredAt = parseNightscoutTimestamp(entry);
    const sgv = toNumber(entry.sgv);

    if (!measuredAt) {
      errors.push({
        entry,
        error: `Nightscout entry ${index} is missing a valid date or dateString.`,
      });
      return;
    }

    if (sgv === null || sgv <= 0) {
      errors.push({
        entry,
        error: `Nightscout entry ${index} is missing a positive sgv value.`,
      });
      return;
    }

    normalizedEntries.push({
      source,
      sourceEntryId:
        toNullableString(entry._id) ?? toNullableString(entry.dateString),
      measuredAt,
      valueMgDl: sgv,
      valueMmolL: Number((sgv / MG_DL_TO_MMOL_L_DIVISOR).toFixed(2)),
      units: 'mg/dL',
      trend: toInteger(entry.trend),
      direction: toNullableString(entry.direction),
      device: toNullableString(entry.device),
      rawJson: entry,
    });
  });

  return { entries: normalizedEntries, errors };
}

export function buildSparkyHealthRecord(
  entry: NormalizedT1DCGMEntry,
  sourceLabel: string
) {
  return {
    type: 'BloodGlucose',
    value: entry.valueMmolL,
    date: entry.measuredAt.toISOString(),
    timestamp: entry.measuredAt.toISOString(),
    source: `Nightscout:${sourceLabel}`,
    unit: 'mmol/L',
    measurementType: 'mmol/L',
    notes: `Nightscout CGM import${entry.direction ? ` (${entry.direction})` : ''}. Educational context only; not treatment advice.`,
  };
}

export function summarizeCgmEntries(entries: NormalizedT1DCGMEntry[]) {
  const values = entries.map((entry) => entry.valueMgDl);
  const minMgDl = Math.min(...values);
  const maxMgDl = Math.max(...values);
  const avgMgDl = values.reduce((sum, value) => sum + value, 0) / values.length;
  const sortedByTime = [...entries].sort(
    (left, right) => left.measuredAt.getTime() - right.measuredAt.getTime()
  );

  return {
    start: sortedByTime[0].measuredAt.toISOString(),
    end: sortedByTime[sortedByTime.length - 1].measuredAt.toISOString(),
    minMgDl: Number(minMgDl.toFixed(1)),
    maxMgDl: Number(maxMgDl.toFixed(1)),
    avgMgDl: Number(avgMgDl.toFixed(1)),
  };
}

export function buildVectorSummaryContent(
  sourceLabel: string,
  summary: ImportNightscoutCgmResult['summary'],
  count: number
) {
  return [
    `Nightscout CGM import for ${sourceLabel}.`,
    `Imported ${count} CGM value${count === 1 ? '' : 's'} into SparkyFitness T1D CGM tables.`,
    `Observed CGM range: ${summary.minMgDl}-${summary.maxMgDl} mg/dL, average ${summary.avgMgDl} mg/dL.`,
    `Time window: ${summary.start} to ${summary.end}.`,
    'This document is educational/simulation context for SparkyFitness T1D intelligence and is not dosing or treatment advice.',
  ].join(' ');
}

async function importNightscoutEntries(
  options: ImportNightscoutCgmOptions
): Promise<ImportNightscoutCgmResult> {
  const sourceLabel = options.sourceLabel.trim() || 'Nightscout';
  const normalization = normalizeNightscoutEntries(
    options.entries,
    sourceLabel
  );

  if (normalization.errors.length > 0) {
    throw new Error(
      JSON.stringify({
        message: 'Some Nightscout CGM entries could not be normalized.',
        errors: normalization.errors,
      })
    );
  }

  const profile = await t1dProfileRepository.getProfileById(
    options.profileId,
    options.actorUserId
  );

  if (!profile) {
    throw new Error('T1D profile not found or not accessible.');
  }

  if (options.baseUrl) {
    await t1dCgmEntryRepository.upsertNightscoutSource(
      options.profileId,
      options.actorUserId,
      {
        label: sourceLabel,
        baseUrl: options.baseUrl,
        metadataJson: { sourceId: options.sourceId ?? null },
      }
    );
  }

  const cgmUpsertResult = await t1dCgmEntryRepository.upsertCgmEntries(
    options.profileId,
    options.actorUserId,
    normalization.entries
  );

  let healthMetricCount = 0;
  if (options.importSparkyHealthMetrics !== false && profile.sparky_user_id) {
    const healthRecords = normalization.entries.map((entry) =>
      buildSparkyHealthRecord(entry, sourceLabel)
    );
    const healthResult = await measurementService.processHealthData(
      healthRecords,
      profile.sparky_user_id,
      options.actorUserId
    );
    healthMetricCount = Array.isArray(healthResult.processed)
      ? healthResult.processed.length
      : 0;
  }

  let vectorDocumentId: string | null = null;
  if (options.createVectorSummary !== false) {
    const summary = summarizeCgmEntries(normalization.entries);
    const sourceId =
      options.sourceId ??
      `nightscout:${sourceLabel}:${summary.start}:${summary.end}`;
    const contentText = buildVectorSummaryContent(
      sourceLabel,
      summary,
      normalization.entries.length
    );
    const embedding =
      options.embedding === undefined
        ? (await embedT1DText(contentText)).embedding
        : options.embedding;
    const document = await t1dVectorDocumentRepository.upsertVectorDocument(
      options.profileId,
      options.actorUserId,
      {
        domain: 'cgm',
        sourceType: 'nightscout_import',
        sourceId,
        title: `Nightscout CGM import: ${sourceLabel}`,
        contentText,
        metadataJson: {
          source: 'nightscout',
          sourceLabel,
          sourceId,
          cgmCount: normalization.entries.length,
          insertedCgmCount: cgmUpsertResult.insertedCount,
          healthMetricCount,
          medicalBoundary: 'educational_simulation_only',
        },
        embedding,
      }
    );
    vectorDocumentId = document.id;
  }

  return {
    profileId: options.profileId,
    sourceLabel,
    normalizedCount: normalization.entries.length,
    insertedCgmCount: cgmUpsertResult.insertedCount,
    duplicateCgmCount: cgmUpsertResult.duplicateCount,
    healthMetricCount,
    vectorDocumentId,
    summary: summarizeCgmEntries(normalization.entries),
  };
}

async function importNightscoutEntriesForSparkyUser(
  userId: string,
  actingUserId: string,
  options: Omit<ImportNightscoutCgmOptions, 'profileId'>
) {
  const profile = await t1dProfileRepository.getOrCreateProfileForSparkyUser(
    userId,
    actingUserId,
    {
      metadata_json: { t1dPlatform: 'sparky-bloom', nightscoutEnabled: true },
    }
  );

  return importNightscoutEntries({
    ...options,
    profileId: profile.id,
  });
}

export async function importNightscoutBatch(
  options: ImportNightscoutCgmOptions
): Promise<ImportNightscoutCgmResult> {
  try {
    return await importNightscoutEntries(options);
  } catch (error) {
    log(
      'error',
      '[t1dNightscoutImportService] Failed to import Nightscout CGM batch:',
      error
    );
    throw error;
  }
}

export default {
  importNightscoutBatch,
  importNightscoutEntriesForSparkyUser,
  normalizeNightscoutEntries,
  parseNightscoutTimestamp,
  buildSparkyHealthRecord,
  summarizeCgmEntries,
  buildVectorSummaryContent,
};
