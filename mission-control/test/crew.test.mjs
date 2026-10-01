import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { listCrew, yamlField } from '../src/sources/hermes-crew.js';
import { parseRollout } from '../src/sources/codex.js';

test('hermes crew: title from profile.yaml, busy from recent logs', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-crew-'));
  fs.mkdirSync(path.join(dir, 'tyfys-cos', 'logs'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'tyfys-cos', 'profile.yaml'), 'description: Chief of Staff for TYFYS\nui_meta:\n  hermes-bots:\n    title: "TYFYS CoS"\n');
  fs.writeFileSync(path.join(dir, 'tyfys-cos', 'logs', 'agent.log'), 'hi');
  fs.mkdirSync(path.join(dir, 'idle'));
  const crew = listCrew({ dir });
  assert.deepEqual(crew.map((c) => [c.id, c.title, c.busy]), [['crew:idle', 'idle', false], ['crew:tyfys-cos', 'TYFYS CoS', true]]);
  assert.equal(yamlField('description: Chief of Staff', 'description'), 'Chief of Staff');
});

test('codex: threads handed over by voice are tagged as Dot (OG Kush)', () => {
  const file = path.join(os.tmpdir(), `mc-dot-${process.pid}.jsonl`);
  const rec = (role, text) => JSON.stringify({ timestamp: '2026-10-01T12:00:00Z', type: 'response_item', payload: { type: 'message', role, content: [{ type: 'input_text', text }] } });
  fs.writeFileSync(file, [JSON.stringify({ timestamp: '2026-10-01T12:00:00Z', type: 'session_meta', payload: { id: 'abc', cwd: '/x' } }), rec('user', '<realtime_delegation><input>check the meta leads</input></realtime_delegation>'), rec('assistant', 'On it.')].join('\n'));
  const job = parseRollout(file, { now: Date.parse('2026-10-01T12:01:00Z') });
  assert.equal(job.meta.alias, 'OG Kush');
  assert.ok(job.tags.includes('dot'));
});
