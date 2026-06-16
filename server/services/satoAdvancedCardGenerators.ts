import { v4 as uuidv4 } from 'uuid';
import { checkRefusal } from './T1DSafetyValidator.js';
import { PatternGenomeExplorer } from './PatternGenomeExplorer.js';
import type {
  SatoCardAction,
  SatoCardProvenance,
  SatoCardType,
  SatoEvidenceBundle,
  SatoCardPriority,
  SuppressionReason,
} from './satoIntelligenceCardsService.js';

export interface AdvancedFingerprintRow {
  id: string;
  meal_key: string;
  meal_type_name?: string;
  food_names: string[];
  carbs_g?: number;
  protein_g?: number;
  fat_g?: number;
  fiber_g?: number;
  delta_mg_dl?: number;
  peak_mg_dl?: number;
  time_to_peak_minutes?: number;
  confidence_tier: string;
  entry_date: string;
}

export interface AdvancedFoodEntryRow {
  id: string;
  food_name: string;
  carbs?: number;
  protein?: number;
  fat?: number;
  calories?: number;
  entry_date: string;
}

export interface AppointmentContextRow {
  id: string;
  starts_at: string;
  title: string;
  specialty?: string;
}

export interface RestaurantContextRow {
  eventId: string;
  menuId: string;
  restaurantName: string;
  startsAt?: string;
  normalizedItems: Array<{
    itemId: string;
    name: string;
    score: number;
    evidenceIds: string[];
  }>;
}

export interface AdvancedCardContext {
  profileId?: string;
  fingerprints: AdvancedFingerprintRow[];
  foodEntries: AdvancedFoodEntryRow[];
  ageAvailable: boolean;
  appointments: AppointmentContextRow[];
  restaurants: RestaurantContextRow[];
}

export interface AdvancedCardDraft {
  type: SatoCardType;
  priority: SatoCardPriority;
  title: string;
  subtitle: string;
  body?: string;
  confidence: number;
  evidenceCount: number;
  patternNames?: string[];
  primaryAction: SatoCardAction;
  secondaryActions?: SatoCardAction[];
  evidenceBundle: SatoEvidenceBundle;
  fingerprintIds?: string[];
  subgraphId?: string;
  queryRefs: string[];
  source: SatoCardProvenance['source'];
  entityIds: string[];
  generatedBy: string;
}

export type AdvancedCardRenderDecision =
  | { render: true; draft: AdvancedCardDraft }
  | { render: false; reason: SuppressionReason; cardType: SatoCardType };

const patternExplorer = new PatternGenomeExplorer();

export function generateWhatIfCardDraft(
  context: AdvancedCardContext,
  generatedAt: string,
): AdvancedCardRenderDecision {
  if (!context.profileId) return suppress('what_if', 'INSUFFICIENT_DATA');
  if (!context.ageAvailable) return suppress('what_if', 'NO_GRAPH_MATCH');

  const group = strongestFingerprintGroup(context.fingerprints, 3);
  if (!group) return suppress('what_if', 'INSUFFICIENT_DATA');

  const avgDelta = average(group.rows.map((row) => row.delta_mg_dl));
  const confidence = confidenceFromRows(group.rows, 0.5);
  if (confidence < 0.6) return suppress('what_if', 'LOW_CONFIDENCE');

  const fingerprintIds = group.rows.map((row) => row.id);
  const evidenceBundle = buildBundle(
    `What-if similar meal evidence: ${group.label}`,
    group.rows.map((row) => fingerprintEvidenceRow(row)),
    {
      mealLabel: group.label,
      similarMealCount: group.rows.length,
      avgDeltaMgDl: avgDelta,
      confidence,
    },
  );

  const draft: AdvancedCardDraft = {
    type: 'what_if',
    priority: 'medium',
    title: 'A grounded what-if is ready',
    subtitle: `Based on ${group.rows.length} similar meals in your history.`,
    body: 'Sato can compare this idea against similar meals you have already logged. This is an educational planning view, not a medical instruction.',
    confidence,
    evidenceCount: group.rows.length,
    primaryAction: {
      label: 'Simulate',
      action: 'simulate_what_if',
      payload: { evidenceBundleId: evidenceBundle.id, baselineFood: group.label, fingerprintIds },
    },
    secondaryActions: [
      { label: 'Save experiment', action: 'save_experiment', payload: { evidenceBundleId: evidenceBundle.id, sourceCardType: 'what_if' } },
      { label: 'View similar meals', action: 'view_similar_meals', payload: { fingerprintIds } },
    ],
    evidenceBundle,
    fingerprintIds,
    subgraphId: `subgraph-what-if-${stableSlug(group.label)}`,
    queryRefs: ['what_if.similar_meals.by_fingerprint', 'what_if.simulation.counterfactual'],
    source: 'deterministic_pipeline',
    entityIds: fingerprintIds,
    generatedBy: 'WhatIfCardGenerator',
  };

  return safeDraft(draft, generatedAt);
}

