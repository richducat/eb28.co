// Shared live-snapshot loader for the marketing surfaces (Desk OS tape band,
// Bluechip desk demo). The dashboard has its own richer loader in
// FundManager.jsx; this is the small read-only version.
//
// IMPORTANT: docs/data/ is gitignored, so /data/*.json only exists on a local
// preview server — never in production. Production must read the published
// fund-state feed. Fetching only the local path silently 404s and leaves the
// "live" panels showing static fallback copy.

const PROD_REMOTE_SNAPSHOT_HOSTS = new Set([
  'eb28.co',
  'www.eb28.co',
  'fundmanager.eb28.co',
  'daytradingbot.net',
  'www.daytradingbot.net',
]);
const REMOTE_SNAPSHOT_URL =
  'https://raw.githubusercontent.com/richducat/eb28.co/fund-state/fund-state.json';
// Only the *public* snapshot has this schema. /data/fundmanager-data.json is a
// different (legacy ticker) document that fetches fine but has no lanes or
// recentActions — accepting it silently shadows the real feed.
const LOCAL_SOURCES = ['/data/fundmanager-public.json'];
const TIMEOUT_MS = 5000;

function isPublicSnapshot(data) {
  return Boolean(data) && Array.isArray(data.recentActions) && Array.isArray(data.lanes);
}

function snapshotSources() {
  const hostname = typeof window === 'undefined' ? '' : window.location.hostname.toLowerCase();
  return PROD_REMOTE_SNAPSHOT_HOSTS.has(hostname)
    ? [REMOTE_SNAPSHOT_URL, ...LOCAL_SOURCES]
    : [...LOCAL_SOURCES, REMOTE_SNAPSHOT_URL];
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Returns the first snapshot that loads, or null. Callers must render a
// sensible fallback on null — the panels stay honest either way.
export async function fetchFundSnapshot() {
  for (const url of snapshotSources()) {
    const data = await fetchWithTimeout(url);
    if (isPublicSnapshot(data)) return data;
  }
  return null;
}

function filterEvents(events, { prefix, symbol, limit }) {
  return events
    .filter((event) => {
      const message = String(event?.message || '');
      if (prefix && !message.startsWith(prefix)) return false;
      if (symbol && !message.includes(symbol)) return false;
      return true;
    })
    .slice(0, limit);
}

// Fleet-wide activity, newest first (what the whole floor did).
export function recentActions(snapshot, { prefix, symbol, limit = 4 } = {}) {
  const actions = Array.isArray(snapshot?.recentActions) ? snapshot.recentActions : [];
  return filterEvents(actions, { prefix, symbol, limit });
}

// One desk's own decisions. A single desk's activity lives on its lane as
// recentEvents — it does NOT reliably surface in the fleet-wide recentActions,
// which is dominated by whichever lane is busiest.
export function laneEvents(snapshot, laneId, { symbol, limit = 8 } = {}) {
  const lanes = Array.isArray(snapshot?.lanes) ? snapshot.lanes : [];
  const lane = lanes.find((candidate) => candidate?.id === laneId);
  const events = Array.isArray(lane?.recentEvents) ? lane.recentEvents : [];
  return filterEvents(events, { symbol, limit });
}
