#!/usr/bin/env node

import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function getShortGitSha() {
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'local';
  }
}

function run(command, args, env) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const buildId = process.env.BUILD_ID || `${timestamp}-${getShortGitSha()}`;
  const env = {
    ...process.env,
    BUILD_ID: buildId,
  };

  run(process.execPath, ['scripts/generate-32940-growth-sites.mjs'], env);
  await fs.rm(path.join(repoRoot, 'docs', '32940'), { recursive: true, force: true });
  run('npx', ['vite', 'build'], env);
  await buildStaticSite('flavorfeed', env);
  await buildStaticSite('servo', env);
  run(process.execPath, ['scripts/generate-route-pages.mjs'], env);
  run(process.execPath, ['scripts/generate-eb28-blog.mjs'], env);
  run('npm', ['run', 'generate:data'], env);

  await fs.mkdir(path.join(repoRoot, 'docs', 'alarmclock'), { recursive: true });
  await fs.copyFile(
    path.join(repoRoot, 'docs', 'index.html'),
    path.join(repoRoot, 'docs', 'alarmclock', 'index.html'),
  );

  console.log(`Build complete: ${buildId}`);
}

async function buildStaticSite(siteName, env) {
  const siteDir = path.join(repoRoot, 'sites', siteName);
  const packagePath = path.join(siteDir, 'package.json');

  try {
    await fs.access(packagePath);
  } catch {
    return;
  }

  const lockPath = path.join(siteDir, 'package-lock.json');
  let hasLock = false;

  try {
    const lockStats = await fs.stat(lockPath);
    hasLock = lockStats.size > 0;
  } catch {
    hasLock = false;
  }

  run('npm', ['--prefix', siteDir, hasLock ? 'ci' : 'install'], env);
  run('npm', ['--prefix', siteDir, 'run', 'build'], env);

  const sourceDir = path.join(siteDir, 'dist');
  const targetDir = path.join(repoRoot, 'docs', siteName);
  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.mkdir(path.dirname(targetDir), { recursive: true });
  await fs.cp(sourceDir, targetDir, { recursive: true });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
