import { useMemo, useState } from 'react';
import {
  Activity,
  Bell,
  BookOpen,
  Calendar,
  ChevronRight,
  Compass,
  HeartPulse,
  Home,
  Leaf,
  Moon,
  Search,
  Send,
  Sparkles,
  User,
  Utensils,
} from 'lucide-react';

type TabId = 'portrait' | 'foods' | 'discover' | 'sato';
type Message = {
  id: string;
  role: 'sato' | 'user';
  text: string;
  card?: { title: string; value: string; subtext: string; icon: 'sleep' | 'walk' | 'glucose' };
  actions?: string[];
};

const colors = {
  bg: '#F1EBDD',
  ink: '#181614',
  soft: '#7E756A',
  border: '#E3DACB',
  chip: '#EDE7DD',
  orange: '#D97947',
  blue: '#6B8EA8',
  green: '#70824B',
  violet: '#7A5CA6',
};

const foods = [
  { name: 'Carbonara', count: 7, rise: '+42', peak: '1h 45m', note: 'Usually leaves a stronger evening trace.', color: '#D7B36A' },
  { name: 'Pasta', count: 16, rise: '+54', peak: '1h 15m', note: 'Sharp spike, quick return.', color: '#B5C08D' },
  { name: 'Spaghetti', count: 11, rise: '+36', peak: '2h 00m', note: 'Moderate spike, delayed tail.', color: '#7EAEC3' },
  { name: 'Creamy pasta', count: 5, rise: '+28', peak: '2h 30m', note: 'Slow absorption, flat plateau.', color: '#D4B483' },
  { name: 'Parmesan', count: 9, rise: '+8', peak: '45m', note: 'Minimal impact, stable line.', color: '#E9A07D' },
];

const discoveries = [
  { title: 'The evening left a stronger trace.', seen: 18, body: 'Fat and protein heavy dinners tend to bloom later, often several hours after the plate is gone.', color: colors.orange },
  { title: 'Walks soften the edge.', seen: 12, body: 'A short post-meal walk is linked with a calmer glucose curve and fewer sharp petals.', color: colors.blue },
  { title: 'Sleep changes breakfast.', seen: 9, body: 'Short rest appears to make morning meals feel louder and less predictable.', color: colors.violet },
  { title: 'Protein changes the tempo.', seen: 7, body: 'Higher protein meals can reduce the first peak while extending the tail.', color: colors.green },
];

const quickPrompts = ['Why was I low this afternoon?', 'How did my walk affect things?', 'Pizza tonight — what should I expect?', 'Show me my sleep patterns'];

function getReply(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes('walk')) return 'A brief 15–20 minute walk after meals is linked with smoother curves. In your memories, movement often acts like a natural stabilizer.';
  if (lower.includes('pizza') || lower.includes('pasta') || lower.includes('carbonara')) return 'Fat-and-protein rich meals can delay the rise. Expect a slower bloom with a possible late tail around 3–4 hours after eating.';
  if (lower.includes('sleep')) return 'Shorter sleep can raise morning resistance. Sato would watch breakfast more carefully after restless nights.';
  if (lower.includes('low') || lower.includes('hypo')) return 'Your afternoon dip resembles days where meals were delayed or activity stacked up. This is educational context only; follow your care plan for lows.';
  return 'That is a useful question. I would compare your diary memories, food patterns, movement, sleep, and glucose shape before giving a calm educational answer.';
}

function getCard(text: string): Message['card'] {
  const lower = text.toLowerCase();
  if (lower.includes('sleep')) return { title: 'Sleep Duration & Quality', value: '8h 00m', subtext: 'Quality: 85% · Sleep target met', icon: 'sleep' };
  if (lower.includes('walk')) return { title: 'Daily Walk Activity', value: '10,420 steps', subtext: 'Walked 20m at 2:30pm · Natural stabilizer', icon: 'walk' };
  if (lower.includes('low') || lower.includes('hypo')) return { title: 'Daily Glucose Stability', value: '78% Time In Range', subtext: 'Range: 70–180 mg/dL', icon: 'glucose' };
  return undefined;
}

