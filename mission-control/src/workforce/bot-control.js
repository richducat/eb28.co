import { spawn } from 'node:child_process';
import { which } from '../paths.js';
import { store } from '../store.js';

const ALLOWED = new Set(['pm2', 'launchctl', 'docker', 'systemctl', 'node', 'python3', 'bash', 'npm']);
const MAX_AUTO_PER_HOUR = 3;

/**
 * Restart a bot with the argv the bots source attached to it. Only argv arrays whose
 * binary is one of the known process managers/runtimes are accepted.
 */
export function restartBot(job, { trigger = 'manual' } = {}) {
  const argv = job && job.meta && job.meta.restart;
  if (!Array.isArray(argv) || !argv.length) return Promise.resolve({ ok: false, error: 'This bot has no restart command. Add one in bots.json.' });
  if (!ALLOWED.has(argv[0])) return Promise.resolve({ ok: false, error: `Refusing to run "${argv[0]}". Allowed: ${[...ALLOWED].join(', ')}.` });
  const bin = which(argv[0]);
  if (!bin) return Promise.resolve({ ok: false, error: `"${argv[0]}" was not found on PATH.` });
  return new Promise((resolve) => {
    let output = '';
    const child = spawn(bin, argv.slice(1), { cwd: job.cwd || undefined, shell: false });
    const timer = setTimeout(() => child.kill('SIGTERM'), 30_000);
    child.stdout.on('data', (c) => (output += c));
    child.stderr.on('data', (c) => (output += c));
    child.on('error', (err) => (output += err.message));
    child.on('close', (code) => {
      clearTimeout(timer);
      const result = { ok: code === 0, code, output: output.slice(-4000) };
      store.append('bot-restarts', { jobId: job.id, name: job.title, trigger, ok: result.ok, code });
      resolve(result);
    });
  });
}

/** How many automatic restarts this bot has had in the last hour. */
export function recentAutoRestarts(jobId, now = Date.now()) {
  return store.get('bot-restarts', []).filter((r) => r.jobId === jobId && r.trigger === 'auto' && now - Date.parse(r.at) < 3600e3).length;
}

export function canAutoRestart(job, now = Date.now()) {
  return Boolean(job.meta && job.meta.autoRestart && job.meta.restart) && recentAutoRestarts(job.id, now) < MAX_AUTO_PER_HOUR;
}

export { MAX_AUTO_PER_HOUR };
