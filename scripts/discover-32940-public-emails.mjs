#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pipelinePath = path.join(repoRoot, 'output', 'lead-ops', '32940-prospect-pipeline.json');
const outPath = path.join(repoRoot, 'scripts', 'data', '32940-public-email-overrides.json');

const fetchTimeoutMs = 5000;
const maxCandidatesPerProspect = 6;
const concurrency = 5;
const contactPaths = [
  '/',
  '/contact',
  '/contact/',
  '/contact-us',
  '/contact-us/',
  '/about',
  '/about/',
  '/about-us',
  '/about-us/',
];

const blockedPrefixes = new Set([
  'abuse',
  'accessibility',
  'canadacare',
  'clientservices',
  'customercare',
  'customerservice',
  'donotreply',
  'do-not-reply',
  'legal',
  'mwlistens',
  'noreply',
  'no-reply',
  'privacy',
  'reviews',
  'security',
  'webmaster',
  'wecare',
]);

const blockedDomains = new Set([
  'a11y.com',
  'buyatab.com',
  'example.com',
  'fresha.com',
  'idp.att.com',
  'kahalamgmt.com',
  'sentry.io',
  'w3.org',
]);

const blockedAutoEmailSlugs = new Set([
  'aerie',
  'american-eagle',
  'att-wireless',
  'bonefish-grill',
  'chicos',
  'cold-stone-creamery',
  'ethan-allen',
  'five-guys-burgers-and-fries',
  'gifts-more-at-the-paper-store',
  'j-crew-factory',
  'j-mclaughlin',
  'kendra-scott',
  'lilly-pulitzer',
  'loft',
  'lululemon',
  'mens-wearhouse',
  'nothing-bundt-cakes',
  'sephora',
  'skin-laundry',
  'sola-salons',
  'soma',
  'southern-tide',
  'sport-clips',
  'the-good-feet-store',
  'tommy-bahama',
  'warby-parker',
  'world-market',
]);

const freeEmailDomains = new Set([
  'aol.com',
  'gmail.com',
  'hotmail.com',
  'icloud.com',
  'live.com',
  'me.com',
  'msn.com',
  'outlook.com',
  'proton.me',
  'protonmail.com',
  'yahoo.com',
]);

function decodeHtml(value = '') {
  return String(value)
    .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function normalizeEmail(value = '') {
  return decodeHtml(value)
    .replace(/^mailto:/i, '')
    .split('?')[0]
    .trim()
    .toLowerCase();
}

function emailDomain(email = '') {
  return email.split('@')[1] ?? '';
}

function rootDomain(hostname = '') {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  const parts = host.split('.').filter(Boolean);
  if (parts.length <= 2) {
    return host;
  }
  return parts.slice(-2).join('.');
}

function businessTokens(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4 && !['viera', 'melbourne', 'florida', 'suite', 'restaurant'].includes(token));
}

function looksLikeEmail(value = '') {
  return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(value);
}

function isBlockedEmail(email = '') {
  if (!looksLikeEmail(email)) {
    return true;
  }

  const [local, domain] = email.split('@');
  if (blockedPrefixes.has(local) || blockedDomains.has(domain)) {
    return true;
  }

  return /\.(png|jpg|jpeg|gif|webp|svg|css|js|woff|woff2|ttf)$/i.test(email);
}

function isBusinessRelevantEmail(email, prospect, sourceUrl) {
  const domain = emailDomain(email);
  const hostRoot = rootDomain(new URL(sourceUrl).hostname);
  const emailRoot = rootDomain(domain);
  const tokens = businessTokens(`${prospect.business} ${prospect.slug}`);
  const normalizedLocal = email.split('@')[0].replace(/[^a-z0-9]/g, '');
  const normalizedDomain = emailRoot.replace(/[^a-z0-9]/g, '');
  const localTokens = ['viera', 'melbourne', 'suntree', 'beachside'];
  const directContactPrefixes = new Set([
    'admin',
    'appointments',
    'booking',
    'contact',
    'flowers',
    'hello',
    'info',
    'manager',
    'office',
    'reservations',
    'sales',
    'service',
    'staff',
  ]);
  const tokenMatches = tokens.filter((token) => normalizedLocal.includes(token) || normalizedDomain.includes(token));
  const hasLocalToken = localTokens.some((token) => normalizedLocal.includes(token) || normalizedDomain.includes(token));

  if (blockedAutoEmailSlugs.has(prospect.slug)) {
    return false;
  }

  if (emailRoot === hostRoot && directContactPrefixes.has(normalizedLocal)) {
    return true;
  }

  if (freeEmailDomains.has(domain)) {
    return tokenMatches.length > 0 || hasLocalToken;
  }

  if (emailRoot === hostRoot) {
    return hasLocalToken || tokenMatches.length >= 1;
  }

  return hasLocalToken || tokenMatches.length >= 2;
}

