#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const SITE_ORIGIN = 'https://eb28.co';
const MELBOURNE_WEB_STUDIO_ORIGIN = 'https://melbournewebstudio.eb28.co';
const DEFAULT_GSC_SITE_URL = process.env.GSC_SITE_URL || 'https://eb28.co/';
const DEFAULT_SITEMAP_URL = process.env.GSC_SITEMAP_URL || `${SITE_ORIGIN}/sitemap.xml`;
const WEBMASTERS_SCOPE = 'https://www.googleapis.com/auth/webmasters';
const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
const ARTICLES_FILE = path.join(ROOT, 'content', 'eb28', 'articles.json');
const OUTPUT_DIR = path.join(ROOT, 'output', 'seo-daily');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    const name = key.trim();
    if (!name || process.env[name]) continue;
    let value = rest.join('=').trim();
    value = value.replace(/^['"]|['"]$/g, '');
    process.env[name] = value;
  }
}

loadEnvFile(path.join(ROOT, '.env.seo.local'));

function parseArgs(argv) {
  const options = {
    safeUpdates: false,
    submitSitemap: false,
    inspectUrls: false,
    sendEmail: false,
    runLighthouse: false,
    deployVercel: false,
    siteUrl: DEFAULT_GSC_SITE_URL,
    sitemapUrl: DEFAULT_SITEMAP_URL,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--safe-updates') options.safeUpdates = true;
    else if (arg === '--submit-sitemap') options.submitSitemap = true;
    else if (arg === '--inspect-urls') options.inspectUrls = true;
    else if (arg === '--send-email') options.sendEmail = true;
    else if (arg === '--run-lighthouse') options.runLighthouse = true;
    else if (arg === '--deploy-vercel') options.deployVercel = true;
    else if (arg === '--site-url') {
      options.siteUrl = next || options.siteUrl;
      index += 1;
    } else if (arg === '--sitemap-url') {
      options.sitemapUrl = next || options.sitemapUrl;
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/eb28-seo-daily-review.mjs [--safe-updates] [--submit-sitemap] [--inspect-urls] [--send-email] [--run-lighthouse] [--deploy-vercel]');
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function daysAgo(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return toDateOnly(date);
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    ...options,
  });

  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function summarizeCommand(result) {
  const output = result.ok ? result.stdout : result.stderr || result.stdout;
  return String(output || '').trim().split(/\r?\n/).slice(-20).join('\n');
}

function getChromePath() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }

  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

async function readArticles() {
  return JSON.parse(await fsp.readFile(ARTICLES_FILE, 'utf8'));
}

async function getNewestArticles(limit = 5) {
  const articles = await readArticles();
  return [...articles]
    .sort((a, b) => String(b.datePublished || '').localeCompare(String(a.datePublished || '')))
    .slice(0, limit)
    .map((article) => ({
      title: article.title,
      slug: article.slug,
      cluster: article.cluster,
      primaryKeyword: article.primaryKeyword,
      url: `${SITE_ORIGIN}/blog/${article.slug}/`,
      datePublished: article.datePublished,
      dateModified: article.dateModified || article.datePublished,
    }));
}

async function fetchUrlStatus(url) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'user-agent': 'EB28 SEO daily review (+https://eb28.co)',
      },
    });
    const text = await response.text();
    const isMelbourneWebStudioSubdomain = url.startsWith(`${MELBOURNE_WEB_STUDIO_ORIGIN}/`);
    return {
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      contentType: response.headers.get('content-type') || '',
      server: response.headers.get('server') || '',
      bytes: text.length,
      hasIndexableSignals:
        response.ok &&
        !/noindex/i.test(text) &&
        /<title>[\s\S]+<\/title>/i.test(text) &&
        /<link[^>]+rel=["']canonical["']/i.test(text),
      melbourneWebStudioSignals: isMelbourneWebStudioSubdomain
        ? {
            servedByGithubPages: /github/i.test(response.headers.get('server') || ''),
            hasExpectedCanonical: text.includes(`href="${MELBOURNE_WEB_STUDIO_ORIGIN}/"`),
            referencesCurrentAppAssets: /\/assets\/index-[A-Za-z0-9_-]+\.js/.test(text),
            likelyLegacyHost: /litespeed/i.test(response.headers.get('server') || ''),
          }
        : null,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      error: error.message,
    };
  }
}

