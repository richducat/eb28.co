import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Briefcase,
  Building2,
  Car,
  ChevronLeft,
  CircleDollarSign,
  Compass,
  CreditCard,
  FileSearch,
  GraduationCap,
  Home,
  ListChecks,
  MapPin,
  Percent,
  PlusCircle,
  RefreshCcw,
  Repeat,
  Route,
  Save,
  Search,
  ShieldCheck,
  Sprout,
  Target,
  TrendingUp,
  WalletCards,
  XCircle,
} from 'lucide-react';
import {
  ActionItemCard,
  ConfidenceBadge,
  DashboardActionCard,
  GoalCard,
  LessonCard,
  OfferCard,
  QuizCard,
  RiskBadge,
  ScenarioCard,
  SimulationResultCard,
  TimelineBadge,
} from './creditgps/components.jsx';
import {
  actionPlanItems,
  defaultProfile,
  goalOptions,
  lessons,
  offers,
  quizSteps,
  scenarioOptions,
} from './creditgps/mockData.js';
import {
  CONSULTATION_DISCLAIMER,
  CREDIT_GPS_DISCLAIMER,
  OFFER_DISCLAIMER,
  calculateUtilization,
  estimateProfileRisk,
  explainScoreDrop,
  getNextBestAction,
  runSimulation,
  scoreDropCauses,
} from './creditgps/simulationEngine.ts';

const STORAGE_KEY = 'limitless-credit-gps-state';
const BASE_PATH = '/limitless';

const goalIcons = {
  buy_home: Home,
  buy_car: Car,
  rebuild_credit: RefreshCcw,
  fix_collections: FileSearch,
  build_from_scratch: Sprout,
  lower_rates: Percent,
  business_funding: Briefcase,
  apartment_approval: Building2,
};

const scenarioIcons = {
  pay_down_credit_card: CreditCard,
  pay_off_auto_loan: Car,
  pay_off_mortgage: Home,
  open_new_card: PlusCircle,
  close_card: XCircle,
  request_limit_increase: TrendingUp,
  pay_collection: CircleDollarSign,
  remove_inaccurate_item: FileSearch,
  consolidate_debt: Repeat,
  apply_for_mortgage: Home,
  missed_payment: AlertTriangle,
};

const defaultSimulationInputs = {
  current_balance: defaultProfile.total_card_balance,
  credit_limit: defaultProfile.total_card_limit,
  payoff_amount: 1500,
  statement_date_known: 'Not sure',
  applying_soon: defaultProfile.applying_soon,
  card_limit: 2500,
  total_credit_limit: defaultProfile.total_card_limit,
  total_card_balance: defaultProfile.total_card_balance,
  card_age: 'Oldest card',
  hard_pull_likely: false,
  inaccurate_item: false,
};

function normalizePath(pathname = window.location.pathname) {
  const lower = pathname.toLowerCase().replace(/\/+$/, '') || BASE_PATH;
  if (lower.startsWith('/credit-gps')) {
    return lower.replace('/credit-gps', BASE_PATH) || BASE_PATH;
  }
  if (lower.startsWith('/limitless-credit-gps')) {
    return lower.replace('/limitless-credit-gps', BASE_PATH) || BASE_PATH;
  }
  return lower;
}

function loadStoredState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function persistState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Local persistence is best-effort in private browsing or restricted storage.
  }
}

function getGoalTitle(goalId) {
  return goalOptions.find((goal) => goal.id === goalId)?.title || 'Buy a Home';
}

function getScenarioTitle(scenarioId) {
  return scenarioOptions.find((scenario) => scenario.id === scenarioId)?.title || 'Credit move';
}

function getRouteScreen(path) {
  if (path.startsWith(`${BASE_PATH}/learn/`)) return 'lesson-detail';
  if (path === `${BASE_PATH}/onboarding`) return 'onboarding';
  if (path === `${BASE_PATH}/quiz`) return 'quiz';
  if (path === `${BASE_PATH}/dashboard`) return 'dashboard';
  if (path === `${BASE_PATH}/simulator/input`) return 'simulation-input';
  if (path === `${BASE_PATH}/simulator/result`) return 'simulation-result';
  if (path === `${BASE_PATH}/simulator`) return 'simulator';
  if (path === `${BASE_PATH}/score-drop`) return 'score-drop';
  if (path === `${BASE_PATH}/learn`) return 'learn';
  if (path === `${BASE_PATH}/offers`) return 'offers';
  if (path === `${BASE_PATH}/consultation`) return 'consultation';
  if (path === `${BASE_PATH}/plan`) return 'plan';
  return 'welcome';
}

