#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = parseArgs(process.argv.slice(2));
const bundleId = 'co.eb28.cadetcatch';
const simulatorName = args.simulator || 'iPhone 17 Pro Max';
const selectedTab = args.tab || 'home';
const profilePath = path.resolve(args.profile || process.env.CADETCATCH_SCREENSHOT_PROFILE || '');
const secondaryProfilePath = args['secondary-profile']
  ? path.resolve(args['secondary-profile'])
  : null;
const cachePath = path.join(repoRoot, 'output/cadetcatch-app-store/search-response.json');

if (!['home', 'photos', 'roster', 'sources', 'more'].includes(selectedTab)) {
  fail(`Unsupported tab: ${selectedTab}`);
}
if (!profilePath || !existsSync(profilePath)) {
  fail('Pass --profile /absolute/path/to/reference-photo.jpg.');
}

const simulator = selectSimulator(simulatorName);
bootSimulator(simulator.udid);

const profileData = readFileSync(profilePath);
const secondaryProfileData = secondaryProfilePath && existsSync(secondaryProfilePath)
  ? readFileSync(secondaryProfilePath)
  : null;
const search = await loadSearchResponse(profileData);
const matches = Array.isArray(search.matches) ? search.matches.filter(validMatch).slice(0, 10) : [];
if (matches.length < 4) {
  fail(`Expected at least four usable matches, received ${matches.length}.`);
}

const cadetID = 'A3EAF7C5-DC9A-4E2D-A7AF-F2DA80E0F4E1';
const now = '2026-07-12T13:41:00Z';
const candidates = matches.map((match, index) => ({
  id: stableUUID(index + 1),
  cadetID,
  cadetName: 'Your Cadet',
  imageURL: match.photo_url,
  confidence: Math.round(Number(match.score) * 100),
  sourceName: 'PDUDDY Event Photos',
  sourceHost: 'CadetCatch',
  sourcePageURL: 'https://api.cadetcatch.com/search',
  detectedFaceCount: 1,
  createdAt: now,
}));

const state = {
  hasSeenOnboarding: true,
  selectedTab,
  cadets: [
    {
      id: cadetID,
      name: 'Your Cadet',
      unit: 'First Company',
      relation: 'Family',
      photoData: profileData.toString('base64'),
      createdAt: now,
    },
    ...(secondaryProfileData ? [{
      id: 'F9014D70-1E9A-447B-B845-D5D1A31A7C0D',
      name: 'Second Cadet',
      unit: 'Second Company',
      relation: 'Family',
      photoData: secondaryProfileData.toString('base64'),
      createdAt: now,
    }] : []),
  ],
  activeCadetID: cadetID,
  candidates,
  savedCandidates: candidates.slice(0, 2),
  scanRecords: [{
    id: '67E97D48-0DA5-44DD-8E9E-A1411B086AF0',
    cadetName: 'Your Cadet',
    checkedSourceCount: 1,
    imageCount: Number(search.matches_returned || candidates.length),
    matchCount: candidates.length,
    scannedAt: now,
  }],
  sources: [{
    id: '69F247D1-B6E3-45E2-AC98-0A92DCB2170D',
    name: 'PDUDDY Event Photos',
    url: 'https://api.cadetcatch.com/search',
    category: 'custom',
    enabled: true,
    lastCheckedAt: now,
    addedAt: now,
  }],
  notes: {},
  lastScanMessage: `${candidates.length} possible matches ready to review.`,
  previewSearchUsed: false,
  searchCredits: 1,
  unlockedImageURLs: candidates.map((candidate) => candidate.imageURL),
  searchTolerance: 'medium',
};

try {
  execFileSync('xcrun', ['simctl', 'terminate', simulator.udid, bundleId], { stdio: 'ignore' });
} catch {
  // The first run can start from an installed but inactive app.
}
try {
  execFileSync('xcrun', ['simctl', 'spawn', simulator.udid, 'killall', 'cfprefsd'], { stdio: 'ignore' });
} catch {
  // The preferences daemon is not always running before the first app launch.
}

