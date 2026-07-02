import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const releasePath = path.join(root, 'google-play', 'releases', 'cadetcatch', 'play-release.json');
const failures = [];

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function requireFile(relativePath) {
  if (!exists(relativePath)) failures.push(`Missing ${relativePath}`);
}

requireFile('android/settings.gradle');
requireFile('android/app/build.gradle');
requireFile('android/app/src/main/AndroidManifest.xml');
requireFile('android/app/src/main/java/co/eb28/cadetcatch/MainActivity.kt');
requireFile('google-play/releases/cadetcatch/play-release.json');
requireFile('google-play/releases/cadetcatch/play-metadata.md');
requireFile('google-play/releases/cadetcatch/data-safety.md');
requireFile('google-play/releases/cadetcatch/privacy-review.md');
requireFile('google-play/releases/cadetcatch/testing-plan.md');

if (fs.existsSync(releasePath)) {
  const manifest = JSON.parse(fs.readFileSync(releasePath, 'utf8'));
  if (manifest.packageName !== 'co.eb28.cadetcatch') {
    failures.push(`packageName must be co.eb28.cadetcatch, found ${manifest.packageName}`);
  }
  if ((manifest.targetSdk || 0) < 35) {
    failures.push(`targetSdk must be 35 or newer, found ${manifest.targetSdk}`);
  }
  if (manifest.backend?.photoUrlPolicy?.includes('photo_url') !== true) {
    failures.push('play-release.json must preserve the photo_url direct-use policy');
  }
}

if (exists('android/app/build.gradle')) {
  const gradle = read('android/app/build.gradle');
  for (const expected of [
    'namespace "co.eb28.cadetcatch"',
    'applicationId "co.eb28.cadetcatch"',
    'targetSdk 36',
    'com.android.billingclient:billing-ktx',
  ]) {
    if (!gradle.includes(expected)) failures.push(`android/app/build.gradle missing ${expected}`);
  }
}

if (exists('android/app/src/main/java/co/eb28/cadetcatch/MainActivity.kt')) {
  const app = read('android/app/src/main/java/co/eb28/cadetcatch/MainActivity.kt');
  for (const expected of [
    'https://api.cadetcatch.com/search',
    'photo_url',
    'top_k',
    'min_score',
    'co.eb28.cadetcatch.family.monthly.v1',
  ]) {
    if (!app.includes(expected)) failures.push(`MainActivity.kt missing ${expected}`);
  }
}

if (exists('server/cadetcatch-access-api/cadetcatch_access/main.py')) {
  const api = read('server/cadetcatch-access-api/cadetcatch_access/main.py');
  if (!api.includes('/access/google-play/link')) {
    failures.push('Access API is missing /access/google-play/link');
  }
}

if (failures.length > 0) {
  console.error('CadetCatch Google Play gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('CadetCatch Google Play gate passed.');
