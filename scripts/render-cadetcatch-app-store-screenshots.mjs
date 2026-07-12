#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const playwrightCLI = path.join(process.env.CODEX_HOME || path.join(process.env.HOME, '.codex'), 'skills/playwright/scripts/playwright_cli.sh');
const renderURL = process.env.CADETCATCH_RENDER_BASE_URL
  || 'http://127.0.0.1:4179/app-store/releases/cadetcatch/screenshots/source/render.html';
const outputRoot = path.join(repoRoot, 'app-store/releases/cadetcatch/screenshots/asc');
const devices = [
  { name: 'iphone-69', width: 1320, height: 2868 },
  { name: 'iphone-65', width: 1284, height: 2778 },
];

execFileSync('npx', ['--version'], { stdio: 'ignore' });

for (const device of devices) {
  const outputDir = path.join(outputRoot, device.name);
  mkdirSync(outputDir, { recursive: true });

  for (let frame = 1; frame <= 6; frame += 1) {
    const session = `cadetcatch-${device.name}-${frame}`;
    const outputPath = path.join(outputDir, `${String(frame).padStart(2, '0')}.png`);
    run(['--session', session, 'open', 'about:blank']);
    run(['--session', session, 'resize', String(device.width), String(device.height)]);
    run(['--session', session, 'goto', `${renderURL}?frame=${frame}`]);
    run(['--session', session, 'run-code', 'async (page) => { await page.waitForFunction(() => document.body.dataset.ready === "true"); }']);
    run(['--session', session, 'screenshot', '--filename', outputPath]);
    run(['--session', session, 'close']);
  }
}

console.log(`Rendered CadetCatch App Store screenshots to ${outputRoot}`);

function run(args) {
  execFileSync(playwrightCLI, args, {
    cwd: repoRoot,
    env: process.env,
    stdio: 'inherit',
  });
}
