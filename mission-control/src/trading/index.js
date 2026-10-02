import { store } from '../store.js';
import { loadConfig } from './config.js';
import * as killswitch from './killswitch.js';
import * as approvals from './approvals.js';
import * as keychain from './keychain.js';
import { collectWallets, STEPN_MINTS } from './connectors/wallets.js';
import { collectPolymarket } from './connectors/polymarket.js';
import { dayTradingBot, fundManager, syncStep, intelStatus } from './connectors/projects.js';
import { safeError } from './redact.js';

/**
 * The Trading tab's snapshot: watch-only by construction. Every connector is isolated (one
 * failure never blanks the tab), errors are scrubbed, and nothing here can sign, trade or
 * move funds. Cached for a minute; the last snapshot is also kept in the store so the board
 * source can raise "needs you" items without touching the network.
 */
const isolate = async (name, fn) => {
  try {
    return await fn();
  } catch (err) {
    return { ok: false, error: safeError(name, err) };
  }
};

let cache = { at: 0, value: null, pending: null };

export async function collectTrading({ force = false, fetchImpl = fetch, now = Date.now() } = {}) {
  if (!force && cache.value && now - cache.at < 60e3) return cache.value;
  if (cache.pending) return cache.pending;
  cache.pending = build({ fetchImpl, now }).finally(() => { cache.pending = null; });
  const value = await cache.pending;
  cache = { at: Date.now(), value, pending: null };
  return value;
}

async function build({ fetchImpl, now }) {
  const cfg = loadConfig();
  const [wallets, polymarket, dtb, syncstep, intel, keys] = await Promise.all([
    isolate('wallets', () => collectWallets(cfg, { fetchImpl })),
    isolate('Polymarket', () => collectPolymarket(cfg, { fetchImpl })),
    isolate('DayTradingBot', () => dayTradingBot()),
    isolate('SyncStep', () => syncStep({ fetchImpl })),
    isolate('Intel Mac', () => intelStatus(cfg)),
    isolate('Keychain', () => keychain.status()),
  ]);
  const fm = fundManager();
  const pm = Array.isArray(polymarket) ? polymarket : [];
  const lastTrade = pm.map((p) => p.lastTradeAt).filter(Boolean).sort().pop() || null;
  const tradedRecently = lastTrade && now - Date.parse(lastTrade) < 24 * 3600e3;

  const projects = [
    { id: 'simmer', name: 'Simmer agents', state: cfg.connectors.simmerKeyed ? 'unknown' : 'unknown', detail: `Agent on/off and the real-trading flag need the Simmer API (after the key is rotated). Managed wallet last traded ${lastTrade ? new Date(lastTrade).toLocaleString('en-US', { timeZone: 'America/New_York' }) + ' ET' : 'never seen'}.`, agents: (cfg.simmerAgents || []).map((n) => ({ name: n, state: 'unknown' })), alarm: tradedRecently },
    dtb && dtb.id ? { id: 'daytradingbot', name: 'DayTradingBot', state: dtb.state, detail: dtb.detail } : { id: 'daytradingbot', name: 'DayTradingBot', state: 'unknown', detail: dtb.error },
    { id: 'fundmanager', name: 'FundManager', state: fm.state, detail: fm.detail },
    intel && intel.id ? { id: 'intel', name: intel.name, state: intel.state, detail: intel.detail } : { id: 'intel', name: 'Hermes-home (Intel Mac)', state: 'unknown', detail: intel.error },
  ];

  const solanaTokens = (Array.isArray(wallets) ? wallets : []).flatMap((w) => w.tokens || []);
  const onchain = {};
  for (const [sym, mint] of Object.entries(STEPN_MINTS)) {
    const t = solanaTokens.find((x) => x.mint === mint);
    onchain[sym] = t ? t.amount : 0;
  }
  const stepnAgeDays = cfg.stepn.snapshot ? Math.floor((now - Date.parse(cfg.stepn.snapshot.at)) / 86400e3) : null;

  const checklist = (cfg.checklist || []).map((c) => ({ ...c, status: cfg.resolved[c.id] ? 'done' : 'open', resolvedAt: cfg.resolved[c.id] || null }));
  const exposure = pm.reduce((n, p) => n + (p.exposure || 0), 0);

  const snapshot = {
    at: new Date(now).toISOString(),
    watchOnly: true,
    killSwitch: killswitch.summarize(projects),
    wallets: Array.isArray(wallets) ? wallets : [],
    walletError: Array.isArray(wallets) ? null : wallets.error,
    totals: { usd: (Array.isArray(wallets) ? wallets : []).reduce((n, w) => n + (w.usd || 0), 0) + exposure, exposure, pnl: pm.reduce((n, p) => n + (p.cashPnl || 0), 0) },
    polymarket: pm,
    projects: { daytradingbot: dtb, fundmanager: fm, syncstep, intel },
    stepn: { account: cfg.stepn.account, snapshot: cfg.stepn.snapshot, rules: cfg.stepn.rules, onchain, staleDays: stepnAgeDays },
    dapps: [syncstep, ...(cfg.dapps || [])].filter(Boolean),
    checklist,
    keychain: Array.isArray(keys) ? keys : [],
    approvals: approvals.list(),
    limits: cfg.limits,
    connectors: cfg.connectors,
  };
  snapshot.flags = flagsFor(snapshot);
  recordChanges(snapshot, cfg);
  snapshot.alerts = store.get('trading-alerts', []).slice(-60).reverse();
  store.set('trading-snapshot', { at: snapshot.at, flags: snapshot.flags, master: snapshot.killSwitch.master, totals: snapshot.totals });
  return snapshot;
}