function base64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }
  if (!response.ok) {
    const message = json?.error?.message || json?.error_description || text || `${response.status} ${response.statusText}`;
    throw new Error(message);
  }
  return json;
}

function getAuthorizedUserCredentials() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REFRESH_TOKEN) {
    return {
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
    };
  }

  const adcPath =
    process.env.GOOGLE_ADC_CREDENTIALS ||
    path.join(os.homedir(), '.config', 'gcloud', 'application_default_credentials.json');
  try {
    const source = JSON.parse(fs.readFileSync(adcPath, 'utf8'));
    if (source?.type === 'authorized_user' && source.client_id && source.client_secret && source.refresh_token) {
      return source;
    }
  } catch {
    return null;
  }

  return null;
}

async function getOAuthTokenFromRefreshToken(scope = WEBMASTERS_SCOPE) {
  const source = getAuthorizedUserCredentials();
  if (!source) return null;

  const body = new URLSearchParams({
    client_id: source.client_id,
    client_secret: source.client_secret,
    refresh_token: source.refresh_token,
    grant_type: 'refresh_token',
  });
  if (scope) body.set('scope', scope);

  const json = await requestJson('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  return json.access_token;
}

async function getOAuthTokenFromServiceAccount(scope = WEBMASTERS_SCOPE) {
  const source = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
    : process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_SERVICE_ACCOUNT_FILE
      ? JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_SERVICE_ACCOUNT_FILE, 'utf8'))
      : null;

  if (!source?.client_email || !source?.private_key) return null;

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: source.client_email,
    scope,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claim))}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(source.private_key);
  const assertion = `${unsigned}.${base64Url(signature)}`;

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });

  const json = await requestJson('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  return json.access_token;
}

async function getAccessToken(scope = WEBMASTERS_SCOPE) {
  if (process.env.GOOGLE_ACCESS_TOKEN) return process.env.GOOGLE_ACCESS_TOKEN;
  const refreshToken = await getOAuthTokenFromRefreshToken(scope);
  if (refreshToken) return refreshToken;
  return getOAuthTokenFromServiceAccount(scope);
}

