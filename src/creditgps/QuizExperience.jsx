import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Check,
  ChevronLeft,
  Clock3,
  CreditCard,
  FileSearch,
  Gauge,
  Landmark,
  Layers,
  Lock,
  Route,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { RiskBadge } from './components.jsx';
import { actionPlanItems, goalOptions, quizSteps } from './mockData.js';
import {
  CREDIT_GPS_DISCLAIMER,
  calculateUtilization,
  estimateProfileRisk,
  getNextBestAction,
} from './simulationEngine.ts';

const STEP_META = {
  score_range: { icon: Gauge, section: 'Your position' },
  goal_timeline: { icon: CalendarClock, section: 'Your position' },
  number_cards: { icon: CreditCard, section: 'Your cards' },
  total_card_balance: { icon: Wallet, section: 'Your cards' },
  total_card_limit: { icon: Landmark, section: 'Your cards' },
  has_late_payments: { icon: Clock3, section: 'Payment history' },
  has_collections: { icon: FileSearch, section: 'Payment history' },
  has_chargeoffs: { icon: AlertTriangle, section: 'Payment history' },
  loan_mix: { icon: Layers, section: 'Loans & plans' },
  planned_major_purchase: { icon: ShoppingBag, section: 'Loans & plans' },
  applying_soon: { icon: Send, section: 'Loans & plans' },
};

const SECTIONS = ['Your position', 'Your cards', 'Payment history', 'Loans & plans'];

const MONEY_PRESETS = {
  total_card_balance: [0, 1000, 2500, 5000, 10000],
  total_card_limit: [2000, 5000, 10000, 20000, 50000],
};

const BUILD_STAGES = [
  'Reading your credit profile',
  'Estimating utilization and risk flags',
  'Matching safer moves to your goal',
  'Routing your next best move',
];

const AUTO_ADVANCE_MS = 340;

function getGoalTitle(goalId) {
  return goalOptions.find((goal) => goal.id === goalId)?.title || 'Buy a Home';
}

function getVisibleSteps(profile) {
  return quizSteps.filter((step) => {
    if ((step.id === 'total_card_balance' || step.id === 'total_card_limit') && profile.number_cards === '0') {
      return false;
    }
    return true;
  });
}

function toAmount(value) {
  const digits = String(value ?? '').replace(/[^0-9]/g, '');
  return digits === '' ? '' : Number(digits);
}

function formatAmount(value) {
  if (value === '' || value === null || value === undefined) return '';
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toLocaleString('en-US') : '';
}

function ChoiceGrid({ step, profile, onSelect, pendingValue }) {
  return (
    <div role="radiogroup" aria-label={step.label} className="grid gap-2 sm:grid-cols-2">
      {step.options.map((option, optionIndex) => {
        const selected = (pendingValue ?? profile[step.id]) === option;
        return (
          <motion.button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(option)}
            className={`flex items-center justify-between rounded-xl border px-4 py-3.5 text-left text-sm font-bold transition-colors ${
              selected
                ? 'border-blue-500 bg-blue-50 text-blue-950 ring-1 ring-blue-500'
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/40'
            }`}
          >
            <span className="flex items-center gap-3">
              <span
                className={`hidden h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[11px] font-black sm:flex ${
                  selected ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-200 bg-slate-50 text-slate-500'
                }`}
              >
                {optionIndex + 1}
              </span>
              {option}
            </span>
            {selected ? <Check className="h-4 w-4 shrink-0 text-blue-700" /> : null}
          </motion.button>
        );
      })}
    </div>
  );
}

