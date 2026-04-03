export const LANE_REGISTRY = [
  {
    id: 'fast-loop',
    name: 'Fast Loop',
    mode: 'active',
    cadenceMinutes: 5,
    venue: 'polymarket',
    sourceTags: ['sdk:fastloop'],
    description: 'Renaissance-style sprint desk for 5 minute crypto markets.',
  },
  {
    id: 'divergence',
    name: 'AI Divergence',
    mode: 'active',
    cadenceMinutes: 30,
    venue: 'polymarket',
    sourceTags: ['sdk:divergence'],
    description: 'Fundamental mispricing desk trading Simmer consensus gaps.',
  },
  {
    id: 'weather',
    name: 'Weather',
    mode: 'active',
    cadenceMinutes: 30,
    venue: 'polymarket',
    sourceTags: ['sdk:weather'],
    description: 'NOAA-fed weather desk on Polymarket.',
  },
  {
    id: 'kalshi-weather',
    name: 'Kalshi Weather',
    mode: 'active',
    cadenceMinutes: 30,
    venue: 'kalshi',
    sourceTags: ['sdk:kalshi-weather'],
    description: 'Cross-venue weather desk trading Kalshi forecast contracts.',
  },
  {
    id: 'elon-tweets',
    name: 'Elon Tweets',
    mode: 'active',
    cadenceMinutes: 15,
    venue: 'polymarket',
    sourceTags: ['sdk:elon-tweets'],
    description: 'Moonshot bucket trader for Elon tweet count markets.',
  },
  {
    id: 'mert-sniper',
    name: 'Mert Sniper',
    mode: 'active',
    cadenceMinutes: 5,
    venue: 'polymarket',
    sourceTags: ['sdk:mertsniper'],
    description: 'Near-expiry conviction desk for skewed fast-closing markets.',
  },
  {
    id: 'signal-sniper',
    name: 'Signal Sniper',
    mode: 'watch-only',
    cadenceMinutes: 15,
    venue: 'polymarket',
    sourceTags: ['sdk:signalsniper'],
    description: 'Newswire monitor awaiting custom keywords and target markets.',
    setupRequired: true,
  },
  {
    id: 'copytrading',
    name: 'Copytrading',
    mode: 'watch-only',
    cadenceMinutes: 240,
    venue: 'polymarket',
    sourceTags: ['sdk:copytrading'],
    description: 'Whale mirroring desk waiting on wallet list configuration.',
    setupRequired: true,
  },
  {
    id: 'polymarket-clob-microstructure',
    name: 'CLOB Microstructure',
    mode: 'platform',
    cadenceMinutes: 5,
    venue: 'polymarket',
    sourceTags: ['sdk:polymarket-clob-microstructure'],
    description: 'House microstructure lane visible through Simmer source tags.',
  },
  {
    id: 'risk-monitor',
    name: 'Risk Monitor',
    mode: 'platform',
    cadenceMinutes: 15,
    venue: 'polymarket',
    sourceTags: ['sdk:risk-monitor'],
    description: 'Platform risk automation for exits and drawdown protection.',
  },
  {
    id: 'auto-redeem',
    name: 'Auto Redeem',
    mode: 'platform',
    cadenceMinutes: 60,
    venue: 'polymarket',
    sourceTags: ['sdk:auto-redeem'],
    description: 'Settlement sweep lane for redeemable positions.',
  },
];

export const AGENT_ROSTER = [
  { id: 'goldman', name: 'Goldman Fundamental', roles: ['ai-divergence', 'mispricing'], color: '#22d3ee', gridPos: { x: 0, y: 0 }, laneIds: ['divergence'] },
  { id: 'renaissance', name: 'Renaissance Quant', roles: ['fast-markets', 'momentum'], color: '#a78bfa', gridPos: { x: 1, y: 0 }, laneIds: ['fast-loop'] },
  { id: 'bridgeweather', name: 'Bridgeweather Macro', roles: ['weather', 'macro-forecasting'], color: '#34d399', gridPos: { x: 2, y: 0 }, laneIds: ['weather', 'kalshi-weather'] },
  { id: 'cathie', name: 'Cathie X-Wood', roles: ['elon-buckets', 'event-arb'], color: '#f472b6', gridPos: { x: 3, y: 0 }, laneIds: ['elon-tweets'] },
  { id: 'citadel', name: 'Citadel Last Look', roles: ['expiry-sniping', 'clob-reads'], color: '#2dd4bf', gridPos: { x: 0, y: 1 }, laneIds: ['mert-sniper'] },
  { id: 'lynch', name: 'Peter Lynch Wiretap', roles: ['headline-scanning', 'rss-monitor'], color: '#fb923c', gridPos: { x: 1, y: 1 }, laneIds: ['signal-sniper'] },
  { id: 'buffett', name: 'Buffett Mirror Fund', roles: ['copytrading', 'whale-tracking'], color: '#94a3b8', gridPos: { x: 2, y: 1 }, laneIds: ['copytrading'] },
  { id: 'millennium', name: 'Millennium Microstructure', roles: ['sim-markets', 'order-flow'], color: '#60a5fa', gridPos: { x: 3, y: 1 }, laneIds: ['polymarket-clob-microstructure'] },
  { id: 'blackrock', name: 'BlackRock Risk Matrix', roles: ['risk-monitor', 'hedge-controls'], color: '#f87171', gridPos: { x: 0, y: 2 }, laneIds: ['risk-monitor', 'auto-redeem'] },
  { id: 'journal', name: 'Morgan Stanley Tape', roles: ['trade-journal', 'post-trade-ops'], color: '#fbbf24', gridPos: { x: 1, y: 2 }, laneIds: [] },
  { id: 'sequoia', name: 'Sequoia Signal Lab', roles: ['research', 'market-discovery'], color: '#4ade80', gridPos: { x: 2, y: 2 }, laneIds: [] },
  { id: 'ackman', name: 'Bill Ackman Catalyst', roles: ['event-driven', 'manual-override'], color: '#e879f9', gridPos: { x: 3, y: 2 }, laneIds: [] },
];

export const LANE_INDEX = Object.fromEntries(LANE_REGISTRY.map((lane) => [lane.id, lane]));

export function humanizeIdentifier(value) {
  return String(value || '')
    .replace(/^sdk:/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

export function inferLaneIdFromSource(sourceTag) {
  const normalized = String(sourceTag || '').trim();
  if (!normalized) {
    return '';
  }

  for (const lane of LANE_REGISTRY) {
    for (const tag of lane.sourceTags) {
      if (normalized === tag || normalized.startsWith(`${tag}:`)) {
        return lane.id;
      }
    }
  }

  return normalized.startsWith('sdk:') ? normalized.slice(4) : normalized;
}

export function createDiscoveredLane(laneId, sourceTag) {
  const id = String(laneId || inferLaneIdFromSource(sourceTag) || 'unassigned')
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

  return {
    id: id || 'unassigned',
    name: humanizeIdentifier(laneId || sourceTag || 'Unassigned Desk'),
    mode: 'platform',
    cadenceMinutes: 15,
    venue: 'polymarket',
    sourceTags: sourceTag ? [sourceTag] : [],
    description: 'Auto-discovered live lane from Simmer source tagging.',
  };
}
