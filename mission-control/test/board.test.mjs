import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyOverrides, summarize } from '../src/board.js';
import { deriveStatus, looksLikeQuestion, titleFrom } from '../src/jobs/model.js';
import { isDue, parseSchedule, validate } from '../src/workforce/automations.js';
import { classifyScript } from '../src/workforce/agents/automation-scout.js';

const NOW = Date.parse('2026-09-03T12:00:00.000Z');
const job = (over = {}) => ({ id: 'x', status: 'working', lastActivity: new Date(NOW - 60e3).toISOString(), ...over });

test('overrides apply and drop once the source moves on', () => {
  const asOf = new Date(NOW).toISOString();
  const [a] = applyOverrides([job()], { x: { status: 'done', asOf } }, NOW);
  assert.equal(a.status, 'done');
  assert.equal(a.overridden, true);
  const moved = job({ lastActivity: new Date(NOW + 60e3).toISOString() });
  const [b] = applyOverrides([moved], { x: { status: 'done', asOf } }, NOW + 60e3);
  assert.equal(b.status, 'working');
  assert.equal(applyOverrides([job()], { x: { archived: true, asOf } }, NOW).length, 0);
  const [s] = applyOverrides([job()], { x: { snoozedUntil: new Date(NOW + 3600e3).toISOString(), asOf } }, NOW);
  assert.ok(s.snoozedUntil);
  const [e] = applyOverrides([job()], { x: { snoozedUntil: new Date(NOW - 3600e3).toISOString(), asOf } }, NOW);
  assert.equal(e.snoozedUntil, undefined, 'expired snooze ignored');
});

test('summary counts', () => {
  const s = summarize([job(), job({ status: 'done' }), job({ status: 'done', source: 'codex' })]);
  assert.equal(s.counts.done, 2);
  assert.equal(s.total, 3);
});

test('question detection and titles', () => {
  assert.ok(looksLikeQuestion('Which one do you want?'));
  assert.ok(looksLikeQuestion('Let me know if you want the other option.'));
  assert.ok(!looksLikeQuestion('Done. Pushed to main.'));
  assert.equal(titleFrom('<environment_context>x</environment_context> Fix the login bug. Then deploy.'), 'Fix the login bug. Then deploy.');
  assert.equal(titleFrom('Please rewrite the whole pricing page copy. Keep it short.'), 'Please rewrite the whole pricing page copy.');
  assert.equal(titleFrom('a'.repeat(200)).length, 90);
});

test('deriveStatus matrix', () => {
  const t = (s) => deriveStatus({ lastActivity: NOW - 60e3, alive: false, lastText: '', ...s }, NOW).status;
  assert.equal(t({ lastKind: 'tool_use' }), 'working');
  assert.equal(t({ lastKind: 'tool_use', lastActivity: NOW - 3600e3 }), 'follow_up');
  assert.equal(t({ lastKind: 'assistant' }), 'done');
  assert.equal(t({ lastKind: 'assistant', alive: true }), 'working');
  assert.equal(t({ lastKind: 'assistant', alive: true, lastActivity: NOW - 3600e3 }), 'needs_you');
  assert.equal(t({ lastKind: 'assistant', explicitFailed: true }), 'failed');
  assert.equal(t({ lastKind: 'user', lastActivity: NOW - 3600e3 }), 'follow_up');
});

test('schedules', () => {
  assert.deepEqual(parseSchedule('every 30m'), { kind: 'interval', ms: 1800e3 });
  assert.equal(parseSchedule('daily 06:30').hour, 6);
  assert.equal(parseSchedule('nonsense'), null);
  const a = { schedule: 'every 6h' };
  assert.ok(isDue(a, null, NOW));
  assert.ok(!isDue(a, new Date(NOW - 3600e3).toISOString(), NOW));
  const clock = { schedule: 'daily 08:00' };
  const local8 = new Date(2026, 8, 3, 8, 30).getTime();
  assert.ok(isDue(clock, new Date(local8 - 24 * 3600e3).toISOString(), local8));
  assert.ok(!isDue(clock, new Date(local8 - 600e3).toISOString(), local8));
  assert.ok(!isDue(clock, null, new Date(2026, 8, 3, 7, 0).getTime()));
});

test('registry validation refuses shell strings and bad tiers', () => {
  assert.throws(() => validate({ id: 'x', command: 'rm -rf /', tier: 'safe' }));
  assert.throws(() => validate({ id: 'x', command: ['ls'], tier: 'yolo' }));
  assert.equal(validate({ id: 'x', command: ['ls'], tier: 'safe' }).enabled, true);
  assert.equal(validate({ id: 'x', command: ['ls'], tier: 'approval' }).enabled, false);
});

test('scout classifies scripts by risk', () => {
  assert.equal(classifyScript('check:seo', 'node check.mjs'), 'safe');
  assert.equal(classifyScript('eb28:social:publish', 'node publish.mjs --publish'), 'manual');
  assert.equal(classifyScript('generate:data', 'node gen.mjs'), 'approval');
  assert.equal(classifyScript('leadops:send-drafts', 'node send.mjs'), 'manual');
});
