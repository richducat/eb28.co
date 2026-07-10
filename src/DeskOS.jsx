import React, { useEffect, useState } from 'react';

import {
    DESK_COMMERCE,
    DESK_PRICE_USD,
    BLUECHIP_CHECKOUT_URL,
    BLUECHIP_PRICE_USD,
    BUNDLE_CHECKOUT_URL,
    BUNDLE_PRICE_USD,
    OPERATOR_CHECKOUT_URL,
    OPERATOR_PRICE_USD,
    LANE_INDEX,
} from './fundmanagerMeta';
import SiteNav from './SiteNav.jsx';
import { TickerTape } from './TradingView.jsx';
import { fetchFundSnapshot, recentActions } from './fundSnapshot.js';

const SOLO_TOTAL = Object.keys(DESK_COMMERCE).length * DESK_PRICE_USD;

const AGENT_SECTIONS = [
    {
        laneId: 'fast-loop',
        callsign: 'Sprinter',
        hunts: '5-minute crypto sprint markets on Polymarket',
        color: '#a78bfa',
        bullets: [
            'Wakes every 5 minutes, scores the entire sprint board, and is done in seconds — it never gets bored, distracted, or greedy.',
            'Smart sizing caps every entry to a fixed slice of bankroll, so one bad sprint can never empty the desk.',
            'The exact desk you can watch firing on the live dashboard right now.',
        ],
    },
    {
        laneId: 'divergence',
        callsign: 'Oracle Gap',
        hunts: 'gaps between AI consensus and market price',
        color: '#0891b2',
        bullets: [
            'Compares what the models believe against what the crowd is paying — and only moves when the spread is wide enough to matter.',
            'Runs on Polymarket and Kalshi from the same codebase. One brain, two venues.',
            'Venue-aware balance logic: it knows paper money from real money and treats them differently.',
        ],
    },
    {
        laneId: 'weather',
        callsign: 'Stormfront',
        hunts: 'Polymarket temperature contracts priced against stale forecasts',
        color: '#059669',
        bullets: [
            'Pulls NOAA forecast data on a 30-minute clock — most traders price weather markets off vibes and yesterday’s news.',
            'Trades only when the forecast and the market disagree by a configurable edge threshold you control.',
        ],
    },
    {
        laneId: 'kalshi-weather',
        callsign: 'Barometer',
        hunts: 'the same weather edge, ported to Kalshi forecast contracts',
        color: '#16a34a',
        bullets: [
            'Same NOAA pipeline, different venue — because an edge that works in one market is worth checking in every market.',
            'Kalshi settlement via Solana USDC, handled end to end by the included wallet plumbing.',
        ],
    },
    {
        laneId: 'elon-tweets',
        callsign: 'XPulse',
        hunts: 'Elon tweet-count bucket markets',
        color: '#db2777',
        bullets: [
            'Tracks posting velocity and prices the weekly buckets before the herd updates its priors.',
            'Moonshot sizing profile: small, capped entries on long-odds buckets — built to be wrong cheaply and right big.',
        ],
    },
    {
        laneId: 'mert-sniper',
        callsign: 'Last Call',
        hunts: 'lopsided order books minutes before market close',
        color: '#0d9488',
        bullets: [
            'Scans 200 near-expiry markets per cycle hunting for books where the smart money has already voted.',
            'Strict spread and conviction filters — most cycles it executes nothing, and that discipline is the feature.',
        ],
    },
    {
        laneId: 'signal-sniper',
        callsign: 'Newshound',
        hunts: 'breaking headlines that match your keywords',
        color: '#ea580c',
        bullets: [
            'You feed it keywords and target markets; it watches the wire so you stop refreshing news feeds at midnight.',
            'Ships in watch-only mode — it flags, you decide, until you deliberately hand it the keys.',
        ],
    },
    {
        laneId: 'copytrading',
        callsign: 'Whale Shadow',
        hunts: 'the wallets of traders who are already winning',
        color: '#475569',
        bullets: [
            'Mirrors a wallet list you curate, with per-trade caps and a buy-only safety mode.',
            'Whale-exit detection: when your whales start unloading, it notices.',
        ],
    },
];

