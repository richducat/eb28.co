#!/usr/bin/env node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { getSocialAccountArchitectureError } from './lib/eb28-social-account-policy.mjs';
import { buildFeatureCampaignLibrary } from './lib/eb28-social-campaigns.mjs';
import { renderSocialAssetSet } from './lib/eb28-social-visuals.mjs';

const ROOT = process.cwd();
const FEATURE_FILE = path.join(ROOT, 'content', 'eb28', 'social-features.json');
const ARCHITECTURE_FILE = path.join(ROOT, 'content', 'eb28', 'social-account-architecture.json');

function check(ok, message, details = {}) {
  return { ok: Boolean(ok), message, details };
}

function duplicateValues(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value);
}

function campaignCopyPasses(campaign) {
  const posts = campaign.posts || {};
  const copy = ['facebook', 'instagram', 'linkedin', 'x', 'shortFormVideo', 'pinnedProfileIntro']
    .map((channel) => posts[channel]?.caption || '')
    .filter(Boolean);
  return (
    posts.facebook?.caption?.length >= 500 &&
    posts.instagram?.caption?.length >= 600 &&
    posts.instagram?.caption?.length <= 2200 &&
    (posts.instagram.caption.match(/#[A-Za-z0-9_]+/g) || []).length >= 4 &&
    posts.linkedin?.caption?.length >= 500 &&
    posts.x?.caption?.length > 70 &&
    posts.x?.caption?.length <= 280 &&
    posts.shortFormVideo?.beats?.length === 6 &&
    posts.shortFormVideo?.onScreenText?.length >= 5 &&
    Object.values(posts).every((post) => post.status === 'draft_only') &&
    new Set(copy).size === copy.length
  );
}

async function main() {
  const [catalog, architecture, homepageSource] = await Promise.all([
    fs.readFile(FEATURE_FILE, 'utf8').then(JSON.parse),
    fs.readFile(ARCHITECTURE_FILE, 'utf8').then(JSON.parse),
    fs.readFile(path.join(ROOT, 'src', 'App.jsx'), 'utf8'),
  ]);
  const features = catalog.features || [];
  const activeFeatures = features.filter((feature) => feature.status !== 'retired');
  const business = activeFeatures.filter((feature) => feature.lane === 'business-growth');
  const trading = activeFeatures.filter((feature) => feature.lane === 'trading-software');
  const duplicateIds = duplicateValues(features.map((feature) => feature.id));
  const requiredCampaignFields = ['hook', 'summary', 'problem', 'demonstration', 'proof', 'metric', 'objection'];
  const campaignFieldFailures = activeFeatures
    .map((feature) => ({
      id: feature.id,
      missing: requiredCampaignFields.filter((field) => !String(feature.campaign?.[field] || '').trim()),
    }))
    .filter((item) => item.missing.length);
  const library = buildFeatureCampaignLibrary({
    catalog,
    architecture,
    generatedAt: '2099-01-01T00:00:00.000Z',
  });
  const businessCampaign = library.campaigns.find((campaign) => campaign.lane === 'business-growth');
  const tradingCampaign = library.campaigns.find((campaign) => campaign.lane === 'trading-software');
  const businessArchitectureError = getSocialAccountArchitectureError(businessCampaign, architecture);
  const tradingArchitectureError = getSocialAccountArchitectureError(tradingCampaign, architecture);
  const missingLaneArchitectureError = getSocialAccountArchitectureError({}, architecture);
  const checks = [
    check(catalog.version === '2026-07-social-v2', 'Feature catalog uses the current social creative version.'),
    check(!duplicateIds.length, 'Feature catalog IDs are unique.', { duplicateIds }),
    check(business.length >= 7, 'Business-growth lane covers the current EB28 service and product set.', { count: business.length }),
    check(trading.length >= 4, 'Trading-software lane covers Bluechip, Desk OS, the tape, and onboarding.', { count: trading.length }),
    check(
      activeFeatures.every(
        (feature) =>
          feature.id &&
          feature.name &&
          feature.promise &&
          Array.isArray(feature.features) &&
          feature.features.length >= 3 &&
          /^https:\/\/eb28\.co\//.test(feature.cta?.url || ''),
      ),
      'Every feature has a promise, at least three concrete capabilities, and an owned EB28 destination.',
    ),
    check(
      activeFeatures.every((feature) => {
        const url = new URL(feature.cta.url);
        return !url.hash || url.pathname !== '/' || homepageSource.includes(`id="${url.hash.slice(1)}"`);
      }),
      'Every homepage CTA fragment resolves to an element in the deployed static document.',
    ),
    check(!campaignFieldFailures.length, 'Every active feature has a tailored hook, problem, demonstration, proof, metric, and objection.', {
      failures: campaignFieldFailures,
    }),
    check(
      !/guaranteed (?:leads|rankings|returns)|risk-free|passive income|money printer|military-grade/i.test(JSON.stringify(catalog)),
      'Feature catalog avoids unsupported guarantees and hype claims.',
    ),
    check(
      library.campaigns.length === activeFeatures.length &&
        library.summary.businessGrowth === business.length &&
        library.summary.tradingSoftware === trading.length,
      'Campaign library covers every active feature in both audience lanes.',
      { summary: library.summary },
    ),
    check(
      library.campaigns.every(campaignCopyPasses),
      'Every feature produces distinct, substantive, platform-ready draft copy and a shootable video brief.',
    ),
    check(
      library.campaigns.every(
        (campaign) =>
          campaign.creativeSystem.subhead.length <= 128 &&
          !/(?:…|\.\.\.)$/.test(campaign.creativeSystem.subhead),
      ),
      'Every cover uses a deliberate complete product summary instead of truncated promise copy.',
    ),
    check(
      architecture.version === '2026-07-account-architecture-v2' &&
        architecture.decision?.status === 'approved' &&
        architecture.decision?.approvedRole === 'business-growth' &&
        architecture.decision?.approvedHandle === '@eb28co' &&
        architecture.publishingPolicy?.status === 'approved' &&
        architecture.publishingPolicy?.externalPublishing === 'authorized' &&
        JSON.stringify(architecture.publishingPolicy?.allowedLanes) === JSON.stringify(['business-growth']) &&
        JSON.stringify(architecture.publishingPolicy?.blockedLanes) === JSON.stringify(['trading-software']) &&
        businessArchitectureError === null,
      'Account architecture approves @eb28co only for the business-growth lane.',
      { businessArchitectureError },
    ),
    check(
      /trading-software lane is not approved/i.test(tradingArchitectureError || '') &&
        /does not declare a business-growth or trading-software lane/i.test(missingLaneArchitectureError || ''),
      'Account architecture still fails closed for trading packages and packages without a declared lane.',
      { tradingArchitectureError, missingLaneArchitectureError },
    ),
  ];

  const engine = spawnSync(
    process.execPath,
    ['scripts/eb28-content-engine.mjs', '--date', '2099-01-05', '--slot', 'am'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 },
  );
  let engineResult = null;
  try {
    engineResult = JSON.parse(engine.stdout || '{}');
  } catch {
    engineResult = null;
  }
  checks.push(
    check(
      engine.status === 0 &&
        engineResult?.status === 'dry_run' &&
        engineResult?.quality?.social?.ok === true &&
        engineResult?.quality?.social?.score === 100 &&
        engineResult?.quality?.social?.creativeVersion === catalog.version &&
        Boolean(engineResult?.quality?.social?.featureId),
      'Content-engine dry run produces a 100/100 feature-led business-growth social package.',
      { status: engine.status, stderr: engine.stderr, result: engineResult },
    ),
  );

  const publisherHelp = spawnSync(process.execPath, ['scripts/publish-eb28-buffer.mjs', '--help'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  checks.push(
    check(
      publisherHelp.status === 0 && /--verify/.test(publisherHelp.stdout) && /read-only/i.test(publisherHelp.stdout),
      'Buffer publisher exposes a documented read-only connection verification mode.',
      { status: publisherHelp.status, stderr: publisherHelp.stderr },
    ),
  );

  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'eb28-social-visual-'));
  try {
    const proofFixturePath = path.join(tempRoot, 'proof-fixture.jpg');
    await sharp({
      create: { width: 1440, height: 1000, channels: 3, background: '#0f172a' },
    })
      .jpeg({ quality: 90 })
      .toFile(proofFixturePath);
    const assetSets = [];
    for (const [index, campaign] of library.campaigns.entries()) {
      assetSets.push(
        await renderSocialAssetSet({
          creative: campaign.creativeSystem,
          rootDir: tempRoot,
          outputDir: path.join(tempRoot, 'assets'),
          fileBase: campaign.featureId,
          proofImagePath: index === 0 ? proofFixturePath : '',
        }),
      );
    }
    const records = assetSets.flatMap((assetSet) => [
      ...assetSet.instagramCarousel,
      assetSet.vertical,
      assetSet.landscape,
    ]);
    const metadata = await Promise.all(
      records.map(async (record) => ({
        record,
        metadata: await sharp(path.join(tempRoot, record.localPath)).metadata(),
      })),
    );
    checks.push(
      check(
        assetSets.length === activeFeatures.length &&
          assetSets.every(
            (assetSet) =>
              assetSet.instagramCarousel.length === 4 &&
              assetSet.vertical?.width === 1080 &&
              assetSet.vertical?.height === 1920 &&
              assetSet.landscape?.width === 1200 &&
              assetSet.landscape?.height === 675,
          ),
        'Every active feature renders a four-slide 4:5 carousel plus 9:16 and 16:9 derivatives.',
        { campaigns: assetSets.length, assets: records.length },
      ),
    );
    checks.push(
      check(
        assetSets[0]?.proofSource?.type === 'public-page-capture' &&
          /real EB28 product surface/i.test(assetSets[0]?.landscape?.alt || '') &&
          assetSets.slice(1).every((assetSet) => assetSet.proofSource === null),
        'Renderer uses a real product capture when provided and keeps a deterministic fallback when it is absent.',
      ),
    );
    checks.push(
      check(
        metadata.every(
          ({ record, metadata: info }) =>
            info.format === 'jpeg' &&
            info.hasAlpha === false &&
            info.width === record.width &&
            info.height === record.height,
        ),
        'All feature-library assets are opaque JPEGs with their declared dimensions.',
        { checked: metadata.length },
      ),
    );
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }

  const failures = checks.filter((item) => !item.ok);
  for (const item of checks) {
    console.log(`${item.ok ? '[OK]' : '[FAIL]'} ${item.message}`);
    if (!item.ok && Object.keys(item.details || {}).length) console.log(JSON.stringify(item.details, null, 2));
  }
  if (failures.length) {
    console.error(`EB28 social validation failed: ${failures.length} issue(s)`);
    process.exit(1);
  }
  console.log(`EB28 social validation passed: ${checks.length} checks`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
