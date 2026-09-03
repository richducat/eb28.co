import { T } from '../../config.js';

export const id = 'janitor';
export const name = 'Janitor';
export const role = 'Archives old finished jobs, expires snoozes, and trims logs so the board only shows what matters.';
export const tier = 'act';
export const clock = [{ hour: 3, minute: 30 }];

export async function run(ctx) {
  const { store, now } = ctx;
  let archived = 0;
  store.update('overrides', {}, (all) => {
    const next = {};
    for (const [id, o] of Object.entries(all)) {
      if (o.snoozedUntil && Date.parse(o.snoozedUntil) < now) delete o.snoozedUntil;
      if (o.status === 'done' && o.asOf && now - Date.parse(o.asOf) > T.hideDoneAfter) {
        archived += 1;
        continue;
      }
      if (Object.keys(o).length > 1) next[id] = o;
    }
    return next;
  });
  store.update('manual-jobs', [], (list) => list.filter((j) => !(j.status === 'done' && now - Date.parse(j.updatedAt) > T.hideDoneAfter)));
  store.update('activity', [], (list) => list.slice(-500));
  store.update('workforce-log', [], (list) => list.slice(-500));
  return { summary: `${archived} stale overrides archived, logs trimmed.` };
}
