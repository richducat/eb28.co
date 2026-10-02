import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PATHS } from './config.js';
import { walk } from './sources/util.js';
import { endpoint } from './local-llm.js';

/**
 * How much of each AI's allowance is being burned, for the fuel tanks on Mech Island.
 *   codex  : real numbers from Codex's own rate-limit events (weekly window, credits)
 *   claude : token activity from Claude Code transcripts (Anthropic does not expose the cap)
 *   grok   : from Hermes's quota cache when its quota tracking is switched on
 *   local  : the free Qwen server; shows whether it is busy, never a cost
 */
const HOME = os.homedir();

function readTail(file, bytes) {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    const len = Math.min(bytes, size);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, size - len);
    return buf.toString('utf8');
  } finally {
    fs.closeSync(fd);
  }
}

export function codexUsage(root = PATHS.codexSessions) {
  const files = walk(root, (f) => f.endsWith('.jsonl'), { limit: 12 });
  for (const { file } of files) {
    let text = '';
    try {
      text = readTail(file, 1024 * 1024);
    } catch {
      continue;
    }
    const lines = text.split('\n');
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      if (!lines[i].includes('"rate_limits"')) continue;
      try {
        const ev = JSON.parse(lines[i]);
        const rl = (ev.payload && ev.payload.rate_limits) || ev.rate_limits;
        if (!rl) continue;
        const win = (w) => (w ? { usedPercent: w.used_percent, windowMinutes: w.window_minutes, resetsAt: w.resets_at ? new Date(w.resets_at * 1000).toISOString() : null } : null);
        return {
          ok: true,
          plan: rl.plan_type || '',
          primary: win(rl.primary),
          secondary: win(rl.secondary),
          credits: rl.credits ? { balance: Number(rl.credits.balance) || 0, unlimited: Boolean(rl.credits.unlimited) } : null,
          limited: Boolean(rl.rate_limit_reached_type),
          at: ev.timestamp || null,
        };
      } catch {
        /* keep looking */
      }
    }
  }
  return { ok: false, reason: 'No recent Codex sessions with limit info.' };
}

export function claudeUsage(root = PATHS.claudeProjects, now = Date.now()) {
  const week = now - 7 * 86400e3;
  const fiveH = now - 5 * 3600e3;
  const files = walk(root, (f) => f.endsWith('.jsonl'), { limit: 400 }).filter((x) => x.mtime > week);
  let t5 = 0;
  let t7 = 0;
  let sessions5 = 0;
  for (const { file, mtime } of files) {
    let text = '';
    try {
      text = readTail(file, mtime > fiveH ? 4 * 1024 * 1024 : 1024 * 1024);
    } catch {
      continue;
    }
    let touched = false;
    for (const line of text.split('\n')) {
      if (!line.includes('"usage"') || !line.includes('"assistant"')) continue;
      try {
        const r = JSON.parse(line);
        const u = r.message && r.message.usage;
        const ts = Date.parse(r.timestamp || '');
        if (!u || !ts || ts < week) continue;
        const n = (u.input_tokens || 0) + (u.output_tokens || 0) + (u.cache_creation_input_tokens || 0);
        t7 += n;
        if (ts >= fiveH) { t5 += n; touched = true; }
      } catch {
        /* partial line */
      }
    }
    if (touched) sessions5 += 1;
  }
  return { ok: true, tokens5h: t5, tokens7d: t7, sessions5h: sessions5, note: 'Anthropic does not publish your Max-plan cap; this is your activity.' };
}

export function hermesQuota(provider) {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(HOME, '.hermes', 'quota_cache.json'), 'utf8'));
    const p = d.providers && d.providers[provider];
    if (!p) return { ok: false, reason: 'Not tracked by Hermes.' };
    if (p.unavailable_reason) {
      const why = { 'opt-in-disabled': 'Tracking is off in Hermes (quota opt-in).', 'no-credentials': 'Hermes has no credentials for it.', 'no-data': 'No data yet.' }[p.unavailable_reason] || p.unavailable_reason;
      return { ok: false, reason: why };
    }
    const w = (p.windows || []).slice().sort((a, b) => (b.used_percent || 0) - (a.used_percent || 0))[0];
    return { ok: true, plan: p.plan || '', usedPercent: w ? w.used_percent : 0, label: w ? w.label : '', resetsAt: w ? w.reset_at : null, at: d.fetched_at };
  } catch {
    return { ok: false, reason: 'Hermes quota cache not found.' };
  }
}

export async function localUsage() {
  const { url, key } = endpoint();
  const headers = key ? { Authorization: `Bearer ${key}` } : {};
  try {
    const models = await (await fetch(`${url}/models`, { headers, signal: AbortSignal.timeout(2500) })).json();
    const loaded = (models.data || []).filter((m) => m.status && m.status.value === 'loaded').map((m) => m.id);
    let busy = 0;
    let total = 0;
    try {
      const base = url.replace(/\/v1$/, '');
      const slots = await (await fetch(`${base}/slots`, { headers, signal: AbortSignal.timeout(2500) })).json();
      if (Array.isArray(slots)) { total = slots.length; busy = slots.filter((s) => s.is_processing).length; }
    } catch {
      /* slots endpoint optional */
    }
    return { ok: true, free: true, models: (models.data || []).map((m) => m.id), loaded, busy, slots: total };
  } catch {
    return { ok: false, free: true, reason: 'Local model server is not running (Hermes starts it).' };
  }
}

let cache = { at: 0, value: null };
export async function usage({ fresh = false } = {}) {
  if (!fresh && cache.value && Date.now() - cache.at < 60e3) return cache.value;
  const value = { at: new Date().toISOString(), codex: codexUsage(), claude: claudeUsage(), grok: hermesQuota('grok'), local: await localUsage() };
  cache = { at: Date.now(), value };
  return value;
}
