#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  buildFeatureCampaignLibrary,
  featureCampaignLibraryMarkdown,
} from './lib/eb28-social-campaigns.mjs';
import { renderSocialAssetSet } from './lib/eb28-social-visuals.mjs';

const ROOT = process.cwd();

function parseArgs(argv) {
  const options = {
    lane: 'all',
    write: false,
    render: false,
    outputDir: path.join(ROOT, 'output', 'eb28-social', 'feature-library'),
    publicBaseUrl: '',
    proofDir: null,
    requireProof: false,
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--lane') {
      options.lane = next || 'all';
      index += 1;
    } else if (arg === '--write') {
      options.write = true;
    } else if (arg === '--render') {
      options.render = true;
    } else if (arg === '--output-dir') {
      options.outputDir = path.resolve(ROOT, next || '');
      index += 1;
    } else if (arg === '--public-base-url') {
      options.publicBaseUrl = next || '';
      index += 1;
    } else if (arg === '--proof-dir') {
      options.proofDir = path.resolve(ROOT, next || '');
      index += 1;
    } else if (arg === '--require-proof') {
      options.requireProof = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/generate-eb28-feature-campaign-library.mjs [--lane all|business-growth|trading-software] [--write] [--render] [--output-dir PATH] [--public-base-url URL] [--proof-dir PATH] [--require-proof]');
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!['all', 'business-growth', 'trading-software'].includes(options.lane)) {
    throw new Error('--lane must be all, business-growth, or trading-software.');
  }
  if (options.render && !options.write) throw new Error('--render requires --write.');
  if (options.requireProof && !options.proofDir) throw new Error('--require-proof requires --proof-dir.');
  return options;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function main() {
  const options = parseArgs(process.argv);
  const [catalog, architecture] = await Promise.all([
    readJson(path.join(ROOT, 'content', 'eb28', 'social-features.json')),
    readJson(path.join(ROOT, 'content', 'eb28', 'social-account-architecture.json')),
  ]);
  const library = buildFeatureCampaignLibrary({ catalog, architecture, lane: options.lane });

  if (!options.write) {
    console.log(JSON.stringify({ ok: true, status: 'dry_run', ...library.summary, accountDecisionStatus: library.accountDecisionStatus }, null, 2));
    return;
  }

  await fs.mkdir(options.outputDir, { recursive: true });
  if (options.render) {
    for (const campaign of library.campaigns) {
      const proofImagePath = options.proofDir ? path.join(options.proofDir, `${campaign.featureId}.jpg`) : '';
      let proofExists = false;
      if (proofImagePath) {
        try {
          await fs.access(proofImagePath);
          proofExists = true;
        } catch {
          proofExists = false;
        }
      }
      if (options.requireProof && !proofExists) throw new Error(`Missing required product proof capture: ${proofImagePath}`);
      campaign.visualAssets = await renderSocialAssetSet({
        creative: campaign.creativeSystem,
        rootDir: ROOT,
        outputDir: path.join(options.outputDir, 'assets'),
        fileBase: campaign.featureId,
        publicBaseUrl: options.publicBaseUrl,
        proofImagePath: proofExists ? proofImagePath : '',
      });
    }
  }

  const jsonPath = path.join(options.outputDir, `campaign-library-${options.lane}.json`);
  const markdownPath = path.join(options.outputDir, `campaign-library-${options.lane}.md`);
  await Promise.all([
    fs.writeFile(jsonPath, `${JSON.stringify(library, null, 2)}\n`, 'utf8'),
    fs.writeFile(markdownPath, `${featureCampaignLibraryMarkdown(library)}\n`, 'utf8'),
  ]);
  console.log(
    JSON.stringify(
      {
        ok: true,
        status: 'written',
        ...library.summary,
        rendered: options.render,
        accountDecisionStatus: library.accountDecisionStatus,
        jsonPath: path.relative(ROOT, jsonPath),
        markdownPath: path.relative(ROOT, markdownPath),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