async function submitSitemap({ siteUrl, sitemapUrl }) {
  const token = await getAccessToken(WEBMASTERS_SCOPE);
  if (!token) {
    return {
      ok: false,
      skipped: true,
      reason:
        'Missing Search Console credentials. Configure OAuth credentials with the webmasters scope, Google application-default credentials, or a Search Console-authorized service account.',
    };
  }

  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(sitemapUrl)}`;
  try {
    await requestJson(url, {
      method: 'PUT',
      headers: { authorization: `Bearer ${token}` },
    });
    return { ok: true, siteUrl, sitemapUrl };
  } catch (error) {
    return { ok: false, siteUrl, sitemapUrl, error: error.message };
  }
}

async function getSearchAnalytics({
  siteUrl,
  dimensions = ['query'],
  rowLimit = 50,
  startDate = daysAgo(31),
  endDate = daysAgo(3),
} = {}) {
  const token = await getAccessToken(WEBMASTERS_SCOPE);
  if (!token) {
    return {
      ok: false,
      skipped: true,
      reason: 'Missing Search Console credentials for Search Analytics average-position pull.',
      dimensions,
      rows: [],
    };
  }

  const body = {
    startDate,
    endDate,
    dimensions,
    rowLimit,
    type: 'web',
  };

  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  try {
    const json = await requestJson(url, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    return {
      ok: true,
      dateRange: `${body.startDate} to ${body.endDate}`,
      dimensions,
      rows: (json.rows || []).map((row) => ({
        query: row.keys?.[dimensions.indexOf('query')] || '',
        page: row.keys?.[dimensions.indexOf('page')] || '',
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      })),
    };
  } catch (error) {
    return { ok: false, error: error.message, dimensions, rows: [] };
  }
}

async function inspectUrls({ siteUrl, urls }) {
  const token = await getAccessToken(WEBMASTERS_SCOPE);
  if (!token) {
    return {
      ok: false,
      skipped: true,
      reason: 'Missing Search Console credentials for URL Inspection.',
      results: [],
    };
  }

  const results = [];
  for (const inspectionUrl of urls) {
    try {
      const json = await requestJson('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          inspectionUrl,
          siteUrl,
          languageCode: 'en-US',
        }),
      });
      const verdict = json.inspectionResult?.indexStatusResult?.verdict || 'UNKNOWN';
      const coverageState = json.inspectionResult?.indexStatusResult?.coverageState || 'Unknown';
      results.push({
        ok: true,
        url: inspectionUrl,
        verdict,
        coverageState,
        inspectionResultLink: json.inspectionResult?.inspectionResultLink || '',
      });
    } catch (error) {
      results.push({ ok: false, url: inspectionUrl, error: error.message });
    }
  }

  return {
    ok: results.every((result) => result.ok),
    results,
  };
}

function renderAnalyticsRows(rows, { includePage = true } = {}) {
  if (!rows?.length) return 'No Search Console rows returned.';
  const headers = includePage
    ? '| Query | Page | Clicks | Impr. | CTR | Avg. position |'
    : '| Query | Clicks | Impr. | CTR | Avg. position |';
  const separator = includePage
    ? '| --- | --- | ---: | ---: | ---: | ---: |'
    : '| --- | ---: | ---: | ---: | ---: |';
  return [
    headers,
    separator,
    ...rows.slice(0, 20).map((row) => {
      const ctr = `${(Number(row.ctr || 0) * 100).toFixed(1)}%`;
      const position = Number(row.position || 0).toFixed(1);
      const safeQuery = row.query.replace(/\|/g, '/');
      if (!includePage) {
        return `| ${safeQuery} | ${row.clicks} | ${row.impressions} | ${ctr} | ${position} |`;
      }
      return `| ${safeQuery} | ${row.page.replace(/\|/g, '/')} | ${row.clicks} | ${row.impressions} | ${ctr} | ${position} |`;
    }),
  ].join('\n');
}

function getStrikingDistanceRows(rows, limit = 8) {
  return (rows || [])
    .filter((row) => Number(row.position) >= 4 && Number(row.position) <= 20 && Number(row.impressions) > 0)
    .sort((a, b) => Number(b.impressions) - Number(a.impressions) || Number(a.position) - Number(b.position))
    .slice(0, limit);
}

function getHighPerformingPages(rows, limit = 5) {
  const byPage = new Map();
  for (const row of rows || []) {
    if (!row.page) continue;
    const current = byPage.get(row.page) || {
      page: row.page,
      clicks: 0,
      impressions: 0,
      weightedPositionTotal: 0,
      topQueries: [],
    };
    current.clicks += Number(row.clicks || 0);
    current.impressions += Number(row.impressions || 0);
    current.weightedPositionTotal += Number(row.position || 0) * Math.max(1, Number(row.impressions || 0));
    current.topQueries.push(row);
    byPage.set(row.page, current);
  }

  return [...byPage.values()]
    .map((page) => ({
      ...page,
      position: page.impressions ? page.weightedPositionTotal / page.impressions : 0,
      topQueries: page.topQueries
        .sort((a, b) => Number(b.impressions) - Number(a.impressions) || Number(a.position) - Number(b.position))
        .slice(0, 3),
    }))
    .sort((a, b) => Number(b.clicks) - Number(a.clicks) || Number(b.impressions) - Number(a.impressions))
    .slice(0, limit);
}

function buildInternalLinkActions(newestArticles, pageAnalytics) {
  const highPages = getHighPerformingPages(pageAnalytics.rows || [], 5);
  const targets = newestArticles.slice(0, 3);

  if (!targets.length) {
    return ['- No newest article targets found. Run the content engine before the SEO review.'];
  }

  if (!highPages.length) {
    return [
      `- Search Console page rows are unavailable, so use owned authority pages as source links today: ${SITE_ORIGIN}/, ${SITE_ORIGIN}/melbournewebstudio/, and ${SITE_ORIGIN}/blog/.`,
      ...targets.map((article) => `- Add or verify contextual links into ${article.url} from the homepage, Melbourne Web Studio page, and the blog hub.`),
    ];
  }

  return highPages.flatMap((source) =>
    targets.map((article) => {
      const queryNote = source.topQueries.length
        ? ` Top query: "${source.topQueries[0].query}" at avg. position ${Number(source.topQueries[0].position).toFixed(1)}.`
        : '';
      return `- From ${source.page}, add a contextual link to ${article.url} using a natural anchor around "${article.primaryKeyword}".${queryNote}`;
    }),
  );
}

function targetHrefCandidates(targetUrl) {
  const url = new URL(targetUrl);
  const pathname = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
  return [targetUrl, `${SITE_ORIGIN}${pathname}`, pathname, pathname.replace(/\/$/, '')];
}

function sourceUrlFromPage(page) {
  if (!page) return null;
  if (/^https?:\/\//i.test(page)) return page;
  return `${SITE_ORIGIN}${page.startsWith('/') ? page : `/${page}`}`;
}

function defaultInternalLinkSources() {
  return [`${SITE_ORIGIN}/`, `${SITE_ORIGIN}/melbournewebstudio/`, `${SITE_ORIGIN}/blog/`];
}

async function verifyInternalLinkCoverage(newestArticles, pageAnalytics) {
  const targets = newestArticles.slice(0, 3);
  if (!targets.length) return [];

  const highPages = getHighPerformingPages(pageAnalytics.rows || [], 5)
    .map((row) => sourceUrlFromPage(row.page))
    .filter(Boolean);
  const sourceUrls = [...new Set(highPages.length ? highPages : defaultInternalLinkSources())];
  const coverage = [];

  for (const sourceUrl of sourceUrls) {
    let html = '';
    let status = 0;
    let ok = false;
    try {
      const response = await fetch(sourceUrl, {
        headers: { 'user-agent': 'EB28 SEO internal link verifier (+https://eb28.co)' },
      });
      status = response.status;
      ok = response.ok;
      html = await response.text();
    } catch (error) {
      coverage.push({
        sourceUrl,
        ok: false,
        status,
        error: error.message,
        links: targets.map((target) => ({ target, present: false })),
      });
      continue;
    }

    coverage.push({
      sourceUrl,
      ok,
      status,
      links: targets.map((target) => ({
        target,
        present: targetHrefCandidates(target.url).some((candidate) => html.includes(`href="${candidate}"`) || html.includes(`href='${candidate}'`)),
      })),
    });
  }

  return coverage;
}

function renderInternalLinkCoverage(coverage) {
  if (!coverage.length) return ['- No internal-link coverage checks ran.'];
  return coverage.flatMap((source) => {
    if (!source.ok) {
      return [`- ${source.sourceUrl}: unable to verify (${source.status || 0}${source.error ? `, ${source.error}` : ''}).`];
    }
    return source.links.map(({ target, present }) => {
      const anchor = `"${target.primaryKeyword || target.title}"`;
      return `- ${source.sourceUrl} ${present ? 'links to' : 'is missing a link to'} ${target.url} using a natural anchor target around ${anchor}.`;
    });
  });
}

async function runLighthouse(urls) {
  const results = [];
  const chromePath = getChromePath();
  const chromeFlagAttempts = [
    '--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage',
    '--headless --no-sandbox --disable-gpu --disable-dev-shm-usage',
  ];

  for (const url of urls) {
    const outPath = path.join(OUTPUT_DIR, `lighthouse-${url.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '-')}.json`);
    let result = null;
    fs.rmSync(outPath, { force: true });
    for (const chromeFlags of chromeFlagAttempts) {
      const chromeUserDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eb28-lh-chrome-'));
      result = runCommand('npx', [
        '--yes',
        'lighthouse',
        url,
        '--quiet',
        `--chrome-flags=${chromeFlags} --user-data-dir=${chromeUserDataDir}`,
        '--only-categories=performance,seo,best-practices,accessibility',
        '--output=json',
        `--output-path=${outPath}`,
      ], chromePath ? { env: { ...process.env, CHROME_PATH: chromePath } } : {});
      fs.rmSync(chromeUserDataDir, { recursive: true, force: true });
      if (result.ok) break;
    }
    let scores = null;
    let metrics = null;
    if (fs.existsSync(outPath)) {
      try {
        const json = JSON.parse(fs.readFileSync(outPath, 'utf8'));
        scores = Object.fromEntries(
          Object.entries(json.categories || {}).map(([key, category]) => [key, Math.round(Number(category.score || 0) * 100)]),
        );
        const audits = json.audits || {};
        metrics = {
          lcp: audits['largest-contentful-paint']?.displayValue || null,
          cls: audits['cumulative-layout-shift']?.displayValue || null,
          tbt: audits['total-blocking-time']?.displayValue || null,
          speedIndex: audits['speed-index']?.displayValue || null,
          unusedJs: audits['unused-javascript']?.displayValue || null,
        };
      } catch {
        scores = null;
        metrics = null;
      }
    }
    results.push({
      url,
      ok: Boolean(result.ok || scores),
      scores,
      metrics,
      outputPath: scores ? outPath : null,
      summary: summarizeCommand(result),
    });
  }
  return results;
}

async function sendReportEmail({ subject, report }) {
  if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
    try {
      const json = await requestJson('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL,
          to: ['social@eb28.co'],
          subject,
          text: report,
        }),
      });
      return { ok: true, provider: 'resend', id: json.id || null };
    } catch (error) {
      return { ok: false, provider: 'resend', error: error.message };
    }
  }

  const token = await getAccessToken(`${WEBMASTERS_SCOPE} ${GMAIL_SEND_SCOPE}`).catch(() => null);
  if (!token) {
    const formSubmit = await sendViaFormSubmit({ subject, report });
    if (formSubmit.ok) return formSubmit;
    return {
      ok: false,
      skipped: true,
      reason: 'Missing email credentials. Configure RESEND_API_KEY + RESEND_FROM_EMAIL, Gmail OAuth with gmail.send scope, or keep FormSubmit available.',
      fallback: formSubmit,
    };
  }

  const from = process.env.GMAIL_FROM_EMAIL || 'richducat@gmail.com';
  const raw = [
    `To: social@eb28.co`,
    `From: ${from}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    report,
  ].join('\r\n');

  try {
    const json = await requestJson('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ raw: Buffer.from(raw).toString('base64url') }),
    });
    return { ok: true, provider: 'gmail', id: json.id || null };
  } catch (error) {
    const formSubmit = await sendViaFormSubmit({ subject, report });
    if (formSubmit.ok) return formSubmit;
    return { ok: false, provider: 'gmail', error: error.message, fallback: formSubmit };
  }
}

