#!/usr/bin/env node

// Exports the CadetCatch marketing site as a standalone static site rooted at
// the cadetcatch.com domain (mirrors scripts/export-thomas-domain.mjs). The
// dedicated cadetcatch.com GitHub Pages repo is populated from this output.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { injectSeoMarkup } from '../src/seo.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = path.join(repoRoot, 'docs');
const templatePath = path.join(docsDir, 'index.html');
const defaultTargetDir = path.resolve(repoRoot, '..', 'cadetcatch-com');
const targetDir = path.resolve(process.argv[2] || defaultTargetDir);
const primaryHostname = 'cadetcatch.com';
const OLD_ORIGIN_CC = 'https://eb28.co/cc/';
const NEW_ORIGIN = 'https://cadetcatch.com/';

// Static sub-pages that ship under docs/cc/<slug>/index.html and move to the
// site root on the dedicated domain.
const STATIC_SUBPAGES = ['support', 'privacy', 'terms', 'swab-summer-photos'];

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

async function copyIfExists(sourcePath, destinationPath) {
  try {
    await fs.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.copyFile(sourcePath, destinationPath);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

async function main() {
  const version = JSON.parse(await fs.readFile(path.join(docsDir, 'version.json'), 'utf8'));
  const buildId = process.env.BUILD_ID || version.buildId || 'development';
  const htmlTemplate = stripExistingBuildMarkup(await fs.readFile(templatePath, 'utf8'));

  // Clean the files this script owns (preserve CNAME + .git in the target repo).
  await Promise.all([
    ensureRemoved(path.join(targetDir, 'index.html')),
    ensureRemoved(path.join(targetDir, '404.html')),
    ensureRemoved(path.join(targetDir, 'assets')),
    ensureRemoved(path.join(targetDir, 'img')),
    ensureRemoved(path.join(targetDir, 'favicon.svg')),
    ensureRemoved(path.join(targetDir, 'version.json')),
    ...STATIC_SUBPAGES.map((slug) => ensureRemoved(path.join(targetDir, slug))),
  ]);

  // SPA shell, SEO-stamped for the cadetcatch.com hostname → renders CadetCatch.
  // Rebase any absolute eb28.co/cc asset URLs (e.g. JSON-LD image) onto the domain root.
  const routeLocation = { pathname: '/', hostname: primaryHostname };
  const indexHtml = injectBuildMarkup(injectSeoMarkup(htmlTemplate, routeLocation), buildId)
    .split(OLD_ORIGIN_CC)
    .join(NEW_ORIGIN)
    .replace('/images/hero_bg_app.png', '/img/find-cadet-photos.png');
  await writeFile('index.html', indexHtml);
  await writeFile('404.html', indexHtml);

  // Built JS/CSS bundle and marketing images.
  await fs.cp(path.join(docsDir, 'assets'), path.join(targetDir, 'assets'), {
    recursive: true,
    force: true,
  });
  await fs.cp(path.join(docsDir, 'cc', 'img'), path.join(targetDir, 'img'), {
    recursive: true,
    force: true,
  });
  await copyIfExists(path.join(docsDir, 'favicon.svg'), path.join(targetDir, 'favicon.svg'));

  // Static sub-pages: copy to the site root, rewriting absolute eb28.co/cc URLs.
  for (const slug of STATIC_SUBPAGES) {
    const source = path.join(docsDir, 'cc', slug, 'index.html');
    try {
      const raw = await fs.readFile(source, 'utf8');
      const rewritten = raw.split(OLD_ORIGIN_CC).join(NEW_ORIGIN);
      await writeFile(path.join(slug, 'index.html'), rewritten);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
      console.warn(`  (skipped missing sub-page: ${slug})`);
    }
  }

  await writeFile(
    'version.json',
    `${JSON.stringify({ buildId, generatedAt: new Date().toISOString() }, null, 2)}\n`,
  );
  await writeFile('CNAME', 'cadetcatch.com\n');
  await writeFile('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: https://cadetcatch.com/sitemap.xml\n`);
  await writeFile(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://cadetcatch.com/</loc></url>\n  <url><loc>https://cadetcatch.com/swab-summer-photos/</loc></url>\n  <url><loc>https://cadetcatch.com/support/</loc></url>\n  <url><loc>https://cadetcatch.com/privacy/</loc></url>\n</urlset>\n`,
  );

  console.log(`Exported CadetCatch domain files to ${targetDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