function extractEmailsFromHtml(html, sourceUrl, prospect) {
  const decoded = decodeHtml(html);
  const mailtoEmails = [...decoded.matchAll(/mailto:([^"'<>?\s]+)/gi)]
    .map((match) => normalizeEmail(match[1]));
  const textEmails = [...decoded.matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)]
    .map((match) => normalizeEmail(match[0]));
  const deobfuscated = decodeHtml(decoded)
    .replace(/\s*(?:\[|\()?at(?:\]|\))\s*/gi, '@')
    .replace(/\s*(?:\[|\()?dot(?:\]|\))\s*/gi, '.');
  const deobfuscatedEmails = [...deobfuscated.matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)]
    .map((match) => normalizeEmail(match[0]));

  return [...new Set([...mailtoEmails, ...textEmails, ...deobfuscatedEmails])]
    .filter((email) => !isBlockedEmail(email))
    .filter((email) => isBusinessRelevantEmail(email, prospect, sourceUrl))
    .map((email) => ({
      email,
      sourceUrl,
      sourceKind: mailtoEmails.includes(email) ? 'mailto' : 'public page text',
    }));
}

function safeUrl(value = '') {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function sourceUrlsForProspect(prospect) {
  const sources = new Set();
  for (const value of [prospect.website, ...(prospect.sourceUrls ?? [])]) {
    const url = safeUrl(value);
    if (!url) {
      continue;
    }

    sources.add(url.toString());

    if (!url.hostname.includes('avenueviera.com')) {
      for (const contactPath of contactPaths) {
        const derived = new URL(contactPath, url.origin);
        sources.add(derived.toString());
      }
    }
  }

  return [...sources]
    .filter((sourceUrl) => !sourceUrl.includes('eb28.co/32940/'))
    .slice(0, maxCandidatesPerProspect);
}

async function fetchHtml(sourceUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), fetchTimeoutMs);

  try {
    const response = await fetch(sourceUrl, {
      headers: {
        'user-agent': 'EB28LeadOpsEmailDiscovery/1.0',
        accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType && !/text|html|xml/i.test(contentType)) {
      throw new Error(`unsupported content-type ${contentType}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function pickBestCandidate(candidates) {
  const scored = candidates.map((candidate) => {
    const source = safeUrl(candidate.sourceUrl);
    const emailRoot = rootDomain(emailDomain(candidate.email));
    const sourceRoot = source ? rootDomain(source.hostname) : '';
    const score = [
      candidate.sourceKind === 'mailto' ? 40 : 0,
      emailRoot === sourceRoot ? 30 : 0,
      /contact|about/i.test(candidate.sourceUrl) ? 20 : 0,
      freeEmailDomains.has(emailDomain(candidate.email)) ? 10 : 0,
      /^(info|hello|contact|admin|office|customerservice|service|sales)@/i.test(candidate.email) ? 5 : 0,
    ].reduce((sum, value) => sum + value, 0);

    return { ...candidate, score };
  });

  scored.sort((a, b) => b.score - a.score || a.email.localeCompare(b.email));
  return scored[0] ?? null;
}

async function discoverForProspect(prospect) {
  const sourceUrls = sourceUrlsForProspect(prospect);
  const candidates = [];
  const failures = [];

  for (const sourceUrl of sourceUrls) {
    try {
      const html = await fetchHtml(sourceUrl);
      candidates.push(...extractEmailsFromHtml(html, sourceUrl, prospect));
    } catch (error) {
      failures.push({ sourceUrl, error: error.message });
    }
  }

  const uniqueCandidates = [...new Map(candidates.map((candidate) => [candidate.email, candidate])).values()];
  const best = pickBestCandidate(uniqueCandidates);

  if (!best) {
    return { prospect, sourceUrls, failures, best: null, candidates: uniqueCandidates };
  }

  return { prospect, sourceUrls, failures, best, candidates: uniqueCandidates };
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = [];
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

async function main() {
  const raw = await fs.readFile(pipelinePath, 'utf8');
  const parsed = JSON.parse(raw);
  const prospects = parsed.prospects;
  const results = await mapWithConcurrency(prospects, concurrency, discoverForProspect);
  const overrides = {};

  for (const result of results) {
    if (!result.best) {
      continue;
    }

    overrides[result.prospect.slug] = {
      email: result.best.email,
      sourceUrls: [...new Set([result.best.sourceUrl, ...(result.prospect.sourceUrls ?? [])])],
      sourceType: result.best.sourceKind === 'mailto'
        ? 'public mailto link on business website'
        : 'public email on business website',
      notes: `Auto-discovered public email from ${result.best.sourceUrl}; verify decision maker before sending.`,
    };
  }

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, `${JSON.stringify(overrides, null, 2)}\n`, 'utf8');

  const noEmail = results.filter((result) => !result.best).length;
  const failedFetches = results.reduce((sum, result) => sum + result.failures.length, 0);
  console.log(JSON.stringify({
    output: path.relative(repoRoot, outPath),
    prospectsChecked: prospects.length,
    emailsDiscovered: Object.keys(overrides).length,
    noEmail,
    failedFetches,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