async function sendViaFormSubmit({ subject, report }) {
  if (process.env.SEO_DISABLE_FORMSUBMIT === '1') {
    return { ok: false, skipped: true, provider: 'formsubmit', reason: 'SEO_DISABLE_FORMSUBMIT=1' };
  }

  try {
    const json = await requestJson('https://formsubmit.co/ajax/social@eb28.co', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        _subject: subject,
        _template: 'table',
        sourcePage: 'EB28 SEO daily review automation',
        report,
      }),
    });
    const responseText = String(json?.message || json?.success || '').trim();
    const normalized = responseText.toLowerCase();
    const looksBlocked = /open this page|through a web server|will not work|failed|error/.test(normalized);
    const looksDelivered = !looksBlocked && (json?.success === true || /sent|success/.test(normalized));
    if (!looksDelivered) {
      return {
        ok: false,
        provider: 'formsubmit',
        reason: responseText || 'FormSubmit response did not confirm delivery.',
      };
    }
    return { ok: true, provider: 'formsubmit', response: responseText || 'sent' };
  } catch (error) {
    return { ok: false, provider: 'formsubmit', error: error.message };
  }
}

async function updateBacklinkQueue(newestArticles, { queryAnalytics, pageAnalytics }) {
  const queuePath = path.join(ROOT, 'content', 'eb28', 'seo-outreach-queue.md');
  let queue = '';
  try {
    queue = await fsp.readFile(queuePath, 'utf8');
  } catch {
    queue = '# EB28 SEO Outreach Queue\n\n';
  }

  const strikingDistance = getStrikingDistanceRows(queryAnalytics.rows || [], 5);
  const sourcePages = getHighPerformingPages(pageAnalytics.rows || [], 3);
  const selected = newestArticles[0];
  const stamp = new Date().toISOString().slice(0, 10);
  const note = [
    '',
    `## Daily Queue Refresh ${stamp}`,
    '',
    selected
      ? `- Priority article for citations: [${selected.title}](${selected.url}) (${selected.cluster}).`
      : '- No article selected.',
    strikingDistance.length
      ? `- Search Console striking-distance rows to review: ${strikingDistance
          .map((row) => `"${row.query}" at avg. position ${Number(row.position).toFixed(1)}`)
          .join('; ')}.`
      : '- Search Console striking-distance rows unavailable or empty; use newest/highest-priority cluster.',
    sourcePages.length
      ? `- High-performing internal-link sources: ${sourcePages
          .map((row) => `${row.page} (${row.clicks} clicks, ${row.impressions} impressions)`)
          .join('; ')}.`
      : '- High-performing page rows unavailable; default to homepage, Melbourne Web Studio, and blog hub as source links.',
    '- Next authority action: pursue one legitimate local citation, one expert quote opportunity, and one partner resource mention. Avoid paid links and exact-match anchor spam.',
    '',
  ].join('\n');

  if (!queue.includes(`## Daily Queue Refresh ${stamp}`)) {
    await fsp.mkdir(path.dirname(queuePath), { recursive: true });
    await fsp.writeFile(queuePath, `${queue.trim()}\n${note}`, 'utf8');
    return { ok: true, changed: true, path: queuePath };
  }

  return { ok: true, changed: false, path: queuePath };
}

