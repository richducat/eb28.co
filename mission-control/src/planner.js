import crypto from 'node:crypto';
import { store } from './store.js';

/**
 * Richard's day: tasks with due dates, the daily sheet (focus, notes, habits), and one
 * "what's due" list that pulls together tasks, snoozed jobs coming back, follow-up dates,
 * TYFYS overdue cases and open trading safety items.
 */
export const DEFAULT_HABITS = [
  { id: 'wake', name: 'Wake-up routine', emoji: '🌅' },
  { id: 'journal', name: 'Journal', emoji: '✍️' },
  { id: 'exercise', name: 'Exercise', emoji: '🏋️' },
  { id: 'deep', name: 'Deep work', emoji: '🎯' },
  { id: 'family', name: 'Family time', emoji: '👨‍👧' },
];

export const ymd = (d = new Date()) => new Date(d).toLocaleDateString('en-CA');
export function addDays(day, n) {
  const d = new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + n);
  return ymd(d);
}

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * Quick add: "Call the VA about John tomorrow 3pm #tyfys !" ->
 * { title: 'Call the VA about John', due: <tomorrow>, time: '15:00', business: 'tyfys', priority: 'high' }.
 * Understands today, tonight, tomorrow, weekdays (this/next), "next week", "in 3 days", "eow",
 * 10/14, Oct 14, and times like 3pm, 3:30pm, 15:00, "noon". Pure; exported for tests.
 */