function getActions(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes('walk')) return ['Set 20m post-meal timer', 'Remind me to move after lunch'];
  if (lower.includes('pizza') || lower.includes('pasta') || lower.includes('carbonara')) return ['Set 20m pre-meal check', 'Set 4h delayed rise check', 'View linked food memory'];
  if (lower.includes('sleep')) return ['Record sleep logs', 'Track rest trends'];
  if (lower.includes('low') || lower.includes('hypo')) return ['Set lunch check-in reminder', 'Track post-meal dips'];
  return undefined;
}

function BloomOrb({ size = 300 }: { size?: number }) {
  const petals = Array.from({ length: 24 });
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <div className="absolute inset-8 rounded-full border border-[#d8cdbb] bg-[#f6f0e5] shadow-inner" />
      {petals.map((_, i) => {
        const angle = (360 / petals.length) * i;
        const height = 70 + (i % 5) * 12;
        const palette = ['#6B8EA8', '#79937D', '#DFBA55', '#D97947', '#7A5CA6'];
        return (
          <div
            key={i}
            className="absolute left-1/2 top-1/2 origin-bottom rounded-full opacity-70 blur-[0.2px]"
            style={{
              width: 18,
              height,
              background: palette[i % palette.length],
              transform: `translate(-50%, -100%) rotate(${angle}deg) translateY(-18px)`,
              borderRadius: '80% 80% 55% 55%',
              mixBlendMode: 'multiply',
            }}
          />
        );
      })}
      <div className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#d9cdbc] bg-[#f8f2e8] text-center shadow-sm">
        <div>
          <div className="font-serif text-3xl text-[#181614]">7</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#7E756A]">Reactive</div>
        </div>
      </div>
    </div>
  );
}

function Header({ active, setActive }: { active: TabId; setActive: (tab: TabId) => void }) {
  const tabs: Array<[TabId, typeof Home, string]> = [
    ['portrait', Home, 'Portrait'],
    ['foods', Utensils, 'Foods'],
    ['discover', Compass, 'Discover'],
    ['sato', Sparkles, 'Sato'],
  ];
  return (
    <>
      <div className="sticky top-0 z-20 border-b border-[#E3DACB]/80 bg-[#F1EBDD]/95 px-5 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full border border-[#E3DACB] bg-[#EDE7DD]"><Leaf className="h-5 w-5 text-[#D97947]" /></div>
            <div>
              <div className="font-serif text-2xl tracking-wide text-[#181614]">Sato</div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#7E756A]">quiet metabolic memory</div>
            </div>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <button className="rounded-full bg-[#EDE7DD] p-2 text-[#7E756A]"><Bell className="h-4 w-4" /></button>
            <button className="rounded-full bg-[#EDE7DD] p-2 text-[#7E756A]"><User className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
      <nav className="fixed bottom-5 left-1/2 z-30 flex -translate-x-1/2 gap-1 rounded-full border border-[#E3DACB] bg-[#f6f2ea]/95 p-1.5 shadow-[0_18px_60px_rgba(24,22,20,0.16)] backdrop-blur">
        {tabs.map(([id, Icon, label]) => (
          <button key={id} onClick={() => setActive(id)} className={`flex min-w-[74px] flex-col items-center rounded-full px-3 py-2 text-[10px] transition ${active === id ? 'bg-[#181614] text-white' : 'text-[#7E756A] hover:bg-[#EDE7DD]'}`}>
            <Icon className="mb-1 h-4 w-4" />{label}
          </button>
        ))}
      </nav>
    </>
  );
}

