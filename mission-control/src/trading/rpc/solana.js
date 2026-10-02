import { safeError } from '../redact.js';

/** Read-only Solana JSON-RPC. Only these methods can ever be sent. */
export const READ_METHODS = new Set(['getBalance', 'getTokenAccountsByOwner', 'getSignaturesForAddress', 'getAccountInfo', 'getSlot']);
export const DEFAULT_URL = 'https://api.mainnet-beta.solana.com';
// SPL Token and Token-2022 (the latter read from PYUSD's mint owner on mainnet)
export const TOKEN_PROGRAMS = ['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'];
export const isSolanaAddress = (a) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(String(a || ''));

export async function call(method, params, { url = DEFAULT_URL, fetchImpl = fetch } = {}) {
  if (!READ_METHODS.has(method)) throw new Error(`Refused: ${method} is not a read-only Solana method`);
  let res;
  try {
    res = await fetchImpl(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(8000) });
  } catch (err) {
    throw new Error(safeError('Solana RPC', err));
  }
  if (!res.ok) throw new Error(safeError('Solana RPC', { status: res.status }));
  const body = await res.json();
  if (body.error) throw new Error(`Solana RPC error ${body.error.code || ''}`.trim());
  return body.result;
}

/** SOL balance, SPL + Token-2022 holdings and the 10 newest signatures for an address. */
export async function walletSnapshot(address, opts = {}) {
  if (!isSolanaAddress(address)) throw new Error('Not a Solana address');
  const lamports = (await call('getBalance', [address], opts)).value;
  const tokens = [];
  for (const programId of TOKEN_PROGRAMS) {
    const r = await call('getTokenAccountsByOwner', [address, { programId }, { encoding: 'jsonParsed' }], opts);
    for (const acc of r.value || []) {
      const info = acc.account.data.parsed.info;
      const amt = Number(info.tokenAmount.uiAmount || 0);
      if (amt > 0) tokens.push({ mint: info.mint, amount: amt });
    }
  }
  const sigs = await call('getSignaturesForAddress', [address, { limit: 10 }], opts);
  return { sol: lamports / 1e9, tokens, signatures: (sigs || []).map((s) => ({ sig: s.signature, at: s.blockTime ? new Date(s.blockTime * 1000).toISOString() : null, ok: !s.err })) };
}
