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
const expectedNextUrl = 'https://eb28.co/32940/claim-received.html';
const liveTestConceptUrl = 'https://eb28.co/32940/arabesque-flavors-of-the-middle-east.html';
const minimumExpectedPageCount = 129;
const supportPages = new Set(['index.html', 'claim-received.html']);

function parseArgs(argv) {
  const args = { live: false, liveLimit: 0, submitTest: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--live') {
      args.live = true;
      args.liveLimit = Number.MAX_SAFE_INTEGER;
    } else if (arg === '--live-sample') {
      args.live = true;
      args.liveLimit = Number.parseInt(argv[++index], 10);
    } else if (arg === '--submit-test') {
      args.submitTest = true;
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
  npm run leadops:verify-capture:32940 -- --live
  EB28_ALLOW_LIVE_FORM_TEST=1 npm run leadops:verify-capture:32940 -- --live-sample 10 --submit-test`;
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
    if (hiddenInputValue(claimForm, '_next') !== expectedNextUrl) failures.push('missing branded claim-received redirect');
    if (hiddenInputValue(claimForm, 'source') !== `eb28-32940-${slug}`) failures.push('source hidden field does not match slug');
    if (hiddenInputValue(claimForm, 'concept_url') !== `https://eb28.co/32940/${slug}.html`) failures.push('concept_url hidden field does not match public URL');
    if (!hiddenInputValue(claimForm, 'offer').includes('$98/month')) failures.push('offer hidden field is missing $98/month');
    if (!hiddenInputValue(claimForm, 'offer').includes('weekly blog posts')) failures.push('offer hidden field is missing weekly blog posts');
    if (!hiddenInputValue(claimForm, 'requested_next_step').includes('confirm a 10-minute owner review call')) failures.push('requested_next_step is missing confirmed booking intent');
    if (hiddenInputValue(claimForm, 'review_timezone') !== 'America/New_York') failures.push('review_timezone hidden field is missing America/New_York');
    if (!claimForm.includes('data-review-slot-grid')) failures.push('missing quick review slot picker');
    if (!hasRequiredInput(claimForm, 'name')) failures.push('name field is not required');
    if (!hasRequiredInput(claimForm, 'email')) failures.push('email field is not required');
    if (!hasRequiredInput(claimForm, 'reviewer_role')) failures.push('reviewer_role field is not required');
    if (!hasRequiredInput(claimForm, 'phone')) failures.push('phone field is not required');
    if (!hasRequiredInput(claimForm, 'preferred_review_time')) failures.push('preferred_review_time field is not required');
    if (!hasRequiredInput(claimForm, 'backup_review_time')) failures.push('backup_review_time field is not required');
    if (!hasRequiredInput(claimForm, 'confirm_review_intent')) failures.push('confirm_review_intent field is not required');
  }

  if (!normalized.includes(`mailto:${expectedEmail}?subject=`)) failures.push('missing social@eb28.co mailto fallback');
  if (!normalized.includes('Reply "no thanks"') && !normalized.includes('Reply &quot;no thanks&quot;')) failures.push('missing opt-out text');
  if (!normalized.includes('The website build is free. Hosting, SEO, and weekly content are $98/month.')) failures.push('missing headline offer');
  if (!normalized.includes('One weekly local blog post or Google Business Profile content prompt.')) failures.push('missing weekly content line');

  return { sourceLabel, slug, passed: failures.length === 0, failures };
}

function checkClaimReceivedHtml(html, sourceLabel) {
  const normalized = normalizeHtml(html);
  const failures = [];
  if (!normalized.includes('EB28 has your free website review request.')) failures.push('missing confirmation headline');
  if (!normalized.includes(`sent to <strong>${expectedEmail}</strong>`)) failures.push('missing social@eb28.co receipt copy');
  if (!normalized.includes('$98/month')) failures.push('missing $98/month offer copy');
  if (!normalized.includes('weekly local blog or Google Business content prompts')) failures.push('missing weekly content copy');
  if (!normalized.includes(`mailto:${expectedEmail}?subject=`)) failures.push('missing social@eb28.co follow-up mailto');
  if (!normalized.includes('<meta name="robots" content="noindex,follow"')) failures.push('missing noindex robots meta');
  return { sourceLabel, slug: 'claim-received', passed: failures.length === 0, failures };
}