function PortraitPage() {
  return <main className="mx-auto max-w-5xl px-6 pb-36 pt-8"><p className="text-sm text-[#7E756A]">Good morning, Russell</p><h1 className="mt-2 font-serif text-5xl leading-tight text-[#181614]">Your bloom feels<br /><em className="text-[#6B8EA8]">reactive</em> today.</h1><div className="mt-5 flex justify-end"><span className="inline-flex items-center gap-2 rounded-full border border-[#E3DACB] bg-[#EDE7DD] px-3 py-1.5 text-xs"><Calendar className="h-3.5 w-3.5" /> Today</span></div><div className="mt-4"><BloomOrb size={Math.min(360, window.innerWidth - 48)} /></div><div className="mx-auto mt-5 max-w-sm text-center text-sm text-[#7E756A]">Each petal reflects how your body felt throughout that time.</div><section className="mt-10"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7E756A]">Reactive state bloom</p><h2 className="mt-1 font-serif text-3xl text-[#181614]">Your metabolic portrait today.</h2><div className="relative mt-5 overflow-hidden rounded-[2rem] border border-[#E3DACB] bg-[#F2ECDF] p-6"><div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-[#D97947]/10 blur-2xl" /><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#7E756A]">Today’s focus</p><p className="mt-4 font-serif text-3xl leading-tight text-[#181614]">Give meals more context before you trust the forecast.</p><button className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#181614] px-4 py-2 text-sm text-white">See why <ChevronRight className="h-4 w-4" /></button></div></section></main>;
}

function FoodsPage() {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => foods.filter((food) => food.name.toLowerCase().includes(query.toLowerCase())), [query]);
  return <main className="mx-auto max-w-5xl px-6 pb-36 pt-8"><h1 className="font-serif text-6xl text-[#181614]">Foods</h1><p className="mt-2 max-w-xl text-[#7E756A]">Your remembered meals, translated from the mobile app into a responsive web surface.</p><div className="mt-7 flex items-center gap-3 border-b border-[#E3DACB] pb-3"><Search className="h-5 w-5 text-[#7E756A]" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search food memories..." className="w-full bg-transparent text-[#181614] outline-none placeholder:text-[#7E756A]" /></div><div className="mt-8 grid gap-4 md:grid-cols-2">{filtered.map((food) => <article key={food.name} className="rounded-[1.75rem] border border-[#E3DACB] bg-[#F2ECDF] p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="font-serif text-3xl text-[#181614]">{food.name}</h2><p className="mt-1 text-sm text-[#7E756A]">Observed {food.count} times · peaks after {food.peak}</p></div><div className="rounded-full px-3 py-1 text-sm font-semibold" style={{ background: `${food.color}33`, color: food.color }}>{food.rise}</div></div><div className="mt-5 h-20 rounded-2xl border border-[#E3DACB] bg-[#FBF8F2] p-3"><svg viewBox="0 0 280 64" className="h-full w-full"><path d="M4 52 C 55 46, 64 12, 112 22 S 180 62, 276 38" fill="none" stroke={food.color} strokeWidth="3" strokeLinecap="round" /></svg></div><p className="mt-4 text-sm leading-6 text-[#7E756A]">{food.note}</p></article>)}</div></main>;
}

function DiscoverPage() {
  const featured = discoveries[0]!;
  return <main className="mx-auto max-w-5xl px-6 pb-36 pt-8"><h1 className="font-serif text-6xl text-[#181614]">Discover</h1><p className="mt-2 text-[#7E756A]">Patterns Sato has quietly noticed in your life.</p><article className="mt-8 rounded-[2.2rem] border border-[#E3DACB] bg-[#F2ECDF] p-6"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#D97947]">Featured discovery</p><h2 className="mt-3 max-w-2xl font-serif text-4xl leading-tight text-[#181614]">{featured.title}</h2><p className="mt-2 text-sm text-[#7E756A]">Observed {featured.seen} times · Recurring pattern</p><p className="mt-5 max-w-2xl text-base leading-7 text-[#181614]/80">{featured.body}</p><div className="mt-5"><BloomOrb size={260} /></div></article><section className="mt-8"><div className="flex items-end justify-between"><h2 className="font-serif text-3xl text-[#181614]">Other Observations</h2><button className="text-sm text-[#D97947]">See all</button></div><div className="mt-4 divide-y divide-[#E3DACB]">{discoveries.slice(1).map((item) => <button key={item.title} className="flex w-full items-center justify-between py-4 text-left"><span className="text-[#181614]">{item.title} <span className="text-[#7E756A]">· Observed {item.seen} times</span></span><ChevronRight className="h-4 w-4 text-[#7E756A]" /></button>)}</div></section></main>;
}

