/**
 * Sato Intelligence Cards — deterministic real-data card generators.
 *
 * Cards fail closed. The frontend renders only cards returned by this service and
 * never invents intelligence copy locally.
 */

import { getClient } from '../db/poolManager.js';
import { v4 as uuidv4 } from 'uuid';
import { PatternGenomeExplorer, type PatternMatch } from './PatternGenomeExplorer.js';
import { AgeAdapter } from './GraphAdapter.js';
import {
  generateDoctorPrepCardDraft,
  generateExperimentCardDraft,
  generatePatternDriftCardDraft,
  generateRestaurantCardDraft,
  generateWhatIfCardDraft,
  type AppointmentContextRow,
  type RestaurantContextRow,
} from './satoAdvancedCardGenerators.js';

export type SatoCardType =
  | 'pattern_insight'
  | 'safe_meal'
  | 'weekly_digest'
  | 'insulin_stock'
  | 'what_if'
  | 'pattern_drift'
  | 'experiment'
  | 'doctor_prep'
  | 'restaurant'
  | 'meal_timing';

export type SatoCardPriority = 'low' | 'medium' | 'high' | 'urgent';

export type SuppressionReason =
  | 'INSUFFICIENT_DATA'
  | 'LOW_CONFIDENCE'
  | 'NO_GRAPH_MATCH'
  | 'STALE_DATA'
  | 'MISSING_EVIDENCE'
  | 'SAFETY_SUPPRESSED'
  | 'USER_DISMISSED'
  | 'MISSING_DATA';

export interface SatoCardAction {
  label: string;
  action: string;
  payload?: Record<string, unknown>;
}

export interface SatoCardProvenance {
  source: 'sql' | 'age_graph' | 'deterministic_pipeline';
  entityIds: string[];
  queryRefs: string[];
  evidenceBundleId?: string;
  subgraphId?: string;
  fingerprintIds?: string[];
  generatedBy: string;
  generatedAt: string;
}

export interface SatoEvidenceBundle {
  id: string;
  title: string;
  rows: Array<Record<string, unknown>>;
  summary: Record<string, unknown>;
}

export interface SatoIntelligenceCard {
  id: string;
  type: SatoCardType;
  priority: SatoCardPriority;
  title: string;
  subtitle: string;
  body?: string;
  confidence?: number;
  evidenceCount?: number;
  patternNames?: string[];
  primaryAction: SatoCardAction;
  secondaryActions?: SatoCardAction[];
  evidenceBundleId?: string;
  subgraphId?: string;
  createdAt: string;
  expiresAt?: string;
  provenance: SatoCardProvenance;
}

export type CardRenderDecision =
  | {
      render: true;
      card: SatoIntelligenceCard;
      provenance: SatoCardProvenance;
    }
  | {
      render: false;
      reason: SuppressionReason;
      cardType: SatoCardType;
    };

export interface SatoIntelligenceCardsResponse {
  cards: SatoIntelligenceCard[];
  suppressed: CardRenderDecision[];
  generatedAt: string;
}

export interface IntelligenceCardOptions {
  includePatternInsight?: boolean;
  includeSafeMeal?: boolean;
  includeWeeklyDigest?: boolean;
  includeInsulinStock?: boolean;
  includeWhatIf?: boolean;
  includePatternDrift?: boolean;
  includeExperiment?: boolean;
  includeDoctorPrep?: boolean;
  includeRestaurant?: boolean;
  includeMealTiming?: boolean;
  isDemoMode?: boolean;
}

interface FoodEntryRow {
  id: string;
  food_name: string;
  carbs?: number;
  protein?: number;
  fat?: number;
  calories?: number;
  entry_date: string;
  meal_type_id?: string;
}

