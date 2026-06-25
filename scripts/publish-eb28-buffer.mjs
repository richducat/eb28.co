#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'output', 'eb28-social');
const ASSET_DIR = path.join(ROOT, 'docs', 'social-assets', 'eb28');
const STATE_FILE = path.join(OUTPUT_DIR, 'buffer-publish-state.json');
const BUFFER_API_URL = 'https://api.buffer.com';
const DEFAULT_PLATFORMS = ['instagram', 'tiktok'];

function compact(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function parseArgs(argv) {
  const options = {
    mode: null,
    date: null,
    slot: 'auto',
    packagePath: null,
    dryRun: false,
    force: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--prepare') {
      options.mode = 'prepare';
    } else if (arg === '--publish') {
      options.mode = 'publish';
    } else if (arg === '--date') {
      options.date = next || null;
      index += 1;
    } else if (arg === '--slot') {
      options.slot = next || 'auto';
      index += 1;
    } else if (arg === '--package') {
      options.packagePath = next || null;
      index += 1;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.mode) {
    throw new Error('Choose one mode: --prepare or --publish');
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/publish-eb28-buffer.mjs --prepare|--publish [options]

Options:
  --date YYYY-MM-DD       Content date. Defaults to America/New_York today.
  --slot am|pm|auto       Content slot. Defaults to auto.
  --package PATH          Explicit social package path.
  --dry-run               Print publish plan without calling Buffer.
  --force                 Publish even if the runId is already in the local state file.

Required env for --publish when EB28_SOCIAL_POSTING_ENABLED=true:
  BUFFER_API_KEY
  EB28_BUFFER_ORGANIZATION_ID
  EB28_BUFFER_CHANNELS              JSON or csv map, e.g. {"instagram":"...","tiktok":"..."}

Recommended safety env:
  EB28_BUFFER_EXPECTED_ACCOUNT_EMAIL=social@eb28.co
  EB28_BUFFER_PLATFORM_ALLOWLIST=instagram,tiktok
  EB28_SOCIAL_MEDIA_BASE_URL=https://raw.githubusercontent.com/<owner>/<repo>/main/docs/social-assets/eb28`);
}

function easternParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
  };
}

function resolveSlot(slot) {
  if (slot === 'am' || slot === 'pm') return slot;
  return easternParts().hour < 12 ? 'am' : 'pm';
}

function resolvePackagePath(options) {
  const date = options.date || easternParts().date;
  const slot = resolveSlot(options.slot);
  const runId = `${date}-${slot}`;
  return {
    date,
    slot,
    runId,
    packagePath: options.packagePath
      ? path.resolve(ROOT, options.packagePath)
      : path.join(OUTPUT_DIR, `eb28-content-${runId}.json`),
  };
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function wrapText(value, maxChars, maxLines) {
  const words = compact(value)
    .split(' ')
    .flatMap((word) => {
      if (word.length <= maxChars) return [word];
      const chunks = [];
      for (let index = 0; index < word.length; index += maxChars) {
        chunks.push(word.slice(index, index + maxChars));
      }
      return chunks;
    })
    .filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
    if (lines.length === maxLines) break;
  }

  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length > maxLines) return lines.slice(0, maxLines);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[.,;:!?-]+$/, '')}...`;
  }
  return lines;
}

function svgTextLines(lines, { x, y, size, weight = 700, fill = '#e5e7eb', lineHeight = 1.18 }) {
  return lines
    .map((line, index) => {
      const dy = index === 0 ? 0 : size * lineHeight;
      return `<text x="${x}" y="${y + dy}" fill="${fill}" font-family="Inter, Arial, sans-serif" font-size="${size}" font-weight="${weight}">${escapeXml(line)}</text>`;
    })
    .join('\n');
}

function buildCardSvg(pkg) {
  const titleLines = wrapText(pkg.article?.title || 'EB28 Growth Brief', 30, 2);
  const keywordLines = wrapText(pkg.article?.primaryKeyword || 'organic growth system', 36, 2);
  const url = pkg.article?.url || 'https://eb28.co/start';
  const urlLines = wrapText(url.replace('https://', '').replace(/\/$/, ''), 42, 2);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1080" height="1350" viewBox="0 0 1080 1350" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grid" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#020617"/>
      <stop offset="0.58" stop-color="#0f172a"/>
      <stop offset="1" stop-color="#111827"/>
    </linearGradient>
    <pattern id="dots" width="36" height="36" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.5" fill="#1f2937"/>
    </pattern>
  </defs>
  <rect width="1080" height="1350" fill="url(#grid)"/>
  <rect width="1080" height="1350" fill="url(#dots)" opacity="0.65"/>
  <rect x="70" y="78" width="940" height="1194" rx="34" fill="#020617" stroke="#334155" stroke-width="2"/>
  <rect x="110" y="118" width="860" height="72" rx="18" fill="#0f172a" stroke="#1e293b"/>
  <text x="140" y="165" fill="#22d3ee" font-family="Arial, sans-serif" font-size="42" font-weight="800">&gt;_</text>
  <text x="228" y="164" fill="#f8fafc" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="800">EB28</text>
  <text x="810" y="164" fill="#94a3b8" font-family="Inter, Arial, sans-serif" font-size="25" font-weight="700">${escapeXml(String(pkg.slot || '').toUpperCase())} BRIEF</text>
  <line x1="110" y1="250" x2="970" y2="250" stroke="#1e293b" stroke-width="2"/>
  <text x="120" y="326" fill="#22d3ee" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="800">TODAY'S OPERATING NOTE</text>
  ${svgTextLines(titleLines, { x: 120, y: 420, size: 52, weight: 850, fill: '#f8fafc', lineHeight: 1.42 })}
  <rect x="120" y="795" width="840" height="144" rx="24" fill="#0f172a" stroke="#1e293b"/>
  <text x="154" y="848" fill="#94a3b8" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="700">SEARCH INTENT</text>
  ${svgTextLines(keywordLines, { x: 154, y: 896, size: 33, weight: 750, fill: '#e5e7eb', lineHeight: 1.22 })}
  <text x="120" y="1032" fill="#cbd5e1" font-family="Inter, Arial, sans-serif" font-size="33" font-weight="650">Build the page. Show the work. Measure the lead path.</text>
  ${svgTextLines(urlLines, { x: 120, y: 1110, size: 26, weight: 800, fill: '#22d3ee', lineHeight: 1.24 })}
  <text x="120" y="1214" fill="#94a3b8" font-family="Inter, Arial, sans-serif" font-size="23" font-weight="650">Software, not advice. Automation with the losses included.</text>
</svg>`;
}

