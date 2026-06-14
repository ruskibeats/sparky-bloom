/**
 * Sato Types
 *
 * Types for the emotional greeting and mood badge system
 */

export type Mood = 'calm' | 'curied' | 'excited' | 'surprised';
export type MoodBadge = 'green' | 'amber' | 'orange' | 'red';
export type Voice = 'warm' | 'practical' | 'calm' | 'analytical';

export interface EmotionalCard {
  kind: string;
  mood: Mood;
  moodBadge: MoodBadge;
  narrative: string;
  payload: Record<string, unknown>;
}

export interface SatoGreetingResponse {
  emotion: Mood;
  mood_badge: MoodBadge;
  narrative: string;
  questionOrOffer?: string;
  voice: Voice;
  raw: any;
}

export interface SatoCardsResponse {
  emotion: Mood;
  moodBadge: MoodBadge;
  narrative: string;
  questionOrOffer?: string;
  voice: Voice;
  cards: EmotionalCard[];
}