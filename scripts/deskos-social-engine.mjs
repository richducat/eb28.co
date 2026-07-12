#!/usr/bin/env node
// EB28 Desk OS evergreen social remixer.
// Usage: node scripts/deskos-social-engine.mjs [--count 12] [--platform x|linkedin|short|reddit|all]
// Output: output/deskos-social/deskos-<timestamp>.md

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const brand = JSON.parse(await fs.readFile(path.join(ROOT, 'content', 'deskos', 'brand.json'), 'utf8'));
const bank = JSON.parse(await fs.readFile(path.join(ROOT, 'content', 'deskos', 'hooks.json'), 'utf8'));
const featureCatalog = JSON.parse(await fs.readFile(path.join(ROOT, 'content', 'eb28', 'social-features.json'), 'utf8'));
const tradingFeatures = (featureCatalog.features || []).filter(
  (feature) => feature.lane === 'trading-software' && feature.status !== 'retired',
);

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index !== -1 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function compact(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function truncate(value, length) {
  const text = compact(value);
  if (text.length <= length) return text;
  const clipped = text.slice(0, length - 1);
  const boundary = clipped.lastIndexOf(' ');
  return `${(boundary > length * 0.55 ? clipped.slice(0, boundary) : clipped).replace(/[.,;:!?-]+$/, '')}…`;
}

const count = Math.max(1, Math.min(50, Number(arg('count', '12')) || 12));
const platform = String(arg('platform', 'all')).toLowerCase();
const supportedPlatforms = ['x', 'linkedin', 'short', 'reddit'];
if (platform !== 'all' && !supportedPlatforms.includes(platform)) {
  throw new Error(`Unsupported platform: ${platform}`);
}
if (!tradingFeatures.length) throw new Error('No active trading features found.');

const pick = (items, index) => items[index % items.length];

function buildX(hook, feature) {
  const cta = feature.cta?.url?.replace(/^https?:\/\//, '') || 'eb28.co/start';
  const disclosure = 'Software, not advice. Risk of loss.';
  const reserve = cta.length + disclosure.length + 5;
  return `${truncate(`${hook} ${feature.name}: ${feature.features[0]}`, 280 - reserve)}\n${cta}\n${disclosure}`;
}

function buildLinkedIn(hook, feature) {
  return `${hook}

The feature worth inspecting is ${feature.name}.

• ${feature.features[0]}
• ${feature.features[1]}
• ${feature.features[2]}

${feature.promise}

The public tape matters because the same page has to show fills, inactivity, blockers, and degraded states. That is the standard: controls and evidence before a checkout link.

See the tape: ${brand.links.liveTape}

${brand.riskLine}

#BuildInPublic #AgenticAI #TradingSystems`;
}

function buildShort(hook, feature) {
  return `HOOK (0-3s): “${hook}”
SHOT 1 (3-10s): Open the live tape and show the current lane status.
SHOT 2 (10-22s): Feature card — ${feature.name}: ${feature.features[0]}.
SHOT 3 (22-34s): Show two controls — ${feature.features[1]}; ${feature.features[2]}.
SHOT 4 (34-42s): Explain why the control matters: ${feature.promise}
CTA (42-45s): ${feature.cta?.label || 'Watch the public tape'} — ${feature.cta?.url || brand.links.liveTape}
DISCLOSURE: ${brand.riskLine}`;
}

function buildReddit(hook, feature) {
  return `**Title:** ${truncate(hook, 110)}

**Value-first body outline (no link unless the community asks):**

1. State the failure mode that led to this control.
2. Explain how ${feature.name} handles it: ${feature.features[0]}.
3. Show the tradeoff or limitation, including what still requires an operator.
4. Share how the control is tested and what a degraded state looks like.
5. Invite technical criticism; do not pitch returns or DM a checkout link.

Disclosure if a link is later requested: ${brand.riskLine}`;
}

function build(platformName, index) {
  const hook = pick(bank.hooks, index);
  const feature = pick(tradingFeatures, index);
  const content = {
    x: buildX,
    linkedin: buildLinkedIn,
    short: buildShort,
    reddit: buildReddit,
  }[platformName](hook, feature);
  return `## ${platformName === 'short' ? 'Short-form' : platformName === 'x' ? 'X' : platformName.charAt(0).toUpperCase() + platformName.slice(1)} ${index + 1}

**Feature:** ${feature.name}

${content}`;
}

const platforms = platform === 'all' ? supportedPlatforms : [platform];
const blocks = [];
for (let index = 0; index < count; index += 1) {
  blocks.push(build(platforms[index % platforms.length], index));
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const header = `# Desk OS — evergreen post drafts (${stamp})

> ${brand.riskLine}
> Feature source: content/eb28/social-features.json (${featureCatalog.version})
> Every draft requires a current live-tape and account-identity check before posting.

`;
const output = `${header}${blocks.join('\n\n---\n\n')}\n`;
const outDir = path.join(ROOT, 'output', 'deskos-social');
await fs.mkdir(outDir, { recursive: true });
const outPath = path.join(outDir, `deskos-${stamp}.md`);
await fs.writeFile(outPath, output);

const lint = spawnSync('/usr/bin/python3', ['scripts/compliance_lint.py', outPath], {
  cwd: ROOT,
  encoding: 'utf8',
});
if (lint.status !== 0) {
  await fs.rm(outPath, { force: true });
  throw new Error(`Compliance lint blocked the generated Desk OS pack: ${truncate(lint.stdout || lint.stderr, 500)}`);
}

console.log(`Wrote ${count} reviewed drafts (${platforms.join(', ')}) → ${path.relative(ROOT, outPath)}`);
