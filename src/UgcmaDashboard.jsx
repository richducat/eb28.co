import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  ShieldAlert,
  Rocket,
  MessageSquareText,
  FileText,
  ClipboardList,
  BriefcaseBusiness,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Download,
  FilterX,
  Gauge,
  MousePointerClick,
  UserCheck,
  Users,
} from 'lucide-react';

const rangeLabel = 'Live UGCMA watch feed';
const previousRangeLabel = 'Apr 19 - May 18, 2025';

const filterOptions = [
  { id: 'funnel', label: 'Funnel', defaultValue: 'All Funnels', options: ['All Funnels', 'Webinar Path', 'Direct Quiz Path'] },
  { id: 'campaign', label: 'AI Campaign', defaultValue: 'All Campaigns', options: ['All Campaigns', 'AI Text Funnels', 'Launch Retargeting', 'High Intent Search'] },
  { id: 'partner', label: 'Affiliate Partner', defaultValue: 'All Partners', options: ['All Partners', 'Growth Operators', 'Creator Studio', 'Partner Network'] },
  { id: 'source', label: 'Lead Source', defaultValue: 'All Sources', options: ['All Sources', 'Facebook / Instagram Ads', 'YouTube Ads', 'Organic Search'] },
  { id: 'unit', label: 'Business Unit', defaultValue: 'All Units', options: ['All Units', 'UGC Studio', 'Agency', 'Coaching'] },
];

const kpis = [
  {
    label: 'Page Visits',
    value: '48,732',
    delta: '+18.7%',
    note: `vs ${previousRangeLabel}`,
    tone: 'cyan',
    icon: MousePointerClick,
    positive: true,
  },
  {
    label: 'Quiz Completions',
    value: '12,642',
    delta: '+16.2%',
    note: `vs ${previousRangeLabel}`,
    tone: 'blue',
    icon: CheckCircle2,
    positive: true,
  },
  {
    label: 'Bookings (Set)',
    value: '3,102',
    delta: '+14.5%',
    note: `vs ${previousRangeLabel}`,
    tone: 'violet',
    icon: CalendarDays,
    positive: true,
  },
  {
    label: 'No-Shows',
    value: '742',
    delta: '+9.6%',
    note: `vs ${previousRangeLabel}`,
    tone: 'rose',
    icon: Users,
    positive: false,
  },
  {
    label: 'Sales (Won)',
    value: '1,248',
    delta: '+20.3%',
    note: `vs ${previousRangeLabel}`,
    tone: 'emerald',
    icon: CircleDollarSign,
    positive: true,
  },
  {
    label: 'Booking to Sale Rate',
    value: '40.2%',
    delta: '+5.1pp',
    note: `vs ${previousRangeLabel}`,
    tone: 'sky',
    icon: Gauge,
    positive: true,
  },
  {
    label: 'No-Show Rate',
    value: '23.9%',
    delta: '+2.3pp',
    note: `vs ${previousRangeLabel}`,
    tone: 'teal',
    icon: UserCheck,
    positive: false,
  },
];

const funnels = [
  {
    title: 'Funnel 1: Webinar Path',
    path: 'Ads -> Page -> Quiz -> Booking -> Sale',
    steps: [
      { label: 'Ads', value: '102,134', delta: '+15.4%' },
      { label: 'Page Visits', value: '28,732', delta: '+18.1%' },
      { label: 'Quiz Completes', value: '7,842', delta: '+16.3%' },
      { label: 'Bookings (Set)', value: '2,152', delta: '+14.8%' },
      { label: 'Sales (Won)', value: '892', delta: '+19.7%' },
    ],
    rates: [
      { value: '28.1%', label: 'Visit Rate' },
      { value: '27.3%', label: 'Quiz Completion Rate' },
      { value: '27.5%', label: 'Booking Rate' },
      { value: '41.4%', label: 'Booking to Sale Rate' },
    ],
  },
  {
    title: 'Funnel 2: Direct Quiz Path',
    path: 'Ads / Traffic -> Quiz -> Booking -> Sale',
    steps: [
      { label: 'Traffic', value: '46,231', delta: '+12.7%' },
      { label: 'Quiz Completes', value: '4,800', delta: '+13.9%' },
      { label: 'Bookings (Set)', value: '950', delta: '+11.2%' },
      { label: 'Sales (Won)', value: '356', delta: '+17.5%' },
    ],
    rates: [
      { value: '10.4%', label: 'Quiz Completion Rate' },
      { value: '19.8%', label: 'Booking Rate' },
      { value: '37.5%', label: 'Booking to Sale Rate' },
    ],
  },
];

