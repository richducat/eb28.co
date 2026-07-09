import React, { useEffect, useState } from 'react';
import SiteNav from './SiteNav.jsx';
import { TickerTape, LiveChart, WATCHLIST } from './TradingView.jsx';
import {
  Check,
  ChevronRight,
  ClipboardList,
  HardHat,
  Power,
  Radio,
  ScrollText,
  ShieldCheck,
  Wallet,
} from 'lucide-react';

// On the dedicated daytradingbot.net domain the same page wears the domain
// brand; the desk itself is still named Bluechip everywhere in the copy.
const ON_DTB_DOMAIN =
  typeof window !== 'undefined' &&
  /(^|\.)daytradingbot\.net$/.test(window.location.hostname.toLowerCase());
const BRAND = ON_DTB_DOMAIN ? 'DayTradingBot' : 'EB28';
const BRAND_SUB = ON_DTB_DOMAIN ? 'by EB28' : 'Bluechip';

const CHECKOUT_URL = 'https://buy.stripe.com/4gM28qdxjfZO9mU5UqbbG0T';
const PRICE_USD = 98;
const QUESTIONS_URL = 'mailto:social@eb28.co?subject=Bluechip%20question';
const TAPE_URL = '/fundmanager/';
const DESKOS_URL = '/deskos/';

const AFTER_YOU_PAY = [
  'Instant Stripe receipt to your email. Card handled by Stripe — we never see your number.',
  'Within 24 hours: a personal onboarding email from a human with your license, the plain-English install guide, and your first paper-mode session scheduled if you want a hand. Then the Setup Portal at eb28.co/setup walks you through the rest, one click at a time.',
  'Your desk starts in paper mode. It cannot touch real money until you deliberately flip it live yourself.',
  '30-day get-it-running guarantee: genuinely try and can’t get your desk running in paper mode? Email social@eb28.co with your Stripe receipt within 30 days — full refund to your card through Stripe, and you keep the code.',
];

const WHAT_BLUECHIP_IS_NOT = [
  {
    title: 'Not a fund',
    body: 'We never hold your money, never touch your account. You buy software; your dollars stay at your broker, in a sub-account only you control.',
  },
  {
    title: 'Not advice',
    body: 'We never tell you what to buy and we make no predictions. The desk follows written rules you can read, and you hold every switch.',
  },
  {
    title: 'Not Robinhood',
    body: 'Robinhood does not endorse or sponsor EB28. We connect through their official Agentic Trading API — the public front door they built for agents.',
  },
];

const PLAIN_ENGLISH = [
  {
    term: 'Paper mode',
    plain: 'The desk pretends to trade. It watches real prices and writes down every decision it would make, but no real money moves. This is how your desk starts, and you can stay here as long as you want.',
  },
  {
    term: 'Agentic sub-account',
    plain: 'A separate compartment inside your Robinhood account that you create. The desk lives there and only there — it physically cannot reach the rest of your money.',
  },
  {
    term: 'Kill switch',
    plain: 'One control that stops everything, everywhere, immediately. You hold it, not us. There is also one switch to go live and one switch to go back to paper.',
  },
  {
    term: 'The tape',
    plain: 'The running public record of every decision the desk makes — buys, passes, and losses, all in the same font on the same page. Ours is at eb28.co/fundmanager.',
  },
];

const MANIFESTO = [
  'Somewhere on a trading floor, there’s a name for you. Dumb money. That’s the nurse buying one share of Apple after a night shift. The electrician putting a little into an index fund for his kids. The teacher reading earnings reports on her lunch break. They say it in meetings. They print it in research notes. They mean you.',
  'Here’s what we know about that money. It got earned. Every dollar of it. It came from shifts and invoices and overtime, from work you can point to. Nobody handed it over in a bonus pool. Calling it dumb tells you nothing about the money. It tells you plenty about the people saying it.',
  'The institutions that use that word have desks. Agents watching the market all day. Journals, risk limits, kill switches, a process. You got an app with confetti. Nobody calls a carpenter dumb for using a hand saw while the shop next door runs CNC machines. That’s the real gap. Not intelligence. Equipment.',
  'Bluechip is a desk. A small one, an honest one, built safety-first, that a working person can run. It won’t promise you profits. Nothing honest can. It gives you tools, discipline, and a tape you can check. Ours is public. Losses included. Come look before you spend a dime.',
];

