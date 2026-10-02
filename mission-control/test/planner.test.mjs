import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseQuick, dueItems, streaks, addDays, addTask, updateTask, deleteTask, tasks, updateDay, daySheet } from '../src/planner.js';
import { normalizeEvent, dayOf } from '../src/calendar.js';

const now = new Date('2026-10-01T10:00:00'); // a Thursday

test('quick add understands dates, times, business tags and importance', () => {
  assert.deepEqual(parseQuick('Call the VA about John tomorrow 3pm #tyfys !', now), { title: 'Call the VA about John', due: '2026-10-02', time: '15:00', business: 'tyfys', priority: 'high' });
  assert.equal(parseQuick('Send report 10/14', now).due, '2026-10-14');
  assert.equal(parseQuick('Dentist Oct 20 at 9:30am', now).time, '09:30');
  assert.equal(parseQuick('Gym mon', now).due, '2026-10-05');
  assert.equal(parseQuick('Review deck in 3 days', now).due, '2026-10-04');
  assert.equal(parseQuick('Ship it tonight', now).time, '20:00');
  // ordinary words are not dates
  assert.deepEqual(parseQuick('Plan the month budget', now), { title: 'Plan the month budget', due: null, time: null, business: null, priority: 'normal' });
  assert.equal(parseQuick('Pay money to Ken', now).due, null);
});

test('due items are grouped into overdue / today / tomorrow / week / later / someday', () => {
  const today = '2026-10-01';
  const g = dueItems({
    today,
    taskList: [
      { id: 'a', title: 'late', due: '2026-09-29' },
      { id: 'b', title: 'now', due: today },
      { id: 'c', title: 'tmrw', due: '2026-10-02' },
      { id: 'd', title: 'soon', due: '2026-10-06' },
      { id: 'e', title: 'far', due: '2026-11-20' },
      { id: 'f', title: 'whenever', due: null },
      { id: 'g', title: 'finished', due: today, done: true },
    ],
    tyfys: { ok: true, kpis: { overdue: 5 } },
    trading: { checklist: [{ priority: 'P0', status: 'open' }, { priority: 'P0', status: 'done' }] },
  });
  assert.deepEqual(g.overdue.map((x) => x.title), ['late']);
  assert.deepEqual(g.today.map((x) => x.id).sort(), ['b', 'trading:p0', 'tyfys:overdue']);
  assert.equal(g.tomorrow[0].title, 'tmrw');
  assert.equal(g.week[0].title, 'soon');
  assert.equal(g.later[0].title, 'far');
  assert.equal(g.someday[0].title, 'whenever');
  assert.match(g.today.find((x) => x.id === 'trading:p0').title, /^1 open P0/);
});

test('habit streaks count consecutive days', () => {
  const t = '2026-10-01';
  const days = { [t]: { habits: { j: true } }, [addDays(t, -1)]: { habits: { j: true, x: true } }, [addDays(t, -2)]: { habits: { j: true } } };
  assert.deepEqual(streaks(days, [{ id: 'j' }, { id: 'x' }, { id: 'z' }], t), { j: 3, x: 1, z: 0 });
});

test('tasks and the day sheet round-trip through the store', () => {
  const t = addTask({ text: 'Write the brief fri !', defaultDue: '2026-10-01' });
  assert.equal(t.priority, 'high');
  assert.ok(t.due);
  const u = updateTask(t.id, { done: true });
  assert.equal(u.done, true);
  assert.ok(u.doneAt);
  const plain = addTask({ text: 'No date here', defaultDue: '2026-10-01' });
  assert.equal(plain.due, '2026-10-01');
  deleteTask(t.id);
  deleteTask(plain.id);
  assert.equal(tasks().some((x) => x.id === t.id), false);
  updateDay('2026-10-01', { focus: [{ text: 'Ship it' }, { text: '' }], notes: 'hi', habit: 'journal' });
  const s = daySheet('2026-10-01');
  assert.deepEqual(s.focus, [{ text: 'Ship it', done: false }]);
  assert.equal(s.notes, 'hi');
  assert.equal(s.habits.journal, true);
  assert.throws(() => updateDay('not-a-date', {}));
});