interface MealFingerprintRow {
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

interface CgmSummaryRow {
  count: number;
  avg_glucose?: number;
  min_glucose?: number;
  max_glucose?: number;
  tir_pct?: number;
}

interface InventoryRow {
  id: string;
  insulin_name: string;
  insulin_type?: string;
  quantity_units?: number;
  opened_at?: string;
  expires_at?: string;
}

interface DoseEventRow {
  id: string;
  units?: number;
  dose_type?: string;
  taken_at?: string;
}

interface CardContext {
  profileId?: string;
  fingerprints: MealFingerprintRow[];
  foodEntries: FoodEntryRow[];
  cgmSummary?: CgmSummaryRow;
  inventory: InventoryRow[];
  doseEvents: DoseEventRow[];
  ageAvailable: boolean;
  dismissedCardIds: string[];
  appointments: AppointmentContextRow[];
  restaurants: RestaurantContextRow[];
}

const patternExplorer = new PatternGenomeExplorer();
const ageAdapter = new AgeAdapter();

export async function getSatoIntelligenceCards(
  userId: string,
  client?: any,
  options: IntelligenceCardOptions & DemoModeConfig = { isDemoMode: false },
): Promise<SatoIntelligenceCardsResponse> {
  const ownedClient = client ?? await getClient(userId);
  try {
    return await getSatoIntelligenceCardsWithClient(userId, ownedClient, options);
  } finally {
    if (!client) ownedClient.release();
  }
}

async function getSatoIntelligenceCardsWithClient(
  userId: string,
  client: any,
  options: IntelligenceCardOptions & DemoModeConfig = { isDemoMode: false },
): Promise<SatoIntelligenceCardsResponse> {
  const generatedAt = new Date().toISOString();
  const context = await loadCardContext(userId, client);
  const cards: SatoIntelligenceCard[] = [];
  const suppressed: CardRenderDecision[] = [];

  // Demo mode: return clearly marked demo cards for UI development
  // Only if user has explicitly set SATO_DEMO_MODE=true
  if (options.isDemoMode && !isProductValidationMode()) {
    const demoCard = createDemoCard('pattern_insight');
    cards.push(demoCard);
    return {
      cards: cards.slice(0, 7),
      suppressed,
      generatedAt,
    };
  }

  // Product validation mode: check dismissed cards to suppress them
  const dismissedCardIds = context.dismissedCardIds;
  const dismissedSet = new Set(dismissedCardIds);

  const generators = [
    options.includePatternInsight !== false ? generatePatternInsightCard : null,
    options.includeSafeMeal !== false ? generateSafeMealCard : null,
    options.includeWeeklyDigest !== false ? generateWeeklyDigestCard : null,
    options.includeInsulinStock !== false ? generateInsulinStockCard : null,
    options.includeWhatIf !== false ? generateWhatIfCard : null,
    options.includePatternDrift !== false ? generatePatternDriftCard : null,
    options.includeExperiment !== false ? generateExperimentCard : null,
    options.includeDoctorPrep !== false ? generateDoctorPrepCard : null,
    options.includeRestaurant !== false ? generateRestaurantCard : null,
    options.includeMealTiming !== false ? generateMealTimingCard : null, // Meal timing gaps
  ].filter(Boolean) as Array<(context: CardContext, generatedAt: string) => Promise<CardRenderDecision>>;

  for (const generate of generators) {
    const decision = await generate(context, generatedAt);
    if (decision.render) {
      // Check if this card was previously dismissed
      if (dismissedSet.has(decision.card.id)) {
        suppressed.push({
          render: false,
          reason: 'USER_DISMISSED',
          cardType: decision.card.type,
        });
      } else {
        cards.push(decision.card);
      }
    } else {
      suppressed.push(decision);
    }
  }

  // Apply ranking with urgency, confidence, recency, context, and feedback
  const feedbackHistory = await getFeedbackHistory(client);
  const rankedCards = rankCards(cards, context, generatedAt, feedbackHistory);

  // Enforce density: ~3 above fold, 5-7 total
  const maxCards = 7;

  // Apply expiry/suppression rules - remove expired cards
  const now = new Date(generatedAt).getTime();
  const activeCards = rankedCards.filter((card) => !card.expiresAt || new Date(card.expiresAt).getTime() > now);

  const expiredCount = rankedCards.length - activeCards.length;
  if (expiredCount > 0) {
    // Multiple expired cards - add suppression entry for diagnostics
    for (let i = 0; i < expiredCount; i++) {
      suppressed.push({
        render: false,
        reason: 'STALE_DATA',
        cardType: activeCards.length > 0 ? activeCards[0].type : 'pattern_insight',
      });
    }
  }

  return {
    cards: activeCards.slice(0, maxCards),
    suppressed,
    generatedAt,
  };
}

export function buildEvidenceBundle(
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

async function generatePatternInsightCard(
  context: CardContext,
  generatedAt: string,
): Promise<CardRenderDecision> {
  const fingerprintRows = toFingerprintRows(context.fingerprints);

  const patternMatches = patternExplorer.detectAll(fingerprintRows).filter(
    (match) => match.evidenceCount >= 3 || (match.confidence >= 0.85 && match.evidenceCount >= 2)
  );

  if (!context.profileId) return suppress('pattern_insight', 'INSUFFICIENT_DATA');
  if (!context.ageAvailable) return suppress('pattern_insight', 'NO_GRAPH_MATCH');
  if (patternMatches.length === 0) return suppress('pattern_insight', 'INSUFFICIENT_DATA');

  const strongest = patternMatches[0];
  const evidenceBundle = buildEvidenceBundle(
    `${labelPattern(strongest.patternType)} pattern evidence`,
    strongest.evidence.map((fp) => ({
      id: fp.id,
      mealKey: fp.meal_key,
      foods: fp.food_names.join(', '),
      deltaMgDl: fp.delta_mg_dl,
      timeToPeakMinutes: fp.time_to_peak_minutes,
      confidenceTier: fp.confidence_tier,
      entryDate: fp.entry_date,
    })),
    {
      patternType: strongest.patternType,
      evidenceCount: strongest.evidenceCount,
      confidence: strongest.confidence,
      metadata: strongest.metadata,
    },
  );

  const fingerprintIds = strongest.evidence.map((fp) => fp.id);
  const confidence = Math.max(0.55, Math.min(0.95, strongest.confidence));
  const card = createCard({
    type: 'pattern_insight',
    priority: confidence >= 0.8 ? 'high' : 'medium',
    title: `${labelPattern(strongest.patternType)} meal pattern`,
    subtitle: `${strongest.evidenceCount} repeated meal fingerprints matched this pattern.`,
    body: `SATO found a repeated ${labelPattern(strongest.patternType).toLowerCase()} response across similar meals. Open the evidence to review the meals, CGM-linked fingerprints, and provenance behind this card.`,
    confidence,
    evidenceCount: strongest.evidenceCount,
    patternNames: [strongest.patternType],
    primaryAction: {
      label: 'View evidence',
      action: 'open_evidence',
      payload: { evidenceBundleId: evidenceBundle.id },
    },
    secondaryActions: [
      { label: 'Compare similar meals', action: 'compare_similar_meals', payload: { fingerprintIds } },
    ],
    evidenceBundle,
    fingerprintIds: fingerprintIds.filter((id): id is string => id !== undefined),
    subgraphId: `subgraph-pattern-${strongest.patternType}`,
    queryRefs: ['pattern_genome.detectAll', 'age_graph.relationship_match'],
    source: 'age_graph',
    entityIds: fingerprintIds.filter((id): id is string => id !== undefined),
    generatedAt,
  });

  return { render: true, card, provenance: card.provenance };
}

async function generateSafeMealCard(
  context: CardContext,
  generatedAt: string,
): Promise<CardRenderDecision> {
  const clusters = clusterStableMeals(context.fingerprints);
  if (clusters.length === 0) return suppress('safe_meal', 'INSUFFICIENT_DATA');

  const best = clusters.sort((a, b) => b.count - a.count || b.confidence - a.confidence)[0];
  if (best.count < 3 || best.confidence < 0.65) return suppress('safe_meal', 'LOW_CONFIDENCE');

  const evidenceBundle = buildEvidenceBundle(
    `Stable meal history: ${best.label}`,
    best.fingerprints.map((fp) => ({
      id: fp.id,
      mealKey: fp.meal_key,
      foods: fp.food_names.join(', '),
      deltaMgDl: fp.delta_mg_dl,
      timeToPeakMinutes: fp.time_to_peak_minutes,
      confidenceTier: fp.confidence_tier,
      entryDate: fp.entry_date,
    })),
    {
      mealLabel: best.label,
      count: best.count,
      avgDeltaMgDl: best.avgDelta,
      confidence: best.confidence,
    },
  );

  const fingerprintIds = best.fingerprints.map((fp) => fp.id);
  const card = createCard({
    type: 'safe_meal',
    priority: 'medium',
    title: `Stable repeat meal: ${best.label}`,
    subtitle: `${best.count} similar meals showed stable CGM-backed responses.`,
    body: 'This meal cluster looks stable in your own history. SATO is showing it because repeated Meal Reviews and CGM fingerprints support the pattern.',
    confidence: best.confidence,
    evidenceCount: best.count,
    primaryAction: {
      label: 'View meal history',
      action: 'open_meal_history',
      payload: { evidenceBundleId: evidenceBundle.id },
    },
    secondaryActions: [
      { label: 'Add to safe list', action: 'mark_safe_meal', payload: { mealLabel: best.label, fingerprintIds } },
    ],
    evidenceBundle,
    fingerprintIds,
    queryRefs: ['meal_response_fingerprints.stable_cluster'],
    source: 'deterministic_pipeline',
    entityIds: fingerprintIds,
    generatedAt,
  });

  return { render: true, card, provenance: card.provenance };
}

async function generateWeeklyDigestCard(
  context: CardContext,
  generatedAt: string,
): Promise<CardRenderDecision> {
  const mealCount = context.foodEntries.length;
  const cgmCount = context.cgmSummary?.count ?? 0;
  if (mealCount < 3 || cgmCount < 20) return suppress('weekly_digest', 'INSUFFICIENT_DATA');

  // Convert MealFingerprintRow to FingerprintRow format for pattern explorer
  const fingerprintRows = context.fingerprints.map((row) => ({
    meal_type_name: row.meal_type_name ?? 'unknown',
    food_names: row.food_names,
    calories: 0,
    protein_g: row.protein_g ?? 0,
    carbs_g: row.carbs_g ?? 0,
    fat_g: row.fat_g ?? 0,
    fiber_g: row.fiber_g ?? 0,
    delta_mg_dl: row.delta_mg_dl ?? 0,
    peak_mg_dl: row.peak_mg_dl ?? 0,
    time_to_peak_minutes: row.time_to_peak_minutes ?? 0,
    confidence_tier: row.confidence_tier,
    cgm_points: 0,
    entry_date: row.entry_date,
    meal_key: row.meal_key,
    id: row.id,
  }));

  const patterns = patternExplorer.detectAll(fingerprintRows);
  const evidenceBundle = buildEvidenceBundle(
    'Last 7 days Sato digest evidence',
    [
      ...context.foodEntries.map((entry) => ({
        id: entry.id,
        foodName: entry.food_name,
        entryDate: entry.entry_date,
        carbs: entry.carbs,
      })),
      ...context.fingerprints.map((fp) => ({
        id: fp.id,
        mealKey: fp.meal_key,
        foods: fp.food_names.join(', '),
        deltaMgDl: fp.delta_mg_dl,
      })),
    ],
    {
      mealCount,
      cgmCount,
      avgGlucose: context.cgmSummary?.avg_glucose,
      patternNames: patterns.map((p) => p.patternType),
    },
  );

  const fingerprintIds = context.fingerprints.map((fp) => fp.id!).filter((id): id is string => id !== undefined);
  const confidence = Math.min(0.9, 0.5 + Math.min(mealCount, 10) * 0.04 + Math.min(cgmCount, 200) * 0.001);
  const card = createCard({
    type: 'weekly_digest',
    priority: 'low',
    title: 'Last 7 days in context',
    subtitle: `${mealCount} meals and ${cgmCount} CGM readings formed this digest.`,
    body: `This week had enough meal and CGM data for a compact Sato summary. The strongest detected pattern signal was ${patterns[0] ? labelPattern(patterns[0].patternType).toLowerCase() : 'not enough repeated pattern data'}.`,
    confidence,
    evidenceCount: mealCount + cgmCount,
    patternNames: patterns.map((p) => p.patternType).slice(0, 3),
    primaryAction: {
      label: 'Open digest details',
      action: 'open_weekly_digest',
      payload: { evidenceBundleId: evidenceBundle.id },
    },
    secondaryActions: [
      { label: 'Save digest', action: 'save_digest', payload: { evidenceBundleId: evidenceBundle.id } },
    ],
    evidenceBundle,
    fingerprintIds,
    queryRefs: ['food_entries.last_7_days', 't1d_cgm_entries.last_7_days', 'pattern_genome.detectAll'],
    source: 'deterministic_pipeline',
    entityIds: [...context.foodEntries.map((entry) => entry.id), ...fingerprintIds],
    generatedAt,
  });

  return { render: true, card, provenance: card.provenance };
}

async function generateInsulinStockCard(
  context: CardContext,
  generatedAt: string,
): Promise<CardRenderDecision> {
  if (context.inventory.length === 0 || context.doseEvents.length === 0) {
    return suppress('insulin_stock', 'MISSING_DATA');
  }

  const projection = projectInsulinStock(context.inventory, context.doseEvents);
  if (!projection) return suppress('insulin_stock', 'INSUFFICIENT_DATA');
  if (projection.daysRemaining > 7) return suppress('insulin_stock', 'LOW_CONFIDENCE');

  const evidenceBundle = buildEvidenceBundle(
    `Insulin stock projection: ${projection.insulinName}`,
    [
      ...context.inventory.map((item) => ({
        id: item.id,
        insulinName: item.insulin_name,
        insulinType: item.insulin_type,
        quantityUnits: item.quantity_units,
        expiresAt: item.expires_at,
      })),
      ...context.doseEvents.map((event) => ({
        id: event.id,
        units: event.units,
        doseType: event.dose_type,
        takenAt: event.taken_at,
      })),
    ],
    projection,
  );

  const urgency: SatoCardPriority = projection.daysRemaining <= 2 ? 'urgent' : projection.daysRemaining <= 5 ? 'high' : 'medium';
  const card = createCard({
    type: 'insulin_stock',
    priority: urgency,
    title: 'Insulin stock may run low',
    subtitle: `${projection.daysRemaining.toFixed(0)} days remaining at recent use pace.`,
    body: `SATO projected current ${projection.insulinName} supply from inventory and recent usage events. This is a reminder to prepare a repeat request or update stock, not a dosing recommendation.`,
    confidence: projection.confidence,
    evidenceCount: context.inventory.length + context.doseEvents.length,
    primaryAction: {
      label: 'Prepare repeat request',
      action: 'prepare_repeat_request',
      payload: { evidenceBundleId: evidenceBundle.id, insulinName: projection.insulinName },
    },
    secondaryActions: [
      { label: 'Remind later', action: 'remind_later', payload: { evidenceBundleId: evidenceBundle.id } },
      { label: 'Mark stock updated', action: 'mark_stock_updated', payload: { evidenceBundleId: evidenceBundle.id } },
    ],
    evidenceBundle,
    queryRefs: ['t1d_insulin_inventory.stock_projection', 't1d_insulin_dose_events.usage_rate'],
    source: 'deterministic_pipeline',
    entityIds: [...context.inventory.map((i) => i.id), ...context.doseEvents.map((d) => d.id)],
    generatedAt,
  });

  return { render: true, card, provenance: card.provenance };
}

async function generateWhatIfCard(
  context: CardContext,
  generatedAt: string,
): Promise<CardRenderDecision> {
  return advancedDraftToDecision(generateWhatIfCardDraft(toAdvancedContext(context), generatedAt), generatedAt);
}

async function generatePatternDriftCard(
  context: CardContext,
  generatedAt: string,
): Promise<CardRenderDecision> {
  return advancedDraftToDecision(generatePatternDriftCardDraft(toAdvancedContext(context), generatedAt), generatedAt);
}

async function generateExperimentCard(
  context: CardContext,
  generatedAt: string,
): Promise<CardRenderDecision> {
  return advancedDraftToDecision(generateExperimentCardDraft(toAdvancedContext(context), generatedAt), generatedAt);
}

async function generateDoctorPrepCard(
  context: CardContext,
  generatedAt: string,
): Promise<CardRenderDecision> {
  return advancedDraftToDecision(generateDoctorPrepCardDraft(toAdvancedContext(context), generatedAt), generatedAt);
}

async function generateRestaurantCard(
  context: CardContext,
  generatedAt: string,
): Promise<CardRenderDecision> {
  return advancedDraftToDecision(generateRestaurantCardDraft(toAdvancedContext(context), generatedAt), generatedAt);
}

function advancedDraftToDecision(
  decision: ReturnType<typeof generateWhatIfCardDraft>,
  generatedAt: string,
): CardRenderDecision {
  if (!decision.render) return decision;
  const card = createCard({
    ...decision.draft,
    generatedAt,
  });
  return { render: true, card, provenance: card.provenance };
}

function toAdvancedContext(context: CardContext) {
  return {
    profileId: context.profileId,
    fingerprints: context.fingerprints,
    foodEntries: context.foodEntries,
    ageAvailable: context.ageAvailable,
    appointments: context.appointments,
    restaurants: context.restaurants,
  };
}

// ============================================================================
// MEAL TIMING CARD — Missed meal / irregular timing alerts
// ============================================================================

async function generateMealTimingCard(
  context: CardContext,
  generatedAt: string,
): Promise<CardRenderDecision> {
  if (!context.profileId) return suppress('meal_timing', 'INSUFFICIENT_DATA');
  if (!context.foodEntries.length) return suppress('meal_timing', 'INSUFFICIENT_DATA');

  const now = new Date(generatedAt);
  const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60 * 1000);

  // Check for missed meals in last 5 hours
  const recentMeals = context.foodEntries.filter(
    (entry) => new Date(entry.entry_date) > fiveHoursAgo
  );

  if (recentMeals.length === 0) {
    const evidenceBundle = buildEvidenceBundle(
      'Recent meal history',
      [],
      { message: 'No meals logged in the last 5 hours' }
    );
    const card = createCard({
      type: 'meal_timing',
      priority: 'medium',
      title: 'No meals logged recently',
      subtitle: 'You haven\'t recorded a meal in the last 5 hours',
      body: 'Regular meal logging helps identify patterns in glucose response. Consider logging your next meal to maintain your pattern history.',
      confidence: 0.95,
      evidenceCount: 0,
      primaryAction: {
        label: 'Log food entry',
        action: 'open_log_meal',
        payload: { quickAction: true }
      },
      evidenceBundle,
      queryRefs: ['meal_timing.missed'],
      source: 'sql',
      entityIds: [context.profileId],
      generatedAt,
    });
    return { render: true, card, provenance: card.provenance };
  }

  // Check for irregular timing (meals >3 hours later than usual)
  const dinnerEntries = context.foodEntries.filter(
    (entry) => entry.entry_date && entry.entry_date.includes('18:') || entry.entry_date.includes('19:') || entry.entry_date.includes('20:')
  );

  if (dinnerEntries.length >= 5) {
    const avgHour = dinnerEntries.reduce((sum, e) => {
      const hour = parseInt(e.entry_date.split('T')[1]?.split(':')[0] || '0');
      return sum + hour;
    }, 0) / dinnerEntries.length;

    const latestHour = parseInt(dinnerEntries[0].entry_date.split('T')[1]?.split(':')[0] || '0');

    if (latestHour > avgHour + 3) {
      const evidenceBundle = buildEvidenceBundle(
        'Dinner timing history',
        dinnerEntries.slice(0, 5).map(e => ({ id: e.id, time: e.entry_date })),
        { averageHour: avgHour, latestHour, deviation: latestHour - avgHour }
      );
      const card = createCard({
        type: 'meal_timing',
        priority: 'low',
        title: 'Late dinner detected',
        subtitle: 'Dinner is 3+ hours later than usual',
        body: 'Late dinners often produce overnight glucose trends. Consider eating earlier if this pattern repeats.',
        confidence: 0.75,
        evidenceCount: dinnerEntries.length,
        primaryAction: {
          label: 'Note timing',
          action: 'open_timing_insights'
        },
        evidenceBundle,
        queryRefs: ['meal_timing.irregular'],
        source: 'sql',
        entityIds: [context.profileId],
        generatedAt,
      });
      return { render: true, card, provenance: card.provenance };
    }
  }

  return suppress('meal_timing', 'INSUFFICIENT_DATA');
}

async function loadCardContext(userId: string, client: any): Promise<CardContext> {
  const profileId = await getProfileId(client, userId);
  const fingerprints = profileId ? await loadFingerprints(client, profileId) : [];
  const foodEntries = await loadFoodEntries(client, userId);
  const cgmSummary = profileId ? await loadCgmSummary(client, profileId) : undefined;
  const inventory = await loadInsulinInventory(client);
  const doseEvents = await loadDoseEvents(client);
  const dismissedCardIds = profileId ? await loadDismissedCardIds(client, profileId) : [];
  const appointments = profileId ? await loadAppointments(client, profileId) : [];
  const restaurants = profileId ? await loadRestaurantContexts(client, profileId) : [];
  const ageAvailable = await ageAdapter.isAvailable(client);

  return {
    profileId,
    fingerprints,
    foodEntries,
    cgmSummary,
    inventory,
    doseEvents,
    ageAvailable,
    dismissedCardIds,
    appointments,
    restaurants,
  };
}

async function loadDismissedCardIds(client: any, profileId: string): Promise<string[]> {
  try {
    const result = await client.query(
      `SELECT card_id FROM t1d_card_interactions 
       WHERE t1d_profile_id = $1 AND action = 'dismissed'`,
      [profileId]
    );
    return result.rows.map((row: Record<string, unknown>) => String(row.card_id));
  } catch {
    return [];
  }
}

async function getProfileId(client: any, userId: string): Promise<string | undefined> {
  try {
    const result = await client.query('SELECT id FROM t1d_profiles WHERE sparky_user_id = $1 LIMIT 1', [userId]);
    return result.rows[0]?.id as string | undefined;
  } catch {
    return undefined;
  }
}

async function loadFingerprints(client: any, profileId: string): Promise<MealFingerprintRow[]> {
  try {
    const result = await client.query(
      `SELECT id::text, meal_key, meal_type_name, food_names, carbs_g, protein_g, fat_g, fiber_g,
              delta_mg_dl, peak_mg_dl, time_to_peak_minutes, confidence_tier, entry_date::text
       FROM t1d_meal_response_fingerprints
       WHERE t1d_profile_id = $1
       ORDER BY entry_date DESC
       LIMIT 100`,
      [profileId]
    );
    return result.rows.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      meal_key: String(row.meal_key ?? ''),
      meal_type_name: row.meal_type_name ? String(row.meal_type_name) : undefined,
      food_names: Array.isArray(row.food_names) ? row.food_names.map(String) : [],
      carbs_g: optionalNumber(row.carbs_g),
      protein_g: optionalNumber(row.protein_g),
      fat_g: optionalNumber(row.fat_g),
      fiber_g: optionalNumber(row.fiber_g),
      delta_mg_dl: optionalNumber(row.delta_mg_dl),
      peak_mg_dl: optionalNumber(row.peak_mg_dl),
      time_to_peak_minutes: optionalNumber(row.time_to_peak_minutes),
      confidence_tier: String(row.confidence_tier ?? 'medium'),
      entry_date: String(row.entry_date ?? ''),
    }));
  } catch {
    return [];
  }
}