const SPECS = [
  'Trades through Robinhood’s official Agentic Trading API (agent.robinhood.com). No password-scraping bots, no gray-area hacks. Robinhood does not endorse or sponsor EB28; we just use the front door.',
  'Every order passes Robinhood’s own broker-side review step before it goes anywhere.',
  'Confined to a dedicated, isolated Robinhood Agentic sub-account that you create. It cannot touch the rest of your money.',
  'Watches eight names: AAPL, NVDA, TSLA, MSFT, GOOGL, AMD, SPY, QQQ. Buys small $5 fractional dips, max two per 15-minute cycle. Small by design during beta.',
  'Runs behind the full EB28 Desk OS safety stack: gated runner, global kill switch, paper-and-review mode first, one switch live, one switch back, full journal of everything.',
  'Radical transparency: every decision streams to the public dashboard, including losses. The tape is never edited — wins and losses print in the same font.',
];

const HOW_IT_WORKS = [
  {
    icon: Wallet,
    step: 'Step 01',
    title: 'Open the sub-account',
    body: 'You create a dedicated Robinhood Agentic sub-account. Bluechip lives there and only there. Your main account stays yours alone.',
  },
  {
    icon: ClipboardList,
    step: 'Step 02',
    title: 'Run it on paper',
    body: 'The desk starts in paper-and-review mode. Watch it flag $5 fractional dips on the eight names it covers. Read the journal. Take your time. Nothing goes live until you say so.',
  },
  {
    icon: Power,
    step: 'Step 03',
    title: 'Flip one switch',
    body: 'When you’re ready, one switch goes live. Small clips, two per 15-minute cycle, every order through Robinhood’s broker-side review. One switch back stops it. The global kill switch is always in reach.',
  },
  {
    icon: ScrollText,
    step: 'Step 04',
    title: 'Check the tape',
    body: 'Every decision prints to your journal and to the public dashboard. Wins and losses, same font, same page. Like a contractor showing references, all of them.',
  },
];

const FAQS = [
  {
    q: 'How does EB28 make money on this?',
    a: 'You pay $98 once for a software license. That is the entire business. We take no cut of your trades, we earn nothing when you trade more, we never hold your money, and there is no subscription. If we ever add paid products, they will be priced in plain dollars on a page like this one.',
  },
  {
    q: 'Will Bluechip make me money?',
    a: 'We don’t know, and we won’t pretend to. Bluechip is licensed software you operate, not a money machine. It trades small $5 fractional clips during beta, and you can lose the money you trade. What we sell is the desk: tools, discipline, transparency, and control. The outcomes are the market’s business, not our marketing.',
  },
  {
    q: 'Is EB28 affiliated with Robinhood?',
    a: 'No. Robinhood does not endorse or sponsor EB28 or Bluechip. The desk connects through Robinhood’s official Agentic Trading API at agent.robinhood.com, the way any authorized agentic client does, and every order still passes Robinhood’s own broker-side review step.',
  },
  {
    q: 'Is this a fund or investment advice?',
    a: 'Neither. Bluechip is licensed software that you buy and operate. We never hold your money, never manage your account, and never tell you what to buy. It runs inside a dedicated Robinhood Agentic sub-account that you create and control, and it stays there.',
  },
  {
    q: 'What if I want to stop it?',
    a: 'One switch. The whole Desk OS stack was built around stopping: paper-first mode, a gated runner, a global kill switch, one switch live and one switch back. You’re the operator. The desk works for you, not the other way around.',
  },
];

