import React, { useState } from 'react';
import { View, ScrollView, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCSSVariable } from 'uniwind';
import Icon from '../components/Icon';
import type { Mood, MoodBadge, EmotionalCard } from '../types/sato';

const SCREEN_WIDTH = 320;
const MOOD_BADGE_COLORS: Record<MoodBadge, string> = {
  green: '#22c55e',
  amber: '#f59e0b',
  orange: '#f97316',
  red: '#ef4444'
};
const MOOD_BADGE_EMOJIS: Record<Mood, string> = {
  calm: '🟢',
  curied: '🟡',
  excited: '🟠',
  surprised: '🔴'
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'var(--color-chrome)',
  },
  greetingSection: {
    padding: 20,
    backgroundColor: 'var(--color-chrome)',
    borderBottomColor: 'var(--color-chrome-border)',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: 'var(--color-text-primary)',
    marginBottom: 8,
  },
  greeting: {
    fontSize: 16,
    color: 'var(--color-text-secondary)',
    lineHeight: 24,
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
    alignSelf: 'flex-start',
  },
  moodBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cardsContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: 'var(--color-card)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomColor: 'var(--color-chrome-border)',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'var(--color-text-primary)',
  },
  cardMoodBadge: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  cardMoodBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'var(--color-text-secondary)',
    marginLeft: 4,
  },
  cardContent: {
    fontSize: 14,
    color: 'var(--color-text-secondary)',
    lineHeight: 20,
  },
  nerdToggle: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: 'var(--color-chrome)',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'var(--color-chrome-border)',
  },
  nerdToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'var(--color-text-primary)',
    marginLeft: 8,
  },
  errorMessage: {
    padding: 20,
    textAlign: 'center',
    color: 'var(--color-text-secondary)',
    fontSize: 14,
  },
});

interface SatoScreenProps {
  greeting?: {
    emotion: Mood;
    mood_badge: MoodBadge;
    narrative: string;
    questionOrOffer?: string;
    voice: 'warm' | 'practical' | 'calm' | 'analytical';
  };
  cards?: EmotionalCard[];
  error?: string;
}

export const SatoScreen: React.FC<SatoScreenProps> = ({
  greeting,
  cards = [],
  error,
}) => {
  const [viewMode, setViewMode] = useState<'sato' | 'nerd'>('sato');
  const [chrome, chromeBorder] = useCSSVariable([
    '--color-chrome',
    '--color-chrome-border',
  ]) as [string, string];

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorMessage}>
          <Text>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: chrome }]}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {/* Sato Greeting Section */}
        {greeting && (
          <View style={styles.greetingSection}>
            <Text style={styles.profileName}>
              {greeting.emotion === 'curied' ? 'Your meal' : 'Good morning'}
            </Text>
            <Text style={styles.greeting}>{greeting.narrative}</Text>

            {/* Mood Badge */}
            <View
              style={[
                styles.moodBadge,
                { backgroundColor: MOOD_BADGE_COLORS[greeting.mood_badge] }
              ]}
            >
              <Text style={styles.moodBadgeText}>
                {MOOD_BADGE_EMOJIS[greeting.emotion]} {greeting.emotion.charAt(0).toUpperCase() + greeting.emotion.slice(1)}
              </Text>
            </View>
          </View>
        )}

        {/* Sato Cards */}
        <View style={styles.cardsContainer}>
          {cards.map((card, index) => (
            <View key={index} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{card.kind}</Text>
                <View style={styles.cardMoodBadge}>
                  <Icon name="flower" size={12} color="gray" />
                  <Text style={styles.cardMoodBadgeText}>
                    {card.moodBadge.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardContent}>{card.narrative}</Text>
            </View>
          ))}
        </View>

        {/* Nerd Stats Toggle */}
        <TouchableOpacity
          style={[
            styles.nerdToggle,
            { borderColor: chromeBorder }
          ]}
          onPress={() => setViewMode(viewMode === 'sato' ? 'nerd' : 'sato')}
        >
          <Icon
            name={viewMode === 'nerd' ? 'eye-off' : 'eye'}
            size={20}
            color="var(--color-text-primary)"
          />
          <Text style={styles.nerdToggleText}>
            {viewMode === 'nerd' ? 'Show Sato View' : 'Show Nerd Stats'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SatoScreen;