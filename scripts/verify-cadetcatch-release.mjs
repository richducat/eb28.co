#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const APP = {
  name: 'CadetCatch',
  slug: 'cadetcatch',
  bundleId: 'co.eb28.cadetcatch',
  ascAppId: '6769565852',
};

const STALE_PATTERNS = [
  /\bBuild:\s*(13|57)\b/i,
  /\bVersion:\s*1\.0\.0\b/i,
  /\bbuild\s*(13|57)\b/i,
  /\bTo test build\s*(13|57)\b/i,
  /\bRestores the build\s*(13|57)\b/i,
  /"buildNumber"\s*:\s*"(13|57)"/i,
];

const args = parseArgs(process.argv.slice(2));
const mode = args.mode || 'release-surface';
const allowDirty = Boolean(args['allow-dirty']);

const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
}).trim();
const rel = (...parts) => path.join(repoRoot, ...parts);

const failures = [];
const warnings = [];

const paths = {
  releaseJson: rel('app-store/releases/cadetcatch/app-store-release.json'),
  manifest: rel('app-store/releases/cadetcatch/release-manifest.json'),
  ledger: rel('app-store/releases/cadetcatch/build-ledger.json'),
  metadata: rel('app-store/releases/cadetcatch/app-store-metadata.md'),
  reviewNotes: rel('app-store/releases/cadetcatch/review-notes.md'),
  projectYml: rel('ios/CadetCatch/project.yml'),
  pbxproj: rel('ios/CadetCatch/CadetCatch.xcodeproj/project.pbxproj'),
  appSource: rel('ios/CadetCatch/CadetCatch/CadetCatchApp.swift'),
  appInfo: rel('ios/CadetCatch/CadetCatch/Info.plist'),
  googleServiceInfo: rel('ios/CadetCatch/CadetCatch/GoogleService-Info.plist'),
  packageResolved: rel('ios/CadetCatch/CadetCatch.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved'),
};

const releaseJson = readJson(paths.releaseJson);
const manifest = readJson(paths.manifest);
const ledger = readJson(paths.ledger);
const metadata = read(paths.metadata);
const reviewNotes = read(paths.reviewNotes);
const projectYml = read(paths.projectYml);
const pbxproj = read(paths.pbxproj);

const releaseVersion = String(releaseJson.version?.marketingVersion || '');
const releaseBuild = Number(releaseJson.version?.buildNumber);
const manifestVersion = String(manifest.marketingVersion || '');
const manifestBuild = Number(manifest.buildNumber);
const manifestReleaseObject = manifest.releaseJsonVersionObject || {};

checkCleanTree();
checkIdentity();
checkVersionBuildConsistency();
checkActiveText();
checkScreenshots();
checkBuildResources();
checkAnalytics();
checkLedger();
checkModeSpecificRules();

if (failures.length > 0) {
  console.error('\nCadetCatch release gate failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  if (warnings.length > 0) {
    console.error('\nWarnings:');
    for (const warning of warnings) console.error(`- ${warning}`);
  }
  process.exit(1);
}

console.log(`CadetCatch release gate passed (${mode}).`);
console.log(`Version/build: ${releaseVersion} (${releaseBuild})`);
console.log(`Commit: ${run('git', ['rev-parse', 'HEAD']).trim()}`);
if (warnings.length > 0) {
  console.log('\nWarnings:');
  for (const warning of warnings) console.log(`- ${warning}`);
}

function checkCleanTree() {
  const status = run('git', ['status', '--porcelain']).trim();
  if (status && !allowDirty) {
    failures.push('Git worktree is dirty. Commit or stash changes before release-sensitive checks.');
  }
}

function checkIdentity() {
  expectEqual(releaseJson.app?.name, APP.name, 'app-store-release app.name');
  expectEqual(releaseJson.app?.bundleId, APP.bundleId, 'app-store-release app.bundleId');
  expectEqual(manifest.appName, APP.name, 'release-manifest appName');
  expectEqual(manifest.bundleId, APP.bundleId, 'release-manifest bundleId');
  expectEqual(manifest.appStoreConnectAppId, APP.ascAppId, 'release-manifest ASC app id');
  expectEqual(ledger.appName, APP.name, 'build-ledger appName');
  expectEqual(ledger.bundleId, APP.bundleId, 'build-ledger bundleId');
  expectEqual(ledger.appStoreConnectAppId, APP.ascAppId, 'build-ledger ASC app id');
}

