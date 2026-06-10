#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const roots = ['docs/ELW', 'public/ELW'];
const lockedJsName = 'index-BIQb1w8S-lisa-lock.js';
const lockedCssName = 'index-D7w1zK2H-lisa-lock.css';
const requiredAssetTokens = [
  'Best Value',
  'Bovine Collagen Support',
  'Easy-to-Digest Protein',
  'KEEPS YOU FULL BETWEEN MEALS',
  'Protein",value:"13g",dv:"20%"',
  'Choose your 8 pack option',
  'hero-thrive gold-text-shine',
  'est-badge-flat-bottom',
  'Product carousel controls',
];
const requiredCssTokens = [
  'hero-thrive-shine',
  'clip-path:inset(0 0 24% round 9999px)',
  'animation:',
];
const forbiddenAssetTokens = [
  'No Added Sugars',
  'Keto-Friendly Macros',
  'Best [-Value',
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const failures = [];
for (const root of roots) {
  const absRoot = path.join(repoRoot, root);
  const htmlFiles = walk(absRoot).filter((file) => file.endsWith('index.html'));
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    if (!html.includes(lockedJsName) || !html.includes(lockedCssName)) {
      failures.push(`${path.relative(repoRoot, file)} does not reference the Lisa-locked ELW assets`);
    }
  }

  const assetPath = path.join(absRoot, 'assets', lockedJsName);
  if (!fs.existsSync(assetPath)) {
    failures.push(`${path.relative(repoRoot, assetPath)} is missing`);
    continue;
  }
  const cssPath = path.join(absRoot, 'assets', lockedCssName);
  if (!fs.existsSync(cssPath)) {
    failures.push(`${path.relative(repoRoot, cssPath)} is missing`);
    continue;
  }
  const asset = fs.readFileSync(assetPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');
  for (const token of requiredAssetTokens) {
    if (!asset.includes(token)) failures.push(`${path.relative(repoRoot, assetPath)} missing required token: ${token}`);
  }
  for (const token of requiredCssTokens) {
    if (!css.includes(token)) failures.push(`${path.relative(repoRoot, cssPath)} missing required token: ${token}`);
  }
  for (const token of forbiddenAssetTokens) {
    if (asset.includes(token)) failures.push(`${path.relative(repoRoot, assetPath)} contains backdated/forbidden token: ${token}`);
  }
}

if (failures.length) {
  console.error('EL World Lisa request lock failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('EL World Lisa request lock verified.');
