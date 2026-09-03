import { ask } from '../llm.js';

export const id = 'triage';
export const name = 'Triage';
export const role = 'Watches every job, spots status changes, and writes the one-line "what this needs from you".';
export const tier = 'observe';
export const every = 2 * 60 * 1000;

const NOTIFY_ON = new Set(['needs_you', 'failed', 'done']);

export async function run(ctx) {
  const { board, store, emit } = ctx;
  const jobs = board.columns.flatMap((c) => c.jobs);
  const previous = store.get('last-snapshot', {});
  const next = {};
  const transitions = [];
  for (const job of jobs) {
    next[job.id] = { status: job.status, lastActivity: job.lastActivity, title: job.title };
    const before = previous[job.id];
    if (before && before.status !== job.status && NOTIFY_ON.has(job.status)) {
      transitions.push({ id: job.id, title: job.title, from: before.status, to: job.status, source: job.source, reason: job.reason });
    }
  }
  store.set('last-snapshot', next);

  for (const t of transitions) {
    store.append('activity', { type: 'transition', ...t });
    emit({ type: 'job:transition', ...t });
  }

  // Explain what each needs_you job actually needs, once per activity timestamp.
  let explained = 0;
  for (const job of jobs.filter((j) => j.status === 'needs_you' || j.status === 'follow_up').slice(0, 12)) {
    const key = `explain:${job.id}:${job.lastActivity}`;
    const cached = store.get('llm-cache', {})[key];
    if (cached) continue;
    const text = await ask({
      key,
      system: 'You summarize what an AI coding agent is waiting on. Answer in one plain sentence, under 25 words, addressed to the owner as "you". No preamble.',
      prompt: `Tool: ${job.source}\nTask: ${job.title}\nStatus: ${job.status} (${job.reason})\nLast message from the agent:\n"""${job.lastMessage.slice(0, 1500)}"""\n\nWhat does this job need from you next?`,
      maxTokens: 120,
    });
    if (text) explained += 1;
  }
  return { summary: `${jobs.length} jobs scanned, ${transitions.length} status changes, ${explained} explanations written.`, transitions };
}

/** Read the explanation Triage wrote for a job, if any. */
export function explanationFor(store, job) {
  const cached = store.get('llm-cache', {})[`explain:${job.id}:${job.lastActivity}`];
  return cached ? cached.text : '';
}
