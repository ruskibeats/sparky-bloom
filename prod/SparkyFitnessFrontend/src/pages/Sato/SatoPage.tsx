import {
  Activity,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Brain,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  Dumbbell,
  FileText,
  Flame,
  FlaskConical,
  Goal,
  HeartPulse,
  History,
  Leaf,
  Map,
  Moon,
  Network,
  RefreshCcw,
  Salad,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Timer,
  TrendingUp,
  Utensils,
  Zap,
} from 'lucide-react';

type Icon = typeof Activity;

const meals = [
  ['Jun 13', '1,490', '174.0g', '82.0g', '51.0g', '25.0g'],
  ['Jun 12', '1,520', '154.0g', '94.0g', '58.0g', '14.0g'],
  ['Jun 11', '1,370', '172.0g', '68.0g', '50.0g', '23.0g'],
  ['Jun 10', '1,370', '180.0g', '68.0g', '44.0g', '19.0g'],
  ['Jun 9', '1,380', '166.0g', '68.0g', '49.0g', '26.0g'],
  ['Jun 8', '1,610', '156.0g', '100.0g', '64.0g', '24.0g'],
  ['Jun 7', '1,520', '144.0g', '100.0g', '60.0g', '19.0g'],
];

const responses = [
  ['Chicken soba noodle bowl', '+48 mg/dL'],
  ['Black bean enchiladas', '+13 mg/dL'],
  ['Veggie frittata with fruit', '+35 mg/dL'],
  ['Smoked salmon bagel', '+35 mg/dL'],
  ['Beef lettuce tacos', '+49 mg/dL'],
  ['Chicken tikka masala', '+3 mg/dL'],
  ['Cod fish tacos', '+22 mg/dL'],
  ['Chickpea cucumber feta salad', '+39 mg/dL'],
  ['Peanut butter banana toast', '+14 mg/dL'],
  ['Tofu veggie scramble', '+8 mg/dL'],
  ['Vegetable pasta primavera', '+3 mg/dL'],
  ['Shrimp noodle salad', '+61 mg/dL'],
];

const cards = [
  { type: 'Circadian rhythm', template: 'Time-of-day', title: '1pm lunch spikes 3.9×', body: 'Your 1pm lunch meals averaged 53 mg/dL — 3.9× your 7pm dinner meals (14 mg/dL). Your body handles starch most aggressively at midday. Consider shifting high-carb plates to breakfast and keeping lunch lighter.', conf: '90%', evidence: 42, icon: Sun, pattern: 'circadian rhythm' },
  { type: 'Outlier spotlight', template: 'Anomaly', title: 'Chicken Caesar salad — 4.3× predicted', body: 'At only 22g carbs it produced 51 mg/dL — 4.3× the 12 mg/dL a typical 22g-carb meal produces for you. The food graph shows high protein and fat can stretch gastric emptying and trigger a delayed glucose window.', conf: '90%', evidence: 42, icon: Zap, pattern: 'outlier spotlight' },
  { type: 'Protein cliff', template: 'Nutrient split', title: 'The protein cliff — 64 mg/dL drop', body: 'Two meals with almost identical carbs behave very differently depending on protein. Black bean tacos produced 67 mg/dL; Chicken tikka masala produced 3 mg/dL.', conf: '90%', evidence: 2, icon: Flame, pattern: 'protein cliff' },
  { type: 'Meal timing', template: 'Timing alert', title: 'No meals logged recently', body: "You haven't recorded a meal in the last 5 hours. Regular meal logging helps identify patterns in glucose response.", conf: '95%', evidence: 0, icon: Clock, pattern: 'meal timing' },
  { type: 'TTP club', template: 'Timing cluster', title: 'The 17-meal slow-burner club', body: '17 of your meals are slow burners — they peak at 3+ hours with deltas ranging from 3 to 67 mg/dL. Fast peakers hit peak in under an hour.', conf: '89%', evidence: 23, icon: Timer, pattern: 'ttp club' },
  { type: 'Food reason', template: 'Graph bridge', title: 'Black bean tacos nutrient cluster — 67 mg/dL predicted', body: 'SATO proved 2 meals share a metabolic fingerprint with 100% precision. Consider a 20‑minute walk and extra water after meals in this cluster.', conf: '81%', evidence: 2, icon: Network, pattern: 'Black bean tacos' },
  { type: 'Pattern insight', template: 'Pattern evidence', title: 'Exercise Buffered meal pattern', body: '18 repeated meal fingerprints matched this pattern. Open the evidence to review meals, CGM-linked fingerprints, and provenance.', conf: '55%', evidence: 18, icon: Brain, pattern: 'exercise buffered' },
];

