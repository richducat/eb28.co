#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const expectedEmail = 'social@eb28.co';
const canonicalUrl = 'https://eb28.co/free-website-build/';

const checks = [];

async function read(relativePath) {
  return fs.readFile(path.join(repoRoot, relativePath), 'utf8');
}

function assertCheck(name, passed, detail = '') {
  checks.push({ name, passed, detail });
}

function contains(text, needle) {
  return text.includes(needle);
}

const [
  leadCaptureSource,
  pageSource,
  mainSource,
  siteMetaSource,
  docsPage,
  docsAliasPage,
  sitemap,
] = await Promise.all([
  read('src/leadCapture.js'),
  read('src/FreeWebsiteBuildPage.jsx'),
  read('src/main.jsx'),
  read('src/siteMeta.js'),
  read('docs/free-website-build/index.html'),
  read('docs/free-local-business-website/index.html'),
  read('docs/sitemap.xml'),
]);

assertCheck(
  'leadCapture routes to social mailbox',
  contains(leadCaptureSource, `LEAD_CAPTURE_EMAIL = '${expectedEmail}'`),
  'src/leadCapture.js',
);
assertCheck(
  'page references social mailbox',
  contains(pageSource, `const CLAIM_EMAIL = '${expectedEmail}'`),
  'src/FreeWebsiteBuildPage.jsx',
);
assertCheck(
  'page sends public offer service need',
  contains(pageSource, 'free-website-build-growth-hosting-public-offer'),
  'src/FreeWebsiteBuildPage.jsx',
);
assertCheck(
  'page requests a concrete review window',
  contains(pageSource, 'bestTime') && contains(pageSource, '10-minute review window'),
  'src/FreeWebsiteBuildPage.jsx',
);
assertCheck(
  'page offers preset Eastern review slots',
  contains(pageSource, "REVIEW_TIMEZONE = 'America/New_York'") &&
    contains(pageSource, 'getReviewWindowOptions') &&
    contains(pageSource, 'Fast 10-minute review windows') &&
    contains(pageSource, 'backupTime'),
  'src/FreeWebsiteBuildPage.jsx',
);
assertCheck(
  'route bootstrap handles canonical path',
  contains(mainSource, "pathname === '/free-website-build'"),
  'src/main.jsx',
);
assertCheck(
  'route bootstrap handles alias path',
  contains(mainSource, "pathname === '/free-local-business-website'"),
  'src/main.jsx',
);
assertCheck(
  'SEO metadata includes sitemap route',
  contains(siteMetaSource, "path: '/free-website-build/'") &&
    contains(siteMetaSource, "includeInSitemap: true"),
  'src/siteMeta.js',
);
assertCheck(
  'canonical page is indexable',
  contains(docsPage, '<meta name="robots" content="index, follow') &&
    contains(docsPage, `<link rel="canonical" href="${canonicalUrl}" />`),
  'docs/free-website-build/index.html',
);
assertCheck(
  'alias page canonicalizes to main offer',
  contains(docsAliasPage, `<link rel="canonical" href="${canonicalUrl}" />`),
  'docs/free-local-business-website/index.html',
);
assertCheck(
  'sitemap includes canonical offer',
  contains(sitemap, `<loc>${canonicalUrl}</loc>`),
  'docs/sitemap.xml',
);

const assetDir = path.join(repoRoot, 'docs', 'assets');
const assetNames = await fs.readdir(assetDir);
const pageAssets = assetNames.filter((name) => /^FreeWebsiteBuildPage-.*\.js$/.test(name));
let pageAssetText = '';

for (const assetName of pageAssets) {
  pageAssetText += await fs.readFile(path.join(assetDir, assetName), 'utf8');
}

assertCheck(
  'built page chunk contains mailbox',
  contains(pageAssetText, expectedEmail),
  pageAssets.join(', ') || 'no page chunk found',
);
assertCheck(
  'built page chunk contains lead source',
  contains(pageAssetText, 'https://eb28.co/free-website-build/') &&
    contains(pageAssetText, 'free-website-build-growth-hosting-public-offer'),
  pageAssets.join(', ') || 'no page chunk found',
);

const failures = checks.filter((check) => !check.passed);
const report = {
  passed: failures.length === 0,
  checks: checks.length,
  failures,
};

console.log(JSON.stringify(report, null, 2));

if (failures.length > 0) {
  process.exit(1);
}