async function loadFoodEntries(client: any, userId: string): Promise<FoodEntryRow[]> {
  try {
    const result = await client.query(
      `SELECT id::text, food_name, carbs, protein, fat, calories, entry_date::text, meal_type_id::text
       FROM food_entries
       WHERE user_id = $1 AND food_name IS NOT NULL
       ORDER BY entry_date DESC
       LIMIT 100`,
      [userId]
    );
    return result.rows.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      food_name: String(row.food_name ?? ''),
      carbs: optionalNumber(row.carbs),
      protein: optionalNumber(row.protein),
      fat: optionalNumber(row.fat),
      calories: optionalNumber(row.calories),
      entry_date: String(row.entry_date ?? ''),
      meal_type_id: row.meal_type_id ? String(row.meal_type_id) : undefined,
    }));
  } catch {
    return [];
  }
}

async function loadCgmSummary(client: any, profileId: string): Promise<CgmSummaryRow | undefined> {
  try {
    const result = await client.query(
      `SELECT COUNT(*)::int AS count,
              AVG(glucose_value_mg_dl)::float AS avg_glucose,
              MIN(glucose_value_mg_dl)::float AS min_glucose,
              MAX(glucose_value_mg_dl)::float AS max_glucose,
              100.0 * AVG(CASE WHEN glucose_value_mg_dl BETWEEN 70 AND 180 THEN 1 ELSE 0 END)::float AS tir_pct
       FROM t1d_cgm_entries
       WHERE t1d_profile_id = $1
         AND measured_at >= NOW() - INTERVAL '7 days'`,
      [profileId]
    );
    const row = result.rows[0] as Record<string, unknown> | undefined;
    return row ? {
      count: Number(row.count ?? 0),
      avg_glucose: optionalNumber(row.avg_glucose),
      min_glucose: optionalNumber(row.min_glucose),
      max_glucose: optionalNumber(row.max_glucose),
      tir_pct: optionalNumber(row.tir_pct),
    } : undefined;
  } catch {
    return undefined;
  }
}