const leadSources = [
  { label: 'AI Text Funnels', value: 3156, share: '25.0%', color: '#8b5cf6' },
  { label: 'Social Media DM Automation', value: 2487, share: '19.7%', color: '#22c55e' },
  { label: 'Facebook / Instagram Ads', value: 2102, share: '16.6%', color: '#38bdf8' },
  { label: 'YouTube Ads', value: 1352, share: '10.7%', color: '#f59e0b' },
  { label: 'Affiliate Traffic', value: 1248, share: '9.9%', color: '#ef4444' },
  { label: 'Organic Search', value: 786, share: '6.2%', color: '#06b6d4' },
  { label: 'Email Campaigns', value: 542, share: '4.3%', color: '#d946ef' },
  { label: 'Other / Direct', value: 969, share: '7.6%', color: '#94a3b8' },
];

const stagnantBuckets = [
  { label: '0 - 3 days', value: 1128, percent: 39.7 },
  { label: '4 - 7 days', value: 742, percent: 26.1 },
  { label: '8 - 14 days', value: 512, percent: 18.0 },
  { label: '15 - 30 days', value: 318, percent: 11.2 },
  { label: '30+ days', value: 142, percent: 5.0 },
];

const conversionRows = [
  { funnel: 'Webinar Path', noShow: '24.6%', noShowDelta: '+2.6pp', saleRate: '41.4%', saleDelta: '+4.8pp' },
  { funnel: 'Direct Quiz Path', noShow: '22.7%', noShowDelta: '+1.9pp', saleRate: '37.5%', saleDelta: '+5.6pp' },
];

const performanceRows = [
  { campaign: 'AI Text Funnels', source: 'Owned AI Chat', leads: '3,156', bookings: '842', sales: '331', roas: '5.8x', status: 'Scaling' },
  { campaign: 'Social DM Automation', source: 'Instagram DM', leads: '2,487', bookings: '614', sales: '249', roas: '4.9x', status: 'Healthy' },
  { campaign: 'Meta Conversion Ads', source: 'Facebook / Instagram', leads: '2,102', bookings: '503', sales: '216', roas: '4.2x', status: 'Watch no-show' },
  { campaign: 'Creator Affiliate Push', source: 'Partner Traffic', leads: '1,248', bookings: '306', sales: '129', roas: '3.7x', status: 'Optimize' },
];

const iconMap = {
  MousePointerClick,
  CheckCircle2,
  CalendarDays,
  Users,
  CircleDollarSign,
  Gauge,
  UserCheck,
  AlertTriangle,
};

const toneClasses = {
  cyan: 'text-cyan-300 bg-cyan-400/10 border-cyan-400/20',
  blue: 'text-blue-300 bg-blue-400/10 border-blue-400/20',
  violet: 'text-violet-300 bg-violet-400/10 border-violet-400/20',
  rose: 'text-rose-300 bg-rose-400/10 border-rose-400/20',
  emerald: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20',
  sky: 'text-sky-300 bg-sky-400/10 border-sky-400/20',
  teal: 'text-teal-300 bg-teal-400/10 border-teal-400/20',
};

function Panel({ children, className = '' }) {
  return (
    <section className={`rounded-xl border border-slate-700/70 bg-slate-800/78 shadow-[0_18px_55px_rgba(0,0,0,0.22)] ${className}`}>
      {children}
    </section>
  );
}

function SectionHeader({ title, status = 'Active', meta }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-700/70 px-5 py-3">
      <div>
        <h2 className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-300">{title}</h2>
        {meta ? <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{meta}</p> : null}
      </div>
      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black text-emerald-300">
        {status}
      </span>
    </div>
  );
}

function DashboardHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-700/70 bg-slate-900/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-4 md:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-blue-600 text-[13px] font-black tracking-tight text-white shadow-lg shadow-blue-950/30">
            AD
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-black tracking-tight text-white">
              UGCMA <span className="font-semibold text-slate-400">Command Center</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="hidden items-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-[11px] font-bold text-slate-300 hover:border-slate-600 md:inline-flex">
            <CalendarDays className="h-3.5 w-3.5" />
            {rangeLabel}
          </button>
          <button className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-[11px] font-bold text-slate-300 hover:border-slate-600">
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
          <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-700 text-[11px] font-black text-slate-200">
            RD
          </div>
        </div>
      </div>
    </header>
  );
}

function FiltersBar({ filters, setFilters }) {
  const clearFilters = () => {
    setFilters(Object.fromEntries(filterOptions.map((filter) => [filter.id, filter.defaultValue])));
  };

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
      {filterOptions.map((filter) => (
        <label key={filter.id} className="block">
          <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            {filter.label}
          </span>
          <span className="relative block">
            <select
              value={filters[filter.id]}
              onChange={(event) => setFilters((current) => ({ ...current, [filter.id]: event.target.value }))}
              className="h-9 w-full appearance-none rounded-lg border border-slate-700 bg-slate-800 px-3 pr-9 text-[11px] font-bold text-slate-300 outline-none transition hover:border-slate-600 focus:border-blue-400"
            >
              {filter.options.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          </span>
        </label>
      ))}
      <button
        type="button"
        onClick={clearFilters}
        className="mt-auto inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 text-[11px] font-black text-slate-400 transition hover:border-slate-600 hover:text-white"
      >
        <FilterX className="h-3.5 w-3.5" />
        Clear Filters
      </button>
    </div>
  );
}

