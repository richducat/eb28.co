#!/usr/bin/env node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';

const ROOT = process.cwd();
const FEATURE_FILE = path.join(ROOT, 'content', 'eb28', 'social-features.json');

function parseArgs(argv) {
  const options = {
    outputDir: path.join(ROOT, 'output', 'eb28-social', 'proof-captures'),
    only: null,
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--output-dir') {
      options.outputDir = path.resolve(ROOT, next || '');
      index += 1;
    } else if (arg === '--only') {
      options.only = next || null;
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/capture-eb28-social-proof.mjs [--output-dir PATH] [--only FEATURE_ID]');
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

async function findPlaywrightCli() {
  const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
  const candidate = process.env.PWCLI || path.join(codexHome, 'skills', 'playwright', 'scripts', 'playwright_cli.sh');
  try {
    await fs.access(candidate);
  } catch {
    throw new Error(`Playwright CLI wrapper is required for EB28 proof captures: ${candidate}`);
  }
  const npxCheck = spawnSync('npx', ['--version'], { encoding: 'utf8', timeout: 10_000 });
  if (npxCheck.status !== 0) throw new Error('npx is required by the Playwright CLI wrapper.');
  return candidate;
}

function runPlaywrightCli({ cliPath, sessionId, cwd, args }) {
  const result = spawnSync(cliPath, args, {
    cwd,
    env: { ...process.env, PLAYWRIGHT_CLI_SESSION: sessionId },
    encoding: 'utf8',
    timeout: 60_000,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.status !== 0) {
    throw new Error(`Playwright CLI failed (${args.join(' ')}): ${(result.stderr || result.stdout || '').slice(0, 800)}`);
  }
  return result.stdout || '';
}

async function main() {
  const options = parseArgs(process.argv);
  const catalog = JSON.parse(await fs.readFile(FEATURE_FILE, 'utf8'));
  const features = (catalog.features || []).filter(
    (feature) => feature.status !== 'retired' && (!options.only || feature.id === options.only),
  );
  if (!features.length) throw new Error(`No active feature matched: ${options.only || 'all'}`);
  const playwrightCli = await findPlaywrightCli();
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'eb28-social-proof-'));
  const sessionId = `eb28-social-proof-${process.pid}`;
  const capturedAt = new Date().toISOString();
  const captures = [];
  await fs.mkdir(options.outputDir, { recursive: true });

  try {
    for (const [index, feature] of features.entries()) {
      const outputPath = path.join(options.outputDir, `${feature.id}.jpg`);
      const sourceUrl = feature.cta?.url;
      if (!/^https:\/\/eb28\.co\//.test(sourceUrl || '')) {
        throw new Error(`Feature ${feature.id} does not have an owned public capture URL.`);
      }
      runPlaywrightCli({
        cliPath: playwrightCli,
        sessionId,
        cwd: tempRoot,
        args: [index === 0 ? 'open' : 'tab-new', sourceUrl],
      });
      runPlaywrightCli({ cliPath: playwrightCli, sessionId, cwd: tempRoot, args: ['resize', '1440', '1000'] });
      if (new URL(sourceUrl).hash) {
        runPlaywrightCli({
          cliPath: playwrightCli,
          sessionId,
          cwd: tempRoot,
          args: ['eval', "document.querySelector(location.hash)?.scrollIntoView({block: 'start'})"],
        });
      }
      const screenshotOutput = runPlaywrightCli({
        cliPath: playwrightCli,
        sessionId,
        cwd: tempRoot,
        args: ['screenshot'],
      });
      const screenshotRelativePath = screenshotOutput.match(/\[Screenshot of viewport\]\(([^)]+)\)/)?.[1];
      if (!screenshotRelativePath) throw new Error(`Unable to locate Playwright screenshot output for ${feature.id}.`);
      const rawPath = path.resolve(tempRoot, screenshotRelativePath);
      await sharp(rawPath)
        .flatten({ background: '#020617' })
        .resize(1440, 1000, { fit: 'cover', position: 'north' })
        .jpeg({ quality: 90, chromaSubsampling: '4:4:4', mozjpeg: true })
        .toFile(outputPath);
      const metadata = await sharp(outputPath).metadata();
      captures.push({
        featureId: feature.id,
        featureName: feature.name,
        lane: feature.lane,
        sourceUrl,
        capturedAt,
        localPath: path.relative(ROOT, outputPath).split(path.sep).join('/'),
        width: metadata.width,
        height: metadata.height,
        mimeType: 'image/jpeg',
        publicPageOnly: true,
      });
    }
  } finally {
    try {
      runPlaywrightCli({ cliPath: playwrightCli, sessionId, cwd: tempRoot, args: ['close'] });
    } catch {
      // The temporary browser session may already be closed after a navigation failure.
    }
    await fs.rm(tempRoot, { recursive: true, force: true });
  }

  const manifestPath = path.join(options.outputDir, 'proof-captures.json');
  await fs.writeFile(
    manifestPath,
    `${JSON.stringify({ version: catalog.version, capturedAt, count: captures.length, captures }, null, 2)}\n`,
    'utf8',
  );
  console.log(
    JSON.stringify(
      {
        ok: true,
        status: 'captured',
        count: captures.length,
        outputDir: path.relative(ROOT, options.outputDir),
        manifestPath: path.relative(ROOT, manifestPath),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
