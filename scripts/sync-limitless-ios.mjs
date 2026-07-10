#!/usr/bin/env node

// Copies the built Limitless Credit GPS web app from docs/ into the iOS
// shell's WebRoot so the app bundles the latest build. Run `npm run build`
// first, then this script, then rebuild the Xcode project.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = path.join(repoRoot, 'docs');
const webRoot = path.join(repoRoot, 'ios', 'LimitlessCreditGPS', 'WebRoot');

async function copyDir(from, to, filter = () => true) {
  await fs.mkdir(to, { recursive: true });
  const entries = await fs.readdir(from, { withFileTypes: true });
  let copied = 0;
  for (const entry of entries) {
    const source = path.join(from, entry.name);
    const target = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copied += await copyDir(source, target, filter);
    } else if (filter(entry.name)) {
      await fs.copyFile(source, target);
      copied += 1;
    }
  }
  return copied;
}

async function main() {
  try {
    await fs.access(path.join(docsDir, 'limitless', 'index.html'));
  } catch {
    console.error('docs/limitless/index.html not found. Run `npm run build` first.');
    process.exit(1);
  }

  await fs.rm(webRoot, { recursive: true, force: true });
  await fs.mkdir(webRoot, { recursive: true });

  const limitlessCount = await copyDir(path.join(docsDir, 'limitless'), path.join(webRoot, 'limitless'));
  const assetCount = await copyDir(path.join(docsDir, 'assets'), path.join(webRoot, 'assets'), (name) =>
    /\.(js|css|svg|woff2?|json)$/.test(name),
  );

  await fs.mkdir(path.join(webRoot, 'images'), { recursive: true });
  await fs.copyFile(path.join(docsDir, 'favicon.svg'), path.join(webRoot, 'favicon.svg'));
  await fs.copyFile(
    path.join(docsDir, 'images', 'hero_bg_app.png'),
    path.join(webRoot, 'images', 'hero_bg_app.png'),
  );

  console.log(`Synced WebRoot: ${limitlessCount} limitless files, ${assetCount} asset files.`);
}

main();
