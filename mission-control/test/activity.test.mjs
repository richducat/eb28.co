import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeTool } from '../src/jobs/model.js';
import { nextRunAt } from '../src/workforce/automations.js';
import { agentNextRun } from '../src/workforce/orchestrator.js';

test('describeTool: short human "doing now" lines', () => {
  assert.equal(describeTool('Edit', { file_path: '/a/b/server.js' }).label, 'Editing server.js');
  assert.equal(describeTool('Bash', { command: "cd '/x y' && npm test" }).label, 'Running tests: npm test');
  assert.equal(describeTool('js', 'text(await tools.exec_command({cmd:"git status"}))').label, 'Running git status');
  assert.equal(describeTool('AskUserQuestion', {}).icon, '❓');
});

test('nextRunAt: intervals after the last run, clocks at the next slot', () => {
  const now = Date.parse('2026-10-01T12:00:00');
  assert.equal(nextRunAt('every 30m', new Date(now - 10 * 60e3).toISOString(), now), new Date(now + 20 * 60e3).toISOString());
  assert.equal(nextRunAt('every 30m', null, now), new Date(now).toISOString());
  assert.equal(nextRunAt('daily 06:00', null, now), new Date('2026-10-02T06:00:00').toISOString());
  assert.equal(nextRunAt('weekdays 09:30', null, Date.parse('2026-10-02T10:00:00')), new Date('2026-10-05T09:30:00').toISOString()); // Fri -> Mon
  assert.equal(nextRunAt('', null, now), null);
  assert.equal(agentNextRun({ every: 120e3 }, new Date(now - 60e3).toISOString(), now), new Date(now + 60e3).toISOString());
});

test('missingTarget: explains why an automation cannot run here', async () => {
  const { missingTarget } = await import('../src/workforce/automations.js');
  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-mt-'));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts: { build: 'x' } }));
  fs.mkdirSync(path.join(dir, 'ops', 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'ops', 'scripts', 'check.py'), '');
  assert.equal(missingTarget({ command: ['npm', 'run', '--silent', 'build'] }, dir), '');
  assert.match(missingTarget({ command: ['npm', 'run', '--silent', 'deploy'] }, dir), /"deploy" is not defined/);
  assert.equal(missingTarget({ command: ['python3', '-m', 'ops.scripts.check'] }, dir), '');
  assert.match(missingTarget({ command: ['node', 'scripts/x.mjs'] }, dir), /scripts\/x.mjs is not in/);
  assert.match(missingTarget({ command: ['python3', '-m', 'unittest', 'discover', '-s', 'tests'] }, dir), /tests is not in/);
});

test('cos: strips Hermes housekeeping from answers', async () => {
  const { cleanAnswer } = await import('../src/cos.js');
  assert.equal(cleanAnswer('Skipping broken secondary profile x\nHello Richard.\nsession_id: 123'), 'Hello Richard.');
});

test('replay: records only when statuses change and rebuilds boards', async () => {
  const { record, frames, boardFrom } = await import('../src/replay.js');
  const board = (s) => ({ columns: [{ id: s, jobs: [{ id: 'j1', status: s, title: 'Job', source: 'codex', business: 'tyfys', app: '', meta: {} }] }] });
  const t = Date.parse('2026-10-01T12:00:00');
  assert.equal(record(board('working'), t), true);
  assert.equal(record(board('working'), t + 1000), false);
  assert.equal(record(board('needs_you'), t + 2000), true);
  const f = frames('2026-10-01');
  assert.equal(f.length, 2);
  const b = boardFrom(f[1]);
  assert.equal(b.columns.find((c) => c.id === 'needs_you').jobs[0].id, 'j1');
});