export function generatePatternDriftCardDraft(
  context: AdvancedCardContext,
  generatedAt: string,
): AdvancedCardRenderDecision {
  if (!context.profileId) return suppress('pattern_drift', 'INSUFFICIENT_DATA');

  const drift = findStrongestDrift(context.fingerprints, generatedAt);
  if (!drift) return suppress('pattern_drift', 'MISSING_EVIDENCE');
  if (drift.shiftMgDl < 30 && drift.timeShiftMinutes < 45) return suppress('pattern_drift', 'LOW_CONFIDENCE');

  const fingerprintIds = [...drift.baseline, ...drift.recent].map((row) => row.id);
  const confidence = Math.min(0.92, 0.55 + Math.min(drift.shiftMgDl, 80) / 200 + Math.min(drift.recent.length, 5) * 0.04);
  const evidenceBundle = buildBundle(
    `Pattern drift evidence: ${drift.label}`,
    [
      ...drift.baseline.map((row) => ({ ...fingerprintEvidenceRow(row), period: 'baseline' })),
      ...drift.recent.map((row) => ({ ...fingerprintEvidenceRow(row), period: 'recent' })),
    ],
    {
      mealLabel: drift.label,
      baselineCount: drift.baseline.length,
      recentCount: drift.recent.length,
      baselineAvgDeltaMgDl: drift.baselineAvgDelta,
      recentAvgDeltaMgDl: drift.recentAvgDelta,
      shiftMgDl: drift.shiftMgDl,
      timeShiftMinutes: drift.timeShiftMinutes,
      confidence,
    },
  );

  const draft: AdvancedCardDraft = {
    type: 'pattern_drift',
    priority: drift.shiftMgDl >= 45 ? 'high' : 'medium',
    title: 'This meal is acting differently lately',
    subtitle: `${drift.label} shifted by about ${Math.round(drift.shiftMgDl)} mg/dL recently.`,
    body: 'Sato compared your baseline for this meal cluster with recent responses and found a repeatable change worth reviewing.',
    confidence,
    evidenceCount: drift.baseline.length + drift.recent.length,
    patternNames: classifyPatternNames([...drift.baseline, ...drift.recent]),
    primaryAction: {
      label: 'Compare periods',
      action: 'compare_pattern_periods',
      payload: { evidenceBundleId: evidenceBundle.id, clusterId: stableSlug(drift.label), fingerprintIds },
    },
    secondaryActions: [
      { label: 'View evidence', action: 'open_evidence', payload: { evidenceBundleId: evidenceBundle.id } },
    ],
    evidenceBundle,
    fingerprintIds,
    subgraphId: `subgraph-drift-${stableSlug(drift.label)}`,
    queryRefs: ['pattern_drift.baseline_cluster', 'pattern_drift.recent_shift'],
    source: 'deterministic_pipeline',
    entityIds: fingerprintIds,
    generatedBy: 'PatternDriftCardGenerator',
  };

  return safeDraft(draft, generatedAt);
}