function ProgressPath({ current = 1 }) {
  const steps = ['Goal', 'Profile', 'Simulate', 'Next move'];

  return (
    <div className="grid grid-cols-4 gap-2">
      {steps.map((step, index) => {
        const active = index + 1 <= current;
        return (
          <div key={step} className="min-w-0">
            <div className={`h-1.5 rounded-full ${active ? 'bg-blue-500' : 'bg-slate-200'}`} />
            <p className={`mt-2 truncate text-[11px] font-bold ${active ? 'text-blue-800' : 'text-slate-500'}`}>
              {step}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function AppHeader({ screen, navigate }) {
  const navItems = [
    ['Dashboard', `${BASE_PATH}/dashboard`],
    ['Simulator', `${BASE_PATH}/simulator`],
    ['Score Drop', `${BASE_PATH}/score-drop`],
    ['Learn', `${BASE_PATH}/learn`],
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <button type="button" onClick={() => navigate(BASE_PATH)} className="flex items-center gap-3 text-left">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500 text-white shadow-lg shadow-blue-500/20">
            <Compass className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-black tracking-tight text-white">Limitless Credit GPS</span>
            <span className="block text-xs font-semibold text-slate-400">Credit move simulator</span>
          </span>
        </button>
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map(([label, path]) => {
            const active = screen !== 'welcome' && normalizePath(path) === normalizePath(window.location.pathname);
            return (
              <button
                key={path}
                type="button"
                onClick={() => navigate(path)}
                className={`rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                  active ? 'bg-white text-slate-950' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {label}
              </button>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => navigate(`${BASE_PATH}/simulator`)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-extrabold text-white shadow-lg shadow-blue-500/20 transition-colors hover:bg-blue-400"
        >
          Run move <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}

function FooterDisclaimer() {
  return (
    <footer className="border-t border-white/10 bg-slate-950 px-4 py-8 text-slate-400 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-3 text-xs leading-5">
        <p>{CREDIT_GPS_DISCLAIMER}</p>
        <p>{OFFER_DISCLAIMER}</p>
        <p>{CONSULTATION_DISCLAIMER}</p>
      </div>
    </footer>
  );
}

function AppShell({ screen, navigate, children }) {
  return (
    <div className="min-h-screen bg-slate-950 font-body text-slate-950">
      <div className="min-h-screen bg-[linear-gradient(180deg,#07111f_0%,#0f172a_54%,#101827_100%)]">
        <AppHeader screen={screen} navigate={navigate} />
        {children}
      </div>
      <FooterDisclaimer />
    </div>
  );
}

function WelcomeScreen({ navigate, profileRisk, nextBestAction }) {
  return (
    <main className="mx-auto grid min-h-[calc(100vh-65px)] max-w-6xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:py-14">
      <section className="text-white">
        <div className="mb-8 flex items-center gap-3 text-sm font-bold text-blue-100">
          <MapPin className="h-5 w-5 text-blue-300" />
          Current position to better route
        </div>
        <h1 className="max-w-2xl text-5xl font-black leading-[0.96] tracking-tight sm:text-6xl">
          Know the credit impact before you make the move.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
          Limitless Credit GPS helps you simulate common credit decisions, understand likely direction, and choose a cleaner next step.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => navigate(`${BASE_PATH}/onboarding`)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-500 px-6 py-4 text-base font-extrabold text-white shadow-xl shadow-blue-500/20 transition-colors hover:bg-blue-400"
          >
            Start My Credit GPS <ArrowRight className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => navigate(`${BASE_PATH}/simulator`)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/10 px-6 py-4 text-base font-extrabold text-white transition-colors hover:bg-white/15"
          >
            Run a Credit Move
          </button>
        </div>
        <p className="mt-6 max-w-xl rounded-lg border border-white/10 bg-white/5 p-3 text-xs leading-5 text-slate-300">
          {CREDIT_GPS_DISCLAIMER}
        </p>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-white/10 p-3 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
        <div className="rounded-[1.5rem] bg-slate-100 p-3">
          <div className="rounded-[1.1rem] border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Your Credit GPS Plan</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Buy a Home</h2>
              </div>
              <RiskBadge level={profileRisk} />
            </div>
            <div className="mt-5">
              <ProgressPath current={2} />
            </div>
            <div className="mt-5 rounded-lg bg-slate-950 p-4 text-white">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500">
                  <Route className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-200">Next best move</p>
                  <p className="mt-2 text-lg font-extrabold leading-6">{nextBestAction}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <DashboardActionCard title="Run a Credit Move" body="Simulate before acting." icon={Route} onClick={() => navigate(`${BASE_PATH}/simulator`)} />
              <DashboardActionCard title="Explain Score Drop" body="Find likely reasons." icon={Search} onClick={() => navigate(`${BASE_PATH}/score-drop`)} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function OnboardingScreen({ profile, updateProfile, navigate }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <section className="mb-6 text-white">
        <button type="button" onClick={() => navigate(BASE_PATH)} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white">
          <ChevronLeft className="h-4 w-4" /> Welcome
        </button>
        <h1 className="text-4xl font-black tracking-tight">Choose your goal.</h1>
        <p className="mt-3 max-w-2xl text-slate-300">
          Your route changes when the goal changes. A home-buying plan should not behave like a credit-builder plan.
        </p>
      </section>
      <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-2xl shadow-slate-950/20">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {goalOptions.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              icon={goalIcons[goal.id]}
              selected={profile.primary_goal === goal.id}
              onClick={() => updateProfile({ primary_goal: goal.id })}
            />
          ))}
        </div>
        <div className="mt-5 flex flex-col justify-between gap-3 rounded-lg bg-white p-4 sm:flex-row sm:items-center">
          <p className="text-sm leading-6 text-slate-600">
            Selected route: <span className="font-extrabold text-slate-950">{getGoalTitle(profile.primary_goal)}</span>
          </p>
          <button
            type="button"
            onClick={() => navigate(`${BASE_PATH}/quiz`)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-blue-700"
          >
            Continue to quiz <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </main>
  );
}

function QuizInput({ step, profile, setField }) {
  if (step.type === 'choice') {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {step.options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setField(step.id, option)}
            className={`rounded-lg border px-4 py-3 text-left text-sm font-bold transition-colors ${
              profile[step.id] === option
                ? 'border-blue-500 bg-blue-50 text-blue-950'
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    );
  }

  if (step.type === 'money') {
    return (
      <label className="block">
        <span className="mb-2 block text-sm font-bold text-slate-700">Estimated amount</span>
        <span className="flex rounded-lg border border-slate-200 bg-white focus-within:border-blue-500">
          <span className="flex items-center px-4 text-lg font-black text-slate-400">$</span>
          <input
            value={profile[step.id] ?? ''}
            onChange={(event) => setField(step.id, event.target.value)}
            inputMode="numeric"
            placeholder={step.placeholder}
            className="min-w-0 flex-1 rounded-r-lg border-0 bg-transparent px-2 py-4 text-lg font-extrabold text-slate-950 outline-none"
          />
        </span>
      </label>
    );
  }

  if (step.type === 'boolean') {
    return (
      <div className="grid grid-cols-2 gap-2">
        {[true, false].map((value) => (
          <button
            key={String(value)}
            type="button"
            onClick={() => setField(step.id, value)}
            className={`rounded-lg border px-4 py-4 text-sm font-extrabold transition-colors ${
              profile[step.id] === value
                ? 'border-blue-500 bg-blue-50 text-blue-950'
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
            }`}
          >
            {value ? 'Yes' : 'No'}
          </button>
        ))}
      </div>
    );
  }

  if (step.type === 'multi') {
    return (
      <div className="space-y-2">
        {step.options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setField(option.id, !profile[option.id])}
            className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm font-bold transition-colors ${
              profile[option.id]
                ? 'border-blue-500 bg-blue-50 text-blue-950'
                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
            }`}
          >
            {option.label}
            {profile[option.id] ? <ShieldCheck className="h-4 w-4 text-blue-700" /> : null}
          </button>
        ))}
      </div>
    );
  }

  return null;
}

function QuizScreen({ profile, updateProfile, navigate }) {
  const [index, setIndex] = useState(0);
  const step = quizSteps[index];
  const progress = Math.round(((index + 1) / quizSteps.length) * 100);

  const setField = (field, value) => updateProfile({ [field]: value });
  const next = () => {
    if (index < quizSteps.length - 1) {
      setIndex((current) => current + 1);
      return;
    }

    updateProfile({ onboarding_completed: true });
    navigate(`${BASE_PATH}/dashboard`);
  };

  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[0.78fr_0.42fr] lg:py-12">
      <section>
        <button type="button" onClick={() => navigate(`${BASE_PATH}/onboarding`)} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white">
          <ChevronLeft className="h-4 w-4" /> Goal selection
        </button>
        <QuizCard step={step}>
          <QuizInput step={step} profile={profile} setField={setField} />
          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIndex((current) => Math.max(0, current - 1))}
              disabled={index === 0}
              className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-blue-700"
            >
              {index === quizSteps.length - 1 ? 'Build my plan' : 'Next question'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </QuizCard>
      </section>
      <aside className="rounded-lg border border-white/10 bg-white/10 p-4 text-white backdrop-blur-xl lg:mt-10">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">Profile route</p>
        <h2 className="mt-3 text-2xl font-black">{getGoalTitle(profile.primary_goal)}</h2>
        <div className="mt-5 h-2 rounded-full bg-white/10">
          <div className="h-2 rounded-full bg-blue-400" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-3 text-sm font-bold text-slate-300">{progress}% profile complete</p>
        <p className="mt-5 rounded-lg border border-white/10 bg-slate-950/50 p-3 text-xs leading-5 text-slate-300">
          {CREDIT_GPS_DISCLAIMER}
        </p>
      </aside>
    </main>
  );
}

function DashboardScreen({
  profile,
  profileRisk,
  nextBestAction,
  savedSimulations,
  completedItems,
  setCompletedItems,
  navigate,
}) {
  const utilization = calculateUtilization(profile.total_card_balance, profile.total_card_limit);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <section className="mb-6 text-white">
        <p className="text-sm font-bold text-blue-200">Current position</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Your Credit GPS Plan</h1>
      </section>
      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.7fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-950/20">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Goal destination</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{getGoalTitle(profile.primary_goal)}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Timeline: {profile.goal_timeline}</p>
            </div>
            <RiskBadge level={profileRisk} />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-100 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Reported card use</p>
              <p className="mt-2 text-3xl font-black text-slate-950">{utilization}%</p>
            </div>
            <div className="rounded-lg bg-slate-100 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Profile range</p>
              <p className="mt-2 text-3xl font-black text-slate-950">{profile.score_range}</p>
            </div>
            <div className="rounded-lg bg-slate-100 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Plan status</p>
              <p className="mt-2 text-3xl font-black text-slate-950">Active</p>
            </div>
          </div>
          <div className="mt-5 rounded-lg bg-slate-950 p-5 text-white">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-500">
                <Route className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-200">Next best move</p>
                <h3 className="mt-2 text-xl font-black leading-7">{nextBestAction}</h3>
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <DashboardActionCard title="Run a Credit Move" body="Simulate likely direction before you act." icon={Route} onClick={() => navigate(`${BASE_PATH}/simulator`)} />
            <DashboardActionCard title="Explain My Score Drop" body="Match recent changes to common causes." icon={Search} onClick={() => navigate(`${BASE_PATH}/score-drop`)} />
            <DashboardActionCard title="View My Plan" body="Track action items and saved simulations." icon={ListChecks} onClick={() => navigate(`${BASE_PATH}/plan`)} />
            <DashboardActionCard title="Learn Credit Basics" body="Two-minute lessons in plain English." icon={GraduationCap} onClick={() => navigate(`${BASE_PATH}/learn`)} />
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xl shadow-slate-950/10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-950">Progress checklist</h2>
              <button type="button" onClick={() => navigate(`${BASE_PATH}/plan`)} className="text-sm font-extrabold text-blue-700">
                View plan
              </button>
            </div>
            <div className="mt-4 space-y-2">
              {actionPlanItems.slice(0, 3).map((item) => (
                <ActionItemCard
                  key={item.id}
                  item={item}
                  completed={completedItems.includes(item.id)}
                  onToggle={() =>
                    setCompletedItems((items) =>
                      items.includes(item.id) ? items.filter((id) => id !== item.id) : [...items, item.id],
                    )
                  }
                />
              ))}
            </div>
          </section>
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xl shadow-slate-950/10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-950">Saved simulations</h2>
              <span className="text-sm font-bold text-slate-500">{savedSimulations.length}</span>
            </div>
            {savedSimulations.length === 0 ? (
              <p className="mt-3 text-sm leading-6 text-slate-600">No saved routes yet. Run a move and save the result to your plan.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {savedSimulations.slice(0, 3).map((simulation) => (
                  <div key={simulation.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-extrabold text-slate-950">{getScenarioTitle(simulation.scenario_type)}</p>
                    <p className="mt-1 text-xs font-bold text-slate-600">{simulation.result_direction}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}

function SimulatorScreen({ selectedScenario, setSelectedScenario, navigate }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <section className="mb-6 text-white">
        <p className="text-sm font-bold text-blue-200">Credit Move Simulator</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">What move are you thinking about making?</h1>
        <p className="mt-3 max-w-2xl text-slate-300">The simulator returns likely direction, confidence, risk, timing, and a better next move. It never predicts exact points.</p>
      </section>
      <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-2xl shadow-slate-950/20">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {scenarioOptions.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              icon={scenarioIcons[scenario.id]}
              selected={selectedScenario === scenario.id}
              onClick={() => {
                setSelectedScenario(scenario.id);
                navigate(`${BASE_PATH}/simulator/input`);
              }}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function scenarioFields(scenarioId) {
  const commonApplying = {
    id: 'applying_soon',
    label: 'Are you applying for anything soon?',
    type: 'boolean',
  };

  if (scenarioId === 'pay_down_credit_card') {
    return [
      { id: 'current_balance', label: 'Current balance', type: 'money' },
      { id: 'credit_limit', label: 'Credit limit', type: 'money' },
      { id: 'payoff_amount', label: 'Payoff amount', type: 'money' },
      { id: 'statement_date_known', label: 'Statement date known?', type: 'choice', options: ['Yes', 'No', 'Not sure'] },
      commonApplying,
    ];
  }

  if (scenarioId === 'close_card') {
    return [
      { id: 'card_limit', label: 'Limit on the card you may close', type: 'money' },
      { id: 'total_credit_limit', label: 'Total limits before closing', type: 'money' },
      { id: 'total_card_balance', label: 'Total card balances', type: 'money' },
      { id: 'card_age', label: 'How old is this card?', type: 'choice', options: ['Oldest card', 'Middle age', 'Newer card'] },
      commonApplying,
    ];
  }

  if (scenarioId === 'request_limit_increase') {
    return [
      { id: 'hard_pull_likely', label: 'Will the issuer use a hard pull?', type: 'boolean' },
      commonApplying,
    ];
  }

  if (scenarioId === 'pay_collection') {
    return [
      { id: 'inaccurate_item', label: 'Do you believe the collection is inaccurate?', type: 'boolean' },
      commonApplying,
    ];
  }

  if (scenarioId === 'open_new_card') {
    return [commonApplying];
  }

  return [commonApplying];
}

function SimulationField({ field, value, setValue }) {
  if (field.type === 'money') {
    return (
      <label className="block rounded-lg border border-slate-200 bg-white p-4">
        <span className="block text-sm font-extrabold text-slate-950">{field.label}</span>
        <span className="mt-3 flex rounded-lg bg-slate-100">
          <span className="flex items-center px-3 text-lg font-black text-slate-400">$</span>
          <input
            value={value ?? ''}
            onChange={(event) => setValue(event.target.value)}
            inputMode="numeric"
            className="min-w-0 flex-1 rounded-r-lg bg-transparent px-2 py-3 text-lg font-extrabold text-slate-950 outline-none"
          />
        </span>
      </label>
    );
  }

  if (field.type === 'choice') {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm font-extrabold text-slate-950">{field.label}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {field.options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setValue(option)}
              className={`rounded-lg border px-3 py-3 text-sm font-bold ${
                value === option ? 'border-blue-500 bg-blue-50 text-blue-950' : 'border-slate-200 text-slate-700 hover:border-blue-300'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (field.type === 'boolean') {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm font-extrabold text-slate-950">{field.label}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[true, false].map((option) => (
            <button
              key={String(option)}
              type="button"
              onClick={() => setValue(option)}
              className={`rounded-lg border px-3 py-3 text-sm font-bold ${
                value === option ? 'border-blue-500 bg-blue-50 text-blue-950' : 'border-slate-200 text-slate-700 hover:border-blue-300'
              }`}
            >
              {option ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

function SimulationInputScreen({
  selectedScenario,
  simulationInputs,
  setSimulationInputs,
  profile,
  setLastSimulation,
  navigate,
}) {
  const fields = scenarioFields(selectedScenario);

  const run = () => {
    const output = runSimulation(selectedScenario, simulationInputs, profile);
    setLastSimulation({
      id: `simulation-${Date.now()}`,
      user_id: 'local-demo-user',
      input_json: simulationInputs,
      saved_to_plan: false,
      created_at: new Date().toISOString(),
      ...output,
    });
    navigate(`${BASE_PATH}/simulator/result`);
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
      <button type="button" onClick={() => navigate(`${BASE_PATH}/simulator`)} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white">
        <ChevronLeft className="h-4 w-4" /> Choose another move
      </button>
      <section className="rounded-lg border border-slate-200 bg-slate-50 p-5 shadow-2xl shadow-slate-950/20">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Simulation input</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">{getScenarioTitle(selectedScenario)}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Use estimates. The result is directional and educational, not an exact score calculation.</p>
        <div className="mt-6 grid gap-3">
          {fields.map((field) => (
            <SimulationField
              key={field.id}
              field={field}
              value={simulationInputs[field.id]}
              setValue={(value) => setSimulationInputs((current) => ({ ...current, [field.id]: value }))}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={run}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-4 text-base font-extrabold text-white transition-colors hover:bg-blue-700"
        >
          Show estimated impact <ArrowRight className="h-5 w-5" />
        </button>
      </section>
    </main>
  );
}

function SimulationResultScreen({ lastSimulation, saveSimulation, navigate }) {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
      <button type="button" onClick={() => navigate(`${BASE_PATH}/simulator/input`)} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white">
        <ChevronLeft className="h-4 w-4" /> Adjust inputs
      </button>
      <SimulationResultCard result={lastSimulation} />
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <button type="button" onClick={saveSimulation} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-extrabold text-white transition-colors hover:bg-blue-700">
          <Save className="h-4 w-4" /> Save to My Plan
        </button>
        <button type="button" onClick={() => navigate(`${BASE_PATH}/simulator`)} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-950 transition-colors hover:bg-slate-50">
          Compare Another Move
        </button>
        <button type="button" onClick={() => navigate(`${BASE_PATH}/learn/credit-utilization`)} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-950 transition-colors hover:bg-slate-50">
          Learn Why This Matters
        </button>
      </div>
    </main>
  );
}

function ScoreDropScreen({ navigate }) {
  const [causeId, setCauseId] = useState('paid_off_loan');
  const explanation = explainScoreDrop(causeId);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <section className="mb-6 text-white">
        <p className="text-sm font-bold text-blue-200">Why Did My Score Drop?</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">What changed recently?</h1>
        <p className="mt-3 max-w-2xl text-slate-300">Pick the closest event. Credit scores react to what gets reported, not always what you did today.</p>
      </section>
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-2xl shadow-slate-950/20">
          <div className="grid gap-2 sm:grid-cols-2">
            {scoreDropCauses.map((cause) => (
              <button
                key={cause.id}
                type="button"
                onClick={() => setCauseId(cause.id)}
                className={`rounded-lg border p-3 text-left text-sm font-bold transition-colors ${
                  causeId === cause.id
                    ? 'border-blue-500 bg-blue-50 text-blue-950'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'
                }`}
              >
                {cause.label}
              </button>
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-xl shadow-slate-950/10">
          <div className="flex flex-wrap gap-2">
            <RiskBadge level={explanation.risk_level} />
            <TimelineBadge value="Depends on reporting" />
          </div>
          <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950">Likely reason</h2>
          <p className="mt-3 text-lg font-extrabold leading-7 text-blue-900">{explanation.likely_reason}</p>
          <div className="mt-6 grid gap-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-950">What it means</h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">{explanation.what_it_means}</p>
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-950">Whether to worry</h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">{explanation.whether_to_worry}</p>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <h3 className="text-sm font-extrabold text-blue-950">What to do next</h3>
              <p className="mt-2 text-sm leading-6 text-blue-900">{explanation.next_step}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(`${BASE_PATH}/learn/${explanation.related_lesson}`)}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-blue-700"
          >
            Open related lesson <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      </div>
    </main>
  );
}

function LearnScreen({ navigate }) {
  const categories = ['All', ...Array.from(new Set(lessons.map((lesson) => lesson.category)))];
  const [category, setCategory] = useState('All');
  const filtered = category === 'All' ? lessons : lessons.filter((lesson) => lesson.category === category);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <section className="mb-6 text-white">
        <p className="text-sm font-bold text-blue-200">Credit School</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Two-minute lessons. Plain English.</h1>
      </section>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-extrabold ${
              category === item ? 'bg-blue-500 text-white' : 'bg-white/10 text-white hover:bg-white/15'
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((lesson) => (
          <LessonCard key={lesson.id} lesson={lesson} onClick={() => navigate(`${BASE_PATH}/learn/${lesson.id}`)} />
        ))}
      </section>
    </main>
  );
}

function LessonDetailScreen({ route, navigate }) {
  const slug = route.split('/').filter(Boolean).pop();
  const lesson = lessons.find((item) => item.id === slug) || lessons[0];

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:py-12">
      <button type="button" onClick={() => navigate(`${BASE_PATH}/learn`)} className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-slate-300 hover:text-white">
        <ChevronLeft className="h-4 w-4" /> Credit School
      </button>
      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-950/20">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">{lesson.category} - {lesson.reading_level}</p>
        <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight text-slate-950">{lesson.title}</h1>
        <div className="mt-7 space-y-6">
          <section>
            <h2 className="text-sm font-extrabold text-slate-950">Simple explanation</h2>
            <p className="mt-2 text-base leading-7 text-slate-700">{lesson.simple}</p>
          </section>
          <section className="rounded-lg bg-slate-100 p-4">
            <h2 className="text-sm font-extrabold text-slate-950">Real-world example</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">{lesson.example}</p>
          </section>
          <section className="rounded-lg bg-amber-50 p-4">
            <h2 className="text-sm font-extrabold text-amber-950">Mistake to avoid</h2>
            <p className="mt-2 text-sm leading-6 text-amber-900">{lesson.mistake}</p>
          </section>
          <section className="rounded-lg bg-blue-50 p-4">
            <h2 className="text-sm font-extrabold text-blue-950">Action step</h2>
            <p className="mt-2 text-sm leading-6 text-blue-900">{lesson.action}</p>
          </section>
        </div>
        <button
          type="button"
          onClick={() => navigate(`${BASE_PATH}/simulator`)}
          className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-4 text-sm font-extrabold text-white transition-colors hover:bg-blue-700"
        >
          Open related simulator <ArrowRight className="h-4 w-4" />
        </button>
      </article>
    </main>
  );
}

function OffersScreen({ clickCount, onReview }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <section className="mb-6 text-white">
        <p className="text-sm font-bold text-blue-200">Recommended tools</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Tools that may fit your current goal</h1>
        <p className="mt-3 max-w-2xl text-slate-300">Educational recommendations only. No pre-approved claims, approval promises, or guaranteed score language.</p>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {offers.map((offer) => (
          <OfferCard key={offer.id} offer={offer} onReview={onReview} />
        ))}
      </section>
      <p className="mt-5 rounded-lg border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600">
        {OFFER_DISCLAIMER} Local review events recorded this session: {clickCount}.
      </p>
    </main>
  );
}

function ConsultationScreen({ profile }) {
  const [form, setForm] = useState({
    reason: profile.has_collections ? 'Collections or negative items' : 'Deeper credit review',
    credit_goal: getGoalTitle(profile.primary_goal),
    notes: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const submit = (event) => {
    event.preventDefault();
    const request = {
      id: `consultation-${Date.now()}`,
      user_id: 'local-demo-user',
      status: 'requested',
      created_at: new Date().toISOString(),
      ...form,
    };
    try {
      const existing = JSON.parse(window.localStorage.getItem('limitless-credit-gps-consultations') || '[]');
      window.localStorage.setItem('limitless-credit-gps-consultations', JSON.stringify([request, ...existing]));
    } catch {
      // Best-effort local MVP event.
    }
    setSubmitted(true);
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
      <section className="mb-6 text-white">
        <p className="text-sm font-bold text-blue-200">Professional review</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Need a deeper credit review?</h1>
        <p className="mt-3 max-w-2xl text-slate-300">
          If your report contains inaccurate, outdated, or questionable negative items, Limitless Credit may be able to help you understand your options.
        </p>
      </section>
      <form onSubmit={submit} className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-950/20">
        {submitted ? (
          <div className="rounded-lg bg-teal-50 p-5 text-teal-900">
            <h2 className="text-xl font-black">Review request saved</h2>
            <p className="mt-2 text-sm leading-6">This MVP stores the request locally. A backend can connect this to Supabase and CRM workflows next.</p>
          </div>
        ) : null}
        <div className="grid gap-4">
          <label className="block">
            <span className="text-sm font-extrabold text-slate-950">Reason</span>
            <input
              value={form.reason}
              onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-blue-500"
            />
          </label>
          <label className="block">
            <span className="text-sm font-extrabold text-slate-950">Credit goal</span>
            <input
              value={form.credit_goal}
              onChange={(event) => setForm((current) => ({ ...current, credit_goal: event.target.value }))}
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-blue-500"
            />
          </label>
          <label className="block">
            <span className="text-sm font-extrabold text-slate-950">Notes</span>
            <textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              rows={5}
              className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-blue-500"
              placeholder="What would you like reviewed?"
            />
          </label>
        </div>
        <p className="mt-5 rounded-lg bg-slate-100 p-3 text-xs leading-5 text-slate-600">{CONSULTATION_DISCLAIMER}</p>
        <button type="submit" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-4 text-sm font-extrabold text-white transition-colors hover:bg-blue-700">
          Request Review <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </main>
  );
}

function PlanScreen({ completedItems, setCompletedItems, savedSimulations, navigate }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <section className="mb-6 text-white">
        <p className="text-sm font-bold text-blue-200">Action roadmap</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Your next moves</h1>
      </section>
      <div className="grid gap-5 lg:grid-cols-[0.8fr_0.5fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-950/20">
          <h2 className="text-xl font-black text-slate-950">Action checklist</h2>
          <div className="mt-4 space-y-3">
            {actionPlanItems.map((item) => (
              <ActionItemCard
                key={item.id}
                item={item}
                completed={completedItems.includes(item.id)}
                onToggle={() =>
                  setCompletedItems((items) =>
                    items.includes(item.id) ? items.filter((id) => id !== item.id) : [...items, item.id],
                  )
                }
              />
            ))}
          </div>
        </section>
        <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-xl shadow-slate-950/10">
          <h2 className="text-xl font-black text-slate-950">Saved simulations</h2>
          {savedSimulations.length === 0 ? (
            <div className="mt-4 rounded-lg bg-slate-100 p-4">
              <p className="text-sm leading-6 text-slate-600">Run a simulation, then save the result to compare credit moves.</p>
              <button type="button" onClick={() => navigate(`${BASE_PATH}/simulator`)} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-extrabold text-white">
                Run a Credit Move <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {savedSimulations.map((simulation) => (
                <div key={simulation.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-black text-slate-950">{getScenarioTitle(simulation.scenario_type)}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <ConfidenceBadge level={simulation.confidence_level} />
                    <RiskBadge level={simulation.risk_level} />
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-600">{simulation.recommended_next_action}</p>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

export default function LimitlessCreditGPS() {
  const stored = useMemo(loadStoredState, []);
  const [route, setRoute] = useState(() => normalizePath());
  const [profile, setProfile] = useState(() => ({ ...defaultProfile, ...(stored?.profile || {}) }));
  const [selectedScenario, setSelectedScenario] = useState(stored?.selectedScenario || 'pay_down_credit_card');
  const [simulationInputs, setSimulationInputs] = useState(() => ({
    ...defaultSimulationInputs,
    ...(stored?.simulationInputs || {}),
  }));
  const [lastSimulation, setLastSimulation] = useState(() => stored?.lastSimulation || runSimulation('pay_down_credit_card', defaultSimulationInputs, defaultProfile));
  const [savedSimulations, setSavedSimulations] = useState(() => stored?.savedSimulations || []);
  const [completedItems, setCompletedItems] = useState(() => stored?.completedItems || []);
  const [offerClicks, setOfferClicks] = useState(() => stored?.offerClicks || []);

  const screen = getRouteScreen(route);
  const profileRisk = estimateProfileRisk(profile);
  const nextBestAction = getNextBestAction(profile);

  useEffect(() => {
    const onPopState = () => setRoute(normalizePath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    let manifest = document.querySelector('link[data-creditgps-manifest]');
    if (!manifest) {
      manifest = document.createElement('link');
      manifest.rel = 'manifest';
      manifest.setAttribute('data-creditgps-manifest', 'true');
      document.head.appendChild(manifest);
    }
    manifest.href = '/limitless/manifest.webmanifest';
  }, []);

  useEffect(() => {
    persistState({
      profile,
      selectedScenario,
      simulationInputs,
      lastSimulation,
      savedSimulations,
      completedItems,
      offerClicks,
    });
  }, [profile, selectedScenario, simulationInputs, lastSimulation, savedSimulations, completedItems, offerClicks]);

  const navigate = (path) => {
    const normalized = normalizePath(path);
    window.history.pushState({}, '', normalized === BASE_PATH ? `${BASE_PATH}/` : `${normalized}/`);
    setRoute(normalized);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateProfile = (updates) => {
    setProfile((current) => ({ ...current, ...updates }));
  };

  const saveSimulation = () => {
    if (!lastSimulation) return;
    setSavedSimulations((current) => {
      const exists = current.some((item) => item.id === lastSimulation.id);
      if (exists) return current;
      return [{ ...lastSimulation, saved_to_plan: true }, ...current];
    });
    navigate(`${BASE_PATH}/plan`);
  };

  const handleOfferReview = (offer) => {
    setOfferClicks((current) => [
      {
        id: `offer-click-${Date.now()}`,
        user_id: 'local-demo-user',
        offer_id: offer.id,
        placement: 'offers_page',
        clicked_at: new Date().toISOString(),
      },
      ...current,
    ]);
  };

  const renderScreen = () => {
    switch (screen) {
      case 'onboarding':
        return <OnboardingScreen profile={profile} updateProfile={updateProfile} navigate={navigate} />;
      case 'quiz':
        return <QuizScreen profile={profile} updateProfile={updateProfile} navigate={navigate} />;
      case 'dashboard':
        return (
          <DashboardScreen
            profile={profile}
            profileRisk={profileRisk}
            nextBestAction={nextBestAction}
            savedSimulations={savedSimulations}
            completedItems={completedItems}
            setCompletedItems={setCompletedItems}
            navigate={navigate}
          />
        );
      case 'simulator':
        return <SimulatorScreen selectedScenario={selectedScenario} setSelectedScenario={setSelectedScenario} navigate={navigate} />;
      case 'simulation-input':
        return (
          <SimulationInputScreen
            selectedScenario={selectedScenario}
            simulationInputs={simulationInputs}
            setSimulationInputs={setSimulationInputs}
            profile={profile}
            setLastSimulation={setLastSimulation}
            navigate={navigate}
          />
        );
      case 'simulation-result':
        return <SimulationResultScreen lastSimulation={lastSimulation} saveSimulation={saveSimulation} navigate={navigate} />;
      case 'score-drop':
        return <ScoreDropScreen navigate={navigate} />;
      case 'learn':
        return <LearnScreen navigate={navigate} />;
      case 'lesson-detail':
        return <LessonDetailScreen route={route} navigate={navigate} />;
      case 'offers':
        return <OffersScreen clickCount={offerClicks.length} onReview={handleOfferReview} />;
      case 'consultation':
        return <ConsultationScreen profile={profile} />;
      case 'plan':
        return <PlanScreen completedItems={completedItems} setCompletedItems={setCompletedItems} savedSimulations={savedSimulations} navigate={navigate} />;
      default:
        return <WelcomeScreen navigate={navigate} profileRisk={profileRisk} nextBestAction={nextBestAction} />;
    }
  };

  return (
    <AppShell screen={screen} navigate={navigate}>
      {renderScreen()}
      <nav className="border-t border-slate-200 bg-white/95 px-3 py-2 shadow-2xl backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          {[
            ['Plan', `${BASE_PATH}/dashboard`, Target],
            ['Move', `${BASE_PATH}/simulator`, Route],
            ['Drop', `${BASE_PATH}/score-drop`, Search],
            ['Learn', `${BASE_PATH}/learn`, BookOpen],
          ].map(([label, path, Icon]) => (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              className="flex flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-black text-slate-700 hover:bg-slate-100"
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </AppShell>
  );
}
