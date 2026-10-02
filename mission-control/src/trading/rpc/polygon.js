import { safeError } from '../redact.js';

/** Read-only EVM JSON-RPC for Polygon. Only these methods can ever be sent. */
export const READ_METHODS = new Set(['eth_getBalance', 'eth_call', 'eth_blockNumber', 'eth_chainId']);
// public endpoints, tried in order (polygon-rpc.com is often unreachable)
export const DEFAULT_URLS = ['https://1rpc.io/matic', 'https://polygon-rpc.com', 'https://polygon-bor-rpc.publicnode.com'];
export const USDC = [
  { symbol: 'USDC', address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6 }, // native USDC (verified: symbol() = USDC)
  { symbol: 'USDC.e', address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', decimals: 6 }, // bridged USDC.e (verified)
];
export const isEvmAddress = (a) => /^0x[0-9a-fA-F]{40}$/.test(String(a || ''));

export async function call(method, params, { urls = DEFAULT_URLS, fetchImpl = fetch } = {}) {
  if (!READ_METHODS.has(method)) throw new Error(`Refused: ${method} is not a read-only EVM method`);
  if (method === 'eth_call' && params && params[0] && params[0].data && !/^0x(70a08231|95d89b41|313ce567)/.test(params[0].data)) throw new Error('Refused: eth_call is limited to balanceOf/symbol/decimals');
  let last;
  for (const url of urls) {
    try {
      let res = await fetchImpl(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(8000) });
      if (res.status === 429) {
        // free endpoints rate-limit bursts: back off once, then try the next endpoint
        await new Promise((r) => setTimeout(r, 1500));
        res = await fetchImpl(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(8000) });
      }
      if (!res.ok) { last = new Error(safeError('Polygon RPC', { status: res.status })); continue; }
      const body = await res.json();
      if (body.error) { last = new Error(`Polygon RPC error ${body.error.code || ''}`.trim()); continue; }
      return body.result;
    } catch (err) {
      last = new Error(safeError('Polygon RPC', err));
    }
  }
  throw last || new Error('Polygon RPC unreachable');
}

export async function walletSnapshot(address, opts = {}) {
  if (!isEvmAddress(address)) throw new Error('Not an EVM address');
  const pol = Number(BigInt(await call('eth_getBalance', [address, 'latest'], opts))) / 1e18;
  const tokens = [];
  for (const t of USDC) {
    await new Promise((r) => setTimeout(r, 400)); // pace reads for free endpoints
    const data = `0x70a08231${address.slice(2).toLowerCase().padStart(64, '0')}`;
    const raw = await call('eth_call', [{ to: t.address, data }, 'latest'], opts);
    const amount = Number(BigInt(raw || '0x0')) / 10 ** t.decimals;
    tokens.push({ symbol: t.symbol, amount });
  }
  return { pol, tokens };
}
