import React, { useCallback, useEffect, useState } from 'react';

import { AGENT_ROSTER as AGENTS } from './fundmanagerMeta';

const PROD_REMOTE_SNAPSHOT_HOSTS = new Set(['eb28.co', 'www.eb28.co', 'fundmanager.eb28.co']);
const PROD_REMOTE_SNAPSHOT_URL = 'https://fundstate.eb28.co/fund-state.json';
const IS_PROD_REMOTE_SNAPSHOT_HOST =
    typeof window !== 'undefined' && PROD_REMOTE_SNAPSHOT_HOSTS.has(window.location.hostname.toLowerCase());
const detectedProdRemoteSnapshotUrl = IS_PROD_REMOTE_SNAPSHOT_HOST ? PROD_REMOTE_SNAPSHOT_URL : '';
const REMOTE_SNAPSHOT_URL = import.meta.env.VITE_FUNDMANAGER_PUBLIC_STATE_URL || detectedProdRemoteSnapshotUrl;

const STATUS_TONE = {
    RUNNING: {
        badge: 'border-green-400/30 bg-green-500/10 text-green-300',
        dot: 'bg-green-400',
    },
    DEGRADED: {
        badge: 'border-amber-400/30 bg-amber-500/10 text-amber-300',
        dot: 'bg-amber-400',
    },
    PAUSED: {
        badge: 'border-rose-400/30 bg-rose-500/10 text-rose-300',
        dot: 'bg-rose-400',
    },
    STALE: {
        badge: 'border-orange-400/30 bg-orange-500/10 text-orange-300',
        dot: 'bg-orange-400',
    },
    OFFLINE: {
        badge: 'border-slate-400/30 bg-slate-500/10 text-slate-300',
        dot: 'bg-slate-400',
    },
    MONITORING: {
        badge: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300',
        dot: 'bg-cyan-400',
    },
    CONNECTING: {
        badge: 'border-slate-400/30 bg-slate-500/10 text-slate-300',
        dot: 'bg-slate-400',
    },
};

const LANE_MODE_LABEL = {
    active: 'Active',
    platform: 'Platform',
    'watch-only': 'Watch only',
    disabled: 'Disabled',
};

function getStatusTone(status) {
    return STATUS_TONE[status] || STATUS_TONE.MONITORING;
}

function humanizeToken(value, fallback = 'None') {
    if (!value) {
        return fallback;
    }

    return String(value)
        .replace(/[_-]+/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatCurrency(value, fallback = '--') {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: parsed >= 1000 ? 0 : 2,
    }).format(parsed);
}

function formatCompactNumber(value, fallback = '--') {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    return new Intl.NumberFormat('en-US', {
        notation: Math.abs(parsed) >= 1000 ? 'compact' : 'standard',
        maximumFractionDigits: Math.abs(parsed) >= 1000 ? 1 : 2,
    }).format(parsed);
}

function formatSignedCurrency(value, fallback = '--') {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    const formatted = formatCurrency(Math.abs(parsed));
    return parsed > 0 ? `+${formatted}` : (parsed < 0 ? `-${formatted}` : formatted);
}

function formatTimestamp(value, fallback = '--') {
    if (!value) {
        return fallback;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return fallback;
    }

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(parsed);
}

