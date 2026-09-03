import { collectAll } from './sources/index.js';
import { store } from './store.js';
import { STATUSES, SOURCES } from './jobs/model.js';
import { T } from './config.js';

export const COLUMNS = [
  { id: 'needs_you', title: 'Needs you', hint: 'Answer, approve, or decide' },
  { id: 'working', title: 'Working now', hint: 'Agents busy right now' },
  { id: 'follow_up', title: 'Follow up', hint: 'Quiet too long or stopped mid-task' },
  { id: 'done', title: 'Done', hint: 'Finished in the last few days' },
  { id: 'failed', title: 'Failed', hint: 'Needs a fix or a retry' },
];

/**
 * Apply Richard's manual overrides (mark done, snooze, archive, notes, follow-up flag)
 * on top of what the scanners believe. Overrides only stick while the underlying job
 * has not moved on: if the source produces newer activity the override is dropped.
 */
export function applyOverrides(jobs, overrides, now = Date.now()) {
  return jobs
    .map((job) => {
      const o = overrides[job.id];
      if (!o) return job;
      const next = { ...job, note: o.note || '' };
      const sourceMoved = o.asOf && job.lastActivity && Date.parse(job.lastActivity) > Date.parse(o.asOf) + 1000;
      if (o.archived && !sourceMoved) next.archived = true;
      if (o.snoozedUntil && Date.parse(o.snoozedUntil) > now && !sourceMoved) next.snoozedUntil = o.snoozedUntil;
      if (o.status && !sourceMoved) {
        next.status = o.status;
        next.reason = o.reason || `You marked this ${o.status.replace('_', ' ')}.`;
        next.overridden = true;
      }
      if (o.followUpAt) next.followUpAt = o.followUpAt;
      return next;
    })
    .filter((job) => !job.archived);
}

export function summarize(jobs) {
  const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  const bySource = {};
  for (const j of jobs) {
    counts[j.status] = (counts[j.status] || 0) + 1;
    bySource[j.source] = (bySource[j.source] || 0) + 1;
  }
  return { counts, bySource, total: jobs.length };
}

function sortJobs(a, b) {
  if (a.alive !== b.alive) return a.alive ? -1 : 1;
  return Date.parse(b.lastActivity || 0) - Date.parse(a.lastActivity || 0);
}

/** Build the full board payload the UI renders. */
export async function buildBoard({ now = Date.now(), only } = {}) {
  const { jobs: raw, errors, timings } = await collectAll({ now, only });
  const overrides = store.get('overrides', {});
  let jobs = applyOverrides(raw, overrides, now);
  jobs = jobs.filter((j) => !(j.status === 'done' && j.lastActivity && now - Date.parse(j.lastActivity) > T.staleAfter));
  const visible = jobs.filter((j) => !j.snoozedUntil);
  const snoozed = jobs.filter((j) => j.snoozedUntil);
  const columns = COLUMNS.map((c) => ({ ...c, jobs: visible.filter((j) => j.status === c.id).sort(sortJobs) }));
  return {
    generatedAt: new Date(now).toISOString(),
    columns,
    snoozed: snoozed.sort(sortJobs),
    summary: summarize(visible),
    sources: Object.entries(SOURCES).map(([id, s]) => ({ id, ...s })),
    errors,
    timings,
  };
}

export function setOverride(id, patch) {
  return store.update('overrides', {}, (all) => {
    const current = all[id] || {};
    const next = { ...current, ...patch, asOf: new Date().toISOString() };
    for (const k of Object.keys(next)) if (next[k] === null || next[k] === undefined || next[k] === '') delete next[k];
    if (Object.keys(next).length <= 1) {
      const copy = { ...all };
      delete copy[id];
      return copy;
    }
    return { ...all, [id]: next };
  })[id];
}