async function loadInsulinInventory(client: any): Promise<InventoryRow[]> {
  try {
    const result = await client.query(
      `SELECT id::text, insulin_name, insulin_type, quantity_units, opened_at::text, expires_at::text
       FROM t1d_insulin_inventory
       WHERE quantity_units IS NOT NULL AND quantity_units > 0
       ORDER BY expires_at ASC NULLS LAST, opened_at DESC NULLS LAST
       LIMIT 10`
    );
    return result.rows.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      insulin_name: String(row.insulin_name ?? ''),
      insulin_type: row.insulin_type ? String(row.insulin_type) : undefined,
      quantity_units: optionalNumber(row.quantity_units),
      opened_at: row.opened_at ? String(row.opened_at) : undefined,
      expires_at: row.expires_at ? String(row.expires_at) : undefined,
    }));
  } catch {
    return [];
  }
}

async function loadDoseEvents(client: any): Promise<DoseEventRow[]> {
  try {
    const result = await client.query(
      `SELECT id::text, units, dose_type, taken_at::text
       FROM t1d_insulin_dose_events
       WHERE units IS NOT NULL AND units > 0
       ORDER BY taken_at DESC
       LIMIT 100`
    );
    return result.rows.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      units: optionalNumber(row.units),
      dose_type: row.dose_type ? String(row.dose_type) : undefined,
      taken_at: row.taken_at ? String(row.taken_at) : undefined,
    }));
  } catch {
    return [];
  }
}

