import { isDue, lastRun, runAutomation } from '../automations.js';

export const id = 'ops-runner';
export const name = 'Ops Runner';
export const role = 'Runs safe automations on their schedule and queues approval-tier ones for your sign-off. Never runs manual-tier work.';
export const tier = 'act';
export const every = 60 * 1000;

export async function run(ctx) {
  const { registry, store, now, emit } = ctx;
  const ran = [];
  const proposed = [];
  for (const a of registry) {
    if (!a.enabled || !a.schedule) continue;
    const last = lastRun(a.id);
    if (last && last.status === 'running') continue;
    if (!isDue(a, last && last.startedAt, now)) continue;
    if (a.tier === 'safe' || (a.tier === 'approval' && a.autoApproved)) {
      ran.push(a.id);
      runAutomation(a, { trigger: a.tier === 'safe' ? 'schedule' : 'standing-approval', onEvent: emit });
    } else if (a.tier === 'approval') {
      const pending = store.get('proposals', []).some((p) => p.status === 'pending' && p.automationId === a.id);
      if (pending) continue;
      proposed.push(a.id);
      store.update('proposals', [], (list) => [
        ...list,
        {
          id: `prop:${a.id}:${now}`,
          createdAt: new Date(now).toISOString(),
          agent: id,
          automationId: a.id,
          title: `Run "${a.title}"`,
          description: `${a.description} Scheduled ${a.schedule}. Approve once, or approve as standing so it runs every time.`,
          status: 'pending',
        },
      ]);
      emit({ type: 'proposal:new', automationId: a.id, title: a.title });
    }
  }
  return { summary: `${ran.length} started, ${proposed.length} sent for approval.`, ran, proposed };
}