function BooleanChoice({ step, profile, onSelect, pendingValue }) {
  return (
    <div role="radiogroup" aria-label={step.label} className="grid grid-cols-2 gap-2">
      {[true, false].map((value) => {
        const selected = (pendingValue ?? profile[step.id]) === value;
        return (
          <motion.button
            key={String(value)}
            type="button"
            role="radio"
            aria-checked={selected}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(value)}
            className={`rounded-xl border px-4 py-5 text-base font-extrabold transition-colors ${
              selected
                ? 'border-blue-500 bg-blue-50 text-blue-950 ring-1 ring-blue-500'
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/40'
            }`}
          >
            {value ? 'Yes' : 'No'}
          </motion.button>
        );
      })}
    </div>
  );
}

function MoneyInput({ step, value, onChange, onSubmit }) {
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [step.id]);

  const presets = MONEY_PRESETS[step.id] || MONEY_PRESETS.total_card_balance;

  return (
    <div>
      <label className="block">
        <span className="mb-2 block text-sm font-bold text-slate-700">Estimated amount — a close guess is fine</span>
        <span className="flex rounded-xl border-2 border-slate-200 bg-white transition-colors focus-within:border-blue-500">
          <span className="flex items-center pl-4 text-2xl font-black text-slate-400">$</span>
          <input
            ref={inputRef}
            value={formatAmount(value)}
            onChange={(event) => onChange(toAmount(event.target.value))}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && value !== '') {
                event.preventDefault();
                onSubmit();
              }
            }}
            inputMode="numeric"
            autoComplete="off"
            placeholder={formatAmount(step.placeholder)}
            aria-label={step.label}
            className="min-w-0 flex-1 rounded-r-xl border-0 bg-transparent px-3 py-4 text-2xl font-extrabold text-slate-950 outline-none placeholder:text-slate-300"
          />
        </span>
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => onChange(preset)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-extrabold transition-colors ${
              Number(value) === preset
                ? 'border-blue-500 bg-blue-600 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-800'
            }`}
          >
            ${formatAmount(preset)}
          </button>
        ))}
      </div>
    </div>
  );
}

function MultiChoice({ step, profile, setField }) {
  return (
    <div className="space-y-2">
      {step.options.map((option) => {
        const selected = Boolean(profile[option.id]);
        return (
          <motion.button
            key={option.id}
            type="button"
            role="checkbox"
            aria-checked={selected}
            whileTap={{ scale: 0.99 }}
            onClick={() => setField(option.id, !selected)}
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left text-sm font-bold transition-colors ${
              selected
                ? 'border-blue-500 bg-blue-50 text-blue-950 ring-1 ring-blue-500'
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/40'
            }`}
          >
            {option.label}
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${
                selected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white text-transparent'
              }`}
            >
              <Check className="h-4 w-4" />
            </span>
          </motion.button>
        );
      })}
      <p className="pt-1 text-xs font-semibold text-slate-500">Select all that apply, or continue if none do.</p>
    </div>
  );
}

function SectionTracker({ sections, currentSection, completedSections }) {
  return (
    <ol className="space-y-2.5">
      {sections.map((section) => {
        const done = completedSections.includes(section);
        const active = section === currentSection;
        return (
          <li key={section} className="flex items-center gap-3">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-black transition-colors ${
                done
                  ? 'border-teal-400 bg-teal-400 text-slate-950'
                  : active
                    ? 'border-blue-400 bg-blue-500 text-white'
                    : 'border-white/20 bg-white/5 text-slate-400'
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : null}
            </span>
            <span className={`text-sm font-bold ${active ? 'text-white' : done ? 'text-teal-200' : 'text-slate-400'}`}>
              {section}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function LiveSnapshot({ profile, answeredCardNumbers }) {
  const utilization = calculateUtilization(profile.total_card_balance, profile.total_card_limit);
  const risk = estimateProfileRisk(profile);

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-200">Live profile snapshot</p>
      <dl className="mt-3 space-y-2.5 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="font-semibold text-slate-400">Goal</dt>
          <dd className="text-right font-extrabold text-white">{getGoalTitle(profile.primary_goal)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="font-semibold text-slate-400">Score range</dt>
          <dd className="font-extrabold text-white">{profile.score_range}</dd>
        </div>
        {answeredCardNumbers ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="font-semibold text-slate-400">Reported card use</dt>
            <dd className="font-extrabold text-white">{utilization}%</dd>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <dt className="font-semibold text-slate-400">Estimated risk</dt>
          <dd>
            <RiskBadge level={risk} />
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-[11px] font-semibold leading-4 text-slate-500">Updates as you answer.</p>
    </div>
  );
}

function BuildingPlan({ stageCount }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-950/10 sm:p-8">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-950">Building your plan</h2>
          <p className="text-sm font-semibold text-slate-500">This takes a few seconds.</p>
        </div>
      </div>
      <ul className="mt-7 space-y-4" aria-live="polite">
        {BUILD_STAGES.map((stage, index) => {
          const done = index < stageCount;
          const active = index === stageCount;
          return (
            <motion.li
              key={stage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: done || active ? 1 : 0.35, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-3"
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  done ? 'border-teal-500 bg-teal-500 text-white' : 'border-slate-200 bg-slate-50 text-transparent'
                }`}
              >
                {done ? (
                  <Check className="h-4 w-4" />
                ) : active ? (
                  <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-500" />
                ) : null}
              </span>
              <span className={`text-sm font-bold ${done ? 'text-slate-950' : active ? 'text-blue-800' : 'text-slate-400'}`}>
                {stage}
              </span>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}

