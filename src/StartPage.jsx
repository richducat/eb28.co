import React, { useEffect, useState } from 'react';

// One link to put in every social bio: eb28.co/start
// Fill in handles as you claim them — buttons only render when a url is set,
// so the live page never shows a dead link.
const SOCIALS = [
    { label: 'X / Twitter', handle: '@eb28co', url: '' },
    { label: 'YouTube', handle: 'EB28', url: '' },
    { label: 'TikTok', handle: '@eb28co', url: '' },
    { label: 'Reddit', handle: 'u/eb28co', url: '' },
    { label: 'LinkedIn', handle: 'EB28', url: '' },
];

const PRIMARY = [
    {
        label: 'Get the Desk OS',
        sub: '8 trading agents + the kill-switch OS · from $47',
        href: '/deskos/',
        tone: 'solid',
    },
    {
        label: 'Watch it trade live',
        sub: 'Real fleet, real positions, real losses — the unedited tape',
        href: '/fundmanager/',
        tone: 'ghost',
    },
];

const PROOF = [
    { k: 'Live', v: 'A real dashboard, not a screenshot' },
    { k: 'Transparent', v: 'We publish our losses on purpose' },
    { k: 'Kill-switch first', v: 'The off-switch is the product' },
];

const StartPage = () => {
    const [status, setStatus] = useState(null);

    useEffect(() => {
        const url = 'https://raw.githubusercontent.com/richducat/eb28.co/fund-state/fund-state.json';
        fetch(`${url}?cb=${Date.now()}`, { cache: 'no-store' })
            .then((r) => r.json())
            .then((d) => setStatus({
                state: d?.summary?.status || null,
                lanes: d?.summary?.activeLanes ?? null,
                updatedAt: d?.updatedAt || null,
            }))
            .catch(() => setStatus(null));
    }, []);

    const liveDesks = SOCIALS.filter((s) => s.url);

    return (
        <div className="min-h-screen bg-[#020617] font-mono text-white/85 selection:bg-[#22d3ee] selection:text-[#020617]">
            <div className="fixed inset-0 crt-overlay pointer-events-none z-50 opacity-10" />
            <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col items-center px-5 py-12">

                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[#22d3ee]/30 bg-[#0f172a] text-2xl font-bold text-[#22d3ee]">
                    &gt;_
                </div>
                <h1 className="mt-5 text-center text-2xl font-bold tracking-tight text-white">EB28 Desk OS</h1>
                <p className="mt-2 text-center text-[13px] leading-relaxed text-white/60">
                    Autonomous trading agents on Polymarket, Kalshi &amp; Robinhood —
                    behind a kill switch that makes blowing up nearly impossible.
                </p>

                {status?.state ? (
                    <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#22d3ee]/20 bg-[#22d3ee]/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-cyan-200">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                        Fleet live · {status.lanes ?? '—'} active desks
                    </div>
                ) : null}

                <div className="mt-8 w-full space-y-3">
                    {PRIMARY.map((b) => (
                        <a
                            key={b.label}
                            href={b.href}
                            className={`block rounded-2xl px-5 py-4 transition-all ${
                                b.tone === 'solid'
                                    ? 'bg-[#22d3ee] text-[#020617] hover:bg-cyan-300 hover:shadow-[0_0_28px_rgba(34,211,238,0.45)]'
                                    : 'border border-[#22d3ee]/30 text-cyan-100 hover:border-[#22d3ee]/60'
                            }`}
                        >
                            <div className="text-sm font-bold uppercase tracking-[0.12em]">{b.label}</div>
                            <div className={`mt-1 text-[11px] ${b.tone === 'solid' ? 'text-[#020617]/70' : 'text-white/50'}`}>{b.sub}</div>
                        </a>
                    ))}
                </div>

                <div className="mt-8 grid w-full grid-cols-3 gap-2">
                    {PROOF.map((p) => (
                        <div key={p.k} className="rounded-xl border border-white/5 bg-black/20 p-3 text-center">
                            <div className="text-[11px] font-bold text-cyan-200">{p.k}</div>
                            <div className="mt-1 text-[9px] leading-snug text-white/45">{p.v}</div>
                        </div>
                    ))}
                </div>

                {liveDesks.length > 0 ? (
                    <div className="mt-8 w-full">
                        <div className="mb-2 text-center text-[10px] uppercase tracking-[0.22em] text-white/35">Follow the build</div>
                        <div className="grid grid-cols-2 gap-2">
                            {liveDesks.map((s) => (
                                <a
                                    key={s.label}
                                    href={s.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-center text-[11px] text-white/70 transition-colors hover:border-[#22d3ee]/40 hover:text-cyan-200"
                                >
                                    {s.label}
                                    <span className="block text-[9px] text-white/35">{s.handle}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                ) : null}

                <div className="mt-auto pt-10 text-center text-[10px] leading-relaxed text-white/35">
                    <p>Software license, not investment advice. Trading carries real risk of loss — including ours.</p>
                    <p className="mt-1">
                        <a href="/deskos/" className="underline underline-offset-2 hover:text-cyan-200">eb28.co/deskos</a>
                        {' · '}
                        <a href="mailto:social@eb28.co" className="underline underline-offset-2 hover:text-cyan-200">social@eb28.co</a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default StartPage;