async function verifyClaimReceivedPage(dir, sourceLabel) {
  try {
    return checkClaimReceivedHtml(await fs.readFile(path.join(dir, 'claim-received.html'), 'utf8'), sourceLabel);
  } catch (error) {
    return { sourceLabel, slug: 'claim-received', passed: false, failures: [error.message] };
  }
}

async function htmlFiles(dir) {
  const entries = await fs.readdir(dir);
  return entries.filter((entry) => entry.endsWith('.html') && !supportPages.has(entry)).sort();
}

async function verifyDirectory(dir, sourceLabel) {
  const files = await htmlFiles(dir);
  const results = [];
  for (const file of files) {
    const slug = file.replace(/\.html$/i, '');
    const html = await fs.readFile(path.join(dir, file), 'utf8');
    results.push(checkPage(html, slug, sourceLabel));
  }
  const supportResults = [await verifyClaimReceivedPage(dir, sourceLabel)];
  return { sourceLabel, dir, files: files.length, results, supportResults };
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

function postJson(url, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const request = https.request(
      new URL(url),
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'User-Agent': 'EB28 lead capture verifier',
          Origin: 'https://eb28.co',
          Referer: liveTestConceptUrl,
        },
      },
      (response) => {
        let responseBody = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          responseBody += chunk;
        });
        response.on('end', () => {
          const json = (() => {
            try {
              return JSON.parse(responseBody);
            } catch {
              return null;
            }
          })();
          resolve({ statusCode: response.statusCode, headers: response.headers, body: responseBody, json });
        });
      },
    );
    request.on('error', reject);
    request.setTimeout(15000, function onTimeout() {
      this.destroy(new Error(`${url} timed out`));
    });
    request.write(body);
    request.end();
  });
}

