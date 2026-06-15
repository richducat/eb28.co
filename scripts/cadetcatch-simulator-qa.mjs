#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';

const args = parseArgs(process.argv.slice(2));
const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  cwd: process.cwd(),
  encoding: 'utf8',
}).trim();

const developerDir = args['developer-dir'] || process.env.DEVELOPER_DIR || '/Applications/Xcode.app/Contents/Developer';
const env = { ...process.env, DEVELOPER_DIR: developerDir };
const commandTimeoutMs = Number(args['command-timeout-ms'] || process.env.CADETCATCH_QA_COMMAND_TIMEOUT_MS || 600_000);
const simulatorName = args.simulator || 'iPhone 17 Pro Max';
const projectPath = path.join(repoRoot, 'ios/CadetCatch/CadetCatch.xcodeproj');
const scheme = 'CadetCatch';
const bundleId = 'co.eb28.cadetcatch';
const derivedDataPath = path.join(repoRoot, 'output/cadetcatch-simulator/DerivedData');
const receiptDir = path.join(repoRoot, 'output/cadetcatch-simulator');

if (!existsSync(developerDir)) {
  fail(`Full Xcode developer directory not found: ${developerDir}`);
}

if (!args['skip-release-gate']) {
  run('node', ['scripts/verify-cadetcatch-release.mjs', '--mode', 'release-surface'], { cwd: repoRoot });
}

const simulator = selectSimulator(simulatorName);
console.log(`Using simulator: ${simulator.name} (${simulator.udid}) on ${simulator.runtimeName}`);

mkdirSync(receiptDir, { recursive: true });

run('xcodebuild', [
  '-project', projectPath,
  '-scheme', scheme,
  '-configuration', 'Debug',
  '-destination', `id=${simulator.udid}`,
  '-derivedDataPath', derivedDataPath,
  'build',
], { cwd: path.join(repoRoot, 'ios/CadetCatch') });

run('xcrun', ['simctl', 'boot', simulator.udid], {
  cwd: repoRoot,
  allowFailureContaining: ['Unable to boot device in current state: Booted', 'Booted'],
});

run('open', ['-a', 'Simulator'], { cwd: repoRoot, allowFailure: true });
run('xcrun', ['simctl', 'install', simulator.udid, findAppBundle()], { cwd: repoRoot });
run('xcrun', ['simctl', 'launch', simulator.udid, bundleId], { cwd: repoRoot });

const waitMs = Number(args['screenshot-delay-ms'] || 4000);
if (waitMs > 0) {
  console.log(`Waiting ${waitMs}ms before screenshot...`);
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, waitMs);
}

const screenshotPath = path.join(receiptDir, `cadetcatch-${timestamp()}.png`);
run('xcrun', ['simctl', 'io', simulator.udid, 'screenshot', screenshotPath], { cwd: repoRoot });

console.log('\nCadetCatch simulator QA completed.');
console.log(`Screenshot: ${screenshotPath}`);

function selectSimulator(name) {
  const raw = runCapture('xcrun', ['simctl', 'list', 'devices', 'available', '-j'], { cwd: repoRoot });
  const parsed = JSON.parse(raw);
  const candidates = [];
  for (const [runtimeId, devices] of Object.entries(parsed.devices || {})) {
    if (!runtimeId.includes('iOS')) continue;
    for (const device of devices) {
      if (device.isAvailable && device.name === name) {
        candidates.push({
          name: device.name,
          udid: device.udid,
          runtimeId,
          runtimeName: runtimeId.replace(/^com\.apple\.CoreSimulator\.SimRuntime\./, '').replace(/-/g, ' '),
        });
      }
    }
  }
  candidates.sort((a, b) => runtimeVersion(b.runtimeId) - runtimeVersion(a.runtimeId));
  if (!candidates[0]) {
    const availableNames = new Set();
    for (const devices of Object.values(parsed.devices || {})) {
      for (const device of devices) {
        if (device.isAvailable && /^iPhone/.test(device.name)) availableNames.add(device.name);
      }
    }
    fail(`Simulator "${name}" not found. Available iPhone simulators: ${[...availableNames].sort().join(', ')}`);
  }
  return candidates[0];
}

function findAppBundle() {
  const productsDir = path.join(derivedDataPath, 'Build/Products/Debug-iphonesimulator');
  const appPath = path.join(productsDir, 'CadetCatch.app');
  if (existsSync(appPath)) return appPath;
  const fallback = readdirSync(productsDir, { withFileTypes: true })
    .find((entry) => entry.isDirectory() && entry.name.endsWith('.app'));
  if (!fallback) fail(`Could not find built app in ${productsDir}`);
  return path.join(productsDir, fallback.name);
}

function run(command, commandArgs, options = {}) {
  console.log(`\n$ ${command} ${commandArgs.map(shellQuote).join(' ')}`);
  const captureOutput = Boolean(options.allowFailureContaining);
  const result = spawnSync(commandPath(command), commandArgs, {
    cwd: options.cwd || repoRoot,
    env,
    encoding: 'utf8',
    stdio: captureOutput ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    timeout: commandTimeoutMs,
  });
  if (result.error) fail(`Command failed: ${command}: ${result.error.message}`);
  if (captureOutput) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  }
  if (result.status !== 0 && !options.allowFailure) {
    const combined = `${result.stdout || ''}\n${result.stderr || ''}`;
    const allowed = options.allowFailureContaining?.some((text) => combined.includes(text));
    if (!allowed) fail(`Command failed with exit ${result.status}: ${command}`);
  }
}

function runCapture(command, commandArgs, options = {}) {
  const result = spawnSync(commandPath(command), commandArgs, {
    cwd: options.cwd || repoRoot,
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 50 * 1024 * 1024,
    timeout: commandTimeoutMs,
  });
  if (result.error) fail(`Command failed: ${command}: ${result.error.message}`);
  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    fail(`Command failed with exit ${result.status}: ${command}`);
  }
  return result.stdout;
}

function commandPath(command) {
  if (command === 'xcodebuild') {
    const xcodebuildPath = path.join(developerDir, 'usr/bin/xcodebuild');
    return existsSync(xcodebuildPath) ? xcodebuildPath : command;
  }
  if (command === 'xcrun') {
    return '/usr/bin/xcrun';
  }
  return command;
}

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (!arg.startsWith('--')) continue;
    const [key, inlineValue] = arg.slice(2).split('=', 2);
    if (inlineValue !== undefined) {
      parsed[key] = inlineValue;
    } else if (rawArgs[index + 1] && !rawArgs[index + 1].startsWith('--')) {
      parsed[key] = rawArgs[index + 1];
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}

function runtimeVersion(runtimeId) {
  const match = runtimeId.match(/iOS-([0-9]+)-([0-9]+)/);
  if (!match) return 0;
  return Number(match[1]) * 100 + Number(match[2]);
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function shellQuote(value) {
  return /\s/.test(value) ? JSON.stringify(value) : value;
}

function fail(message) {
  console.error(`\nCadetCatch simulator QA failed: ${message}`);
  process.exit(1);
}
