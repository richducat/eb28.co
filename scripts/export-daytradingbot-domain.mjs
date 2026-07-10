#!/usr/bin/env node

// Exports the trading funnel as a standalone static site rooted at the
// daytradingbot.net domain (mirrors scripts/export-cadetcatch-domain.mjs).
// Root renders the Bluechip page via the hostname check in main.jsx; the
// funnel routes (/bluechip, /deskos, /fundmanager, /setup, /welcome) ship as
// SPA shells so nav links work on the dedicated domain.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { injectSeoMarkup } from '../src/seo.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = path.join(repoRoot, 'docs');
const templatePath = path.join(docsDir, 'index.html');
const defaultTargetDir = path.resolve(repoRoot, '..', 'daytradingbot-net');
const targetDir = path.resolve(process.argv[2] || defaultTargetDir);
const primaryHostname = 'daytradingbot.net';

const ROUTES = ['bluechip', 'deskos', 'fundmanager', 'setup', 'welcome'];
// NOTE: 'data' is deliberately NOT wiped/copied wholesale. The target repo's
// data/ dir is owned by the growth scripts that live there (tape-days.json,
// weekly-recaps.json), and the gitignored live fund JSONs in docs/data must
// never be exported — a committed copy goes stale immediately and shadows the
// live fund-state feed the dashboard fetches. Only the blog feed is copied.
const DATA_DIRS = ['assets', 'api', 'images'];
const DATA_FILES = ['eb28-blog-feed.json'];
// Sections owned by the daytradingbot.net repo itself — never touched here,
// and their sitemap entries must survive an export.
const PRESERVED_URL_PATTERNS = ['/tape/', '/tape', '/answers/', '/answers', '/weekly/', '/weekly'];

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function injectBuildMarkup(html, buildId) {
  const buildMarkup = [
    `    <meta name="eb28-build-id" content="${escapeAttribute(buildId)}" />`,
    '    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />',
    '    <meta http-equiv="Pragma" content="no-cache" />',
    '    <meta http-equiv="Expires" content="0" />',
  ].join('\n');
  const viewportPattern = /(<meta\s+name="viewport"[^>]*>\s*)/i;
  if (viewportPattern.test(html)) {
    return html.replace(viewportPattern, `$1${buildMarkup}\n`);
  }
  return html.replace('</head>', `${buildMarkup}\n</head>`);
}

function stripExistingBuildMarkup(html) {
  return html
    .replace(/\s*<meta name="eb28-build-id" content="[^"]*" \/>\s*/gi, '\n')
    .replace(/\s*<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" \/>\s*/gi, '\n')
    .replace(/\s*<meta http-equiv="Pragma" content="no-cache" \/>\s*/gi, '\n')
    .replace(/\s*<meta http-equiv="Expires" content="0" \/>\s*/gi, '\n');
}

async function ensureRemoved(targetPath) {
  await fs.rm(targetPath, { recursive: true, force: true });
}

async function writeFile(relativePath, contents) {
  const outputPath = path.join(targetDir, relativePath);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, contents);
}

async function copyDirIfExists(source, destination) {
  try {
    await fs.cp(source, destination, { recursive: true, force: true });
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    console.warn(`  (skipped missing dir: ${path.basename(source)})`);
  }
}

async function main() {
  const version = JSON.parse(await fs.readFile(path.join(docsDir, 'version.json'), 'utf8'));
  const buildId = process.env.BUILD_ID || version.buildId || 'development';
  const htmlTemplate = stripExistingBuildMarkup(await fs.readFile(templatePath, 'utf8'));

  await Promise.all([
    ensureRemoved(path.join(targetDir, 'index.html')),
    ensureRemoved(path.join(targetDir, '404.html')),
    ensureRemoved(path.join(targetDir, 'version.json')),
    ensureRemoved(path.join(targetDir, 'analytics-config.json')),
    ensureRemoved(path.join(targetDir, 'favicon.svg')),
    ...DATA_DIRS.map((dir) => ensureRemoved(path.join(targetDir, dir))),
    ...ROUTES.map((slug) => ensureRemoved(path.join(targetDir, slug))),
  ]);

  // Root shell: SEO-stamped for the daytradingbot.net hostname → Bluechip page.
  const rootHtml = injectBuildMarkup(
    injectSeoMarkup(htmlTemplate, { pathname: '/', hostname: primaryHostname }),
    buildId,
  );
  await writeFile('index.html', rootHtml);
  await writeFile('404.html', rootHtml);

  // Funnel route shells, each stamped with its own route meta.
  for (const slug of ROUTES) {
    const html = injectBuildMarkup(
      injectSeoMarkup(htmlTemplate, { pathname: `/${slug}`, hostname: primaryHostname }),
      buildId,
    );
    await writeFile(path.join(slug, 'index.html'), html);
  }

  // Bundle, live data, and imagery the funnel depends on.
  for (const dir of DATA_DIRS) {
    await copyDirIfExists(path.join(docsDir, dir), path.join(targetDir, dir));
  }
  for (const file of DATA_FILES) {
    try {
      await fs.mkdir(path.join(targetDir, 'data'), { recursive: true });
      await fs.copyFile(path.join(docsDir, 'data', file), path.join(targetDir, 'data', file));
    } catch { /* optional */ }
  }
  await copyDirIfExists(path.join(docsDir, 'favicon.svg'), path.join(targetDir, 'favicon.svg'));
  try {
    await fs.copyFile(path.join(docsDir, 'analytics-config.json'), path.join(targetDir, 'analytics-config.json'));
  } catch { /* optional */ }

  await writeFile(
    'version.json',
    `${JSON.stringify({ buildId, generatedAt: new Date().toISOString() }, null, 2)}\n`,
  );
  await writeFile('CNAME', 'daytradingbot.net\n');
  await writeFile('.nojekyll', '');
  await writeFile('robots.txt', 'User-agent: *\nAllow: /\n\nSitemap: https://daytradingbot.net/sitemap.xml\n');
  // Merge the sitemap: funnel routes plus every existing entry owned by the
  // target repo's own generators (tape/answers/weekly) — never drop those.
  let preservedBlocks = [];
  try {
    const existingSitemap = await fs.readFile(path.join(targetDir, 'sitemap.xml'), 'utf8');
    preservedBlocks = (existingSitemap.match(/<url>[\s\S]*?<\/url>/g) || []).filter((block) =>
      PRESERVED_URL_PATTERNS.some((pattern) => block.includes(`daytradingbot.net${pattern}`)),
    );
  } catch { /* first export: nothing to preserve */ }
  await writeFile(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://daytradingbot.net/</loc></url>\n${ROUTES.map((slug) => `  <url><loc>https://daytradingbot.net/${slug}/</loc></url>`).join('\n')}\n${preservedBlocks.map((block) => `  ${block}`).join('\n')}\n</urlset>\n`,
  );

  console.log(`Exported DayTradingBot domain files to ${targetDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