/** Red conditions, also used by the board source and the tab badge. */
export function flagsFor(s) {
  const f = [];
  if (!s.killSwitch.master) f.push({ level: 'red', text: 'Mission Control master kill switch is OFF.' });
  for (const p of s.killSwitch.projects) if (p.state !== 'safe') f.push({ level: p.state === 'unsafe' ? 'red' : 'amber', text: `${p.name}: ${p.state === 'unsafe' ? 'NOT safe' : 'state unknown'}` });
  const open = s.checklist.filter((c) => c.status === 'open' && c.priority === 'P0');
  if (open.length) f.push({ level: 'red', text: `${open.length} open P0 security item${open.length === 1 ? '' : 's'}` });
  if (s.totals.exposure > (s.limits.exposureAlertUsd || Infinity)) f.push({ level: 'red', text: `Prediction-market exposure $${s.totals.exposure.toFixed(0)} is above your $${s.limits.exposureAlertUsd} alert` });
  const ss = s.projects.syncstep;
  if (ss && ss.ok === false) f.push({ level: 'amber', text: 'SyncStep backend is down' });
  if (s.stepn.staleDays != null && s.stepn.staleDays > 7) f.push({ level: 'amber', text: `STEPN snapshot is ${s.stepn.staleDays} days old` });
  return f;
}

function recordChanges(s, cfg) {
  const last = store.get('trading-last', { states: {}, usd: {} });
  const add = (level, text, kind) => store.append('trading-alerts', { at: s.at, level, text, kind }, 500);
  const states = {};
  for (const p of s.killSwitch.projects) {
    states[p.id] = p.state;
    if (last.states[p.id] && last.states[p.id] !== p.state) add(p.state === 'safe' ? 'info' : 'warn', `${p.name}: ${last.states[p.id]} → ${p.state}`, 'state');
  }
  const usd = {};
  for (const w of s.wallets) {
    if (!w.ok) continue;
    usd[w.address] = w.usd;
    const before = last.usd[w.address];
    if (typeof before === 'number' && before - w.usd > (cfg.limits.outflowAlertUsd || 25)) add('warn', `Outflow from ${w.label}: $${(before - w.usd).toFixed(2)} since the last check`, 'outflow');
  }
  store.set('trading-last', { states, usd });
}

export function _resetCache() { cache = { at: 0, value: null, pending: null }; }
