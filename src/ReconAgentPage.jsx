import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle,
  Clock,
  CreditCard,
  Mail,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';

const FOUNDER_PRICE = '$17/mo';
const BUILD_CHECKOUT_URL = import.meta.env.VITE_RECON_AGENT_CHECKOUT_URL || '';

const dailySteps = [
  {
    title: 'Tracks Every Dollar',
    description: 'Watches your Stripe account 24/7. Sales, fees, refunds, and payouts are automatically tracked.',
    icon: <CreditCard className="h-5 w-5 text-cyan-300" />,
  },
  {
    title: 'Organizes Your Inbox',
    description: 'No more digging for receipts. We match your invoice emails and payout alerts directly to your Stripe data.',
    icon: <Mail className="h-5 w-5 text-emerald-300" />,
  },
  {
    title: 'Spots The Anomalies',
    description: 'Late refunds? Unmatched payouts? We flag exactly what needs your attention so nothing slips through the cracks.',
    icon: <AlertTriangle className="h-5 w-5 text-amber-300" />,
  },
  {
    title: 'Your Personal CFO',
    description: 'Ask questions about your revenue just like you\'d ask a real bookkeeper. "Why was yesterday\'s payout short?"',
    icon: <MessageSquare className="h-5 w-5 text-fuchsia-300" />,
  },
];

const includedItems = [
  '1 Stripe account',
  '1 finance inbox or forwarding alias',
  'A daily “what happened” report',
  'A short list of problems to check',
  'Plain-English explanations',
  'CSV export for your bookkeeper or accountant',
  'Founder onboarding help',
];

const reportLines = [
  { label: 'Payments that matched', value: '148', tone: 'text-white' },
  { label: 'Money that looks off', value: '$31.42', tone: 'text-amber-300' },
  { label: 'Refunds to review', value: '2', tone: 'text-rose-300' },
  { label: 'Receipt emails to check', value: '4', tone: 'text-cyan-300' },
];