async function main() {
  const options = parseArgs(process.argv);
  await fsp.mkdir(OUTPUT_DIR, { recursive: true });

  const newestArticles = await getNewestArticles(5);
  const urlsToCheck = [
    `${SITE_ORIGIN}/sitemap.xml`,
    `${SITE_ORIGIN}/blog/`,
    `${MELBOURNE_WEB_STUDIO_ORIGIN}/`,
    ...newestArticles.slice(0, 4).map((article) => article.url),
  ];

  const safeUpdates = options.safeUpdates
    ? {
        blog: runCommand(process.execPath, ['scripts/generate-eb28-blog.mjs']),
      }
    : { skipped: true };

  const localSeo = options.safeUpdates
    ? runCommand(process.execPath, ['scripts/check-eb28-seo.mjs'])
    : { ok: true, stdout: 'Skipped local SEO validation because --safe-updates was not set.' };

  const deployment = options.deployVercel
    ? runCommand('npx', ['vercel', 'deploy', '--prod', '--yes'])
    : { skipped: true, stdout: 'Skipped production deploy because --deploy-vercel was not set.' };

  const liveChecks = [];
  for (const url of urlsToCheck) {
    liveChecks.push({ url, ...(await fetchUrlStatus(url)) });
  }

  const sitemapSubmission = options.submitSitemap
    ? await submitSitemap({ siteUrl: options.siteUrl, sitemapUrl: options.sitemapUrl })
    : { skipped: true };
  const queryAnalytics = await getSearchAnalytics({ siteUrl: options.siteUrl, dimensions: ['query'], rowLimit: 50 });
  const pageAnalytics = await getSearchAnalytics({ siteUrl: options.siteUrl, dimensions: ['query', 'page'], rowLimit: 100 });
  const inspections = options.inspectUrls
    ? await inspectUrls({
        siteUrl: options.siteUrl,
        urls: [`${SITE_ORIGIN}/blog/`, ...newestArticles.slice(0, 4).map((article) => article.url)],
      })
    : { skipped: true, results: [] };
  const backlinkQueue = await updateBacklinkQueue(newestArticles, { queryAnalytics, pageAnalytics });
  const lighthouse = options.runLighthouse
    ? await runLighthouse([SITE_ORIGIN, `${SITE_ORIGIN}/blog/`])
    : [];
  const internalLinkActions = buildInternalLinkActions(newestArticles, pageAnalytics);
  const internalLinkCoverage = await verifyInternalLinkCoverage(newestArticles, pageAnalytics);
  const melbourneSubdomain = liveChecks.find((check) => check.url === `${MELBOURNE_WEB_STUDIO_ORIGIN}/`);

  const report = [
    `# EB28 Daily SEO Review`,
    '',
    `Generated: ${new Date().toISOString()}`,
    `Production: ${SITE_ORIGIN}`,
    `Search Console property: ${options.siteUrl}`,
    '',
    `## Content and URL Targets`,
    '',
    ...newestArticles.map((article) => `- ${article.title}: ${article.url}`),
    '',
    `## Local Build and SEO Validation`,
    '',
    `- Static blog generation: ${safeUpdates.skipped ? 'skipped' : safeUpdates.blog.ok ? 'passed' : 'failed'}`,
    `- EB28 SEO check: ${localSeo.ok ? 'passed' : 'failed'}`,
    '```',
    summarizeCommand(localSeo),
    '```',
    '',
    `## Deployment`,
    '',
    deployment.skipped
      ? '- Production deploy skipped by flags.'
      : `- Vercel production deploy: ${deployment.ok ? 'passed' : 'failed'}`,
    deployment.skipped ? '' : '```',
    deployment.skipped ? '' : summarizeCommand(deployment),
    deployment.skipped ? '' : '```',
    '',
    `## Live Crawl Checks`,
    '',
    ...liveChecks.map(
      (check) =>
        `- ${check.url}: ${check.ok ? 'OK' : 'FAIL'} (${check.status || 0})${check.hasIndexableSignals ? ', indexable signals present' : ''}${check.server ? `, server ${check.server}` : ''}`,
    ),
    melbourneSubdomain?.melbourneWebStudioSignals
      ? `- Melbourne Web Studio subdomain alignment: ${
          melbourneSubdomain.melbourneWebStudioSignals.servedByGithubPages
            ? 'serving from GitHub Pages'
            : melbourneSubdomain.melbourneWebStudioSignals.likelyLegacyHost
              ? 'serving from a separate legacy host; update DNS/hosting so it serves the GitHub Pages build'
              : 'server does not clearly match GitHub Pages'
        }`
      : '',
    '',
    `## Search Console`,
    '',
    `- Sitemap submission: ${
      sitemapSubmission.skipped
        ? `skipped (${sitemapSubmission.reason || 'flag not set'})`
        : sitemapSubmission.ok
          ? 'submitted'
          : `failed (${sitemapSubmission.error})`
    }`,
    `- URL inspection: ${
      inspections.skipped
        ? `skipped (${inspections.reason || 'flag not set'})`
        : inspections.ok
          ? 'completed'
          : 'completed with errors'
    }`,
    '- URL handling note: the Search Console API can submit the sitemap and inspect URL status. Direct programmatic indexing requests are not used for these articles because Google limits the Indexing API to supported job posting and livestream pages.',
    ...(inspections.results || []).map(
      (result) =>
        `  - ${result.url}: ${result.ok ? `${result.verdict} / ${result.coverageState}` : `failed (${result.error})`}`,
    ),
    '',
    `## Actual Query Average Position`,
    '',
    queryAnalytics.ok
      ? `Date range: ${queryAnalytics.dateRange}`
      : `Unavailable: ${queryAnalytics.reason || queryAnalytics.error || 'Search Console credentials missing or unauthorized.'}`,
    '',
    renderAnalyticsRows(queryAnalytics.rows || [], { includePage: false }),
    '',
    `## Query/Page Opportunities`,
    '',
    pageAnalytics.ok
      ? `Date range: ${pageAnalytics.dateRange}`
      : `Unavailable: ${pageAnalytics.reason || pageAnalytics.error || 'Search Console credentials missing or unauthorized.'}`,
    '',
    renderAnalyticsRows(pageAnalytics.rows || [], { includePage: true }),
    '',
    `## Internal Link Actions`,
    '',
    ...internalLinkActions,
    '',
    `## Internal Link Coverage`,
    '',
    ...renderInternalLinkCoverage(internalLinkCoverage),
    '',
    `## Backlinks and Citations`,
    '',
    `- Outreach queue: ${backlinkQueue.changed ? 'refreshed' : 'already current'} (${backlinkQueue.path})`,
    '- Current rules: use legitimate local citations, expert quotes, partner resource mentions, and useful source citations. Do not buy links or use link farms.',
    '',
    `## Lighthouse`,
    '',
    lighthouse.length
      ? lighthouse
          .map((item) => {
            if (!item.ok) return `- ${item.url}: failed (${item.summary})`;
            const metricSummary = item.metrics
              ? `; LCP ${item.metrics.lcp || 'n/a'}, CLS ${item.metrics.cls || 'n/a'}, TBT ${item.metrics.tbt || 'n/a'}, Speed Index ${item.metrics.speedIndex || 'n/a'}`
              : '';
            return `- ${item.url}: ${JSON.stringify(item.scores)}${metricSummary}`;
          })
          .join('\n')
      : '- Skipped by flags.',
    '',
    `## Next Actions`,
    '',
    '- Watch Search Console rows in average positions 4-20 and refresh titles, intros, FAQs, citations, and internal links.',
    '- Keep adding internal links from EB28 homepage, Melbourne Web Studio, Recon Agent, and the blog hub into newest cluster pages.',
    '- Pursue one legitimate local citation or expert quote per day for the strongest cluster.',
    '',
  ]
    .filter((line) => line !== null)
    .join('\n');

  const latestPath = path.join(OUTPUT_DIR, 'latest.md');
  const datedPath = path.join(OUTPUT_DIR, `eb28-seo-${new Date().toISOString().slice(0, 10)}.md`);
  await fsp.writeFile(latestPath, report, 'utf8');
  await fsp.writeFile(datedPath, report, 'utf8');

  const email = options.sendEmail
    ? await sendReportEmail({ subject: 'EB28 Daily SEO Review', report })
    : { skipped: true };

  const buildOk = safeUpdates.skipped || Boolean(safeUpdates.blog.ok);
  const deployOk = deployment.skipped || Boolean(deployment.ok);
  const liveOk = liveChecks.every((check) => check.ok);

  const result = {
    ok: Boolean(buildOk && localSeo.ok && deployOk && liveOk),
    reportPath: latestPath,
    datedReportPath: datedPath,
    sitemapSubmission,
    analytics: {
      query: {
        ok: queryAnalytics.ok,
        rows: (queryAnalytics.rows || []).slice(0, 5),
      },
      queryPage: {
        ok: pageAnalytics.ok,
        rows: (pageAnalytics.rows || []).slice(0, 5),
      },
    },
    inspections,
    email,
  };

  console.log(JSON.stringify(result, null, 2));

  if (!localSeo.ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
