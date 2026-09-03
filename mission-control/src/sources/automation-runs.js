import { makeJob } from '../jobs/model.js';
import { store } from '../store.js';

export const id = 'automation';
export const label = 'Automation';

/** The most recent run of every automation the workforce executed, surfaced as a job. */
export async function collect() {
  const runs = store.get('automation-runs', []);
  const latest = new Map();
  for (const run of runs) latest.set(run.automationId, run);
  return [...latest.values()].map((run) =>
    makeJob({
      id: `automation:${run.automationId}`,
      source: 'automation',
      title: run.title || run.automationId,
      status: run.status === 'running' ? 'working' : run.ok ? 'done' : 'failed',
      reason: run.status === 'running' ? 'Running now.' : run.ok ? (run.durationMs || 0) < 1000 ? `Finished in ${run.durationMs || 0}ms.` : `Finished in ${Math.round(run.durationMs / 1000)}s.` : run.error || `Exited with code ${run.code}.`,
      cwd: run.cwd,
      startedAt: run.startedAt,
      lastActivity: run.finishedAt || run.startedAt,
      lastMessage: (run.output || '').slice(-800),
      meta: { automationId: run.automationId, code: run.code, tier: run.tier },
      tags: ['automation', run.tier].filter(Boolean),
    }),
  );
}
