// Contract test for www/syncstep-native-mwa.js under the REAL document-start conditions:
// Capacitor core is NOT loaded yet (no registerPlugin, no Capacitor.Plugins); only the native
// bridge's isNativePlatform + nativePromise exist. The fake native side mimics the Kotlin
// plugin, including real Ed25519 signing, real web3.js transaction parsing and wallet-side
// token invalidation. The game's own St() verifier is ported verbatim.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const nacl = require('tweetnacl');
const bs58 = require('bs58');
const { Keypair, PublicKey, SystemProgram, Transaction } = require('@solana/web3.js');

const here = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.join(here, '..', 'www', 'syncstep-native-mwa.js'), 'utf8');
globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64');
globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary');

// ---- fake wallet + native plugin --------------------------------------------------------
const walletKey = nacl.sign.keyPair();
const walletPub = new PublicKey(walletKey.publicKey);
const validTokens = new Set();
const log = [];
let nextTokenId = 1;
let behaviour = {}; // per-test failure injection
const b64 = (u8) => Buffer.from(u8).toString('base64');

function fakeNative(plugin, method, args) {
  log.push({ method, args: JSON.parse(JSON.stringify(args)) });
  return new Promise((resolve, reject) => {
    const fail = (code, message) => reject({ code, message });
    if (plugin !== 'MobileWalletAdapter') return fail('UNIMPLEMENTED', 'no plugin');
    if (behaviour[method]) { const b = behaviour[method]; behaviour[method] = null; return fail(b.code, b.message); }
    const tokenOk = !args.authToken || validTokens.has(args.authToken);
    if (args.authToken && !tokenOk && method !== 'deauthorize') return fail('ERROR_AUTH_TOKEN_INVALID', 'auth_token not valid');
    const fresh = () => { const t = 'tok-' + nextTokenId++; validTokens.add(t); return t; };
    const auth = (token) => ({ accounts: [{ address: walletPub.toBase58(), address_base64: b64(walletKey.publicKey), label: 'Seed Vault' }], auth_token: token });
    if (method === 'authorize') return resolve(auth(args.authToken || fresh()));
    if (method === 'signMessages') {
      const sigs = args.payloads.map((p) => b64(nacl.sign.detached(Buffer.from(p, 'base64'), walletKey.secretKey)));
      return resolve({ ...auth(args.authToken || fresh()), signatures: sigs, signed_payloads: sigs });
    }
    if (method === 'signAndSendTransactions') {
      const tx = Transaction.from(Buffer.from(args.transactions[0], 'base64'));
      assert.equal(tx.feePayer.toBase58(), walletPub.toBase58(), 'native side parsed the fee payer');
      assert.equal(tx.instructions.length, 1);
      return resolve({ ...auth(args.authToken || fresh()), signatures: [bs58.encode(nacl.randomBytes(64))] });
    }
    if (method === 'deauthorize') { validTokens.delete(args.authToken); return resolve({ ok: true }); }
    return fail('UNIMPLEMENTED', method);
  });
}
const nativeCalls = () => log.filter((c) => c.method !== 'deauthorize').length;

// ---- the game's own St() (ported from the shipped bundle) ---------------------------------
function St(signaturePayload, message, address) {
  const pub = new PublicKey(address).toBytes();
  const candidates = [];
  if (signaturePayload.length === 64) candidates.push(signaturePayload);
  if (signaturePayload.length > 64) { candidates.push(signaturePayload.slice(signaturePayload.length - 64)); candidates.push(signaturePayload.slice(0, 64)); }
  for (const c of candidates) if (nacl.sign.detached.verify(message, c, pub)) return c;
  throw new Error('signature_extract_failed');
}
// the game's gt(): base58 32-byte key, else base64
function gt(addr) {
  try { const k = new PublicKey(addr); if (k.toBytes().length === 32) return k.toBase58(); } catch {}
  return new PublicKey(Uint8Array.from(atob(addr), (c) => c.charCodeAt(0))).toBase58();
}

// ---- 1) lazy availability: load BEFORE Capacitor core/nativePromise exist ------------------
globalThis.window = { Capacitor: { isNativePlatform: () => true /* native-bridge.js at document start */ } };
new Function(src)();
assert.equal(typeof window.__syncstepNativeTransact, 'function');
assert.equal(window.__syncstepNativeAvailable(), false, 'not available until nativePromise exists (evaluated lazily)');
window.Capacitor.nativePromise = fakeNative; // no registerPlugin, no Plugins: exactly like document start
assert.equal(window.Capacitor.registerPlugin, undefined);
assert.equal(window.Capacitor.Plugins, undefined);
assert.equal(window.__syncstepNativeAvailable(), true, 'available once the bridge has nativePromise');
const transact = window.__syncstepNativeTransact;
const IDENT = { name: 'SyncStep', uri: 'https://eb28.co', icon: '/syncstep/sync-icon.png' };

