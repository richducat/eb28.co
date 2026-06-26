#!/usr/bin/env node

import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(repoRoot, 'public', '32940');
const docsDir = path.join(repoRoot, 'docs', '32940');
const outDir = path.join(repoRoot, 'output', 'lead-ops');
const jsonOutPath = path.join(outDir, '32940-lead-capture-verification.json');
const mdOutPath = path.join(outDir, '32940-lead-capture-verification.md');
const leadCapturePath = path.join(repoRoot, 'src', 'leadCapture.js');
const expectedEmail = 'social@eb28.co';
const expectedFormAction = `https://formsubmit.co/${expectedEmail}`;
const expectedAjaxEndpoint = `https://formsubmit.co/ajax/${expectedEmail}`;
const expectedPageCount = 129;

function parseArgs(argv) {
  const args = { live: false, liveLimit: 0 };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--live') {
      args.live = true;
      args.liveLimit = expectedPageCount;
    } else if (arg === '--live-sample') {
      args.live = true;
      args.liveLimit = Number.parseInt(argv[++index], 10);
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (args.live && (!Number.isFinite(args.liveLimit) || args.liveLimit < 1)) {
    throw new Error('--live-sample must be a positive integer');
  }
  return args;
}

function usage() {
  return `Usage:
  npm run leadops:verify-capture:32940
  npm run leadops:verify-capture:32940 -- --live-sample 10
  npm run leadops:verify-capture:32940 -- --live`;
}

function normalizeHtml(value = '') {
  return String(value)
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

function attrValue(tag, name) {
  const pattern = new RegExp(`${name}=(["'])(.*?)\\1`, 'i');
  return normalizeHtml(tag.match(pattern)?.[2] || '');
}

function inputTag(html, name) {
  return html.match(new RegExp(`<input\\b[^>]*\\bname=(["'])${name}\\1[^>]*>`, 'i'))?.[0] || '';
}

function hiddenInputValue(html, name) {
  const tag = inputTag(html, name);
  return tag ? attrValue(tag, 'value') : '';
}

function hasRequiredInput(html, name) {
  const tag = inputTag(html, name);
  return Boolean(tag && /\brequired\b/i.test(tag));
}

function checkPage(html, slug, sourceLabel) {
  const normalized = normalizeHtml(html);
  const failures = [];
  const formMatches = [...normalized.matchAll(/<form\b[\s\S]*?<\/form>/gi)].map((match) => match[0]);
  const claimForm = formMatches.find((form) => form.includes(expectedFormAction));

  if (!normalized.includes('id="claim"')) failures.push('missing #claim section');
  if (formMatches.length !== 1) failures.push(`expected exactly 1 form, found ${formMatches.length}`);
  if (!claimForm) failures.push(`missing form action ${expectedFormAction}`);

  if (claimForm) {
    const formOpen = claimForm.match(/<form\b[^>]*>/i)?.[0] || '';
    if (attrValue(formOpen, 'action') !== expectedFormAction) failures.push('form action does not route to social@eb28.co');
    if (attrValue(formOpen, 'method').toUpperCase() !== 'POST') failures.push('form method is not POST');
    if (attrValue(formOpen, 'accept-charset').toUpperCase() !== 'UTF-8') failures.push('form accept-charset is not UTF-8');
    if (!hiddenInputValue(claimForm, '_subject').startsWith('Booked review request: ')) failures.push('missing booked-review subject');
    if (hiddenInputValue(claimForm, '_captcha') !== 'false') failures.push('captcha is not disabled');
    if (hiddenInputValue(claimForm, '_template') !== 'table') failures.push('template is not table');
    if (hiddenInputValue(claimForm, 'source') !== `eb28-32940-${slug}`) failures.push('source hidden field does not match slug');
    if (hiddenInputValue(claimForm, 'concept_url') !== `https://eb28.co/32940/${slug}.html`) failures.push('concept_url hidden field does not match public URL');
    if (!hiddenInputValue(claimForm, 'offer').includes('$98/month')) failures.push('offer hidden field is missing $98/month');
    if (!hiddenInputValue(claimForm, 'offer').includes('weekly blog posts')) failures.push('offer hidden field is missing weekly blog posts');
    if (!hiddenInputValue(claimForm, 'requested_next_step').includes('book a 10-minute review call')) failures.push('requested_next_step is missing booking intent');
    if (!hasRequiredInput(claimForm, 'name')) failures.push('name field is not required');
    if (!hasRequiredInput(claimForm, 'email')) failures.push('email field is not required');
    if (!hasRequiredInput(claimForm, 'preferred_review_time')) failures.push('preferred_review_time field is not required');
  }

  if (!normalized.includes(`mailto:${expectedEmail}?subject=`)) failures.push('missing social@eb28.co mailto fallback');
  if (!normalized.includes('Reply "no thanks"') && !normalized.includes('Reply &quot;no thanks&quot;')) failures.push('missing opt-out text');
  if (!normalized.includes('The website build is free. Hosting, SEO, and weekly content are $98/month.')) failures.push('missing headline offer');
  if (!normalized.includes('One weekly local blog post or Google Business Profile content prompt.')) failures.push('missing weekly content line');

  return { sourceLabel, slug, passed: failures.length === 0, failures };
}

async function htmlFiles(dir) {
  const entries = await fs.readdir(dir);
  return entries.filter((entry) => entry.endsWith('.html') && entry !== 'index.html').sort();
}

async function verifyDirectory(dir, sourceLabel) {
  const files = await htmlFiles(dir);
  const results = [];
  for (const file of files) {
    const slug = file.replace(/\.html$/i, '');
    const html = await fs.readFile(path.join(dir, file), 'utf8');
    results.push(checkPage(html, slug, sourceLabel));
  }
  return { sourceLabel, dir, files: files.length, results };
}

async function verifyLeadCaptureModule() {
  const source = await fs.readFile(leadCapturePath, 'utf8');
  const failures = [];
  if (!source.includes(`LEAD_CAPTURE_EMAIL = '${expectedEmail}'`)) failures.push('LEAD_CAPTURE_EMAIL mismatch');
  if (!source.includes('https://formsubmit.co/ajax/${LEAD_CAPTURE_EMAIL}')) failures.push('LEAD_CAPTURE_ENDPOINT mismatch');
  return { sourceLabel: 'src/leadCapture.js', passed: failures.length === 0, failures };
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'EB28 lead capture verifier' } }, (response) => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          if (response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`${url} returned HTTP ${response.statusCode}`));
          } else {
            resolve(body);
          }
        });
      })
      .on('error', reject)
      .setTimeout(15000, function onTimeout() {
        this.destroy(new Error(`${url} timed out`));
      });
  });
}