function n(value: string | number) {
  return String(value);
}

function DashboardCard({ title, value, subtitle, icon: Icon, accent = 'from-orange-50 to-amber-50' }: { title: string; value: string; subtitle: string; icon: Icon; accent?: string }) {
  return <div className={`rounded-2xl border border-border bg-gradient-to-br ${accent} p-4 shadow-sm`}><div className="flex items-center justify-between gap-3"><div className="rounded-xl bg-background/80 p-2 shadow-sm"><Icon className="h-5 w-5 text-orange-600" /></div><span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{title}</span></div><div className="mt-4 text-2xl font-semibold text-foreground">{value}</div><div className="mt-1 text-sm text-muted-foreground">{subtitle}</div></div>;
}

function Section({ title, eyebrow, icon: Icon, children }: { title: string; eyebrow?: string; icon: Icon; children: React.ReactNode }) {
  return <section className="rounded-3xl border border-border bg-card p-5 shadow-sm"><div className="mb-4"><p className="text-xs uppercase tracking-[0.22em] text-orange-600">{eyebrow}</p><h2 className="mt-1 flex items-center gap-2 text-lg font-semibold text-foreground"><Icon className="h-5 w-5 text-orange-600" />{title}</h2></div>{children}</section>;
}

function IntelligenceCard({ card, index }: { card: (typeof cards)[number]; index: number }) {
  const Icon = card.icon;
  return <article style={{ animationDelay: `${index * 60}ms` }} className="relative overflow-hidden rounded-[2rem] border border-stone-200 bg-white/90 p-5 shadow-[0_18px_45px_rgba(71,85,105,0.10)]"><div className="absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-gradient-to-br from-white/70 to-[#f5eadf]" /><div className="relative flex items-start justify-between gap-4"><div className="rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 p-3 shadow-sm"><Icon className="h-5 w-5 text-stone-700" /></div><div className="text-right"><p className="text-[10px] font-medium uppercase tracking-[0.22em] text-stone-500">{card.type}</p><p className="mt-1 rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-stone-600">{card.template}</p></div></div><h3 className="relative mt-5 text-xl font-semibold tracking-[-0.03em] text-stone-950">{card.title}</h3><p className="relative mt-4 text-sm leading-7 text-stone-700">{card.body}</p><div className="relative mt-5 flex flex-wrap gap-2"><span className="rounded-full bg-[#f7efe6] px-3 py-1 text-xs font-medium text-stone-700">{card.conf} confidence</span><span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">{card.evidence} evidence</span><span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">High</span></div><div className="relative mt-4 flex flex-wrap gap-2"><span className="rounded-full bg-white/80 px-3 py-1 text-xs text-stone-600 ring-1 ring-stone-200">{card.pattern}</span></div><div className="relative mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 pt-4 text-xs text-stone-500"><span className="rounded-md bg-stone-50 px-2 py-1">sql</span><div className="flex gap-2"><button className="rounded-full bg-stone-100 px-3 py-2 text-xs font-medium text-stone-700">Dismiss</button><button className="rounded-full bg-stone-950 px-3 py-2 text-xs font-medium text-white">View evidence</button></div></div></article>;
}

function MiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  return <div><div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>{label}</span><span>{value} mg/dL</span></div><div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full" style={{ width: `${Math.min(100, value * 1.6)}%`, background: color }} /></div></div>;
}

