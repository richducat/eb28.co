import React, { useCallback, useEffect, useState } from 'react';
import SiteNav from './SiteNav.jsx';

import {
    AGENT_ROSTER as AGENTS,
    DESK_COMMERCE,
    DESK_PRICE_USD,
    BUNDLE_CHECKOUT_URL,
    BUNDLE_PRICE_USD,
    LANE_INDEX,
} from './fundmanagerMeta';

const PROD_REMOTE_SNAPSHOT_HOSTS = new Set([
    'eb28.co',
    'www.eb28.co',
    'fundmanager.eb28.co',
    'daytradingbot.net',
    'www.daytradingbot.net',
]);
const STATIC_PREVIEW_HOSTS = new Set(['localhost', '127.0.0.1']);
const PROD_REMOTE_SNAPSHOT_URL = 'https://raw.githubusercontent.com/richducat/eb28.co/fund-state/fund-state.json';
const SOURCE_TIMEOUT_MS = 5000;
const IS_PROD_REMOTE_SNAPSHOT_HOST =
    typeof window !== 'undefined' && PROD_REMOTE_SNAPSHOT_HOSTS.has(window.location.hostname.toLowerCase());
const detectedProdRemoteSnapshotUrl = IS_PROD_REMOTE_SNAPSHOT_HOST ? PROD_REMOTE_SNAPSHOT_URL : '';
const REMOTE_SNAPSHOT_URL = import.meta.env.VITE_FUNDMANAGER_PUBLIC_STATE_URL || detectedProdRemoteSnapshotUrl;

// Light-theme status tones matching the daylight design language shared by
// Bluechip, Desk OS, and the tape/answers pages.
const STATUS_TONE = {
    RUNNING: {
        badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        dot: 'bg-emerald-500',
    },
    DEGRADED: {
        badge: 'border-amber-200 bg-amber-50 text-amber-700',
        dot: 'bg-amber-500',
    },
    PAUSED: {
        badge: 'border-rose-200 bg-rose-50 text-rose-700',
        dot: 'bg-rose-500',
    },
    STALE: {
        badge: 'border-orange-200 bg-orange-50 text-orange-700',
        dot: 'bg-orange-500',
    },
    OFFLINE: {
        badge: 'border-slate-200 bg-slate-100 text-slate-600',
        dot: 'bg-slate-400',
    },
    MONITORING: {
        badge: 'border-cyan-200 bg-cyan-50 text-cyan-700',
        dot: 'bg-cyan-500',
    },
    CONNECTING: {
        badge: 'border-slate-200 bg-slate-100 text-slate-600',
        dot: 'bg-slate-400',
    },
};

const LANE_MODE_LABEL = {
    active: 'Active',
    platform: 'Platform',
    'watch-only': 'Watch only',
    disabled: 'Disabled',
};

// Plain-English translations for the orchestrator's reason codes so a
// first-time visitor can read the dashboard without a glossary.
const REASON_EXPLAIN = {
    LOW_FREE_CAPITAL: 'Waiting on funding — the sizing gate holds every order until free cash returns.',
    WAITING_FOR_EDGE: 'Funded and scanning — no market currently clears this desk’s entry bar.',
    SETUP_REQUIRED: 'Needs one-time configuration before it goes hunting.',
    WATCH_ONLY: 'Observing markets and logging signals; trading intentionally disabled.',
    PLATFORM_IDLE: 'Support lane — wakes up when the trading desks need it.',
    LIVE_POSITION: 'Managing an open position right now.',
    LIVE_ORDER: 'Has a working order on the book right now.',
    CIRCUIT_BREAKER_OPEN: 'Tripped its own circuit breaker and is cooling off — a safety feature, not a crash.',
};

function explainReason(reasonCode) {
    return REASON_EXPLAIN[reasonCode] || null;
}

const SYSTEM_HEADLINE = {
    RUNNING: 'Desks are live and managing positions.',
    MONITORING: 'Desks are watching markets and waiting for an edge.',
    DEGRADED: 'Desks are healthy but blocked — usually waiting on capital.',
    PAUSED: 'Desks are parked by the kill switch.',
    STALE: 'Feed is catching up — last snapshot is older than two cycles.',
    OFFLINE: 'Telemetry offline — the publisher has not reported in.',
    CONNECTING: 'Connecting to the desk telemetry feed…',
};

