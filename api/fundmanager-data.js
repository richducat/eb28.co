import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { LANE_INDEX, LANE_REGISTRY, createDiscoveredLane, inferLaneIdFromSource, humanizeIdentifier } from '../src/fundmanagerMeta.js';

const DEFAULT_PUBLIC_STATE_PATH = path.join(process.cwd(), 'ops', 'state', 'fundmanager-public.json');
const STATIC_FALLBACK_STATE_PATH = path.join(process.cwd(), 'public', 'data', 'fundmanager-public.json');
const DEFAULT_REMOTE_TIMEOUT_MS = 5000;
const DEFAULT_SIMMER_BASE_URL = 'https://api.simmer.markets';
const MODE_WEIGHT = { active: 0, platform: 1, 'watch-only': 2, disabled: 3 };
const STATUS_WEIGHT = { RUNNING: 0, MONITORING: 1, DEGRADED: 2, PAUSED: 3 };
const NON_BLOCKER_REASON_CODES = new Set(['LIVE_POSITION', 'LIVE_ORDER', 'PLATFORM_IDLE', 'WATCH_ONLY']);

function parseTimestamp(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatIsoNow() {
  return new Date().toISOString();
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

async function resolveSimmerConfig() {
  const envApiKey = process.env.SIMMER_API_KEY?.trim();
  const envBaseUrl = process.env.SIMMER_BASE_URL?.trim();

  if (envApiKey) {
    return {
      apiKey: envApiKey,
      baseUrl: envBaseUrl || DEFAULT_SIMMER_BASE_URL,
    };
  }

  const credentialsPath = path.join(os.homedir(), '.config', 'simmer', 'credentials.json');
  if (!(await fileExists(credentialsPath))) {
    return { apiKey: '', baseUrl: envBaseUrl || DEFAULT_SIMMER_BASE_URL };
  }

  try {
    const credentials = await readJsonFile(credentialsPath);
    return {
      apiKey: String(credentials.api_key || '').trim(),
      baseUrl: String(credentials.api_url || envBaseUrl || DEFAULT_SIMMER_BASE_URL).trim(),
    };
  } catch {
    return { apiKey: '', baseUrl: envBaseUrl || DEFAULT_SIMMER_BASE_URL };
  }
}

async function fetchSimmerJson(apiKey, baseUrl, pathname) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_REMOTE_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}${pathname}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'User-Agent': 'FundManager-EB28/1.0',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`${pathname} returned ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizePosition(position) {
  return {
    marketId: position.market_id || '',
    question: position.question || '',
    venue: position.venue || 'polymarket',
    currentValue: asNumber(position.current_value),
    pnl: asNumber(position.pnl),
    status: position.status || 'active',
    currentPrice: position.current_price == null ? null : asNumber(position.current_price),
    sharesYes: asNumber(position.shares_yes),
    sharesNo: asNumber(position.shares_no),
    resolvesAt: position.resolves_at || null,
    sources: asArray(position.sources),
  };
}

function normalizeOrder(order) {
  const sourceTag = order.source || '';
  return {
    orderId: order.order_id || null,
    tradeId: order.trade_id || null,
    marketId: order.market_id || '',
    question: order.question || '',
    venue: order.venue || 'polymarket',
    side: order.side || '',
    tradeType: order.trade_type || '',
    shares: asNumber(order.shares),
    price: asNumber(order.price),
    costUsdc: asNumber(order.cost_usdc),
    createdAt: order.created_at || null,
    sourceTag,
    sourceTags: sourceTag ? [sourceTag] : [],
  };
}

function dedupeStrings(values) {
  return [...new Set(values.filter(Boolean))];
}

function getLatestTimestamp(values) {
  const timestamps = values
    .map((value) => parseTimestamp(value))
    .filter(Boolean)
    .sort((left, right) => right.getTime() - left.getTime());
  return timestamps[0]?.toISOString() || null;
}

function buildLaneActivity(definition, positions, orders) {
  const positionValueUsd = positions.reduce((sum, position) => sum + position.currentValue, 0);
  const positionPnlUsd = positions.reduce((sum, position) => sum + position.pnl, 0);

  return {
    positions,
    openOrders: orders,
    positionCount: positions.length,
    openOrderCount: orders.length,
    positionValueUsd: Number(positionValueUsd.toFixed(2)),
    positionPnlUsd: Number(positionPnlUsd.toFixed(2)),
    sourceTags: definition.sourceTags,
    lastActivityAt: getLatestTimestamp([...orders.map((order) => order.createdAt)]),
  };
}

function deriveLaneState(definition, activity, balanceUsdc) {
  if (activity.openOrderCount > 0) {
    return { status: 'RUNNING', reasonCode: null, nextAction: 'manage_live_orders' };
  }

  if (activity.positionCount > 0) {
    return { status: 'RUNNING', reasonCode: null, nextAction: 'manage_open_positions' };
  }

  if (definition.mode === 'watch-only') {
    return {
      status: 'MONITORING',
      reasonCode: definition.setupRequired ? 'SETUP_REQUIRED' : 'WATCH_ONLY',
      nextAction: definition.setupRequired ? 'finish_configuration' : 'observe_signals',
    };
  }

  if (definition.mode === 'platform') {
    return {
      status: 'MONITORING',
      reasonCode: 'PLATFORM_IDLE',
      nextAction: 'await_platform_activity',
    };
  }

  if (definition.setupRequired) {
    return { status: 'PAUSED', reasonCode: 'SETUP_REQUIRED', nextAction: 'finish_configuration' };
  }

  if (balanceUsdc < 2) {
    return { status: 'DEGRADED', reasonCode: 'LOW_FREE_CAPITAL', nextAction: 'free_up_collateral' };
  }

  return { status: 'DEGRADED', reasonCode: 'WAITING_FOR_EDGE', nextAction: 'wait_for_signal' };
}

function buildLaneRecentEvents(definition, activity) {
  const events = [];

  for (const order of activity.openOrders.slice(0, 3)) {
    events.push({
      timestamp: order.createdAt,
      message: `${definition.name}: ${String(order.tradeType || 'trade').toUpperCase()} ${String(order.side || '').toUpperCase()} ${order.question}`,
      details: {
        marketId: order.marketId,
        venue: order.venue,
        price: order.price,
        costUsdc: order.costUsdc,
      },
    });
  }

  if (events.length === 0 && activity.positionCount > 0) {
    for (const position of activity.positions.slice(0, 2)) {
      events.push({
        timestamp: position.resolvesAt,
        message: `${definition.name}: holding ${position.question}`,
        details: {
          marketId: position.marketId,
          venue: position.venue,
          currentValue: position.currentValue,
          pnl: position.pnl,
        },
      });
    }
  }

  return events.filter((event) => event.timestamp || event.message);
}

function buildLaneSnapshot(definition, positions, orders, balanceUsdc) {
  const activity = buildLaneActivity(definition, positions, orders);
  const state = deriveLaneState(definition, activity, balanceUsdc);
  const recentEvents = buildLaneRecentEvents(definition, activity);

  return {
    id: definition.id,
    name: definition.name,
    mode: definition.mode,
    status: state.status,
    lastCycleAt: activity.lastActivityAt,
    lastReasonCode: state.reasonCode,
    lastErrorClass: state.reasonCode === 'LOW_FREE_CAPITAL' ? 'capital' : null,
    lastSuccessfulFillAt: activity.lastActivityAt,
    nextAction: state.nextAction,
    consecutiveFailures: 0,
    cadenceMinutes: definition.cadenceMinutes,
    description: definition.description,
    venue: definition.venue,
    metrics: {
      filled: activity.positionCount,
      submitted: activity.openOrderCount,
      skipped: 0,
      failed: 0,
      watched: state.status === 'MONITORING' ? 1 : 0,
    },
    reasonMetrics: state.reasonCode ? { [state.reasonCode]: 1 } : {},
    cooldowns: [],
    circuitBreaker: {
      open: false,
      openUntil: null,
      threshold: 0,
      cooloffMinutes: 0,
    },
    recentEvents,
    providerActivity: activity,
    sourceTags: definition.sourceTags,
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

function buildRecentActions(lanes, positions, orders, updatedAt) {
  const orderActions = orders.map((order) => {
    const laneId = inferLaneIdFromSource(order.sourceTag);
    return {
      timestamp: order.createdAt,
      laneId,
      message: `${humanizeIdentifier(laneId)} queued ${String(order.tradeType || 'trade').toUpperCase()} ${String(order.side || '').toUpperCase()} on ${order.question}`,
      details: {
        marketId: order.marketId,
        venue: order.venue,
        price: order.price,
        costUsdc: order.costUsdc,
        sourceTag: order.sourceTag,
      },
    };
  });

  const syntheticPositionActions = positions
    .sort((left, right) => right.currentValue - left.currentValue)
    .slice(0, 4)
    .map((position) => {
      const laneId = inferLaneIdFromSource(position.sources[0]);
      return {
        timestamp: updatedAt,
        laneId,
        message: `${humanizeIdentifier(laneId)} is carrying ${position.question}`,
        details: {
          marketId: position.marketId,
          venue: position.venue,
          currentValue: position.currentValue,
          pnl: position.pnl,
          sourceTags: position.sources,
        },
      };
    });

  return [...orderActions, ...syntheticPositionActions]
    .filter((action) => action.message)
    .sort((left, right) => {
      const leftTime = parseTimestamp(left.timestamp)?.getTime() || 0;
      const rightTime = parseTimestamp(right.timestamp)?.getTime() || 0;
      return rightTime - leftTime;
    })
    .slice(0, 12);
}

function summarizeLiveSnapshot({
  lanes,
  positions,
  orders,
  portfolio,
  updatedAt,
  baseUrl,
  totalPnl,
  realizedPnl,
  unrealizedPnl,
  fallbackReason = null,
}) {
  const activeTradeLanes = lanes.filter((lane) => lane.mode === 'active');
  const activeRunningLanes = activeTradeLanes.filter((lane) => lane.status === 'RUNNING');
  const activeDegradedLanes = activeTradeLanes.filter((lane) => lane.status === 'DEGRADED');
  const lowCapital = activeTradeLanes.filter((lane) => lane.lastReasonCode === 'LOW_FREE_CAPITAL').length;

  let status = 'MONITORING';
  if (activeRunningLanes.length > 0) {
    status = 'RUNNING';
  } else if (activeDegradedLanes.length > 0 || lowCapital > 0) {
    status = 'DEGRADED';
  } else if (activeTradeLanes.length > 0) {
    status = 'PAUSED';
  }

  const blockerCounts = {};
  for (const lane of lanes) {
    if (!lane.lastReasonCode || NON_BLOCKER_REASON_CODES.has(lane.lastReasonCode)) {
      continue;
    }
    blockerCounts[lane.lastReasonCode] = (blockerCounts[lane.lastReasonCode] || 0) + 1;
  }

  const recentActions = buildRecentActions(lanes, positions, orders, updatedAt);
  const lastSuccessfulFillAt = recentActions[0]?.timestamp || null;
  const untrackedSources = dedupeStrings(
    [...positions.flatMap((position) => position.sources), ...orders.flatMap((order) => order.sourceTags)]
      .filter((sourceTag) => !LANE_REGISTRY.some((lane) => lane.sourceTags.some((knownTag) => sourceTag === knownTag || sourceTag.startsWith(`${knownTag}:`))))
  );

  return {
    ok: true,
    source: 'live-simmer',
    sourceType: 'api',
    fallbackReason,
    updatedAt,
    stale: false,
    summary: {
      status,
      cycleIntervalMinutes: 5,
      activeLanes: activeTradeLanes.length,
      topBlockers: Object.entries(blockerCounts)
        .sort((left, right) => right[1] - left[1])
        .slice(0, 5)
        .map(([reasonCode, count]) => ({ reasonCode, count })),
      lastSuccessfulFillAt,
    },
    account: {
      balanceUsdc: asNumber(portfolio.balance_usdc),
      totalExposure: asNumber(portfolio.total_exposure),
      activePositionCount: positions.length,
      openOrderCount: orders.length,
      totalPnl: asNumber(totalPnl),
      realizedPnl: asNumber(realizedPnl),
      unrealizedPnl: asNumber(unrealizedPnl),
      bySource: portfolio.by_source || {},
    },
    providerHealth: {
      status: 'OK',
      degraded: false,
      lastCheckedAt: updatedAt,
      baseUrl,
      trackedLaneCount: lanes.length,
      untrackedSourceCount: untrackedSources.length,
    },
    lanes,
    recentActions,
    liveBook: {
      positions,
      openOrders: orders,
      untrackedSources,
    },
  };
}

async function buildLiveSimmerSnapshot() {
  const { apiKey, baseUrl } = await resolveSimmerConfig();
  if (!apiKey) {
    return null;
  }

  const updatedAt = formatIsoNow();
  const [portfolio, polyPositionsRaw, kalshiPositionsRaw, openOrdersRaw] = await Promise.all([
    fetchSimmerJson(apiKey, baseUrl, '/api/sdk/portfolio'),
    fetchSimmerJson(apiKey, baseUrl, '/api/sdk/positions?venue=polymarket').catch(() => ({ positions: [] })),
    fetchSimmerJson(apiKey, baseUrl, '/api/sdk/positions?venue=kalshi').catch(() => ({ positions: [] })),
    fetchSimmerJson(apiKey, baseUrl, '/api/sdk/orders/open').catch(() => ({ orders: [] })),
  ]);

  const positions = [...asArray(polyPositionsRaw.positions), ...asArray(kalshiPositionsRaw.positions)].map(normalizePosition);
  const orders = asArray(openOrdersRaw.orders).map(normalizeOrder);
  const totalPnl = asNumber(polyPositionsRaw?.pnl_summary?.combined?.total) + asNumber(kalshiPositionsRaw?.pnl_summary?.combined?.total);
  const realizedPnl = asNumber(polyPositionsRaw?.pnl_summary?.combined?.realized) + asNumber(kalshiPositionsRaw?.pnl_summary?.combined?.realized);
  const unrealizedPnl = asNumber(polyPositionsRaw?.pnl_summary?.combined?.unrealized) + asNumber(kalshiPositionsRaw?.pnl_summary?.combined?.unrealized);

  const definitions = new Map(LANE_REGISTRY.map((lane) => [lane.id, lane]));
  for (const sourceTag of [...positions.flatMap((position) => position.sources), ...orders.flatMap((order) => order.sourceTags)]) {
    const laneId = inferLaneIdFromSource(sourceTag);
    if (!definitions.has(laneId)) {
      definitions.set(laneId, createDiscoveredLane(laneId, sourceTag));
    }
  }

  const lanes = [...definitions.values()]
    .map((definition) => {
      const lanePositions = positions.filter((position) =>
        position.sources.some((sourceTag) => definition.sourceTags.some((knownTag) => sourceTag === knownTag || sourceTag.startsWith(`${knownTag}:`)))
      );
      const laneOrders = orders.filter((order) =>
        order.sourceTags.some((sourceTag) => definition.sourceTags.some((knownTag) => sourceTag === knownTag || sourceTag.startsWith(`${knownTag}:`)))
      );
      return buildLaneSnapshot(definition, lanePositions, laneOrders, asNumber(portfolio.balance_usdc));
    })
    .sort(compareLanes);

  return summarizeLiveSnapshot({
    lanes,
    positions,
    orders,
    portfolio,
    updatedAt,
    baseUrl,
    totalPnl,
    realizedPnl,
    unrealizedPnl,
  });
}

async function loadSnapshot() {
  const liveSnapshot = await buildLiveSimmerSnapshot().catch(() => null);
  if (liveSnapshot) {
    return { snapshot: liveSnapshot };
  }

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
    const loaded = await loadSnapshot();
    if (loaded.snapshot) {
      return res.status(200).json(loaded.snapshot);
    }

    const { state, source, sourceType, fallbackReason } = loaded;
    return res.status(200).json(formatSnapshot(state, source, sourceType, fallbackReason));
  } catch (error) {
    return res.status(503).json({
      ok: false,
      error: `Failed to load fundmanager state: ${error.message}`,
      hint: 'Provide SIMMER_API_KEY for live state or generate ops/state/fundmanager-public.json locally.',
    });
  }
}
