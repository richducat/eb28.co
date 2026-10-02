import crypto from 'node:crypto';
import fs from 'node:fs';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { MC_HOME } from './config.js';

/**
 * Phone access: a second, HTTPS-only listener on the home network for the iPhone app.
 *
 * - Off until Richard turns it on (Phone button in the header).
 * - Encrypted with a self-signed certificate made on this Mac; the app pins its SHA-256
 *   fingerprint (from the pairing QR code), so nobody else on the Wi-Fi can impersonate it.
 * - Every request needs the pairing token (Bearer). "New code" rotates it and unpairs the phone.
 * - Only the routes in MOBILE_ROUTES are reachable. The kill switch can be turned ON from the
 *   phone but never off, and nothing that needs Touch ID is exposed.
 */
export const MOBILE_PORT = Number(process.env.MC_MOBILE_PORT || 47832);
const dir = () => process.env.MC_MOBILE_DIR || path.join(MC_HOME, 'mobile');

export const MOBILE_ROUTES = new Set([
  'GET /api/health',
  'GET /api/events',
  'GET /api/board',
  'GET /api/job',
  'GET /api/ask',
  'GET /api/cos',
  'GET /api/tyfys',
  'GET /api/usage',
  'GET /api/workforce',
  'GET /api/bots',
  'GET /api/digests',
  'GET /api/automations',
  'GET /api/trading',
  'GET /api/today',
  'GET /api/calendar',
  'GET /api/tasks',
  'POST /api/tasks',
  'POST /api/day',
  'POST /api/today/suggest',
  'POST /api/refresh',
  'POST /api/reply',
  'POST /api/decision',
  'POST /api/cos',
  'POST /api/job/override',
  'POST /api/bots/restart',
  'POST /api/workforce/proposal',
  'POST /api/automations/run',
  'POST /api/trading/refresh',
  'POST /api/trading/killswitch',
]);

/** Is this remote request allowed? Pure; exported for tests. */
export function mobileAllowed(method, pathname, body = {}) {
  if (!MOBILE_ROUTES.has(`${method} ${pathname}`)) return { ok: false, code: 404, reason: 'Not available from the phone.' };
  if (pathname === '/api/trading/killswitch' && body.engage !== true) return { ok: false, code: 403, reason: 'The kill switch can only be turned off on the Mac (Touch ID).' };
  return { ok: true };
}

/** Constant-time token check. Exported for tests. */
export function tokenMatches(header, token) {
  const m = /^Bearer\s+(\S+)$/i.exec(String(header || ''));
  if (!m || !token) return false;
  const a = Buffer.from(m[1]);
  const b = Buffer.from(token);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const read = (f) => { try { return fs.readFileSync(path.join(dir(), f), 'utf8').trim(); } catch { return ''; } };
const write = (f, s) => {
  fs.mkdirSync(dir(), { recursive: true, mode: 0o700 });
  const tmp = path.join(dir(), `${f}.tmp`);
  fs.writeFileSync(tmp, s, { mode: 0o600 });
  fs.renameSync(tmp, path.join(dir(), f));
};

function ensureCert() {
  if (read('cert.pem') && read('key.pem').startsWith('-----BEGIN PRIVATE KEY-----')) return;
  fs.mkdirSync(dir(), { recursive: true, mode: 0o700 });
  // PKCS#8 from Node itself (Electron's TLS can't read the EC key format macOS openssl writes)
  const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  write('key.pem', privateKey.export({ type: 'pkcs8', format: 'pem' }));
  execFileSync('/usr/bin/openssl', ['req', '-x509', '-new', '-key', path.join(dir(), 'key.pem'), '-days', '3650', '-sha256',
    '-subj', '/CN=EB28 Mission Control', '-out', path.join(dir(), 'cert.pem')], { stdio: 'ignore', timeout: 15000 });
}

function ensureToken(rotate = false) {
  let t = read('token');
  if (!t || rotate) { t = crypto.randomBytes(24).toString('base64url'); write('token', t); }
  return t;
}

export function fingerprint(pem = read('cert.pem')) {
  if (!pem) return '';
  return new crypto.X509Certificate(pem).fingerprint256.replace(/:/g, '').toLowerCase();
}

function lanAddresses() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) if (a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.')) out.push(a.address);
  }
  return out;
}

function localHostName() {
  try { return execFileSync('/usr/sbin/scutil', ['--get', 'LocalHostName'], { encoding: 'utf8', timeout: 3000 }).trim(); } catch { return ''; }
}

export function createMobile({ handle }) {
  let srv = null;
  let lastError = '';
  const enabled = () => read('enabled') === '1';

  function start() {
    if (srv) return;
    ensureCert();
    const token = ensureToken();
    srv = https.createServer({ key: read('key.pem'), cert: read('cert.pem') }, (req, res) => {
      if (!tokenMatches(req.headers.authorization, read('token') || token)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Not paired. Scan the code in Mission Control → Phone.' }));
      }
      handle(req, res, { remote: true });
    });
    srv.on('error', (err) => { lastError = err.message; srv = null; });
    srv.listen(MOBILE_PORT, '0.0.0.0');
  }
  function stop() {
    if (srv) srv.close();
    srv = null;
  }

  return {
    autostart() { if (enabled()) try { start(); } catch (err) { lastError = err.message; } },
    status() {
      const on = enabled();
      const token = on ? ensureToken() : '';
      const host = localHostName();
      const urls = [...lanAddresses().map((ip) => `https://${ip}:${MOBILE_PORT}`), ...(host ? [`https://${host}.local:${MOBILE_PORT}`] : [])];
      const fp = on ? fingerprint() : '';
      return {
        enabled: on,
        listening: Boolean(srv && srv.listening),
        port: MOBILE_PORT,
        urls,
        fingerprint: fp,
        error: lastError,
        // what the phone scans: everything it needs to find and trust this Mac
        pairing: on ? JSON.stringify({ v: 1, name: host || os.hostname(), urls, token, fp }) : '',
      };
    },
    set({ enabled: on, rotate } = {}) {
      if (on === true) { write('enabled', '1'); lastError = ''; start(); }
      if (on === false) { write('enabled', '0'); stop(); }
      if (rotate) ensureToken(true);
      return this.status();
    },
    stop,
  };
}
