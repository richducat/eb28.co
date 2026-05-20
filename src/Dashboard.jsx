import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Filter,
  Lock,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
} from 'lucide-react';

const FALLBACK_LANES = [
  'Today / Firefighting',
  'Waiting on Richard',
  'Admin / Ops',
  'Life / Personal',
  'Backlog',
  'Done',
];

const LANE_META = {
  'Today / Firefighting': {
    icon: AlertTriangle,
    color: 'from-red-500 to-orange-400',
    accent: 'text-red-200',
    ring: 'ring-red-400/30',
    copy: 'Items I should actively protect, prep, or push today.',
  },
  'Waiting on Richard': {
    icon: UserRoundCheck,
    color: 'from-amber-400 to-yellow-300',
    accent: 'text-amber-100',
    ring: 'ring-amber-300/30',
    copy: 'Decisions, approvals, money, or client-facing sends that need you.',
  },
  'Admin / Ops': {
    icon: Bot,
    color: 'from-cyan-400 to-blue-400',
    accent: 'text-cyan-100',
    ring: 'ring-cyan-300/30',
    copy: 'Back-office cleanup, account hygiene, routing, and recurring systems.',
  },
  'Life / Personal': {
    icon: CalendarClock,
    color: 'from-fuchsia-400 to-violet-400',
    accent: 'text-fuchsia-100',
    ring: 'ring-fuchsia-300/30',
    copy: 'Family, school, bills, logistics, and personal admin loops.',
  },
  Backlog: {
    icon: Clock3,
    color: 'from-slate-400 to-slate-300',
    accent: 'text-slate-200',
    ring: 'ring-slate-300/20',
    copy: 'Important but not the thing to let hijack today.',
  },
  Done: {
    icon: CheckCircle2,
    color: 'from-emerald-400 to-green-300',
    accent: 'text-emerald-100',
    ring: 'ring-emerald-300/30',
    copy: 'Recently closed loops kept visible for confidence and audit trail.',
  },
};

const AREA_STYLES = {
  UGCMA: 'border-orange-300/30 bg-orange-400/10 text-orange-100',
  TYFYS: 'border-blue-300/30 bg-blue-400/10 text-blue-100',
  Personal: 'border-fuchsia-300/30 bg-fuchsia-400/10 text-fuchsia-100',
  Admin: 'border-cyan-300/30 bg-cyan-400/10 text-cyan-100',
  Ops: 'border-slate-300/30 bg-slate-400/10 text-slate-100',
};

