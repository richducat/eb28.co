#!/usr/bin/env node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import sharp from 'sharp';
import { renderSocialAssetSet } from './lib/eb28-social-visuals.mjs';

const ROOT = process.cwd();
const FEATURE_FILE = path.join(ROOT, 'content', 'eb28', 'social-features.json');

function check(ok, message, details = {}) {
  return { ok: Boolean(ok), message, details };
}

function duplicateValues(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value);
}

function fixtureCreative(feature, version) {
  return {
    version,
    pillar: 'Lead Automation',
    objective: 'qualified_attention',
    eyebrow: 'QA FIELD NOTE',
    headline: 'Good automation shortens the wait without hiding the human handoff.',
    subhead: 'Find one broken transition, build one useful fix, and measure what happened next.',
    theme: feature.visualTheme,
    feature,
    steps: [
      { label: 'Find the constraint', value: 'Trace the first five minutes after a qualified enquiry.' },
      { label: 'Build the first fix', value: 'Confirm, route, and preserve the buyer context before adding another tool.' },
      { label: 'Measure the handoff', value: 'Track time to a useful response and failed or duplicate messages.' },
    ],
    metric: {
      label: 'What to measure',
      value: 'Qualified conversations created without increasing complaints, opt-outs, or failed handoffs.',
    },
    cta: feature.cta,
    disclaimer: 'Keep pricing, exceptions, and consequential decisions with an accountable person.',
  };
}

async function main() {
  const catalog = JSON.parse(await fs.readFile(FEATURE_FILE, 'utf8'));
  const features = catalog.features || [];
  const business = features.filter((feature) => feature.lane === 'business-growth' && feature.status !== 'retired');
  const trading = features.filter((feature) => feature.lane === 'trading-software' && feature.status !== 'retired');
  const duplicateIds = duplicateValues(features.map((feature) => feature.id));
  const checks = [
    check(catalog.version === '2026-07-social-v2', 'Feature catalog uses the current social creative version.'),
    check(!duplicateIds.length, 'Feature catalog IDs are unique.', { duplicateIds }),
    check(business.length >= 7, 'Business-growth lane covers the current EB28 service and product set.', { count: business.length }),
    check(trading.length >= 4, 'Trading-software lane covers Bluechip, Desk OS, the tape, and onboarding.', { count: trading.length }),
    check(
      features.every(
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
      !/guaranteed (?:leads|rankings|returns)|risk-free|passive income|money printer|military-grade/i.test(JSON.stringify(catalog)),
      'Feature catalog avoids unsupported guarantees and hype claims.',
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
      'Content-engine dry run produces a 100/100 feature-led social package.',
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
    const assetSet = await renderSocialAssetSet({
      creative: fixtureCreative(business[0], catalog.version),
      rootDir: tempRoot,
      outputDir: path.join(tempRoot, 'assets'),
      fileBase: 'qa-fixture',
    });
    const records = [
      ...assetSet.instagramCarousel,
      assetSet.vertical,
      assetSet.landscape,
    ];
    const metadata = await Promise.all(
      records.map(async (record) => ({
        record,
        metadata: await sharp(path.join(tempRoot, record.localPath)).metadata(),
      })),
    );
    checks.push(
      check(
        assetSet.instagramCarousel.length === 4 &&
          assetSet.vertical?.width === 1080 &&
          assetSet.vertical?.height === 1920 &&
          assetSet.landscape?.width === 1200 &&
          assetSet.landscape?.height === 675,
        'Renderer creates a four-slide 4:5 carousel plus 9:16 and 16:9 derivatives.',
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
        'Every rendered asset is an opaque JPEG with the declared dimensions.',
        { metadata: metadata.map(({ record, metadata: info }) => ({ file: record.localPath, format: info.format, width: info.width, height: info.height, hasAlpha: info.hasAlpha })) },
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
