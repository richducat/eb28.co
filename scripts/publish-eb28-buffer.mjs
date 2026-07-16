#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { assertPublishingAuthorized } from './lib/eb28-social-publish-policy.mjs';
import { assertSocialAccountArchitecture } from './lib/eb28-social-account-policy.mjs';
import { renderSocialAssetSet } from './lib/eb28-social-visuals.mjs';

const ROOT = process.cwd();
const OUTPUT_DIR = path.join(ROOT, 'output', 'eb28-social');
const ASSET_DIR = path.join(OUTPUT_DIR, 'assets');
const STATE_FILE = path.join(OUTPUT_DIR, 'buffer-publish-state.json');
const ACCOUNT_ARCHITECTURE_FILE = path.join(ROOT, 'content', 'eb28', 'social-account-architecture.json');
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
    } else if (arg === '--verify') {
      options.mode = 'verify';
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
    throw new Error('Choose one mode: --prepare, --verify, or --publish');
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/publish-eb28-buffer.mjs --prepare|--verify|--publish [options]

Options:
  --date YYYY-MM-DD       Content date. Defaults to America/New_York today.
  --slot am|pm|auto       Content slot. Defaults to auto.
  --package PATH          Explicit social package path.
  --dry-run               Print publish plan without calling Buffer.
  --force                 Publish even if the runId is already in the local state file.

--verify is read-only. It checks the API account, organization, exact channel IDs,
platforms, channel ownership, disconnection state, and queue pause state without
creating, scheduling, editing, or deleting a post.

Required env for --publish when EB28_SOCIAL_POSTING_ENABLED=true:
  BUFFER_API_KEY
  EB28_BUFFER_ORGANIZATION_ID
  EB28_BUFFER_CHANNELS              JSON or csv map, e.g. {"instagram":"...","tiktok":"..."}

Recommended safety env:
  EB28_BUFFER_EXPECTED_ACCOUNT_EMAIL=social@eb28.co
  EB28_BUFFER_PLATFORM_ALLOWLIST=instagram,tiktok
  EB28_SOCIAL_MEDIA_BASE_URL=https://raw.githubusercontent.com/<owner>/<repo>/main/output/eb28-social/assets`);
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

function inferRunIdFromPackagePath(packagePath) {
  const basename = path.basename(packagePath);
  const match = basename.match(/^eb28-content-(\d{4}-\d{2}-\d{2}-(?:am|pm))\.json$/);
  return match?.[1] || '';
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

function resolvePackageContext(options, pkg) {
  const context = resolvePackagePath(options);
  if (!options.packagePath) return context;

  const packageRunId = compact(pkg?.runId);
  const pathRunId = inferRunIdFromPackagePath(context.packagePath);
  if (packageRunId && pathRunId && packageRunId !== pathRunId) {
    throw new Error(
      `EB28 social package runId mismatch: package has ${packageRunId}, but filename implies ${pathRunId}. Refusing to prepare or publish mixed assets.`,
    );
  }
  const runId = packageRunId || pathRunId;
  if (!runId) {
    throw new Error('Explicit EB28 social packages must declare runId or use output/eb28-social/eb28-content-YYYY-MM-DD-am|pm.json naming.');
  }
  const [date, slot] = runId.match(/^(\d{4}-\d{2}-\d{2})-(am|pm)$/)?.slice(1) || [];
  if (!date || !slot) {
    throw new Error(`Invalid EB28 social package runId: ${runId}`);
  }

  return {
    ...context,
    date,
    slot,
    runId,
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

function publicAssetUrl(runId) {
  return `${socialAssetBaseUrl()}/${encodeURIComponent(runId)}/feed-01-cover.jpg`;
}

function socialAssetBaseUrl() {
  const base = compact(process.env.EB28_SOCIAL_MEDIA_BASE_URL) || 'https://raw.githubusercontent.com/richducat/eb28.co/main/output/eb28-social/assets';
  return base.replace(/\/+$/, '');
}

function fallbackCreativeSystem(pkg) {
  const title = pkg.article?.title || 'EB28 growth field note';
  const hook = compact(pkg.posts?.shortFormVideo?.hook || pkg.posts?.instagram?.caption || title);
  return {
    version: '2026-07-social-v2',
    pillar: compact(pkg.article?.cluster || 'Growth system'),
    objective: 'qualified_attention',
    eyebrow: `${String(pkg.slot || 'EB28').toUpperCase()} FIELD NOTE`,
    headline: hook || title,
    subhead: `${title}. Find the constraint, build one useful fix, and measure the handoff.`,
    theme: 'cobalt',
    feature: {
      name: 'EB28 operating guide',
      status: 'active',
      promise: 'A practical path from buyer problem to measurable next step.',
      features: [
        'Buyer-path diagnostic',
        'One focused first fix',
        'A measurement and accountable handoff',
      ],
    },
    steps: [
      { label: 'Find the constraint', value: 'Identify the exact buyer problem and the point where confidence or context is lost.' },
      { label: 'Build the first fix', value: 'Ship the smallest useful improvement before adding another tool or channel.' },
      { label: 'Measure the handoff', value: 'Track the qualified next step and the time to a useful response.' },
    ],
    metric: {
      label: 'What to measure',
      value: 'Qualified enquiries and completed handoffs, not clicks or activity alone.',
    },
    cta: {
      label: 'Read the full EB28 field guide',
      url: pkg.article?.url || 'https://eb28.co/blog/',
    },
    disclaimer: 'Keep claims evidence-based and consequential decisions accountable to a person.',
  };
}

async function prepareAsset(pkg, context) {
  if (!pkg?.article?.title) {
    throw new Error(`Invalid EB28 social package: missing article.title in ${context.packagePath}`);
  }

  const creativeSystem = pkg.creativeSystem || fallbackCreativeSystem(pkg);
  const featureId = compact(pkg.featureSpotlight?.id || creativeSystem.feature?.id);
  const proofImagePath = featureId ? path.join(OUTPUT_DIR, 'proof-captures', `${featureId}.jpg`) : '';
  let proofImageExists = false;
  if (proofImagePath) {
    try {
      await fs.access(proofImagePath);
      proofImageExists = true;
    } catch {
      proofImageExists = false;
    }
  }
  const visualAssets = await renderSocialAssetSet({
    creative: creativeSystem,
    rootDir: ROOT,
    outputDir: ASSET_DIR,
    fileBase: context.runId,
    publicBaseUrl: socialAssetBaseUrl(),
    proofImagePath: proofImageExists ? proofImagePath : '',
  });
  const coverAsset = visualAssets.instagramCarousel[0];

  const nextPkg = {
    ...pkg,
    creativeSystem,
    visualAssets,
    bufferAsset: coverAsset,
    posts: {
      ...pkg.posts,
      facebook: pkg.posts?.facebook ? { ...pkg.posts.facebook, media: visualAssets.landscape } : pkg.posts?.facebook,
      instagram: pkg.posts?.instagram
        ? { ...pkg.posts.instagram, media: { type: 'carousel', items: visualAssets.instagramCarousel } }
        : pkg.posts?.instagram,
      linkedin: pkg.posts?.linkedin ? { ...pkg.posts.linkedin, media: visualAssets.landscape } : pkg.posts?.linkedin,
      x: pkg.posts?.x ? { ...pkg.posts.x, media: visualAssets.landscape } : pkg.posts?.x,
      shortFormVideo: pkg.posts?.shortFormVideo
        ? { ...pkg.posts.shortFormVideo, media: visualAssets.vertical }
        : pkg.posts?.shortFormVideo,
    },
    socialPublishGuard: {
      status: 'assets_ready_connection_unverified',
      note: 'Assets are ready. External publishing still requires explicit package authorization plus a fresh read-only verification of the EB28 API account, organization, exact channel IDs, and channel state.',
    },
  };

  await writeJson(context.packagePath, nextPkg);
  console.log(JSON.stringify({ ok: true, status: 'prepared', runId: context.runId, visualAssets }, null, 2));
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
    throw new Error(`EB28 Buffer account mismatch: API account is ${account?.email || 'unknown'}, expected ${expectedEmail}.`);
  }

  const organizationId = compact(process.env.EB28_BUFFER_ORGANIZATION_ID);
  if (!organizationId) {
    throw new Error('EB28_BUFFER_ORGANIZATION_ID is required. Do not guess Buffer organization IDs.');
  }

  const organization = (account.organizations || []).find((item) => item.id === organizationId);
  if (!organization) {
    throw new Error(`EB28 Buffer organization mismatch: ${organizationId} is not available to ${account.email}.`);
  }

  const channelData = await bufferRequest(`
    query GetEb28BufferChannels {
      channels(input: { organizationId: ${JSON.stringify(organizationId)} }) {
        id
        name
        displayName
        service
        isQueuePaused
        isDisconnected
        isLocked
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
    throw new Error(`EB28 ${platform} channel verification failed: ${channelId} was not returned by Buffer.`);
  }
  if (compact(channel.service).toLowerCase() !== platform) {
    throw new Error(`EB28 ${platform} channel verification failed: ${channelId} is service ${channel.service}.`);
  }
  if (channel.isQueuePaused) {
    throw new Error(`EB28 ${platform} channel verification failed: ${channel.displayName || channel.name} queue is paused.`);
  }
  if (channel.isDisconnected) {
    throw new Error(`EB28 ${platform} channel verification failed: ${channel.displayName || channel.name} is disconnected.`);
  }
  if (channel.isLocked) {
    throw new Error(`EB28 ${platform} channel verification failed: ${channel.displayName || channel.name} is locked.`);
  }
  const visibleName = `${channel.name || ''} ${channel.displayName || ''}`.toLowerCase();
  if (!visibleName.includes('eb28')) {
    throw new Error(`EB28 ${platform} channel verification failed: "${channel.displayName || channel.name}" does not look EB28-owned.`);
  }
  return channel;
}

async function verifyConnections() {
  const architecture = await readJson(ACCOUNT_ARCHITECTURE_FILE, null);
  if (!architecture) throw new Error(`Missing EB28 social account architecture: ${ACCOUNT_ARCHITECTURE_FILE}`);
  const platforms = parsePlatformAllowlist();
  const channelMap = parseChannelMap();
  const missing = platforms.filter((platform) => !channelMap[platform]);
  if (missing.length) {
    throw new Error(`Missing exact Buffer channel IDs for: ${missing.join(', ')}`);
  }

  const bufferContext = await getBufferContext();
  const architectureEmail = compact(architecture.publishingPolicy?.expectedBufferAccountEmail).toLowerCase();
  if (architectureEmail && compact(bufferContext.account.email).toLowerCase() !== architectureEmail) {
    throw new Error(`EB28 account architecture expects ${architectureEmail}, but Buffer returned ${bufferContext.account.email}.`);
  }
  const channels = platforms.map((platform) => {
    const channel = findAndValidateChannel({
      platform,
      channelId: channelMap[platform],
      channels: bufferContext.channels,
    });
    return {
      platform,
      id: channel.id,
      name: channel.displayName || channel.name,
      isQueuePaused: Boolean(channel.isQueuePaused),
      isDisconnected: Boolean(channel.isDisconnected),
      isLocked: Boolean(channel.isLocked),
    };
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        status: 'connection_verified_read_only',
        checkedAt: new Date().toISOString(),
        accountEmail: bufferContext.account.email,
        organizationId: bufferContext.organization.id,
        organizationName: bufferContext.organization.name,
        postingEnabledFlag: isEnabled(),
        platforms,
        channels,
        publishingReadiness: {
          ready:
            architecture.decision?.status === 'approved' &&
            architecture.publishingPolicy?.status === 'approved' &&
            architecture.publishingPolicy?.externalPublishing === 'authorized' &&
            (architecture.publishingPolicy?.allowedLanes || []).length > 0,
          decisionStatus: architecture.decision?.status || 'unknown',
          policyStatus: architecture.publishingPolicy?.status || 'unknown',
          allowedLanes: architecture.publishingPolicy?.allowedLanes || [],
          note: architecture.decision?.recommendation || architecture.publishingPolicy?.unblockRequirements?.[0] || '',
        },
        mutationCount: 0,
      },
      null,
      2,
    ),
  );
}

function imageAsset(url) {
  return { image: { url } };
}

function imageAssetsForPlatform(platform, pkg, fallbackUrl) {
  if (platform === 'instagram') {
    const carousel = pkg.visualAssets?.instagramCarousel || [];
    const urls = carousel.map((asset) => compact(asset.publicUrl)).filter(Boolean);
    return (urls.length ? urls : [fallbackUrl]).map(imageAsset);
  }
  if (platform === 'tiktok') {
    const verticalUrl = compact(pkg.visualAssets?.vertical?.publicUrl) || fallbackUrl;
    return [imageAsset(verticalUrl)];
  }
  return [imageAsset(fallbackUrl)];
}

function postForPlatform(platform, pkg, channelId) {
  const fallbackUrl = pkg.bufferAsset?.publicUrl || publicAssetUrl(pkg.runId);
  const assets = imageAssetsForPlatform(platform, pkg, fallbackUrl);
  if (platform === 'instagram') {
    const caption = publicCaption(pkg.posts?.instagram?.caption, pkg);
    if (!caption) throw new Error('Missing Instagram caption in EB28 social package.');
    return {
      channelId,
      text: caption,
      schedulingType: enumValue('automatic'),
      mode: enumValue('addToQueue'),
      assets,
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
      assets,
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
  const caption = String(value || '').trim();
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
  if (!options.dryRun) {
    assertPublishingAuthorized(pkg);
    const architecture = await readJson(ACCOUNT_ARCHITECTURE_FILE, null);
    assertSocialAccountArchitecture(pkg, architecture);
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
    input: postForPlatform(platform, pkg, channelMap[platform]),
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
  if (options.mode === 'verify') {
    await verifyConnections();
    return;
  }
  const initialContext = resolvePackagePath(options);
  const pkg = await readJson(initialContext.packagePath, null);
  if (!pkg) throw new Error(`EB28 social package not found: ${initialContext.packagePath}`);
  const context = resolvePackageContext(options, pkg);

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