function checkVersionBuildConsistency() {
  if (!Number.isInteger(releaseBuild)) failures.push('app-store-release buildNumber must be an integer string.');
  if (!Number.isInteger(manifestBuild)) failures.push('release-manifest buildNumber must be an integer string.');

  expectEqual(releaseVersion, manifestVersion, 'release JSON and manifest marketingVersion');
  expectEqual(releaseBuild, manifestBuild, 'release JSON and manifest buildNumber');
  expectEqual(manifestReleaseObject.marketingVersion, releaseVersion, 'manifest releaseJsonVersionObject marketingVersion');
  expectEqual(Number(manifestReleaseObject.buildNumber), releaseBuild, 'manifest releaseJsonVersionObject buildNumber');

  expectEqual(releaseJson.version?.releaseType, 'MANUAL', 'app-store-release releaseType');
  expectEqual(manifestReleaseObject.releaseType, 'MANUAL', 'release-manifest releaseJsonVersionObject releaseType');

  const projectVersion = matchOne(projectYml, /MARKETING_VERSION:\s*["']?([^"'\n]+)["']?/, 'project.yml MARKETING_VERSION');
  const projectBuild = Number(matchOne(projectYml, /CURRENT_PROJECT_VERSION:\s*["']?([^"'\n]+)["']?/, 'project.yml CURRENT_PROJECT_VERSION'));
  expectEqual(projectVersion, releaseVersion, 'project.yml MARKETING_VERSION');
  expectEqual(projectBuild, releaseBuild, 'project.yml CURRENT_PROJECT_VERSION');

  const pbxVersions = uniqueMatches(pbxproj, /MARKETING_VERSION = ([^;]+);/g);
  const pbxBuilds = uniqueMatches(pbxproj, /CURRENT_PROJECT_VERSION = ([^;]+);/g).map(Number);
  expectArrayOnly(pbxVersions, releaseVersion, 'pbxproj MARKETING_VERSION');
  expectArrayOnly(pbxBuilds, releaseBuild, 'pbxproj CURRENT_PROJECT_VERSION');

  if (!projectYml.includes(`PRODUCT_BUNDLE_IDENTIFIER: ${APP.bundleId}`)) {
    failures.push(`project.yml does not contain PRODUCT_BUNDLE_IDENTIFIER: ${APP.bundleId}`);
  }
  if (!pbxproj.includes(`PRODUCT_BUNDLE_IDENTIFIER = ${APP.bundleId};`)) {
    failures.push(`pbxproj does not contain PRODUCT_BUNDLE_IDENTIFIER = ${APP.bundleId};`);
  }
}

function checkActiveText() {
  const activeFiles = [
    ['app-store-release.json', JSON.stringify(releaseJson, null, 2)],
    ['app-store-metadata.md', metadata],
    ['review-notes.md', reviewNotes],
    ['project.yml', projectYml],
    ['project.pbxproj', pbxproj],
  ];

  for (const [label, content] of activeFiles) {
    for (const pattern of STALE_PATTERNS) {
      if (pattern.test(content)) failures.push(`${label} contains stale release reference matching ${pattern}`);
    }
  }

  if (!metadata.includes(`- Version: ${releaseVersion}`)) failures.push('metadata does not show the active release version.');
  if (!metadata.includes(`- Build: ${releaseBuild}`)) failures.push('metadata does not show the active release build.');
  if (!reviewNotes.includes(`- Version: ${releaseVersion}`)) failures.push('review notes do not show the active release version.');
  if (!reviewNotes.includes(`- Build: ${releaseBuild}`)) failures.push('review notes do not show the active release build.');
  if (!releaseJson.version?.whatsNew?.includes(`build ${releaseBuild}`)) {
    failures.push('app-store-release whatsNew must mention the active build number.');
  }
}

function checkScreenshots() {
  const screenshots = releaseJson.assets?.iphoneScreenshots || [];
  if (!Array.isArray(screenshots) || screenshots.length === 0) failures.push('No iPhone screenshots are listed.');
  for (const screenshot of screenshots) {
    const fullPath = rel('app-store/releases/cadetcatch', screenshot);
    if (!existsSync(fullPath)) failures.push(`Listed screenshot does not exist: ${screenshot}`);
  }
  if (releaseJson.assets?.appPreviewVideos?.length) {
    failures.push('App preview videos are listed; verify this intentionally before App Store mutation.');
  }
}