async function loadAppointments(client: any, profileId: string): Promise<AppointmentContextRow[]> {
  try {
    const result = await client.query(
      `SELECT id::text, starts_at::text, title, specialty
       FROM t1d_calendar_events
       WHERE t1d_profile_id = $1
         AND starts_at >= NOW()
         AND (
           LOWER(COALESCE(title, '')) LIKE '%diabetes%'
           OR LOWER(COALESCE(title, '')) LIKE '%endo%'
           OR LOWER(COALESCE(specialty, '')) LIKE '%diabetes%'
           OR LOWER(COALESCE(specialty, '')) LIKE '%endo%'
         )
       ORDER BY starts_at ASC
       LIMIT 5`,
      [profileId],
    );
    return result.rows.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      starts_at: String(row.starts_at ?? ''),
      title: String(row.title ?? 'Diabetes appointment'),
      specialty: row.specialty ? String(row.specialty) : undefined,
    }));
  } catch {
    return [];
  }
}

async function loadRestaurantContexts(client: any, profileId: string): Promise<RestaurantContextRow[]> {
  try {
    const result = await client.query(
      `SELECT event_id::text, menu_id::text, restaurant_name, starts_at::text,
              normalized_items_json
       FROM t1d_restaurant_menu_contexts
       WHERE t1d_profile_id = $1
         AND starts_at >= NOW() - INTERVAL '1 day'
       ORDER BY starts_at ASC
       LIMIT 5`,
      [profileId],
    );
    return result.rows.map((row: Record<string, unknown>) => ({
      eventId: String(row.event_id),
      menuId: String(row.menu_id),
      restaurantName: String(row.restaurant_name ?? 'restaurant'),
      startsAt: row.starts_at ? String(row.starts_at) : undefined,
      normalizedItems: normalizeMenuItems(row.normalized_items_json),
    }));
  } catch {
    return [];
  }
}

