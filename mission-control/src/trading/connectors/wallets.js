import { walletSnapshot as solWallet } from '../rpc/solana.js';
import { walletSnapshot as polyWallet } from '../rpc/polygon.js';
import { safeError } from '../redact.js';

/** Watch-only balances for every wallet in trading.json, with USD values where prices exist. */
export const SOL_MINT = 'So11111111111111111111111111111111111111112';
export const STEPN_MINTS = { GST: 'AFbX8oGjGpmVFywbVouvhQSRmiW2aR1mohfahi4Y2AdB', GMT: '7i5KKsX2weiTkry7jA4ZwSuXGhs5eJBEjY8vVxR4pfRx' }; // verified on Jupiter

async function jupiter(url, fetchImpl) {
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw Object.assign(new Error('jupiter'), { status: res.status });
  return res.json();
}

export async function solanaPrices(mints, fetchImpl = fetch) {
  const out = {};
  const ids = [...new Set([SOL_MINT, ...mints])].slice(0, 50);
  try {
    const p = await jupiter(`https://lite-api.jup.ag/price/v3?ids=${ids.join(',')}`, fetchImpl);
    for (const [k, v] of Object.entries(p || {})) if (v && v.usdPrice) out[k] = { usd: v.usdPrice };
    const meta = await jupiter(`https://lite-api.jup.ag/tokens/v2/search?query=${ids.join(',')}`, fetchImpl).catch(() => []);
    for (const t of meta || []) if (t && t.id) out[t.id] = { ...(out[t.id] || {}), symbol: t.symbol, verified: Boolean(t.isVerified) };
  } catch {
    /* no prices: show amounts only */
  }
  return out;
}

export async function collectWallets(cfg, { fetchImpl = fetch } = {}) {
  const wallets = [];
  for (const w of cfg.wallets || []) {
    try {
      if (w.chain === 'polygon') {
        const s = await polyWallet(w.address, { fetchImpl });
        const usd = s.tokens.reduce((n, t) => n + t.amount, 0); // USDC ~ $1; POL value not priced here
        wallets.push({ ...w, ok: true, native: { symbol: 'POL', amount: s.pol }, tokens: s.tokens.map((t) => ({ ...t, usd: t.amount })), usd });
      } else {
        const s = await solWallet(w.address, { fetchImpl });
        const prices = await solanaPrices(s.tokens.map((t) => t.mint), fetchImpl);
        const tokens = s.tokens
          .map((t) => ({ mint: t.mint, symbol: (prices[t.mint] && prices[t.mint].symbol) || `${t.mint.slice(0, 4)}…`, amount: t.amount, usd: prices[t.mint] && prices[t.mint].usd ? t.amount * prices[t.mint].usd : null, verified: prices[t.mint] ? prices[t.mint].verified : false }))
          .sort((a, b) => (b.usd || 0) - (a.usd || 0));
        const solUsd = prices[SOL_MINT] ? s.sol * prices[SOL_MINT].usd : null;
        const usd = (solUsd || 0) + tokens.reduce((n, t) => n + (t.verified ? t.usd || 0 : 0), 0);
        wallets.push({ ...w, ok: true, native: { symbol: 'SOL', amount: s.sol, usd: solUsd }, tokens, signatures: s.signatures, usd });
      }
    } catch (err) {
      wallets.push({ ...w, ok: false, error: safeError(`${w.chain} wallet`, err) });
    }
  }
  return wallets;
}
