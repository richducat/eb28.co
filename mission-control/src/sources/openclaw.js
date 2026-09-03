import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PATHS } from '../config.js';
import { makeJob } from '../jobs/model.js';
import { exists } from './util.js';

const execFileAsync = promisify(execFile);
export const id = 'openclaw';
export const label = 'OpenClaw';

const BIN_CANDIDATES = [process.env.OPENCLAW_BIN, '/opt/homebrew/bin/openclaw', '/usr/local/bin/openclaw', '/usr/bin/openclaw'].filter(Boolean);

function findBin() {
  return BIN_CANDIDATES.find((c) => exists(c)) || null;
}

/** Normalise an OpenClaw cron job record (CLI json or jobs.json file) into a job. */
export function jobFromCron(raw, now = Date.now()) {
  const last = raw.lastRun || raw.last_run || raw.state || {};
  const lastStatus = String(last.status || raw.lastStatus || raw.status || '').toLowerCase();
  const lastAt = last.finishedAt || last.at || last.endedAt || raw.lastRunAt || raw.last_run_at || null;
  const nextAt = raw.nextRunAt || raw.next_run_at || raw.next || null;
  const enabled = raw.enabled !== false && raw.paused !== true;
  const running = lastStatus === 'running' || lastStatus === 'in_progress';
  let status = 'done';
  let reason = lastAt ? `Last run ${lastStatus || 'ok'}.` : 'Scheduled; has not run yet.';
  if (!enabled) {
    status = 'follow_up';
    reason = 'This cron job is paused. Re-enable it or delete it.';
  } else if (running) {
    status = 'working';
    reason = 'Cron run in progress.';
  } else if (['error', 'failed', 'failure'].includes(lastStatus)) {
    status = 'failed';
    reason = last.error || last.message || 'Last scheduled run failed.';
  } else if (lastAt && now - Date.parse(lastAt) > 2 * 24 * 3600 * 1000 && nextAt && Date.parse(nextAt) < now) {
    status = 'follow_up';
    reason = 'Missed its scheduled run window.';
  }
  const jobId = raw.id || raw.jobId || raw.name;
  return makeJob({
    id: `openclaw:${jobId}`,
    source: id,
    title: raw.name || raw.title || raw.prompt || String(jobId),
    status,
    reason,
    startedAt: raw.createdAt || raw.created_at,
    lastActivity: lastAt || raw.updatedAt || raw.updated_at,
    lastMessage: last.summary || last.output || raw.description || raw.prompt || '',
    resumeCommand: `openclaw cron run ${jobId}`,
    meta: { schedule: raw.schedule || raw.cron || raw.interval, nextRunAt: nextAt, enabled, lastStatus },
    tags: ['cron'],
  });
}

async function fromCli() {
  const bin = findBin();
  if (!bin) return null;
  try {
    const { stdout } = await execFileAsync(bin, ['cron', 'list', '--json'], { timeout: 8000, maxBuffer: 4 * 1024 * 1024 });
    const parsed = JSON.parse(stdout);
    const list = Array.isArray(parsed) ? parsed : parsed.jobs || parsed.items || [];
    return list;
  } catch {
    return null;
  }
}

function fromFiles() {
  const candidates = [
    path.join(PATHS.openclawHome, 'cron', 'jobs.json'),
    path.join(PATHS.openclawHome, 'cron.json'),
    path.join(PATHS.openclawHome, 'workspace', 'cron', 'jobs.json'),
  ];
  for (const file of candidates) {
    if (!exists(file)) continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      return Array.isArray(parsed) ? parsed : parsed.jobs || [];
    } catch {
      /* try next */
    }
  }
  return [];
}

export async function collect({ now = Date.now() } = {}) {
  const list = (await fromCli()) ?? fromFiles();
  return list.filter((j) => j && (j.id || j.name)).map((j) => jobFromCron(j, now));
}
