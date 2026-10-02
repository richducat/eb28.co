import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { APP_ROOT, repoRoots } from '../config.js';
import { which } from '../paths.js';
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

/**
 * When a schedule fires next (ISO string), given the last run. Interval schedules run
 * `ms` after the last run (or now if never run); clock schedules run at the next slot.
 */
export function nextRunAt(schedule, lastRunAt, now = Date.now()) {
  const sched = typeof schedule === 'string' ? parseSchedule(schedule) : schedule;
  if (!sched) return null;
  if (sched.kind === 'interval') {
    const last = lastRunAt ? Date.parse(lastRunAt) : 0;
    return new Date(Math.max(now, last + sched.ms)).toISOString();
  }
  const d = new Date(now);
  for (let i = 0; i < 8; i += 1) {
    const slot = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i, sched.hour, sched.minute);
    const day = slot.getDay();
    if (sched.weekdaysOnly && (day === 0 || day === 6)) continue;
    if (slot.getTime() > now) return slot.toISOString();
  }
  return null;
}

export function resolveCwd(a) {
  const roots = repoRoots();
  if (!a.cwd || a.cwd === 'repo') return roots[0];
  if (path.isAbsolute(a.cwd)) return roots.some((r) => a.cwd.startsWith(r)) ? a.cwd : null;
  const rel = path.resolve(roots[0], a.cwd);
  return rel.startsWith(roots[0]) ? rel : null;
}

const running = new Map();

/**
 * Executable for an automation's first argv. `python3`/`python` resolve to the newest
 * python3.x on PATH (macOS ships 3.9; the repo's CI uses 3.13), or MC_PYTHON if set.
 */
export function resolveBin(cmd) {
  if (cmd === 'python3' || cmd === 'python') {
    if (process.env.MC_PYTHON && which(process.env.MC_PYTHON)) return which(process.env.MC_PYTHON);
    for (let minor = 20; minor >= 10; minor -= 1) {
      const hit = which(`python3.${minor}`);
      if (hit) return hit;
    }
  }
  return which(cmd);
}

/**
 * Why an automation cannot run in `cwd` (its npm script, file, module or test folder is
 * missing), or '' when it looks runnable. Lets a machine without a repo checkout show
 * "not set up here" instead of a wall of failures.
 */
export function missingTarget(a, cwd) {
  if (!cwd) return 'its folder is outside the allowed repo roots';
  const [cmd, ...args] = a.command;
  const has = (rel) => fs.existsSync(path.join(cwd, rel));
  if (cmd === 'npm' && args.includes('run')) {
    const script = args[args.indexOf('run') + 1 + (args[args.indexOf('run') + 1] === '--silent' ? 1 : 0)];
    let pkg = null;
    try {
      pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
    } catch {
      return `no package.json in ${cwd}`;
    }
    return pkg.scripts && pkg.scripts[script] ? '' : `npm script "${script}" is not defined in ${cwd}`;
  }
  if (cmd === 'python3' || cmd === 'python' || cmd === 'node') {
    const m = args.indexOf('-m');
    if (m >= 0 && args[m + 1] && args[m + 1] !== 'unittest') {
      const mod = args[m + 1].replace(/\./g, '/');
      return has(`${mod}.py`) || has(mod) ? '' : `module ${args[m + 1]} is not in ${cwd}`;
    }
    const s = args.indexOf('-s');
    if (s >= 0 && args[s + 1]) return has(args[s + 1]) ? '' : `${args[s + 1]} is not in ${cwd}`;
    const file = args.find((x) => /\.(m?js|cjs|py)$/.test(x));
    if (file) return has(file) ? '' : `${file} is not in ${cwd}`;
  }
  return '';
}

/** Execute an automation. Resolves with the run record; never throws. */
export function runAutomation(a, { trigger = 'manual', onEvent } = {}) {
  if (running.has(a.id)) return Promise.resolve({ ...running.get(a.id), skipped: 'already running' });
  const cwd = resolveCwd(a);
  const startedAt = new Date().toISOString();
  const base = { automationId: a.id, title: a.title, tier: a.tier, trigger, cwd, startedAt, status: 'running' };
  const missing = missingTarget(a, cwd);
  if (missing) return Promise.resolve(record({ ...base, ok: false, unavailable: true, status: 'finished', error: `Not set up on this machine: ${missing}.`, finishedAt: startedAt, durationMs: 0 }));
  const bin = resolveBin(a.command[0]);
  if (!bin) {
    return Promise.resolve(record({ ...base, ok: false, status: 'finished', error: `"${a.command[0]}" was not found on PATH. Install it or add its folder to your shell PATH, then relaunch Mission Control.`, finishedAt: startedAt, durationMs: 0 }));
  }
  running.set(a.id, base);
  store.append('automation-runs', base, 400);
  if (onEvent) onEvent({ type: 'automation:start', run: base });
  const started = Date.now();
  return new Promise((resolve) => {
    let output = '';
    let child;
    try {
      child = spawn(bin, a.command.slice(1), { cwd, env: { ...process.env, ...(a.env || {}), MC_AUTOMATION: a.id }, shell: false });
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
    let spawnError = '';
    child.on('error', (err) => {
      spawnError = err.message;
      capture(`\n${err.message}`);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      running.delete(a.id);
      const run = record({ ...base, ok: code === 0 && !spawnError, code, status: 'finished', output, error: spawnError || undefined, finishedAt: new Date().toISOString(), durationMs: Date.now() - started });
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
