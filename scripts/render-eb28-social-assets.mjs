#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { renderSocialAssetSet } from './lib/eb28-social-visuals.mjs';

const ROOT = process.cwd();

function parseArgs(argv) {
  const options = {
    packagePath: null,
    outputDir: null,
    fileBase: null,
    publicBaseUrl: '',
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--package') {
      options.packagePath = next;
      index += 1;
    } else if (arg === '--output-dir') {
      options.outputDir = next;
      index += 1;
    } else if (arg === '--file-base') {
      options.fileBase = next;
      index += 1;
    } else if (arg === '--public-base-url') {
      options.publicBaseUrl = next || '';
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/render-eb28-social-assets.mjs --package PATH --output-dir PATH [--file-base NAME] [--public-base-url URL]');
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!options.packagePath || !options.outputDir) {
    throw new Error('--package and --output-dir are required.');
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv);
  const packagePath = path.resolve(ROOT, options.packagePath);
  const pkg = JSON.parse(await fs.readFile(packagePath, 'utf8'));
  if (!pkg.creativeSystem) throw new Error(`Missing creativeSystem in ${packagePath}`);

  const fileBase = options.fileBase || pkg.runId || path.basename(packagePath, path.extname(packagePath));
  const visualAssets = await renderSocialAssetSet({
    creative: pkg.creativeSystem,
    rootDir: ROOT,
    outputDir: path.resolve(ROOT, options.outputDir),
    fileBase,
    publicBaseUrl: options.publicBaseUrl,
  });
  const nextPackage = {
    ...pkg,
    visualAssets,
    posts: {
      ...pkg.posts,
      instagram: pkg.posts?.instagram
        ? { ...pkg.posts.instagram, media: { type: 'carousel', items: visualAssets.instagramCarousel } }
        : pkg.posts?.instagram,
      shortFormVideo: pkg.posts?.shortFormVideo
        ? { ...pkg.posts.shortFormVideo, media: visualAssets.vertical }
        : pkg.posts?.shortFormVideo,
      x: pkg.posts?.x ? { ...pkg.posts.x, media: visualAssets.landscape } : pkg.posts?.x,
      linkedin: pkg.posts?.linkedin ? { ...pkg.posts.linkedin, media: visualAssets.landscape } : pkg.posts?.linkedin,
    },
  };
  await fs.writeFile(packagePath, `${JSON.stringify(nextPackage, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ ok: true, status: 'rendered', packagePath: path.relative(ROOT, packagePath), visualAssets }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
