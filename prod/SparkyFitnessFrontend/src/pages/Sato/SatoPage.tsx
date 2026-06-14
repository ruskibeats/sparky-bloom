import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, useTheme } from 'react-native';

const SatoPage = () => {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [greeting, setGreeting] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'sato' | 'nerd'>('sato');

  useEffect(() => {
    // Check if we're in portrait mode and show greeting
    // For now, use sample data
    setTimeout(() => {
      setGreeting({
        emotion: 'curied',
        mood_badge: 'amber',
        narrative: "Your meal on ${latestDate} feels... interesting and unexpected. This is your ${count}rd time with this combination. Something in your nutrition feels inquisitive today.",
        voice: 'curied'
      });

      setCards([
        {
          kind: 'parsedFoods',
          mood: 'curied',
          moodBadge: 'amber',
          narrative: 'You logged: pizza, salad'
        },
        {
          kind: 'forecast',
          mood: 'excited',
          moodBadge: 'orange',
          narrative: 'Peak: ~188 mg/dL at ~95 min'
        },
        {
          kind: 'mealMemory',
          mood: 'calm',
          moodBadge: 'green',
          narrative: 'Similar meals: 5 times. High consistency.'
        }
      ]);

      setIsLoading(false);
    }, 500);
  }, []);

  const MOOD_BADGE_COLORS: Record<string, string> = {
    green: '#22c55e',
    amber: '#f59e0b',
    orange: '#f97316',
    red: '#ef4444'
  };

  const MOOD_EMOJIS: Record<string, string> = {
    calm: '🟢',
    curied: '🟡',
    excited: '🟠',
    surprised: '🔴'
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Sato Greeting Section */}
      {greeting && !isLoading && (
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
              {MOOD_EMOJIS[greeting.emotion]} {greeting.emotion.charAt(0).toUpperCase() + greeting.emotion.slice(1)}
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
                <Text style={styles.cardMoodBadgeText}>
                  {card.moodBadge.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.cardContent}>{card.narrative}</Text>
          </View>
        ))}

        {/* Nerd Stats Toggle */}
        <TouchableOpacity
          style={[
            styles.nerdToggle,
            { borderColor: colors.border }
          ]}
          onPress={() => setViewMode(viewMode === 'sato' ? 'nerd' : 'sato')}
        >
          <Text style={styles.nerdToggleText}>
            {viewMode === 'nerd' ? 'Show Sato View' : 'Show Nerd Stats'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  greetingSection: {
    padding: 20,
    backgroundColor: 'transparent',
  },
  profileName: {
    fontFamily: 'SystemFont, -apple-system, sans-serif',
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  greeting: {
    fontFamily: 'SystemFont, -apple-system, sans-serif',
    fontSize: 16,
    color: '#334155',
    lineHeight: 24,
    marginBottom: 12,
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  moodBadgeText: {
    fontFamily: 'SystemFont, -apple-system, sans-serif',
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 8,
  },
  cardsContainer: {
    padding: 20,
    gap: 16,
  },
  card: {
    backgroundColor: colors.card,  // This will be injected by the theme context
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.015,
    shadowRadius: 18,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  cardTitle: {
    fontFamily: 'SystemFont, -apple-system, sans-serif',
    color: '#1e293b',
    fontWeight: '600',
    fontSize: 16,
  },
  cardMoodBadge: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardMoodBadgeText: {
    fontFamily: 'SystemFont, -apple-system, sans-serif',
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
  },
  cardContent: {
    fontFamily: 'SystemFont, -apple-system, sans-serif',
    color: '#1e293b',
    lineHeight: 20,
    fontSize: 14,
  },
  nerdToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: colors.card,  // This will be injected by the theme context
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginTop: 20,
  },
  nerdToggleText: {
    fontFamily: 'SystemFont, -apple-system, sans-serif',
    color: '#d97748',
    fontWeight: '600',
  },
});

export default SatoPage;