function publicAssetUrl(runId) {
  const base = compact(process.env.EB28_SOCIAL_MEDIA_BASE_URL) || 'https://eb28.co/social-assets/eb28';
  return `${base.replace(/\/+$/, '')}/${runId}.png`;
}

async function prepareAsset(pkg, context) {
  if (!pkg?.article?.title) {
    throw new Error(`Invalid EB28 social package: missing article.title in ${context.packagePath}`);
  }

  const assetPath = path.join(ASSET_DIR, `${context.runId}.png`);
  const relativePath = path.relative(ROOT, assetPath);
  const svg = buildCardSvg(pkg);
  await fs.mkdir(path.dirname(assetPath), { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(assetPath);

  const asset = {
    type: 'image',
    localPath: relativePath,
    publicUrl: publicAssetUrl(context.runId),
    alt: `EB28 growth brief card for ${pkg.article.title}`,
  };

  const nextPkg = {
    ...pkg,
    bufferAsset: asset,
    posts: {
      ...pkg.posts,
      instagram: pkg.posts?.instagram ? { ...pkg.posts.instagram, media: asset } : pkg.posts?.instagram,
      shortFormVideo: pkg.posts?.shortFormVideo ? { ...pkg.posts.shortFormVideo, media: asset } : pkg.posts?.shortFormVideo,
    },
    socialPublishGuard: {
      status: 'buffer_ready_pending_verified_channels',
      note: 'Buffer publishing is enabled only when the API account, organization, exact channel IDs, and EB28-owned channels verify successfully.',
    },
  };

  await writeJson(context.packagePath, nextPkg);
  console.log(JSON.stringify({ ok: true, status: 'prepared', runId: context.runId, asset }, null, 2));
}

function isEnabled() {
  return /^(1|true|yes|on)$/i.test(compact(process.env.EB28_SOCIAL_POSTING_ENABLED));
}

function parsePlatformAllowlist() {
  const raw = compact(process.env.EB28_BUFFER_PLATFORM_ALLOWLIST);
  if (!raw) return DEFAULT_PLATFORMS;
  const platforms = raw.split(',').map((item) => compact(item).toLowerCase()).filter(Boolean);
  return platforms.length ? [...new Set(platforms)] : DEFAULT_PLATFORMS;
}

function parseChannelMap() {
  const raw = compact(process.env.EB28_BUFFER_CHANNELS);
  if (!raw) {
    throw new Error('EB28_BUFFER_CHANNELS is required when Buffer publishing is enabled.');
  }
  if (raw.startsWith('{')) {
    const parsed = JSON.parse(raw);
    return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key.toLowerCase(), compact(value)]));
  }
  return Object.fromEntries(
    raw
      .split(',')
      .map((part) => part.split('='))
      .filter(([key, value]) => compact(key) && compact(value))
      .map(([key, value]) => [compact(key).toLowerCase(), compact(value)])
  );
}