// ---- 2) Connect: vt() authorize, then yt()/xt() authorize(token) + signMessages, then St() ----
const v = await transact((w) => w.authorize({ chain: 'solana:mainnet', identity: IDENT }));
const address = gt(v.accounts[0].address);
assert.equal(address, walletPub.toBase58());
assert.deepEqual(log[0].args, { identityUri: 'https://eb28.co', iconUri: 'syncstep/sync-icon.png', identityName: 'SyncStep', authToken: null });
const nonce = 'SyncStep login fcc99389b84c177eea6ad7a4';
const msg = new TextEncoder().encode(nonce);
const before = nativeCalls();
const signed = await transact(async (w) => {
  const a = await w.authorize({ chain: 'solana:mainnet', identity: IDENT, auth_token: v.auth_token });
  return { sigs: await w.signMessages({ addresses: [a.accounts[0].address], payloads: [msg] }) };
});
assert.equal(nativeCalls() - before, 1, 'repeat authorize with the same token must not open a second wallet session');
const goodSig = St(new Uint8Array(signed.sigs[0]), msg, address);
assert.equal(goodSig.length, 64);
assert.throws(() => St(new Uint8Array(signed.sigs[0]), new TextEncoder().encode('tampered'), address), /signature_extract_failed/);

// ---- 3) Purchase (patched bt()): authorize(token) is free, one wallet session total ---------
const payer = walletPub, treasury = Keypair.generate().publicKey;
const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: payer, toPubkey: treasury, lamports: 5_000_000 }));
tx.recentBlockhash = bs58.encode(nacl.randomBytes(32)); tx.feePayer = payer;
let tokenNow = signed && (await transact((w) => w.authorize({ identity: IDENT, auth_token: log.at(-1).args.authToken }))).auth_token;
const b0 = nativeCalls();
const sent = await transact(async (w) => {
  const a = await w.authorize({ chain: 'solana:mainnet', identity: IDENT, auth_token: tokenNow });
  return (await w.signAndSendTransactions({ transactions: [tx], account: a.accounts[0] }))[0];
});
assert.equal(nativeCalls() - b0, 1, 'purchase must be exactly one wallet session');
assert.equal(bs58.decode(sent).length, 64, 'game receives a base58 64-byte signature');

// ---- 4) Wallet forgets our token: shim drops it and retries once from scratch ---------------
validTokens.clear();
const b1 = nativeCalls();
const recovered = await transact(async (w) => (await w.signMessages({ addresses: [address], payloads: [msg] })));
assert.equal(nativeCalls() - b1, 2, 'one rejected call with the stale token, one fresh retry');
assert.equal(log.at(-1).args.authToken, null, 'retry carries no token');
St(new Uint8Array(recovered[0]), msg, address);

// ---- 5) User cancels: no retry, code preserved, game can map it -----------------------------
const cur = (await transact((w) => w.authorize({ identity: IDENT }))).auth_token;
behaviour.signMessages = { code: 'ERROR_ASSOCIATION_CANCELLED', message: 'cancelled' };
const b2 = nativeCalls();
await assert.rejects(transact((w) => w.signMessages({ addresses: [address], payloads: [msg] })), (e) => e.code === 'ERROR_ASSOCIATION_CANCELLED' && e.name === 'SolanaMobileWalletAdapterError');
assert.equal(nativeCalls() - b2, 1, 'cancel must not trigger a second wallet prompt');
assert.ok(cur);

// ---- 6) No wallet installed: code reaches the game (patched vt() maps it to no_wallet) ------
behaviour.authorize = { code: 'ERROR_WALLET_NOT_FOUND', message: 'No Solana wallet app was found' };
await assert.rejects(transact((w) => w.authorize({ identity: IDENT, auth_token: null })), (e) => e.code === 'ERROR_WALLET_NOT_FOUND');

// ---- 7) Disconnect: deauthorize clears the token so the wallet is asked again ---------------
const t1 = (await transact((w) => w.authorize({ identity: IDENT }))).auth_token;
await transact((w) => w.deauthorize({ auth_token: t1 }));
assert.equal(log.at(-1).method, 'deauthorize');
const b3 = nativeCalls();
await transact((w) => w.authorize({ identity: IDENT, auth_token: t1 }));
assert.equal(nativeCalls() - b3 >= 1, true, 'after deauthorize the wallet is contacted again');

// ---- 8) VersionedTransaction branch + not-native guard --------------------------------------
let opts = 'untouched';
await transact((w) => w.signAndSendTransactions({ transactions: [{ message: {}, version: 0, serialize() { opts = undefined; return tx.serialize({ requireAllSignatures: false, verifySignatures: false }); } }] }));
assert.equal(opts, undefined, 'versioned transactions serialise without legacy options');
globalThis.window = { Capacitor: { isNativePlatform: () => false, nativePromise: fakeNative } };
new Function(src)();
assert.equal(window.__syncstepNativeAvailable(), false, 'plain browser: the game keeps using the web MWA path');