function checkBuildResources() {
  const requiredResources = [
    'ios/CadetCatch/Shared/ScanActivityAttributes.swift',
    'ios/CadetCatch/CadetCatch/Fonts/Montserrat.ttf',
    'ios/CadetCatch/CadetCatch/Fonts/OFL.txt',
    'ios/CadetCatch/CadetCatch/GoogleService-Info.plist',
    'ios/CadetCatch/CadetCatch/LaunchScreen.storyboard',
    'ios/CadetCatch/drive_bot.html',
  ];
  for (const resource of requiredResources) {
    if (!existsSync(rel(resource))) failures.push(`Required CadetCatch build resource is missing: ${resource}`);
  }

  const attributesPath = rel('ios/CadetCatch/Shared/ScanActivityAttributes.swift');
  if (existsSync(attributesPath)) {
    const attributes = read(attributesPath);
    for (const token of ['ActivityAttributes', 'ContentState', 'progressString', 'isScanning', 'cadetName']) {
      if (!attributes.includes(token)) failures.push(`ScanActivityAttributes.swift is missing expected token: ${token}`);
    }
  }
}

function checkAnalytics() {
  const appSource = read(paths.appSource);
  const analyticsStart = appSource.indexOf('enum CadetCatchAnalyticsEvent');
  const analyticsEnd = appSource.indexOf('@main');
  const analyticsSource = analyticsStart >= 0 && analyticsEnd > analyticsStart
    ? appSource.slice(analyticsStart, analyticsEnd)
    : '';
  const appInfo = readPlist(paths.appInfo);
  const googleServiceInfo = readPlist(paths.googleServiceInfo);
  const packageResolved = read(paths.packageResolved);

  const requiredSourceTokens = [
    'import FirebaseAnalytics',
    'import FirebaseCore',
    'FirebaseApp.configure(options: options)',
    'case rosterCreated = "roster_created"',
    'case photoCheckStarted = "photo_check_started"',
    'case photoCheckCompleted = "photo_check_completed"',
    'case paywallView = "paywall_view"',
    'Analytics.logTransaction(transaction)',
  ];
  for (const token of requiredSourceTokens) {
    if (!appSource.includes(token)) failures.push(`CadetCatch analytics source is missing required token: ${token}`);
  }

  if (!projectYml.includes('product: FirebaseAnalyticsCore')) {
    failures.push('project.yml must use FirebaseAnalyticsCore for privacy-preserving app measurement without identity support.');
  }
  if (!packageResolved.includes('"identity" : "firebase-ios-sdk"')) {
    failures.push('Package.resolved does not contain the Firebase Apple SDK.');
  }
  if (!packageResolved.includes('"identity" : "google-ads-on-device-conversion-ios-sdk"')) {
    failures.push('Package.resolved does not contain the Google Ads on-device conversion SDK.');
  }

  const requiredFirebaseKeys = ['GOOGLE_APP_ID', 'PROJECT_ID', 'GCM_SENDER_ID', 'API_KEY', 'BUNDLE_ID'];
  for (const key of requiredFirebaseKeys) {
    if (typeof googleServiceInfo[key] !== 'string' || googleServiceInfo[key].trim() === '') {
      failures.push(`GoogleService-Info.plist is missing a non-empty ${key} value from a Firebase-generated iOS app configuration.`);
    }
  }

  if (appInfo.GOOGLE_ANALYTICS_DEFAULT_ALLOW_AD_PERSONALIZATION_SIGNALS !== false) {
    failures.push('Info.plist must disable Firebase Analytics ad-personalization signals by default.');
  }

  const forbiddenAnalyticsTokens = [
    'Analytics.setUserID',
    'cadet_name',
    'cadet_email',
    'image_url',
    'photo_url',
    'face_embedding',
    'allow_ad_personalization_signals',
  ];
  for (const token of forbiddenAnalyticsTokens) {
    if (analyticsSource.includes(token)) failures.push(`CadetCatch analytics source contains forbidden identifier token: ${token}`);
  }

  if (releaseJson.privacy?.trackingUsed !== false) {
    failures.push('App Store release privacy state must keep trackingUsed false unless ATT and a separate privacy review are completed.');
  }
  if (releaseJson.privacy?.thirdPartySdkPrivacyReviewed !== true) {
    failures.push('Firebase Analytics privacy manifests and App Privacy disclosures must be reviewed before release.');
  }
  if (releaseJson.privacy?.privacyManifestReviewed !== true) {
    failures.push('App and third-party privacy manifests must be reviewed before release.');
  }
  if (releaseJson.privacy?.appPrivacyAnswersCurrent !== true) {
    failures.push('App Store Connect App Privacy answers must be updated for Firebase Analytics before release.');
  }
}