function formatRelativeTimestamp(value, fallback = '--') {
    if (!value) {
        return fallback;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return fallback;
    }

    const diffMs = Date.now() - parsed.getTime();
    const diffMinutes = Math.round(diffMs / 60_000);

    if (Math.abs(diffMinutes) < 1) {
        return 'Just now';
    }
    if (Math.abs(diffMinutes) < 60) {
        return `${diffMinutes}m ago`;
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (Math.abs(diffHours) < 24) {
        return `${diffHours}h ago`;
    }

    const diffDays = Math.round(diffHours / 24);
    return `${diffDays}d ago`;
}

function isSnapshotStaleClient(updatedAt, cycleIntervalMinutes) {
    if (!updatedAt) {
        return true;
    }

    const parsed = new Date(updatedAt);
    if (Number.isNaN(parsed.getTime())) {
        return true;
    }

    const intervalMinutes = Math.max(1, Number(cycleIntervalMinutes) || 10);
    const maxAgeMs = Math.max(15 * 60_000, intervalMinutes * 2 * 60_000);
    return Date.now() - parsed.getTime() > maxAgeMs;
}

function deriveAgentHealth(agent, laneMap, systemStatus) {
    const linkedLanes = agent.laneIds.map((laneId) => laneMap[laneId]).filter(Boolean);

    if (linkedLanes.length === 0) {
        return {
            status: systemStatus === 'OFFLINE' ? 'OFFLINE' : 'MONITORING',
            summary: 'Research-only roster; no direct live lane assignment.',
            detail: 'Watching upstream strategy inputs and route conditions.',
        };
    }

    const severity = ['RUNNING', 'MONITORING', 'DEGRADED', 'PAUSED'];
    const chosenLane = linkedLanes
        .slice()
        .sort((left, right) => severity.indexOf(right.status) - severity.indexOf(left.status))[0];
    const laneNames = linkedLanes.map((lane) => lane.name).join(', ');

    return {
        status: chosenLane.status || 'DEGRADED',
        summary: laneNames,
        detail: chosenLane.lastReasonCode
            ? `Blocker: ${humanizeToken(chosenLane.lastReasonCode)}`
            : `Next action: ${humanizeToken(chosenLane.nextAction)}`,
    };
}

function normalizeRemoteSnapshot(raw) {
    if (!raw || typeof raw !== 'object') {
        throw new Error('Invalid fundmanager snapshot payload.');
    }

    if (raw.ok && raw.summary && Array.isArray(raw.lanes)) {
        return raw;
    }

    const summary = raw.summary || {};
    const lanes = Object.entries(raw.lanes || {}).map(([laneId, lane]) => ({
        id: lane.id || laneId,
        name: lane.name || laneId,
        mode: lane.mode || 'disabled',
        status: lane.status || 'PAUSED',
        lastCycleAt: lane.last_cycle_at || null,
        lastReasonCode: lane.last_reason_code || null,
        lastErrorClass: lane.last_error_class || null,
        lastSuccessfulFillAt: lane.last_successful_fill_at || null,
        nextAction: lane.next_action || null,
        consecutiveFailures: Number(lane.consecutive_failures || 0),
        metrics: lane.metrics || {},
        reasonMetrics: lane.reason_metrics || {},
        cooldowns: Object.entries(lane.market_cooldowns || {}).map(([marketId, details]) => ({
            marketId,
            until: details?.until || null,
            reasonCode: details?.reason_code || null,
        })),
        circuitBreaker: {
            open: Boolean(lane.circuit_breaker?.open),
            openUntil: lane.circuit_breaker?.open_until || null,
            threshold: Number(lane.circuit_breaker?.threshold || 0),
            cooloffMinutes: Number(lane.circuit_breaker?.cooloff_minutes || 0),
        },
        recentEvents: Array.isArray(lane.recent_events) ? lane.recent_events : [],
    }));

    const recentActions = Array.isArray(raw.recent_actions)
        ? raw.recent_actions.map((action) => ({
            timestamp: action.timestamp || null,
            laneId: action.lane_id || null,
            message: action.message || '',
            details: action.details || null,
        }))
        : [];

    const updatedAt = raw.generated_at || null;
    const cycleIntervalMinutes = Number(summary.cycle_interval_minutes || 10);

    return {
        ok: true,
        source: 'remote-public-snapshot',
        sourceType: 'url',
        updatedAt,
        stale: isSnapshotStaleClient(updatedAt, cycleIntervalMinutes),
        summary: {
            status: summary.status || 'PAUSED',
            cycleIntervalMinutes,
            activeLanes: Number(summary.active_lanes || 0),
            topBlockers: Array.isArray(summary.top_blockers)
                ? summary.top_blockers.map((blocker) => ({
                    reasonCode: blocker.reason_code || 'UNKNOWN',
                    count: Number(blocker.count || 0),
                }))
                : [],
            lastSuccessfulFillAt: summary.last_successful_fill_at || null,
        },
        lanes,
        recentActions,
    };
}

async function fetchSnapshotJson(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
        const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
        const data = await response.json();
        if (!response.ok || data?.ok === false) {
            throw new Error(data?.error || `Snapshot request failed: ${response.status}`);
        }
        return normalizeRemoteSnapshot(data);
    } finally {
        clearTimeout(timeout);
    }
}

