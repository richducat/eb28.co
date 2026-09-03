import { makeJob } from '../jobs/model.js';
import { store } from '../store.js';

export const id = 'manual';
export const label = 'Tracked';

/** Jobs Richard adds by hand: Claude web chats, ChatGPT threads, Cursor tasks, a contractor, anything. */
export async function collect() {
  return store.get('manual-jobs', []).map((j) =>
    makeJob({
      id: j.id,
      source: 'manual',
      title: j.title,
      status: j.status || 'working',
      reason: j.reason || (j.tool ? `Tracked ${j.tool} job.` : 'Tracked by hand.'),
      startedAt: j.createdAt,
      lastActivity: j.updatedAt || j.createdAt,
      lastMessage: j.notes || '',
      link: j.link || '',
      meta: { tool: j.tool || '' },
      tags: ['manual'],
    }),
  );
}

export function addManual({ title, tool = '', link = '', notes = '', status = 'working' }) {
  const now = new Date().toISOString();
  const job = { id: `manual:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, title, tool, link, notes, status, createdAt: now, updatedAt: now };
  store.update('manual-jobs', [], (list) => [job, ...list]);
  return job;
}

export function updateManual(id, patch) {
  let updated = null;
  store.update('manual-jobs', [], (list) =>
    list.map((j) => {
      if (j.id !== id) return j;
      updated = { ...j, ...patch, updatedAt: new Date().toISOString() };
      return updated;
    }),
  );
  return updated;
}

export function removeManual(id) {
  store.update('manual-jobs', [], (list) => list.filter((j) => j.id !== id));
}
