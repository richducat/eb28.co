import React from 'react';

import {
    DESK_COMMERCE,
    DESK_PRICE_USD,
    BUNDLE_CHECKOUT_URL,
    BUNDLE_PRICE_USD,
    OPERATOR_CHECKOUT_URL,
    OPERATOR_PRICE_USD,
    LANE_INDEX,
} from './fundmanagerMeta';

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
        color: '#22d3ee',
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
        color: '#34d399',
        bullets: [
            'Pulls NOAA forecast data on a 30-minute clock — most traders price weather markets off vibes and yesterday’s news.',
            'Trades only when the forecast and the market disagree by a configurable edge threshold you control.',
        ],
    },
    {
        laneId: 'kalshi-weather',
        callsign: 'Barometer',
        hunts: 'the same weather edge, ported to Kalshi forecast contracts',
        color: '#4ade80',
        bullets: [
            'Same NOAA pipeline, different venue — because an edge that works in one market is worth checking in every market.',
            'Kalshi settlement via Solana USDC, handled end to end by the included wallet plumbing.',
        ],
    },
    {
        laneId: 'elon-tweets',
        callsign: 'XPulse',
        hunts: 'Elon tweet-count bucket markets',
        color: '#f472b6',
        bullets: [
            'Tracks posting velocity and prices the weekly buckets before the herd updates its priors.',
            'Moonshot sizing profile: small, capped entries on long-odds buckets — built to be wrong cheaply and right big.',
        ],
    },
    {
        laneId: 'mert-sniper',
        callsign: 'Last Call',
        hunts: 'lopsided order books minutes before market close',
        color: '#2dd4bf',
        bullets: [
            'Scans 200 near-expiry markets per cycle hunting for books where the smart money has already voted.',
            'Strict spread and conviction filters — most cycles it executes nothing, and that discipline is the feature.',
        ],
    },
    {
        laneId: 'signal-sniper',
        callsign: 'Newshound',
        hunts: 'breaking headlines that match your keywords',
        color: '#fb923c',
        bullets: [
            'You feed it keywords and target markets; it watches the wire so you stop refreshing news feeds at midnight.',
            'Ships in watch-only mode — it flags, you decide, until you deliberately hand it the keys.',
        ],
    },
    {
        laneId: 'copytrading',
        callsign: 'Whale Shadow',
        hunts: 'the wallets of traders who are already winning',
        color: '#94a3b8',
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
        a: 'Unknown — and anyone who promises otherwise is lying to you. You are buying software and a safety system, not returns. Our own live test book is down $61.61 and that number is printed on the sales page on purpose. Prediction markets are risk. Trade money you can lose.',
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
    color: '#5eead4',
    bullets: [
        'Official rails, not scraping: orders flow through Robinhood’s Agentic Trading system at agent.robinhood.com. No credential bots. No ToS roulette.',
        'Broker-checked before placement: every order passes Robinhood’s review_equity_order step before it goes anywhere.',
        'Walled garden by design: Bluechip trades only inside a dedicated Agentic sub-account you create. It physically cannot touch your main account.',
        'Blue-chip watchlist, small clips: AAPL, NVDA, TSLA, MSFT, GOOGL, AMD, SPY, QQQ — $5 fractional dip buys, max 2 per 15-minute cycle. Small by design during beta.',
        'Same Desk OS safety stack as every desk on this page: gated runner, global kill switch, paper/review mode by default. One switch to live. One switch back.',
        'We publish our tape: every decision streams to the public dashboard — watch it before you spend a dollar.',
    ],
    steps: [
        {
            step: '01 — Isolate',
            title: 'Create the walled garden',
            body: 'Create a dedicated Agentic sub-account in Robinhood. That walled garden is all Bluechip ever sees — it physically cannot touch your main account.',
        },
        {
            step: '02 — Paper first',
            title: 'Boot in review mode',
            body: 'The default mode places nothing. Watch the desk flag $5 dip candidates on the blue-chip watchlist without a dollar moving.',
        },
        {
            step: '03 — Your switch',
            title: 'Flip the gate when you decide',
            body: 'One switch to live, one switch back. Every order still clears Robinhood’s own review step before placement.',
        },
        {
            step: '04 — On tape',
            title: 'Everything is journaled',
            body: 'Every decision lands in your trade journal — and ours streams to the public dashboard you can watch right now.',
        },
    ],
    faqs: [
        {
            q: 'How is this different from every other stock bot?',
            a: 'Most bots log into your brokerage with your password — a ToS violation waiting for a ban. Bluechip uses Robinhood’s own Agentic Trading API: official agent rails, a broker-side order review on every trade, and a dedicated sub-account it can’t step outside of.',
        },
        {
            q: 'Is EB28 partnered with Robinhood?',
            a: 'No. Bluechip is built on Robinhood’s official Agentic Trading API — the public front door Robinhood built for agents. Robinhood does not endorse or sponsor EB28. Want proof it’s real? The live tape is public on the fund manager dashboard.',
        },
        {
            q: 'Will this make me money?',
            a: 'We don’t claim that, and you should walk away from anyone who does. Bluechip is licensed software you operate — not investment advice, not a managed fund, not a financial service. Trading involves risk of loss. Watch the live tape and judge the desk’s decisions yourself.',
        },
    ],
};