export function generateExperimentCardDraft(
  context: AdvancedCardContext,
  generatedAt: string,
): AdvancedCardRenderDecision {
  if (!context.profileId) return suppress('experiment', 'INSUFFICIENT_DATA');

  const patterns = patternExplorer.detectAll(toPatternFingerprintRows(context.fingerprints));
  const opportunity = patterns.find((pattern) =>
    pattern.evidenceCount >= 2 &&
    pattern.confidence >= 0.55 &&
    ['delayed_rise', 'overnight_risk', 'exercise_buffered', 'fast_spike'].includes(pattern.patternType)
  );

  if (!opportunity) return suppress('experiment', 'MISSING_EVIDENCE');

  const fingerprintIds = opportunity.evidence.map((row) => row.id).filter(Boolean) as string[];
  const experimentKind = opportunity.patternType === 'exercise_buffered' ? 'walk_window' : opportunity.patternType === 'overnight_risk' ? 'earlier_timing' : 'save_comparison';
  const evidenceBundle = buildBundle(
    `Behaviour opportunity evidence: ${labelPattern(opportunity.patternType)}`,
    opportunity.evidence.map((row) => fingerprintEvidenceRow(row as AdvancedFingerprintRow)),
    {
      patternType: opportunity.patternType,
      evidenceCount: opportunity.evidenceCount,
      confidence: opportunity.confidence,
      experimentKind,
    },
  );

  const draft: AdvancedCardDraft = {
    type: 'experiment',
    priority: 'low',
    title: 'A small experiment could be worth saving',
    subtitle: `Based on a ${labelPattern(opportunity.patternType).toLowerCase()} pattern in your history.`,
    body: experimentKind === 'walk_window'
      ? 'You could save a non-medical comparison around a short walk window on a similar day.'
      : 'You could save a small comparison for a similar meal on another day.',
    confidence: Math.min(0.9, opportunity.confidence),
    evidenceCount: opportunity.evidenceCount,
    patternNames: [opportunity.patternType],
    primaryAction: {
      label: 'Save experiment',
      action: 'save_experiment',
      payload: { evidenceBundleId: evidenceBundle.id, experimentKind, fingerprintIds },
    },
    secondaryActions: [
      { label: 'Remind me', action: 'remind_experiment', payload: { evidenceBundleId: evidenceBundle.id } },
      { label: 'Not now', action: 'dismissed', payload: { sourceCardType: 'experiment' } },
    ],
    evidenceBundle,
    fingerprintIds,
    queryRefs: ['experiment.behaviour_opportunity', 'experiment.safety_check'],
    source: 'deterministic_pipeline',
    entityIds: fingerprintIds,
    generatedBy: 'ExperimentCardGenerator',
  };

  return safeDraft(draft, generatedAt);
}

export function generateDoctorPrepCardDraft(
  context: AdvancedCardContext,
  generatedAt: string,
): AdvancedCardRenderDecision {
  if (!context.profileId) return suppress('doctor_prep', 'INSUFFICIENT_DATA');
  const appointment = context.appointments[0];
  if (!appointment) return suppress('doctor_prep', 'MISSING_DATA');

  const evidenceDates = recentEvidenceDates(context, generatedAt);
  if (evidenceDates.length < 14) return suppress('doctor_prep', 'INSUFFICIENT_DATA');

  const rows = [
    ...context.foodEntries.map((row) => ({ id: row.id, kind: 'food_entry', date: row.entry_date, foodName: row.food_name })),
    ...context.fingerprints.map((row) => ({ id: row.id, kind: 'fingerprint', date: row.entry_date, foods: row.food_names.join(', ') })),
  ];
  const confidence = Math.min(0.9, 0.55 + Math.min(evidenceDates.length, 21) * 0.015);
  const evidenceBundle = buildBundle(
    `Doctor prep evidence: ${appointment.title}`,
    rows,
    {
      appointmentId: appointment.id,
      appointmentStartsAt: appointment.starts_at,
      evidenceDays: evidenceDates.length,
      confidence,
    },
  );

  const entityIds = [appointment.id, ...rows.map((row) => row.id)];
  const draft: AdvancedCardDraft = {
    type: 'doctor_prep',
    priority: daysUntil(appointment.starts_at, generatedAt) <= 7 ? 'high' : 'medium',
    title: 'You have enough evidence for a visit brief',
    subtitle: `${evidenceDates.length} recent evidence days can support a short prep note.`,
    body: 'Sato can gather recent patterns and representative days for a calm visit brief without drawing clinical conclusions.',
    confidence,
    evidenceCount: evidenceDates.length,
    primaryAction: {
      label: 'Build brief',
      action: 'build_doctor_brief',
      payload: { evidenceBundleId: evidenceBundle.id, appointmentId: appointment.id, evidenceDays: evidenceDates },
    },
    secondaryActions: [
      { label: 'Add a question', action: 'add_doctor_question', payload: { appointmentId: appointment.id } },
      { label: 'Dismiss', action: 'dismissed', payload: { sourceCardType: 'doctor_prep' } },
    ],
    evidenceBundle,
    queryRefs: ['doctor_prep.upcoming_appointment', 'doctor_prep.recent_evidence_days', 'doctor_prep.pattern_summaries'],
    source: 'deterministic_pipeline',
    entityIds,
    generatedBy: 'DoctorPrepCardGenerator',
  };

  return safeDraft(draft, generatedAt);
}

