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

/** A real calendar date in YYYY-MM-DD form (rejects 2026-02-31, 2026-24-07...). */
export function isRealDay(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) return false;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getFullYear() === Number(m[1]) && d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]);
}
const isTime = (t) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(t || ''));

/**
 * Quick add: "Call the VA about John tomorrow 3pm #tyfys !" ->
 * { title: 'Call the VA about John', due: <tomorrow>, time: '15:00', business: 'tyfys', priority: 'high' }.
 * Understands today, tonight, tomorrow, weekdays (this/next), "next week", "in 3 days", "eow",
 * 10/14, Oct 14, and times like 3pm, 3:30pm, "at 15:00", "noon". Ambiguous forms (short weekday
 * names like "sat", numeric dates like 1/2, bare 15:00) only count at the end of the text or after
 * on/by/due/at, so "Call Sat phone provider" or "Pay 1/2 of the deposit" stay as written. Pure.
 */
export function parseQuick(text, now = new Date()) {
  let s = ` ${String(text || '').trim()} `;
  const today = ymd(now);
  let due = null;
  let time = null;
  let business = null;
  let priority = 'normal';
  // try every match in order; remove the one that is accepted, at its own position
  const take = (re, fn) => {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
    for (const m of s.matchAll(g)) {
      if (fn(m) === false) continue;
      s = `${s.slice(0, m.index)} ${s.slice(m.index + m[0].length)}`;
      return true;
    }
    return false;
  };
  const END = '(?=\\s*$)';
  const atEnd = (m) => /^\s*$/.test(s.slice(m.index + m[0].length));
  const PRE = '(?:due\\s+|by\\s+|on\\s+)';
  take(/\s#([a-z][a-z0-9-]*)\b/i, (m) => { business = m[1].toLowerCase(); });
  take(/\s!{1,3}(?=\s)/, () => { priority = 'high'; });
  take(/\s(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i, (m) => {
    const h12 = Number(m[1]);
    const min = Number(m[2] || 0);
    if (h12 < 1 || h12 > 12 || min > 59) return false;
    time = `${String((h12 % 12) + (m[3].toLowerCase() === 'pm' ? 12 : 0)).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  });
  if (!time) take(/\s(at\s+)?([01]?\d|2[0-3]):([0-5]\d)(?![\d:])/i, (m) => {
    // bare times count only from 13:00 up, or at the end on a 5-minute mark ("sync 9:30", not "chapter 3:16")
    if (!m[1] && Number(m[2]) < 13 && !(atEnd(m) && Number(m[3]) % 5 === 0)) return false;
    time = `${m[2].padStart(2, '0')}:${m[3]}`;
  });
  if (!time) take(/\s(?:at\s+)?noon\b/i, () => { time = '12:00'; });
  take(new RegExp(`\\s${PRE}?(today|tonight|tomorrow|tmrw|tmr)\\b(?!['’])`, 'i'), (m) => {
    const w = m[1].toLowerCase();
    due = w === 'today' || w === 'tonight' ? today : addDays(today, 1);
    if (w === 'tonight' && !time) time = '20:00';
  });
  if (!due) take(/\s(?:due\s+|by\s+)?in\s+(\d{1,3})\s+(day|days|week|weeks)\b/i, (m) => { due = addDays(today, Number(m[1]) * (m[2].startsWith('week') ? 7 : 1)); });
  if (!due) take(/\s(?:due\s+|by\s+)?(next week)\b/i, () => { const d = new Date(`${today}T12:00:00`).getDay(); due = addDays(today, ((8 - d) % 7) || 7); });
  if (!due) take(/\s(?:due\s+|by\s+)?(eow|end of (?:the )?week)\b/i, () => { const d = new Date(`${today}T12:00:00`).getDay(); due = addDays(today, (5 - d + 7) % 7); });
  if (!due) {
    const full = '(sunday|monday|tuesday|wednesday|thursday|friday|saturday)';
    const short = '(sun|mon|tues|tue|wed|thurs|thur|thu|fri|sat)';
    const weekday = (m, mod, name) => {
      const target = DAYS.findIndex((d) => d.startsWith(name.toLowerCase().slice(0, 3)));
      const cur = new Date(`${today}T12:00:00`).getDay();
      let diff = (target - cur + 7) % 7;
      if (diff === 0) diff = 7;
      if (mod && /next/i.test(mod) && diff < 7) diff += 7;
      due = addDays(today, diff);
    };
    // full names anywhere; short ones only when anchored (end of text, or after on/by/due/next/this)
    take(new RegExp(`\\s${PRE}?(next\\s+|this\\s+)?${full}\\b(?!['’])`, 'i'), (m) => weekday(m, m[1], m[2]))
      || take(new RegExp(`\\s(?:${PRE}(next\\s+|this\\s+)?|(next\\s+|this\\s+))${short}\\b(?!['’])`, 'i'), (m) => weekday(m, m[1] || m[2], m[3]))
      || take(new RegExp(`\\s${short}${END}`, 'i'), (m) => weekday(m, null, m[1]));
  }
  if (!due) take(new RegExp(`\\s(${PRE})?(\\d{1,2})\\/(\\d{1,2})(?:\\/(\\d{2,4}))?(?![\\d/])`), (m) => {
    if (!m[1] && !atEnd(m)) return false; // "Pay 1/2 of the deposit", "24/7 coverage"
    const y = m[4] ? (m[4].length === 2 ? 2000 + Number(m[4]) : Number(m[4])) : now.getFullYear();
    let d = `${y}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    if (!m[4] && isRealDay(d) && d < today) d = `${y + 1}${d.slice(4)}`;
    if (!isRealDay(d)) return false;
    due = d;
  });
  if (!due) take(/\s(?:due\s+|by\s+|on\s+)?(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sept|sep|oct|nov|dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/i, (m) => {
    const mo = MONTHS.indexOf(m[1].toLowerCase().slice(0, 3)) + 1;
    let d = `${now.getFullYear()}-${String(mo).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
    if (!isRealDay(d)) return false;
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

/** Only well-formed task fields get through (edits from the UI or the phone). */
function pick(o) {
  const out = {};
  if (o.due !== undefined) { if (o.due !== null && o.due !== '' && !isRealDay(o.due)) throw new Error('Due date must be YYYY-MM-DD.'); out.due = o.due || null; }
  if (o.time !== undefined) { if (o.time !== null && o.time !== '' && !isTime(o.time)) throw new Error('Time must be HH:MM.'); out.time = o.time || null; }
  if (o.business !== undefined) out.business = o.business ? String(o.business).toLowerCase().slice(0, 40) : null;
  if (o.priority !== undefined) out.priority = o.priority === 'high' ? 'high' : 'normal';
  if (o.notes !== undefined) out.notes = String(o.notes || '').slice(0, 4000);
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
const firstGrapheme = (s) => { const it = new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(String(s || ''))[Symbol.iterator]().next(); return it.done ? '' : it.value.segment; };

/** Save the habit list. Habits keep their ids (matched by id, then by name) so streaks survive edits. */
export function setHabits(list) {
  const prev = habits();
  const byName = new Map(prev.map((h) => [h.name.toLowerCase(), h.id]));
  const used = new Set();
  const clean = (list || []).filter((h) => h && String(h.name || '').trim()).slice(0, 12).map((h) => {
    const name = String(h.name).trim().slice(0, 40);
    let id = (h.id && prev.some((p) => p.id === h.id) && h.id) || byName.get(name.toLowerCase()) || crypto.randomUUID().slice(0, 6);
    if (used.has(id)) id = crypto.randomUUID().slice(0, 6);
    used.add(id);
    return { id, name, emoji: firstGrapheme(h.emoji) || '✅' };
  });
  store.set('habits', clean);
  return clean;
}

export function daySheet(day) {
  const all = store.get('days', {});
  return { focus: [], notes: '', habits: {}, ...(all[day] || {}) };
}

export function updateDay(day, patch = {}) {
  if (!isRealDay(day)) throw new Error('bad date');
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