function PlanReady({ profile, navigate, basePath }) {
  const utilization = calculateUtilization(profile.total_card_balance, profile.total_card_limit);
  const risk = estimateProfileRisk(profile);
  const nextBestAction = getNextBestAction(profile);

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-950/10 sm:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-extrabold text-teal-800">
            <ShieldCheck className="h-3.5 w-3.5" /> Plan ready
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Your {getGoalTitle(profile.primary_goal)} route is mapped.
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Built from your answers — timeline {profile.goal_timeline}, {profile.number_cards} card
            {profile.number_cards === '1' ? '' : 's'} reporting.
          </p>
        </div>
        <RiskBadge level={risk} />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-100 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Reported card use</p>
          <p className="mt-1.5 text-3xl font-black text-slate-950">{utilization}%</p>
        </div>
        <div className="rounded-xl bg-slate-100 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Score range</p>
          <p className="mt-1.5 text-3xl font-black text-slate-950">{profile.score_range}</p>
        </div>
        <div className="rounded-xl bg-slate-100 p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Timeline</p>
          <p className="mt-1.5 text-2xl font-black leading-9 text-slate-950">{profile.goal_timeline}</p>
        </div>
      </div>

      <div className="mt-5 rounded-xl bg-slate-950 p-5 text-white">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-500">
            <Route className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-200">Your next best move</p>
            <p className="mt-2 text-lg font-extrabold leading-7">{nextBestAction}</p>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-extrabold text-slate-950">First three stops on your route</h3>
        <ul className="mt-3 space-y-2">
          {actionPlanItems.slice(0, 3).map((item, index) => (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + index * 0.12 }}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[11px] font-black text-white">
                {index + 1}
              </span>
              <span>
                <span className="block text-sm font-extrabold text-slate-950">{item.title}</span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-600">{item.description}</span>
              </span>
            </motion.li>
          ))}
        </ul>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => navigate(`${basePath}/dashboard`)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-4 text-base font-extrabold text-white shadow-lg shadow-blue-600/25 transition-colors hover:bg-blue-500"
        >
          Open my dashboard <ArrowRight className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => navigate(`${basePath}/simulator`)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 text-base font-extrabold text-slate-950 transition-colors hover:bg-slate-50"
        >
          Run my first credit move
        </button>
      </div>
      <p className="mt-5 rounded-xl bg-slate-100 p-3 text-xs leading-5 text-slate-600">{CREDIT_GPS_DISCLAIMER}</p>
    </motion.section>
  );
}

