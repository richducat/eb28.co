import { promises as fs } from 'node:fs';
import path from 'node:path';

const DEFAULT_PUBLIC_STATE_PATH = path.join(process.cwd(), 'ops', 'state', 'fundmanager-public.json');
const STATIC_FALLBACK_STATE_PATH = path.join(process.cwd(), 'public', 'data', 'fundmanager-public.json');
const DEFAULT_REMOTE_TIMEOUT_MS = 5000;
const MODE_WEIGHT = { active: 0, 'watch-only': 1, disabled: 2 };
const STATUS_WEIGHT = { RUNNING: 0, DEGRADED: 1, PAUSED: 2 };

function parseTimestamp(value) {
    if (!value) {
        return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isSnapshotStale(updatedAt, cycleIntervalMinutes) {
    const updated = parseTimestamp(updatedAt);
    if (!updated) {
        return true;
    }

    const intervalMinutes = Math.max(1, Number(cycleIntervalMinutes) || 10);
    const maxAgeMs = Math.max(15 * 60_000, intervalMinutes * 2 * 60_000);
    return Date.now() - updated.getTime() > maxAgeMs;
}

async function readJsonFile(filePath) {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
}

async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function readRemoteJson(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_REMOTE_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            headers: { 'User-Agent': 'FundManager-EB28/1.0' },
            cache: 'no-store',
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(`upstream returned ${response.status}`);
        }

        return await response.json();
    } finally {
        clearTimeout(timeout);
    }
}

async function loadSnapshot() {
    const remoteUrl = process.env.FUNDMANAGER_PUBLIC_STATE_URL;
    if (remoteUrl) {
        try {
            return {
                source: 'remote-public-snapshot',
                sourceType: 'url',
                state: await readRemoteJson(remoteUrl),
            };
        } catch (error) {
            const localPath = process.env.FUNDMANAGER_PUBLIC_STATE_PATH || DEFAULT_PUBLIC_STATE_PATH;

            if (await fileExists(localPath)) {
                return {
                    source: 'local-public-snapshot',
                    sourceType: 'file',
                    fallbackReason: `remote_failed:${error.message}`,
                    state: await readJsonFile(localPath),
                };
            }

            if (await fileExists(STATIC_FALLBACK_STATE_PATH)) {
                return {
                    source: 'static-public-cache',
                    sourceType: 'file',
                    fallbackReason: `remote_failed:${error.message}`,
                    state: await readJsonFile(STATIC_FALLBACK_STATE_PATH),
                };
            }

            throw error;
        }
    }

    const filePath = process.env.FUNDMANAGER_PUBLIC_STATE_PATH || DEFAULT_PUBLIC_STATE_PATH;
    if (await fileExists(filePath)) {
        return {
            source: 'local-public-snapshot',
            sourceType: 'file',
            state: await readJsonFile(filePath),
        };
    }

    return {
        source: 'static-public-cache',
        sourceType: 'file',
        state: await readJsonFile(STATIC_FALLBACK_STATE_PATH),
    };
}

function normalizeLane([laneId, lane]) {
    const cooldowns = Object.entries(lane.market_cooldowns || {}).map(([marketId, details]) => ({
        marketId,
        until: details?.until || null,
        reasonCode: details?.reason_code || null,
    }));

    return {
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
        cooldowns,
        circuitBreaker: {
            open: Boolean(lane.circuit_breaker?.open),
            openUntil: lane.circuit_breaker?.open_until || null,
            threshold: Number(lane.circuit_breaker?.threshold || 0),
            cooloffMinutes: Number(lane.circuit_breaker?.cooloff_minutes || 0),
        },
        recentEvents: Array.isArray(lane.recent_events) ? lane.recent_events : [],
    };
}

function compareLanes(left, right) {
    const modeDelta = (MODE_WEIGHT[left.mode] ?? 99) - (MODE_WEIGHT[right.mode] ?? 99);
    if (modeDelta !== 0) {
        return modeDelta;
    }

    const statusDelta = (STATUS_WEIGHT[left.status] ?? 99) - (STATUS_WEIGHT[right.status] ?? 99);
    if (statusDelta !== 0) {
        return statusDelta;
    }

    return left.name.localeCompare(right.name);
}

function formatSnapshot(state, source, sourceType, fallbackReason = null) {
    const summary = state.summary || {};
    const lanes = Object.entries(state.lanes || {}).map(normalizeLane).sort(compareLanes);
    const recentActions = Array.isArray(state.recent_actions)
        ? state.recent_actions.map((action) => ({
            timestamp: action.timestamp || null,
            laneId: action.lane_id || null,
            message: action.message || '',
            details: action.details || null,
        }))
        : [];
    const cycleIntervalMinutes = Number(summary.cycle_interval_minutes || 10);
    const updatedAt = state.generated_at || null;

    return {
        ok: true,
        source,
        sourceType,
        fallbackReason,
        updatedAt,
        stale: isSnapshotStale(updatedAt, cycleIntervalMinutes),
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

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
        const { state, source, sourceType, fallbackReason } = await loadSnapshot();
        return res.status(200).json(formatSnapshot(state, source, sourceType, fallbackReason));
    } catch (error) {
        return res.status(503).json({
            ok: false,
            error: `Failed to load fundmanager state: ${error.message}`,
            hint: 'Generate ops/state/fundmanager-public.json locally or set FUNDMANAGER_PUBLIC_STATE_URL for remote reads.',
        });
    }
}
