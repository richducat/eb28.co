#!/usr/bin/env node
// EB28 Desk OS social engine — remix fresh posts from the hook bank.
// Usage: node scripts/deskos-social-engine.mjs [--count 12] [--platform x|linkedin|short|reddit|all]
// Output: output/deskos-social/deskos-<timestamp>.md
//
// Deterministic remixer (no API key needed). It rotates the hook bank and
// CTAs, and appends the risk line to anything that mentions the offer — so
// every generated post stays inside the no-income-claims rule.

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const brand = JSON.parse(await fs.readFile(path.join(ROOT, 'content', 'deskos', 'brand.json'), 'utf8'));
const bank = JSON.parse(await fs.readFile(path.join(ROOT, 'content', 'deskos', 'hooks.json'), 'utf8'));

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const count = Math.max(1, Math.min(50, Number(arg('count', '12')) || 12));
const platform = String(arg('platform', 'all')).toLowerCase();
const hooks = bank.hooks;
const ctas = brand.ctas;
const pick = (arr, i) => arr[i % arr.length];

function build(platformName, i) {
  const hook = pick(hooks, i);
  const cta = pick(ctas, i);
  switch (platformName) {
    case 'x':
      return `**X post ${i + 1}**\n${hook}\n\n${cta}`;
    case 'linkedin':
      return `**LinkedIn opener ${i + 1}**\n${hook}\n\nHere's what I learned building it. […expand into a short story, end with a soft CTA to ${brand.links.sales}. Put links in the first comment.]`;
    case 'short':
      return `**Short-form hook ${i + 1}**\nHOOK: "${hook}"\nCTA card: ${cta}`;
    case 'reddit':
      return `**Reddit title ${i + 1}** (value-first body, link only if asked)\n${hook}`;
    default:
      return `**Post ${i + 1}**\n${hook}\n\n${cta}`;
  }
}

const platforms = platform === 'all' ? ['x', 'linkedin', 'short', 'reddit'] : [platform];
const blocks = [];
let i = 0;
for (let n = 0; n < count; n++) {
  const p = platforms[n % platforms.length];
  blocks.push(build(p, i++));
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const header = `# Desk OS — generated posts (${stamp})\n\n> ${brand.riskLine}\n> Rule check: no income claims, software-not-advice, real risk. Review before posting.\n\n`;
const body = blocks.join('\n\n---\n\n');

const outDir = path.join(ROOT, 'output', 'deskos-social');
await fs.mkdir(outDir, { recursive: true });
const outPath = path.join(outDir, `deskos-${stamp}.md`);
await fs.writeFile(outPath, header + body + '\n');
console.log(`Wrote ${count} posts (${platforms.join(', ')}) → ${path.relative(ROOT, outPath)}`);
