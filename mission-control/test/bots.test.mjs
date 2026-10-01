import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { botStatus, botToJob, detectProvider, parsePs, tailLog } from '../src/sources/bots.js';
import { cleanBotEntry } from '../src/server.js';
import { restartBot } from '../src/workforce/bot-control.js';

const NOW = Date.parse('2026-10-01T12:00:00Z');
const log = (over = {}) => ({ mtime: NOW - 60e3, lines: ['ok'], lastError: '', errorIsLatest: false, ...over });

test('provider detection from names, command lines, and script source', () => {
  assert.equal(detectProvider('node grok-reply.mjs'), 'grok');
  assert.equal(detectProvider('', "fetch('https://api.x.ai/v1/chat/completions')"), 'grok');
  assert.equal(detectProvider('python bot.py', 'client = Anthropic()  # ANTHROPIC_API_KEY'), 'claude');
  assert.equal(detectProvider('worker', 'OPENAI_API_KEY'), 'openai');
  assert.equal(detectProvider('backup-script', 'rsync -a'), '');
});

test('bot status rules', () => {
  const s = (b) => botStatus(b, NOW).status;
  assert.equal(s({ state: 'running', log: log() }), 'working');
  assert.equal(s({ state: 'running', log: log({ mtime: NOW - 5 * 3600e3 }) }), 'follow_up', 'running but silent');
  assert.equal(s({ state: 'running', staleAfterMin: 600, log: log({ mtime: NOW - 5 * 3600e3 }) }), 'working', 'custom stale window');
  assert.equal(s({ state: 'running', log: log({ errorIsLatest: true, lastError: 'Error: 401 Unauthorized' }) }), 'needs_you');
  assert.equal(s({ state: 'crashed', exitCode: 1 }), 'failed');
  assert.equal(s({ state: 'stopped' }), 'follow_up');
  assert.equal(s({ state: 'stopped', expected: true }), 'failed');
  assert.equal(s({ state: 'stopped', expected: false }), 'done');
  assert.equal(s({ state: 'running', restarts: 9, recentRestart: true }), 'failed', 'crash loop');
  assert.equal(s({ state: 'running', health: { ok: false, error: 'HTTP 502' } }), 'failed');
});

test('ps parsing finds grok bots and skips noise', () => {
  const out = [
    '  101 01:02:03 node /Users/r/bots/grok-x-reply.mjs',
    '  102 00:10 /usr/bin/python3 /Users/r/xai/trader.py --live',
    '  103 00:01 grep grok',
    '  104 00:05 /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --grok',
    '  105 00:05 node /Users/r/other.js',
  ].join('\n');
  const rows = parsePs(out, /grok|xai/i, 1);
  assert.deepEqual(rows.map((r) => r.pid), [101, 102]);
  assert.equal(rows[0].script, '/Users/r/bots/grok-x-reply.mjs');
  assert.equal(rows[1].name, 'trader.py');
});

test('tailLog spots the latest error line', () => {
  const file = path.join(os.tmpdir(), `mc-bot-${process.pid}.log`);
  fs.writeFileSync(file, 'started\nposted 3 replies\nError: 429 Too Many Requests\n');
  const t = tailLog(file);
  assert.equal(t.errorIsLatest, true);
  assert.match(t.lastError, /429/);
  fs.appendFileSync(file, 'retry ok\n');
  assert.equal(tailLog(file).errorIsLatest, false);
  fs.writeFileSync(file, 'started\nTraceback (most recent call last):\n  File "bot.py", line 3\nKeyError: token\n');
  assert.equal(tailLog(file).lastError, 'KeyError: token', 'python traceback reports the real error');
  assert.equal(tailLog(file).errorIsLatest, true);
  fs.unlinkSync(file);
  assert.equal(tailLog('/no/such/file'), null);
});

test('botToJob carries provider, restart, and log into the job', () => {
  const job = botToJob({ key: 'pm2:grok-bot', name: 'grok-bot', manager: 'pm2', state: 'running', pid: 42, provider: 'grok', restart: ['pm2', 'restart', 'grok-bot'], log: log({ lines: ['a', 'b'] }) }, NOW);
  assert.equal(job.id, 'bot:pm2:grok-bot');
  assert.equal(job.source, 'bot');
  assert.equal(job.meta.providerLabel, 'Grok');
  assert.equal(job.resumeCommand, 'pm2 restart grok-bot');
  assert.equal(job.lastMessage, 'a\nb');
  const custom = botToJob({ key: 'registry:Dot', name: 'Dot', manager: 'registry', state: 'running', provider: 'dot' }, NOW);
  assert.equal(custom.meta.providerLabel, 'Dot');
});

test('bot form input is cleaned into a bots.json entry', () => {
  const e = cleanBotEntry({ name: ' Dot ', provider: 'Dot', restart: 'pm2 restart dot', expected: 'true', autoRestart: false, log: '', junk: 'x' });
  assert.deepEqual(e, { name: 'Dot', provider: 'dot', restart: ['pm2', 'restart', 'dot'], expected: true });
});

test('restart refuses binaries outside the allow-list', async () => {
  const r = await restartBot({ id: 'bot:x', title: 'x', meta: { restart: ['rm', '-rf', '/'] } });
  assert.equal(r.ok, false);
  assert.match(r.error, /Refusing/);
  const none = await restartBot({ id: 'bot:y', title: 'y', meta: {} });
  assert.match(none.error, /no restart command/);
});

test('parsePs: a macOS app and its Electron helpers count as one bot', () => {
  const out = [
    '100 01:00 /Applications/Grok Bot.app/Contents/MacOS/Grok Bot',
    '101 01:00 /Applications/Grok Bot.app/Contents/Frameworks/Grok Bot Helper.app/Contents/MacOS/Grok Bot Helper --type=gpu-process',
    '102 01:00 /Applications/Grok Bot.app/Contents/Frameworks/Electron Framework.framework/Helpers/chrome_crashpad_handler --x',
    '103 01:00 /Applications/ChatGPT.app/Contents/Frameworks/Codex Framework.framework/Helpers/Codex (Renderer).app/Contents/MacOS/Codex (Renderer) --type=renderer --flag=xai',
    '104 01:00 node /srv/bots/grok-poster.js',
  ].join('\n');
  const rows = parsePs(out, /grok|xai/i, 1);
  assert.deepEqual(rows.map((r) => r.name), ['Grok Bot', 'grok-poster.js']);
  assert.equal(rows[0].app, '/Applications/Grok Bot.app');
});