export default function SatoPage() {
  return <div className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8" style={{ fontFamily: 'Geist, Satoshi, ui-sans-serif, system-ui, sans-serif' }}><div className="mx-auto max-w-7xl space-y-6"><div className="rounded-[2rem] border border-orange-200 bg-gradient-to-br from-orange-50 via-amber-50 to-background p-6 shadow-sm"><div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div className="max-w-3xl"><div className="inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-orange-700 ring-1 ring-orange-200"><Sparkles className="h-3.5 w-3.5" />Sato · Russell Batchelor simulation · PostgreSQL-backed</div><h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Sato Food Memory</h1><p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">Your veggie frittata with fruit, chicken soba noodle bowl, black bean enchiladas feel... a surprising outcome. Not quite what you might expect from your pattern.</p></div><div className="flex flex-col gap-3 rounded-2xl bg-background/80 p-4 ring-1 ring-border"><div className="inline-flex items-center justify-center rounded-xl bg-amber-100 px-4 py-2 font-semibold text-amber-800 ring-1 ring-amber-200">Surprised</div><button className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"><RefreshCcw className="h-4 w-4" />Refresh database view</button></div></div></div>

<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><DashboardCard title="Diary" value="1,490 kcal" subtitle="Jun 13 · 174g carbs" icon={Utensils} /><DashboardCard title="Check-In" value="No check-in" subtitle="Weight, steps, body metrics" icon={HeartPulse} accent="from-emerald-50 to-teal-50" /><DashboardCard title="Reports" value="1,459 avg kcal" subtitle="8 nutrition days · 176.0g fiber total" icon={BarChart3} accent="from-blue-50 to-cyan-50" /><DashboardCard title="Graph" value="462 / 84" subtitle="vertices / edges · AGE online" icon={Database} accent="from-violet-50 to-fuchsia-50" /></div>

<div className="grid gap-4 sm:grid-cols-3"><DashboardCard title="Daily Glucose Stability" value="50% TIR" subtitle="Time in range: 70–180 mg/dL · 14 fingerprints" icon={HeartPulse} /><DashboardCard title="Daily Walk Activity" value="0 steps" subtitle="Running · 49m · 448 kcal" icon={Activity} accent="from-sky-50 to-blue-50" /><DashboardCard title="Sleep Duration & Quality" value="8.7h 41m" subtitle="Quality: 0% · 1 night tracked" icon={Moon} accent="from-indigo-50 to-violet-50" /></div>

<Section title="Glucose Response & Nutrition Charts" eyebrow="Charts" icon={BarChart3}><div className="grid gap-6 lg:grid-cols-2"><div className="rounded-2xl border border-border bg-background p-4 lg:col-span-2"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-foreground">CGM Timeline + Meals</h3><div className="flex gap-1.5">{['24h','48h','7d','14d'].map((x) => <button key={x} className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-medium text-stone-600">{x}</button>)}<span className="ml-1 self-center text-[10px] uppercase tracking-[0.12em] text-muted-foreground">94 pts</span></div></div><svg viewBox="0 0 760 180" className="h-56 w-full"><rect x="0" y="50" width="760" height="70" fill="#ecfdf5" rx="8" /><path d="M0 110 C 80 70, 130 90, 190 52 S 310 128, 380 88 S 520 42, 610 86 S 710 128, 760 72" fill="none" stroke="#6366f1" strokeWidth="3" /><line x1="0" y1="120" x2="760" y2="120" stroke="#ef4444" strokeDasharray="4 4" /><line x1="0" y1="50" x2="760" y2="50" stroke="#f97316" strokeDasharray="4 4" /></svg></div><div className="rounded-2xl border border-border bg-background p-4"><h3 className="text-sm font-semibold">Meal Glucose Response Δ</h3><p className="text-xs text-muted-foreground">14 fingerprints</p><div className="mt-4 space-y-3">{responses.map(([label, value]) => <div key={label} className="flex items-center justify-between gap-4 text-sm"><span>{label}</span><span className="font-semibold text-orange-700">{value}</span></div>)}</div></div><div className="rounded-2xl border border-border bg-background p-4"><h3 className="text-sm font-semibold">Daily Nutrition (last 7 days)</h3><p className="text-xs text-muted-foreground">8 days</p><div className="mt-4 space-y-4">{meals.slice(0, 7).map((m) => <div key={m[0]}><div className="mb-1 flex justify-between text-sm"><span>{m[0]}</span><span>{Number(m[2].replace('g','')) + Number(m[3].replace('g','')) + Number(m[4].replace('g',''))}g · {m[1]} kcal</span></div><div className="flex gap-1 text-xs"><span>🍝 {m[2]}</span><span>🥩 {m[3]}</span><span>🧈 {m[4]}</span></div></div>)}</div></div><div className="rounded-2xl border border-border bg-background p-4"><h3 className="text-sm font-semibold">Time-of-Day Glucose Response</h3><p className="text-xs text-muted-foreground">by meal type</p><div className="mt-4 space-y-4"><MiniBar label="lunch · ~168min · 5x" value={48} color="#f97316" /><MiniBar label="breakfast · ~135min · 5x" value={23} color="#60a5fa" /><MiniBar label="dinner · ~143min · 4x" value={10} color="#22c55e" /></div></div><div className="rounded-2xl border border-border bg-background p-4"><h3 className="text-sm font-semibold">Protein & Fat Scatter</h3><p className="text-xs text-muted-foreground">each dot = 1 meal fingerprint</p><svg viewBox="0 0 360 200" className="mt-3 h-52 w-full">{responses.map((_, i) => <circle key={i} cx={30 + (i * 27) % 300} cy={40 + (i * 41) % 130} r={5 + (i % 4)} fill="#f97316" opacity="0.7" />)}<text x="8" y="20" fontSize="10" fill="#888">Δ (mg/dL)</text><text x="260" y="190" fontSize="10" fill="#888">Protein (g)</text></svg></div><div className="rounded-2xl border border-border bg-background p-4"><p className="text-xs uppercase tracking-[0.2em] text-orange-600">Experimental</p><h3 className="mt-1 text-sm font-semibold">Metabolic Bloom Chart</h3><p className="text-sm text-muted-foreground">Expressive field view of meals, carb load, and glucose response.</p><div className="mt-5 grid place-items-center"><div className="h-44 w-44 rounded-full bg-gradient-to-br from-orange-200 via-amber-100 to-sky-100 blur-[1px]" /></div></div></div></Section>