export function generateRestaurantCardDraft(
  context: AdvancedCardContext,
  generatedAt: string,
): AdvancedCardRenderDecision {
  if (!context.profileId) return suppress('restaurant', 'INSUFFICIENT_DATA');
  const restaurant = context.restaurants[0];
  if (!restaurant) return suppress('restaurant', 'MISSING_DATA');
  if (!restaurant.menuId) return suppress('restaurant', 'MISSING_EVIDENCE');
  if (restaurant.normalizedItems.length === 0) return suppress('restaurant', 'MISSING_EVIDENCE');

  const scoredItems = restaurant.normalizedItems.filter((item) => item.score > 0 && item.evidenceIds.length > 0);
  if (scoredItems.length === 0) return suppress('restaurant', 'LOW_CONFIDENCE');

  const confidence = Math.min(0.92, 0.55 + Math.min(scoredItems.length, 5) * 0.07);
  const evidenceBundle = buildBundle(
    `Restaurant menu pattern scoring: ${restaurant.restaurantName}`,
    scoredItems.map((item) => ({ id: item.itemId, name: item.name, score: item.score, evidenceIds: item.evidenceIds })),
    {
      eventId: restaurant.eventId,
      menuId: restaurant.menuId,
      restaurantName: restaurant.restaurantName,
      scoredItemCount: scoredItems.length,
      confidence,
    },
  );
  const entityIds = [restaurant.eventId, restaurant.menuId, ...scoredItems.map((item) => item.itemId)];

  const draft: AdvancedCardDraft = {
    type: 'restaurant',
    priority: restaurant.startsAt && daysUntil(restaurant.startsAt, generatedAt) <= 1 ? 'high' : 'medium',
    title: 'Sato can scan this menu against your history',
    subtitle: `${scoredItems.length} menu options have personal pattern scoring.`,
    body: `View choices from ${restaurant.restaurantName} that resemble meals you have logged before.`,
    confidence,
    evidenceCount: scoredItems.length,
    primaryAction: {
      label: 'View options',
      action: 'view_restaurant_options',
      payload: { evidenceBundleId: evidenceBundle.id, eventId: restaurant.eventId, menuId: restaurant.menuId, itemIds: scoredItems.map((item) => item.itemId) },
    },
    secondaryActions: [
      { label: 'Scan menu', action: 'scan_menu', payload: { eventId: restaurant.eventId, menuId: restaurant.menuId } },
      { label: 'Ignore', action: 'dismissed', payload: { sourceCardType: 'restaurant' } },
    ],
    evidenceBundle,
    subgraphId: `subgraph-restaurant-${stableSlug(restaurant.restaurantName)}`,
    queryRefs: ['restaurant.upcoming_event', 'restaurant.menu_ingestion', 'restaurant.normalized_items', 'restaurant.pattern_scoring'],
    source: 'deterministic_pipeline',
    entityIds,
    generatedBy: 'RestaurantCardGenerator',
  };

  return safeDraft(draft, generatedAt);
}

function safeDraft(draft: AdvancedCardDraft, _generatedAt: string): AdvancedCardRenderDecision {
  const actionCopy = [draft.primaryAction, ...(draft.secondaryActions ?? [])]
    .map((action) => action.label)
    .join(' ');
  const copy = [draft.title, draft.subtitle, draft.body, actionCopy].filter(Boolean).join(' ');
  if (checkRefusal([{ role: 'user', content: copy }])) {
    return suppress(draft.type, 'SAFETY_SUPPRESSED');
  }
  return { render: true, draft };
}

function suppress(cardType: SatoCardType, reason: SuppressionReason): AdvancedCardRenderDecision {
  return { render: false, reason, cardType };
}

function buildBundle(
  title: string,
  rows: Array<Record<string, unknown>>,
  summary: Record<string, unknown>,
): SatoEvidenceBundle {
  return {
    id: `evidence-${uuidv4()}`,
    title,
    rows,
    summary,
  };
}

function strongestFingerprintGroup(
  fingerprints: AdvancedFingerprintRow[],
  minCount: number,
): { label: string; rows: AdvancedFingerprintRow[] } | null {
  const groups = new Map<string, AdvancedFingerprintRow[]>();
  for (const fp of fingerprints) {
    const label = normalizeMealLabel(fp);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(fp);
  }

  return Array.from(groups.entries())
    .map(([label, rows]) => ({ label, rows }))
    .filter((group) => group.rows.length >= minCount)
    .sort((a, b) => b.rows.length - a.rows.length || confidenceFromRows(b.rows, 0) - confidenceFromRows(a.rows, 0))[0] ?? null;
}

