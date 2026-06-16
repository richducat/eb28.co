export const LANE_REGISTRY = [
  {
    id: 'fast-loop',
    name: 'Sprinter',
    mode: 'active',
    cadenceMinutes: 5,
    venue: 'polymarket',
    sourceTags: ['sdk:fastloop'],
    description: 'High-cadence desk scalping 5-minute crypto sprint markets.',
  },
  {
    id: 'divergence',
    name: 'Oracle Gap',
    mode: 'active',
    cadenceMinutes: 30,
    venue: 'polymarket',
    sourceTags: ['sdk:divergence'],
    description: 'Mispricing desk trading gaps between AI consensus and market price.',
  },
  {
    id: 'weather',
    name: 'Stormfront',
    mode: 'active',
    cadenceMinutes: 30,
    venue: 'polymarket',
    sourceTags: ['sdk:weather'],
    description: 'NOAA-fed weather desk on Polymarket temperature contracts.',
  },
  {
    id: 'kalshi-weather',
    name: 'Barometer',
    mode: 'active',
    cadenceMinutes: 30,
    venue: 'kalshi',
    sourceTags: ['sdk:kalshi-weather'],
    description: 'Cross-venue weather desk trading Kalshi forecast contracts.',
  },
  {
    id: 'elon-tweets',
    name: 'XPulse',
    mode: 'active',
    cadenceMinutes: 15,
    venue: 'polymarket',
    sourceTags: ['sdk:elon-tweets'],
    description: 'Moonshot bucket trader for Elon tweet count markets.',
  },
  {
    id: 'mert-sniper',
    name: 'Last Call',
    mode: 'active',
    cadenceMinutes: 5,
    venue: 'polymarket',
    sourceTags: ['sdk:mertsniper'],
    description: 'Near-expiry conviction desk for skewed fast-closing markets.',
  },
  {
    id: 'signal-sniper',
    name: 'Newshound',
    mode: 'watch-only',
    cadenceMinutes: 15,
    venue: 'polymarket',
    sourceTags: ['sdk:signalsniper'],
    description: 'Newswire monitor awaiting custom keywords and target markets.',
    setupRequired: true,
  },
  {
    id: 'copytrading',
    name: 'Whale Shadow',
    mode: 'watch-only',
    cadenceMinutes: 240,
    venue: 'polymarket',
    sourceTags: ['sdk:copytrading'],
    description: 'Whale mirroring desk waiting on wallet list configuration.',
    setupRequired: true,
  },
  {
    id: 'polymarket-clob-microstructure',
    name: 'Microstructure',
    mode: 'platform',
    cadenceMinutes: 5,
    venue: 'polymarket',
    sourceTags: ['sdk:polymarket-clob-microstructure'],
    description: 'House microstructure lane visible through Simmer source tags.',
  },
  {
    id: 'risk-monitor',
    name: 'Risk Matrix',
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
  { id: 'goldman', name: 'Oracle Gap', roles: ['model-vs-market', 'mispricing'], color: '#22d3ee', gridPos: { x: 0, y: 0 }, laneIds: ['divergence'] },
  { id: 'renaissance', name: 'Sprinter', roles: ['5-minute-markets', 'momentum'], color: '#a78bfa', gridPos: { x: 1, y: 0 }, laneIds: ['fast-loop'] },
  { id: 'bridgeweather', name: 'Stormfront', roles: ['noaa-weather', 'forecast-edge'], color: '#34d399', gridPos: { x: 2, y: 0 }, laneIds: ['weather', 'kalshi-weather'] },
  { id: 'cathie', name: 'XPulse', roles: ['tweet-buckets', 'event-arb'], color: '#f472b6', gridPos: { x: 3, y: 0 }, laneIds: ['elon-tweets'] },
  { id: 'citadel', name: 'Last Call', roles: ['expiry-sniping', 'orderbook-skew'], color: '#2dd4bf', gridPos: { x: 0, y: 1 }, laneIds: ['mert-sniper'] },
  { id: 'lynch', name: 'Newshound', roles: ['headline-scanning', 'keyword-triggers'], color: '#fb923c', gridPos: { x: 1, y: 1 }, laneIds: ['signal-sniper'] },
  { id: 'buffett', name: 'Whale Shadow', roles: ['copytrading', 'whale-tracking'], color: '#94a3b8', gridPos: { x: 2, y: 1 }, laneIds: ['copytrading'] },
  { id: 'millennium', name: 'Microstructure', roles: ['order-flow', 'sim-markets'], color: '#60a5fa', gridPos: { x: 3, y: 1 }, laneIds: ['polymarket-clob-microstructure'] },
  { id: 'blackrock', name: 'Risk Matrix', roles: ['risk-monitor', 'hedge-controls'], color: '#f87171', gridPos: { x: 0, y: 2 }, laneIds: ['risk-monitor', 'auto-redeem'] },
  { id: 'journal', name: 'The Tape', roles: ['trade-journal', 'post-trade-ops'], color: '#fbbf24', gridPos: { x: 1, y: 2 }, laneIds: [] },
  { id: 'sequoia', name: 'Signal Lab', roles: ['research', 'market-discovery'], color: '#4ade80', gridPos: { x: 2, y: 2 }, laneIds: [] },
  { id: 'ackman', name: 'Catalyst', roles: ['event-driven', 'manual-override'], color: '#e879f9', gridPos: { x: 3, y: 2 }, laneIds: [] },
  { id: 'bluechip', name: 'Bluechip', roles: ['us-equities', 'robinhood-agentic'], color: '#5eead4', gridPos: { x: 0, y: 0 }, laneIds: ['robinhood-equities'], external: 'robinhood', kind: 'trading', glyph: '$', description: 'US equities desk on Robinhood Agentic Trading (official MCP). Dip-buys small fractional positions.' },
];

export const LANE_INDEX = Object.fromEntries(LANE_REGISTRY.map((lane) => [lane.id, lane]));

// Commerce layer: each sellable agent maps to a live Stripe payment link.
// URLs are generated against the production Stripe account; the catalog
// record lives in src/data/deskosStripeLinks.json. They are inlined here
// (not imported) so Node scripts can import this module without JSON
// import attributes.
export const DESK_PRICE_USD = 47;
export const BUNDLE_PRICE_USD = 197;
export const OPERATOR_PRICE_USD = 497;

export const DESK_COMMERCE = {
  'fast-loop': {
    slug: 'sprinter',
    checkoutUrl: 'https://buy.stripe.com/6oU4gybpbbJyeHegz4bbG0J',
    pitch: 'Scalps 5-minute crypto sprints around the clock.',
  },
  divergence: {
    slug: 'oracle-gap',
    checkoutUrl: 'https://buy.stripe.com/14A00ictf8xmfLi0A6bbG0K',
    pitch: 'Trades the gap between AI consensus and the crowd.',
  },
  weather: {
    slug: 'stormfront',
    checkoutUrl: 'https://buy.stripe.com/fZueVcal78xm2Yw5UqbbG0L',
    pitch: 'Turns NOAA forecasts into Polymarket entries.',
  },
  'kalshi-weather': {
    slug: 'barometer',
    checkoutUrl: 'https://buy.stripe.com/cNi14m2SFaFugPmgz4bbG0M',
    pitch: 'Runs the same weather edge on Kalshi contracts.',
  },
  'elon-tweets': {
    slug: 'xpulse',
    checkoutUrl: 'https://buy.stripe.com/eVq7sK8cZ9BqfLi2IebbG0N',
    pitch: 'Prices Elon tweet-count buckets before the herd.',
  },
  'mert-sniper': {
    slug: 'last-call',
    checkoutUrl: 'https://buy.stripe.com/5kQ3cu2SF28Y9mU0A6bbG0O',
    pitch: 'Snipes lopsided books minutes before expiry.',
  },
  'signal-sniper': {
    slug: 'newshound',
    checkoutUrl: 'https://buy.stripe.com/5kQ6oG1OB8xm0Qo3MibbG0P',
    pitch: 'Watches the wire for your keywords, flags the trade.',
  },
  copytrading: {
    slug: 'whale-shadow',
    checkoutUrl: 'https://buy.stripe.com/28E5kC50N00Q8iQ0A6bbG0Q',
    pitch: 'Mirrors curated whale wallets with hard risk caps.',
  },
};

export const BUNDLE_CHECKOUT_URL = 'https://buy.stripe.com/4gMdR8gJveVK56E6YubbG0R';
export const OPERATOR_CHECKOUT_URL = 'https://buy.stripe.com/14A6oG1OBdRGaqYaaGbbG0S';

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