const OS_STACK = [
    { name: 'The Gated Runner', detail: 'Every desk launches through one script that checks the kill switch before any live order. No gate, no trade — even if a desk is misconfigured.' },
    { name: 'Launch Control', detail: 'One JSON file rules the floor: global kill switch, paper/live mode, per-venue permissions. Flip one flag and the whole fleet stands down.' },
    { name: 'Capital Guard', detail: 'Watches funding across Polygon and Solana, computes exactly which desk needs what, and pings your Telegram before desks starve.' },
    { name: 'The Tape (Trade Journal)', detail: 'Every fill, skip, failure, and cooldown journaled automatically. Your accountant and your future self both thank you.' },
    { name: 'Circuit Breakers', detail: 'Desks that fail repeatedly bench themselves and cool off. Bad nights stay small.' },
    { name: 'The Live Dashboard', detail: 'The same telemetry page you watched — desk health, blockers, the live book — published from your own machine.' },
    { name: 'macOS Scheduling', detail: 'Nine launchd agents, pre-written. Your Mac is the trading floor; no cloud bill, no vendor lock-in.' },
    { name: 'Paper Mode That’s Actually Paper', detail: 'Sim-venue trading with virtual currency against real market prices. Prove a desk works before it touches a dollar.' },
];

const FAQS = [
    {
        q: 'Do I need to be a programmer?',
        a: 'No. The agents are configured through plain JSON files and launched with copy-paste commands. The install guide assumes you can open Terminal and follow numbered steps. If you can deploy a WordPress plugin, you can run a desk. (And every agent ships as readable Python, so if you DO code, nothing is a black box.)',
    },
    {
        q: 'What do I need to run it?',
        a: 'A Mac (or any always-on machine for the cron variant), a free Simmer account (simmer.markets — the agent layer over Polymarket and Kalshi), and their SDK API key. Paper mode needs nothing else. Live mode needs funded venue wallets and your own deliberate decision to flip the switch.',
    },
    {
        q: 'Will these agents make me money?',
        a: 'Unknown — and anyone who promises otherwise is lying to you. You are buying software and a safety system, not returns. Our real lifetime test results, good or bad, are on the public live dashboard for anyone to check at any time. Prediction markets are risk. Trade money you can lose.',
    },
    {
        q: 'Why sell it if it works?',
        a: 'The honest answer: the system is the asset. Strategies come and go with market conditions — the OS that lets you test ten strategy ideas safely without blowing up is the part that lasts. Software scales; my bankroll is my own problem.',
    },
    {
        q: 'Is this financial advice?',
        a: 'No. Nothing on this page is investment advice or a solicitation to trade. It is a software license with documentation. Consult someone licensed if you need advice.',
    },
    {
        q: 'What if I can’t get it running?',
        a: '30-day guarantee: if you genuinely try and can’t get a desk running in paper mode, email social@eb28.co with what you attempted and you get a full refund. Operator-tier buyers: we install it together on a call, so this mostly can’t happen.',
    },
];

const BLUECHIP = {
    color: '#0d9488',
    bullets: [
        'Official rails, not scraping: orders flow through Robinhood’s Agentic Trading system at agent.robinhood.com. No credential bots. No ToS roulette.',
        'Broker-checked before placement: every order passes Robinhood’s review_equity_order step before it goes anywhere.',
        'Walled garden by design: Bluechip trades only inside a dedicated Agentic sub-account you create. It physically cannot touch your main account.',
        'Blue-chip watchlist, small clips: AAPL, NVDA, TSLA, MSFT, GOOGL, AMD, SPY, QQQ — $5 fractional dip buys, max 2 per 15-minute cycle. Small by design during beta.',
        'Same Desk OS safety stack as every desk on this page: gated runner, global kill switch, paper/review mode by default. One switch to live. One switch back.',
        'We publish our tape: every decision streams to the public dashboard — watch it before you spend a dollar.',
    ],
};

const FALLBACK_TAPE = [
    { time: '', message: 'Bluechip: reviewed $5.00 GOOGL buy — dip vs prev close. Review mode: nothing placed.' },
    { time: '', message: 'Stormfront: NOAA forecast vs market — no edge past threshold. No action.' },
    { time: '', message: 'Whale Shadow: roster re-vetted, 8 wallets tracked, all windows positive.' },
    { time: '', message: 'The Tape: every decision journaled. Losses included. That’s the point.' },
];