export function parseQuick(text, now = new Date()) {
  let s = ` ${String(text || '').trim()} `;
  const today = ymd(now);
  let due = null;
  let time = null;
  let business = null;
  let priority = 'normal';
  const take = (re, fn) => {
    const m = s.match(re);
    if (m) { fn(m); s = s.replace(m[0], ' '); }
  };
  take(/\s#([a-z0-9-]+)\b/i, (m) => { business = m[1].toLowerCase(); });
  take(/\s!{1,3}(?=\s)/, () => { priority = 'high'; });
  take(/\s(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i, (m) => {
    let h = Number(m[1]) % 12;
    if (m[3].toLowerCase() === 'pm') h += 12;
    time = `${String(h).padStart(2, '0')}:${m[2] || '00'}`;
  });
  if (!time) take(/\s(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/, (m) => { time = `${m[1].padStart(2, '0')}:${m[2]}`; });
  if (!time) take(/\s(?:at\s+)?noon\b/i, () => { time = '12:00'; });
  take(/\s(?:due\s+|by\s+|on\s+)?(today|tonight|tomorrow|tmrw|tmr)\b/i, (m) => {
    const w = m[1].toLowerCase();
    due = w === 'today' || w === 'tonight' ? today : addDays(today, 1);
    if (w === 'tonight' && !time) time = '20:00';
  });
  if (!due) take(/\s(?:due\s+|by\s+)?in\s+(\d+)\s+(day|days|week|weeks)\b/i, (m) => { due = addDays(today, Number(m[1]) * (m[2].startsWith('week') ? 7 : 1)); });
  if (!due) take(/\s(?:due\s+|by\s+)?(next week)\b/i, () => { const d = new Date(`${today}T12:00:00`).getDay(); due = addDays(today, ((8 - d) % 7) || 7); });
  if (!due) take(/\s(?:due\s+|by\s+)?(eow|end of (?:the )?week)\b/i, () => { const d = new Date(`${today}T12:00:00`).getDay(); due = addDays(today, (5 - d + 7) % 7); });
  if (!due) take(/\s(?:due\s+|by\s+|on\s+)?(next\s+|this\s+)?(sunday|sun|monday|mon|tuesday|tues|tue|wednesday|wed|thursday|thurs|thur|thu|friday|fri|saturday|sat)\b/i, (m) => {
    const target = DAYS.findIndex((d) => d.startsWith(m[2].toLowerCase().slice(0, 3)));
    const cur = new Date(`${today}T12:00:00`).getDay();
    let diff = (target - cur + 7) % 7;
    if (diff === 0) diff = 7;
    if (m[1] && /next/i.test(m[1]) && diff < 7) diff += 7;
    due = addDays(today, diff);
  });
  if (!due) take(/\s(?:due\s+|by\s+|on\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/, (m) => {
    const y = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : now.getFullYear();
    let d = `${y}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
    if (!m[3] && d < today) d = `${y + 1}${d.slice(4)}`;
    due = d;
  });
  if (!due) take(/\s(?:due\s+|by\s+|on\s+)?(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/i, (m) => {
    const mo = MONTHS.indexOf(m[1].toLowerCase().slice(0, 3)) + 1;
    let d = `${now.getFullYear()}-${String(mo).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
    if (d < today) d = `${now.getFullYear() + 1}${d.slice(4)}`;
    due = d;
  });
  if (time && !due) due = today;
  const title = s.replace(/\s+/g, ' ').trim();
  return { title, due, time, business, priority };
}

/* ---------- tasks ---------- */
export const tasks = () => store.get('tasks', []);

export function addTask(input) {
  const p = typeof input === 'string' ? parseQuick(input) : { ...parseQuick(input.text || input.title || ''), ...pick(input) };
  if (!p.title) throw new Error('Type what needs doing.');
  const fallbackDue = typeof input === 'object' && /^\d{4}-\d{2}-\d{2}$/.test(String(input.defaultDue || '')) ? input.defaultDue : null;
  const t = { id: `task:${crypto.randomUUID().slice(0, 8)}`, title: p.title.slice(0, 200), due: p.due || fallbackDue, time: p.time || null, business: p.business || null, priority: p.priority || 'normal', notes: '', done: false, createdAt: new Date().toISOString() };
  store.update('tasks', [], (list) => [...list, t]);
  return t;
}

function pick(o) {
  const out = {};
  for (const k of ['due', 'time', 'business', 'priority', 'notes']) if (o[k] !== undefined) out[k] = o[k];
  return out;
}

export function updateTask(id, patch = {}) {
  let found = null;
  store.update('tasks', [], (list) => list.map((t) => {
    if (t.id !== id) return t;
    found = { ...t, ...pick(patch) };
    if (typeof patch.title === 'string' && patch.title.trim()) found.title = patch.title.trim().slice(0, 200);
    if (typeof patch.done === 'boolean') { found.done = patch.done; found.doneAt = patch.done ? new Date().toISOString() : null; }
    return found;
  }));
  if (!found) throw new Error('Task not found.');
  return found;
}

export function deleteTask(id) {
  store.update('tasks', [], (list) => list.filter((t) => t.id !== id));
  return { ok: true };
}

/* ---------- the day sheet ---------- */
export const habits = () => store.get('habits', DEFAULT_HABITS);
export function setHabits(list) {
  const clean = (list || []).filter((h) => h && h.name).slice(0, 12).map((h) => ({ id: h.id || crypto.randomUUID().slice(0, 6), name: String(h.name).slice(0, 40), emoji: String(h.emoji || '✅').slice(0, 4) }));
  store.set('habits', clean);
  return clean;
}

export function daySheet(day) {
  const all = store.get('days', {});
  return { focus: [], notes: '', habits: {}, ...(all[day] || {}) };
}

export function updateDay(day, patch = {}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('bad date');
  let next;
  store.update('days', {}, (all) => {
    const cur = { focus: [], notes: '', habits: {}, ...(all[day] || {}) };
    if (Array.isArray(patch.focus)) cur.focus = patch.focus.slice(0, 5).map((f) => ({ text: String(f.text || '').slice(0, 160), done: Boolean(f.done) })).filter((f) => f.text);
    if (typeof patch.notes === 'string') cur.notes = patch.notes.slice(0, 20000);
    if (patch.habit) cur.habits = { ...cur.habits, [patch.habit]: !cur.habits[patch.habit] };
    next = cur;
    // keep the last ~400 days
    const keys = Object.keys(all).sort();
    const out = { ...all, [day]: cur };
    for (const k of keys.slice(0, Math.max(0, keys.length - 400))) delete out[k];
    return out;
  });
  return next;
}

/** Consecutive days (ending today or yesterday) each habit was ticked. Pure; exported for tests. */
export function streaks(days, habitList, today) {
  const out = {};
  for (const h of habitList) {
    let n = 0;
    let d = days[today] && days[today].habits && days[today].habits[h.id] ? today : addDays(today, -1);
    while (days[d] && days[d].habits && days[d].habits[h.id]) { n += 1; d = addDays(d, -1); }
    out[h.id] = n;
  }
  return out;
}

/* ---------- what's due ---------- */
/**
 * Everything with a date, grouped: overdue, today, tomorrow, this week (next 7 days), later,
 * someday (tasks with no date). Pure given its inputs; exported for tests.
 */
export function dueItems({ taskList = [], board = null, trading = null, tyfys = null, today = ymd() }) {
  const items = [];
  for (const t of taskList) {
    if (t.done) continue;
    items.push({ id: t.id, kind: 'task', title: t.title, due: t.due, time: t.time, business: t.business, priority: t.priority });
  }
  if (board) {
    for (const j of board.snoozed || []) {
      if (j.snoozedUntil) items.push({ id: j.id, kind: 'snooze', title: j.title, due: ymd(j.snoozedUntil), time: new Date(j.snoozedUntil).toTimeString().slice(0, 5), business: j.business, note: 'Snoozed: comes back' });
    }
    for (const j of board.columns.flatMap((c) => c.jobs)) {
      if (j.followUpAt && j.status !== 'done') items.push({ id: j.id, kind: 'followup', title: j.title, due: ymd(j.followUpAt), business: j.business, note: 'Follow up' });
    }
  }
  if (tyfys && tyfys.ok && tyfys.kpis && tyfys.kpis.overdue) items.push({ id: 'tyfys:overdue', kind: 'tyfys', title: `${tyfys.kpis.overdue} TYFYS cases are overdue for their stage`, due: today, business: 'tyfys', note: 'Open the TYFYS tab' });
  if (trading && Array.isArray(trading.checklist)) {
    const p0 = trading.checklist.filter((c) => c.priority === 'P0' && c.status !== 'done' && c.status !== 'verified').length;
    if (p0) items.push({ id: 'trading:p0', kind: 'trading', title: `${p0} open P0 trading safety items`, due: today, business: 'trading', note: 'Open the Trading tab' });
  }
  const tomorrow = addDays(today, 1);
  const week = addDays(today, 7);
  const groups = { overdue: [], today: [], tomorrow: [], week: [], later: [], someday: [] };
  for (const it of items) {
    if (!it.due) groups.someday.push(it);
    else if (it.due < today) groups.overdue.push(it);
    else if (it.due === today) groups.today.push(it);
    else if (it.due === tomorrow) groups.tomorrow.push(it);
    else if (it.due <= week) groups.week.push(it);
    else groups.later.push(it);
  }
  const order = (a, b) => String(a.due || '9').localeCompare(String(b.due || '9')) || String(a.time || '99').localeCompare(String(b.time || '99')) || (a.priority === 'high' ? -1 : 0) - (b.priority === 'high' ? -1 : 0);
  for (const k of Object.keys(groups)) groups[k].sort(order);
  return groups;
}
