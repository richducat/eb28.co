import React from 'react';
import { ArrowRight, Check, Clock3, ShieldAlert, TrendingUp } from 'lucide-react';

const riskStyles = {
  Low: 'border-teal-200 bg-teal-50 text-teal-800',
  Medium: 'border-amber-200 bg-amber-50 text-amber-800',
  High: 'border-rose-200 bg-rose-50 text-rose-800',
};

const confidenceStyles = {
  Low: 'border-slate-200 bg-slate-100 text-slate-700',
  Medium: 'border-blue-200 bg-blue-50 text-blue-800',
  High: 'border-indigo-200 bg-indigo-50 text-indigo-800',
};

const directionStyles = {
  'Likely Positive': 'border-teal-200 bg-teal-50 text-teal-800',
  'Likely Negative': 'border-rose-200 bg-rose-50 text-rose-800',
  Mixed: 'border-amber-200 bg-amber-50 text-amber-800',
  'Temporary Dip Possible': 'border-orange-200 bg-orange-50 text-orange-800',
  'Neutral / Low Impact': 'border-slate-200 bg-slate-100 text-slate-700',
  'Depends on Profile': 'border-blue-200 bg-blue-50 text-blue-800',
};

export function RiskBadge({ level = 'Medium' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${riskStyles[level] || riskStyles.Medium}`}>
      <ShieldAlert className="h-3.5 w-3.5" />
      {level} risk
    </span>
  );
}

export function ConfidenceBadge({ level = 'Medium' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${confidenceStyles[level] || confidenceStyles.Medium}`}>
      <TrendingUp className="h-3.5 w-3.5" />
      {level} confidence
    </span>
  );
}

export function TimelineBadge({ value = 'Next reporting cycle' }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700">
      <Clock3 className="h-3.5 w-3.5" />
      {value}
    </span>
  );
}

export function DirectionBadge({ direction = 'Depends on Profile' }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${directionStyles[direction] || directionStyles['Depends on Profile']}`}>
      {direction}
    </span>
  );
}

export function GoalCard({ goal, selected, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group h-full rounded-lg border p-4 text-left transition-all ${
        selected
          ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-950/10'
          : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md'
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 group-hover:bg-blue-100 group-hover:text-blue-700'}`}>
          {Icon ? <Icon className="h-5 w-5" /> : <Check className="h-5 w-5" />}
        </span>
        {selected ? <Check className="h-5 w-5 text-blue-600" /> : null}
      </div>
      <h3 className="text-base font-extrabold text-slate-950">{goal.title}</h3>
      <p className="mt-2 text-sm leading-5 text-slate-600">{goal.description}</p>
    </button>
  );
}

export function QuizCard({ step, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xl shadow-slate-950/10">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Credit profile</p>
      <h2 className="mt-3 text-2xl font-extrabold leading-tight text-slate-950">{step.label}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{step.helper}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function DashboardActionCard({ title, body, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white transition-colors group-hover:bg-blue-700">
          {Icon ? <Icon className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
        </span>
        <span>
          <span className="block text-sm font-extrabold text-slate-950">{title}</span>
          <span className="mt-1 block text-xs leading-5 text-slate-600">{body}</span>
        </span>
      </div>
    </button>
  );
}

export function ScenarioCard({ scenario, icon: Icon, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-4 text-left transition-all ${
        selected
          ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-950/10'
          : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md'
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${selected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
          {Icon ? <Icon className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
        </span>
        <ArrowRight className={`h-4 w-4 ${selected ? 'text-blue-700' : 'text-slate-400'}`} />
      </div>
      <h3 className="text-sm font-extrabold text-slate-950">{scenario.title}</h3>
      <p className="mt-2 text-xs leading-5 text-slate-600">{scenario.description}</p>
    </button>
  );
}

export function SimulationResultCard({ result }) {
  if (!result) return null;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xl shadow-slate-950/10">
      <div className="flex flex-wrap gap-2">
        <DirectionBadge direction={result.result_direction} />
        <ConfidenceBadge level={result.confidence_level} />
        <RiskBadge level={result.risk_level} />
      </div>
      <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950">Estimated impact: {result.result_direction}</h2>
      <div className="mt-4">
        <TimelineBadge value={result.timeline_estimate} />
      </div>
      <div className="mt-6 space-y-5">
        <div>
          <h3 className="text-sm font-extrabold text-slate-950">Why it may happen</h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">{result.explanation}</p>
        </div>
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <h3 className="text-sm font-extrabold text-blue-950">Better next move</h3>
          <p className="mt-2 text-sm leading-6 text-blue-900">{result.recommended_next_action}</p>
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-slate-950">Goal impact</h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">{result.goal_impact}</p>
        </div>
        <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
          {result.compliance_disclaimer}
        </p>
      </div>
    </section>
  );
}

export function LessonCard({ lesson, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">{lesson.category}</p>
          <h3 className="mt-2 text-base font-extrabold text-slate-950">{lesson.title}</h3>
          <p className="mt-2 text-sm leading-5 text-slate-600">{lesson.summary}</p>
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
      </div>
    </button>
  );
}

export function OfferCard({ offer, onReview }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">{offer.category}</p>
          <h3 className="mt-2 text-lg font-extrabold text-slate-950">{offer.title}</h3>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
          Profile match
        </span>
      </div>
      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="font-bold text-slate-950">Best for</dt>
          <dd className="mt-1 leading-5 text-slate-600">{offer.best_for}</dd>
        </div>
        <div>
          <dt className="font-bold text-slate-950">Why it may fit</dt>
          <dd className="mt-1 leading-5 text-slate-600">{offer.why_it_may_fit}</dd>
        </div>
        <div className="rounded-lg bg-amber-50 p-3 text-amber-900">
          <dt className="font-bold">Risk note</dt>
          <dd className="mt-1 leading-5">{offer.risk_note}</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={() => onReview(offer)}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-extrabold text-white transition-colors hover:bg-blue-700"
      >
        Review option <ArrowRight className="h-4 w-4" />
      </button>
    </article>
  );
}

export function ActionItemCard({ item, completed, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full rounded-lg border p-4 text-left transition-all ${
        completed ? 'border-teal-200 bg-teal-50' : 'border-slate-200 bg-white hover:border-blue-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${completed ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 bg-white text-transparent'}`}>
          <Check className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-extrabold text-slate-950">{item.title}</span>
          <span className="mt-1 block text-xs leading-5 text-slate-600">{item.description}</span>
          <span className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">{item.priority} priority</span>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-800">{item.due_window}</span>
          </span>
        </span>
      </div>
    </button>
  );
}
