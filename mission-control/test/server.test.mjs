import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { terminalScript, openLocal } from '../src/server.js';
import { which } from '../src/paths.js';
import { runAutomation, validate } from '../src/workforce/automations.js';

test('terminal script runs the command through a login shell with quoting intact', () => {
  const cmd = `cd /tmp && echo "it's alive"`;
  const script = terminalScript(cmd);
  assert.match(script, /^#!\/bin\/zsh -l\n/);
  const file = path.join(os.tmpdir(), `mc-${process.pid}.sh`);
  fs.writeFileSync(file, script.replace('#!/bin/zsh -l', '#!/bin/sh').replace('clear\n', ''), { mode: 0o755 });
  const out = execFileSync('sh', [file], { encoding: 'utf8' });
  assert.ok(out.includes(`» ${cmd}`), 'echoes the command');
  fs.unlinkSync(file);
});

test('which resolves real binaries and rejects missing ones', () => {
  assert.ok(which('node'));
  assert.equal(which('mission-control-no-such-binary'), null);
});

test('openLocal reports failures instead of swallowing them', async () => {
  const r = await openLocal({ path: '/definitely/not/here' });
  assert.equal(r.ok, false);
  assert.match(r.error, /not found/);
});

test('automation with a missing binary fails with a clear message', async () => {
  const a = validate({ id: 'test:missing', title: 't', command: ['mission-control-no-such-binary', '--x'], tier: 'safe' });
  const run = await runAutomation(a, { trigger: 'test' });
  assert.equal(run.ok, false);
  assert.match(run.error, /not found on PATH/);
});
