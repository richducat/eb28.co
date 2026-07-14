#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import pilotCampaigns from './data/32940-pilot-campaigns.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteRoot = path.join(repoRoot, process.env.EB28_PREMIUM_CHECK_ROOT || 'docs');
const proposalsRoot = path.join(siteRoot, '32940', 'proposals');
const prospects = JSON.parse(await fs.readFile(path.join(repoRoot, 'scripts', 'data', '32940-premium-prospects.json'), 'utf8'));
const failures = [];
let checkedPages = 0;
let checkedLinks = 0;

function expect(condition, message) {
  if (!condition) failures.push(message);
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function countWords(value = '') {
  return (String(value).match(/[\p{L}\p{N}’'-]+/gu) || []).length;
}

for (const prospect of prospects) {
  expect(prospect.pages?.length === 5, `${prospect.slug}: expected exactly five page definitions`);
  for (const page of prospect.pages || []) {
    const pageDir = path.join(proposalsRoot, prospect.slug, page.slug || '');
    const pagePath = path.join(pageDir, 'index.html');
    if (!(await exists(pagePath))) {
      failures.push(`${prospect.slug}/${page.slug}: missing index.html`);
      continue;
    }

    const html = await fs.readFile(pagePath, 'utf8');
    checkedPages += 1;
    expect(/<meta name="robots" content="noindex,nofollow,noarchive"/.test(html), `${prospect.slug}/${page.slug}: noindex directive missing`);
    expect(html.includes('Unofficial owner-review concept'), `${prospect.slug}/${page.slug}: owner-review banner missing`);
    expect(html.includes('/32940/proposals/assets/concept.css'), `${prospect.slug}/${page.slug}: stylesheet missing`);
    expect(html.includes('<link rel="icon" href="/favicon.svg"'), `${prospect.slug}/${page.slug}: favicon missing`);
    expect(!/href="(?:tel|mailto):/i.test(html), `${prospect.slug}/${page.slug}: customer contact link must remain disabled`);
    expect((html.match(/class="site-nav"/g) || []).length === 1, `${prospect.slug}/${page.slug}: primary navigation missing`);
    expect((html.match(/data-owner-review/g) || []).length >= 4, `${prospect.slug}/${page.slug}: owner-review CTA coverage incomplete`);

    for (const match of html.matchAll(/href="(\/32940\/proposals\/[^"?#]+)"/g)) {
      const href = match[1];
      if (href.includes('/assets/')) continue;
      checkedLinks += 1;
      const target = href.endsWith('/') ? path.join(siteRoot, href, 'index.html') : path.join(siteRoot, href);
      expect(await exists(target), `${prospect.slug}/${page.slug}: broken proposal link ${href}`);
    }

    if (/<form\b/i.test(html)) {
      expect(/<form class="disabled-form"/.test(html), `${prospect.slug}/${page.slug}: unexpected form found`);
      for (const form of html.match(/<form\b[\s\S]*?<\/form>/gi) || []) {
        for (const tag of form.match(/<(?:input|textarea|button)\b[^>]*>/gi) || []) {
          expect(/\bdisabled\b/i.test(tag), `${prospect.slug}/${page.slug}: enabled customer form control ${tag.slice(0, 70)}`);
        }
      }
    }
  }

  if (prospect.heroImage) {
    for (const width of [640, 960, 1440]) {
      for (const extension of ['avif', 'webp', 'jpg']) {
        expect(await exists(path.join(proposalsRoot, 'assets', `${prospect.heroImage}-${width}.${extension}`)), `${prospect.slug}: missing ${width}px ${extension} image`);
      }
    }
  }

  const pilotRoot = path.join(proposalsRoot, prospect.slug, 'pilot');
  for (const filename of ['business-brain.json', 'source-manifest.json', 'social-drafts.json', 'article.md', 'gap-summary.md', 'static-sample.jpg', 'static-preview.webp', 'motion-poster.jpg', 'motion-poster-preview.webp', 'motion-sample.mp4', 'index.html', 'article/index.html']) {
    expect(await exists(path.join(pilotRoot, filename)), `${prospect.slug}: missing pilot/${filename}`);
  }
  expect(!(await exists(path.join(pilotRoot, 'article-outline.md'))), `${prospect.slug}: outline-only artifact must be removed`);

  const campaign = pilotCampaigns[prospect.slug];
  expect(Boolean(campaign), `${prospect.slug}: campaign definition missing`);
  if (campaign) {
    expect(campaign.metaDescription.length >= 150 && campaign.metaDescription.length <= 160, `${prospect.slug}: meta description must be 150-160 characters (found ${campaign.metaDescription.length})`);
    expect(campaign.metaDescription.toLowerCase().includes(campaign.primaryKeyword.toLowerCase()), `${prospect.slug}: meta description must contain primary keyword`);
    expect(campaign.sources.length >= 4, `${prospect.slug}: article requires at least four authoritative/business sources`);
  }

  if (await exists(path.join(pilotRoot, 'index.html'))) {
    const pilotHtml = await fs.readFile(path.join(pilotRoot, 'index.html'), 'utf8');
    expect(/<meta name="robots" content="noindex,nofollow,noarchive"/.test(pilotHtml), `${prospect.slug}: pilot noindex directive missing`);
    expect(pilotHtml.includes('Unofficial owner-review campaign'), `${prospect.slug}: pilot owner-review banner missing`);
    expect(pilotHtml.includes('href="article/"'), `${prospect.slug}: pilot must link to complete article`);
    expect(pilotHtml.includes('static-preview.webp') && pilotHtml.includes('motion-poster-preview.webp') && pilotHtml.includes('motion-sample.mp4'), `${prospect.slug}: pilot must show both optimized matching social previews`);
    expect(pilotHtml.includes('href="static-sample.jpg"') && pilotHtml.includes('href="motion-sample.mp4"'), `${prospect.slug}: pilot must retain full-resolution export links`);
    expect(!/<form\b|href="(?:tel|mailto):/i.test(pilotHtml), `${prospect.slug}: pilot must not activate customer contact or forms`);
  }

  if (await exists(path.join(pilotRoot, 'article', 'index.html')) && campaign) {
    const articleHtml = await fs.readFile(path.join(pilotRoot, 'article', 'index.html'), 'utf8');
    const plainText = articleHtml.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const declaredWords = Number(articleHtml.match(/data-word-count="(\d+)"/)?.[1]);
    expect(declaredWords >= 1200 && declaredWords <= 1800, `${prospect.slug}: full article must contain 1200-1800 structured words (found ${declaredWords})`);
    expect(countWords(plainText) >= 1200, `${prospect.slug}: rendered article appears too short`);
    expect(articleHtml.includes(`<title>${campaign.title}</title>`), `${prospect.slug}: article title must use exact primary headline`);
    expect(articleHtml.includes(`<h1>${campaign.title}</h1>`), `${prospect.slug}: article H1 must match title`);
    expect(articleHtml.includes(`data-primary-keyword="${campaign.primaryKeyword}"`), `${prospect.slug}: article primary keyword marker missing`);
    expect(articleHtml.includes(`Quick answer: how to prepare for ${campaign.primaryKeyword}`), `${prospect.slug}: exact keyword must appear in an H2`);
    expect(articleHtml.includes(`Use this ${campaign.primaryKeyword} preparation framework`), `${prospect.slug}: exact keyword must appear in conclusion`);
    expect(articleHtml.includes('Table of contents') || articleHtml.includes('On this page'), `${prospect.slug}: anchored table of contents missing`);
    expect(articleHtml.includes('FAQPage') && articleHtml.includes('BreadcrumbList') && articleHtml.includes('Article'), `${prospect.slug}: Article, Breadcrumb and FAQ schema required`);
    expect((articleHtml.match(/class="citations"/g) || []).length >= 5, `${prospect.slug}: evidence-to-claim citations are too sparse`);
    expect(articleHtml.includes('Official sources used'), `${prospect.slug}: official source list missing`);
    expect(!/<form\b|href="(?:tel|mailto):/i.test(articleHtml), `${prospect.slug}: article must not activate customer contact or forms`);
  }

  if (await exists(path.join(pilotRoot, 'article.md'))) {
    const markdown = await fs.readFile(path.join(pilotRoot, 'article.md'), 'utf8');
    expect(countWords(markdown) >= 1200, `${prospect.slug}: article source must contain at least 1200 words`);
    expect(markdown.includes('## Table of contents'), `${prospect.slug}: article source table of contents missing`);
    expect(markdown.includes('## Official and authoritative sources'), `${prospect.slug}: article source list missing`);
  }

  if (await exists(path.join(pilotRoot, 'social-drafts.json'))) {
    const drafts = JSON.parse(await fs.readFile(path.join(pilotRoot, 'social-drafts.json'), 'utf8'));
    expect(drafts.length === 2, `${prospect.slug}: expected exactly two article-derived social previews`);
    expect(drafts.every((draft) => draft.derivedFrom === 'article/index.html' && draft.versionHash && draft.approvalRequired === true), `${prospect.slug}: social previews must bind to the article version and approval`);
    expect(drafts.some((draft) => draft.format === '1080x1350_jpeg') && drafts.some((draft) => draft.format === '1080x1920_h264_15s'), `${prospect.slug}: required feed and vertical formats missing`);
  }

  if (await exists(path.join(pilotRoot, 'source-manifest.json'))) {
    const manifest = JSON.parse(await fs.readFile(path.join(pilotRoot, 'source-manifest.json'), 'utf8'));
    expect(manifest.publicationStatus === 'owner_review_only', `${prospect.slug}: manifest must remain owner-review only`);
    expect(manifest.versionHash?.length === 64, `${prospect.slug}: manifest version hash missing`);
    expect(manifest.artifacts?.length === 3, `${prospect.slug}: manifest must bind the article and two social artifacts`);
    expect(manifest.sources?.length >= 4, `${prospect.slug}: manifest source coverage incomplete`);
  }

  if (await exists(path.join(pilotRoot, 'static-sample.jpg'))) {
    const metadata = await sharp(path.join(pilotRoot, 'static-sample.jpg')).metadata();
    expect(metadata.width === 1080 && metadata.height === 1350 && metadata.format === 'jpeg', `${prospect.slug}: static sample must be 1080x1350 JPEG`);
  }

  if (await exists(path.join(pilotRoot, 'static-preview.webp'))) {
    const metadata = await sharp(path.join(pilotRoot, 'static-preview.webp')).metadata();
    expect(metadata.width === 720 && metadata.height === 900 && metadata.format === 'webp', `${prospect.slug}: web feed preview must be 720x900 WebP`);
  }

  if (await exists(path.join(pilotRoot, 'motion-poster-preview.webp'))) {
    const metadata = await sharp(path.join(pilotRoot, 'motion-poster-preview.webp')).metadata();
    expect(metadata.width === 540 && metadata.height === 960 && metadata.format === 'webp', `${prospect.slug}: motion poster preview must be 540x960 WebP`);
  }

  if (await exists(path.join(pilotRoot, 'motion-sample.mp4'))) {
    try {
      const probe = JSON.parse(execFileSync('ffprobe', [
        '-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'stream=codec_name,width,height:format=duration',
        '-of', 'json', path.join(pilotRoot, 'motion-sample.mp4'),
      ], { encoding: 'utf8' }));
      const stream = probe.streams?.[0];
      const duration = Number(probe.format?.duration);
      expect(stream?.codec_name === 'h264' && stream?.width === 1080 && stream?.height === 1920, `${prospect.slug}: motion sample must be 1080x1920 H.264`);
      expect(duration >= 14.9 && duration <= 15.1, `${prospect.slug}: motion sample must be 15 seconds (found ${duration})`);
    } catch (error) {
      failures.push(`${prospect.slug}: ffprobe failed: ${error.message}`);
    }
  }
}

expect(checkedPages === 25, `expected 25 premium pages, checked ${checkedPages}`);
expect(checkedLinks >= 100, `expected at least 100 internal page-link checks, checked ${checkedLinks}`);

if (failures.length) {
  console.error(`Premium proposal QA failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Premium proposal QA passed: ${checkedPages} pages, ${checkedLinks} internal links, five complete article-led campaigns, 5 long-form articles, 10 cohesive social previews, responsive imagery and exact export formats.`);