function gqlValue(value) {
  if (Array.isArray(value)) return `[${value.map(gqlValue).join(', ')}]`;
  if (value && typeof value === 'object') {
    if (value.__enum) return value.__enum;
    return `{ ${Object.entries(value).map(([key, val]) => `${key}: ${gqlValue(val)}`).join(', ')} }`;
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (value === null || value === undefined) return 'null';
  return JSON.stringify(String(value));
}

function enumValue(value) {
  return { __enum: value };
}

async function bufferRequest(query) {
  const apiKey = compact(process.env.BUFFER_API_KEY);
  if (!apiKey) throw new Error('BUFFER_API_KEY is required when Buffer publishing is enabled.');

  const response = await fetch(BUFFER_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`Buffer API returned non-JSON response (${response.status}): ${text.slice(0, 240)}`);
  }
  if (!response.ok) {
    throw new Error(`Buffer API HTTP ${response.status}: ${JSON.stringify(payload)}`);
  }
  if (payload.errors?.length) {
    throw new Error(`Buffer GraphQL error: ${payload.errors.map((error) => error.message).join('; ')}`);
  }
  return payload.data;
}

async function getBufferContext() {
  const data = await bufferRequest(`
    query GetEb28BufferAccount {
      account {
        id
        email
        organizations {
          id
          name
          ownerEmail
        }
      }
    }
  `);

  const account = data.account;
  const expectedEmail = compact(process.env.EB28_BUFFER_EXPECTED_ACCOUNT_EMAIL || 'social@eb28.co').toLowerCase();
  if (compact(account?.email).toLowerCase() !== expectedEmail) {
    throw new Error(`Refusing to publish: Buffer API account is ${account?.email || 'unknown'}, expected ${expectedEmail}.`);
  }

  const organizationId = compact(process.env.EB28_BUFFER_ORGANIZATION_ID);
  if (!organizationId) {
    throw new Error('EB28_BUFFER_ORGANIZATION_ID is required. Do not guess Buffer organization IDs.');
  }

  const organization = (account.organizations || []).find((item) => item.id === organizationId);
  if (!organization) {
    throw new Error(`Refusing to publish: organization ${organizationId} is not available to ${account.email}.`);
  }

  const channelData = await bufferRequest(`
    query GetEb28BufferChannels {
      channels(input: { organizationId: ${JSON.stringify(organizationId)} }) {
        id
        name
        displayName
        service
        isQueuePaused
      }
    }
  `);

  return {
    account,
    organization,
    channels: channelData.channels || [],
  };
}

function findAndValidateChannel({ platform, channelId, channels }) {
  const channel = channels.find((item) => item.id === channelId);
  if (!channel) {
    throw new Error(`Refusing to publish ${platform}: channel ${channelId} was not returned by Buffer.`);
  }
  if (compact(channel.service).toLowerCase() !== platform) {
    throw new Error(`Refusing to publish ${platform}: channel ${channelId} is service ${channel.service}.`);
  }
  if (channel.isQueuePaused) {
    throw new Error(`Refusing to publish ${platform}: channel ${channel.displayName || channel.name} queue is paused.`);
  }
  const visibleName = `${channel.name || ''} ${channel.displayName || ''}`.toLowerCase();
  if (!visibleName.includes('eb28')) {
    throw new Error(`Refusing to publish ${platform}: channel name "${channel.displayName || channel.name}" does not look EB28-owned.`);
  }
  return channel;
}

function postForPlatform(platform, pkg, assetUrl, channelId) {
  const imageAsset = { image: { url: assetUrl } };
  if (platform === 'instagram') {
    const caption = publicCaption(pkg.posts?.instagram?.caption, pkg);
    if (!caption) throw new Error('Missing Instagram caption in EB28 social package.');
    return {
      channelId,
      text: caption,
      schedulingType: enumValue('automatic'),
      mode: enumValue('addToQueue'),
      assets: [imageAsset],
      metadata: {
        instagram: {
          type: enumValue('post'),
          shouldShareToFeed: true,
          link: pkg.article?.url || 'https://eb28.co/start',
        },
      },
    };
  }
  if (platform === 'tiktok') {
    const caption = publicCaption(pkg.posts?.shortFormVideo?.caption || pkg.posts?.instagram?.caption, pkg);
    if (!caption) throw new Error('Missing TikTok/short-form caption in EB28 social package.');
    return {
      channelId,
      text: caption,
      schedulingType: enumValue('automatic'),
      mode: enumValue('addToQueue'),
      assets: [imageAsset],
      metadata: {
        tiktok: {
          title: compact(pkg.article?.title).slice(0, 90) || 'EB28 growth brief',
        },
      },
    };
  }
  throw new Error(`Unsupported EB28 Buffer platform: ${platform}`);
}

