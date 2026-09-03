import { T } from '../../config.js';

export const id = 'follow-up';
export const name = 'Follow-up';
export const role = 'Finds jobs that went quiet, stopped mid-task, or sit unanswered, and files a follow-up with the exact resume command.';
export const tier = 'propose';
export const every = 15 * 60 * 1000;

export async function run(ctx) {
  const { board, store, now } = ctx;
  const jobs = board.columns.flatMap((c) => c.jobs);
  const items = [];
  for (const job of jobs) {
    if (job.status === 'done') continue;
    const age = now - Date.parse(job.lastActivity || 0);
    let why = '';
    if (job.status === 'follow_up') why = job.reason;
    else if (job.status === 'needs_you' && age > T.followUpAfter) why = `Waiting on you for ${Math.round(age / 3600e3)} hours.`;
    else if (job.status === 'failed') why = job.reason;
    if (!why) continue;
    items.push({
      id: job.id,
      title: job.title,
      source: job.source,
      why,
      next: job.resumeCommand ? `Resume: ${job.resumeCommand}` : job.link ? `Open: ${job.link}` : 'Open it and decide: finish, hand off, or archive.',
      lastActivity: job.lastActivity,
    });
  }
  items.sort((a, b) => Date.parse(a.lastActivity || 0) - Date.parse(b.lastActivity || 0));
  store.set('follow-ups', { generatedAt: new Date(now).toISOString(), items });
  return { summary: `${items.length} follow-ups queued.`, count: items.length };
}
