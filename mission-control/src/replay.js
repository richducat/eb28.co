import fs from 'node:fs';
import path from 'node:path';
import { MC_HOME } from './config.js';

/**
 * Daily replay: every time the board changes, append a compact snapshot of every job's
 * status to ~/.eb28-mission-control/replay/YYYY-MM-DD.jsonl. The Arcade can then scrub
 * through the day and watch agents move between islands. Files older than 14 days are
 * pruned.
 */
const dir = () => path.join(MC_HOME, 'replay');
const dayOf = (ms = Date.now()) => new Date(ms).toLocaleDateString('en-CA');
let lastSig = '';

/** Compact job row: [id, status, title, source, business, app, provider]. */
export function compact(board) {
  return board.columns.flatMap((c) => c.jobs).map((j) => [j.id, j.status, (j.title || '').slice(0, 80), j.source, j.business || '', j.app || '', (j.meta && j.meta.provider) || '']);
}

export function record(board, now = Date.now()) {
  const jobs = compact(board);
  const sig = jobs.map((r) => `${r[0]}:${r[1]}`).sort().join('|');
  if (sig === lastSig) return false;
  lastSig = sig;
  fs.mkdirSync(dir(), { recursive: true });
  fs.appendFileSync(path.join(dir(), `${dayOf(now)}.jsonl`), `${JSON.stringify({ t: now, jobs })}\n`);
  if (Math.random() < 0.02) prune(now);
  return true;
}

export function frames(date = dayOf()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('bad date');
  try {
    return fs.readFileSync(path.join(dir(), `${date}.jsonl`), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

export function days() {
  try {
    return fs.readdirSync(dir()).filter((f) => f.endsWith('.jsonl')).map((f) => f.replace('.jsonl', '')).sort().reverse();
  } catch {
    return [];
  }
}

function prune(now) {
  for (const d of days()) if (now - Date.parse(`${d}T12:00:00`) > 14 * 86400e3) fs.rmSync(path.join(dir(), `${d}.jsonl`), { force: true });
}

/** Rebuild a minimal board from a snapshot, in the shape the Arcade expects. */
export function boardFrom(frame, businesses = [], apps = []) {
  const cols = ['needs_you', 'working', 'follow_up', 'done', 'failed'].map((id) => ({ id, jobs: [] }));
  for (const [id, status, title, source, business, app, provider] of frame.jobs) {
    const col = cols.find((c) => c.id === status) || cols[1];
    col.jobs.push({ id, status, title, source, business, app, meta: { provider }, tags: [] });
  }
  return { generatedAt: new Date(frame.t).toISOString(), columns: cols, businesses, apps };
}