// ---- 9) The shipped bundle and the APK assets carry the patches -----------------------------
const bundle = readFileSync(path.join(here, '..', 'www', 'assets', 'index-DXPA_3cK.js'), 'utf8');
const count = (s) => bundle.split(s).length - 1;
assert.equal(count('__syncstepNativeAvailable'), 6, 'six patched call sites');
assert.equal(count('if(window.__syncstepNativeTransact)return'), 0, 'old eager check is gone');
assert.ok(bundle.includes('ERROR_WALLET_NOT_FOUND') && bundle.includes('`waf`'));
const index = readFileSync(path.join(here, '..', 'www', 'index.html'), 'utf8');
assert.ok(index.indexOf('syncstep-native-mwa.js') < index.indexOf('/assets/index-DXPA_3cK.js'), 'shim loads before the game bundle');

// ---- 10) The patched server client really rides out the bot shield ---------------------------
// Runs the shipped Lt()/Rt() from the bundle against a fake, flaky fetch (network error, then the
// Imunify360 challenge page, then success) and records the back-off delays it asks for.
const lo = bundle.indexOf('async function Lt('), hi = bundle.indexOf('var zt=new Set;', lo);
assert.ok(lo > 0 && hi > lo, 'found Lt/Rt in the bundle');
const chunk = bundle.slice(lo, hi);
function client(responses) {
  const delays = []; let calls = 0; let cleared401 = 0;
  const ctx = {
    Ct: 'https://api.test', B: null, Tt: 250, zt: new Set(), Pt() { cleared401++; },
    setTimeout: (f, ms) => { delays.push(ms); return setTimeout(f, ms >= 1000 ? 5 : ms); }, clearTimeout,
    AbortController, Promise, JSON, Error, URL,
    fetch: async () => { const r = responses[Math.min(calls, responses.length - 1)]; calls++; if (r instanceof Error) throw r; return r; },
  };
  ctx.Dt = class NetError extends Error { constructor(code, msg, status = 0) { super(msg || code); this.code = code; this.status = status; } };
  vm.createContext(ctx); vm.runInContext(chunk + '\nthis.Lt = Lt;', ctx);
  return { ctx, delays: () => delays.filter((d) => d >= 1000), calls: () => calls, cleared401: () => cleared401 };
}
const res = (status, body, ok = status >= 200 && status < 300) => ({ status, ok, statusText: String(status), text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) });
const CHALLENGE = '<!DOCTYPE html><html lang="en"><head><title>One moment, please...</title></head></html>';
const IMUNIFY = { message: 'Access denied by Imunify360 bot-protection. IPs used for automation should be whitelisted' };

let c = client([new TypeError('Failed to fetch'), res(200, CHALLENGE), res(200, { nonce: 'SyncStep login abc' })]);
assert.deepEqual(await c.ctx.Lt('/auth/nonce', { method: 'POST', body: {} }), { nonce: 'SyncStep login abc' });
assert.equal(c.calls(), 3, 'network error, then challenge page, then success');
assert.deepEqual(c.delays(), [1200, 3000], 'backs off between attempts');

c = client([res(403, IMUNIFY, false), res(200, { ok: true })]);
assert.deepEqual(await c.ctx.Lt('/x'), { ok: true }, 'Imunify 403 JSON is retried');

c = client([res(200, CHALLENGE), res(200, CHALLENGE), res(200, CHALLENGE)]);
await assert.rejects(c.ctx.Lt('/x'), (e) => e.code === 'waf', 'a persistent challenge surfaces as waf (clear message), after exactly 3 tries');
assert.equal(c.calls(), 3);

c = client([new TypeError('x'), new TypeError('x'), new TypeError('x')]);
await assert.rejects(c.ctx.Lt('/x'), (e) => e.code === 'network');
assert.equal(c.calls(), 3);

c = client([res(401, { error: { code: 'unauthorized', message: 'invalid or expired session' } }, false)]);
await assert.rejects(c.ctx.Lt('/api/state'), (e) => e.code === 'unauthorized' && e.status === 401);
assert.equal(c.calls(), 1, '401 is final, never retried');
assert.equal(c.cleared401(), 1, '401 still clears the saved session');

c = client([res(400, { error: { code: 'bad_request', message: 'wallet required' } }, false)]);
await assert.rejects(c.ctx.Lt('/auth/nonce', { method: 'POST', body: {} }), (e) => e.code === 'bad_request');
assert.equal(c.calls(), 1, 'real API errors are not retried');

// ---- 11) account state + disconnect are wired in the shipped bundle and page -------------------
assert.ok(index.includes('id="disconnectBtn"'), 'Disconnect button present in the Wallet tab');
assert.equal(count('`disconnectBtn`'), 2, 'handler + visibility toggle');
assert.ok(bundle.includes('`Connected · ${e.wallet.slice(0,4)}'), 'connected account state shown');
assert.ok(bundle.includes('window.__syncstepNativeForget&&window.__syncstepNativeForget(),pt=null,I.disconnectWallet(),Pt()'), 'disconnect clears wallet, token, session');
console.log('native-mwa contract: all checks passed');