function getStatusTone(status) {
    return STATUS_TONE[status] || STATUS_TONE.MONITORING;
}

// Fixed display order (registry order) so lane cards never reshuffle when
// statuses change between snapshots.
const LANE_DISPLAY_ORDER = Object.fromEntries(Object.keys(LANE_INDEX).map((id, index) => [id, index]));

function stableLaneSort(lanes) {
    return (lanes || []).slice().sort((left, right) => {
        const leftRank = LANE_DISPLAY_ORDER[left.id] ?? 99;
        const rightRank = LANE_DISPLAY_ORDER[right.id] ?? 99;
        return leftRank === rightRank ? String(left.id).localeCompare(String(right.id)) : leftRank - rightRank;
    });
}

function isApiBackedHost(hostname) {
    return hostname === 'dashboard.eb28.co' || hostname === 'command-center.eb28.co' || hostname.endsWith('.vercel.app');
}

function uniqueSources(sources) {
    return sources.filter(Boolean).filter((value, index, list) => list.indexOf(value) === index);
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

function formatVenueCashBreakdown(account) {
    const byVenue = account?.byVenue || {};
    const parts = [];

    if (byVenue.polymarket) {
        parts.push(`Poly ${formatCurrency(byVenue.polymarket.balance, '$0.00')}`);
    }
    if (byVenue.kalshi) {
        parts.push(`Kalshi ${formatCurrency(byVenue.kalshi.balance, '$0.00')}`);
    }
    if (byVenue.sim) {
        parts.push(`Sim ${formatCompactNumber(byVenue.sim.balance, '0')} $SIM`);
    }

    return parts.length ? parts.join(' · ') : 'Spendable USDC on live venues';
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

function parseNumericValue(value) {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    const normalized = String(value || '')
        .replace(/[^0-9.-]+/g, '')
        .trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function getTimeZoneOffsetMilliseconds(date, timeZone) {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    });
    const values = Object.fromEntries(
        formatter
            .formatToParts(date)
            .filter((part) => part.type !== 'literal')
            .map((part) => [part.type, part.value]),
    );

    return Date.UTC(
        Number(values.year),
        Number(values.month) - 1,
        Number(values.day),
        Number(values.hour),
        Number(values.minute),
        Number(values.second),
    ) - date.getTime();
}

function parseEasternTimestamp(value) {
    if (!value) {
        return null;
    }

    const direct = new Date(value);
    if (!Number.isNaN(direct.getTime())) {
        return direct.toISOString();
    }

    const match = String(value)
        .trim()
        .match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s+(AM|PM)\s+ET$/i);
    if (!match) {
        return null;
    }

    const [, month, day, year, rawHour, minute, second = '00', meridiem] = match;
    let hour = Number(rawHour);
    if (meridiem.toUpperCase() === 'PM' && hour < 12) {
        hour += 12;
    }
    if (meridiem.toUpperCase() === 'AM' && hour === 12) {
        hour = 0;
    }

    const utcGuess = new Date(Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        hour,
        Number(minute),
        Number(second),
    ));
    const offset = getTimeZoneOffsetMilliseconds(utcGuess, 'America/New_York');
    return new Date(utcGuess.getTime() - offset).toISOString();
}

