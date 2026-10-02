import { collectTrading } from './index.js';
import { applyPatch } from './config.js';
import * as killswitch from './killswitch.js';
import * as approvals from './approvals.js';

/**
 * Trading API. GET is the snapshot (never contains secrets); writes are limited to the kill
 * switch, recording an approval decision and safe config edits. All writes also pass the
 * server-wide JSON + Host/Origin guard.
 */
export function tradingRoutes({ orchestrator, confirmOwner } = {}) {
  const refresh = async () => {
    const s = await collectTrading({ force: true });
    if (orchestrator) orchestrator.emitEvent({ type: 'trading:refresh' });
    return s;
  };
  return {
    'GET /api/trading': async (_b, q) => collectTrading({ force: q.get('fresh') === '1' }),
    'POST /api/trading/refresh': async () => refresh(),
    'POST /api/trading/killswitch': async (b) => {
      if (b.engage === true) killswitch.engage('Mission Control');
      else if (b.engage === false) await killswitch.disengage({ phrase: b.phrase }, { confirmOwner });
      else throw new Error('engage must be true or false');
      return refresh();
    },
    'POST /api/trading/approval': async (b) => {
      if (b.request) approvals.request(b.request);
      else await approvals.decide({ id: b.id, decision: b.decision, phrase: b.phrase }, { confirmOwner });
      return refresh();
    },
    'POST /api/trading/config': async (b) => {
      applyPatch(b);
      return refresh();
    },
  };
}
