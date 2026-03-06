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

function parseTickerDataFromHtml(html) {
  const match = html.match(/window\.TICKER_DATA\s*=\s*(\{[\s\S]*?\});/);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}

async function buildFundManagerData() {
  let tickerData = null;

  // 1) Prefer the ticker-site generated JSON (fresh workflow output)
  try {
    const res = await fetch('https://raw.githubusercontent.com/richducat/ticker-site/main/docs/data.json', {
      headers: { 'User-Agent': 'FundManager-StaticBuilder/1.0' }
    });
    if (res.ok) {
      tickerData = await res.json();
    }
  } catch {
    // continue to fallback
  }

  // 2) Fallback to legacy site HTML parsing
  if (!tickerData) {
    try {
      const res = await fetch('https://freeopenclawtrader.com', { headers: { 'User-Agent': 'FundManager-StaticBuilder/1.0' } });
      if (res.ok) {
        const html = await res.text();
        tickerData = parseTickerDataFromHtml(html);
      }
    } catch {
      // ignore network errors and fallback below
    }
  }

  const committee = await readJsonSafe(path.join(workspace, 'ops', 'committee', 'outputs', 'committee_decision.json')) || {
    decision: 'NO_TRADE', direction: 'NA', confidence: 0, blockers: ['missing_committee_output']
  };

  const orchestratorState = await readJsonSafe(path.join(workspace, 'ops', 'reports', 'live_orchestrator_state.json')) || {};
  const orchestrator = {
    status: orchestratorState?.result?.ran ? 'RUNNING' : 'IDLE',
    lastCycle: orchestratorState?.lastCycle || nowIso(),
    detail: orchestratorState?.result || null
  };

  const botStatuses = [];
  if (tickerData?.botActivityText) {
    for (const part of tickerData.botActivityText.split('•').map((s) => s.trim())) {
      const idx = part.indexOf(':');
      if (idx > 0) botStatuses.push({ name: part.slice(0, idx).trim(), status: part.slice(idx + 1).trim() });
    }
  }

  const tradeLogs = tickerData?.logsList ? tickerData.logsList.split('\n').filter(Boolean).map((l) => l.trim()) : [];

  return {
    ok: true,
    source: tickerData ? (tickerData.balanceUsd !== undefined ? 'ticker-site/data.json' : 'freeopenclawtrader.com') : 'static-cache',
    updatedAt: tickerData?.updatedAt || nowIso(),
    portfolio: {
      balance: tickerData?.balanceUsd || '$0.00',
      exposure: tickerData?.exposureUsd || '$0.00',
      totalPnl: tickerData?.totalPnlUsd || '$0.00',
      positionsCount: tickerData?.positionsCount || 0,
      winRate: tickerData?.winRate || '--',
      profitFactor: tickerData?.profitFactor || '--',
      drawdown: tickerData?.drawdown || '--',
    },
    bots: botStatuses,
    trades: tradeLogs,
    botPerf: tickerData?.botPerf || '',
    accountStatus: tickerData?.accountStatus || 'UNKNOWN',
    latency: tickerData?.latency || '--',
    committee: {
      decision: committee.decision,
      direction: committee.direction,
      confidence: committee.confidence,
      blockers: committee.blockers || []
    },
    orchestrator
  };
}

async function main() {
  await ensureDir();
  await writeJson('activity-feed.json', await buildActivityFeed());
  await writeJson('cron-status.json', await buildCronStatus());
  await writeJson('search.json', await buildSearch());
  await writeJson('fundmanager-data.json', await buildFundManagerData());
  console.log('Generated docs/data/*.json');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
