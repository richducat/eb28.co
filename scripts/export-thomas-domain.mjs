#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { injectSeoMarkup } from '../src/seo.js';
import {
  THOMAS_SEO_PAGES,
  buildThomasRobotsTxt,
  buildThomasSitemapXml,
  getThomasPrimaryPath,
} from '../src/thomasSeoPages.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = path.join(repoRoot, 'docs');
const templatePath = path.join(docsDir, 'index.html');
const defaultTargetDir = path.resolve(repoRoot, '..', 'thomascustom-homes');
const targetDir = path.resolve(process.argv[2] || defaultTargetDir);
const primaryHostname = 'thomascustom.homes';

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
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function main() {
  const version = JSON.parse(await fs.readFile(path.join(docsDir, 'version.json'), 'utf8'));
  const buildId = process.env.BUILD_ID || version.buildId || 'development';
  const htmlTemplate = stripExistingBuildMarkup(await fs.readFile(templatePath, 'utf8'));

  for (const page of THOMAS_SEO_PAGES) {
    if (page.slug) {
      await ensureRemoved(path.join(targetDir, page.slug));
    }
  }

  await Promise.all([
    ensureRemoved(path.join(targetDir, 'index.html')),
    ensureRemoved(path.join(targetDir, '404.html')),
    ensureRemoved(path.join(targetDir, 'robots.txt')),
    ensureRemoved(path.join(targetDir, 'sitemap.xml')),
    ensureRemoved(path.join(targetDir, 'version.json')),
    ensureRemoved(path.join(targetDir, 'assets')),
    ensureRemoved(path.join(targetDir, 'og-image.png')),
    ensureRemoved(path.join(targetDir, 'alarm-icon.png')),
    ensureRemoved(path.join(targetDir, 'favicon.svg')),
  ]);

  for (const page of THOMAS_SEO_PAGES) {
    const pathname = getThomasPrimaryPath(page);
    const routeLocation = {
      pathname,
      hostname: primaryHostname,
    };
    const outputPath = page.slug ? `${page.slug}/index.html` : 'index.html';

    await writeFile(
      outputPath,
      injectBuildMarkup(injectSeoMarkup(htmlTemplate, routeLocation), buildId),
    );
  }

  await writeFile(
    '404.html',
    injectBuildMarkup(
      injectSeoMarkup(htmlTemplate, {
        pathname: '/',
        hostname: primaryHostname,
      }),
      buildId,
    ),
  );

  await fs.cp(path.join(docsDir, 'assets'), path.join(targetDir, 'assets'), {
    recursive: true,
    force: true,
  });

  await copyIfExists(path.join(docsDir, 'tch', 'og-image.png'), path.join(targetDir, 'og-image.png'));
  await copyIfExists(path.join(docsDir, 'alarm-icon.png'), path.join(targetDir, 'alarm-icon.png'));
  await copyIfExists(path.join(docsDir, 'favicon.svg'), path.join(targetDir, 'favicon.svg'));

  await writeFile(
    'version.json',
    `${JSON.stringify(
      {
        buildId,
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );
  await writeFile('robots.txt', buildThomasRobotsTxt());
  await writeFile('sitemap.xml', buildThomasSitemapXml());

  console.log(`Exported Thomas custom domain files to ${targetDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