function getSnapshotSourceUrls() {
    const sources = [];

    sources.push('/data/fundmanager-data.json');

    if (!sources.includes('/data/fundmanager-public.json')) {
        sources.push('/data/fundmanager-public.json');
    }

    if (REMOTE_SNAPSHOT_URL && !sources.includes(REMOTE_SNAPSHOT_URL)) {
        sources.push(REMOTE_SNAPSHOT_URL);
    }

    return sources;
}

const FundManager = () => {
    const [snapshot, setSnapshot] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(true);

    const loadLiveData = useCallback(async () => {
        try {
            const sourceErrors = [];

            for (const sourceUrl of getSnapshotSourceUrls()) {
                try {
                    const data = await fetchSnapshotJson(sourceUrl);

                    if (sourceErrors.length > 0) {
                        data.fallbackReason = sourceErrors[0];
                    }

                    setSnapshot(data);
                    setErrorMessage('');
                    return;
                } catch (error) {
                    sourceErrors.push(error.message || `Failed to load ${sourceUrl}`);
                }
            }

            throw new Error(sourceErrors[sourceErrors.length - 1] || 'Failed to load orchestrator snapshot.');
        } catch (error) {
            setSnapshot(null);
            setErrorMessage(error.message || 'Failed to load orchestrator snapshot.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadLiveData();
        const interval = setInterval(loadLiveData, 30_000);
        return () => clearInterval(interval);
    }, [loadLiveData]);

    const laneMap = Object.fromEntries((snapshot?.lanes || []).map((lane) => [lane.id, lane]));
    const summary = snapshot?.summary || null;
    const account = snapshot?.account || null;
    const liveBook = snapshot?.liveBook || { positions: [], openOrders: [], untrackedSources: [] };
    const recentActions = snapshot?.recentActions || [];
    const topBlockers = summary?.topBlockers || [];
    const totalLiveLanes = (snapshot?.lanes || []).filter((lane) => lane.mode === 'active').length;
    const systemState = snapshot
        ? (snapshot.stale ? 'STALE' : summary?.status || 'DEGRADED')
        : (errorMessage ? 'OFFLINE' : 'CONNECTING');
    const systemTone = getStatusTone(systemState);

    const systemCards = [
        {
            label: 'System',
            value: systemState,
            tone: getStatusTone(systemState).dot.replace('bg-', 'text-'),
        },
        {
            label: 'Updated',
            value: snapshot?.updatedAt ? formatRelativeTimestamp(snapshot.updatedAt) : (loading ? 'Loading...' : '--'),
            tone: snapshot?.stale ? 'text-orange-300' : 'text-cyan-300',
        },
        {
            label: 'Free Cash',
            value: formatCurrency(account?.balanceUsdc, loading ? 'Loading...' : '--'),
            tone: (account?.balanceUsdc || 0) >= 5 ? 'text-green-300' : 'text-amber-300',
        },
        {
            label: 'Exposure',
            value: formatCurrency(account?.totalExposure, loading ? 'Loading...' : '--'),
            tone: 'text-blue-300',
        },
        {
            label: 'Open Book',
            value: `${account?.activePositionCount ?? 0} pos / ${account?.openOrderCount ?? 0} ord`,
            tone: 'text-fuchsia-300',
        },
        {
            label: 'Desk PnL',
            value: formatSignedCurrency(account?.totalPnl, loading ? 'Loading...' : '--'),
            tone: (account?.totalPnl || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300',
        },
    ];

    return (
        <div className="min-h-screen overflow-x-hidden bg-[#020617] text-[#22d3ee] font-mono relative selection:bg-[#22d3ee] selection:text-[#020617]">
            {/* Background Image */}
            <div className="absolute inset-0 -z-20">
                <img src="/images/fundmanager_bg.png" alt="Fund Manager Data" className="w-full h-full object-cover opacity-[0.05]" />
            </div>
            <div className="fixed inset-0 crt-overlay opacity-10 pointer-events-none z-50"></div>
            <div className="fixed inset-0 eb28-appbuilder-noise opacity-5 pointer-events-none"></div>

            <div className="relative z-10 mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-5 lg:px-6 lg:py-6">
                <header className="mb-6">
                    <section className="eb28-panel rounded-[28px] border border-[#22d3ee]/15 p-4 sm:p-6">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                            <div className="min-w-0">
                                <div className="flex items-start gap-3 sm:gap-4">
                                    <div className="text-[2.4rem] leading-none text-[#22d3ee]/80 animate-pulse sm:text-[2.9rem]">&gt;</div>
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h1 className="text-[clamp(1.8rem,7vw,3rem)] font-bold tracking-[-0.08em] leading-none break-words">
                                                FUNDMANAGER.EB28.CO
                                            </h1>
                                            <span className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em] ${systemTone.badge}`}>
                                                <span className={`h-2 w-2 rounded-full ${systemTone.dot}`}></span>
                                                {systemState}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-[10px] uppercase tracking-[0.22em] opacity-55 sm:text-[11px]">
                                            Autonomous Trading Matrix v3.3
                                        </p>
                                        <p className="mt-3 max-w-2xl text-[12px] leading-relaxed text-white/65 sm:text-sm">
                                            Simulated hedge fund bridge showing live bot activity, platform support lanes, and source-tagged Simmer exposure.
                                        </p>
                                        <div className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.18em] text-white/55">
                                            <span className="rounded-full border border-[#22d3ee]/10 bg-black/20 px-2.5 py-1">
                                                Source {snapshot?.sourceType || 'snapshot'}
                                            </span>
                                            <span className="rounded-full border border-[#22d3ee]/10 bg-black/20 px-2.5 py-1">
                                                Cycle {(summary?.cycleIntervalMinutes || 10)}m
                                            </span>
                                            <span className="rounded-full border border-[#22d3ee]/10 bg-black/20 px-2.5 py-1">
                                                Updated {formatTimestamp(snapshot?.updatedAt)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {errorMessage ? (
                                    <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-[11px] leading-relaxed text-rose-200">
                                        Snapshot unavailable: {errorMessage}
                                    </div>
                                ) : null}
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:w-[42rem]">
                                {systemCards.map((card) => (
                                    <div key={card.label} className="rounded-2xl border border-[#22d3ee]/10 bg-black/20 p-3 sm:p-4">
                                        <div className="text-[10px] uppercase tracking-[0.22em] opacity-50">{card.label}</div>
                                        <div className={`mt-3 text-sm font-bold sm:text-base ${card.tone}`}>
                                            {card.value}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </header>

                <section className="mb-6">
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-[10px] uppercase tracking-[0.24em] opacity-45">Research agents</p>
                            <h2 className="text-lg font-bold text-white/90 sm:text-xl">Agent roster</h2>
                        </div>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">
                            Linked lanes inherit live orchestrator status
                        </p>
                    </div>

                    <main className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {AGENTS.map((agent) => {
                            const health = deriveAgentHealth(agent, laneMap, systemState);
                            const statusTone = getStatusTone(health.status);

                            return (
                                <article
                                    key={agent.id}
                                    className="eb28-panel rounded-[26px] border border-[#22d3ee]/10 p-4 transition-all hover:border-[#22d3ee]/30 hover:shadow-[0_16px_36px_rgba(3,7,18,0.45)] sm:p-5"
                                >
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-start gap-3 sm:gap-4">
                                            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl border border-[#22d3ee]/20 bg-[#0f172a] pixel-art ring-1 ring-[#22d3ee]/10 sm:h-[4.5rem] sm:w-[4.5rem]">
                                                <div
                                                    className="h-full w-full scale-110 bg-no-repeat transition-all duration-300"
                                                    style={{
                                                        backgroundImage: `url('/assets/agents_grid.png')`,
                                                        backgroundSize: '400% 300%',
                                                        backgroundPosition: `${(agent.gridPos.x * 100) / 3}% ${(agent.gridPos.y * 100) / 2}%`,
                                                    }}
                                                ></div>
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                    <div className="min-w-0">
                                                        <p className="mb-2 text-[10px] uppercase tracking-[0.24em] opacity-40">Research agent</p>
                                                        <h3
                                                            className="text-base font-bold leading-tight break-words sm:text-lg xl:text-base"
                                                            style={{ color: agent.color }}
                                                        >
                                                            {agent.name.toUpperCase()}
                                                        </h3>
                                                    </div>

                                                    <span className={`inline-flex items-center gap-2 self-start rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] ${statusTone.badge}`}>
                                                        <span className={`h-2 w-2 rounded-full ${statusTone.dot}`}></span>
                                                        {health.status}
                                                    </span>
                                                </div>

                                                <div className="mt-3 flex flex-wrap gap-1.5">
                                                    {agent.roles.map((role) => (
                                                        <span
                                                            key={role}
                                                            className="rounded-full border border-[#22d3ee]/10 bg-[#22d3ee]/8 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white/60"
                                                        >
                                                            {role.replace(/-/g, ' ')}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-white/5 bg-black/20 p-3">
                                            <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-white/50">Live assignment</div>
                                            <p className="text-[11px] font-bold leading-relaxed text-white/85 sm:text-xs">
                                                {health.summary}
                                            </p>
                                            <p className="mt-2 text-[11px] leading-relaxed text-white/65 sm:text-xs">
                                                {health.detail}
                                            </p>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </main>
                </section>

                <section className="grid grid-cols-1 gap-4 pb-8 xl:grid-cols-4">
                    <div className="eb28-panel rounded-[28px] border border-[#22d3ee]/10 p-4 sm:p-5 xl:col-span-1">
                        <div className="mb-4">
                            <p className="text-[10px] uppercase tracking-[0.24em] opacity-45">Lane health</p>
                            <h2 className="mt-1 text-lg font-bold text-white/90">Execution truth</h2>
                        </div>

                        <div className="space-y-3">
                            {(snapshot?.lanes || []).map((lane) => {
                                const tone = getStatusTone(lane.status);
                                return (
                                    <div key={lane.id} className="rounded-2xl border border-[#22d3ee]/10 bg-black/20 p-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/85">
                                                    {lane.name}
                                                </div>
                                                <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/45">
                                                    {LANE_MODE_LABEL[lane.mode] || humanizeToken(lane.mode)}
                                                </div>
                                            </div>
                                            <span className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em] ${tone.badge}`}>
                                                <span className={`h-2 w-2 rounded-full ${tone.dot}`}></span>
                                                {lane.status}
                                            </span>
                                        </div>

                                        <div className="mt-3 space-y-2 text-[11px] leading-relaxed text-white/65">
                                            <div>Next: {humanizeToken(lane.nextAction)}</div>
                                            <div>Blocker: {humanizeToken(lane.lastReasonCode)}</div>
                                            <div>Cadence: {lane.cadenceMinutes ? `${lane.cadenceMinutes}m` : '--'}</div>
                                            <div>Value: {formatCurrency(lane.providerActivity?.positionValueUsd, '$0.00')}</div>
                                            <div>PnL: {formatSignedCurrency(lane.providerActivity?.positionPnlUsd, '$0.00')}</div>
                                            <div>Book: {lane.providerActivity?.positionCount || 0} pos / {lane.providerActivity?.openOrderCount || 0} ord</div>
                                            {lane.circuitBreaker?.open ? (
                                                <div className="text-rose-200">
                                                    Circuit open until {formatTimestamp(lane.circuitBreaker.openUntil)}
                                                </div>
                                            ) : null}
                                            {lane.cooldowns?.length ? (
                                                <div className="text-amber-200">
                                                    Cooldowns: {lane.cooldowns.length}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}

                            {!snapshot?.lanes?.length ? (
                                <div className="rounded-2xl border border-[#22d3ee]/10 bg-black/20 p-3 text-[11px] leading-relaxed text-white/60">
                                    No orchestrator lanes available yet.
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="eb28-panel rounded-[28px] border border-[#22d3ee]/10 p-4 sm:p-5 xl:col-span-3">
                        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.24em] opacity-45">Live system telemetry</p>
                                <h2 className="mt-1 text-lg font-bold text-white/90">Top blockers and recent actions</h2>
                            </div>
                            <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.2em] ${systemTone.badge}`}>
                                <span className={`h-2 w-2 rounded-full ${systemTone.dot}`}></span>
                                {snapshot ? (snapshot.stale ? 'Snapshot stale' : 'Snapshot live') : (loading ? 'Loading snapshot' : 'Snapshot unavailable')}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
                            <div className="rounded-2xl border border-[#22d3ee]/10 bg-black/20 p-3">
                                <div className="mb-3 text-[10px] uppercase tracking-[0.2em] text-white/45">Top blockers</div>
                                <div className="space-y-2">
                                    {topBlockers.length ? topBlockers.map((blocker) => (
                                        <div key={blocker.reasonCode} className="rounded-xl border border-amber-400/15 bg-amber-500/5 p-3">
                                            <div className="text-[10px] uppercase tracking-[0.18em] text-amber-200/70">
                                                {humanizeToken(blocker.reasonCode)}
                                            </div>
                                            <div className="mt-1 text-lg font-bold text-amber-200">
                                                {blocker.count}
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="rounded-xl border border-[#22d3ee]/10 bg-[#22d3ee]/5 p-3 text-[11px] leading-relaxed text-white/60">
                                            No blockers recorded in the latest snapshot.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="custom-scrollbar max-h-[26rem] overflow-y-auto rounded-2xl border border-[#22d3ee]/10 bg-[#22d3ee]/5 p-3 text-[11px] leading-relaxed sm:p-4">
                                {recentActions.length ? recentActions.map((action, index) => (
                                    <div key={`${action.timestamp || 'na'}-${index}`} className={`mb-3 rounded-xl border px-3 py-2 ${index === 0 ? 'border-[#22d3ee]/20 bg-[#22d3ee]/8 text-[#22d3ee]' : 'border-white/5 bg-black/10 text-white/60'}`}>
                                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                            <span className="text-[10px] uppercase tracking-[0.18em] opacity-60">
                                                {action.laneId ? humanizeToken(action.laneId) : 'System'}
                                            </span>
                                            <span className="text-[10px] uppercase tracking-[0.18em] opacity-45">
                                                {formatTimestamp(action.timestamp)}
                                            </span>
                                        </div>
                                        <div className="mt-1">{action.message}</div>
                                    </div>
                                )) : (
                                    <div className="rounded-xl border border-[#22d3ee]/10 bg-black/10 p-3 text-white/60">
                                        No recent actions have been published yet.
                                    </div>
                                )}
                                <div className="cursor-blink mt-3 text-[10px] text-white/40">
                                    SYSTEM://ORCHESTRATOR_STATE_STREAM
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="grid grid-cols-1 gap-4 pb-8 xl:grid-cols-2">
                    <div className="eb28-panel rounded-[28px] border border-[#22d3ee]/10 p-4 sm:p-5">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.24em] opacity-45">Live book</p>
                                <h2 className="mt-1 text-lg font-bold text-white/90">Positions by desk</h2>
                            </div>
                            <span className="rounded-full border border-[#22d3ee]/10 bg-black/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/55">
                                {liveBook.positions?.length || 0} active
                            </span>
                        </div>

                        <div className="space-y-3">
                            {liveBook.positions?.length ? liveBook.positions.map((position) => (
                                <div key={`${position.marketId}-${position.question}`} className="rounded-2xl border border-[#22d3ee]/10 bg-black/20 p-3">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0">
                                            <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                                                {position.sources?.length ? humanizeToken(position.sources[0]) : 'Desk'}
                                            </div>
                                            <div className="mt-1 text-sm font-bold leading-relaxed text-white/90">
                                                {position.question}
                                            </div>
                                        </div>
                                        <div className="text-left sm:text-right">
                                            <div className="text-sm font-bold text-cyan-300">
                                                {formatCurrency(position.currentValue)}
                                            </div>
                                            <div className={`mt-1 text-[11px] ${Number(position.pnl) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                                                {formatSignedCurrency(position.pnl)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em] text-white/50">
                                        <span className="rounded-full border border-white/10 bg-[#22d3ee]/5 px-2 py-1">
                                            {position.venue}
                                        </span>
                                        <span className="rounded-full border border-white/10 bg-[#22d3ee]/5 px-2 py-1">
                                            YES {formatCompactNumber(position.sharesYes, '0')}
                                        </span>
                                        <span className="rounded-full border border-white/10 bg-[#22d3ee]/5 px-2 py-1">
                                            NO {formatCompactNumber(position.sharesNo, '0')}
                                        </span>
                                        <span className="rounded-full border border-white/10 bg-[#22d3ee]/5 px-2 py-1">
                                            Resolve {formatTimestamp(position.resolvesAt)}
                                        </span>
                                    </div>
                                </div>
                            )) : (
                                <div className="rounded-2xl border border-[#22d3ee]/10 bg-black/20 p-3 text-[11px] leading-relaxed text-white/60">
                                    No active positions are visible in the live book.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="eb28-panel rounded-[28px] border border-[#22d3ee]/10 p-4 sm:p-5">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.24em] opacity-45">Order blotter</p>
                                <h2 className="mt-1 text-lg font-bold text-white/90">Live queue and stray sources</h2>
                            </div>
                            <span className="rounded-full border border-[#22d3ee]/10 bg-black/20 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/55">
                                {liveBook.openOrders?.length || 0} open
                            </span>
                        </div>

                        <div className="space-y-3">
                            {liveBook.openOrders?.length ? liveBook.openOrders.map((order) => (
                                <div key={`${order.tradeId || order.orderId || order.marketId}-${order.createdAt}`} className="rounded-2xl border border-[#22d3ee]/10 bg-black/20 p-3">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0">
                                            <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                                                {humanizeToken(order.sourceTag)}
                                            </div>
                                            <div className="mt-1 text-sm font-bold leading-relaxed text-white/90">
                                                {order.question}
                                            </div>
                                        </div>
                                        <div className="text-left sm:text-right">
                                            <div className="text-sm font-bold text-cyan-300">
                                                {order.tradeType?.toUpperCase()} {order.side?.toUpperCase()}
                                            </div>
                                            <div className="mt-1 text-[11px] text-white/55">
                                                {formatTimestamp(order.createdAt)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em] text-white/50">
                                        <span className="rounded-full border border-white/10 bg-[#22d3ee]/5 px-2 py-1">
                                            {order.venue}
                                        </span>
                                        <span className="rounded-full border border-white/10 bg-[#22d3ee]/5 px-2 py-1">
                                            Price {formatCurrency(order.price)}
                                        </span>
                                        <span className="rounded-full border border-white/10 bg-[#22d3ee]/5 px-2 py-1">
                                            Cost {formatCurrency(order.costUsdc)}
                                        </span>
                                    </div>
                                </div>
                            )) : (
                                <div className="rounded-2xl border border-[#22d3ee]/10 bg-black/20 p-3 text-[11px] leading-relaxed text-white/60">
                                    No live open orders are sitting on the blotter right now.
                                </div>
                            )}

                            {liveBook.untrackedSources?.length ? (
                                <div className="rounded-2xl border border-amber-300/15 bg-amber-500/5 p-3">
                                    <div className="text-[10px] uppercase tracking-[0.2em] text-amber-200/70">
                                        Unmapped Sources
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {liveBook.untrackedSources.map((sourceTag) => (
                                            <span key={sourceTag} className="rounded-full border border-amber-300/20 bg-black/20 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-amber-100">
                                                {sourceTag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default FundManager;
