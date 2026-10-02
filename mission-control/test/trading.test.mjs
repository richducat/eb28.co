import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as keychain from '../src/trading/keychain.js';
import { call as solCall } from '../src/trading/rpc/solana.js';
import { call as polyCall } from '../src/trading/rpc/polygon.js';
import { scrubSecrets, safeError } from '../src/trading/redact.js';
import * as killswitch from '../src/trading/killswitch.js';
import * as approvals from '../src/trading/approvals.js';
import { applyPatch, configFile, loadConfig } from '../src/trading/config.js';
import { summarizePositions } from '../src/trading/connectors/polymarket.js';
import { collectTrading, _resetCache } from '../src/trading/index.js';
import { isTradingBot, restartBot, canAutoRestart } from '../src/workforce/bot-control.js';

const SECRET = 'sk-live-SUPERSECRET-0123456789abcdef';
const SOL = 'So11111111111111111111111111111111111111112'; // public Wrapped SOL mint, not a personal wallet

test('keychain: allow-listed names only; values never appear in errors', async () => {
  const calls = [];
  keychain._setRunner(async (args) => { calls.push(args); return args.includes('-w') ? { code: 0, stdout: `${SECRET}\n` } : { code: 0, stdout: '' }; });
  assert.equal(await keychain.has('simmer-api-key'), true);
  assert.ok(!calls[0].includes('-w'), 'has() must not ask for the value');
  assert.equal(await keychain.get('simmer-api-key'), SECRET);
  await assert.rejects(keychain.get('../../etc'), /allow-list/);
  keychain._setRunner(async () => ({ code: 44, stdout: '' }));
  await assert.rejects(keychain.get('simmer-api-key'), (err) => !err.message.includes(SECRET) && /not found/.test(err.message));
});

test('rpc: only read methods can ever be sent', async () => {
  const fetchImpl = async () => { throw new Error('network must not be reached'); };
  for (const m of ['sendTransaction', 'simulateTransaction', 'requestAirdrop', 'signMessage']) await assert.rejects(solCall(m, [], { fetchImpl }), /Refused/);
  for (const m of ['eth_sendRawTransaction', 'eth_sendTransaction', 'eth_sign', 'personal_sign']) await assert.rejects(polyCall(m, [], { fetchImpl }), /Refused/);
  // eth_call is limited to balanceOf / symbol / decimals selectors (no approve/transfer calldata)
  await assert.rejects(polyCall('eth_call', [{ to: '0x' + '1'.repeat(40), data: '0xa9059cbb' + '0'.repeat(128) }, 'latest'], { fetchImpl }), /Refused/);
});

test('redact: secrets are scrubbed from objects and errors', () => {
  const out = JSON.stringify(scrubSecrets({ apiKey: SECRET, msg: `Authorization: Bearer ${SECRET}`, url: `https://x.test/?api_key=${SECRET}` }));
  assert.ok(!out.includes(SECRET), out);
  assert.equal(safeError('Simmer', { status: 401 }), 'Simmer request failed (HTTP 401)');
  assert.ok(!safeError('Simmer', new Error(`bad token=${SECRET}`)).includes(SECRET));
});

test('kill switch: engage is one click; disengage needs Touch ID and the phrase', async () => {
  killswitch.engage('test');
  assert.equal(killswitch.master(), true);
  await assert.rejects(killswitch.disengage({ phrase: killswitch.DISENGAGE_PHRASE }, {}), /Touch ID/);
  await assert.rejects(killswitch.disengage({ phrase: 'yes' }, { confirmOwner: async () => true }), /Type exactly/);
  await assert.rejects(killswitch.disengage({ phrase: killswitch.DISENGAGE_PHRASE }, { confirmOwner: async () => { throw new Error('Touch ID cancelled'); } }), /cancelled/);
  assert.equal(killswitch.master(), true, 'a failed Touch ID must leave the switch ON');
  await killswitch.disengage({ phrase: killswitch.DISENGAGE_PHRASE }, { confirmOwner: async () => true });
  assert.equal(killswitch.master(), false);
  killswitch.engage('test');
});

test('approvals: record-only; risky ones need Touch ID and the typed phrase', async () => {
  const a = approvals.request({ project: 'DayTradingBot', change: 'enable live trading' });
  await assert.rejects(approvals.decide({ id: a.id, decision: 'approved' }, {}), /Touch ID/);
  await assert.rejects(approvals.decide({ id: a.id, decision: 'approved', phrase: 'ok' }, { confirmOwner: async () => true }), /Type exactly/);
  const done = await approvals.decide({ id: a.id, decision: 'approved', phrase: approvals.phraseFor(a) }, { confirmOwner: async () => true });
  assert.equal(done.confirmMethod, 'touchid');
  const b = approvals.request({ project: 'FundManager', change: 'add a note' });
  assert.equal((await approvals.decide({ id: b.id, decision: 'denied' }, {})).decision, 'denied');
});

test('config: validated edits only, file stays outside the repo', () => {
  assert.ok(!configFile().includes('mission-control'), configFile());
  assert.throws(() => applyPatch({ addWallet: { chain: 'solana', address: 'not-an-address' } }), /valid solana/);
  applyPatch({ addWallet: { chain: 'solana', address: SOL, label: 'Test' } });
  assert.equal(loadConfig().wallets.length, 1);
  assert.equal(loadConfig().killSwitch, true);
});

test('polymarket: positions summarize into exposure and PnL', () => {
  const s = summarizePositions([{ currentValue: 10, initialValue: 12, cashPnl: -2, redeemable: false, title: 'A' }, { currentValue: 0, initialValue: 6, cashPnl: -6, redeemable: true, title: 'B' }]);
  assert.equal(s.open, 1);
  assert.equal(s.exposure, 10);
  assert.equal(s.cashPnl, -8);
});

test('snapshot: never contains a secret, even when the Keychain returns one', async () => {
  keychain._setRunner(async (args) => (args.includes('-w') ? { code: 0, stdout: SECRET } : { code: 0, stdout: '' }));
  const fetchImpl = async (url) => {
    const u = String(url);
    const body = u.includes('mainnet-beta') ? { jsonrpc: '2.0', id: 1, result: { value: [] } } : u.includes('price/v3') ? {} : u.includes('tokens/v2') ? [] : u.includes('sync.chatbotbuilder') ? { ok: true, chainReady: false, treasury: null } : [];
    return { ok: true, status: 200, json: async () => (u.includes('getBalance') ? body : body) };
  };
  _resetCache();
  const s = await collectTrading({ force: true, fetchImpl });
  const text = JSON.stringify(s);
  assert.ok(!text.includes(SECRET));
  assert.equal(s.watchOnly, true);
  assert.equal(s.killSwitch.master, true);
});

test('bots: trading bots are never restarted from Mission Control', async () => {
  const bot = { id: 'bot:launchd:ai.example.simmer.runner', title: 'ai.example.simmer.runner', meta: { restart: ['launchctl', 'kickstart', '-k', 'gui/501/ai.example.simmer.runner'], autoRestart: true } };
  assert.equal(isTradingBot(bot), true);
  assert.equal(canAutoRestart(bot), false);
  assert.match((await restartBot(bot)).error, /never restarted/);
  assert.equal(isTradingBot({ title: 'Grok Bot', meta: { restart: ['open', '-a', '/Applications/Grok Bot.app'] } }), false);
});
