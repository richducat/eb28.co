import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { parseTranscript } from '../src/sources/claude-code.js';
import { parseRollout } from '../src/sources/codex.js';
import { parseOpenLoops } from '../src/sources/hermes.js';
import { prToJob } from '../src/sources/github.js';
import { jobFromCron } from '../src/sources/openclaw.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fx = (name) => path.join(here, 'fixtures', name);
const NOW = Date.parse('2026-09-03T12:00:00.000Z');

test('claude: assistant asked a question -> needs_you (alive) / follow_up (closed, old)', () => {
  const file = fx('claude-question.jsonl');
  const live = new Map([['sess-q', { pid: process.pid, cwd: '/x' }]]);
  const alive = parseTranscript(file, { live, now: NOW, mtime: NOW - 10 * 60e3 });
  assert.equal(alive.status, 'needs_you');
  assert.equal(alive.title, 'Add a pricing page to the site');
  assert.equal(alive.branch, 'claude/pricing');
  assert.match(alive.resumeCommand, /claude --resume sess-q/);
  const closed = parseTranscript(file, { live: new Map(), now: NOW + 24 * 3600e3, mtime: NOW - 10 * 60e3 });
  assert.equal(closed.status, 'follow_up');
});

test('claude: stopped mid tool call -> working while alive, follow_up once dead', () => {
  const file = fx('claude-midtool.jsonl');
  const working = parseTranscript(file, { live: new Map(), now: NOW, mtime: NOW - 30e3 });
  assert.equal(working.status, 'working');
  const dead = parseTranscript(file, { live: new Map(), now: NOW, mtime: NOW - 3600e3 });
  assert.equal(dead.status, 'follow_up');
  const waiting = parseTranscript(file, { live: new Map([['sess-m', { pid: process.pid }]]), now: NOW, mtime: NOW - 10 * 60e3 });
  assert.equal(waiting.status, 'needs_you', 'alive but no tool result for minutes means a permission prompt');
});

test('codex: task_complete -> done, skips environment_context as title', () => {
  const job = parseRollout(fx('codex-complete.jsonl'), { now: NOW, mtime: NOW - 3600e3 });
  assert.equal(job.status, 'done');
  assert.equal(job.title, 'Tighten the SEO titles on the blog posts.');
  assert.equal(job.branch, 'codex/seo');
  assert.equal(job.resumeCommand, 'codex resume cdx-1');
});

test('codex: pending approval -> needs_you', () => {
  const job = parseRollout(fx('codex-approval.jsonl'), { now: NOW, mtime: NOW - 20 * 60e3 });
  assert.equal(job.status, 'needs_you');
  assert.match(job.reason, /approve/i);
});

test('hermes: open loops become follow_up / needs_you / done', () => {
  const jobs = parseOpenLoops(fs.readFileSync(fx('open-loops.md'), 'utf8'), { mtime: NOW });
  assert.equal(jobs.length, 3);
  assert.equal(jobs[0].status, 'needs_you');
  assert.equal(jobs[1].status, 'done');
  assert.equal(jobs[2].status, 'follow_up');
  assert.equal(jobs[2].meta.section, 'Admin');
});

test('github: PR mapping', () => {
  const base = { number: 7, title: 'Add pricing', html_url: 'https://github.com/x/y/pull/7', created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-03T00:00:00Z', head: { ref: 'claude/pricing' }, user: { login: 'bot' }, state: 'open' };
  assert.equal(prToJob(base, 'x/y', NOW).status, 'needs_you');
  assert.equal(prToJob({ ...base, draft: true }, 'x/y', NOW).status, 'working');
  assert.equal(prToJob({ ...base, mergeable_state: 'dirty' }, 'x/y', NOW).status, 'follow_up');
  assert.equal(prToJob({ ...base, updated_at: '2026-08-20T00:00:00Z' }, 'x/y', NOW).status, 'follow_up');
  assert.equal(prToJob({ ...base, merged_at: '2026-09-02T00:00:00Z' }, 'x/y', NOW).status, 'done');
});

test('openclaw: cron records', () => {
  assert.equal(jobFromCron({ id: 'a', name: 'Daily post', lastRun: { status: 'ok', finishedAt: '2026-09-03T06:00:00Z' } }, NOW).status, 'done');
  assert.equal(jobFromCron({ id: 'b', name: 'Broken', lastRun: { status: 'error', error: 'boom' } }, NOW).status, 'failed');
  assert.equal(jobFromCron({ id: 'c', name: 'Paused', enabled: false }, NOW).status, 'follow_up');
  assert.equal(jobFromCron({ id: 'd', name: 'Running', lastRun: { status: 'running' } }, NOW).status, 'working');
});