function SatoChatPage() {
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>([{ id: '1', role: 'sato', text: "Good evening, Russell. Your glucose has been more settled today — you've spent 78% of the day in range. Anything on your mind?" }]);
  const send = (text: string) => { const trimmed = text.trim(); if (!trimmed) return; setMessages((prev) => [...prev, { id: `${Date.now()}`, role: 'user', text: trimmed }, { id: `${Date.now() + 1}`, role: 'sato', text: getReply(trimmed), card: getCard(trimmed), actions: getActions(trimmed) }]); setDraft(''); };
  return <main className="mx-auto flex min-h-[calc(100vh-74px)] max-w-3xl flex-col px-6 pb-36 pt-4"><div className="flex-1 divide-y divide-[#E3DACB]">{messages.map((msg) => <div key={msg.id} className={`py-6 ${msg.role === 'user' ? 'text-right' : ''}`}><p className={`mb-2 text-xs font-semibold uppercase tracking-[0.18em] ${msg.role === 'sato' ? 'text-[#D97947]' : 'text-[#7E756A]'}`}>{msg.role === 'sato' ? 'Sato' : 'You'}</p><p className="text-[15px] leading-7 text-[#181614]">{msg.text}</p>{msg.card ? <div className="mt-4 flex items-center gap-3 border-y border-[#E3DACB]/70 py-4 text-left"><div className="grid h-9 w-9 place-items-center rounded-full bg-[#EDE7DD]">{msg.card.icon === 'sleep' ? <Moon className="h-5 w-5 text-[#7A5CA6]" /> : msg.card.icon === 'walk' ? <Activity className="h-5 w-5 text-[#6B8EA8]" /> : <HeartPulse className="h-5 w-5 text-[#D97947]" />}</div><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#7E756A]">{msg.card.title}</p><p className="font-serif text-2xl text-[#181614]">{msg.card.value}</p><p className="text-xs text-[#7E756A]">{msg.card.subtext}</p></div></div> : null}{msg.actions ? <div className="mt-3 flex flex-col items-start gap-2">{msg.actions.map((a) => <button key={a} className="inline-flex items-center gap-2 text-sm font-medium text-[#D97947]"><BookOpen className="h-3.5 w-3.5" />{a}</button>)}</div> : null}</div>)}</div>{messages.length === 1 ? <div className="mb-4 border-t border-[#E3DACB] pt-4"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#7E756A]">Suggested</p>{quickPrompts.map((q) => <button key={q} onClick={() => send(q)} className="flex w-full items-center gap-2 py-2 text-left text-sm text-[#D97947]"><ChevronRight className="h-3.5 w-3.5" />{q}</button>)}</div> : null}<form onSubmit={(e) => { e.preventDefault(); send(draft); }} className="fixed bottom-24 left-1/2 z-20 flex w-[min(44rem,calc(100vw-2rem))] -translate-x-1/2 items-end gap-2 border-t border-[#E3DACB] bg-[#F1EBDD]/95 p-3 backdrop-blur"><textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask Sato anything..." rows={1} className="max-h-28 flex-1 resize-none border-b border-[#E3DACB] bg-transparent py-2 text-[#181614] outline-none placeholder:text-[#7E756A]" /><button disabled={!draft.trim()} className="grid h-10 w-10 place-items-center rounded-full bg-[#181614] text-white disabled:bg-[#EDE7DD] disabled:text-[#7E756A]"><Send className="h-4 w-4" /></button></form></main>;
}

export default function SatoPage() {
  const [active, setActive] = useState<TabId>('portrait');
  return <div style={{ background: colors.bg, color: colors.ink, fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }} className="min-h-screen"><style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@400;500;600&display=swap'); .font-serif{font-family:'Cormorant Garamond',serif}`}</style><Header active={active} setActive={setActive} />{active === 'portrait' ? <PortraitPage /> : active === 'foods' ? <FoodsPage /> : active === 'discover' ? <DiscoverPage /> : <SatoChatPage />}</div>;
}
