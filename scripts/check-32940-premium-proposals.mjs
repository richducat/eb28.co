#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

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
  for (const filename of ['business-brain.json', 'source-manifest.json', 'social-drafts.json', 'article-outline.md', 'gap-summary.md', 'static-sample.jpg', 'motion-sample.mp4', 'index.html']) {
    expect(await exists(path.join(pilotRoot, filename)), `${prospect.slug}: missing pilot/${filename}`);
  }

  if (await exists(path.join(pilotRoot, 'static-sample.jpg'))) {
    const metadata = await sharp(path.join(pilotRoot, 'static-sample.jpg')).metadata();
    expect(metadata.width === 1080 && metadata.height === 1350 && metadata.format === 'jpeg', `${prospect.slug}: static sample must be 1080x1350 JPEG`);
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

console.log(`Premium proposal QA passed: ${checkedPages} pages, ${checkedLinks} internal links, 5 complete pilot packs, responsive imagery and exact social-export formats.`);
