/**
 * scrubSecrets: strip anything that looks like a key, token or credential from a string or
 * object before it can reach the store, the UI, the SSE stream or a log. Used on every
 * error path in the Trading tab.
 */
const PATTERNS = [
  /\b(sk|pk|rk|ak|xox[abp]|ghp|gho|github_pat|glpat)[-_][A-Za-z0-9_-]{8,}/g, // prefixed API keys
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi,
  /\b(api[_-]?key|apikey|token|secret|password|passwd|authorization|private[_-]?key|mnemonic|seed)\b\s*[:=]\s*["']?[^\s"',;&]{4,}/gi,
  /([?&](api[_-]?key|token|key|secret|auth)=)[^&\s]+/gi,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{6,}/g, // JWTs
  /\b[0-9a-fA-F]{64}\b/g, // raw 32-byte hex keys
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
];

export function scrubString(s) {
  let out = String(s);
  for (const re of PATTERNS) out = out.replace(re, (m, a) => (typeof a === 'string' && m.startsWith(a) && /[?&]/.test(a) ? `${a}<redacted>` : '<redacted>'));
  return out;
}

export function scrubSecrets(v) {
  if (v == null) return v;
  if (typeof v === 'string') return scrubString(v);
  if (Array.isArray(v)) return v.map(scrubSecrets);
  if (typeof v === 'object') {
    const out = {};
    for (const [k, val] of Object.entries(v)) out[k] = /^(api[_-]?key|token|secret|password|authorization|private[_-]?key|mnemonic|seed)$/i.test(k) ? '<redacted>' : scrubSecrets(val);
    return out;
  }
  return v;
}

/** Turn any failure into a safe, short message: "<service> request failed (HTTP 401)". */
export function safeError(service, err) {
  const status = err && (err.status || (String(err.message || '').match(/HTTP (\d{3})/) || [])[1]);
  if (status) return `${service} request failed (HTTP ${status})`;
  if (err && err.name === 'TimeoutError') return `${service} timed out`;
  return `${service} request failed: ${scrubString((err && err.message) || 'unknown error').slice(0, 120)}`;
}