function publicCaption(value, pkg) {
  const caption = compact(value);
  if (caption && !/draft[- ]?only|pending verified|pending channel|ready_for/i.test(caption)) {
    return caption;
  }
  const keyword = compact(pkg.article?.primaryKeyword || pkg.article?.title || 'EB28 growth system');
  return `${keyword}: the practical version. Build the page, show the work, and measure the lead path. Full guide at eb28.co/blog/`;
}

async function createBufferPost(input) {
  const query = `
    mutation CreateEb28BufferPost {
      createPost(input: ${gqlValue(input)}) {
        ... on PostActionSuccess {
          post {
            id
            text
            assets {
              id
              mimeType
            }
          }
        }
        ... on MutationError {
          message
        }
      }
    }
  `;
  const data = await bufferRequest(query);
  const result = data.createPost;
  if (result?.message) {
    throw new Error(`Buffer createPost failed: ${result.message}`);
  }
  if (!result?.post?.id) {
    throw new Error(`Buffer createPost returned no post id: ${JSON.stringify(result)}`);
  }
  return result.post;
}

async function publish(pkg, context, options) {
  if (!options.dryRun && !isEnabled()) {
    console.log(JSON.stringify({ ok: true, status: 'skipped', reason: 'EB28_SOCIAL_POSTING_ENABLED is not true' }, null, 2));
    return;
  }

  const state = await readJson(STATE_FILE, { publishedRuns: {} });
  if (!options.force && state.publishedRuns?.[context.runId]) {
    console.log(JSON.stringify({ ok: true, status: 'already_published', runId: context.runId, receipt: state.publishedRuns[context.runId] }, null, 2));
    return;
  }

  const assetUrl = pkg.bufferAsset?.publicUrl || publicAssetUrl(context.runId);
  const platforms = parsePlatformAllowlist();
  const channelMap = parseChannelMap();
  const missing = platforms.filter((platform) => !channelMap[platform]);
  if (missing.length) {
    throw new Error(`Missing exact Buffer channel IDs for: ${missing.join(', ')}`);
  }

  const plan = platforms.map((platform) => ({
    platform,
    channelId: channelMap[platform],
    input: postForPlatform(platform, pkg, assetUrl, channelMap[platform]),
  }));

  if (options.dryRun) {
    console.log(JSON.stringify({ ok: true, status: 'dry_run', runId: context.runId, assetUrl, posts: plan }, null, 2));
    return;
  }

  const bufferContext = await getBufferContext();
  const receiptPosts = [];

  for (const item of plan) {
    const channel = findAndValidateChannel({
      platform: item.platform,
      channelId: item.channelId,
      channels: bufferContext.channels,
    });
    const post = await createBufferPost(item.input);
    receiptPosts.push({
      platform: item.platform,
      channelId: channel.id,
      channelName: channel.displayName || channel.name,
      bufferPostId: post.id,
    });
  }

  const receipt = {
    ok: true,
    status: 'published_to_buffer',
    runId: context.runId,
    createdAt: new Date().toISOString(),
    accountEmail: bufferContext.account.email,
    organizationId: bufferContext.organization.id,
    organizationName: bufferContext.organization.name,
    assetUrl,
    posts: receiptPosts,
  };
  const receiptPath = path.join(OUTPUT_DIR, `buffer-publish-${context.runId}.json`);
  await writeJson(receiptPath, receipt);
  await writeJson(STATE_FILE, {
    ...state,
    updatedAt: receipt.createdAt,
    publishedRuns: {
      ...(state.publishedRuns || {}),
      [context.runId]: {
        receiptPath: path.relative(ROOT, receiptPath),
        createdAt: receipt.createdAt,
        posts: receiptPosts,
      },
    },
  });
  console.log(JSON.stringify(receipt, null, 2));
}

async function main() {
  const options = parseArgs(process.argv);
  const context = resolvePackagePath(options);
  const pkg = await readJson(context.packagePath, null);
  if (!pkg) throw new Error(`EB28 social package not found: ${context.packagePath}`);

  if (options.mode === 'prepare') {
    await prepareAsset(pkg, context);
  } else {
    await publish(pkg, context, options);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