function findStrongestDrift(
  fingerprints: AdvancedFingerprintRow[],
  generatedAt: string,
): {
  label: string;
  baseline: AdvancedFingerprintRow[];
  recent: AdvancedFingerprintRow[];
  baselineAvgDelta: number;
  recentAvgDelta: number;
  shiftMgDl: number;
  timeShiftMinutes: number;
} | null {
  const groups = new Map<string, AdvancedFingerprintRow[]>();
  for (const fp of fingerprints) {
    const label = normalizeMealLabel(fp);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(fp);
  }

  const now = new Date(generatedAt).getTime();
  const recentCutoff = now - 14 * 24 * 60 * 60 * 1000;
  const candidates = Array.from(groups.entries()).map(([label, rows]) => {
    const baseline = rows.filter((row) => new Date(row.entry_date).getTime() < recentCutoff);
    const recent = rows.filter((row) => new Date(row.entry_date).getTime() >= recentCutoff);
    if (baseline.length < 3 || recent.length < 2) return null;
    const baselineAvgDelta = average(baseline.map((row) => row.delta_mg_dl));
    const recentAvgDelta = average(recent.map((row) => row.delta_mg_dl));
    const baselineAvgTime = average(baseline.map((row) => row.time_to_peak_minutes));
    const recentAvgTime = average(recent.map((row) => row.time_to_peak_minutes));
    return {
      label,
      baseline,
      recent,
      baselineAvgDelta,
      recentAvgDelta,
      shiftMgDl: Math.abs(recentAvgDelta - baselineAvgDelta),
      timeShiftMinutes: Math.abs(recentAvgTime - baselineAvgTime),
    };
  }).filter((value): value is NonNullable<typeof value> => value !== null);

  return candidates.sort((a, b) => b.shiftMgDl - a.shiftMgDl || b.timeShiftMinutes - a.timeShiftMinutes)[0] ?? null;
}

function recentEvidenceDates(context: AdvancedCardContext, generatedAt: string): string[] {
  const now = new Date(generatedAt).getTime();
  const cutoff = now - 21 * 24 * 60 * 60 * 1000;
  const dates = new Set<string>();
  for (const row of [...context.foodEntries, ...context.fingerprints]) {
    const time = new Date(row.entry_date).getTime();
    if (Number.isFinite(time) && time >= cutoff) dates.add(row.entry_date.slice(0, 10));
  }
  return Array.from(dates).sort();
}

function classifyPatternNames(fingerprints: AdvancedFingerprintRow[]): string[] {
  return patternExplorer
    .detectAll(toPatternFingerprintRows(fingerprints))
    .map((pattern) => pattern.patternType)
    .slice(0, 3);
}

function toPatternFingerprintRows(rows: AdvancedFingerprintRow[]): any[] {
  return rows.map((row) => ({
    ...row,
    meal_type_name: row.meal_type_name ?? 'unknown',
    calories: 0,
    protein_g: row.protein_g ?? 0,
    carbs_g: row.carbs_g ?? 0,
    fat_g: row.fat_g ?? 0,
    fiber_g: row.fiber_g ?? 0,
    delta_mg_dl: row.delta_mg_dl ?? null,
    peak_mg_dl: row.peak_mg_dl ?? null,
    time_to_peak_minutes: row.time_to_peak_minutes ?? null,
    cgm_points: 0,
  }));
}

function fingerprintEvidenceRow(row: AdvancedFingerprintRow): Record<string, unknown> {
  return {
    id: row.id,
    mealKey: row.meal_key,
    foods: row.food_names.join(', '),
    deltaMgDl: row.delta_mg_dl,
    peakMgDl: row.peak_mg_dl,
    timeToPeakMinutes: row.time_to_peak_minutes,
    confidenceTier: row.confidence_tier,
    entryDate: row.entry_date,
  };
}

function normalizeMealLabel(row: AdvancedFingerprintRow): string {
  return row.food_names.length > 0
    ? row.food_names.map(stableSlug).join(' + ')
    : stableSlug(row.meal_type_name ?? row.meal_key);
}

function stableSlug(value: string): string {
  return String(value ?? 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .slice(0, 48) || 'unknown';
}

function average(values: Array<number | undefined>): number {
  const valid = values.filter((value): value is number => value !== undefined && Number.isFinite(value));
  if (valid.length === 0) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function confidenceFromRows(rows: AdvancedFingerprintRow[], base: number): number {
  const highConfidenceShare = rows.filter((row) => row.confidence_tier === 'high').length / Math.max(1, rows.length);
  return Math.min(0.95, base + rows.length * 0.06 + highConfidenceShare * 0.2);
}

function daysUntil(startsAt: string, generatedAt: string): number {
  const start = new Date(startsAt).getTime();
  const now = new Date(generatedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(now)) return Number.POSITIVE_INFINITY;
  return Math.ceil((start - now) / (24 * 60 * 60 * 1000));
}

function labelPattern(patternType: string): string {
  return patternType
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
