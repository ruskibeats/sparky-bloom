/**
 * Card Interaction Service - Persists Sato Intelligence Card lifecycle events.
 *
 * Tracks impression, opened, primary_action, secondary_action, dismissed,
 * marked_useful, and marked_not_useful events.
 */

import { getClient } from '../db/poolManager.js';
import type { SatoIntelligenceCard } from './satoIntelligenceCardsService.js';

// Re-export CardInteractionAction type
export type CardInteractionAction =
  | 'impression'
  | 'opened'
  | 'primary_action'
  | 'secondary_action'
  | 'dismissed'
  | 'marked_useful'
  | 'marked_not_useful';

export interface CardInteractionRecord {
  id: string;
  cardId: string;
  t1dProfileId?: string;
  userId: string;
  action: CardInteractionAction;
  payload?: Record<string, unknown>;
  createdAt: string;
}

/**
 * Persist a card interaction event.
 * Records the action taken on a card with the associated user context.
 */
export async function persistCardInteraction(
  cardId: string,
  userId: string,
  action: CardInteractionAction,
  payload?: Record<string, unknown>,
  client?: any,
): Promise<CardInteractionRecord> {
  const ownedClient = client ?? (await getClient(userId));
  
  try {
    // Get the T1D profile ID if available
    const profileResult = await ownedClient.query(
      'SELECT id FROM t1d_profiles WHERE sparky_user_id = $1 LIMIT 1',
      [userId]
    );
    const t1dProfileId = profileResult.rows[0]?.id as string | undefined;

    // Insert interaction record
    const result = await ownedClient.query(
      `INSERT INTO t1d_card_interactions (
        id, card_id, t1d_profile_id, user_id, action, payload, created_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, NOW()
      ) RETURNING id::text, card_id::text, t1d_profile_id::text, user_id::text, action, payload::jsonb, created_at::text AS created_at`,
      [cardId, t1dProfileId, userId, action, JSON.stringify(payload ?? {})]
    );

    return {
      id: result.rows[0].id,
      cardId: result.rows[0].card_id,
      t1dProfileId: result.rows[0].t1d_profile_id,
      userId: result.rows[0].user_id,
      action: result.rows[0].action,
      payload: result.rows[0].payload,
      createdAt: result.rows[0].created_at,
    };
  } finally {
    if (!client) ownedClient.release();
  }
}

/**
 * Get dismissed card IDs for a user.
 * Used to suppress previously dismissed cards from new feed loads.
 */
export async function getDismissedCardIds(userId: string, client?: any): Promise<string[]> {
  const ownedClient = client ?? (await getClient(userId));
  
  try {
    const result = await ownedClient.query(
      `SELECT DISTINCT card_id 
       FROM t1d_card_interactions 
       WHERE user_id = $1 AND action = 'dismissed'`,
      [userId]
    );

    return result.rows.map((row: Record<string, unknown>) => String(row.card_id));
  } finally {
    if (!client) ownedClient.release();
  }
}

/**
 * Get usefulness feedback for cards.
 * Returns map of cardId -> useful (true/false) for feedback analysis.
 */
export async function getCardUsefulnessFeedback(userId: string, client?: any): Promise<Map<string, boolean>> {
  const ownedClient = client ?? (await getClient(userId));
  const feedback = new Map<string, boolean>();
  
  try {
    const result = await ownedClient.query(
      `SELECT card_id, 
              MAX(CASE WHEN action = 'marked_useful' THEN true ELSE false END) AS useful
       FROM t1d_card_interactions 
       WHERE user_id = $1 AND (action = 'marked_useful' OR action = 'marked_not_useful')
       GROUP BY card_id`,
      [userId]
    );

    for (const row of result.rows) {
      feedback.set(String(row.card_id), row.useful);
    }

    return feedback;
  } finally {
    if (!client) ownedClient.release();
  }
}

/**
 * Record that a card was shown (impression).
 */
export async function recordCardImpression(
  card: SatoIntelligenceCard,
  userId: string,
  client?: any,
): Promise<CardInteractionRecord> {
  return persistCardInteraction(card.id, userId, 'impression', undefined, client);
}

/**
 * Record that a card was opened.
 */
export async function recordCardOpened(
  card: SatoIntelligenceCard,
  userId: string,
  client?: any,
): Promise<CardInteractionRecord> {
  return persistCardInteraction(card.id, userId, 'opened', undefined, client);
}

/**
 * Record that a card was dismissed.
 */
export async function recordCardDismissed(
  card: SatoIntelligenceCard,
  userId: string,
  client?: any,
): Promise<CardInteractionRecord> {
  return persistCardInteraction(card.id, userId, 'dismissed', undefined, client);
}

/**
 * Record that a card was marked useful.
 */
export async function recordCardMarkedUseful(
  card: SatoIntelligenceCard,
  userId: string,
  client?: any,
): Promise<CardInteractionRecord> {
  return persistCardInteraction(card.id, userId, 'marked_useful', undefined, client);
}

/**
 * Record that a card was marked not useful.
 */
export async function recordCardMarkedNotUseful(
  card: SatoIntelligenceCard,
  userId: string,
  client?: any,
): Promise<CardInteractionRecord> {
  return persistCardInteraction(card.id, userId, 'marked_not_useful', undefined, client);
}