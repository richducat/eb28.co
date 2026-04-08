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

  run('npx', ['vite', 'build'], env);
  run(process.execPath, ['scripts/generate-route-pages.mjs'], env);
  run('npm', ['run', 'generate:data'], env);

  await fs.mkdir(path.join(repoRoot, 'docs', 'alarmclock'), { recursive: true });
  await fs.copyFile(
    path.join(repoRoot, 'docs', 'index.html'),
    path.join(repoRoot, 'docs', 'alarmclock', 'index.html'),
  );

  console.log(`Build complete: ${buildId}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