function normalizeMenuItems(value: unknown): RestaurantContextRow['normalizedItems'] {
  const raw = typeof value === 'string' ? safeJsonParse(value) : value;
  if (!Array.isArray(raw)) return [];
  return raw.map((item: Record<string, unknown>) => ({
    itemId: String(item.itemId ?? item.item_id ?? ''),
    name: String(item.name ?? ''),
    score: optionalNumber(item.score) ?? 0,
    evidenceIds: Array.isArray(item.evidenceIds)
      ? item.evidenceIds.map(String)
      : Array.isArray(item.evidence_ids)
        ? item.evidence_ids.map(String)
        : [],
  })).filter((item) => item.itemId && item.name);
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

function createCard(input: {
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
  generatedAt: string;
  generatedBy?: string;
}): SatoIntelligenceCard {
  const expiresAt = input.expiresAt ?? getExpiresAt(input.type);
  const provenance: SatoCardProvenance = {
    source: input.source,
    entityIds: input.entityIds,
    queryRefs: input.queryRefs,
    evidenceBundleId: input.evidenceBundle.id,
    subgraphId: input.subgraphId,
    fingerprintIds: input.fingerprintIds,
    generatedBy: input.generatedBy ?? 'satoIntelligenceCardsService',
    generatedAt: input.generatedAt,
  };

  return {
    id: `card-${input.type}-${uuidv4()}`,
    type: input.type,
    priority: input.priority,
    title: input.title,
    subtitle: input.subtitle,
    body: input.body,
    confidence: Number(input.confidence.toFixed(2)),
    evidenceCount: input.evidenceCount,
    patternNames: input.patternNames,
    primaryAction: input.primaryAction,
    secondaryActions: input.secondaryActions,
    evidenceBundleId: input.evidenceBundle.id,
    subgraphId: input.subgraphId,
    createdAt: input.generatedAt,
    expiresAt,
    provenance,
  };
}

function suppress(cardType: SatoCardType, reason: SuppressionReason): CardRenderDecision {
  return { render: false, reason, cardType };
}

function toFingerprintRows(rows: MealFingerprintRow[]): any[] {
  return rows.map((row) => ({
    meal_type_name: row.meal_type_name || 'unknown',
    food_names: row.food_names,
    calories: 0,
    protein_g: row.protein_g || 0,
    carbs_g: row.carbs_g || 0,
    fat_g: row.fat_g || 0,
    fiber_g: row.fiber_g || 0,
    delta_mg_dl: row.delta_mg_dl || 0,
    peak_mg_dl: row.peak_mg_dl || 0,
    time_to_peak_minutes: row.time_to_peak_minutes || 0,
    confidence_tier: row.confidence_tier,
    cgm_points: 0,
    entry_date: row.entry_date,
    meal_key: row.meal_key,
    id: row.id,
  }));
}

function clusterStableMeals(fingerprints: MealFingerprintRow[]): Array<{
  label: string;
  count: number;
  confidence: number;
  avgDelta: number;
  fingerprints: MealFingerprintRow[];
}> {
  const clusters = new Map<string, MealFingerprintRow[]>();
  for (const fp of fingerprints) {
    const label = fp.food_names.length > 0 ? fp.food_names.map(normalizeFoodLabel).join(' + ') : normalizeFoodLabel(fp.meal_type_name ?? fp.meal_key);
    const delta = fp.delta_mg_dl ?? 999;
    if (delta >= -10 && delta <= 30) {
      if (!clusters.has(label)) clusters.set(label, []);
      clusters.get(label)!.push(fp);
    }
  }

  return Array.from(clusters.entries()).map(([label, rows]) => {
    const avgDelta = rows.reduce((sum, row) => sum + (row.delta_mg_dl ?? 0), 0) / rows.length;
    const highConfidence = rows.filter((row) => row.confidence_tier === 'high').length / rows.length;
    const confidence = Math.min(0.95, 0.45 + rows.length * 0.12 + highConfidence * 0.25 + Math.max(0, 1 - Math.abs(avgDelta) / 60) * 0.1);
    return { label, count: rows.length, confidence, avgDelta, fingerprints: rows };
  });
}

function projectInsulinStock(
  inventory: InventoryRow[],
  doseEvents: DoseEventRow[],
): { insulinName: string; daysRemaining: number; confidence: number } | null {
  const item = inventory[0];
  const recentEvents = doseEvents
    .filter((event) => event.taken_at)
    .sort((a, b) => String(b.taken_at).localeCompare(String(a.taken_at)))
    .slice(0, 14);
  if (!item || !item.quantity_units || recentEvents.length === 0) return null;

  const totalUnits = recentEvents.reduce((sum, event) => sum + (event.units ?? 0), 0);
  const days = Math.max(1, recentEvents.length / 2);
  const dailyUse = totalUnits / days;
  if (dailyUse <= 0) return null;
  const daysRemaining = item.quantity_units / dailyUse;
  const confidence = Math.min(0.9, 0.45 + Math.min(recentEvents.length, 14) / 28 + (recentEvents.length >= 3 ? 0.15 : 0));
  return { insulinName: item.insulin_name || 'rapid-acting insulin', daysRemaining, confidence };
}

function normalizeFoodLabel(value?: string): string {
  return String(value ?? 'unknown meal')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .slice(0, 48) || 'unknown meal';
}

function labelPattern(patternType: PatternMatch['patternType']): string {
  return patternType
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function priorityRank(priority: SatoCardPriority): number {
  return { low: 1, medium: 2, high: 3, urgent: 4 }[priority];
}

// ============================================================================
// FEED RANKING
// ============================================================================

interface FeedbackMap {
  markedUseful: Set<string>;
  markedNotUseful: Set<string>;
}

/**
 * Get feedback history for ranking - marked useful/not useful actions.
 */
/**
 * TTL configuration per card type.
 */
const CARD_TTL_HOURS: Record<SatoCardType, number> = {
  insulin_stock: 12,
  experiment: 48,
  what_if: 48,
  doctor_prep: 72,
  restaurant: 24,
  pattern_drift: 72,
  pattern_insight: 48,
  safe_meal: 168,
  weekly_digest: 168,
};

function getExpiresAt(cardType: SatoCardType): string {
  const hours = CARD_TTL_HOURS[cardType] ?? 24;
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

/**
 * Get feedback history for ranking - marked useful/not useful actions.
 */
async function getFeedbackHistory(client: any): Promise<FeedbackMap> {
  try {
    const result = await client.query(
      `SELECT card_id,
              MAX(CASE WHEN action = 'marked_useful' THEN true WHEN action = 'marked_not_useful' THEN false END) AS useful
       FROM t1d_card_interactions
       WHERE action IN ('marked_useful', 'marked_not_useful')
       GROUP BY card_id`
    );

    const markedUseful = new Set<string>();
    const markedNotUseful = new Set<string>();

    for (const row of result.rows) {
      if (row.useful) {
        markedUseful.add(String(row.card_id));
      } else {
        markedNotUseful.add(String(row.card_id));
      }
    }

    return { markedUseful, markedNotUseful };
  } catch {
    // Return empty sets if table doesn't exist yet
    return { markedUseful: new Set(), markedNotUseful: new Set() };
  }
}

/**
 * Rank cards using multiple signals:
 * - Urgency (priority rank)
 * - Confidence score
 * - Recency (newer patterns ranked higher)
 * - Context (relevant to current situation)
 * - Pattern strength
 * - Feedback history (penalize not useful, boost useful)
 */
function rankCards(
  cards: SatoIntelligenceCard[],
  context: CardContext,
  generatedAt: string,
  feedback: FeedbackMap
): SatoIntelligenceCard[] {
  return [...cards].sort((a, b) => {
    // Priority (urgent > high > medium > low)
    const priorityDiff = priorityRank(b.priority) - priorityRank(a.priority);
    if (priorityDiff !== 0) return priorityDiff;

    // Confidence (higher confidence first)
    const confA = a.confidence ?? 0;
    const confB = b.confidence ?? 0;
    if (confB !== confA) return confB - confA;

    // Recency - cards with newer evidence ranked higher
    const recencyA = daysSinceEvidence(a.createdAt);
    const recencyB = daysSinceEvidence(b.createdAt);
    if (recencyA !== recencyB) return recencyA - recencyB;

    // Feedback history - boost marked useful, penalize marked not useful
    const feedbackScoreA = cardFeedbackScore(a, feedback);
    const feedbackScoreB = cardFeedbackScore(b, feedback);
    if (feedbackScoreA !== feedbackScoreB) return feedbackScoreB - feedbackScoreA;

    // Title alpha tie-breaker
    return a.title.localeCompare(b.title);
  });
}

/**
 * Calculate feedback score for ranking.
 * Useful cards get +10, not useful get -10.
 * Checks both pattern names and direct card ID feedback.
 */
function cardFeedbackScore(card: SatoIntelligenceCard, feedback: FeedbackMap): number {
  let score = 0;

  // Check direct card ID feedback
  if (feedback.markedUseful.has(card.id)) score += 10;
  if (feedback.markedNotUseful.has(card.id)) score -= 10;

  // Check pattern name feedback
  for (const id of card.patternNames ?? []) {
    if (feedback.markedUseful.has(id)) score += 5;
    if (feedback.markedNotUseful.has(id)) score -= 5;
  }

  return score;
}

/**
 * Days since evidence date - lower = more recent.
 */
function daysSinceEvidence(dateStr: string): number {
  const created = new Date(dateStr).getTime();
  if (isNaN(created)) return 999;
  const now = Date.now();
  return (now - created) / (1000 * 60 * 60 * 24);
}

function optionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

// ============================================================================
// DEMO MODE SUPPORT
// ============================================================================

export interface DemoModeConfig {
  isDemoMode: boolean;
  demoDataSource?: string;
}

/**
 * Create a demo mode card with unmistakable demo marker.
 * Used for development UI work - never for product validation.
 */
export function createDemoCard(type: SatoCardType, override?: Partial<SatoIntelligenceCard>): SatoIntelligenceCard {
  const demoMarkers: Record<SatoCardType, { title: string; subtitle: string; body: string }> = {
    pattern_insight: {
      title: '[DEMO] Pattern Insight',
      subtitle: 'Demo data for UI development only',
      body: 'This is a demo card showing sample pattern insight. Demo cards are clearly marked and will never appear in product validation mode.',
    },
    safe_meal: {
      title: '[DEMO] Stable Meal',
      subtitle: 'Demo: pasta with consistent response',
      body: 'Demo card: This meal would show stable response in real mode.',
    },
    weekly_digest: {
      title: '[DEMO] Weekly Digest',
      subtitle: 'Demo: 7 days of sample data',
      body: 'Demo card: Weekly digest would show real data here.',
    },
    insulin_stock: {
      title: '[DEMO] Insulin Stock',
      subtitle: 'Demo: 3 days remaining',
      body: 'Demo card: Real mode would show actual inventory data.',
    },
    what_if: {
      title: '[DEMO] What-If',
      subtitle: 'Demo: similar historical meals available',
      body: 'Demo card: Real mode would ground this simulation in similar historical meals.',
    },
    pattern_drift: {
      title: '[DEMO] Pattern Drift',
      subtitle: 'Demo: baseline vs recent change',
      body: 'Demo card: Real mode would compare baseline and recent meal responses.',
    },
    experiment: {
      title: '[DEMO] Experiment',
      subtitle: 'Demo: behaviour opportunity',
      body: 'Demo card: Real mode would suggest a small non-medical experiment from prior patterns.',
    },
    doctor_prep: {
      title: '[DEMO] Doctor Prep',
      subtitle: 'Demo: appointment brief',
      body: 'Demo card: Real mode would use an upcoming appointment and recent evidence days.',
    },
    restaurant: {
      title: '[DEMO] Restaurant',
      subtitle: 'Demo: menu scoring',
      body: 'Demo card: Real mode would score normalized menu items against personal patterns.',
    },
    meal_timing: {
      title: '[DEMO] Meal Timing',
      subtitle: 'Demo: missed meal alert',
      body: 'Demo card: Real mode would alert about missed meals or irregular timing.',
    },
  };

  const marker = demoMarkers[type] ?? demoMarkers.pattern_insight;

  return {
    id: `demo-${type}-${uuidv4()}`,
    type,
    priority: 'medium',
    title: marker.title,
    subtitle: marker.subtitle,
    body: marker.body,
    confidence: 0.75,
    evidenceCount: 3,
    primaryAction: {
      label: 'View Evidence',
      action: 'view_evidence',
      payload: { isDemo: true },
    },
    createdAt: new Date().toISOString(),
    provenance: {
      source: 'deterministic_pipeline',
      entityIds: ['demo'],
      queryRefs: ['demo_data'],
      generatedBy: 'satoIntelligenceCardsService_demo',
      generatedAt: new Date().toISOString(),
    },
    ...override,
  };
}

/**
 * Check if we're in product validation mode.
 * Returns false if NODE_ENV is production or if explicit demo mode flag is false.
 */
export function isProductValidationMode(): boolean {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const explicitDemoMode = process.env.SATO_DEMO_MODE ?? 'false';
  return nodeEnv === 'production' || explicitDemoMode !== 'true';
}