function CheckoutButton({ href, children, big = false, ghost = false }) {
    const base = big
        ? 'rounded-full px-8 py-4 text-base font-semibold'
        : 'rounded-full px-5 py-2.5 text-sm font-semibold';
    const skin = ghost
        ? 'border border-slate-300 bg-white text-slate-700 hover:border-slate-400'
        : 'bg-orange-600 text-white shadow-sm hover:bg-orange-700';
    return (
        <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className={`${base} ${skin} inline-block text-center transition-colors`}>
            {children}
        </a>
    );
}

function SectionLabel({ children }) {
    return <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">{children}</p>;
}

// The one deliberately dark element on the page: the tape is alive, and dark
// is reserved for live proof. Pulls real recent actions from the public
// snapshot; falls back to representative static lines if the fetch fails.
function LiveTapeBand() {
    const [events, setEvents] = useState(null);
    useEffect(() => {
        let cancelled = false;
        fetchFundSnapshot().then((snapshot) => {
            if (cancelled || !snapshot) return;
            const acts = recentActions(snapshot, { limit: 4 });
            if (!acts.length) return;
            setEvents(acts.map((a) => ({
                time: a.timestamp ? new Date(a.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '',
                message: String(a.message || '').slice(0, 140),
            })));
        });
        return () => { cancelled = true; };
    }, []);
    const rows = events || FALLBACK_TAPE;
    return (
        <div className="rounded-3xl bg-slate-900 p-6 shadow-xl ring-1 ring-slate-200 sm:p-8">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    The live tape — straight from the floor
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden="true"></span>
                    Desks on duty
                </span>
            </div>
            <ul className="mt-4 space-y-3.5">
                {rows.map(({ time, message }, i) => (
                    <li key={i} className="flex gap-3">
                        <span className="shrink-0 pt-0.5 font-mono text-[11px] text-slate-500">{time || '· ·'}</span>
                        <span className="text-sm leading-relaxed text-slate-300">{message}</span>
                    </li>
                ))}
            </ul>
            <a href="/fundmanager/" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-400 hover:text-orange-300">
                Watch the whole floor live →
            </a>
        </div>
    );
}

const DeskOS = () => {
    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
            <SiteNav active="/deskos/" subtitle="Desk OS" cta={{ href: BUNDLE_CHECKOUT_URL, label: `Get the Desk OS — $${BUNDLE_PRICE_USD}` }} />
            <TickerTape />

            <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">

                {/* ============ HERO ============ */}
                <header className="grid items-center gap-10 lg:grid-cols-2">
                    <div>
                        <p className="mb-4 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-900">
                            From the EB28 trading lab · for people done babysitting markets
                        </p>
                        <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl">
                            Eight trading agents watch the markets for you —
                            <span className="text-orange-600"> behind a kill switch that makes blowing up nearly impossible.</span>
                        </h1>
                        <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
                            The Desk OS is the exact agent fleet, safety system, and live dashboard running the
                            EB28 fund manager right now — packaged so you can run the whole floor on your own
                            machine, in paper mode, before a single real dollar moves.
                        </p>
                        <div className="mt-8 flex flex-wrap items-center gap-4">
                            <CheckoutButton href={BUNDLE_CHECKOUT_URL} big>
                                Get the full Desk OS — ${BUNDLE_PRICE_USD}
                            </CheckoutButton>
                            <CheckoutButton href="/fundmanager/" big ghost>
                                Watch it trade live first
                            </CheckoutButton>
                        </div>
                        <p className="mt-4 text-sm text-slate-500">
                            One-time license · instant Stripe checkout · 30-day get-it-running guarantee
                        </p>
                    </div>
                    <LiveTapeBand />
                </header>

                {/* ============ PROBLEM / STORY ============ */}
                <section className="mt-16 grid gap-6 lg:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
                        <SectionLabel>The 3 a.m. problem</SectionLabel>
                        <h2 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
                            Prediction markets don’t close. You do.
                        </h2>
                        <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-600">
                            <p>
                                The best entries on Polymarket show up at ugly hours. A weather contract gets mispriced
                                while the new NOAA run is published. A 5-minute crypto sprint goes lopsided at 3:41 a.m.
                                A market two minutes from expiry sits at 91 cents when the answer is already public.
                            </p>
                            <p>
                                You won’t catch those manually. Nobody does. The people quietly collecting them run
                                <span className="font-semibold text-slate-900"> agents</span> — small, single-purpose programs that watch
                                one pattern each and never sleep, never revenge-trade, and never “just check Twitter for a second.”
                            </p>
                            <p>
                                And here’s the part nobody says out loud: the hard part was never writing a trading bot.
                                It’s writing the thing that <span className="font-semibold text-slate-900">stops</span> a trading bot —
                                before a bug, a dead API, or your own 2 a.m. overconfidence empties a wallet.
                            </p>
                        </div>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
                        <SectionLabel>Why this exists</SectionLabel>
                        <h2 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
                            On May 31st I shut down my own trading floor with one command. That command is the product.
                        </h2>
                        <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-600">
                            <p>
                                I ran this fleet live — nine scheduled agents trading real, small-stakes money on
                                Polymarket and Kalshi. When market conditions turned and the desks needed a rework,
                                I didn’t have to hunt down rogue processes. One switch flipped. Nine desks stood down.
                                Cleanly. Provably.
                            </p>
                            <p>
                                That’s the machine you’re buying: not a “money printer” (run from anyone using that
                                phrase), but a <span className="font-semibold text-slate-900">prediction-market operating system</span> —
                                agents on top, and underneath them a gated runner, a global kill switch, per-desk circuit
                                breakers, a capital guard, and a journal that records everything.
                            </p>
                            <p className="font-semibold text-slate-900">
                                Strategies are opinions. The safety system is the asset.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ============ THE FLEET ============ */}
                <section className="mt-16">
                    <div className="text-center">
                        <SectionLabel>The fleet</SectionLabel>
                        <h2 className="mt-2 text-3xl font-bold tracking-tight">Eight specialists. One obsession each.</h2>
                        <p className="mx-auto mt-3 max-w-2xl text-slate-600">
                            License any agent solo for ${DESK_PRICE_USD} — readable Python, config file, runner integration,
                            and install guide. Or take the whole floor below and save.
                        </p>
                    </div>

                    <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
                        {AGENT_SECTIONS.map((agent) => {
                            const commerce = DESK_COMMERCE[agent.laneId] || {};
                            const lane = LANE_INDEX[agent.laneId] || {};
                            return (
                                <article key={agent.laneId} className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-lg">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: agent.color }} aria-hidden="true"></span>
                                                <h3 className="text-lg font-bold tracking-tight">{agent.callsign}</h3>
                                            </div>
                                            <p className="mt-1 text-sm leading-relaxed text-slate-600">Hunts {agent.hunts}.</p>
                                        </div>
                                        <span className="whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                            {lane.venue || 'polymarket'} · {lane.cadenceMinutes || 15}m
                                        </span>
                                    </div>
                                    <ul className="mt-4 flex-1 space-y-2.5">
                                        {agent.bullets.map((line, index) => (
                                            <li key={index} className="flex gap-2 text-sm leading-relaxed text-slate-600">
                                                <span className="mt-[3px] text-orange-600">▸</span>
                                                <span>{line}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                                        <span className="text-base font-bold">${DESK_PRICE_USD} <span className="text-xs font-normal uppercase tracking-wide text-slate-400">one-time</span></span>
                                        <CheckoutButton href={commerce.checkoutUrl || BUNDLE_CHECKOUT_URL}>
                                            License {agent.callsign}
                                        </CheckoutButton>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>

                {/* ============ BLUECHIP FLAGSHIP ============ */}
                <section className="mt-16" id="bluechip">
                    <div className="relative rounded-3xl border-2 border-teal-600/40 bg-white p-6 pt-9 shadow-lg sm:p-8 sm:pt-10">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-teal-600 px-4 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                            Flagship desk · live beta · US equities
                        </div>
                        <div className="text-center">
                            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-teal-700">Bluechip</h3>
                            <h2 className="mx-auto mt-1 max-w-2xl text-2xl font-bold tracking-tight sm:text-3xl">
                                Stocks. Through the front door.
                            </h2>
                            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-600">
                                Most stock bots borrow your password and hope the broker doesn’t notice. Bluechip trades
                                US equities through <span className="font-semibold text-slate-900">Robinhood’s official Agentic Trading API</span> —
                                the first EB28 desk built for the agentic-brokerage era.
                            </p>
                        </div>

                        <ul className="mx-auto mt-7 max-w-3xl space-y-2.5">
                            {BLUECHIP.bullets.map((line, index) => (
                                <li key={index} className="flex gap-2 text-sm leading-relaxed text-slate-600">
                                    <span className="mt-[3px] text-teal-600">▸</span>
                                    <span>{line}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                            <CheckoutButton href={BLUECHIP_CHECKOUT_URL} big>
                                Get the founding beta — ${BLUECHIP_PRICE_USD}
                            </CheckoutButton>
                            <CheckoutButton href="/bluechip/" big ghost>
                                Read the Bluechip story
                            </CheckoutButton>
                        </div>
                        <p className="mt-4 text-center text-xs text-slate-500">
                            ${BLUECHIP_PRICE_USD} beta-tester price for the first 30 days of the beta (opened July 9) ·
                            one-time license · 30-day get-it-running guarantee
                        </p>
                    </div>
                </section>

                {/* ============ THE OS STACK ============ */}
                <section className="mt-16">
                    <div className="text-center">
                        <SectionLabel>Not sold separately — at any price</SectionLabel>
                        <h2 className="mt-2 text-3xl font-bold tracking-tight">The operating system underneath the agents</h2>
                        <p className="mx-auto mt-3 max-w-2xl text-slate-600">
                            This is the layer that took the longest to build and the layer every “bot for sale”
                            skips. It only ships with the bundle.
                        </p>
                    </div>
                    <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {OS_STACK.map((item) => (
                            <div key={item.name} className="rounded-2xl border border-slate-200 bg-white p-5">
                                <div className="text-sm font-bold text-slate-900">{item.name}</div>
                                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{item.detail}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ============ OFFER STACK ============ */}
                <section className="mt-16" id="offer">
                    <div className="text-center">
                        <SectionLabel>The offer</SectionLabel>
                        <h2 className="mt-2 text-3xl font-bold tracking-tight">Three ways in</h2>
                    </div>

                    <div className="mt-10 grid grid-cols-1 gap-5 lg:grid-cols-3">
                        <div className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Single agent</div>
                            <div className="mt-3 text-3xl font-bold">${DESK_PRICE_USD}</div>
                            <div className="text-xs uppercase tracking-wide text-slate-400">one-time, per agent</div>
                            <ul className="mt-5 flex-1 space-y-2 text-sm leading-relaxed text-slate-600">
                                <li>▸ Any one agent, full source</li>
                                <li>▸ Config + install guide</li>
                                <li>▸ Runner integration scripts</li>
                                <li>▸ Email delivery within 24h</li>
                            </ul>
                            <div className="mt-6">
                                <CheckoutButton href="#fleet-note" ghost>Pick one above ↑</CheckoutButton>
                            </div>
                        </div>

                        <div className="relative flex flex-col rounded-3xl border-2 border-orange-500 bg-white p-6 shadow-lg">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-orange-600 px-4 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                                The actual deal
                            </div>
                            <div className="text-xs font-semibold uppercase tracking-wide text-orange-700">Full Desk OS</div>
                            <div className="mt-3 flex items-baseline gap-3">
                                <div className="text-4xl font-bold">${BUNDLE_PRICE_USD}</div>
                                <div className="text-sm text-slate-400 line-through">${SOLO_TOTAL} solo</div>
                            </div>
                            <div className="text-xs uppercase tracking-wide text-slate-400">one-time · lifetime license</div>
                            <ul className="mt-5 flex-1 space-y-2 text-sm leading-relaxed text-slate-600">
                                <li>▸ <span className="font-semibold text-slate-900">All 8 agents</span> (${SOLO_TOTAL} if bought solo)</li>
                                <li>▸ <span className="font-semibold text-slate-900">The complete OS</span>: gated runner, kill switch, capital guard, circuit breakers, journal</li>
                                <li>▸ The live telemetry dashboard, self-hosted</li>
                                <li>▸ All 9 pre-written launchd schedules</li>
                                <li>▸ Paper-mode config so day one risks $0</li>
                                <li>▸ Every future agent update, free</li>
                            </ul>
                            <div className="mt-6">
                                <CheckoutButton href={BUNDLE_CHECKOUT_URL} big>
                                    Get the Desk OS — ${BUNDLE_PRICE_USD}
                                </CheckoutButton>
                            </div>
                        </div>

                        <div className="flex flex-col rounded-3xl border border-slate-200 bg-white p-6">
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Operator install</div>
                            <div className="mt-3 text-3xl font-bold">${OPERATOR_PRICE_USD}</div>
                            <div className="text-xs uppercase tracking-wide text-slate-400">one-time · done with you</div>
                            <ul className="mt-5 flex-1 space-y-2 text-sm leading-relaxed text-slate-600">
                                <li>▸ Everything in the bundle</li>
                                <li>▸ 1:1 install session — we stand up your floor together</li>
                                <li>▸ Wallet, risk-cap, and dashboard configuration</li>
                                <li>▸ 30 days of direct email support</li>
                            </ul>
                            <div className="mt-6">
                                <CheckoutButton href={OPERATOR_CHECKOUT_URL} ghost>
                                    Book Operator — ${OPERATOR_PRICE_USD}
                                </CheckoutButton>
                            </div>
                        </div>
                    </div>

                    <p id="fleet-note" className="mt-6 text-center text-sm leading-relaxed text-slate-500">
                        30-day guarantee on every tier: genuinely try to get a desk running in paper mode and can’t?
                        Email social@eb28.co and you get every cent back. Keep the code.
                    </p>
                </section>

                {/* ============ FAQ ============ */}
                <section className="mt-16">
                    <div className="text-center">
                        <SectionLabel>Straight answers</SectionLabel>
                        <h2 className="mt-2 text-3xl font-bold tracking-tight">Questions a smart buyer asks</h2>
                    </div>
                    <div className="mt-8 space-y-3">
                        {FAQS.map((faq) => (
                            <details key={faq.q} className="group rounded-2xl border border-slate-200 bg-white p-5">
                                <summary className="cursor-pointer list-none text-sm font-bold text-slate-900 transition-colors group-open:text-orange-700">
                                    {faq.q}
                                </summary>
                                <p className="mt-3 text-sm leading-relaxed text-slate-600">{faq.a}</p>
                            </details>
                        ))}
                    </div>
                </section>

                {/* ============ FINAL CTA ============ */}
                <section className="mt-16 pb-10">
                    <div className="rounded-3xl bg-blue-950 p-8 text-center text-white sm:p-12">
                        <h2 className="mx-auto max-w-2xl text-2xl font-bold leading-snug tracking-tight sm:text-3xl">
                            In an hour, your machine can be running the same fleet you just watched trade.
                        </h2>
                        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-blue-100">
                            Paper mode first. Kill switch always. Real money only when you — not the software,
                            not us, not FOMO — deliberately flip the gate.
                        </p>
                        <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
                            <CheckoutButton href={BUNDLE_CHECKOUT_URL} big>
                                Get the Desk OS — ${BUNDLE_PRICE_USD}
                            </CheckoutButton>
                            <a href="/fundmanager/" className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-8 py-4 text-base font-semibold text-blue-950 transition-colors hover:bg-amber-300">
                                Still skeptical? Watch the tape →
                            </a>
                        </div>

                        <div className="mx-auto mt-8 max-w-xl space-y-3 text-left text-xs leading-relaxed text-blue-200/80">
                            <p>
                                <span className="font-bold text-white">P.S.</span> — The ${BUNDLE_PRICE_USD} bundle exists because selling
                                agents one at a time is good business and selling the whole floor is a better product. The OS layer —
                                the kill switch, the capital guard, the journal — is not sold separately at any price. If you want the
                                machine and not just a bot, this is the only door.
                            </p>
                            <p>
                                <span className="font-bold text-white">P.P.S.</span> — Yes, the live tape shows a loss. It will show
                                tomorrow’s numbers too, whatever they are. That’s the whole point. Buy from people who show you the tape.
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 space-y-2 text-center text-xs leading-relaxed text-slate-400">
                        <p>
                            EB28 Desk OS is a software license for educational and personal-automation use. It is not investment advice,
                            a managed fund, or a solicitation to trade. Prediction-market trading involves substantial risk of loss; past
                            performance (including ours, which is negative) does not indicate future results.
                        </p>
                        <p>
                            Polymarket, Kalshi, Simmer, and Robinhood are third-party platforms with their own terms, eligibility rules, and regional
                            restrictions — you are responsible for complying with them. Robinhood Agentic Trading is a beta program;
                            Robinhood does not endorse or sponsor EB28. Trade only money you can afford to lose.
                        </p>
                        <p>
                            © {new Date().getFullYear()} EB28 · <a href="/fundmanager/" className="underline underline-offset-2 hover:text-slate-600">Live dashboard</a> · Support: social@eb28.co
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default DeskOS;