async function submitLiveTestLead() {
  if (process.env.EB28_ALLOW_LIVE_FORM_TEST !== '1') {
    throw new Error('Refusing live FormSubmit test without EB28_ALLOW_LIVE_FORM_TEST=1.');
  }

  const submittedAt = new Date().toISOString();
  const payload = {
    _subject: `[EB28 TEST] Live lead capture verification ${submittedAt}`,
    _captcha: 'false',
    _template: 'table',
    source: 'eb28-32940-live-formsubmit-test',
    business: 'EB28 lead capture test - do not count',
    category: 'test',
    concept_url: liveTestConceptUrl,
    offer: 'Free website build plus EB28 Growth Hosting at $98/month with SEO and weekly blog posts',
    requested_next_step: 'Live FormSubmit acceptance test only - do not count as a booked call',
    name: 'EB28 live form test',
    email: expectedEmail,
    reviewer_role: 'test verifier',
    phone: 'do-not-call-test',
    preferred_review_time: 'TEST ONLY - do not count',
    backup_review_time: 'TEST ONLY - do not count',
    confirm_review_intent: 'TEST ONLY - do not count',
    message:
      'Automated EB28 lead capture verification. This is not a customer lead and must not count toward the 100 booked-call goal.',
  };

  const response = await postJson(expectedAjaxEndpoint, payload);
  const successValue = response.json && typeof response.json === 'object' ? response.json.success : undefined;
  const accepted =
    response.statusCode >= 200 &&
    response.statusCode < 300 &&
    successValue !== false &&
    String(successValue).toLowerCase() !== 'false';

  return {
    status: accepted ? 'accepted' : 'failed',
    submittedAt,
    endpoint: expectedAjaxEndpoint,
    recipient: expectedEmail,
    subject: payload._subject,
    source: payload.source,
    httpStatus: response.statusCode,
    success: successValue ?? null,
    message:
      response.json && typeof response.json === 'object' && typeof response.json.message === 'string'
        ? response.json.message
        : '',
    responseBodyPreview: response.body.slice(0, 500),
  };
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

async function verifyLiveClaimReceived() {
  try {
    return checkClaimReceivedHtml(await fetchText(expectedNextUrl), 'live');
  } catch (error) {
    return { sourceLabel: 'live', slug: 'claim-received', passed: false, failures: [error.message] };
  }
}

function summaryFor(section) {
  const allResults = [...section.results, ...(section.supportResults || [])];
  const failedResults = allResults.filter((result) => !result.passed);
  const failures = allResults.flatMap((result) => result.failures.map((failure) => ({ slug: result.slug, failure })));
  return {
    sourceLabel: section.sourceLabel,
    checked: section.files,
    supportChecked: section.supportResults?.length || 0,
    passed: allResults.length - failedResults.length,
    failedPages: failedResults.length,
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
    `- Expected post-submit redirect: ${report.expectedNextUrl}`,
    `- Minimum expected concept pages: ${report.minimumExpectedPageCount}`,
    `- Public pages checked: ${report.summary.public.checked}`,
    `- Public support pages checked: ${report.summary.public.supportChecked}`,
    `- Docs pages checked: ${report.summary.docs.checked}`,
    `- Docs support pages checked: ${report.summary.docs.supportChecked}`,
    `- Public/docs page counts match: ${report.pageCountsMatch ? 'yes' : 'no'}`,
    `- Public failures: ${report.summary.public.failedPages}`,
    `- Docs failures: ${report.summary.docs.failedPages}`,
    `- Lead capture module: ${report.leadCaptureModule.passed ? 'passed' : 'failed'}`,
    `- Live pages checked: ${report.summary.live ? report.summary.live.checked : 0}`,
    `- Live failures: ${report.summary.live ? report.summary.live.failedPages : 0}`,
    `- Live FormSubmit acceptance test: ${report.liveSubmission ? report.liveSubmission.status : 'not run'}`,
    '',
    '## Gate',
    '',
    report.passed ? 'PASS: all checked lead-capture routes point to social@eb28.co.' : 'FAIL: one or more lead-capture checks failed.',
  ];

  if (report.liveSubmission) {
    lines.push(
      '',
      '## Live FormSubmit Acceptance Test',
      '',
      `- Status: ${report.liveSubmission.status}`,
      `- Endpoint: ${report.liveSubmission.endpoint}`,
      `- Recipient: ${report.liveSubmission.recipient}`,
      `- Subject: ${report.liveSubmission.subject}`,
      `- HTTP status: ${report.liveSubmission.httpStatus}`,
      `- Response message: ${report.liveSubmission.message || '(none)'}`,
      '- Counting rule: this test payload is not a customer lead and must not count toward booked-call totals.',
    );
  }

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
  if (liveVerification) {
    liveVerification.supportResults = [await verifyLiveClaimReceived()];
  }
  const liveSubmission = args.submitTest ? await submitLiveTestLead() : null;

  const summary = {
    public: summaryFor(publicVerification),
    docs: summaryFor(docsVerification),
    live: liveVerification ? summaryFor(liveVerification) : null,
  };
  const pageCountsMatch = publicVerification.files === docsVerification.files;
  const pageCountMeetsMinimum = publicVerification.files >= minimumExpectedPageCount;

  const passed =
    pageCountsMatch &&
    pageCountMeetsMinimum &&
    summary.public.failedPages === 0 &&
    summary.docs.failedPages === 0 &&
    leadCaptureModule.passed &&
    (!summary.live || summary.live.failedPages === 0) &&
    (!liveSubmission || liveSubmission.status === 'accepted');

  const report = {
    generatedAt: new Date().toISOString(),
    expectedEmail,
    expectedFormAction,
    expectedAjaxEndpoint,
    expectedNextUrl,
    expectedPageCount: publicVerification.files,
    minimumExpectedPageCount,
    pageCountsMatch,
    pageCountMeetsMinimum,
    passed,
    summary,
    leadCaptureModule,
    liveSubmission,
  };

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(jsonOutPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(mdOutPath, renderMarkdown(report));

  console.log(JSON.stringify({
    passed,
    publicPages: publicVerification.files,
    docsPages: docsVerification.files,
    publicSupportPages: summary.public.supportChecked,
    docsSupportPages: summary.docs.supportChecked,
    publicFailures: summary.public.failedPages,
    docsFailures: summary.docs.failedPages,
    modulePassed: leadCaptureModule.passed,
    livePages: summary.live?.checked || 0,
    liveSupportPages: summary.live?.supportChecked || 0,
    liveFailures: summary.live?.failedPages || 0,
    liveSubmissionStatus: liveSubmission?.status || 'not_run',
    liveSubmissionHttpStatus: liveSubmission?.httpStatus || null,
  }, null, 2));

  if (!passed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
