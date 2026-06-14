import { useState, useEffect } from 'react';

interface MoodBadge {
  color: string;
  emoji: string;
}

interface Card {
  kind: string;
  mood: string;
  moodBadge: string;
  narrative: string;
}

interface SatoGreeting {
  emotion: string;
  mood_badge: string;
  narrative: string;
  voice?: string;
}

const MOOD_BADGE_COLORS: Record<string, MoodBadge> = {
  green: { color: '#22c55e', emoji: '🟢' },
  amber: { color: '#f59e0b', emoji: '🟡' },
  orange: { color: '#f97316', emoji: '🟠' },
  red: { color: '#ef4444', emoji: '🔴' },
};

const SAMPLE_GREETING: SatoGreeting = {
  emotion: 'curied',
  mood_badge: 'amber',
  narrative:
    'Your meal on ${latestDate} feels... interesting and unexpected. This is your ${count}rd time with this combination. Something in your nutrition feels inquisitive today.',
  voice: 'curied',
};

const SAMPLE_CARDS: Card[] = [
  {
    kind: 'parsedFoods',
    mood: 'curied',
    moodBadge: 'amber',
    narrative: 'You logged: pizza, salad',
  },
  {
    kind: 'forecast',
    mood: 'excited',
    moodBadge: 'orange',
    narrative: 'Peak: ~188 mg/dL at ~95 min',
  },
  {
    kind: 'mealMemory',
    mood: 'calm',
    moodBadge: 'green',
    narrative: 'Similar meals: 5 times. High consistency.',
  },
];

const SatoPage = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [greeting, setGreeting] = useState<SatoGreeting | null>(null);
  const [cards, setCards] = useState<Card[]>(SAMPLE_CARDS);
  const [viewMode, setViewMode] = useState<'sato' | 'nerd'>('sato');

  useEffect(() => {
    // For now, use sample data
    setTimeout(() => {
      setGreeting(SAMPLE_GREETING);
      setCards(SAMPLE_CARDS);
      setIsLoading(false);
    }, 500);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Sato Greeting Section */}
      {greeting && !isLoading && (
        <div className="p-5">
          <h1 className="text-xl font-bold mb-2">
            {greeting.emotion === 'curied' ? 'Your meal' : 'Good morning'}
          </h1>
          <p className="text-base text-muted-foreground mb-3 leading-relaxed">
            {greeting.narrative}
          </p>

          {/* Mood Badge */}
          <div
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg"
            style={{
              backgroundColor: MOOD_BADGE_COLORS[greeting.mood_badge]?.color,
            }}
          >
            <span className="mr-2 text-sm font-bold text-white">
              {MOOD_BADGE_COLORS[greeting.mood_badge]?.emoji}{' '}
              {greeting.emotion.charAt(0).toUpperCase() +
                greeting.emotion.slice(1)}
            </span>
          </div>
        </div>
      )}

      {/* Sato Cards */}
      <div className="p-5 flex flex-col gap-4">
        {cards.map((card, index) => (
          <div
            key={index}
            className="rounded-xl p-4 shadow-lg"
            style={{ backgroundColor: 'var(--card)' }}
          >
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
              <h3 className="font-semibold text-lg text-foreground">
                {card.kind}
              </h3>
              <div className="px-3 py-1 rounded-md">
                <span className="text-xs font-semibold text-muted-foreground">
                  {card.moodBadge.toUpperCase()}
                </span>
              </div>
            </div>
            <p className="text-sm text-foreground leading-relaxed">
              {card.narrative}
            </p>
          </div>
        ))}

        {/* Nerd Stats Toggle */}
        <button
          onClick={() => setViewMode(viewMode === 'sato' ? 'nerd' : 'sato')}
          className="mt-5 flex items-center justify-center py-3 rounded-lg font-semibold text-orange-600"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)',
            borderWidth: '1px',
          }}
        >
          {viewMode === 'nerd' ? 'Show Sato View' : 'Show Nerd Stats'}
        </button>
      </div>
    </div>
  );
};

export default SatoPage;
