import fs from 'node:fs';
import { PATHS } from '../config.js';
import { makeJob } from '../jobs/model.js';
import { exists } from './util.js';

export const id = 'hermes';
export const label = 'Hermes';

/**
 * Hermes keeps an OPEN_LOOPS.md: markdown sections with "- [ ]" / "- [x]" items.
 * Each open loop becomes a tracked job so it shows up next to the AI sessions.
 */
export function parseOpenLoops(markdown, { mtime = Date.now() } = {}) {
  const jobs = [];
  let section = 'General';
  let index = 0;
  for (const line of String(markdown).split('\n')) {
    const heading = line.match(/^#{1,6}\s+(.*)/);
    if (heading) {
      section = heading[1].trim();
      continue;
    }
    const item = line.match(/^\s*[-*]\s+\[( |x|X)\]\s+(.*)/);
    if (!item) continue;
    index += 1;
    const done = item[1].toLowerCase() === 'x';
    const text = item[2].trim();
    const low = `${section} ${text}`.toLowerCase();
    let status = done ? 'done' : 'follow_up';
    let reason = done ? 'Checked off in OPEN_LOOPS.md' : `Open loop under "${section}".`;
    if (!done && /\b(needs richard|waiting on richard|decide|approve|needs approval|your call)\b/.test(low)) {
      status = 'needs_you';
      reason = 'Hermes flagged this as needing your decision.';
    } else if (!done && /\b(urgent|today|blocker|asap)\b/.test(low)) {
      status = 'needs_you';
      reason = 'Marked urgent in OPEN_LOOPS.md';
    }
    jobs.push(
      makeJob({
        id: `hermes:${slug(section)}:${slug(text).slice(0, 48)}:${index}`,
        source: id,
        title: text.length > 110 ? `${text.slice(0, 109)}…` : text,
        status,
        reason,
        lastActivity: mtime,
        lastMessage: text,
        meta: { section },
        tags: ['open-loop'],
      }),
    );
  }
  return jobs;
}

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function collect() {
  const file = PATHS.hermesOpenLoops;
  if (!exists(file)) return [];
  const md = fs.readFileSync(file, 'utf8');
  const mtime = fs.statSync(file).mtimeMs;
  return parseOpenLoops(md, { mtime });
}
