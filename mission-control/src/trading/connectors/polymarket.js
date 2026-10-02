import { safeError } from '../redact.js';

/**
 * Simmer's managed Polygon wallet, read from Polymarket's PUBLIC data API (no key).
 * Positions, exposure and PnL. Simmer agent on/off state needs the Simmer API, which stays
 * off until the key is rotated (Phase 1b), so it is reported as unknown.
 */
const BASE = 'https://data-api.polymarket.com';

async function get(path, fetchImpl) {
  const res = await fetchImpl(`${BASE}${path}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw Object.assign(new Error('polymarket'), { status: res.status });
  return res.json();
}

export function summarizePositions(rows = []) {
  const open = rows.filter((p) => Number(p.currentValue) > 0.005);
  const redeemable = rows.filter((p) => p.redeemable && Number(p.currentValue) > 0.005);
  return {
    count: rows.length,
    open: open.length,
    exposure: open.reduce((n, p) => n + Number(p.currentValue || 0), 0),
    cost: rows.reduce((n, p) => n + Number(p.initialValue || 0), 0),
    cashPnl: rows.reduce((n, p) => n + Number(p.cashPnl || 0), 0),
    realizedPnl: rows.reduce((n, p) => n + Number(p.realizedPnl || 0), 0),
    redeemable: redeemable.length,
    top: open
      .sort((a, b) => Number(b.currentValue) - Number(a.currentValue))
      .slice(0, 12)
      .map((p) => ({ title: String(p.title || '').slice(0, 90), outcome: p.outcome || '', size: Number(p.size || 0), avgPrice: Number(p.avgPrice || 0), curPrice: Number(p.curPrice || 0), value: Number(p.currentValue || 0), pnl: Number(p.cashPnl || 0), slug: p.slug || '' })),
  };
}

export async function collectPolymarket(cfg, { fetchImpl = fetch } = {}) {
  const wallets = (cfg.wallets || []).filter((w) => w.chain === 'polygon');
  const out = [];
  for (const w of wallets) {
    try {
      // the API pages at 50; walk up to 500 positions
      const rows = [];
      for (let offset = 0; offset < 500; offset += 50) {
        const page = await get(`/positions?user=${w.address}&limit=50&offset=${offset}&sizeThreshold=0`, fetchImpl);
        rows.push(...(page || []));
        if (!page || page.length < 50) break;
      }
      const activity = await get(`/activity?user=${w.address}&limit=1`, fetchImpl).catch(() => []);
      const last = activity && activity[0] && activity[0].timestamp ? new Date(activity[0].timestamp * 1000).toISOString() : null;
      out.push({ wallet: w.label, address: w.address, ok: true, lastTradeAt: last, ...summarizePositions(rows) });
    } catch (err) {
      out.push({ wallet: w.label, address: w.address, ok: false, error: safeError('Polymarket data API', err) });
    }
  }
  return out;
}