const stateJSON = JSON.stringify(state);
const stateBase64 = Buffer.from(stateJSON, 'utf8').toString('base64');
const appContainer = execFileSync('xcrun', [
  'simctl', 'get_app_container', simulator.udid, bundleId, 'data',
], { encoding: 'utf8' }).trim();
const preferencePath = path.join(appContainer, 'Library/Preferences', `${bundleId}.plist`);
try {
  execFileSync('/usr/bin/plutil', [
    '-replace', 'cadetcatch\\.native\\.state\\.v1', '-data', stateBase64, preferencePath,
  ], { stdio: 'inherit' });
} catch {
  execFileSync('/usr/bin/plutil', [
    '-insert', 'cadetcatch\\.native\\.state\\.v1', '-data', stateBase64, preferencePath,
  ], { stdio: 'inherit' });
}
const seededJSON = execFileSync('/usr/libexec/PlistBuddy', [
  '-c', 'Print :cadetcatch.native.state.v1', preferencePath,
], { encoding: 'utf8' });
const seededState = JSON.parse(seededJSON);
if (seededState.selectedTab !== selectedTab || seededState.candidates?.length !== candidates.length) {
  fail('Simulator state verification failed before launch.');
}
execFileSync('xcrun', [
  'simctl', 'status_bar', simulator.udid, 'override',
  '--time', '9:41', '--batteryState', 'charged', '--batteryLevel', '100',
  '--wifiBars', '3', '--cellularBars', '4',
], { stdio: 'ignore' });
execFileSync('xcrun', ['simctl', 'launch', simulator.udid, bundleId], { stdio: 'inherit' });

console.log(JSON.stringify({
  simulator: simulator.name,
  udid: simulator.udid,
  selectedTab,
  matchesSeeded: candidates.length,
  searchMinimumScore: 0.55,
  searchResponseCache: cachePath,
}, null, 2));

async function loadSearchResponse(profileData) {
  if (!args.refresh && existsSync(cachePath)) {
    return JSON.parse(readFileSync(cachePath, 'utf8'));
  }

  const body = new FormData();
  body.append('file', new Blob([profileData], { type: 'image/jpeg' }), path.basename(profilePath));
  body.append('top_k', '50');
  body.append('min_score', '0.55');
  body.append('face_index', '0');

  const response = await fetch('https://api.cadetcatch.com/search', {
    method: 'POST',
    body,
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) {
    fail(`CadetCatch search returned HTTP ${response.status}.`);
  }

  const payload = await response.json();
  mkdirSync(path.dirname(cachePath), { recursive: true });
  writeFileSync(cachePath, `${JSON.stringify(payload, null, 2)}\n`);
  return payload;
}

function selectSimulator(name) {
  const parsed = JSON.parse(execFileSync('xcrun', ['simctl', 'list', 'devices', 'available', '-j'], { encoding: 'utf8' }));
  const candidates = [];
  for (const [runtimeId, devices] of Object.entries(parsed.devices || {})) {
    if (!runtimeId.includes('iOS')) continue;
    for (const device of devices) {
      if (device.isAvailable && device.name === name) {
        candidates.push({ ...device, runtimeId });
      }
    }
  }
  candidates.sort((a, b) => runtimeVersion(b.runtimeId) - runtimeVersion(a.runtimeId));
  if (!candidates[0]) fail(`Simulator not found: ${name}`);
  return candidates[0];
}

function bootSimulator(udid) {
  try {
    execFileSync('xcrun', ['simctl', 'boot', udid], { stdio: 'ignore' });
  } catch {
    // Already booted is the expected state during a screenshot run.
  }
  execFileSync('xcrun', ['simctl', 'bootstatus', udid, '-b'], { stdio: 'ignore' });
}

function stableUUID(index) {
  return `71011A7B-4B30-4D2E-9B8F-${String(index).padStart(12, '0')}`;
}

function validMatch(match) {
  return Number.isFinite(Number(match?.score)) && typeof match?.photo_url === 'string' && /^https:\/\//.test(match.photo_url);
}

function runtimeVersion(runtimeId) {
  const match = runtimeId.match(/iOS-([0-9]+)-([0-9]+)/);
  return match ? Number(match[1]) * 100 + Number(match[2]) : 0;
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

function fail(message) {
  console.error(message);
  process.exit(1);
}