function checkLedger() {
  const activeReviewBuild = Number(ledger.activeReview?.buildNumber);
  if (activeReviewBuild !== Number(manifest.appStoreConnectState?.appStoreState === 'WAITING_FOR_REVIEW' ? manifestBuild : activeReviewBuild)) {
    warnings.push('Build ledger activeReview differs from manifest current build.');
  }
  if (!Array.isArray(ledger.blockedBuildNumbers)) failures.push('Build ledger must define blockedBuildNumbers.');
  if (Number(ledger.highestKnownUploadedBuild) < Number(ledger.highestKnownAppStoreSubmittedBuild)) {
    failures.push('Build ledger highestKnownUploadedBuild is lower than highestKnownAppStoreSubmittedBuild.');
  }
}

function checkModeSpecificRules() {
  if (mode === 'release-surface') return;
  if (mode !== 'upload') failures.push(`Unknown mode: ${mode}`);

  const minNextBuild = Number(ledger.nextUploadMustUseBuildNumberGreaterThan ?? ledger.highestKnownUploadedBuild);
  if (!(releaseBuild > minNextBuild)) {
    failures.push(`Upload mode requires buildNumber greater than ${minNextBuild}; current build is ${releaseBuild}.`);
  }

  const approvalFile = args['approval-file'];
  if (!approvalFile) {
    failures.push('Upload mode requires --approval-file pointing to a matching EB28 vault approval record.');
    return;
  }

  const approvalPath = path.isAbsolute(approvalFile) ? approvalFile : path.resolve(process.cwd(), approvalFile);
  if (!existsSync(approvalPath)) {
    failures.push(`Approval file does not exist: ${approvalPath}`);
    return;
  }

  const approval = read(approvalPath);
  const approvalChecks = [
    [/status:\s*approved/i, 'approval status must be approved'],
    [/(app_slug:\s*cadetcatch|app_name:\s*CadetCatch)/i, 'approval must identify CadetCatch'],
    [/action:\s*upload_build/i, 'approval action must be upload_build'],
    [new RegExp(`version:\\s*["']?${escapeRegExp(releaseVersion)}["']?`, 'i'), `approval version must be ${releaseVersion}`],
    [new RegExp(`build:\\s*["']?${releaseBuild}["']?`, 'i'), `approval build must be ${releaseBuild}`],
  ];
  for (const [pattern, message] of approvalChecks) {
    if (!pattern.test(approval)) failures.push(message);
  }
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

function run(command, commandArgs) {
  return execFileSync(command, commandArgs, {
    cwd: repoRoot || process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function read(filePath) {
  if (!existsSync(filePath)) {
    failures.push(`Missing required file: ${path.relative(repoRoot, filePath)}`);
    return '';
  }
  return readFileSync(filePath, 'utf8');
}

function readJson(filePath) {
  try {
    return JSON.parse(read(filePath));
  } catch (error) {
    failures.push(`Invalid JSON in ${path.relative(repoRoot, filePath)}: ${error.message}`);
    return {};
  }
}

function readPlist(filePath) {
  if (!existsSync(filePath)) {
    failures.push(`Missing required file: ${path.relative(repoRoot, filePath)}`);
    return {};
  }
  try {
    return JSON.parse(execFileSync('/usr/bin/plutil', ['-convert', 'json', '-o', '-', filePath], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }));
  } catch (error) {
    failures.push(`Invalid plist in ${path.relative(repoRoot, filePath)}: ${error.message}`);
    return {};
  }
}

function expectEqual(actual, expected, label) {
  if (actual !== expected) failures.push(`${label} mismatch: expected ${expected}, got ${actual}`);
}

function matchOne(content, pattern, label) {
  const match = content.match(pattern);
  if (!match) {
    failures.push(`Could not read ${label}.`);
    return '';
  }
  return match[1].trim();
}

function uniqueMatches(content, pattern) {
  return [...new Set([...content.matchAll(pattern)].map((match) => match[1].trim()))];
}

function expectArrayOnly(values, expected, label) {
  if (values.length !== 1 || values[0] !== expected) {
    failures.push(`${label} mismatch: expected only ${expected}, got [${values.join(', ')}]`);
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