function KpiCard({ item }) {
  const Icon = typeof item.icon === 'string' ? iconMap[item.icon] || Gauge : item.icon || Gauge;
  const DeltaIcon = item.positive ? ArrowUpRight : ArrowDownRight;

  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className={`rounded-md border p-1.5 ${toneClasses[item.tone]}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className={`inline-flex items-center gap-1 text-[10px] font-black ${item.positive ? 'text-emerald-300' : 'text-rose-300'}`}>
          <DeltaIcon className="h-3 w-3" />
          {item.delta}
        </span>
      </div>
      <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{item.label}</p>
      <div className="mt-1 font-mono text-3xl font-black tracking-tight text-white">{item.value}</div>
      <p className="mt-2 text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">{item.note}</p>
    </Panel>
  );
}

function KpiGrid({ items = kpis }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
      {items.map((item) => (
        <KpiCard key={item.label} item={item} />
      ))}
    </div>
  );
}

function FunnelCard({ funnel }) {
  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-700/70 px-5 py-3">
        <h2 className="text-sm font-black text-slate-100">{funnel.title}</h2>
        <span className="hidden text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 sm:block">{funnel.path}</span>
      </div>
      <div className="px-5 py-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {funnel.steps.map((step, index) => (
            <div key={step.label} className="relative">
              {index > 0 ? <div className="absolute -left-3 top-7 hidden h-px w-6 bg-slate-600 xl:block" /> : null}
              <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3">
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">{step.label}</p>
                <div className="mt-2 font-mono text-xl font-black text-white">{step.value}</div>
                <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-black text-rose-300">
                  <ArrowDownRight className="h-3 w-3" />
                  {step.delta}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className={`mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 ${funnel.rates.length === 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
          {funnel.rates.map((rate) => (
            <div key={rate.label} className="rounded-lg border border-slate-700 bg-slate-900/55 px-4 py-3 text-center">
              <div className="font-mono text-lg font-black text-white">{rate.value}</div>
              <div className="mt-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">{rate.label}</div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}

function DonutChart({ sources = leadSources, totalLeads = '12,642' }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
      <div className="relative mx-auto h-48 w-48 shrink-0">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 140 140" aria-hidden="true">
          <circle cx="70" cy="70" r={radius} fill="none" stroke="#0f172a" strokeWidth="19" />
          {sources.map((source) => {
            const length = (Number.parseFloat(source.share) / 100) * circumference;
            const circle = (
              <circle
                key={source.label}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={source.color}
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                strokeWidth="19"
              />
            );
            offset += length;
            return circle;
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-[11px] font-bold text-slate-500">Total Leads</div>
            <div className="font-mono text-3xl font-black text-white">{totalLeads}</div>
          </div>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {sources.map((source) => (
          <div key={source.label} className="grid grid-cols-[1fr_auto] items-center gap-3 text-[11px]">
            <div className="flex min-w-0 items-center gap-2 font-bold text-slate-300">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: source.color }} />
              <span className="truncate">{source.label}</span>
            </div>
            <div className="font-mono font-bold text-slate-400">
              {source.value.toLocaleString()} <span className="text-slate-500">({source.share})</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StagnantLeads({ buckets = stagnantBuckets, total = '2,842', delta = '+15.3%', note = 'vs last 30 days' }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <div className="font-mono text-4xl font-black text-white">{total}</div>
        <span className="text-[11px] font-black text-rose-300">{delta}</span>
        <span className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">{note}</span>
      </div>
      <div className="space-y-3">
        {buckets.map((bucket) => (
          <div key={bucket.label} className="grid grid-cols-[82px_1fr_88px] items-center gap-3 text-[11px]">
            <span className="font-bold text-slate-400">{bucket.label}</span>
            <div className="h-3 overflow-hidden rounded-full bg-slate-950/80">
              <div className="h-full rounded-full bg-blue-500" style={{ width: `${bucket.percent}%` }} />
            </div>
            <span className="text-right font-mono font-bold text-slate-400">
              {bucket.value} <span className="text-slate-500">({bucket.percent.toFixed(1)}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Sparkline({ color, values, id }) {
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 178 + 6;
      const max = Math.max(...values);
      const min = Math.min(...values);
      const y = 72 - ((value - min) / (max - min || 1)) * 56;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg className="h-24 w-full" viewBox="0 0 190 86" role="img" aria-labelledby={id}>
      <title id={id}>Trend line chart</title>
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`6,80 ${points} 184,80`} fill={`url(#${id}-fill)`} stroke="none" />
      <polyline points={points} fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
    </svg>
  );
}

function ConversionMetrics({ rows = conversionRows, noShow = { value: '23.9%', delta: '+2.3pp' }, bookingSale = { value: '40.2%', delta: '+5.1pp' } }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-500">No-Show Rate</p>
              <div className="mt-1 font-mono text-2xl font-black text-white">{noShow.value}</div>
            </div>
            <span className="text-[10px] font-black text-rose-300">{noShow.delta}</span>
          </div>
          <Sparkline id="no-show-rate" color="#fb3f5e" values={[18, 23, 21, 27, 25, 22, 17, 19, 23]} />
          <div className="flex justify-between text-[9px] font-black text-slate-600">
            <span>May 19</span>
            <span>Jun 2</span>
            <span>Jun 18</span>
          </div>
        </div>
        <div>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black text-slate-500">Booking to Sale Rate</p>
              <div className="mt-1 font-mono text-2xl font-black text-white">{bookingSale.value}</div>
            </div>
            <span className="text-[10px] font-black text-emerald-300">{bookingSale.delta}</span>
          </div>
          <Sparkline id="booking-sale-rate" color="#10b981" values={[31, 34, 39, 37, 42, 38, 41, 47, 43]} />
          <div className="flex justify-between text-[9px] font-black text-slate-600">
            <span>May 19</span>
            <span>Jun 2</span>
            <span>Jun 18</span>
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-700/70">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-slate-900/50 text-[10px] uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-4 py-3 font-black">Funnel</th>
              <th className="px-4 py-3 font-black">No-Show Rate</th>
              <th className="px-4 py-3 font-black">Booking to Sale Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/70 text-slate-300">
            {rows.map((row) => (
              <tr key={row.funnel}>
                <td className="px-4 py-3 font-bold">{row.funnel}</td>
                <td className="px-4 py-3 font-mono font-bold">
                  {row.noShow} <span className="ml-2 text-rose-300">{row.noShowDelta}</span>
                </td>
                <td className="px-4 py-3 font-mono font-bold">
                  {row.saleRate} <span className="ml-2 text-emerald-300">{row.saleDelta}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}



function StatusPill({ children, tone = 'slate' }) {
  const classes = {
    emerald: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    amber: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
    rose: 'border-rose-400/25 bg-rose-400/10 text-rose-300',
    blue: 'border-blue-400/25 bg-blue-400/10 text-blue-300',
    slate: 'border-slate-600 bg-slate-900/55 text-slate-300',
  };
  return <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${classes[tone] || classes.slate}`}>{children}</span>;
}

function MandatePanel({ mandate }) {
  if (!mandate) return null;
  return (
    <Panel className="overflow-hidden border-blue-400/20 bg-gradient-to-br from-blue-950/50 via-slate-900/80 to-emerald-950/30">
      <div className="grid gap-5 p-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <StatusPill tone="blue">{mandate.status || 'Opportunity mode'}</StatusPill>
            <StatusPill tone="emerald">Owner-facing command center</StatusPill>
            <StatusPill tone="amber">No dropped balls</StatusPill>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white md:text-3xl">{mandate.headline}</h2>
          <p className="mt-3 max-w-4xl text-sm font-semibold leading-6 text-slate-300">{mandate.objective}</p>
        </div>
        <div className="rounded-xl border border-slate-700/70 bg-slate-950/45 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Operating promise</p>
          <ul className="mt-3 space-y-2 text-xs font-bold leading-5 text-slate-300">
            <li>• BU1/Sydney and BU2/Nate stay separated.</li>
            <li>• Decisions show blocker + smallest unblock path.</li>
            <li>• Team back-and-forth gets converted into owned follow-through.</li>
            <li>• External messages stay approval-gated.</li>
          </ul>
          {mandate.updatedAt ? <p className="mt-4 text-[9px] font-black uppercase tracking-[0.18em] text-slate-600">Updated {mandate.updatedAt}</p> : null}
        </div>
      </div>
    </Panel>
  );
}

function DecisionQueuePanel({ items = [] }) {
  if (!items.length) return null;
  return (
    <Panel className="overflow-hidden">
      <SectionHeader title="Next Decisions" status="Owner-safe" meta="What Richard needs to know / decide next" />
      <div className="grid grid-cols-1 gap-3 p-5 xl:grid-cols-2">
        {items.map((item) => (
          <div key={`${item.title}-${item.lane}`} className="rounded-xl border border-slate-700/70 bg-slate-900/45 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-300">{item.lane}</p>
                <h3 className="mt-1 text-sm font-black text-white">{item.title}</h3>
              </div>
              <StatusPill tone={item.status?.toLowerCase().includes('needs') ? 'amber' : item.status?.toLowerCase().includes('verify') ? 'rose' : 'emerald'}>{item.status}</StatusPill>
            </div>
            <p className="mt-3 text-xs font-bold leading-5 text-slate-300">{item.decision}</p>
            {item.source ? <p className="mt-3 border-t border-slate-700/60 pt-3 text-[10px] font-semibold leading-4 text-slate-500">Source: {item.source}</p> : null}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function WorkstreamCards({ title, status, meta, items = [], type = 'content' }) {
  if (!items.length) return null;
  return (
    <Panel className="overflow-hidden">
      <SectionHeader title={title} status={status} meta={meta} />
      <div className="space-y-3 p-5">
        {items.map((item, index) => (
          <div key={`${title}-${index}`} className="rounded-xl border border-slate-700/65 bg-slate-900/45 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-black text-white">{item.title || item.task}</p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{item.owner || item.lane || 'Richard / Hermes'}</p>
              </div>
              <StatusPill tone={item.priority === 'High' || item.status?.toLowerCase().includes('needs') ? 'amber' : 'slate'}>{item.status || item.priority || 'Tracked'}</StatusPill>
            </div>
            <p className="mt-3 text-xs font-bold leading-5 text-slate-300">{item.next || item.unblock}</p>
            {item.source ? <p className="mt-3 text-[10px] font-semibold leading-4 text-slate-500">{item.source}</p> : null}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function SourceCoveragePanel({ items = [] }) {
  if (!items.length) return null;
  return (
    <Panel className="overflow-hidden">
      <SectionHeader title="Source Coverage" status="Truth map" meta="What each source is allowed to prove" />
      <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <div key={item.source} className="rounded-lg border border-slate-700/60 bg-slate-900/45 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{item.source}</p>
            <p className="mt-2 text-xs font-black text-white">{item.status}</p>
            <p className="mt-2 text-[10px] font-semibold leading-4 text-slate-500">{item.scope}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function CommandCenterPanels({ commandCenter }) {
  if (!commandCenter) return null;
  return (
    <div className="space-y-4">
      <MandatePanel mandate={commandCenter.mandate} />
      <DecisionQueuePanel items={commandCenter.decisionQueue} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <WorkstreamCards title="Content Feed / Creative Engine" status="Handoff" meta="Scripts, SOPs, creators, editor loop" items={commandCenter.contentFeed} />
        <WorkstreamCards title="Internal Back-and-Forth" status="Tracked" meta="Slack/iMessage/team coordination without overclaiming" items={commandCenter.teamBackforth} />
        <WorkstreamCards title="Richard / Hermes To-Do Board" status="Owned" meta="What must not fall through" items={commandCenter.richardTodos} />
      </div>
      <SourceCoveragePanel items={commandCenter.sourceCoverage} />
    </div>
  );
}

function FeedStatusPanel({ feeds = [] }) {
  if (!feeds.length) return null;

  return (
    <Panel className="overflow-hidden">
      <SectionHeader title="Connected Data Feeds" status="Sanitized" meta="Public-safe source freshness" />
      <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
        {feeds.map((feed) => (
          <div key={feed.name} className="rounded-lg border border-slate-700/60 bg-slate-900/45 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{feed.name}</p>
              <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] ${feed.status === 'live' ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300' : feed.status === 'partial' ? 'border-amber-400/25 bg-amber-400/10 text-amber-300' : 'border-slate-500/25 bg-slate-500/10 text-slate-400'}`}>
                {feed.status}
              </span>
            </div>
            <div className="mt-3 font-mono text-2xl font-black text-white">{feed.value}</div>
            <p className="mt-2 text-[10px] font-bold leading-relaxed text-slate-500">{feed.note}</p>
            {feed.updatedAt ? <p className="mt-3 text-[9px] font-black uppercase tracking-[0.16em] text-slate-600">Updated {feed.updatedAt}</p> : null}
          </div>
        ))}
      </div>
    </Panel>
  );
}

function RecentCallsPanel({ calls = [] }) {
  if (!calls.length) return null;

  return (
    <Panel className="overflow-hidden">
      <SectionHeader title="Watch Deltas / Action Items" status="Connected" meta="Risks, blockers, and smallest actions" />
      <div className="overflow-x-auto">
        <table className="min-w-[760px] w-full text-left text-xs">
          <thead className="bg-slate-900/45 text-[10px] uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th className="px-5 py-3 font-black">Time</th>
              <th className="px-5 py-3 font-black">Call</th>
              <th className="px-5 py-3 font-black">Host</th>
              <th className="px-5 py-3 font-black">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/70">
            {calls.map((call) => (
              <tr key={call.id} className="text-slate-300">
                <td className="px-5 py-4 font-mono font-bold text-slate-400">{call.startedAt}</td>
                <td className="px-5 py-4 font-black text-white">{call.title}</td>
                <td className="px-5 py-4 font-bold text-slate-400">{call.host}</td>
                <td className="px-5 py-4 font-mono font-black text-blue-300">{call.actionItems}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function PerformanceTable({ rows = performanceRows }) {
  return (
    <Panel className="overflow-hidden">
      <SectionHeader title="BU Performance / Reconciliation" status="Live" meta="GetInsights lane view; source-safe status" />
      <div className="overflow-x-auto">
        <table className="min-w-[820px] w-full text-left text-xs">
          <thead className="bg-slate-900/45 text-[10px] uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th className="px-5 py-3 font-black">Campaign</th>
              <th className="px-5 py-3 font-black">Source</th>
              <th className="px-5 py-3 font-black">Leads</th>
              <th className="px-5 py-3 font-black">Bookings</th>
              <th className="px-5 py-3 font-black">Sales</th>
              <th className="px-5 py-3 font-black">ROAS</th>
              <th className="px-5 py-3 font-black">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/70">
            {rows.map((row) => (
              <tr key={row.campaign} className="text-slate-300">
                <td className="px-5 py-4 font-black text-white">{row.campaign}</td>
                <td className="px-5 py-4 font-bold text-slate-400">{row.source}</td>
                <td className="px-5 py-4 font-mono font-black">{row.leads}</td>
                <td className="px-5 py-4 font-mono font-black">{row.bookings}</td>
                <td className="px-5 py-4 font-mono font-black">{row.sales}</td>
                <td className="px-5 py-4 font-mono font-black text-emerald-300">{row.roas}</td>
                <td className="px-5 py-4">
                  <span className="rounded-full border border-slate-600 bg-slate-900/50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-300">
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

export default function UgcmaDashboard() {
  const [filters, setFilters] = useState(() => Object.fromEntries(filterOptions.map((filter) => [filter.id, filter.defaultValue])));
  const [dashboardData, setDashboardData] = useState(null);
  const [feedError, setFeedError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    fetch('/data/ugcma-dashboard.json', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`Feed returned ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        if (isMounted) setDashboardData(payload);
      })
      .catch((error) => {
        if (isMounted) setFeedError(error.message);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const activeFilterCount = useMemo(
    () => filterOptions.filter((filter) => filters[filter.id] !== filter.defaultValue).length,
    [filters],
  );

  const liveKpis = dashboardData?.kpis ?? kpis;
  const liveFunnels = dashboardData?.funnels ?? funnels;
  const liveLeadSources = dashboardData?.leadSources ?? leadSources;
  const liveStagnant = dashboardData?.stagnantLeads ?? {};
  const liveConversion = dashboardData?.conversionMetrics ?? {};
  const livePerformanceRows = dashboardData?.performanceRows ?? performanceRows;
  const liveCommandCenter = dashboardData?.commandCenter;

  return (
    <main className="min-h-screen bg-[#0b1121] text-slate-100 selection:bg-blue-500 selection:text-white">
      <DashboardHeader />
      <div className="mx-auto w-full max-w-[1600px] space-y-5 px-4 py-5 md:px-7">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/55 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 md:hidden">
          <span>{rangeLabel}</span>
          <span>{activeFilterCount} filters active</span>
        </div>
        <FiltersBar filters={filters} setFilters={setFilters} />
        {feedError ? (
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-[11px] font-bold text-amber-200">
            Live feed unavailable; showing baked-in fallback data. {feedError}
          </div>
        ) : null}
        <FeedStatusPanel feeds={dashboardData?.feeds} />
        <CommandCenterPanels commandCenter={liveCommandCenter} />
        <KpiGrid items={liveKpis} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {liveFunnels.map((funnel) => (
            <FunnelCard key={funnel.title} funnel={funnel} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Panel className="overflow-hidden">
            <SectionHeader title="Today Leads by BU" />
            <div className="p-5">
              <DonutChart sources={liveLeadSources} totalLeads={dashboardData?.totalLeads} />
              <button className="mt-5 w-full rounded-lg border border-slate-700 bg-slate-900/55 px-4 py-3 text-[11px] font-black text-slate-400 transition hover:border-slate-600 hover:text-white">
                View full source report
              </button>
            </div>
          </Panel>
          <Panel className="overflow-hidden">
            <SectionHeader title="Open Risks / Reconciliation" />
            <div className="p-5">
              <StagnantLeads buckets={liveStagnant.buckets} total={liveStagnant.total} delta={liveStagnant.delta} note={liveStagnant.note} />
              <button className="mt-6 w-full rounded-lg border border-slate-700 bg-slate-900/55 px-4 py-3 text-[11px] font-black text-slate-400 transition hover:border-slate-600 hover:text-white">
                View all stagnant leads
              </button>
            </div>
          </Panel>
          <Panel className="overflow-hidden">
            <SectionHeader title="Show / Close Watch" />
            <div className="p-5">
              <ConversionMetrics rows={liveConversion.rows} noShow={liveConversion.noShow} bookingSale={liveConversion.bookingSale} />
            </div>
          </Panel>
        </div>
        <RecentCallsPanel calls={dashboardData?.recentCalls} />
        <PerformanceTable rows={livePerformanceRows} />
      </div>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(37,99,235,0.08),transparent_34%),radial-gradient(circle_at_90%_10%,rgba(16,185,129,0.06),transparent_28%)]" />
    </main>
  );
}
