import fs from 'node:fs';
import path from 'node:path';
import { MC_HOME } from '../config.js';
import { isSolanaAddress } from './rpc/solana.js';
import { isEvmAddress } from './rpc/polygon.js';

/**
 * Trading settings live in ~/.eb28-mission-control/trading.json, OUTSIDE the (public) repo:
 * wallet addresses, machine names, the STEPN snapshot and the security checklist. The
 * committed defaults are deliberately empty.
 */
export const DEFAULTS = {
  killSwitch: true,
  wallets: [],
  intel: { enabled: false },
  connectors: { simmerKeyed: false, scanner: false, dexscreenerMinLiquidityUsd: 50000 },
  stepn: { account: '', snapshot: null, rules: [] },
  limits: { exposureAlertUsd: 250, outflowAlertUsd: 25 },
  projects: [],
  checklist: [],
  resolved: {},
  dapps: [],
};

export const configFile = () => process.env.MC_TRADING_CONFIG || path.join(MC_HOME, 'trading.json');

export function loadConfig() {
  let saved = {};
  try {
    saved = JSON.parse(fs.readFileSync(configFile(), 'utf8'));
  } catch {
    /* first run: defaults */
  }
  return { ...DEFAULTS, ...saved, connectors: { ...DEFAULTS.connectors, ...(saved.connectors || {}) }, limits: { ...DEFAULTS.limits, ...(saved.limits || {}) }, stepn: { ...DEFAULTS.stepn, ...(saved.stepn || {}) } };
}

function write(cfg) {
  fs.mkdirSync(path.dirname(configFile()), { recursive: true });
  const tmp = `${configFile()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, configFile());
}

export function saveKillSwitch(on) {
  const cfg = loadConfig();
  cfg.killSwitch = Boolean(on);
  write(cfg);
  return cfg.killSwitch;
}

/**
 * The only edits the UI may make: add/remove a public wallet address, the manual STEPN
 * snapshot, checklist "resolved" ticks and the scanner toggle. Everything is validated.
 */
export function applyPatch(patch = {}) {
  const cfg = loadConfig();
  if (patch.addWallet) {
    const w = patch.addWallet;
    const chain = w.chain === 'polygon' ? 'polygon' : 'solana';
    const ok = chain === 'solana' ? isSolanaAddress(w.address) : isEvmAddress(w.address);
    if (!ok) throw new Error(`That is not a valid ${chain} address.`);
    if (!cfg.wallets.some((x) => x.address === w.address)) cfg.wallets.push({ label: String(w.label || 'Wallet').slice(0, 60), chain, address: w.address, role: String(w.role || '').slice(0, 20), watchOnly: true });
  }
  if (patch.removeWallet) cfg.wallets = cfg.wallets.filter((x) => x.address !== patch.removeWallet);
  if (patch.stepnSnapshot) {
    const s = patch.stepnSnapshot;
    const num = (v) => (v === '' || v == null ? null : Number(v));
    if (![s.GST, s.GMT].every((v) => v == null || v === '' || Number.isFinite(Number(v)))) throw new Error('GST and GMT must be numbers.');
    cfg.stepn = { ...cfg.stepn, snapshot: { at: new Date().toISOString(), GST: num(s.GST), GMT: num(s.GMT), note: String(s.note || '').slice(0, 200) } };
  }
  if (patch.resolve && typeof patch.resolve.id === 'string') {
    cfg.resolved = { ...cfg.resolved };
    if (patch.resolve.done) cfg.resolved[patch.resolve.id] = new Date().toISOString();
    else delete cfg.resolved[patch.resolve.id];
  }
  if (typeof patch.scanner === 'boolean') cfg.connectors = { ...cfg.connectors, scanner: patch.scanner };
  write(cfg);
  return cfg;
}
