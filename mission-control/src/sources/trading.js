import { store } from '../store.js';
import { makeJob } from '../jobs/model.js';

/**
 * Red trading conditions as board jobs, so Home, the Board and the tray show them. Reads the
 * last snapshot from the store only (no network): the trading-watch agent keeps it fresh.
 */
export const id = 'trading';
export const label = 'Trading';

export async function collect() {
  const s = store.get('trading-snapshot', null);
  if (!s || !Array.isArray(s.flags)) return [];
  return s.flags.map((f, i) =>
    makeJob({
      id: `trading:${f.text.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0, 60)}`,
      source: 'trading',
      title: `Trading: ${f.text}`,
      status: f.level === 'red' ? 'needs_you' : 'follow_up',
      reason: 'Open the Trading tab to review. Mission Control is watch-only and cannot trade.',
      lastActivity: s.at,
      lastMessage: f.text,
      meta: { kind: 'trading', level: f.level, index: i },
      tags: ['trading'],
    }),
  );
}