test('calendar events normalize and know their day', () => {
  const cal = { id: 'me@example.com', name: 'Personal', color: '#123456' };
  const allDay = normalizeEvent({ id: 'x', summary: 'Holiday', start: '2026-10-12', end: '2026-10-13' }, cal);
  assert.equal(allDay.allDay, true);
  assert.equal(allDay.recurring, false);
  const timed = normalizeEvent({ id: 'abc_20261002T090000Z', summary: '', start: '2026-10-02T05:00:00-04:00', end: '2026-10-02T06:00:00-04:00' }, cal);
  assert.equal(timed.title, '(no title)');
  assert.equal(timed.recurring, true);
  assert.equal(dayOf('2026-10-12'), '2026-10-12');
});

test('audit 2: quick add leaves ordinary text alone and rejects impossible dates/times', async () => {
  const cases = {
    'Close issue #42 tomorrow': { title: 'Close issue #42', due: '2026-10-02', business: null },
    "Review today's numbers": { title: "Review today's numbers", due: null },
    'Pay 1/2 of the deposit': { due: null },
    'Buy 24/7 coverage': { due: null },
    'Finish 2/30 report': { due: null },
    'Meet 9:75pm': { time: null },
    'Read chapter 3:16': { time: null },
    'Call Sat phone provider': { due: null },
    'Send report 10/14': { due: '2026-10-14' },
    'sync 9:30': { time: '09:30' },
    'Gym sat 7am': { due: '2026-10-03', time: '07:00' },
  };
  for (const [text, want] of Object.entries(cases)) {
    const got = parseQuick(text, now);
    for (const [k, v] of Object.entries(want)) assert.equal(got[k], v, `${text} -> ${k}`);
  }
  const { isRealDay } = await import('../src/planner.js');
  assert.equal(isRealDay('2026-02-31'), false);
  assert.equal(isRealDay('2026-99-99'), false);
  assert.equal(isRealDay('2026-10-01'), true);
  const t = addTask({ text: 'validate me' });
  assert.throws(() => updateTask(t.id, { due: '2026-24-07' }), /YYYY-MM-DD/);
  assert.throws(() => updateTask(t.id, { time: '21:75' }), /HH:MM/);
  deleteTask(t.id);
});

test('audit 2: editing habits keeps ids (streaks) and whole emoji', async () => {
  const { setHabits, habits } = await import('../src/planner.js');
  const before = habits();
  const after = setHabits(before.map((h) => ({ emoji: h.emoji, name: h.name })).concat([{ emoji: '👨‍👩‍👧', name: 'Dinner together' }]));
  for (const h of before) assert.equal(after.find((x) => x.name === h.name).id, h.id);
  assert.equal(after.find((x) => x.name === 'Dinner together').emoji, '👨‍👩‍👧');
  setHabits(before);
});

test('audit 2: overnight and multi-day events count on every day they touch', async () => {
  const { onDay, startMs } = await import('../src/calendar.js');
  const late = { allDay: false, start: '2026-10-01T22:00:00-04:00', end: '2026-10-02T01:00:00-04:00' };
  assert.equal(onDay(late, '2026-10-01'), true);
  assert.equal(onDay(late, '2026-10-02'), true);
  assert.equal(onDay(late, '2026-10-03'), false);
  const trip = { allDay: true, start: '2026-10-05', end: '2026-10-08' };
  assert.deepEqual(['2026-10-04', '2026-10-05', '2026-10-07', '2026-10-08'].map((d) => onDay(trip, d)), [false, true, true, false]);
  // mixed offsets sort by real time
  const a = { start: '2026-10-05T12:00:00-04:00' };
  const b = { start: '2026-10-05T12:45:00Z' };
  assert.ok(startMs(b) < startMs(a));
});