async function verifyLive(slugs, limit) {
  const selected = slugs.slice(0, limit);
  const results = [];
  for (const slug of selected) {
    const url = `https://eb28.co/32940/${slug}.html`;
    try {
      results.push(checkPage(await fetchText(url), slug, 'live'));
    } catch (error) {
      results.push({ sourceLabel: 'live', slug, passed: false, failures: [error.message] });
    }
  }
  return { sourceLabel: 'live', files: selected.length, results };
}

function summaryFor(section) {
  const failures = section.results.flatMap((result) => result.failures.map((failure) => ({ slug: result.slug, failure })));
  return {
    sourceLabel: section.sourceLabel,
    checked: section.files,
    passed: section.results.length - failures.length,
    failedPages: section.results.filter((result) => !result.passed).length,
    failures,
  };
}

function renderMarkdown(report) {
  const lines = [
    '# 32940 Lead Capture Verification',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Expected recipient: ${report.expectedEmail}`,
    `- Expected form action: ${report.expectedFormAction}`,
    `- Public pages checked: ${report.summary.public.checked}`,
    `- Docs pages checked: ${report.summary.docs.checked}`,
    `- Public failures: ${report.summary.public.failedPages}`,
    `- Docs failures: ${report.summary.docs.failedPages}`,
    `- Lead capture module: ${report.leadCaptureModule.passed ? 'passed' : 'failed'}`,
    `- Live pages checked: ${report.summary.live ? report.summary.live.checked : 0}`,
    `- Live failures: ${report.summary.live ? report.summary.live.failedPages : 0}`,
    '',
    '## Gate',
    '',
    report.passed ? 'PASS: all checked lead-capture routes point to social@eb28.co.' : 'FAIL: one or more lead-capture checks failed.',
  ];

  for (const [label, section] of Object.entries(report.summary)) {
    if (!section || !section.failures.length) continue;
    lines.push('', `## ${label} Failures`, '');
    for (const failure of section.failures.slice(0, 100)) {
      lines.push(`- ${failure.slug}: ${failure.failure}`);
    }
  }

  if (report.leadCaptureModule.failures.length) {
    lines.push('', '## Module Failures', '');
    for (const failure of report.leadCaptureModule.failures) {
      lines.push(`- ${failure}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const publicVerification = await verifyDirectory(publicDir, 'public');
  const docsVerification = await verifyDirectory(docsDir, 'docs');
  const leadCaptureModule = await verifyLeadCaptureModule();
  const slugs = publicVerification.results.map((result) => result.slug);
  const liveVerification = args.live ? await verifyLive(slugs, args.liveLimit) : null;

  const summary = {
    public: summaryFor(publicVerification),
    docs: summaryFor(docsVerification),
    live: liveVerification ? summaryFor(liveVerification) : null,
  };

  const passed =
    publicVerification.files === expectedPageCount &&
    docsVerification.files === expectedPageCount &&
    summary.public.failedPages === 0 &&
    summary.docs.failedPages === 0 &&
    leadCaptureModule.passed &&
    (!summary.live || summary.live.failedPages === 0);

  const report = {
    generatedAt: new Date().toISOString(),
    expectedEmail,
    expectedFormAction,
    expectedAjaxEndpoint,
    expectedPageCount,
    passed,
    summary,
    leadCaptureModule,
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(jsonOutPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(mdOutPath, renderMarkdown(report));

  console.log(JSON.stringify({
    passed,
    publicPages: publicVerification.files,
    docsPages: docsVerification.files,
    publicFailures: summary.public.failedPages,
    docsFailures: summary.docs.failedPages,
    modulePassed: leadCaptureModule.passed,
    livePages: summary.live?.checked || 0,
    liveFailures: summary.live?.failedPages || 0,
  }, null, 2));

  if (!passed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