function scrollToReserve() {
  const section = document.getElementById('reserve-form');
  if (!section) {
    return;
  }

  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function ReconAgentPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    monthlyVolume: '',
    notes: '',
  });
  const [formStatus, setFormStatus] = useState('idle');
  const [formError, setFormError] = useState('');
  const [runtimeCheckoutUrl, setRuntimeCheckoutUrl] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadRuntimeConfig() {
      try {
        const response = await fetch('/recon-agent-config.json', { cache: 'no-store' });
        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        const checkoutUrl = String(payload?.checkoutUrl || '').trim();

        if (!cancelled && checkoutUrl) {
          setRuntimeCheckoutUrl(checkoutUrl);
        }
      } catch {
        // The page keeps working without runtime config.
      }
    }

    loadRuntimeConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  const checkoutUrl = runtimeCheckoutUrl || BUILD_CHECKOUT_URL;
  const primaryCtaLabel = checkoutUrl ? `Buy now for ${FOUNDER_PRICE}` : 'Join the founder beta';
  const supportCtaLabel = checkoutUrl ? 'Ask a question first' : 'Talk to us first';
  const timelineCards = [
    {
      time: '6:31 AM',
      title: 'The Math is Done',
      detail: '148 Stripe updates were successfully reconciled with 34 receipt emails.',
      tone: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100',
    },
    {
      time: '6:33 AM',
      title: '3 things need a quick look',
      detail: 'A payout total looks short, and 2 manual refunds need to be matched.',
      tone: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
    },
    {
      time: '6:36 AM',
      title: 'Summary is ready',
      detail: 'Your beautiful, 60-second morning briefing is ready to read.',
      tone: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
    },
  ];

  const updateField = (field, value) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Please enter your name.');
      return;
    }

    if (!formData.email.trim()) {
      setFormError('Please enter your email.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setFormError('Please enter a valid email address.');
      return;
    }

    setFormStatus('submitting');

    try {
      await fetch('https://formsubmit.co/ajax/richducat@gmail.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          serviceNeed: 'recon-agent-founder-beta',
          offerName: 'Recon Agent Founder Beta',
          price: FOUNDER_PRICE,
          sourcePage: 'reconcile.eb28.co',
        }),
      });

      setFormStatus('success');
    } catch (error) {
      setFormError('Something went wrong. Please try again.');
      setFormStatus('error');
    }
  };

  return (
    <main className="eb28-appbuilder font-body relative min-h-screen overflow-hidden text-slate-100">
      <div className="eb28-appbuilder-noise pointer-events-none absolute inset-0" />

      <section className="relative overflow-hidden px-4 pb-20 pt-24 sm:px-6 lg:px-8 lg:pb-28 lg:pt-28">
        <div className="absolute inset-x-0 top-0 -z-10 h-[36rem] bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.22),transparent_52%),radial-gradient(circle_at_80%_20%,rgba(244,114,182,0.16),transparent_30%)]" />

        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_28rem] lg:items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Founder beta now open
              </div>

              <h1 className="font-brand mt-6 max-w-4xl text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
                Stop wrestling with Stripe payout math every morning.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                Recon Agent acts as your personal AI financial assistant. It automatically matches your Stripe activity with your emails, giving you a 60-second daily briefing on exactly where your money went.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                {checkoutUrl ? (
                  <a
                    href={checkoutUrl}
                    className="inline-flex items-center justify-center rounded-full bg-white px-7 py-4 text-base font-bold text-slate-950 transition-transform hover:-translate-y-0.5 hover:bg-cyan-50"
                  >
                    {primaryCtaLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={scrollToReserve}
                    className="inline-flex items-center justify-center rounded-full bg-white px-7 py-4 text-base font-bold text-slate-950 transition-transform hover:-translate-y-0.5 hover:bg-cyan-50"
                  >
                    {primaryCtaLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </button>
                )}

                <a
                  href="mailto:richducat@gmail.com?subject=Recon%20Agent%20Founder%20Beta"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-7 py-4 text-base font-semibold text-white transition-colors hover:bg-white/10"
                >
                  {supportCtaLabel}
                </a>
              </div>

              <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-300">
                <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2">Founder price: {FOUNDER_PRICE}</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">No annual contract</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Made for people who use Stripe and hate manual checking</span>
              </div>

              <div className="mt-10 max-w-2xl rounded-[2rem] border border-white/10 bg-slate-950/60 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">Setup Takes 5 Minutes</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Just connect your Stripe account and forward your receipt emails. We handle the messy reconciliation so you can focus on your business.
                    </p>
                  </div>
                  <div className="inline-flex items-center rounded-full border border-emerald-400/20 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Done For You
                  </div>
                </div>
              </div>
            </div>

            <div className="eb28-panel eb28-gradient-border relative overflow-hidden rounded-[2rem] p-6">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_50%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.96))]" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Morning briefing</p>
                    <h2 className="mt-2 font-brand text-2xl font-bold text-white">Your 60-Second Daily Briefing</h2>
                  </div>
                  <div className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
                    Ready
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  {reportLines.map((line) => (
                    <div key={line.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{line.label}</p>
                      <p className={`mt-3 text-2xl font-bold ${line.tone}`}>{line.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-3">
                  {timelineCards.map((card) => (
                    <div key={card.title} className={`rounded-2xl border px-4 py-4 ${card.tone}`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold">{card.title}</p>
                        <span className="text-[11px] uppercase tracking-[0.18em] opacity-80">{card.time}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 opacity-90">{card.detail}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/80 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-200">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Ask the report questions</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Plain-English answers</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-300">
                    “Yesterday&apos;s payout is short by $31.42 because two refunds came in after the payout was created. I already grouped the related emails for you.”
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[18rem_minmax(0,1fr)]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">How it works</p>
              <h2 className="font-brand mt-4 text-3xl font-bold text-white sm:text-4xl">
                What it does each day.
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-300">
                You do not get a giant dashboard. You get a simple daily check, a short list of issues, and clear answers about what changed.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {dailySteps.map((step) => (
                <div key={step.title} className="rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-6 backdrop-blur">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
                    {step.icon}
                  </div>
                  <h3 className="mt-5 font-brand text-xl font-bold text-white">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-300">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_23rem]">
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/60 shadow-2xl shadow-slate-950/30">
            <div className="border-b border-white/10 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">See exactly what you'll wake up to</p>
              <h2 className="font-brand mt-2 text-2xl font-bold text-white">An update you can actually understand</h2>
            </div>

            <div className="grid gap-0 md:grid-cols-[16rem_minmax(0,1fr)]">
              <div className="border-b border-white/10 bg-white/[0.03] p-6 md:border-b-0 md:border-r">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-emerald-200">Looks good</p>
                    <p className="mt-2 text-sm leading-6 text-emerald-50">Most of the day matched cleanly.</p>
                  </div>
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-amber-200">Needs a quick check</p>
                    <p className="mt-2 text-sm leading-6 text-amber-50">Two refund emails still need to be matched.</p>
                  </div>
                  <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Ready to share</p>
                    <p className="mt-2 text-sm leading-6 text-cyan-50">Your CSV and notes are ready for your bookkeeper.</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="space-y-5 text-sm leading-7 text-slate-300">
                  <p className="text-base font-semibold text-white">Thursday summary</p>
                  <p>
                    Stripe had 148 updates and 34 emails worth checking. Most of it matched. The biggest thing to review is a <strong className="text-amber-200">$31.42</strong> payout difference caused by two refunds that came in later.
                  </p>
                  <p>
                    Nothing here looks scary. One person can clear the open items quickly: confirm the refund timing, note the payout difference, and clean up the repeated receipt emails.
                  </p>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Example question</p>
                    <p className="mt-3 text-sm text-slate-100">
                      “Show me anything from the last 7 days that could change my payout total, and write notes my bookkeeper can use.”
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-cyan-400/20 bg-cyan-500/10 p-6">
            <div className="flex items-center gap-3 text-cyan-100">
              <BarChart3 className="h-5 w-5" />
              <p className="text-xs font-semibold uppercase tracking-[0.22em]">Founder beta</p>
            </div>
            <div className="mt-4">
              <p className="font-brand text-5xl font-extrabold text-white">{FOUNDER_PRICE}</p>
              <p className="mt-2 text-sm leading-6 text-cyan-50">
                A simple monthly tool for people who want Stripe checked every day without doing it by hand.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {includedItems.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
                  <span className="text-sm leading-6 text-white">{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/45 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Best fit</p>
              <p className="mt-3 text-sm leading-6 text-slate-100">
                Consultants, agencies, info-product creators, coaches, memberships, and businesses ready to eliminate their Stripe headaches forever.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section id="reserve-form" className="px-4 pb-24 pt-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-[2.25rem] border border-white/10 bg-slate-950/70 p-8 shadow-2xl shadow-slate-950/40 backdrop-blur md:p-12">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-200">
                {checkoutUrl ? 'Buy now' : 'Join the founder beta'}
              </p>
              <h2 className="font-brand mt-3 text-3xl font-bold text-white sm:text-4xl">
                {checkoutUrl ? 'Start your plan and we will help you get set up.' : 'Tell us a little about your setup and we will reach out.'}
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
                {checkoutUrl
                  ? 'You can buy the founder plan right now, or send your details first if you want help before paying.'
                  : 'We are opening this up customer by customer so setup stays smooth. Send your info and we will help you get started.'}
              </p>

              {formStatus === 'success' ? (
                <div className="mt-8 rounded-[1.75rem] border border-emerald-400/20 bg-emerald-500/10 p-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-emerald-200" />
                    <p className="font-brand text-2xl font-bold text-white">You are on the list</p>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-emerald-50">
                    We have your details and will follow up with next steps. Expect a same-day response while founder spots are open.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setFormStatus('idle');
                      setFormData({
                        name: '',
                        email: '',
                        company: '',
                        monthlyVolume: '',
                        notes: '',
                      });
                    }}
                    className="mt-6 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15"
                  >
                    Submit another request
                  </button>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="mt-8 space-y-5">
                  {formError ? (
                    <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                      {formError}
                    </div>
                  ) : null}

                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-300">Name *</span>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(event) => updateField('name', event.target.value)}
                        placeholder="Richard Ducat"
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/30"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-300">Email *</span>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(event) => updateField('email', event.target.value)}
                        placeholder="you@company.com"
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/30"
                      />
                    </label>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-300">Company</span>
                      <input
                        type="text"
                        value={formData.company}
                        onChange={(event) => updateField('company', event.target.value)}
                        placeholder="EB28 LLC"
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/30"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-300">About how much do you run through Stripe each month?</span>
                      <input
                        type="text"
                        value={formData.monthlyVolume}
                        onChange={(event) => updateField('monthlyVolume', event.target.value)}
                        placeholder="$10k, $80k, 2,500 transactions, etc."
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/30"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-300">What feels messy or confusing right now?</span>
                    <textarea
                      rows="5"
                      value={formData.notes}
                      onChange={(event) => updateField('notes', event.target.value)}
                      placeholder="For example: payouts do not match, refund emails are hard to track, my bookkeeper keeps asking questions, or I spend too much time checking numbers."
                      className="w-full rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none transition focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/30"
                    />
                  </label>

                  <div className="flex flex-col gap-4 sm:flex-row">
                    <button
                      type="submit"
                      disabled={formStatus === 'submitting'}
                      className="inline-flex items-center justify-center rounded-full bg-white px-7 py-4 text-base font-bold text-slate-950 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {formStatus === 'submitting' ? 'Sending...' : checkoutUrl ? 'Talk to us first' : 'Join the founder beta'}
                    </button>

                    {checkoutUrl ? (
                      <a
                        href={checkoutUrl}
                        className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-7 py-4 text-base font-semibold text-white transition-colors hover:bg-white/10"
                      >
                        Buy now for {FOUNDER_PRICE}
                      </a>
                    ) : null}
                  </div>
                </form>
              )}
            </div>

            <aside className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Why people want this</p>
              <div className="mt-5 space-y-5 text-sm leading-7 text-slate-300">
                <p>
                  You built a business to gain freedom, not to become a part-time bookkeeper digging through emails and spreadsheets.
                </p>
                <p>
                  Recon Agent bridges the massive gap between doing it all by hand and paying thousands for a full finance department.
                </p>
                <p>
                  Wake up, read your beautiful briefing, easily resolve the anomalies, and get back to growing your business.
                </p>
              </div>

              <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-cyan-200" />
                  <p className="text-sm font-semibold text-white">Fast reply</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-cyan-50">Same-day replies for setup questions and first-pass onboarding.</p>
              </div>

              <a href="/" className="mt-6 inline-flex items-center text-sm font-semibold text-cyan-200 hover:text-cyan-100">
                Back to eb28.co
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
