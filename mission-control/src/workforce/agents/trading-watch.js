import { collectTrading } from '../../trading/index.js';

/** Observe-only: refresh the Trading snapshot every 10 minutes and tell the UI. */
export const id = 'trading-watch';
export const name = 'Trading Watch';
export const role = 'Refreshes watch-only balances, positions and kill-switch states every 10 minutes. Never trades.';
export const tier = 'observe';
export const every = 10 * 60 * 1000;

export async function run(ctx) {
  const s = await collectTrading({ force: true });
  ctx.emit({ type: 'trading:refresh' });
  const red = s.flags.filter((f) => f.level === 'red').length;
  return { summary: `${s.wallets.length} wallets, ${s.polymarket.reduce((n, p) => n + (p.open || 0), 0)} open positions, ${red} red flag${red === 1 ? '' : 's'}. Master kill switch ${s.killSwitch.master ? 'ON' : 'OFF'}.` };
}
