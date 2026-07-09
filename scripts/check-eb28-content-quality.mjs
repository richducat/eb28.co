#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import {
  CONTENT_QUALITY_VERSION,
  analyzeArticleQuality,
  analyzeSocialPackage,
  normalizeKeyword,
} from './lib/eb28-content-quality.mjs';

const ROOT = process.cwd();
const ARTICLES_FILE = path.join(ROOT, 'content', 'eb28', 'articles.json');
const STATE_FILE = path.join(ROOT, 'content', 'eb28', 'content-state.json');
const SITEMAP_FILE = path.join(ROOT, 'docs', 'sitemap.xml');

function check(ok, message, details = {}) {
  return { ok: Boolean(ok), message, details };
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function duplicates(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value);
}

function sitemapLastmod(sitemap, url) {
  const blocks = sitemap.match(/<url>[\s\S]*?<\/url>/g) || [];
  const block = blocks.find((entry) => entry.includes(`<loc>${url}</loc>`));
  return block?.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1] || '';
}

function latestSocialPath(state) {
  const reportPath = state.runs?.[0]?.reportPath;
  if (!reportPath) return null;
  return path.join(ROOT, 'output', 'eb28-social', path.basename(reportPath));
}

async function main() {
  const [articles, state, sitemap] = await Promise.all([
    readJson(ARTICLES_FILE),
    readJson(STATE_FILE),
    fs.readFile(SITEMAP_FILE, 'utf8'),
  ]);
  const checks = [];

  const duplicateSlugs = duplicates(articles.map((article) => article.slug));
  const duplicateKeywords = duplicates(articles.map((article) => normalizeKeyword(article.primaryKeyword)));
  checks.push(check(!duplicateSlugs.length, 'Article slugs are unique.', { duplicateSlugs }));
  checks.push(check(!duplicateKeywords.length, 'Primary keywords map to one canonical article.', { duplicateKeywords }));

  const serializedArticles = JSON.stringify(articles);
  checks.push(
    check(
      !/social@eb28\.co|tel:|\/(?:deskos|limitless)\//i.test(serializedArticles),
      'Article source contains no blocked contact or retired-client paths.',
    ),
  );

  const versionedArticles = articles.filter((article) => Number(article.contentVersion || 0) >= CONTENT_QUALITY_VERSION);
  const versionedFailures = versionedArticles.flatMap((article) => {
    const quality = analyzeArticleQuality(article);
    return quality.ok ? [] : [{ slug: article.slug, score: quality.score, failures: quality.failures }];
  });
  checks.push(
    check(!versionedFailures.length, `Content v${CONTENT_QUALITY_VERSION} articles pass the substantive quality gate.`, {
      checked: versionedArticles.length,
      failures: versionedFailures,
    }),
  );

  const latestReportPath = latestSocialPath(state);
  let latestSocial = null;
  if (latestReportPath) {
    try {
      latestSocial = await readJson(latestReportPath);
    } catch {
      latestSocial = null;
    }
  }
  const latestSocialQuality = latestSocial ? analyzeSocialPackage(latestSocial) : null;
  checks.push(
    check(
      Boolean(latestSocialQuality?.ok),
      'Latest owned-social package is canonical, complete, safe, and draft-only.',
      latestSocialQuality ? { score: latestSocialQuality.score, failures: latestSocialQuality.failures } : { latestReportPath },
    ),
  );

  const newestModified = [...articles]
    .map((article) => article.dateModified || article.datePublished || '')
    .sort()
    .at(-1);
  checks.push(
    check(
      sitemapLastmod(sitemap, 'https://eb28.co/blog/') === newestModified,
      'Blog sitemap lastmod matches the newest canonical article modification date.',
      {
        expected: newestModified,
        actual: sitemapLastmod(sitemap, 'https://eb28.co/blog/'),
      },
    ),
  );
  checks.push(
    check(
      !/https:\/\/eb28\.co\/(?:deskos|limitless)\//i.test(sitemap),
      'Sitemap excludes retired client paths.',
    ),
  );

  const regressionRunId = '2099-01-02-am';
  const dryRun = spawnSync(
    process.execPath,
    ['scripts/eb28-content-engine.mjs', '--date', '2099-01-02', '--slot', 'am'],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
  );
  let dryRunResult = null;
  try {
    dryRunResult = JSON.parse(dryRun.stdout || '{}');
  } catch {
    dryRunResult = null;
  }
  checks.push(
    check(
      dryRun.status === 0 &&
        dryRunResult?.status === 'dry_run' &&
        ['create', 'refresh'].includes(dryRunResult?.operation) &&
        dryRunResult?.quality?.article?.ok === true &&
        dryRunResult?.quality?.social?.ok === true &&
        !String(dryRunResult?.article?.slug || '').includes(regressionRunId),
      'Dry-run regression check returns a canonical, quality-gated article without a dated fallback slug.',
      {
        status: dryRun.status,
        stderr: dryRun.stderr,
        result: dryRunResult,
      },
    ),
  );

  const failures = checks.filter((item) => !item.ok);
  for (const item of checks) {
    console.log(`${item.ok ? '[OK]' : '[FAIL]'} ${item.message}`);
    if (!item.ok && Object.keys(item.details || {}).length) console.log(JSON.stringify(item.details, null, 2));
  }
  if (failures.length) {
    console.error(`EB28 content quality validation failed: ${failures.length} issue(s)`);
    process.exit(1);
  }
  console.log(`EB28 content quality validation passed: ${checks.length} checks`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
