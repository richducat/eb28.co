import { test } from 'node:test';
import assert from 'node:assert/strict';
import { askOf, businessOf } from '../src/businesses.js';
import { setOverride } from '../src/board.js';
import { store } from '../src/store.js';

test('businessOf: folder, title and override decide the business', () => {
  assert.equal(businessOf({ cwd: '/Users/r/Documents/ChatGPT/TYFYS APP', title: 'x' }), 'tyfys');
  assert.equal(businessOf({ cwd: '/Users/r/GITHUB/eb28.co', title: 'Social package check' }), 'eb28');
  assert.equal(businessOf({ cwd: '/Users/r/Synccstep', title: 'Local session' }), 'syncstep');
  assert.equal(businessOf({ cwd: '/tmp', title: 'Buddy statement review' }), 'tyfys');
  assert.equal(businessOf({ cwd: '/tmp', title: 'random' }), 'other');
  assert.equal(businessOf({ cwd: '/Users/r/GITHUB/eb28.co', business: 'tyfys' }), 'tyfys');
});

test('askOf: plain action types for the queue', () => {
  assert.equal(askOf({ status: 'needs_you', reason: 'Waiting on a tool permission or approval.' }), 'approve');
  assert.equal(askOf({ status: 'needs_you', reason: 'The agent asked you something and is waiting for your answer.' }), 'answer');
  assert.equal(askOf({ status: 'needs_you', reason: 'Session is open and idle. Reply or close it.' }), 'review');
  assert.equal(askOf({ status: 'failed', reason: 'boom' }), 'fix');
  assert.equal(askOf({ status: 'working' }), '');
});

test('setOverride: fields not mentioned are kept', () => {
  store.set('overrides', {});
  setOverride('job:1', { status: 'done' });
  const o = setOverride('job:1', { status: undefined, snoozedUntil: '2099-01-01T00:00:00Z' });
  assert.equal(o.status, 'done');
  assert.equal(o.snoozedUntil, '2099-01-01T00:00:00Z');
  assert.equal(setOverride('job:1', { status: null }).status, undefined);
});

test('appOf: jobs map to the app they work on', async () => {
  const { appOf } = await import('../src/apps.js');
  assert.equal(appOf({ cwd: '/Users/r/Documents/ChatGPT/TYFYS APP', title: 'x' }), 'tyfys-app');
  assert.equal(appOf({ cwd: '/tmp', title: 'Lab Studio weekday blocker scan' }), 'labstudio');
  assert.equal(appOf({ cwd: '/Users/r/Synccstep', title: 'Local session' }), 'syncstep');
  assert.equal(appOf({ cwd: '/tmp', title: 'Review TYFYS website copy' }), '');
});

test('tyfys: lanes, overdue flags and KPIs from a snapshot', async () => {
  const { summarize } = await import('../src/tyfys.js');
  const now = Date.parse('2026-10-01T12:00:00Z');
  const d = (days) => new Date(now - days * 86400e3).toISOString();
  const s = summarize({
    stageCounts: { 'Payment complete': 3, Lost: 1 },
    cases: [
      { id: 'a', initials: 'AB', stage: 'Welcome', updatedAt: d(10), createdAt: d(10), owner: 'X' },
      { id: 'b', initials: 'CD', stage: 'IN APPEAL', updatedAt: d(40), createdAt: d(200), owner: 'Y' },
      { id: 'c', initials: 'EF', stage: 'Service Paused', updatedAt: d(5), createdAt: d(90), owner: 'X' },
      { id: 't', initials: 'T', stage: 'Welcome', updatedAt: d(1), createdAt: d(1), owner: 'X', test: true },
    ],
  }, now);
  assert.equal(s.kpis.active, 2);
  assert.equal(s.kpis.stalled, 1);
  assert.equal(s.kpis.overdue, 1);
  assert.equal(s.kpis.winRate, 75);
  assert.equal(s.lanes.find((l) => l.id === 'appeal').cases[0].flag, 'amber');
});