const SAMPLE_TAPE = [
  { time: '12:49 PM ET', line: 'GOOGL down 1.95% vs previous close. Prepared a $5.00 dip buy for review.' },
  { time: '12:49 PM ET', line: 'Order passed Robinhood broker-side review. Desk in review mode — nothing placed.' },
  { time: '12:34 PM ET', line: 'Scanned 8 names. No dip past threshold. No action. Discipline is the feature.' },
  { time: '12:19 PM ET', line: 'Cycle complete. Every decision journaled. Tape is public, losses included.' },
];

const DISCLAIMER =
  'Bluechip is licensed software that you install and operate. It is not investment advice, not a fund, and not a financial service. Trading securities involves risk, and you can lose money, including everything you put in. Nothing on this page promises or implies profit. Activity shown on the public dashboard, good or bad, is a record of past activity and is not a prediction of future results. Robinhood and related marks belong to their owner, which does not endorse or sponsor EB28 or Bluechip.';

// Live demo: the same market the desk watches, plus the desk's actual most
// recent journal decision for the selected name — real product, no mockups.
function DeskDemo() {
  const [active, setActive] = useState('NVDA');
  const [actions, setActions] = useState([]);
  useEffect(() => {
    fetch('/data/fundmanager-public.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const acts = (d && Array.isArray(d.recentActions)) ? d.recentActions : [];
        setActions(acts.filter((a) => String(a.message || '').startsWith('Bluechip')));
      })
      .catch(() => {});
  }, []);
  const tv = WATCHLIST.find((w) => w.label === active) || WATCHLIST[0];
  const match = actions.find((a) => String(a.message || '').includes(active));
  return (
    <section className="border-b border-slate-200 bg-white py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Live demo</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">See what the desk sees.</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            This is the same market Bluechip watches all day. Pick a name — the panel shows the
            desk’s actual most-recent decision on it, straight from the journal.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {WATCHLIST.map(({ label }) => (
            <button
              key={label}
              onClick={() => setActive(label)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                active === label
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-300 bg-white text-slate-600 hover:border-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
            <LiveChart symbol={tv.symbol} />
          </div>
          <div className="flex flex-col gap-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">The desk’s rule</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Buy a <b className="text-slate-900">$5 fractional clip</b> when a watchlist name dips{' '}
                <b className="text-slate-900">≥1.5% below yesterday’s close</b>. Max{' '}
                <b className="text-slate-900">2 buys per 15-minute cycle</b>. Every order passes
                Robinhood’s own review step. That’s the whole rule — no vibes.
              </p>
            </div>
            <div className="flex-1 rounded-3xl bg-slate-900 p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Latest desk decision on {active}
              </p>
              {match ? (
                <p className="mt-3 text-sm leading-relaxed text-slate-200">{String(match.message).slice(0, 200)}</p>
              ) : (
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  No dip past the threshold on {active} in recent cycles — so the desk did nothing.
                  Doing nothing is a decision too. Discipline is the feature.
                </p>
              )}
              <a href={TAPE_URL} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-400 hover:text-orange-300">
                See every decision on the tape →
              </a>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              Chart and quotes by TradingView. The decision shown is the desk’s real journal entry —
              a record of past activity, not a recommendation or a prediction.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function BuyButton({ className = '' }) {
  return (
    <a
      href={CHECKOUT_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-full bg-orange-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-orange-700 ${className}`}
    >
      Get the founding beta — ${PRICE_USD}
      <ChevronRight className="h-4 w-4" aria-hidden="true" />
    </a>
  );
}

export default function BluechipPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
      <SiteNav active="/bluechip/" brand={BRAND} subtitle={BRAND_SUB} cta={{ href: CHECKOUT_URL, label: `Get the beta — $${PRICE_USD}` }} />
      <TickerTape />

      {/* Live tape banner */}
      <a
        href={TAPE_URL}
        className="block bg-amber-100 px-4 py-2.5 text-center text-sm font-medium text-amber-900 transition-colors hover:bg-amber-200"
      >
        <Radio className="mr-1.5 inline h-4 w-4 align-[-2px]" aria-hidden="true" />
        The tape is live right now — watch the desk work before you believe a word we say
        <ChevronRight className="ml-1 inline h-4 w-4 align-[-2px]" aria-hidden="true" />
      </a>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="mb-4 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-900">
              {ON_DTB_DOMAIN ? 'DayTradingBot · powered by the EB28 Bluechip desk · Live beta' : 'EB28 Bluechip · US equities desk · Live beta'}
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              They call it dumb money. We built it a desk.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              Bluechip is EB28’s flagship US-equities desk: small, honest, safety-first, and run by
              you. It trades through Robinhood’s official Agentic Trading API in a sub-account you
              create, behind a kill switch you hold. Every decision prints to a public tape, losses
              included.
            </p>
            <div className="mt-8 flex flex-col items-start gap-3">
              <BuyButton />
              <p className="text-sm text-slate-500">
                ${PRICE_USD} beta-tester price for the first 30 days (opened July 9) · one-time
                license · 30-day get-it-running guarantee
              </p>
            </div>
            <p className="mt-6 max-w-xl text-xs leading-relaxed text-slate-400">
              Bluechip is independent software. Robinhood does not endorse or sponsor EB28 or
              Bluechip. Trading involves risk of loss. Nothing on this page is investment advice.
            </p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-md rounded-3xl bg-slate-900 p-6 shadow-xl ring-1 ring-slate-200">
              <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  From the public tape
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true"></span>
                  Desk on duty
                </span>
              </div>
              <ul className="mt-4 space-y-4">
                {SAMPLE_TAPE.map(({ time, line }) => (
                  <li key={time + line} className="flex gap-3">
                    <span className="shrink-0 pt-0.5 font-mono text-[11px] text-slate-500">{time}</span>
                    <span className="text-sm leading-relaxed text-slate-300">{line}</span>
                  </li>
                ))}
              </ul>
              <a
                href={TAPE_URL}
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-400 hover:text-orange-300"
              >
                Watch the live tape
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* What Bluechip is NOT */}
      <section className="border-y border-slate-200 bg-white py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-3">
            {WHAT_BLUECHIP_IS_NOT.map(({ title, body }) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live demo — chart + the desk's real decisions */}
      <DeskDemo />

      {/* Manifesto */}
      <section className="border-b border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Read this first</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">The word they use for your money</h2>
            <div className="mt-6 space-y-5">
              {MANIFESTO.map((para) => (
                <p key={para.slice(0, 40)} className="text-base leading-relaxed text-slate-600">
                  {para}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Honest specs */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">Honest specs</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            Like the label on a good tool: what it does, what it won’t, and where the guard is.
          </p>
          <ul className="mx-auto mt-12 max-w-3xl space-y-4">
            {SPECS.map((spec) => (
              <li key={spec.slice(0, 40)} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" aria-hidden="true" />
                <span className="text-sm leading-relaxed text-slate-700">{spec}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">How you run it</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            Four steps. You stay the operator in every one of them.
          </p>
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {HOW_IT_WORKS.map(({ icon: Icon, step, title, body }) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100">
                  <Icon className="h-6 w-6 text-orange-700" aria-hidden="true" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">{step}</p>
                <h3 className="mt-1 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plain English definitions */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">Plain English, on purpose</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            Four terms you’ll see on this page, explained the way we’d explain them across a kitchen
            table. Tap any of them.
          </p>
          <div className="mx-auto mt-10 max-w-3xl space-y-3">
            {PLAIN_ENGLISH.map(({ term, plain }) => (
              <details key={term} className="group rounded-2xl border border-slate-200 bg-white p-5">
                <summary className="cursor-pointer list-none text-sm font-bold text-slate-900 transition-colors group-open:text-orange-700">
                  What is “{term}”?
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{plain}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ — dark trust band */}
      <section className="border-y border-slate-200 bg-slate-900 py-16 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <ShieldCheck className="mx-auto h-10 w-10 text-orange-400" aria-hidden="true" />
            <h2 className="mt-4 text-3xl font-bold tracking-tight">Questions honest buyers ask</h2>
            <p className="mt-3 text-slate-300">
              No hype, no fine-print surprises. Straight answers, including the one most trading
              products dodge.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {FAQS.map(({ q, a }) => (
              <div key={q} className="rounded-2xl bg-slate-800 p-6">
                <h3 className="text-base font-semibold text-white">{q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Offer */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100">
              <HardHat className="h-6 w-6 text-orange-700" aria-hidden="true" />
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-2xl font-bold tracking-tight">Founding beta license</h2>
              <p className="shrink-0">
                <span className="text-4xl font-bold tracking-tight">${PRICE_USD}</span>
                <span className="text-sm text-slate-500"> one-time</span>
              </p>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Beta-tester price for the first 30 days of the beta, which opened July 9. After that it
              goes up. No countdown theatrics — that’s just the date.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Bluechip is running right now, small by design: $5 fractional clips, US equities only,
              and the operator holds the switch. Small by design is a feature, not an apology — you
              don’t hand a new tool the whole job on day one. We onboard founding desks in small
              batches so we can watch every one closely.
            </p>
            <div className="mt-6 rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
                What happens after you pay
              </p>
              <ul className="mt-3 space-y-2.5">
                {AFTER_YOU_PAY.map((item) => (
                  <li key={item.slice(0, 30)} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" aria-hidden="true" />
                    <span className="text-sm leading-relaxed text-slate-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-8 flex flex-col items-center gap-3">
              <BuyButton />
              <p className="text-xs text-slate-500">
                You can lose the money you trade. Bluechip is software you operate — not advice, not a fund.
              </p>
              <a href={TAPE_URL} className="text-sm font-medium text-slate-600 underline underline-offset-4 hover:text-slate-900">
                Watch the live tape first
              </a>
              <a href={QUESTIONS_URL} className="text-xs text-slate-400 underline underline-offset-4 hover:text-slate-600">
                Have a question before you buy? Email a human: social@eb28.co
              </a>
            </div>
            <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
              The rest of the{' '}
              <a href={DESKOS_URL} className="underline hover:text-slate-600">
                EB28 Desk OS catalog
              </a>{' '}
              is open today: $47 per desk, $197 for the bundle, $497 for the operator tier.
            </p>
          </div>
        </div>
      </section>

      {/* Tape callout */}
      <section className="pb-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="rounded-3xl bg-blue-950 p-8 text-white sm:p-12">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                The tape doesn’t lie
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Come watch it work before you spend a dime.
              </h2>
              <p className="mt-4 leading-relaxed text-blue-100">
                Every decision Bluechip makes streams to the public EB28 dashboard — the dips it
                flags, the cycles where it does nothing, and the losses when they happen. A
                contractor shows you references. A desk shows you its tape.
              </p>
              <a
                href={TAPE_URL}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-semibold text-blue-950 transition-colors hover:bg-amber-300"
              >
                Open the live dashboard
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-xl">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
                  $
                </span>
                <span className="font-semibold">Bluechip by EB28</span>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-slate-500">{DISCLAIMER}</p>
            </div>
            <nav className="flex flex-col gap-2 text-sm" aria-label="Footer">
              <a href={TAPE_URL} className="text-slate-600 hover:text-slate-900">
                Live dashboard
              </a>
              <a href={DESKOS_URL} className="text-slate-600 hover:text-slate-900">
                EB28 Desk OS
              </a>
              <a href="mailto:social@eb28.co" className="text-slate-600 hover:text-slate-900">
                social@eb28.co
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
