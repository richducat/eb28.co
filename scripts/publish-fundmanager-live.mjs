#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repoRoot = process.cwd();
const dataDir = path.join(repoRoot, 'docs', 'data');
const snapshotPath = path.join(dataDir, 'fundmanager-public.json');

// The snapshot is force-pushed as a single orphan commit to a dedicated
// branch so the main history stays clean and no GitHub Pages build is
// triggered. The dashboard fetches the raw URL (CORS: allow-origin *).
const PUBLISH_BRANCH = 'fund-state';
const PUBLISH_FILE = 'fund-state.json';
const VERIFY_URL = `https://raw.githubusercontent.com/richducat/eb28.co/${PUBLISH_BRANCH}/${PUBLISH_FILE}`;

async function generateStaticData() {
  await execFileAsync(process.execPath, [path.join(repoRoot, 'scripts', 'generate-static-data.mjs')], {
    cwd: repoRoot,
    timeout: 120_000,
    maxBuffer: 10 * 1024 * 1024,
  });
}

async function git(args, extraEnv = {}) {
  const { stdout } = await execFileAsync('git', args, {
    cwd: repoRoot,
    timeout: 120_000,
    maxBuffer: 10 * 1024 * 1024,
    env: { ...process.env, ...extraEnv },
  });
  return stdout.trim();
}

async function publishData() {
  const blob = await git(['hash-object', '-w', snapshotPath]);
  const indexFile = path.join(os.tmpdir(), `eb28-fund-state-index-${process.pid}`);
  await fs.rm(indexFile, { force: true });

  try {
    const env = { GIT_INDEX_FILE: indexFile };
    await git(['update-index', '--add', '--cacheinfo', `100644,${blob},${PUBLISH_FILE}`], env);
    const tree = await git(['write-tree'], env);
    const commit = await git(['commit-tree', tree, '-m', 'Publish fund-state snapshot'], env);
    await git(['push', '--force', 'origin', `${commit}:refs/heads/${PUBLISH_BRANCH}`]);
  } finally {
    await fs.rm(indexFile, { force: true });
  }
}

async function verifyPublish() {
  // Cache-bust: raw.githubusercontent caches by full URL for ~300s.
  const response = await fetch(`${VERIFY_URL}?cb=${Date.now()}`, {
    headers: { 'User-Agent': 'EB28-FundPublisher/1.0' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`verify failed with ${response.status}`);
  }

  const snapshot = await response.json();
  return {
    updatedAt: snapshot.updatedAt || null,
    status: snapshot.summary?.status ?? null,
    balanceUsdc: snapshot.account?.balanceUsdc ?? null,
    activeLanes: snapshot.summary?.activeLanes ?? null,
  };
}

async function main() {
  await generateStaticData();
  await publishData();
  const verify = await verifyPublish();
  console.log(JSON.stringify({ ok: true, verify }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
