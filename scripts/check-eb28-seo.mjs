#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const DOCS_DIR = path.join(ROOT, 'docs');
const ARTICLES_FILE = path.join(ROOT, 'content', 'eb28', 'articles.json');
const SITE_ORIGIN = 'https://eb28.co';

function fail(message, details = {}) {
  return { ok: false, message, details };
}

function pass(message, details = {}) {
  return { ok: true, message, details };
}

async function readText(filePath) {
  return fs.readFile(filePath, 'utf8');
}

async function readJson(filePath) {
  return JSON.parse(await readText(filePath));
}

function extract(html, regex) {
  const match = html.match(regex);
  return match ? match[1].trim() : '';
}

function parseJsonLd(html) {
  const entries = [];
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html))) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed)) entries.push(...parsed);
      else entries.push(parsed);
    } catch {
      entries.push({ '@type': 'INVALID_JSON_LD' });
    }
  }
  return entries;
}

function hasJsonLdType(entries, type) {
  return entries.some((entry) => {
    const entryType = entry && entry['@type'];
    return Array.isArray(entryType) ? entryType.includes(type) : entryType === type;
  });
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function checkStaticBasics() {
  const checks = [];
  const robots = await readText(path.join(DOCS_DIR, 'robots.txt'));
  const sitemap = await readText(path.join(DOCS_DIR, 'sitemap.xml'));

  checks.push(
    robots.includes(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`)
      ? pass('robots.txt declares the EB28 sitemap')
      : fail('robots.txt is missing the EB28 sitemap declaration'),
  );
  checks.push(
    sitemap.includes(`${SITE_ORIGIN}/blog/`)
      ? pass('sitemap.xml includes /blog/')
      : fail('sitemap.xml is missing /blog/'),
  );
  checks.push(
    (await fileExists(path.join(DOCS_DIR, 'blog', 'index.html')))
      ? pass('/blog/index.html exists')
      : fail('/blog/index.html is missing'),
  );
  checks.push(
    (await fileExists(path.join(DOCS_DIR, 'data', 'eb28-blog-feed.json')))
      ? pass('/data/eb28-blog-feed.json exists')
      : fail('/data/eb28-blog-feed.json is missing'),
  );

  return checks;
}

async function checkBlogIndex() {
  const html = await readText(path.join(DOCS_DIR, 'blog', 'index.html'));
  const jsonLd = parseJsonLd(html);
  const canonical = extract(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  return [
    extract(html, /<title>([\s\S]*?)<\/title>/i) ? pass('/blog has a title') : fail('/blog title is missing'),
    extract(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
      ? pass('/blog has a meta description')
      : fail('/blog meta description is missing'),
    canonical === `${SITE_ORIGIN}/blog/`
      ? pass('/blog canonical is correct')
      : fail('/blog canonical is incorrect', { canonical }),
    hasJsonLdType(jsonLd, 'Blog') ? pass('/blog has Blog JSON-LD') : fail('/blog Blog JSON-LD is missing'),
  ];
}

async function checkArticles() {
  const articles = await readJson(ARTICLES_FILE);
  const sitemap = await readText(path.join(DOCS_DIR, 'sitemap.xml'));
  const checks = [];

  for (const article of articles) {
    const articleUrl = `${SITE_ORIGIN}/blog/${article.slug}/`;
    const articlePath = path.join(DOCS_DIR, 'blog', article.slug, 'index.html');
    const exists = await fileExists(articlePath);
    checks.push(exists ? pass(`${article.slug} page exists`) : fail(`${article.slug} page is missing`));
    checks.push(
      sitemap.includes(articleUrl)
        ? pass(`${article.slug} is in sitemap`)
        : fail(`${article.slug} is missing from sitemap`, { articleUrl }),
    );

    if (!exists) continue;
    const html = await readText(articlePath);
    const title = extract(html, /<title>([\s\S]*?)<\/title>/i);
    const description = extract(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    const canonical = extract(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
    const jsonLd = parseJsonLd(html);
    const h1 = extract(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);

    checks.push(title ? pass(`${article.slug} has a title`) : fail(`${article.slug} title missing`));
    checks.push(
      description && description.length >= 80
        ? pass(`${article.slug} has a useful meta description`)
        : fail(`${article.slug} meta description too short or missing`, { length: description.length }),
    );
    checks.push(
      canonical === articleUrl
        ? pass(`${article.slug} canonical is correct`)
        : fail(`${article.slug} canonical is incorrect`, { canonical, expected: articleUrl }),
    );
    checks.push(h1 ? pass(`${article.slug} has an H1`) : fail(`${article.slug} H1 missing`));
    checks.push(
      hasJsonLdType(jsonLd, 'BlogPosting')
        ? pass(`${article.slug} has BlogPosting JSON-LD`)
        : fail(`${article.slug} BlogPosting JSON-LD missing`),
    );
    checks.push(
      html.includes('/melbournewebstudio/') && html.includes('/reconcile/') && html.includes('/blog/')
        ? pass(`${article.slug} has internal links to core pages`)
        : fail(`${article.slug} is missing core internal links`),
    );
  }

  return checks;
}

async function main() {
  const checks = [
    ...(await checkStaticBasics()),
    ...(await checkBlogIndex()),
    ...(await checkArticles()),
  ];
  const failures = checks.filter((check) => !check.ok);

  for (const check of checks) {
    const prefix = check.ok ? '[OK]' : '[FAIL]';
    console.log(`${prefix} ${check.message}`);
    if (!check.ok && Object.keys(check.details || {}).length) {
      console.log(JSON.stringify(check.details, null, 2));
    }
  }

  if (failures.length) {
    console.error(`EB28 SEO validation failed: ${failures.length} issue(s)`);
    process.exit(1);
  }

  console.log(`EB28 SEO validation passed: ${checks.length} checks`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