<Section title="Diary and meal memory" eyebrow="Diary" icon={Utensils}><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{meals.map((m) => <div key={m[0]} className="rounded-2xl border border-border bg-background p-4"><div className="mb-3 flex justify-between"><strong>{m[0]}</strong><span className="text-xs text-muted-foreground">daily nutrition</span></div><div className="grid grid-cols-2 gap-2 text-sm"><span>Calories</span><b>{m[1]} kcal</b><span>Carbs</span><b>{m[2]}</b><span>Protein</span><b>{m[3]}</b><span>Fat</span><b>{m[4]}</b><span>Fiber</span><b>{m[5]}</b></div></div>)}</div></Section>

<Section title="Sato companion" eyebrow="Sato" icon={Sparkles}><div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="flex flex-wrap items-center gap-2 text-sm"><span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">parsedFoods</span><span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">amber</span><span className="rounded-full bg-stone-100 px-3 py-1 text-stone-700">Real-data feed</span></div><h3 className="mt-4 text-xl font-semibold">Calm Sato intelligence cards</h3></div><div className="grid gap-5 lg:grid-cols-2">{cards.map((card, i) => <IntelligenceCard key={card.title} card={card} index={i} />)}</div></Section>

<Section title="Showcase Runner" eyebrow="Pipeline" icon={FlaskConical}><div className="rounded-2xl border border-border bg-background p-4"><p className="text-sm text-muted-foreground">Meal text → 7-card pipeline</p><div className="mt-3 flex gap-2"><input className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2" defaultValue="pizza and salad for dinner" /><button className="rounded-xl bg-stone-950 px-4 py-2 text-sm font-medium text-white">Run Showcase</button></div><p className="mt-3 text-sm text-muted-foreground">Backed by Russell Batchelor's real food entries, fingerprints, and CGM data.</p></div></Section>

