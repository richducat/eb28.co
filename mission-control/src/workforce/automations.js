import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { APP_ROOT, repoRoots } from '../config.js';
import { store } from '../store.js';

/**
 * Automation registry.
 *
 * Every automation is an allow-listed argv (never a shell string) with a safety tier:
 *   safe      - read-only or idempotent local work. The workforce runs it on schedule.
 *   approval  - writes files / commits / spends API credits. Runs only after Richard
 *               approves the proposal in the Approvals panel (per run, or standing).
 *   manual    - touches customers, money, email, or social. Never auto-run; the button
 *               in the UI is the only way, and it asks for confirmation.
 */
export const TIERS = ['safe', 'approval', 'manual'];

export function registryFile() {
  return process.env.MC_AUTOMATIONS || path.join(APP_ROOT, 'automations.json');
}

export function loadRegistry() {
  let list = [];
  try {
    list = JSON.parse(fs.readFileSync(registryFile(), 'utf8'));
  } catch {
    list = [];
  }
  const custom = store.get('custom-automations', []);
  const state = store.get('automation-state', {});
  const merged = [...list, ...custom.filter((c) => !list.some((a) => a.id === c.id))];
  return merged.map((a) => validate({ ...a, ...(state[a.id] || {}) }));
}

export function validate(a) {
  if (!a.id || !/^[a-z0-9:_-]+$/i.test(a.id)) throw new Error(`automation id invalid: ${a.id}`);
  if (!Array.isArray(a.command) || !a.command.length || !a.command.every((s) => typeof s === 'string')) {
    throw new Error(`automation ${a.id}: command must be an argv array`);
  }
  if (!TIERS.includes(a.tier)) throw new Error(`automation ${a.id}: tier must be one of ${TIERS.join(', ')}`);
  if (a.schedule && !parseSchedule(a.schedule)) throw new Error(`automation ${a.id}: bad schedule "${a.schedule}"`);
  return {
    enabled: a.tier === 'safe',
    timeoutMs: 15 * 60 * 1000,
    cwd: 'repo',
    ...a,
  };
}

/** "every 30m" | "every 6h" | "daily 06:00" | "weekdays 09:30" | "" (manual only). */
export function parseSchedule(s) {
  if (!s) return null;
  let m = String(s).match(/^every\s+(\d+)\s*(m|min|h|hr|d)$/i);
  if (m) {
    const n = Number(m[1]);
    const unit = m[2].toLowerCase();
    const ms = n * (unit.startsWith('m') ? 60e3 : unit.startsWith('h') ? 3600e3 : 86400e3);
    return { kind: 'interval', ms };
  }
  m = String(s).match(/^(daily|weekdays)\s+(\d{1,2}):(\d{2})$/i);
  if (m) return { kind: 'clock', weekdaysOnly: m[1].toLowerCase() === 'weekdays', hour: Number(m[2]), minute: Number(m[3]) };
  return null;
}

/** Is the automation due, given its schedule and last run time? */
export function isDue(a, lastRunAt, now = Date.now()) {
  const sched = parseSchedule(a.schedule);
  if (!sched) return false;
  const last = lastRunAt ? Date.parse(lastRunAt) : 0;
  if (sched.kind === 'interval') return now - last >= sched.ms;
  const d = new Date(now);
  if (sched.weekdaysOnly && (d.getDay() === 0 || d.getDay() === 6)) return false;
  const slot = new Date(d.getFullYear(), d.getMonth(), d.getDate(), sched.hour, sched.minute).getTime();
  return now >= slot && last < slot;
}

export function resolveCwd(a) {
  const roots = repoRoots();
  if (!a.cwd || a.cwd === 'repo') return roots[0];
  if (path.isAbsolute(a.cwd)) return roots.some((r) => a.cwd.startsWith(r)) ? a.cwd : null;
  const rel = path.resolve(roots[0], a.cwd);
  return rel.startsWith(roots[0]) ? rel : null;
}

const running = new Map();

/** Execute an automation. Resolves with the run record; never throws. */
export function runAutomation(a, { trigger = 'manual', onEvent } = {}) {
  if (running.has(a.id)) return Promise.resolve({ ...running.get(a.id), skipped: 'already running' });
  const cwd = resolveCwd(a);
  const startedAt = new Date().toISOString();
  const base = { automationId: a.id, title: a.title, tier: a.tier, trigger, cwd, startedAt, status: 'running' };
  if (!cwd) return Promise.resolve(record({ ...base, ok: false, status: 'finished', error: 'cwd is outside the allowed repo roots', finishedAt: startedAt }));
  running.set(a.id, base);
  store.append('automation-runs', base, 400);
  if (onEvent) onEvent({ type: 'automation:start', run: base });
  const started = Date.now();
  return new Promise((resolve) => {
    let output = '';
    let child;
    try {
      child = spawn(a.command[0], a.command.slice(1), { cwd, env: { ...process.env, ...(a.env || {}), MC_AUTOMATION: a.id }, shell: false });
    } catch (err) {
      running.delete(a.id);
      return resolve(record({ ...base, ok: false, status: 'finished', error: err.message, finishedAt: new Date().toISOString(), durationMs: 0 }));
    }
    const timer = setTimeout(() => child.kill('SIGTERM'), a.timeoutMs || 15 * 60 * 1000);
    const capture = (chunk) => {
      output += chunk.toString();
      if (output.length > 200_000) output = output.slice(-150_000);
    };
    child.stdout.on('data', capture);
    child.stderr.on('data', capture);
    child.on('error', (err) => capture(`\n${err.message}`));
    child.on('close', (code) => {
      clearTimeout(timer);
      running.delete(a.id);
      const run = record({ ...base, ok: code === 0, code, status: 'finished', output, finishedAt: new Date().toISOString(), durationMs: Date.now() - started });
      if (onEvent) onEvent({ type: 'automation:finish', run });
      resolve(run);
    });
  });
}

function record(run) {
  store.update('automation-runs', [], (list) => {
    const idx = list.findIndex((r) => r.automationId === run.automationId && r.startedAt === run.startedAt);
    if (idx >= 0) list[idx] = run;
    else list.push(run);
    return list.slice(-400);
  });
  return run;
}

export function lastRun(automationId) {
  const runs = store.get('automation-runs', []);
  for (let i = runs.length - 1; i >= 0; i -= 1) if (runs[i].automationId === automationId) return runs[i];
  return null;
}

export function setAutomationState(id, patch) {
  return store.update('automation-state', {}, (all) => ({ ...all, [id]: { ...(all[id] || {}), ...patch } }))[id];
}
