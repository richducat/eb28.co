import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { store } from './store.js';
import { makeJob } from './jobs/model.js';

/**
 * Talk to a Hermes chief of staff from Mission Control. Each message runs
 * `hermes -p <profile> chat -Q --oneshot -q <text>` (local Qwen, so it is free) and the
 * exchange is kept in the store. While a message is being worked on it shows up as a job,
 * so it appears on the board and walks around the Arcade like any other agent.
 */
export const PROFILES = [
  { id: 'hermes-cos', name: 'Hermes CoS (talks to Grok)' },
  { id: 'cos', name: 'Chief of Staff' },
  { id: 'tyfys-cos', name: 'TYFYS CoS' },
  { id: 'eb28-cos', name: 'EB28 CoS' },
];

export function hermesBin() {
  const candidates = [process.env.MC_HERMES_BIN, path.join(os.homedir(), '.hermes', 'hermes-agent', '.hermes', 'bin', 'hermes')].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p)) || null;
}

/** Strip Hermes's housekeeping lines from an answer. Pure; exported for tests. */
export function cleanAnswer(out) {
  return String(out || '')
    .split('\n')
    .filter((l) => !/^(session_id:|Skipping broken secondary profile|⚠️\s+hermes config)/.test(l.trim()))
    .join('\n')
    .trim();
}

const running = new Map();

export function chats() {
  return store.get('cos-chat', []).slice(-30);
}

function save(entry) {
  store.update('cos-chat', [], (list) => {
    const i = list.findIndex((x) => x.id === entry.id);
    const next = i >= 0 ? list.map((x, k) => (k === i ? entry : x)) : [...list, entry];
    return next.slice(-100);
  });
}

export function askCos({ text, profile = 'hermes-cos', onEvent } = {}) {
  const q = String(text || '').trim();
  if (!q) throw new Error('Type a message first.');
  if (!PROFILES.some((p) => p.id === profile)) throw new Error('Unknown chief of staff.');
  const bin = hermesBin();
  if (!bin) throw new Error('Hermes is not installed on this Mac.');
  const entry = { id: `cos:${Date.now()}`, profile, q, a: '', status: 'running', at: new Date().toISOString() };
  save(entry);
  const prompt = `${q}\n\n(Sent by Richard from Mission Control. Follow your charter: drafts are fine; ask before sending, paying, deleting or submitting anything.)`;
  const child = spawn(bin, ['-p', profile, 'chat', '-Q', '--oneshot', '-q', prompt], { cwd: os.homedir(), env: process.env });
  running.set(entry.id, child);
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });
  const timer = setTimeout(() => child.kill('SIGTERM'), 15 * 60 * 1000);
  child.on('error', (err) => { out += err.message; });
  child.on('close', (code) => {
    clearTimeout(timer);
    running.delete(entry.id);
    const done = { ...entry, a: cleanAnswer(out).slice(-6000) || (code ? `Hermes exited with code ${code}.` : '(no reply)'), status: code === 0 ? 'done' : 'failed', finishedAt: new Date().toISOString() };
    save(done);
    if (onEvent) onEvent({ type: 'cos:done', chat: done });
  });
  if (onEvent) onEvent({ type: 'cos:start', chat: entry });
  return entry;
}

/** Recent conversations as jobs, so they live on the board and the map. */
export const id = 'cos';
export const label = 'Chief of Staff';
export async function collect({ now = Date.now() } = {}) {
  return chats()
    .filter((c) => now - Date.parse(c.finishedAt || c.at) < 6 * 3600e3)
    .map((c) =>
      makeJob({
        id: c.id,
        source: 'hermes',
        title: `Chief of Staff: "${c.q.length > 70 ? `${c.q.slice(0, 69)}…` : c.q}"`,
        status: c.status === 'running' ? (running.has(c.id) ? 'working' : 'failed') : c.status === 'done' ? 'done' : 'failed',
        reason: c.status === 'running' ? `${PROFILES.find((p) => p.id === c.profile)?.name || c.profile} is working on it.` : c.status === 'done' ? 'Replied.' : 'The chief of staff hit a problem.',
        startedAt: c.at,
        lastActivity: c.finishedAt || c.at,
        lastMessage: c.a || c.q,
        meta: { kind: 'cos', profile: c.profile },
        tags: ['chief-of-staff', c.profile],
      }),
    );
}