function formatGeneratedAt(value) {
  if (!value) return 'not synced yet';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function normalizeSearch(text) {
  return String(text || '').toLowerCase();
}

export default function Dashboard() {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('all');

  async function loadBoard() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/data/assistant-kanban.json?ts=${Date.now()}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
      setPayload(data);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load assistant board');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBoard();
    const interval = setInterval(loadBoard, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const items = payload?.items || [];
  const lanes = payload?.lanes?.length ? payload.lanes : FALLBACK_LANES;
  const areas = useMemo(() => ['all', ...Array.from(new Set(items.map((item) => item.area).filter(Boolean))).sort()], [items]);
  const filteredItems = useMemo(() => {
    const q = normalizeSearch(query);
    return items.filter((item) => {
      const areaMatch = area === 'all' || item.area === area;
      if (!areaMatch) return false;
      if (!q) return true;
      return [item.title, item.next, item.area, item.sourceSection, item.lane].some((value) => normalizeSearch(value).includes(q));
    });
  }, [items, query, area]);

  const grouped = useMemo(() => {
    return lanes.reduce((acc, lane) => {
      acc[lane] = filteredItems.filter((item) => item.lane === lane);
      return acc;
    }, {});
  }, [lanes, filteredItems]);

  const totalOpen = items.filter((item) => !item.done).length;
  const needsRichard = items.filter((item) => item.lane === 'Waiting on Richard').length;
  const fireCount = items.filter((item) => item.lane === 'Today / Firefighting').length;
  const doneCount = items.filter((item) => item.done).length;
  const hermesOwned = items.filter((item) => !item.done && item.owner !== 'Richard decision').slice(0, 8);
  const waitingOnRichard = items.filter((item) => !item.done && item.owner === 'Richard decision').slice(0, 6);

  return (
    <div className="min-h-screen overflow-hidden bg-[#060810] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-80">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,.22),transparent_32%),radial-gradient(circle_at_75%_15%,rgba(251,146,60,.18),transparent_28%),linear-gradient(135deg,#060810,#0f172a_45%,#111827)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.045)_1px,transparent_1px)] bg-[size:46px_46px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
      </div>

      <main className="relative mx-auto flex w-full max-w-[1800px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl">
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100/80">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1">
                  <Sparkles size={14} /> Richard OS
                </span>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Daily Kanban</span>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">Assistant-managed</span>
              </div>
              <h1 className="text-4xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
                Hermes Command Board
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
                I own the execution. This dashboard should make it obvious what I am doing, what is waiting on you, when I expect to move it, and the exact unblock path when I hit a wall.
              </p>
            </div>
            <div className="grid gap-3 rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm text-emerald-50 sm:min-w-[340px]">
              <div className="flex items-center gap-2 font-semibold uppercase tracking-[0.18em] text-emerald-100">
                <ShieldCheck size={18} /> Safety Mode
              </div>
              <p className="text-emerald-50/80">
                I move at the fastest safe pace available. I only stop for approvals, credentials/access, money, live account changes, or client-facing sends.
              </p>
            </div>
          </div>

          <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="I own" value={Math.max(totalOpen - needsRichard, 0)} tone="cyan" />
            <Metric label="Moving today" value={fireCount} tone="red" />
            <Metric label="Needs you" value={needsRichard} tone="amber" />
            <Metric label="Recently done" value={doneCount} tone="emerald" />
          </section>
        </header>

        <section className="grid gap-4 xl:grid-cols-[1.4fr_.9fr]">
          <FocusPanel
            title="I am doing the work"
            subtitle="Assistant-owned items. Default assumption: I keep moving these without waiting on you."
            items={hermesOwned}
            empty="No assistant-owned work loaded yet."
          />
          <FocusPanel
            title="I need Richard"
            subtitle="Only the items where your approval, account access, or a human decision is the blocker."
            items={waitingOnRichard}
            empty="Nothing is waiting on you right now."
            compact
          />
        </section>

        <section className="flex flex-col gap-3 rounded-[1.5rem] border border-white/10 bg-black/25 p-4 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-1 text-sm text-slate-300">
            <div className="font-semibold text-white">Last synced: {formatGeneratedAt(payload?.generatedAt)}</div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Lock size={13} /> Source: {payload?.source || 'OPEN_LOOPS.md'} · {payload?.privacy || 'public-safe summary'}
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative block min-w-[260px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search loops..."
                className="w-full rounded-2xl border border-white/10 bg-white/10 py-3 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-300/50"
              />
            </label>
            <label className="relative block">
              <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <select
                value={area}
                onChange={(event) => setArea(event.target.value)}
                className="min-w-[180px] appearance-none rounded-2xl border border-white/10 bg-slate-950 py-3 pl-9 pr-8 text-sm text-white outline-none focus:border-cyan-300/50"
              >
                {areas.map((name) => <option key={name} value={name}>{name === 'all' ? 'All areas' : name}</option>)}
              </select>
            </label>
            <button
              type="button"
              onClick={loadBoard}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
            Board load warning: {error}
          </div>
        )}

        <section className="flex gap-4 overflow-x-auto pb-3" aria-label="Full detailed board">
          {lanes.map((lane) => (
            <div key={lane} className="w-[330px] shrink-0 2xl:w-[360px]">
              <Lane lane={lane} items={grouped[lane] || []} />
            </div>
          ))}
        </section>

        <footer className="flex flex-col gap-2 pb-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>Dashboard target: eb28.co/dash</span>
          <a className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-100" href="https://eb28.co/dash/" target="_blank" rel="noreferrer">
            Open live board <ExternalLink size={13} />
          </a>
        </footer>
      </main>
    </div>
  );
}

