import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { APP_ROOT } from '../../config.js';
import { store } from '../../store.js';
import { safeError } from '../redact.js';

/**
 * Local, read-only project status: DayTradingBot (ledger opened read-only + process check),
 * FundManager lanes (config + validation state + Mission Control's validator runs), the
 * SyncStep backend's public /health, and the Hermes-home status snapshot over a
 * forced-command SSH key (off until Richard installs it).
 */
const run = (bin, args, timeout = 8000) =>
  new Promise((resolve) => execFile(bin, args, { timeout, maxBuffer: 4 * 1024 * 1024 }, (err, stdout) => resolve({ ok: !err, out: String(stdout || '') })));

export async function dayTradingBot() {
  const dir = path.join(os.homedir(), 'Library', 'Application Support', 'net.daytradingbot.desktop.owner-demo');
  const ledger = path.join(dir, 'ledger.sqlite3');
  // executable paths only (comm), never arguments: a prompt or script that merely mentions
  // the app must not count as the app running
  const ps = await run('/bin/ps', ['-axo', 'comm=']);
  const running = ps.out.split('\n').some((l) => /daytradingbot|bluechip/i.test(l) && !/node|python|zsh|bash|claude|codex/i.test(l.split('/').pop()));
  if (!fs.existsSync(ledger)) return { id: 'daytradingbot', name: 'DayTradingBot', ok: true, installed: false, running, state: running ? 'unknown' : 'safe', detail: running ? 'Running, but no owner ledger found.' : 'Not installed on this Mac.' };
  const uri = `file:${ledger}?mode=ro&immutable=1`;
  const q = async (sql) => {
    const r = await run('/usr/bin/sqlite3', ['-readonly', '-json', uri, sql]);
    try { return JSON.parse(r.out || '[]'); } catch { return []; }
  };
  try {
    const [counts] = await q("select (select count(*) from intents) intents, (select count(*) from orders) orders, (select count(*) from fills) fills, (select max(updated_at) from orders) lastOrder");
    const safety = await q('select venue, global_kill_switch, venue_paused, strategy_enabled from safety_state');
    const killOn = safety.length ? safety.every((s) => Number(s.global_kill_switch) === 1) : null;
    const state = !running ? 'safe' : killOn === true ? 'safe' : killOn === false ? 'unsafe' : 'unknown';
    return {
      id: 'daytradingbot', name: 'DayTradingBot', ok: true, installed: true, running, state,
      detail: !running ? 'Not running.' : killOn ? 'Running with its global kill switch on.' : 'Running; kill switch state unknown.',
      ledger: counts || {}, caps: { perOrderUsd: 5, exposureUsd: 200 },
    };
  } catch (err) {
    return { id: 'daytradingbot', name: 'DayTradingBot', ok: false, state: 'unknown', detail: safeError('DayTradingBot ledger', err) };
  }
}

export function fundManager() {
  const ops = path.resolve(APP_ROOT, '..', 'ops');
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(ops, 'config', 'fundmanager.default.json'), 'utf8'));
    let state = {};
    try { state = JSON.parse(fs.readFileSync(path.join(ops, 'state', 'validation-state.json'), 'utf8')); } catch { /* optional */ }
    const lanes = Object.entries(cfg.lanes || {}).map(([id, l]) => ({ id, name: l.name || id, mode: l.mode, orderUsd: l.order_usd || 0, lastCycleAt: state.lanes && state.lanes[id] ? state.lanes[id].last_cycle_at : null }));
    const live = lanes.filter((l) => !['watch-only', 'disabled', 'paper'].includes(l.mode));
    const runs = store.get('automation-runs', []).filter((r) => r.automationId === 'checks:fundmanager-runtime');
    const lastRun = runs[runs.length - 1] || null;
    return { id: 'fundmanager', name: 'FundManager', ok: true, state: live.length ? 'unsafe' : 'safe', detail: live.length ? `${live.length} lane(s) not watch-only: ${live.map((l) => l.name).join(', ')}` : `${lanes.length} lanes, all watch-only or disabled.`, lanes, validator: lastRun ? { ok: lastRun.ok, at: lastRun.finishedAt || lastRun.startedAt } : null };
  } catch (err) {
    return { id: 'fundmanager', name: 'FundManager', ok: false, state: 'unknown', detail: safeError('FundManager config', err) };
  }
}

export async function syncStep({ fetchImpl = fetch } = {}) {
  const repo = path.join(os.homedir(), 'GITHUB', 'syncstep-recovered');
  let version = null;
  let lastCommit = null;
  try { version = JSON.parse(fs.readFileSync(path.join(repo, 'package.json'), 'utf8')).version; } catch { /* repo optional */ }
  const g = await run('/usr/bin/git', ['-C', repo, 'log', '-1', '--format=%ci|%s']);
  if (g.ok && g.out) { const [at, msg] = g.out.trim().split('|'); lastCommit = { at, msg: (msg || '').slice(0, 80) }; }
  try {
    const res = await fetchImpl('https://sync.chatbotbuilder.store/health', { signal: AbortSignal.timeout(8000) });
    const h = await res.json();
    return { id: 'syncstep', name: 'SyncStep', ok: true, up: Boolean(h.ok), chainReady: Boolean(h.chainReady), treasury: h.treasury ? 'set' : 'not set', buyReady: Boolean(h.buyReady), version, lastCommit };
  } catch (err) {
    return { id: 'syncstep', name: 'SyncStep', ok: false, up: false, error: safeError('SyncStep backend', err), version, lastCommit };
  }
}

/** Hermes-home (Intel) snapshot via the forced-command SSH key. Booleans, labels and counts only. */
export async function intelStatus(cfg) {
  const intel = cfg.intel || {};
  if (!intel.enabled) return { id: 'intel', name: 'Hermes-home (Intel Mac)', ok: false, connected: false, state: 'unknown', detail: 'Status link not set up yet (see the Security checklist).' };
  const identity = String(intel.identity || '').replace(/^~/, os.homedir());
  const r = await run('/usr/bin/ssh', ['-i', identity, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=5', `${intel.user}@${intel.host}`], 15000);
  try {
    const s = JSON.parse(r.out);
    const unsafe = s.simmerLiveEnabled === true || (s.loadedTradingAgents || []).length > 0 || Number(s.openclawCronEnabledCount) > 0 || Number(s.zshrcExportsSimmer) > 0;
    return { id: 'intel', name: 'Hermes-home (Intel Mac)', ok: true, connected: true, state: unsafe ? 'unsafe' : 'safe', detail: unsafe ? 'Something on the Intel Mac can still trade or holds an exposed key.' : 'Nothing able to trade is loaded.', snapshot: s };
  } catch {
    return { id: 'intel', name: 'Hermes-home (Intel Mac)', ok: false, connected: false, state: 'unknown', detail: 'Intel Mac unreachable (offline or link not installed).' };
  }
}