function deriveAgentHealth(agent, laneMap, systemStatus) {
    const linkedLanes = agent.laneIds.map((laneId) => laneMap[laneId]).filter(Boolean);

    if (linkedLanes.length === 0) {
        if (agent.laneIds.length === 0) {
            return {
                status: systemStatus === 'OFFLINE' ? 'OFFLINE' : 'MONITORING',
                summary: 'Support desk — no trading lane of its own.',
                detail: 'Works across the fleet: research, journaling, and manual overrides.',
            };
        }

        return {
            status: systemStatus === 'OFFLINE' ? 'OFFLINE' : 'MONITORING',
            summary: 'Lane telemetry pending',
            detail: 'This desk’s lane is not in the current snapshot — it reports on the next publish cycle.',
        };
    }

    const laneNames = linkedLanes.map((lane) => lane.name).join(', ');
    const runningLane = linkedLanes.find((lane) => lane.status === 'RUNNING');
    if (runningLane) {
        const blockedLanes = linkedLanes.filter((lane) => lane.id !== runningLane.id && lane.lastReasonCode);
        return {
            status: 'RUNNING',
            summary: laneNames,
            reasonCode: null,
            detail: blockedLanes.length
                ? `${runningLane.name} is live; ${blockedLanes.length} linked venue${blockedLanes.length === 1 ? '' : 's'} still blocked.`
                : `Next action: ${humanizeToken(runningLane.nextAction)}`,
        };
    }

    const actionableLane = linkedLanes.find((lane) => lane.lastReasonCode && lane.lastReasonCode !== 'LOW_FREE_CAPITAL')
        || linkedLanes.find((lane) => lane.lastReasonCode)
        || linkedLanes[0];

    return {
        status: actionableLane.status || 'DEGRADED',
        summary: laneNames,
        reasonCode: actionableLane.lastReasonCode || null,
        detail: actionableLane.lastReasonCode
            ? `Blocker: ${humanizeToken(actionableLane.lastReasonCode)}`
            : `Next action: ${humanizeToken(actionableLane.nextAction)}`,
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

function normalizeTickerSnapshot(raw, sourceUrl) {
    if (!raw || typeof raw !== 'object' || raw.ok !== true || !raw.portfolio || !raw.orchestrator) {
        throw new Error('Invalid fundmanager ticker payload.');
    }

    const updatedAt = parseEasternTimestamp(raw.updatedAt) || raw.orchestrator?.lastCycle || null;
    const cycleIntervalMinutes = 10;
    const balanceUsdc = parseNumericValue(raw.portfolio?.balance);
    const totalExposure = parseNumericValue(raw.portfolio?.exposure);
    const totalPnl = parseNumericValue(raw.portfolio?.totalPnl);
    const activePositionCount = Number(raw.portfolio?.positionsCount || 0);
    const openOrderCount = 0;
    const blockerCode = Array.isArray(raw.committee?.blockers) && raw.committee.blockers.length > 0
        ? raw.committee.blockers[0]
        : null;
    const upstreamStatus = String(raw.orchestrator?.status || 'IDLE').toUpperCase();
    const laneMode = activePositionCount > 0 || upstreamStatus === 'RUNNING'
        ? 'active'
        : 'watch-only';
    const laneStatus = upstreamStatus === 'RUNNING'
        ? 'RUNNING'
        : (activePositionCount > 0 ? 'DEGRADED' : 'PAUSED');
    const sourceType = sourceUrl?.startsWith('/data/') ? 'cache' : 'url';
    const sourceLabel = raw.source || sourceUrl || 'fundmanager-data';

    const recentActions = [
        {
            timestamp: updatedAt,
            laneId: 'platform-bridge',
            message: `Portfolio bridge reports ${activePositionCount} open positions, exposure ${formatCurrency(totalExposure, '$0.00')}, and desk PnL ${formatSignedCurrency(totalPnl, '$0.00')}.`,
            details: null,
        },
        {
            timestamp: updatedAt,
            laneId: 'committee',
            message: `Committee ${humanizeToken(raw.committee?.decision || 'NO_TRADE')} with ${humanizeToken(raw.committee?.direction || 'NA')} direction at ${Number(raw.committee?.confidence || 0)} confidence.`,
            details: null,
        },
    ];

    if (Array.isArray(raw.trades)) {
        raw.trades.slice(0, 4).forEach((tradeLine) => {
            if (tradeLine) {
                recentActions.push({
                    timestamp: updatedAt,
                    laneId: 'trade-log',
                    message: String(tradeLine),
                    details: null,
                });
            }
        });
    }

    return {
        ok: true,
        source: sourceLabel,
        sourceType,
        updatedAt,
        stale: isSnapshotStaleClient(updatedAt, cycleIntervalMinutes),
        summary: {
            status: laneStatus,
            cycleIntervalMinutes,
            activeLanes: laneMode === 'active' ? 1 : 0,
            topBlockers: Array.isArray(raw.committee?.blockers)
                ? raw.committee.blockers.slice(0, 4).map((reasonCode) => ({
                    reasonCode: reasonCode || 'UNKNOWN',
                    count: 1,
                }))
                : [],
            lastSuccessfulFillAt: null,
        },
        account: {
            balanceUsdc,
            totalExposure,
            totalPnl,
            activePositionCount,
            openOrderCount,
        },
        liveBook: {
            positions: activePositionCount > 0
                ? [
                    {
                        marketId: 'aggregate-book',
                        question: `Aggregate open book from ${sourceLabel}`,
                        sources: [sourceLabel],
                        venue: 'Simmer',
                        currentValue: totalExposure,
                        pnl: totalPnl,
                        sharesYes: activePositionCount,
                        sharesNo: 0,
                        resolvesAt: updatedAt,
                    },
                ]
                : [],
            openOrders: [],
            untrackedSources: [],
        },
        lanes: [
            {
                id: 'platform-bridge',
                name: 'Platform Bridge',
                mode: laneMode,
                status: laneStatus,
                lastCycleAt: updatedAt,
                lastReasonCode: blockerCode,
                lastErrorClass: null,
                lastSuccessfulFillAt: null,
                nextAction: raw.committee?.decision === 'NO_TRADE' ? 'stand_by' : 'review_signal',
                consecutiveFailures: 0,
                cadenceMinutes: cycleIntervalMinutes,
                providerActivity: {
                    positionValueUsd: totalExposure,
                    positionPnlUsd: totalPnl,
                    positionCount: activePositionCount,
                    openOrderCount,
                },
                metrics: {},
                reasonMetrics: {},
                cooldowns: [],
                circuitBreaker: {
                    open: false,
                    openUntil: null,
                    threshold: 0,
                    cooloffMinutes: 0,
                },
                recentEvents: [],
            },
        ],
        recentActions: recentActions.filter((action) => action.message),
    };
}

function normalizeSnapshotPayload(raw, sourceUrl) {
    if (raw && typeof raw === 'object' && raw.portfolio && raw.orchestrator) {
        return normalizeTickerSnapshot(raw, sourceUrl);
    }

    return normalizeRemoteSnapshot(raw);
}

async function fetchSnapshotJson(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS);
    try {
        const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
        const data = await response.json();
        if (!response.ok || data?.ok === false) {
            throw new Error(data?.error || `Snapshot request failed: ${response.status}`);
        }
        return normalizeSnapshotPayload(data, url);
    } catch (error) {
        if (error?.name === 'AbortError') {
            throw new Error(`Snapshot request timed out: ${url}`);
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

function getSnapshotSourceUrls() {
    const hostname =
        typeof window === 'undefined' ? '' : window.location.hostname.toLowerCase();

    if (IS_PROD_REMOTE_SNAPSHOT_HOST) {
        return uniqueSources([REMOTE_SNAPSHOT_URL, '/data/fundmanager-data.json', '/data/fundmanager-public.json']);
    }

    if (STATIC_PREVIEW_HOSTS.has(hostname)) {
        return uniqueSources(['/data/fundmanager-data.json', '/data/fundmanager-public.json', REMOTE_SNAPSHOT_URL]);
    }

    if (isApiBackedHost(hostname)) {
        return uniqueSources(['/api/fundmanager-data', REMOTE_SNAPSHOT_URL, '/data/fundmanager-data.json', '/data/fundmanager-public.json']);
    }

    return uniqueSources([REMOTE_SNAPSHOT_URL, '/data/fundmanager-data.json', '/data/fundmanager-public.json']);
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
            caption: 'Worst status across live desks',
            tone: getStatusTone(systemState).dot.replace('bg-', 'text-'),
        },
        {
            label: 'Updated',
            value: snapshot?.updatedAt ? formatRelativeTimestamp(snapshot.updatedAt) : (loading ? 'Loading...' : '--'),
            caption: 'Snapshot age — publishes every cycle',
            tone: snapshot?.stale ? 'text-orange-600' : 'text-cyan-700',
        },
        {
            label: 'Free Cash',
            value: formatCurrency(account?.balanceUsdc, loading ? 'Loading...' : '--'),
            caption: formatVenueCashBreakdown(account),
            tone: (account?.balanceUsdc || 0) >= 5 ? 'text-emerald-600' : 'text-amber-600',
        },
        {
            label: 'Exposure',
            value: formatCurrency(account?.totalExposure, loading ? 'Loading...' : '--'),
            caption: 'Capital working inside open positions',
            tone: 'text-blue-700',
        },
        {
            label: 'Open Book',
            value: `${account?.activePositionCount ?? 0} pos / ${account?.openOrderCount ?? 0} ord`,
            caption: 'Live positions and resting orders',
            tone: 'text-slate-900',
        },
        {
            label: 'Desk PnL',
            value: formatSignedCurrency(account?.totalPnl, loading ? 'Loading...' : '--'),
            caption: 'Real lifetime result — never edited',
            tone: (account?.totalPnl || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600',
        },
    ];

    return (
        <div className="min-h-screen overflow-x-hidden bg-slate-50 font-sans text-slate-900 antialiased">
            <SiteNav active="/fundmanager/" subtitle="Live Tape" cta={{ href: '/bluechip/', label: 'Get the desk — $98' }} />

            <div className="mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8 lg:px-6">
                <header className="mb-6">
                    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                            <div className="min-w-0">
                                <div className="min-w-0">
                                    <p className="mb-3 inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-900">
                                        The EB28 Desk OS · live telemetry
                                    </p>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                                            The Live Tape
                                        </h1>
                                        <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${systemTone.badge}`}>
                                            <span className={`h-2 w-2 rounded-full ${systemTone.dot}`}></span>
                                            {systemState}
                                        </span>
                                    </div>
                                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
                                        Eight autonomous trading desks scanning Polymarket and Kalshi around the clock.
                                        Every order has to clear a kill-switch gate, a capital guard, and a trade journal
                                        before a cent moves. This page is the real feed — wins, losses, and blockers included.
                                    </p>
                                    <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-slate-800">
                                        {SYSTEM_HEADLINE[systemState] || SYSTEM_HEADLINE.CONNECTING}
                                    </p>
                                    <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
                                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                                            Source {snapshot?.sourceType || 'snapshot'}
                                        </span>
                                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                                            Cycle {(summary?.cycleIntervalMinutes || 10)}m
                                        </span>
                                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                                            Updated {formatTimestamp(snapshot?.updatedAt)}
                                        </span>
                                    </div>
                                    <div className="mt-5 flex flex-wrap items-center gap-3">
                                        <a
                                            href="/deskos/"
                                            className="rounded-full bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-700"
                                        >
                                            Own this system →
                                        </a>
                                        <a
                                            href="#desk-fleet"
                                            className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400"
                                        >
                                            Meet the desks ↓
                                        </a>
                                    </div>
                                </div>

                                {errorMessage ? (
                                    <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed text-rose-700">
                                        Snapshot unavailable: {errorMessage}
                                    </div>
                                ) : null}
                            </div>

                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:w-[42rem]">
                                {systemCards.map((card) => (
                                    <div key={card.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                                        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{card.label}</div>
                                        <div className={`mt-2 text-sm font-bold sm:text-base ${card.tone}`}>
                                            {card.value}
                                        </div>
                                        <div className="mt-2 text-[10px] leading-snug text-slate-500">
                                            {card.caption}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </header>

                <section id="desk-fleet" className="mb-6 scroll-mt-6">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-700">The desk fleet</p>
                            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">The live trading floor. Eight you can own.</h2>
                        </div>
                        <p className="text-xs font-semibold text-slate-500">
                            Status pulls straight from the live orchestrator
                        </p>
                    </div>

                    <main className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {AGENTS.map((agent) => {
                            const health = deriveAgentHealth(agent, laneMap, systemState);
                            const statusTone = getStatusTone(health.status);
                            const primaryLane = agent.laneIds.map((laneId) => LANE_INDEX[laneId]).filter(Boolean)[0] || null;
                            const commerceLaneId = agent.laneIds.find((laneId) => DESK_COMMERCE[laneId]) || null;
                            const commerce = commerceLaneId ? DESK_COMMERCE[commerceLaneId] : null;
                            const plainReason = explainReason(health.reasonCode);

                            return (
                                <article
                                    key={agent.id}
                                    className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-orange-300 hover:shadow-lg sm:p-5"
                                >
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-start gap-3 sm:gap-4">
                                            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl bg-slate-900 pixel-art ring-1 ring-slate-200 sm:h-[4.5rem] sm:w-[4.5rem]">
                                                {agent.external ? (
                                                    <div
                                                        className="flex h-full w-full items-center justify-center text-2xl font-bold"
                                                        style={{ color: agent.color, background: `radial-gradient(circle at 30% 25%, ${agent.color}22, transparent 70%)` }}
                                                    >
                                                        {agent.glyph || '$'}
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="h-full w-full scale-110 bg-no-repeat transition-all duration-300"
                                                        style={{
                                                            backgroundImage: `url('/assets/agents_grid.png')`,
                                                            backgroundSize: '400% 300%',
                                                            backgroundPosition: `${(agent.gridPos.x * 100) / 3}% ${(agent.gridPos.y * 100) / 2}%`,
                                                        }}
                                                    ></div>
                                                )}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                    <div className="min-w-0">
                                                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                                                            {(commerce || agent.kind === 'trading') ? 'Trading desk' : 'Support desk'}
                                                        </p>
                                                        <h3 className="text-base font-bold leading-tight tracking-tight text-slate-900 break-words sm:text-lg xl:text-base">
                                                            {agent.name}
                                                        </h3>
                                                    </div>

                                                    <span className={`inline-flex items-center gap-2 self-start rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] ${statusTone.badge}`}>
                                                        <span className={`h-2 w-2 rounded-full ${statusTone.dot}`}></span>
                                                        {health.status}
                                                    </span>
                                                </div>

                                                <div className="mt-3 flex flex-wrap gap-1.5">
                                                    {agent.roles.map((role) => (
                                                        <span
                                                            key={role}
                                                            className="rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500"
                                                        >
                                                            {role.replace(/-/g, ' ')}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                            {(primaryLane?.description || agent.description) ? (
                                                <p className="mb-2 text-xs leading-relaxed text-slate-600">
                                                    {primaryLane?.description || agent.description}
                                                </p>
                                            ) : null}
                                            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Live assignment</div>
                                            <p className="text-xs font-semibold leading-relaxed text-slate-800">
                                                {health.summary}
                                            </p>
                                            <p className="mt-2 text-xs leading-relaxed text-slate-500">
                                                {plainReason || health.detail}
                                            </p>
                                        </div>

                                        {commerce ? (
                                            <div className="flex flex-wrap items-center gap-2">
                                                <a
                                                    href={commerce.checkoutUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="rounded-full bg-orange-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-orange-700"
                                                >
                                                    License this agent — ${DESK_PRICE_USD}
                                                </a>
                                                <a
                                                    href="/deskos/"
                                                    className="text-xs font-medium text-slate-500 underline-offset-4 transition-colors hover:text-orange-700 hover:underline"
                                                >
                                                    or all 8 + the OS — ${BUNDLE_PRICE_USD}
                                                </a>
                                            </div>
                                        ) : agent.external === 'robinhood' ? (
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-700">
                                                    Robinhood Agentic · live beta
                                                </span>
                                                <a
                                                    href="/bluechip/"
                                                    className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-700"
                                                >
                                                    Founding beta — $98 →
                                                </a>
                                                <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">
                                                    Trading on this tape right now
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">
                                                Included with every Desk OS bundle
                                            </div>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </main>
                </section>

                <section className="mb-6">
                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                        <div className="mb-4">
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-700">How the machine works</p>
                            <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Four gates between an idea and your money</h2>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {[
                                {
                                    step: '01 — Scan',
                                    title: 'Desks hunt on a clock',
                                    body: 'Each agent wakes on its own cadence (5–240 min), pulls fresh market data, and scores entries against its strategy rules.',
                                },
                                {
                                    step: '02 — Gate',
                                    title: 'Kill switch rules everything',
                                    body: 'No order leaves the building unless the launch controller allows it. Real-money and paper modes are separate switches.',
                                },
                                {
                                    step: '03 — Execute',
                                    title: 'Sized, capped, cooled down',
                                    body: 'Smart sizing caps each order to a % of bankroll. Failures trip per-desk circuit breakers with forced cooling-off.',
                                },
                                {
                                    step: '04 — Journal',
                                    title: 'Everything hits the tape',
                                    body: 'Every fill, skip, and blocker is journaled and published to this dashboard. What you see is the unedited record.',
                                },
                            ].map((item) => (
                                <div key={item.step} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-orange-700">{item.step}</div>
                                    <div className="mt-2 text-sm font-bold text-slate-900">{item.title}</div>
                                    <p className="mt-2 text-xs leading-relaxed text-slate-600">{item.body}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="grid grid-cols-1 gap-4 pb-8 xl:grid-cols-4">
                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 xl:col-span-1">
                        <div className="mb-4">
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-700">Lane health</p>
                            <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Execution truth</h2>
                        </div>

                        <div className="space-y-3">
                            {stableLaneSort(snapshot?.lanes).map((lane) => {
                                const tone = getStatusTone(lane.status);
                                return (
                                    <div key={lane.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="text-xs font-bold text-slate-800">
                                                    {lane.name}
                                                </div>
                                                <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                                    {LANE_MODE_LABEL[lane.mode] || humanizeToken(lane.mode)}
                                                </div>
                                            </div>
                                            <span className={`inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${tone.badge}`}>
                                                <span className={`h-2 w-2 rounded-full ${tone.dot}`}></span>
                                                {lane.status}
                                            </span>
                                        </div>

                                        <div className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600">
                                            <div>Next: {humanizeToken(lane.nextAction)}</div>
                                            <div>Blocker: {humanizeToken(lane.lastReasonCode)}</div>
                                            <div>Cadence: {lane.cadenceMinutes ? `${lane.cadenceMinutes}m` : '--'}</div>
                                            <div>Value: {formatCurrency(lane.providerActivity?.positionValueUsd, '$0.00')}</div>
                                            <div>PnL: {formatSignedCurrency(lane.providerActivity?.positionPnlUsd, '$0.00')}</div>
                                            <div>Book: {lane.providerActivity?.positionCount || 0} pos / {lane.providerActivity?.openOrderCount || 0} ord</div>
                                            {lane.circuitBreaker?.open ? (
                                                <div className="font-semibold text-rose-600">
                                                    Circuit open until {formatTimestamp(lane.circuitBreaker.openUntil)}
                                                </div>
                                            ) : null}
                                            {lane.cooldowns?.length ? (
                                                <div className="font-semibold text-amber-700">
                                                    Cooldowns: {lane.cooldowns.length}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}

                            {!snapshot?.lanes?.length ? (
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
                                    No orchestrator lanes available yet.
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 xl:col-span-3">
                        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-700">Live system telemetry</p>
                                <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Top blockers and recent actions</h2>
                            </div>
                            <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] ${systemTone.badge}`}>
                                <span className={`h-2 w-2 rounded-full ${systemTone.dot}`}></span>
                                {snapshot ? (snapshot.stale ? 'Snapshot stale' : 'Snapshot live') : (loading ? 'Loading snapshot' : 'Snapshot unavailable')}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Top blockers</div>
                                <div className="space-y-2">
                                    {topBlockers.length ? topBlockers.map((blocker) => (
                                        <div key={blocker.reasonCode} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                                            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700">
                                                {humanizeToken(blocker.reasonCode)}
                                            </div>
                                            <div className="mt-1 text-lg font-bold text-amber-700">
                                                {blocker.count}
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-500">
                                            No blockers recorded in the latest snapshot.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="custom-scrollbar max-h-[26rem] overflow-y-auto rounded-2xl bg-slate-900 p-3 text-xs leading-relaxed shadow-inner sm:p-4">
                                {recentActions.length ? recentActions.map((action, index) => (
                                    <div key={`${action.timestamp || 'na'}-${index}`} className={`mb-3 rounded-xl border px-3 py-2 ${index === 0 ? 'border-amber-400/30 bg-amber-400/10 text-amber-200' : 'border-slate-700 bg-slate-800/60 text-slate-300'}`}>
                                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">
                                                {action.laneId ? humanizeToken(action.laneId) : 'System'}
                                            </span>
                                            <span className="text-[10px] uppercase tracking-[0.14em] opacity-50">
                                                {formatTimestamp(action.timestamp)}
                                            </span>
                                        </div>
                                        <div className="mt-1">{action.message}</div>
                                    </div>
                                )) : (
                                    <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3 text-slate-300">
                                        No recent actions have been published yet.
                                    </div>
                                )}
                                <div className="mt-3 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                                    Live orchestrator stream — refreshes every 30 seconds
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="grid grid-cols-1 gap-4 pb-8 xl:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-700">Live book</p>
                                <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Positions by desk</h2>
                            </div>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                {liveBook.positions?.length || 0} active
                            </span>
                        </div>

                        <div className="space-y-3">
                            {liveBook.positions?.length ? liveBook.positions.map((position) => (
                                <div key={`${position.marketId}-${position.question}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0">
                                            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                                {position.sources?.length ? humanizeToken(position.sources[0]) : 'Desk'}
                                            </div>
                                            <div className="mt-1 text-sm font-bold leading-relaxed text-slate-900">
                                                {position.question}
                                            </div>
                                        </div>
                                        <div className="text-left sm:text-right">
                                            <div className="text-sm font-bold text-slate-900">
                                                {formatCurrency(position.currentValue)}
                                            </div>
                                            <div className={`mt-1 text-xs font-semibold ${Number(position.pnl) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {formatSignedCurrency(position.pnl)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-medium text-slate-500">
                                        <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
                                            {position.venue}
                                        </span>
                                        <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
                                            YES {formatCompactNumber(position.sharesYes, '0')}
                                        </span>
                                        <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
                                            NO {formatCompactNumber(position.sharesNo, '0')}
                                        </span>
                                        <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
                                            Resolve {formatTimestamp(position.resolvesAt)}
                                        </span>
                                    </div>
                                </div>
                            )) : (
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
                                    No active positions are visible in the live book.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-700">Order blotter</p>
                                <h2 className="mt-1 text-lg font-bold tracking-tight text-slate-900">Live queue and stray sources</h2>
                            </div>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                                {liveBook.openOrders?.length || 0} open
                            </span>
                        </div>

                        <div className="space-y-3">
                            {liveBook.openOrders?.length ? liveBook.openOrders.map((order) => (
                                <div key={`${order.tradeId || order.orderId || order.marketId}-${order.createdAt}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0">
                                            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                                                {humanizeToken(order.sourceTag)}
                                            </div>
                                            <div className="mt-1 text-sm font-bold leading-relaxed text-slate-900">
                                                {order.question}
                                            </div>
                                        </div>
                                        <div className="text-left sm:text-right">
                                            <div className="text-sm font-bold text-slate-900">
                                                {order.tradeType?.toUpperCase()} {order.side?.toUpperCase()}
                                            </div>
                                            <div className="mt-1 text-xs text-slate-500">
                                                {formatTimestamp(order.createdAt)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-medium text-slate-500">
                                        <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
                                            {order.venue}
                                        </span>
                                        <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
                                            Price {formatCurrency(order.price)}
                                        </span>
                                        <span className="rounded-full border border-slate-200 bg-white px-2 py-1">
                                            Cost {formatCurrency(order.costUsdc)}
                                        </span>
                                    </div>
                                </div>
                            )) : (
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
                                    No live open orders are sitting on the blotter right now.
                                </div>
                            )}

                            {liveBook.untrackedSources?.length ? (
                                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                                    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                                        Unmapped Sources
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {liveBook.untrackedSources.map((sourceTag) => (
                                            <span key={sourceTag} className="rounded-full border border-amber-200 bg-white px-2 py-1 text-[10px] font-medium text-amber-700">
                                                {sourceTag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </section>

                <section className="pb-24">
                    <div className="rounded-3xl bg-slate-900 p-6 text-center shadow-xl sm:p-8">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-orange-400">This dashboard is the demo</p>
                        <h2 className="mx-auto mt-2 max-w-2xl text-xl font-bold leading-snug tracking-tight text-white sm:text-2xl">
                            Everything you're watching — the eight agents, the kill switch, the capital guard, this telemetry — ships as one package.
                        </h2>
                        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                            <a
                                href="/deskos/"
                                className="rounded-full bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-700"
                            >
                                Get the Desk OS — ${BUNDLE_PRICE_USD}
                            </a>
                            <a
                                href={BUNDLE_CHECKOUT_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-white/60"
                            >
                                Skip the pitch, checkout →
                            </a>
                        </div>
                        <p className="mt-4 text-xs text-slate-400">
                            Software license, not investment advice. Markets carry risk — read the full disclosures on the Desk OS page.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default FundManager;