export default function QuizExperience({ profile, updateProfile, navigate, basePath }) {
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [phase, setPhase] = useState('questions');
  const [stageCount, setStageCount] = useState(0);
  const [pendingValue, setPendingValue] = useState(null);
  const advanceTimer = useRef(null);
  const headingRef = useRef(null);

  const visibleSteps = getVisibleSteps(profile);
  const safeIndex = Math.min(index, visibleSteps.length - 1);
  const step = visibleSteps[safeIndex];
  const meta = STEP_META[step.id] || {};
  const StepIcon = meta.icon || Gauge;
  const progress = phase === 'questions' ? Math.round((safeIndex / visibleSteps.length) * 100) : 100;
  const completedSections = SECTIONS.filter((section) =>
    visibleSteps.every((item, itemIndex) => (STEP_META[item.id]?.section !== section ? true : itemIndex < safeIndex)),
  );

  const setField = (field, value) => updateProfile({ [field]: value });

  const goTo = (nextIndex) => {
    setDirection(nextIndex >= safeIndex ? 1 : -1);
    setIndex(Math.max(0, nextIndex));
    setPendingValue(null);
  };

  const finish = () => {
    updateProfile({ onboarding_completed: true });
    setPhase('building');
  };

  const advance = () => {
    if (safeIndex < visibleSteps.length - 1) {
      goTo(safeIndex + 1);
      return;
    }
    finish();
  };

  const selectAndAdvance = (value) => {
    if (step.id === 'number_cards' && value === '0') {
      updateProfile({ number_cards: value, total_card_balance: 0, total_card_limit: 0 });
    } else {
      setField(step.id, value);
    }
    setPendingValue(value);
    window.clearTimeout(advanceTimer.current);
    advanceTimer.current = window.setTimeout(advance, reducedMotion ? 80 : AUTO_ADVANCE_MS);
  };

  useEffect(() => () => window.clearTimeout(advanceTimer.current), []);

  useEffect(() => {
    if (phase === 'questions') headingRef.current?.focus({ preventScroll: true });
  }, [safeIndex, phase]);

  useEffect(() => {
    if (phase !== 'building') return undefined;
    const stepMs = reducedMotion ? 120 : 620;
    const timers = BUILD_STAGES.map((_, stageIndex) =>
      window.setTimeout(() => setStageCount(stageIndex + 1), stepMs * (stageIndex + 1)),
    );
    timers.push(window.setTimeout(() => setPhase('ready'), stepMs * BUILD_STAGES.length + (reducedMotion ? 150 : 500)));
    return () => timers.forEach(window.clearTimeout);
  }, [phase, reducedMotion]);

  useEffect(() => {
    if (phase !== 'questions') return undefined;
    const onKeyDown = (event) => {
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (event.key === 'Enter' || event.key === 'ArrowRight') {
        event.preventDefault();
        advance();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        if (safeIndex > 0) goTo(safeIndex - 1);
        return;
      }
      const numeric = Number(event.key);
      if (!Number.isNaN(numeric) && numeric >= 1) {
        if (step.type === 'choice' && numeric <= step.options.length) {
          selectAndAdvance(step.options[numeric - 1]);
        } else if (step.type === 'boolean' && numeric <= 2) {
          selectAndAdvance(numeric === 1);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const moneyValue = profile[step.id] === '' ? '' : toAmount(profile[step.id]);
  const canContinue = step.type !== 'money' || moneyValue !== '';
  const answeredCardNumbers =
    profile.number_cards === '0' ||
    safeIndex > visibleSteps.findIndex((item) => item.id === 'total_card_limit');

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_0.42fr] lg:py-12">
      <section>
        {phase === 'questions' ? (
          <>
            <div className="mb-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => (safeIndex === 0 ? navigate(`${basePath}/onboarding`) : goTo(safeIndex - 1))}
                className="inline-flex items-center gap-2 text-sm font-bold text-slate-300 transition-colors hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" /> {safeIndex === 0 ? 'Goal selection' : 'Back'}
              </button>
              <p aria-live="polite" className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">
                Question {safeIndex + 1} of {visibleSteps.length}
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-950/10">
              <div className="h-1.5 bg-slate-100">
                <motion.div
                  className="h-1.5 rounded-r-full bg-blue-600"
                  initial={false}
                  animate={{ width: `${Math.max(progress, 4)}%` }}
                  transition={{ duration: reducedMotion ? 0 : 0.4, ease: 'easeOut' }}
                />
              </div>
              <div className="p-5 sm:p-7">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={step.id}
                    initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 28 * direction }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -28 * direction }}
                    transition={{ duration: 0.24, ease: 'easeOut' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/10 text-blue-700">
                        <StepIcon className="h-4 w-4" />
                      </span>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">{meta.section}</p>
                    </div>
                    <h2
                      ref={headingRef}
                      tabIndex={-1}
                      className="mt-4 text-2xl font-black leading-tight tracking-tight text-slate-950 outline-none sm:text-3xl"
                    >
                      {step.label}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{step.helper}</p>
                    <div className="mt-6">
                      {step.type === 'choice' ? (
                        <ChoiceGrid step={step} profile={profile} onSelect={selectAndAdvance} pendingValue={pendingValue} />
                      ) : null}
                      {step.type === 'boolean' ? (
                        <BooleanChoice step={step} profile={profile} onSelect={selectAndAdvance} pendingValue={pendingValue} />
                      ) : null}
                      {step.type === 'money' ? (
                        <MoneyInput
                          step={step}
                          value={moneyValue}
                          onChange={(value) => setField(step.id, value)}
                          onSubmit={advance}
                        />
                      ) : null}
                      {step.type === 'multi' ? <MultiChoice step={step} profile={profile} setField={setField} /> : null}
                    </div>

                    {step.type === 'money' || step.type === 'multi' ? (
                      <button
                        type="button"
                        onClick={advance}
                        disabled={!canContinue}
                        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-4 text-sm font-extrabold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:px-8"
                      >
                        {safeIndex === visibleSteps.length - 1 ? 'Build my plan' : 'Continue'}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <p className="mt-6 text-xs font-semibold text-slate-400">
                        Tap an answer to continue{safeIndex === visibleSteps.length - 1 ? ' and build your plan' : ''}
                        <span className="hidden sm:inline"> — or press the number keys</span>.
                      </p>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" /> No SSN, no credit pull
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> Answers stay on this device
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5" /> About 60 seconds
              </span>
            </div>
          </>
        ) : phase === 'building' ? (
          <BuildingPlan stageCount={stageCount} />
        ) : (
          <PlanReady profile={profile} navigate={navigate} basePath={basePath} />
        )}
      </section>

      <aside className="space-y-4 lg:mt-12">
        <div className="rounded-2xl border border-white/10 bg-white/10 p-5 text-white backdrop-blur-xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">Profile route</p>
          <h2 className="mt-2 text-2xl font-black">{getGoalTitle(profile.primary_goal)}</h2>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-2 rounded-full bg-blue-400"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: reducedMotion ? 0 : 0.4, ease: 'easeOut' }}
            />
          </div>
          <p className="mt-2 text-sm font-bold text-slate-300">{progress}% profile complete</p>
          <div className="mt-5">
            <SectionTracker
              sections={SECTIONS}
              currentSection={phase === 'questions' ? meta.section : null}
              completedSections={phase === 'questions' ? completedSections : SECTIONS}
            />
          </div>
        </div>
        <LiveSnapshot profile={profile} answeredCardNumbers={answeredCardNumbers} />
        <p className="rounded-xl border border-white/10 bg-slate-950/50 p-3 text-xs leading-5 text-slate-400">
          {CREDIT_GPS_DISCLAIMER}
        </p>
      </aside>
    </main>
  );
}
