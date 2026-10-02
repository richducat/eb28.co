import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { MC_HOME } from './config.js';

/**
 * Richard's Google calendars, read-only, through Hermes's `gapi-ro` wrapper (which refuses
 * anything but listing events and reading mail). Which calendars and which Hermes profile's
 * Google sign-in to use live in ~/.eb28-mission-control/calendar.json (never in the repo):
 *   { "profile": "eb28-cos", "calendars": [{ "id": "...", "name": "Personal", "color": "#5b8cff" }] }
 * Results are cached for 5 minutes per range; one calendar failing never blanks the others.
 */
const cfgFile = () => process.env.MC_CALENDAR_CONFIG || path.join(MC_HOME, 'calendar.json');
const GAPI = () => process.env.MC_GAPI_RO || path.join(os.homedir(), 'hermes-handoff', 'bin', 'gapi-ro');
const PALETTE = ['#6c8cff', '#e5484d', '#30a46c', '#f5a524', '#8e4ec6', '#12a594'];

export function loadCalendarConfig() {
  try {
    const c = JSON.parse(fs.readFileSync(cfgFile(), 'utf8'));
    return { profile: c.profile || '', calendars: (c.calendars || []).filter((x) => x && x.id && x.enabled !== false).map((x, i) => ({ color: PALETTE[i % PALETTE.length], ...x })) };
  } catch {
    return { profile: '', calendars: [] };
  }
}

/** Normalize one gapi-ro event. Pure; exported for tests. */
export function normalizeEvent(e, cal) {
  const allDay = typeof e.start === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(e.start);
  return {
    id: `${cal.id}:${e.id}`,
    title: e.summary || '(no title)',
    start: e.start,
    end: e.end || e.start,
    allDay,
    // Google gives recurring instances ids like <base>_20261002T090000Z
    recurring: /_\d{8}(T\d{6}Z?)?$/.test(String(e.id || '')),
    location: e.location || '',
    link: e.htmlLink || '',
    calendar: cal.name || cal.id,
    calendarId: cal.id,
    color: cal.color,
  };
}

/** Milliseconds for sorting/overlap: all-day dates count from local midnight. */
export function startMs(e) { return e.allDay ? new Date(`${e.start}T00:00:00`).getTime() : Date.parse(e.start); }
export function endMs(e) { return e.allDay ? new Date(`${e.end}T00:00:00`).getTime() : Date.parse(e.end); }

/** Does the event touch this local day (YYYY-MM-DD)? Handles all-day and past-midnight events. Pure. */
export function onDay(e, day) {
  const s = new Date(`${day}T00:00:00`).getTime();
  const end = new Date(`${day}T00:00:00`);
  end.setDate(end.getDate() + 1);
  const a = startMs(e);
  const b = Math.max(endMs(e), a + (e.allDay ? 864e5 : 1));
  return a < end.getTime() && b > s;
}

/** Local YYYY-MM-DD of an event start (all-day events are already dates). */
export function dayOf(s) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return new Date(s).toLocaleDateString('en-CA');
}

const cache = new Map();
const inflight = new Map();

function listCalendar(cfg, cal, start, end) {
  return new Promise((resolve) => {
    const env = { ...process.env, HERMES_HOME: path.join(os.homedir(), '.hermes', 'profiles', cfg.profile) };
    execFile(GAPI(), ['calendar', 'list', '--start', start, '--end', end, '--max', '250', '--calendar', cal.id], { env, timeout: 45000, maxBuffer: 8e6 }, (err, out) => {
      if (err) return resolve({ ok: false, calendar: cal.name, error: 'Could not read this calendar right now.' });
      try {
        const list = JSON.parse(out);
        resolve({ ok: true, events: (Array.isArray(list) ? list : []).filter((e) => e.status !== 'cancelled').map((e) => normalizeEvent(e, cal)) });
      } catch {
        resolve({ ok: false, calendar: cal.name, error: 'Unexpected reply from Google.' });
      }
    });
  });
}

/** Events between two dates (YYYY-MM-DD, end exclusive), all enabled calendars merged. */
export async function events(startDay, endDay, { fresh = false } = {}) {
  const cfg = loadCalendarConfig();
  if (!cfg.profile || !cfg.calendars.length) return { ok: false, setup: true, events: [], calendars: [], errors: ['No calendars set up yet.'] };
  const start = new Date(`${startDay}T00:00:00`).toISOString();
  const end = new Date(`${endDay}T00:00:00`).toISOString();
  const key = `${startDay}|${endDay}|${cfg.calendars.map((c) => c.id).join(',')}`;
  const hit = cache.get(key);
  if (!fresh && hit) {
    // fresh enough: use it; older: still answer instantly and refresh in the background
    if (Date.now() - hit.at >= 5 * 60e3 && !inflight.has(key)) inflight.set(key, load(cfg, key, start, end).finally(() => inflight.delete(key)));
    return hit.value;
  }
  if (inflight.has(key)) return inflight.get(key);
  const p = load(cfg, key, start, end).finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

async function load(cfg, key, start, end) {
  const results = await Promise.all(cfg.calendars.map((c) => listCalendar(cfg, c, start, end)));
  // Google mixes "...Z" and "...-04:00", so sort by real time, not text
  const all = results.flatMap((r) => r.events || []).sort((a, b) => startMs(a) - startMs(b));
  const value = {
    ok: results.some((r) => r.ok),
    events: all,
    calendars: cfg.calendars.map((c) => ({ id: c.id, name: c.name, color: c.color })),
    errors: results.filter((r) => !r.ok).map((r) => `${r.calendar}: ${r.error}`),
  };
  const prev = cache.get(key);
  // a failed refresh (Google or Hermes down) never replaces good data
  if (!value.ok && prev && prev.value.ok) return prev.value;
  if (!value.ok) return value; // never cache a total failure
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 40) cache.delete(cache.keys().next().value);
  return value;
}