function FocusPanel({ title, subtitle, items, empty, compact = false }) {
  return (
    <section className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-4 shadow-xl shadow-black/20 backdrop-blur-xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black tracking-tight text-white">{title}</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-400">{subtitle}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-bold text-slate-200">{items.length}</span>
      </div>
      <div className={compact ? 'grid gap-2' : 'grid gap-3 lg:grid-cols-2'}>
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-500">{empty}</div>
        ) : items.map((item) => <WorkRow key={item.id} item={item} compact={compact} />)}
      </div>
    </section>
  );
}

function WorkRow({ item, compact }) {
  const areaStyle = AREA_STYLES[item.area] || AREA_STYLES.Ops;
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/65 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] ${areaStyle}`}>{item.area || 'Ops'}</span>
        <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-100">{item.owner || 'Hermes owns'}</span>
        <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-200">{item.status || 'Queued'}</span>
      </div>
      <h3 className="mt-2 text-sm font-bold leading-snug text-white">{item.title}</h3>
      <div className="mt-3 grid gap-2 text-xs leading-5 text-slate-300">
        <div><span className="font-bold text-slate-100">When:</span> {item.eta || 'Queued by priority'}</div>
        <div><span className="font-bold text-slate-100">Next:</span> {item.next || 'I will define the next concrete step from the source loop.'}</div>
        {!compact && item.blocker && <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-2 text-amber-100"><span className="font-bold">Blocker:</span> {item.blocker}</div>}
        {item.unblock && <div className="text-slate-400"><span className="font-bold text-slate-300">Unblock path:</span> {item.unblock}</div>}
      </div>
    </article>
  );
}

function Metric({ label, value, tone }) {
  const tones = {
    cyan: 'from-cyan-400/20 to-blue-400/10 text-cyan-100 border-cyan-300/20',
    red: 'from-red-400/20 to-orange-400/10 text-red-100 border-red-300/20',
    amber: 'from-amber-400/20 to-yellow-400/10 text-amber-100 border-amber-300/20',
    emerald: 'from-emerald-400/20 to-green-400/10 text-emerald-100 border-emerald-300/20',
  };
  return (
    <div className={`rounded-3xl border bg-gradient-to-br p-4 ${tones[tone]}`}>
      <div className="text-3xl font-black">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] opacity-80">{label}</div>
    </div>
  );
}

function Lane({ lane, items }) {
  const meta = LANE_META[lane] || LANE_META.Backlog;
  const Icon = meta.icon;
  return (
    <div className={`min-h-[360px] rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-3 backdrop-blur-xl ring-1 ${meta.ring}`}>
      <div className="mb-3 rounded-2xl border border-white/10 bg-black/25 p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className={`grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br ${meta.color} text-slate-950`}>
                <Icon size={17} />
              </span>
              <h2 className="text-sm font-black uppercase tracking-[0.12em] text-white">{lane}</h2>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">{meta.copy}</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-xs font-bold text-white">{items.length}</span>
        </div>
      </div>
      <div className="flex max-h-[68vh] flex-col gap-3 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-4 text-center text-xs text-slate-500">Nothing in this lane.</div>
        ) : items.map((item) => <Card key={item.id} item={item} />)}
      </div>
    </div>
  );
}

function Card({ item }) {
  const areaStyle = AREA_STYLES[item.area] || AREA_STYLES.Ops;
  return (
    <article className="group rounded-2xl border border-white/10 bg-slate-950/70 p-3 shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:border-cyan-200/30 hover:bg-slate-900/90">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] ${areaStyle}`}>{item.area || 'Ops'}</span>
        <span className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{item.id}</span>
      </div>
      <h3 className="text-sm font-bold leading-snug text-white">{item.title}</h3>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em]">
        <span className="rounded-full bg-cyan-300/10 px-2 py-0.5 text-cyan-100">{item.owner || 'Hermes owns'}</span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-slate-200">{item.eta || 'Queued'}</span>
      </div>
      {item.next && <p className="mt-2 text-xs leading-5 text-slate-400">{item.next}</p>}
      {item.blocker && <p className="mt-2 rounded-xl border border-amber-300/20 bg-amber-300/10 p-2 text-xs leading-5 text-amber-100"><span className="font-bold">Blocker:</span> {item.blocker}</p>}
      <div className="mt-3 border-t border-white/10 pt-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">{item.sourceSection}</div>
    </article>
  );
}
