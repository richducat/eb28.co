// Runs the WebView-side shim against a fake Capacitor plugin and checks the wallet
// object behaves like @solana-mobile/mobile-wallet-adapter-protocol-web3js `transact`.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.join(here, '..', 'www', 'syncstep-native-mwa.js'), 'utf8');

const calls = [];
const fakePlugin = {
  async authorize(args) { calls.push(['authorize', args]); return { accounts: [{ address: '9o77AkThGHNhNDeowM943dNsCck71VTUeFwBxq3RaGjn', label: 'Seed Vault' }], auth_token: 'tok-1', wallet_uri_base: null }; },
  async signMessages(args) { calls.push(['signMessages', args]); return { accounts: [{ address: '9o77AkThGHNhNDeowM943dNsCck71VTUeFwBxq3RaGjn' }], auth_token: 'tok-2', signatures: [Buffer.alloc(64, 7).toString('base64')], signed_payloads: [Buffer.alloc(64, 7).toString('base64')] }; },
  async signAndSendTransactions(args) { calls.push(['signAndSendTransactions', args]); return { accounts: [{ address: 'x' }], auth_token: 'tok-3', signatures: ['5igNature'] }; },
  async deauthorize(args) { calls.push(['deauthorize', args]); return { ok: true }; },
};
const win = { Capacitor: { isNativePlatform: () => true, registerPlugin: (name) => { assert.equal(name, 'MobileWalletAdapter'); return fakePlugin; } } };
globalThis.window = win; globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64'); globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');
new Function(src)();
assert.equal(typeof win.__syncstepNativeTransact, 'function', 'transact installed');

// 1) authorize (fresh) -> plugin authorize with identity mapped, address surfaced like MWA does
const auth = await win.__syncstepNativeTransact(async (w) => w.authorize({ chain: 'solana:mainnet', identity: { name: 'SyncStep', uri: 'https://eb28.co', icon: '/syncstep/sync-icon.png' } }));
assert.equal(auth.accounts[0].address, '9o77AkThGHNhNDeowM943dNsCck71VTUeFwBxq3RaGjn');
assert.equal(auth.auth_token, 'tok-1');
assert.deepEqual(calls[0][1], { identityUri: 'https://eb28.co', iconUri: 'syncstep/sync-icon.png', identityName: 'SyncStep', authToken: null });

// 2) authorize again with the cached token -> no second wallet round trip
const cached = await win.__syncstepNativeTransact(async (w) => w.authorize({ chain: 'solana:mainnet', identity: {}, auth_token: 'tok-1' }));
assert.equal(cached.auth_token, 'tok-1');
assert.equal(calls.length, 1, 'cached authorize must not call the plugin');

// 3) signMessages -> payloads base64 to native, Uint8Array signatures back (what the game's St() verifies)
const msg = new TextEncoder().encode('SyncStep login abc');
const sigs = await win.__syncstepNativeTransact(async (w) => w.signMessages({ addresses: ['9o77AkThGHNhNDeowM943dNsCck71VTUeFwBxq3RaGjn'], payloads: [msg] }));
assert.ok(sigs[0] instanceof Uint8Array && sigs[0].length === 64);
assert.equal(calls[1][1].authToken, 'tok-1');
assert.equal(Buffer.from(calls[1][1].payloads[0], 'base64').toString(), 'SyncStep login abc');

// 4) signAndSendTransactions -> legacy web3.js Transaction serialised with relaxed options, base58 sig back
let serializeOpts = null;
const legacyTx = { serialize(opts) { serializeOpts = opts; return new Uint8Array([1, 2, 3]); } };
const out = await win.__syncstepNativeTransact(async (w) => w.signAndSendTransactions({ transactions: [legacyTx] }));
assert.deepEqual(out, ['5igNature']);
assert.deepEqual(serializeOpts, { requireAllSignatures: false, verifySignatures: false });
assert.equal(calls[2][1].authToken, 'tok-2', 'token refreshed from the signMessages result');
assert.equal(Buffer.from(calls[2][1].transactions[0], 'base64').toString('hex'), '010203');

// 5) deauthorize clears the cache so the next authorize hits the wallet again
await win.__syncstepNativeTransact(async (w) => w.deauthorize({ auth_token: 'tok-3' }));
assert.equal(calls[3][0], 'deauthorize');
await win.__syncstepNativeTransact(async (w) => w.authorize({ identity: {}, auth_token: 'tok-3' }));
assert.equal(calls[4][0], 'authorize', 'after deauthorize the wallet is asked again');

// 6) plugin rejection surfaces as an Error with code (the game maps unknown -> "rejected")
fakePlugin.authorize = async () => { const e = new Error('No Solana wallet app was found'); e.code = 'ERROR_WALLET_NOT_FOUND'; throw e; };
await assert.rejects(win.__syncstepNativeTransact(async (w) => w.authorize({ identity: {} })), (e) => e.code === 'ERROR_WALLET_NOT_FOUND' && e.name === 'SolanaMobileWalletAdapterError');

// 7) not native -> shim stays out of the way
globalThis.window = { Capacitor: { isNativePlatform: () => false } };
new Function(src)();
assert.equal(globalThis.window.__syncstepNativeTransact, undefined);
console.log('native-mwa shim: 7 checks passed');
