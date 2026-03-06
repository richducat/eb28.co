#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repoRoot = process.cwd();
const outDir = path.join(repoRoot, 'docs', 'data');
const workspace = process.env.OPENCLAW_WORKSPACE || path.join(os.homedir(), '.openclaw', 'workspace-ocdev');

async function ensureDir() { await fs.mkdir(outDir, { recursive: true }); }

function nowIso() { return new Date().toISOString(); }

async function readJsonSafe(file) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return null; }
}

async function writeJson(name, data) {
  await fs.writeFile(path.join(outDir, name), JSON.stringify(data, null, 2));
}

async function buildActivityFeed() {
  const memFile = path.join(workspace, 'memory', '2026-03-05.md');
  let items = [];
  try {
    const txt = await fs.readFile(memFile, 'utf8');
    items = txt.split(/\r?\n/)
      .filter((l) => /^\s*[-*]\s+/.test(l))
      .slice(-80)
      .map((l, i) => ({
        id: `mem-${i}`,
        timestamp: nowIso(),
        message: l.replace(/^\s*[-*]\s+/, '').trim(),
        type: /error|fail|warn|blocked/i.test(l) ? 'warning' : 'info'
      }));
  } catch {
    items = [{ id: 'boot', timestamp: nowIso(), message: 'Static feed active. Waiting for fresh activity.', type: 'info' }];
  }

  return {
    source: 'docs/data/activity-feed.json',
    workspace,
    count: items.length,
    generatedAt: nowIso(),
    items,
  };
}

async function buildCronStatus() {
  let jobs = [];
  let errors = [];
  try {
    const { stdout } = await execFileAsync('openclaw', ['cron', 'list', '--all', '--json'], { timeout: 15000 });
    const payload = JSON.parse(stdout);
    const raw = Array.isArray(payload) ? payload : (payload.jobs || payload.items || []);
    jobs = raw.map((j, idx) => ({
      id: String(j.id || j.jobId || `job-${idx}`),
      name: String(j.name || j.title || `Job ${idx + 1}`),
      schedule: String(j.schedule || j.cron || 'n/a'),
      enabled: typeof j.enabled === 'boolean' ? j.enabled : true,
      status: String(j.status || 'active'),
      nextRun: j.nextRun || j.nextRunAt || null,
      lastRun: j.lastRun || j.lastRunAt || null,
    }));
  } catch (e) {
    errors.push(`cron unavailable: ${e.message}`);
  }

  return {
    scheduler: { status: 'static-cache', generatedAt: nowIso() },
    jobs,
    errors,
  };
}

async function buildSearch() {
  return {
    query: '',
    workspace,
    indexedFiles: 0,
    items: [],
    note: 'Static search cache active. Use API mode for live workspace search.'
  };
}

async function main() {
  await ensureDir();
  await writeJson('activity-feed.json', await buildActivityFeed());
  await writeJson('cron-status.json', await buildCronStatus());
  await writeJson('search.json', await buildSearch());
  console.log('Generated docs/data/*.json');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
