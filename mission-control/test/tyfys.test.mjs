import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter, once } from 'node:events';
import { summarize } from '../src/tyfys.js';
import { createServer } from '../src/server.js';
import { MC_HOME } from '../src/config.js';

const now = Date.parse('2026-10-01T12:00:00Z');
const date = (days) => new Date(now - days * 86400e3).toISOString();
const marker = 'SYNTHETIC_PRIVATE_CASE_DETAIL';
const details = { fullName: marker, email: `${marker}@example.invalid`, phone: marker, ssn: marker,
  medical: { diagnoses: [marker], documents: [{ text: marker }] }, futureField: marker };
const fixture = () => ({
  source: 'synthetic test', fetchedAt: date(0), stageCounts: { 'Closed Won': 3, Lost: 1 },
  cases: [
    { id: 'recent', initials: 'AB', stage: 'Welcome', owner: 'Team A', createdAt: date(10), updatedAt: date(2), app: true, ...details },
    { id: 'old', initials: 'CD', stage: 'Welcome', owner: 'Team A', createdAt: date(31), updatedAt: date(10), app: false, ...details },
    { id: 'appeal', initials: 'EF', stage: 'IN APPEAL', owner: 'Team B', createdAt: date(90), updatedAt: date(40), app: 'mobile', ...details },
    { id: 'paused', initials: 'GH', stage: 'Service Paused', owner: 'Team B', createdAt: date(20), updatedAt: date(30), app: 1, ...details },
    { id: 'test', initials: 'TT', stage: 'Welcome', owner: marker, createdAt: date(1), updatedAt: date(100), test: true, ...details },
  ],
});

test('response removes private and future fields and preserves operational values, ordering, test filtering and KPIs', () => {
  const input = fixture();
  const before = JSON.stringify(input);
  const result = summarize(input, now);
  assert.equal(JSON.stringify(input), before);
  assert.ok(!JSON.stringify(result).includes(marker));
  assert.deepEqual(result.lanes[0].cases, [
    { id: 'old', initials: 'CD', stage: 'Welcome', owner: 'Team A', createdAt: date(31), updatedAt: date(10), app: false, days: 10, flag: 'red' },
    { id: 'recent', initials: 'AB', stage: 'Welcome', owner: 'Team A', createdAt: date(10), updatedAt: date(2), app: true, days: 2, flag: '' },
  ]);
  assert.deepEqual(result.kpis, { active: 3, stalled: 1, overdue: 2, inAppeal: 1, newThisMonth: 2, won: 3, lost: 1, winRate: 75 });
  assert.deepEqual(result.owners, [{ name: 'Team A', n: 2 }, { name: 'Team B', n: 2 }]);
  assert.equal(result.lanes.find((l) => l.id === 'appeal').cases[0].flag, 'amber');
  assert.equal(result.lanes.find((l) => l.id === 'stalled').cases[0].app, 1);
  assert.equal(result.lanes.find((l) => l.id === 'appeal').cases[0].app, 'mobile');
});

test('nested values cannot escape through allowed case fields or owner aggregates', () => {
  for (const value of [{ private: marker }, [marker]]) {
    for (const field of ['id', 'initials', 'stage', 'owner', 'createdAt', 'updatedAt', 'app']) {
      const result = summarize({ cases: [{ id: 'nested', initials: 'AB', stage: 'Welcome', owner: 'Team A',
        createdAt: date(10), updatedAt: date(2), app: true, [field]: value }] }, now);
      assert.ok(!JSON.stringify(result).includes(marker), `nested ${field} escaped`);
      for (const lane of result.lanes) for (const row of lane.cases) {
        assert.ok(Object.values(row).every((v) => v === null || typeof v !== 'object'));
        assert.equal(row[field], field === 'app' ? false : '');
      }
      if (field === 'owner') assert.deepEqual(result.owners, [{ name: '', n: 1 }]);
    }
  }
});

test('case display strings are not coerced and app accepts only finite JSON scalars', () => {
  for (const value of [null, false, 42]) {
    const result = summarize({ cases: [{ id: value, initials: value, owner: value, stage: 'Welcome',
      createdAt: date(10), updatedAt: date(2) }] }, now);
    assert.equal(result.lanes[0].cases[0].id, '');
    assert.equal(result.lanes[0].cases[0].initials, '');
    assert.deepEqual(result.owners, [{ name: '', n: 1 }]);
  }
  for (const app of [null, undefined, NaN, Infinity]) {
    assert.equal(summarize({ cases: [{ stage: 'Welcome', app }] }, now).lanes[0].cases[0].app, false);
  }
});

test('GET /api/tyfys enforces the contract in its serialized response', async (t) => {
  const snapshot = path.join(MC_HOME, 'synthetic-tyfys.json');
  const previous = process.env.MC_TYFYS_SNAPSHOT;
  process.env.MC_TYFYS_SNAPSHOT = snapshot;
  const input = fixture();
  input.cases.push({ id: 'nested-http', stage: 'Intake', updatedAt: date(2), createdAt: date(40),
    initials: { identity: marker }, owner: [marker], app: { medical: marker } });
  fs.writeFileSync(snapshot, JSON.stringify(input));
  const server = createServer({ orchestrator: new EventEmitter() });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(snapshot, { force: true });
    if (previous === undefined) delete process.env.MC_TYFYS_SNAPSHOT;
    else process.env.MC_TYFYS_SNAPSHOT = previous;
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/tyfys`);
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.ok(!body.includes(marker));
  const result = JSON.parse(body);
  assert.equal(result.ok, true);
  assert.deepEqual(result.lanes[0].cases.map((c) => c.id), ['old', 'recent']);
  assert.deepEqual(Object.keys(result.lanes[0].cases[0]).sort(), ['app', 'createdAt', 'days', 'flag', 'id', 'initials', 'owner', 'stage', 'updatedAt'].sort());
  assert.equal(result.lanes[1].cases[0].initials, '');
  assert.equal(result.lanes[1].cases[0].owner, '');
  assert.equal(result.lanes[1].cases[0].app, false);
});
