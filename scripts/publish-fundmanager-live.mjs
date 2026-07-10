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

// FAIL CLOSED. When the live Simmer source is unreachable, the generator falls
// back to a committed placeholder (source: static-public-cache, stale: true,
// updatedAt frozen in the past). Publishing that overwrites the public tape
// with fiction — the exact thing this product promises never to do. Better to
// leave the last known-good snapshot on the branch than to broadcast a stale
// placeholder as if it were live.
const MAX_SNAPSHOT_AGE_MS = 60 * 60 * 1000; // 1h — publisher runs every 5 min

async function assertPublishable() {
  const snapshot = JSON.parse(await fs.readFile(snapshotPath, 'utf8'));
  const reasons = [];

  if (snapshot.ok === false) reasons.push('snapshot.ok is false');
  if (snapshot.stale === true) reasons.push('snapshot marked stale');
  if (String(snapshot.source || '').includes('static-public-cache')) {
    reasons.push(`fallback source: ${snapshot.source}`);
  }
  if (snapshot.fallbackReason) reasons.push(`fallbackReason: ${snapshot.fallbackReason}`);

  const updatedAt = Date.parse(snapshot.updatedAt || '');
  if (!Number.isFinite(updatedAt)) {
    reasons.push('missing/unparseable updatedAt');
  } else if (Date.now() - updatedAt > MAX_SNAPSHOT_AGE_MS) {
    reasons.push(`snapshot is ${Math.round((Date.now() - updatedAt) / 60000)} min old`);
  }

  return { snapshot, reasons };
}

async function verifyPublish() {
  // raw.githubusercontent caches by full URL for ~300s and rate-limits the
  // cache-busted verify. The push already succeeded by this point, so a 429 is
  // noise, not failure — retry briefly, then report unverified.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${VERIFY_URL}?cb=${Date.now()}`, {
      headers: { 'User-Agent': 'EB28-FundPublisher/1.0' },
      cache: 'no-store',
    });

    if (response.ok) {
      const snapshot = await response.json();
      return {
        verified: true,
        updatedAt: snapshot.updatedAt || null,
        status: snapshot.summary?.status ?? null,
        balanceUsdc: snapshot.account?.balanceUsdc ?? null,
        activeLanes: snapshot.summary?.activeLanes ?? null,
      };
    }

    if (response.status !== 429) {
      throw new Error(`verify failed with ${response.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 20_000 * (attempt + 1)));
  }

  return { verified: false, note: 'rate-limited by raw CDN; push already committed' };
}

async function main() {
  await generateStaticData();

  const { snapshot, reasons } = await assertPublishable();
  if (reasons.length) {
    console.error(JSON.stringify({
      ok: false,
      skippedPublish: true,
      reasons,
      source: snapshot.source ?? null,
      updatedAt: snapshot.updatedAt ?? null,
      note: 'last known-good snapshot left in place on the fund-state branch',
    }, null, 2));
    process.exit(1);
  }

  await publishData();
  const verify = await verifyPublish();
  console.log(JSON.stringify({ ok: true, source: snapshot.source, verify }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
