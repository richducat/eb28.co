import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { answeredIds, collect, parseDecisions, parseReport, recordAnswer } from '../src/sources/hermes-handoff.js';
import { optionsFromText } from '../src/reply.js';

const QUEUE = `- id=3e8fe4b1b5 · 2026-10-01 07:59 AM ET · source: tyfys · Q: RingCentral SMS: resubmit RCAPP_2 · Options: Done / Have Chris do it
- id=aa11bb22cc · 2026-10-01 08:10 AM ET · source: health-presort · Health item – ask CoS
`;

test('decisions: parse questions, options and sensitive pointers', () => {
  const d = parseDecisions(QUEUE);
  assert.equal(d.length, 2);
  assert.deepEqual(d[0].options, ['Done', 'Have Chris do it']);
  assert.equal(d[0].source, 'tyfys');
  assert.equal(d[1].question, 'Health item – ask CoS');
  assert.deepEqual(d[1].options, []);
});

test('decisions: answering writes answers.md and hides the card', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-hand-'));
  fs.mkdirSync(path.join(dir, 'decisions'));
  fs.writeFileSync(path.join(dir, 'decisions', 'queue.md'), QUEUE);
  process.env.MC_HANDOFF_DIR = dir;
  assert.equal((await collect()).filter((j) => j.status === 'needs_you').length, 2);
  const line = recordAnswer('3e8fe4b1b5', 'Have Chris do it', dir);
  assert.match(line, /^- id=3e8fe4b1b5 · \d{4}-\d{2}-\d{2} \d{2}:\d{2} [AP]M ET · answer: Have Chris do it · via: mission-control$/);
  assert.ok(answeredIds(dir).has('3e8fe4b1b5'));
  assert.deepEqual((await collect()).filter((j) => j.status === 'needs_you').map((j) => j.id), ['decision:aa11bb22cc']);
  delete process.env.MC_HANDOFF_DIR;
});

test('reports: title, summary and Needs Richard bullets', () => {
  const r = parseReport('# Lab Studio scan\n\n## Summary\nNothing new.\n\n## Urgent (48h or less)\nNone.\n\n## Needs Richard\n- Fix App Review issue\n- Green-light Toby draft\n\n## FYI\n- x');
  assert.equal(r.title, 'Lab Studio scan');
  assert.equal(r.summary, 'Nothing new.');
  assert.deepEqual(r.needs, ['Fix App Review issue', 'Green-light Toby draft']);
});

test('optionsFromText: obvious answers from the agent\'s own words', () => {
  assert.deepEqual(optionsFromText('Fixed it. Want me to deploy now?').map((o) => o.label), ['Yes, go ahead', 'No, hold off']);
  assert.deepEqual(optionsFromText('Which approach do you prefer?\n1. Patch the parser\n2. Regenerate the page\n3. Do both').map((o) => o.label), ['Patch the parser', 'Regenerate the page', 'Do both']);
  assert.deepEqual(optionsFromText('Three questions:\n1. What is Dot?\n2. Where do bots run?\n3. Is it broken?'), []);
});