function CheckoutButton({ href, children, big = false, ghost = false }) {
    const base = big
        ? 'rounded-full px-8 py-4 text-base font-bold uppercase tracking-[0.14em]'
        : 'rounded-full px-5 py-2.5 text-[12px] font-bold uppercase tracking-[0.16em]';
    const skin = ghost
        ? 'border border-[#22d3ee]/35 text-cyan-200 hover:border-[#22d3ee]/70'
        : 'bg-[#22d3ee] text-[#020617] hover:bg-cyan-300 hover:shadow-[0_0_32px_rgba(34,211,238,0.5)]';
    return (
        <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className={`${base} ${skin} inline-block text-center transition-all`}>
            {children}
        </a>
    );
}

function SectionLabel({ children }) {
    return <p className="text-[10px] uppercase tracking-[0.26em] text-cyan-300/60">{children}</p>;
}

const DeskOS = () => {
    return (
        <div className="min-h-screen overflow-x-hidden bg-[#020617] font-mono text-white/85 selection:bg-[#22d3ee] selection:text-[#020617]">
            <div className="fixed inset-0 crt-overlay pointer-events-none z-50 opacity-10"></div>
            <div className="fixed inset-0 eb28-appbuilder-noise pointer-events-none opacity-5"></div>

            <div className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">

                {/* ============ HERO ============ */}
                <header className="text-center">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-300/70">
                        From the EB28 trading lab · for people who are done babysitting markets
                    </p>
                    <h1 className="mx-auto mt-5 max-w-4xl text-[clamp(1.9rem,5.5vw,3.4rem)] font-bold leading-[1.08] tracking-tight text-white">
                        Eight Trading Agents Watch Polymarket and Kalshi For You, Around the Clock —
                        <span className="text-[#22d3ee]"> Behind a Kill Switch That Makes Blowing Up Nearly Impossible</span>
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">
                        The Desk OS is the exact agent fleet, safety system, and live dashboard running the
                        EB28 fund manager right now — packaged so you can run the whole floor on your own
                        machine, in paper mode, before a single real dollar moves.
                    </p>
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                        <CheckoutButton href={BUNDLE_CHECKOUT_URL} big>
                            Get the full Desk OS — ${BUNDLE_PRICE_USD}
                        </CheckoutButton>
                        <CheckoutButton href="/fundmanager/" big ghost>
                            Watch it trade live first →
                        </CheckoutButton>
                    </div>
                    <p className="mt-4 text-[11px] text-white/40">
                        One-time license · instant Stripe checkout · 30-day get-it-running guarantee
                    </p>
                </header>

                {/* ============ PROBLEM / AGITATION ============ */}
                <section className="mt-16">
                    <div className="eb28-panel rounded-[28px] border border-[#22d3ee]/10 p-6 sm:p-8">
                        <SectionLabel>The 3 a.m. problem</SectionLabel>
                        <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
                            Prediction markets don't close. You do.
                        </h2>
                        <div className="mt-4 space-y-4 text-sm leading-relaxed text-white/70">
                            <p>
                                The best entries on Polymarket show up at ugly hours. A weather contract gets mispriced
                                while the new NOAA run is published. A 5-minute crypto sprint goes lopsided at 3:41 a.m.
                                A market two minutes from expiry is sitting at 91 cents when the answer is already public.
                            </p>
                            <p>
                                You won't catch those manually. Nobody does. The people quietly collecting them run
                                <span className="text-cyan-200"> agents</span> — small, single-purpose programs that watch
                                one pattern each and never sleep, never revenge-trade, and never "just check Twitter for a second."
                            </p>
                            <p>
                                And here's the part nobody says out loud: the hard part was never writing a trading bot.
                                It's writing the thing that <span className="text-cyan-200">stops</span> a trading bot —
                                before a bug, a dead API, or your own 2 a.m. overconfidence empties a wallet.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ============ STORY / MECHANISM ORIGIN ============ */}
                <section className="mt-10">
                    <div className="eb28-panel rounded-[28px] border border-[#22d3ee]/10 p-6 sm:p-8">
                        <SectionLabel>Why this exists</SectionLabel>
                        <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
                            On May 31st I shut down my own trading floor with one command. That command is the product.
                        </h2>
                        <div className="mt-4 space-y-4 text-sm leading-relaxed text-white/70">
                            <p>
                                I ran this fleet live — nine scheduled agents trading real, small-stakes money on
                                Polymarket and Kalshi. When market conditions turned and the desks needed a rework,
                                I didn't have to hunt down rogue processes or pray I'd found every cron job.
                                One switch flipped. Nine desks stood down. Cleanly. Provably. The archived
                                schedules sat untouched until the day the fleet came back online in paper mode.
                            </p>
                            <p>
                                That's the machine you're buying: not a "money printer" (run from anyone using that
                                phrase), but a <span className="text-cyan-200">prediction-market operating system</span> —
                                agents on top, and underneath them a gated runner, a global kill switch, per-desk circuit
                                breakers, a capital guard, and a journal that records everything the fleet does.
                            </p>
                            <p className="font-bold text-white/85">
                                Strategies are opinions. The safety system is the asset.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ============ RADICAL TRANSPARENCY / PROOF ============ */}
                <section className="mt-10">
                    <div className="eb28-panel rounded-[28px] border border-amber-400/20 bg-amber-500/5 p-6 sm:p-8">
                        <SectionLabel>Read this before you buy anything from anyone</SectionLabel>
                        <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
                            Our live test book is down $61.61. It's printed here on purpose.
                        </h2>
                        <div className="mt-4 space-y-4 text-sm leading-relaxed text-white/70">
                            <p>
                                Every bot seller on the internet shows you a green screenshot. We publish the
                                <a href="/fundmanager/" className="text-cyan-200 underline underline-offset-4 hover:text-cyan-100"> entire live tape</a> —
                                desk health, blockers, open positions, and the real lifetime PnL of our small-stakes live
                                testing, which today reads <span className="font-bold text-rose-300">−$61.61</span>.
                                The paper fleet currently manages a virtual bankroll of ~$9,970 $SIM against real market prices.
                            </p>
                            <p>
                                Why show you a losing number? Because it's the only number we can show you honestly —
                                and because the system's job isn't to guarantee wins. Its job is to make sure
                                <span className="text-cyan-200"> testing is cheap, losses are capped, and every result is recorded</span>.
                                If another vendor won't show you their tape, ask yourself why.
                            </p>
                            <p className="text-[12px] text-white/50">
                                You're buying software, not returns. Prediction markets involve real risk of loss. Nothing here is investment advice.
                            </p>
                        </div>
                    </div>
                </section>

                {/* ============ THE FLEET ============ */}
                <section className="mt-16">
                    <div className="text-center">
                        <SectionLabel>The fleet</SectionLabel>
                        <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
                            Eight specialists. One obsession each.
                        </h2>
                        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/60">
                            License any agent solo for ${DESK_PRICE_USD} — readable Python, config file, runner integration,
                            and install guide. Or take the whole floor below and save.
                        </p>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
                        {AGENT_SECTIONS.map((agent) => {
                            const commerce = DESK_COMMERCE[agent.laneId] || {};
                            const lane = LANE_INDEX[agent.laneId] || {};
                            return (
                                <article key={agent.laneId} className="eb28-panel flex flex-col rounded-[26px] border border-[#22d3ee]/10 p-5 transition-all hover:border-[#22d3ee]/30 sm:p-6">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h3 className="text-lg font-bold" style={{ color: agent.color }}>
                                                {agent.callsign.toUpperCase()}
                                            </h3>
                                            <p className="mt-1 text-[12px] leading-relaxed text-white/65">
                                                Hunts {agent.hunts}.
                                            </p>
                                        </div>
                                        <span className="whitespace-nowrap rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[9px] uppercase tracking-[0.18em] text-white/50">
                                            {lane.venue || 'polymarket'} · {lane.cadenceMinutes || 15}m
                                        </span>
                                    </div>
                                    <ul className="mt-4 flex-1 space-y-2.5">
                                        {agent.bullets.map((line, index) => (
                                            <li key={index} className="flex gap-2 text-[12px] leading-relaxed text-white/70">
                                                <span className="mt-[2px] text-cyan-300">▸</span>
                                                <span>{line}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/5 pt-4">
                                        <span className="text-sm font-bold text-white">${DESK_PRICE_USD} <span className="text-[10px] font-normal uppercase tracking-[0.14em] text-white/40">one-time</span></span>
                                        <CheckoutButton href={commerce.checkoutUrl || BUNDLE_CHECKOUT_URL}>
                                            License {agent.callsign} →
                                        </CheckoutButton>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>

                {/* ============ BLUECHIP FLAGSHIP ============ */}
                <section className="mt-16" id="bluechip">
                    <div className="eb28-panel relative rounded-[28px] border-2 border-[#5eead4]/50 p-6 pt-8 shadow-[0_0_48px_rgba(94,234,212,0.15)] sm:p-8 sm:pt-9">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#5eead4] px-4 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#020617]">
                            Flagship desk · live beta · US equities
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-bold tracking-[0.2em]" style={{ color: BLUECHIP.color }}>
                                BLUECHIP
                            </h3>
                            <h2 className="mx-auto mt-1 max-w-2xl text-2xl font-bold text-white sm:text-3xl">
                                Stocks. Through the front door.
                            </h2>
                            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/70">
                                Most stock bots borrow your password and hope the broker doesn’t notice. Bluechip trades
                                US equities through <span className="text-teal-200">Robinhood’s official Agentic Trading API</span> —
                                the first EB28 desk built for the agentic-brokerage era.
                            </p>
                        </div>

                        <ul className="mx-auto mt-7 max-w-3xl space-y-2.5">
                            {BLUECHIP.bullets.map((line, index) => (
                                <li key={index} className="flex gap-2 text-[13px] leading-relaxed text-white/70">
                                    <span className="mt-[2px]" style={{ color: BLUECHIP.color }}>▸</span>
                                    <span>{line}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {BLUECHIP.steps.map((item) => (
                                <div key={item.step} className="rounded-2xl border border-[#5eead4]/10 bg-black/20 p-4">
                                    <div className="text-[10px] uppercase tracking-[0.2em] text-teal-200/70">{item.step}</div>
                                    <div className="mt-1 text-sm font-bold text-teal-100">{item.title}</div>
                                    <p className="mt-1.5 text-[12px] leading-relaxed text-white/65">{item.body}</p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-7 space-y-3">
                            {BLUECHIP.faqs.map((faq) => (
                                <details key={faq.q} className="group rounded-2xl border border-[#5eead4]/10 bg-black/20 p-4">
                                    <summary className="cursor-pointer list-none text-sm font-bold text-white/90 transition-colors group-open:text-teal-200">
                                        {faq.q}
                                    </summary>
                                    <p className="mt-3 text-[13px] leading-relaxed text-white/65">{faq.a}</p>
                                </details>
                            ))}
                        </div>

                        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                            <CheckoutButton href="mailto:social@eb28.co?subject=Bluechip%20early%20access" big>
                                Request Bluechip early access
                            </CheckoutButton>
                            <CheckoutButton href="/fundmanager/" big ghost>
                                Watch the live tape →
                            </CheckoutButton>
                        </div>
                        <p className="mt-4 text-center text-[11px] text-white/40">
                            Live beta. Not for sale yet — the founding cohort gets first keys when the gate opens.
                        </p>
                        <p className="mx-auto mt-5 max-w-2xl text-center text-[12px] leading-relaxed text-white/50">
                            Trading involves risk of loss. Bluechip is licensed software you operate in your own account —
                            not investment advice, not a managed fund. You hold the switch; you hold the risk.
                        </p>
                    </div>
                </section>

                {/* ============ THE OS STACK ============ */}
                <section className="mt-16">
                    <div className="eb28-panel rounded-[28px] border border-[#22d3ee]/10 p-6 sm:p-8">
                        <SectionLabel>Not sold separately — at any price</SectionLabel>
                        <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
                            The operating system underneath the agents
                        </h2>
                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/60">
                            This is the layer that took the longest to build and the layer every "bot for sale"
                            skips. It only ships with the bundle.
                        </p>
                        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {OS_STACK.map((item) => (
                                <div key={item.name} className="rounded-2xl border border-[#22d3ee]/10 bg-black/20 p-4">
                                    <div className="text-sm font-bold text-cyan-200">{item.name}</div>
                                    <p className="mt-1.5 text-[12px] leading-relaxed text-white/65">{item.detail}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ============ OFFER STACK ============ */}
                <section className="mt-16" id="offer">
                    <div className="text-center">
                        <SectionLabel>The offer</SectionLabel>
                        <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Three ways in</h2>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <div className="eb28-panel flex flex-col rounded-[28px] border border-white/10 p-6">
                            <div className="text-[10px] uppercase tracking-[0.22em] text-white/45">Single agent</div>
                            <div className="mt-3 text-3xl font-bold text-white">${DESK_PRICE_USD}</div>
                            <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">one-time, per agent</div>
                            <ul className="mt-5 flex-1 space-y-2 text-[12px] leading-relaxed text-white/65">
                                <li>▸ Any one agent, full source</li>
                                <li>▸ Config + install guide</li>
                                <li>▸ Runner integration scripts</li>
                                <li>▸ Email delivery within 24h</li>
                            </ul>
                            <div className="mt-6">
                                <CheckoutButton href="#fleet-note" ghost>Pick one above ↑</CheckoutButton>
                            </div>
                        </div>

                        <div className="eb28-panel relative flex flex-col rounded-[28px] border-2 border-[#22d3ee]/60 p-6 shadow-[0_0_48px_rgba(34,211,238,0.15)]">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#22d3ee] px-4 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#020617]">
                                The actual deal
                            </div>
                            <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-300/70">Full Desk OS</div>
                            <div className="mt-3 flex items-baseline gap-3">
                                <div className="text-4xl font-bold text-white">${BUNDLE_PRICE_USD}</div>
                                <div className="text-sm text-white/40 line-through">${SOLO_TOTAL} solo</div>
                            </div>
                            <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">one-time · lifetime license</div>
                            <ul className="mt-5 flex-1 space-y-2 text-[12px] leading-relaxed text-white/70">
                                <li>▸ <span className="font-bold text-white">All 8 agents</span> (${SOLO_TOTAL} if bought solo)</li>
                                <li>▸ <span className="font-bold text-white">The complete OS</span>: gated runner, kill switch, capital guard, circuit breakers, journal</li>
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

                        <div className="eb28-panel flex flex-col rounded-[28px] border border-white/10 p-6">
                            <div className="text-[10px] uppercase tracking-[0.22em] text-white/45">Operator install</div>
                            <div className="mt-3 text-3xl font-bold text-white">${OPERATOR_PRICE_USD}</div>
                            <div className="text-[11px] uppercase tracking-[0.16em] text-white/40">one-time · done with you</div>
                            <ul className="mt-5 flex-1 space-y-2 text-[12px] leading-relaxed text-white/65">
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

                    <p id="fleet-note" className="mt-6 text-center text-[12px] leading-relaxed text-white/50">
                        30-day guarantee on every tier: genuinely try to get a desk running in paper mode and can't?
                        Email social@eb28.co and you get every cent back. Keep the code.
                    </p>
                </section>

                {/* ============ FAQ ============ */}
                <section className="mt-16">
                    <div className="text-center">
                        <SectionLabel>Straight answers</SectionLabel>
                        <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Questions a smart buyer asks</h2>
                    </div>
                    <div className="mt-8 space-y-3">
                        {FAQS.map((faq) => (
                            <details key={faq.q} className="eb28-panel group rounded-2xl border border-[#22d3ee]/10 p-5">
                                <summary className="cursor-pointer list-none text-sm font-bold text-white/90 transition-colors group-open:text-cyan-200">
                                    {faq.q}
                                </summary>
                                <p className="mt-3 text-[13px] leading-relaxed text-white/65">{faq.a}</p>
                            </details>
                        ))}
                    </div>
                </section>

                {/* ============ FINAL CTA ============ */}
                <section className="mt-16 pb-10">
                    <div className="eb28-panel rounded-[28px] border border-[#22d3ee]/25 bg-gradient-to-br from-[#22d3ee]/10 to-transparent p-8 text-center sm:p-10">
                        <h2 className="mx-auto max-w-2xl text-2xl font-bold leading-snug text-white sm:text-3xl">
                            In an hour, your machine can be running the same fleet you just watched trade.
                        </h2>
                        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/60">
                            Paper mode first. Kill switch always. Real money only when you — not the software,
                            not us, not FOMO — deliberately flip the gate.
                        </p>
                        <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
                            <CheckoutButton href={BUNDLE_CHECKOUT_URL} big>
                                Get the Desk OS — ${BUNDLE_PRICE_USD}
                            </CheckoutButton>
                            <CheckoutButton href="/fundmanager/" big ghost>
                                Still skeptical? Watch the tape →
                            </CheckoutButton>
                        </div>

                        <div className="mx-auto mt-8 max-w-xl space-y-3 text-left text-[12px] leading-relaxed text-white/55">
                            <p>
                                <span className="font-bold text-white/75">P.S.</span> — The ${BUNDLE_PRICE_USD} bundle exists because selling
                                agents one at a time is good business and selling the whole floor is a better product. The OS layer —
                                the kill switch, the capital guard, the journal — is not sold separately at any price. If you want the
                                machine and not just a bot, this is the only door.
                            </p>
                            <p>
                                <span className="font-bold text-white/75">P.P.S.</span> — Yes, the live tape shows a loss. It will show
                                tomorrow's numbers too, whatever they are. That's the whole point. Buy from people who show you the tape.
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 space-y-2 text-center text-[10px] leading-relaxed text-white/35">
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
                            © {new Date().getFullYear()} EB28 · <a href="/fundmanager/" className="underline underline-offset-2 hover:text-cyan-200">Live dashboard</a> · Support: social@eb28.co
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default DeskOS;
