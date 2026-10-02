import { events as calendarEvents, dayOf } from './calendar.js';
import { addDays, dueItems, daySheet, habits, streaks, tasks, ymd } from './planner.js';
import { collectTrading } from './trading/index.js';
import { tyfysPipeline } from './tyfys.js';
import { ask } from './workforce/llm.js';
import { store } from './store.js';

/** Everything the Today page (and the phone) needs for one day, in one call. */
export async function today(board, day = ymd()) {
  const tomorrow = addDays(day, 1);
  const [cal, trading] = await Promise.all([
    calendarEvents(day, addDays(day, 2)).catch(() => ({ ok: false, events: [], calendars: [], errors: ['Calendar unavailable.'] })),
    collectTrading().catch(() => null),
  ]);
  const ty = tyfysPipeline();
  const jobs = board ? board.columns.flatMap((c) => c.jobs) : [];
  const due = dueItems({ taskList: tasks(), board, trading, tyfys: ty, today: day });
  const sheet = daySheet(day);
  const habitList = habits();
  const onDay = (e) => (e.allDay ? e.start <= day && dayOf(e.end) > day : dayOf(e.start) === day);
  const onTomorrow = (e) => (e.allDay ? e.start <= tomorrow && dayOf(e.end) > tomorrow : dayOf(e.start) === tomorrow);
  const replies = store.get('replies', []).filter((r) => ymd(r.at) === day);
  return {
    date: day,
    events: cal.events.filter(onDay),
    tomorrowEvents: cal.events.filter(onTomorrow),
    calendars: cal.calendars,
    calendarErrors: cal.errors,
    calendarSetup: Boolean(cal.setup),
    due,
    sheet,
    habits: habitList,
    streaks: streaks(store.get('days', {}), habitList, day),
    needsYou: jobs.filter((j) => j.status === 'needs_you').map((j) => ({ id: j.id, title: j.title, source: j.source, business: j.business, ask: j.ask, lastActivity: j.lastActivity })),
    stats: {
      needsYou: jobs.filter((j) => j.status === 'needs_you').length,
      working: jobs.filter((j) => j.status === 'working').length,
      agentsDone: jobs.filter((j) => j.status === 'done' && j.lastActivity && ymd(j.lastActivity) === day).length,
      tasksDone: tasks().filter((t) => t.done && t.doneAt && ymd(t.doneAt) === day).length,
      repliesSent: replies.length,
      events: cal.events.filter(onDay).length,
    },
  };
}

/** Three focus suggestions for the day, from the free local model (falls back to a heuristic). */
export async function suggestFocus(t) {
  const lines = [
    ...t.events.filter((e) => !e.allDay).map((e) => `Event ${new Date(e.start).toTimeString().slice(0, 5)} ${e.title}`),
    ...t.due.overdue.map((d) => `OVERDUE: ${d.title}`),
    ...t.due.today.map((d) => `Due today: ${d.title}`),
    ...t.needsYou.slice(0, 8).map((n) => `Waiting on Richard: ${n.title}`),
  ].slice(0, 40);
  const fallback = [...t.due.overdue, ...t.due.today].slice(0, 3).map((d) => d.title)
    .concat(t.needsYou.slice(0, 3).map((n) => `Answer: ${n.title}`)).slice(0, 3);
  if (!lines.length) return fallback;
  const text = await ask({
    key: `focus:${t.date}:${lines.join('|').length}:${lines.length}`,
    system: 'You are Richard\'s chief of staff. Pick the 3 most important things for him to focus on today. Reply with exactly 3 lines, each a short imperative under 70 characters, no numbering, no extra text.',
    prompt: lines.join('\n'),
    maxTokens: 200,
  }).catch(() => null);
  const picks = String(text || '').split('\n').map((l) => l.replace(/^[-*\d.)\s]+/, '').trim()).filter((l) => l && l.length < 120).slice(0, 3);
  return picks.length ? picks : fallback;
}