<Section title="Foods and graph evidence" eyebrow="Foods" icon={Salad}><div className="grid gap-6 lg:grid-cols-2"><div className="rounded-2xl border border-border bg-background p-4"><h3 className="font-semibold">Ask Sato patterns</h3><div className="mt-3 flex flex-wrap gap-2">{['Freeform','Why do I react?','Exercise + meal','Predict today'].map((x) => <span key={x} className="rounded-full bg-stone-100 px-3 py-1 text-xs">{x}</span>)}</div><textarea className="mt-3 min-h-20 w-full rounded-xl border border-border bg-background p-3 text-sm" defaultValue="T1D educational meal-impact context for Russell Batchelor simulation. Surface personal diary patterns first, then general food graph evidence." /><input className="mt-3 w-full rounded-xl border border-border bg-background p-3" defaultValue="Chicken Caesar salad" /><div className="mt-3 flex gap-2"><button className="rounded-xl bg-stone-950 px-4 py-2 text-sm text-white">Ask Sato</button><button className="rounded-xl border border-border px-4 py-2 text-sm">Query graph</button></div></div><div className="rounded-2xl border border-border bg-background p-4"><h3 className="font-semibold">Chicken Caesar salad</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Typical serving: 470 kcal, 22.0g carbs, 38.0g protein, 24.0g fat, 5.0g fiber. Lunch: avg Δ 51 mg/dL at ~120 min.</p><div className="mt-4 space-y-2 text-sm"><p>per_serving_nutrition · medium confidence</p><p>lunch on 2026-06-07 · produced_response · 51 mg/dL</p><p>Uncertainty: <b>High</b> · Conflicts: <b>1</b></p></div></div></div></Section>

<Section title="Context-aware food prediction" eyebrow="Intelligence" icon={Brain}><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{['Glucose domino effect','Alternative food recommendations','Confusion matrix UI','Time-travel glucose simulator','Personalized recipe generator','Social proof and peer baseline','Insurance documentation assistant','Premium and clinic API preview','Weekly challenge + gamification'].map((title, i) => <div key={title} className="rounded-2xl border border-border bg-background p-4"><p className="text-xs uppercase tracking-[0.18em] text-orange-600">{i < 2 ? 'Week 2-3' : i < 6 ? 'Week 4-6' : 'Week 7-8'}</p><h3 className="mt-1 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Prototype card with Russell's diary, graph memory, CGM fingerprints, educational safety notes, and export-ready context.</p></div>)}</div></Section>

<div className="grid gap-6 lg:grid-cols-2"><Section title="Exercises and movement" eyebrow="Exercises" icon={Dumbbell}><div className="grid gap-3 sm:grid-cols-2"><DashboardCard title="Calories burned" value="5,980 kcal" subtitle="Recent activity" icon={Flame} /><DashboardCard title="Duration" value="759 min" subtitle="Running, Judo, Weight Training" icon={Clock} /></div><div className="mt-4 space-y-2 text-sm">{['Running · Jun 13 · 49 min · 448','Judo · Jun 13 · 65 min · 757','Weight Training · Jun 12 · 57 min · 251','Randori · Jun 12 · 51 min · 442'].map((x) => <p key={x} className="rounded-xl bg-background p-3 ring-1 ring-border">{x}</p>)}</div></Section><Section title="Settings, Admin, safety, and API surface" eyebrow="Settings · Admin" icon={Settings}><div className="space-y-4"><div className="rounded-2xl border border-border bg-background p-4"><h3 className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 text-orange-600" />Safety boundary</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Food data and nutrition information are for educational purposes only. This content is not medical advice.</p></div><div className="rounded-2xl border border-border bg-background p-4"><h3 className="font-semibold">Admin/API</h3><p className="mt-2 text-sm text-muted-foreground">4 backend actions exposed for graph sync, recipe parsing, and companion card generation.</p><div className="mt-3 flex gap-2"><button className="rounded-xl border border-border px-3 py-2 text-sm">Seed graph</button><button className="rounded-xl border border-border px-3 py-2 text-sm">Sync AGE</button></div></div></div></Section></div>

<div className="grid gap-6 lg:grid-cols-3"><Section title="Check-In" eyebrow="Body" icon={HeartPulse}><p className="text-sm text-muted-foreground">No current check-in record found.</p></Section><Section title="Goals" eyebrow="Goals" icon={Goal}><p className="text-sm text-muted-foreground">No goal presets returned.</p></Section><Section title="Sleep and recovery" eyebrow="Reports" icon={Moon}><p className="text-sm">Sleep need <b>8.7h</b></p><p className="text-sm text-muted-foreground">Recent sleep rows: 1</p></Section></div>

</div></div>;
}
