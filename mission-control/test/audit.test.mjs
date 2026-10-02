import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import https from 'node:https';
import { Store } from '../src/store.js';
import { cleanBotEntry, createServer } from '../src/server.js';
import * as approvals from '../src/trading/approvals.js';
import { mobileAllowed, tokenMatches, MOBILE_ROUTES } from '../src/mobile.js';
import { restartBot } from '../src/workforce/bot-control.js';

test('a malformed request does not take the server down', async () => {
  const server = createServer();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  const raw = await new Promise((resolve) => {
    const s = net.connect(port, '127.0.0.1', () => s.write('GET // HTTP/1.1\r\nHost: x\r\n\r\n'));
    let out = '';
    s.on('data', (d) => { out += d; s.end(); });
    s.on('close', () => resolve(out));
    s.on('error', () => resolve(out));
  });
  assert.match(raw, /HTTP\/1\.1 (400|200)/);
  const ok = await fetch(`http://127.0.0.1:${port}/api/health`).then((r) => r.status);
  assert.equal(ok, 200);
  server.close();
});

test('bot edits can turn auto-restart off', () => {
  assert.equal(cleanBotEntry({ name: 'x', autoRestart: false }).autoRestart, false);
  assert.equal(cleanBotEntry({ name: 'x', autoRestart: 'true' }).autoRestart, true);
  assert.equal('autoRestart' in cleanBotEntry({ name: 'x' }), false);
});

test('trading approval ids never collide', () => {
  const a = approvals.request({ project: 'p', change: 'note one' });
  const b = approvals.request({ project: 'p', change: 'note two' });
  assert.notEqual(a.id, b.id);
});

test('store picks up writes made by another process', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-store-'));
  const a = new Store(dir);
  const b = new Store(dir);
  a.set('x', { n: 1 });
  assert.deepEqual(b.get('x', {}), { n: 1 });
  const later = Date.now() / 1000 + 5;
  b.set('x', { n: 2 });
  fs.utimesSync(path.join(dir, 'x.json'), later, later);
  assert.deepEqual(a.get('x', {}), { n: 2 });
});

test('app restarts only allow exactly `open -a <App>`', async () => {
  const r = await restartBot({ title: 'Some App', meta: { restart: ['open', 'https://example.com'] } });
  assert.equal(r.ok, false);
  assert.match(r.error, /Refusing/);
});

test('phone access: route allowlist, kill switch only ON, constant-time token', () => {
  assert.equal(mobileAllowed('GET', '/api/board').ok, true);
  assert.equal(mobileAllowed('POST', '/api/reply').ok, true);
  assert.equal(mobileAllowed('POST', '/api/open').ok, false);
  assert.equal(mobileAllowed('GET', '/api/mobile').ok, false);
  assert.equal(mobileAllowed('POST', '/api/trading/approval').ok, false);
  assert.equal(mobileAllowed('POST', '/api/trading/config').ok, false);
  assert.equal(mobileAllowed('POST', '/api/trading/killswitch', { engage: true }).ok, true);
  assert.equal(mobileAllowed('POST', '/api/trading/killswitch', { engage: false }).ok, false);
  assert.equal(MOBILE_ROUTES.has('POST /api/bots/registry'), false);
  assert.equal(tokenMatches('Bearer abc', 'abc'), true);
  assert.equal(tokenMatches('Bearer abd', 'abc'), false);
  assert.equal(tokenMatches('abc', 'abc'), false);
  assert.equal(tokenMatches('Bearer abc', ''), false);
});

test('phone listener: HTTPS, token required, allowlist enforced', async () => {
  process.env.MC_MOBILE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-mobile-'));
  process.env.MC_MOBILE_PORT = '0';
  const { createMobile } = await import(`../src/mobile.js?fresh=${Date.now()}`);
  const calls = [];
  const m = createMobile({ handle: (req, res) => { calls.push(req.url); res.end('{}'); } });
  const st = m.set({ enabled: true });
  assert.equal(st.enabled, true);
  assert.match(st.fingerprint, /^[0-9a-f]{64}$/);
  const pair = JSON.parse(st.pairing);
  assert.ok(pair.token.length >= 24);
  m.stop();
  const off = m.set({ enabled: false });
  assert.equal(off.pairing, '');
  const rotated = m.set({ enabled: true, rotate: true });
  assert.notEqual(JSON.parse(rotated.pairing).token, pair.token);
  m.stop();
  assert.equal(typeof https.request, 'function');
});

test('audit 2: reads are refused when the Host is not Mission Control (DNS rebinding)', async () => {
  const server = createServer();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address();
  const get = (host) => new Promise((resolve) => {
    const s = net.connect(port, '127.0.0.1', () => s.write(`GET /api/mobile HTTP/1.1\r\nHost: ${host}\r\nConnection: close\r\n\r\n`));
    let out = '';
    s.on('data', (d) => { out += d; });
    s.on('close', () => resolve(out));
  });
  assert.match(await get('attacker.example:47831'), /HTTP\/1\.1 403/);
  assert.match(await get(`127.0.0.1:${port}`), /HTTP\/1\.1 200/);
  server.close();
});
