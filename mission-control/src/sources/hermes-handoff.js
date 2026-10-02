import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { makeJob } from '../jobs/model.js';

/**
 * The team's shared handoff folder (~/hermes-handoff, set up by Grok CoS):
 *   decisions/queue.md    one question for Richard per line, with ready-made options
 *   decisions/answers.md  Richard's answers (written by Mission Control, read by CoS)
 *   YYYY-MM-DD/<job>.md   each scheduled job's report, with a "Needs Richard" section
 * Decisions become "needs you" cards with one-click options; reports become done jobs.
 */
export const id = 'handoff';
export const label = 'Hermes handoff';

export function handoffDir() {
  return process.env.MC_HANDOFF_DIR || path.join(os.homedir(), 'hermes-handoff');
}

const SEP = /\s+·\s+/;

/** `- id=… · 2026-10-01 07:59 AM ET · source: tyfys · Q: … · Options: A / B`. Pure. */
export function parseDecisions(markdown) {
  const out = [];
  for (const line of String(markdown || '').split('\n')) {
    const m = line.match(/^\s*-\s*id=([0-9a-f]{6,})\s+·\s+(.*)$/i);
    if (!m) continue;
    const parts = m[2].split(SEP);
    const d = { id: m[1], at: '', source: '', question: '', options: [] };
    for (const p of parts) {
      if (/^source:/i.test(p)) d.source = p.replace(/^source:\s*/i, '').trim();
      else if (/^Q:/i.test(p)) d.question = p.replace(/^Q:\s*/i, '').trim();
      else if (/^Options:/i.test(p)) d.options = p.replace(/^Options:\s*/i, '').split(/\s+\/\s+/).map((o) => o.trim()).filter(Boolean);
      else if (!d.at && /\d{4}-\d{2}-\d{2}/.test(p)) d.at = p.trim();
      else if (!d.question) d.question = p.trim(); // sensitive items are a bare pointer
    }
    if (d.question) out.push(d);
  }
  return out;
}

/** ids already answered in answers.md (or moved to done.md by CoS). */
export function answeredIds(dir = handoffDir()) {
  const ids = new Set();
  for (const f of ['answers.md', 'done.md']) {
    try {
      for (const m of fs.readFileSync(path.join(dir, 'decisions', f), 'utf8').matchAll(/id=([0-9a-f]{6,})/gi)) ids.add(m[1]);
    } catch {
      /* none yet */
    }
  }
  return ids;
}

/** "2026-10-01 07:59 AM ET" -> epoch ms (Eastern; DST-aware enough for display). */
export function etToMs(s) {
  const m = String(s).match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return 0;
  let h = Number(m[4]) % 12;
  if ((m[6] || '').toUpperCase() === 'PM') h += 12;
  const month = Number(m[2]);
  const offset = month >= 3 && month <= 11 ? 4 : 5; // EDT roughly Mar–Nov
  return Date.UTC(Number(m[1]), month - 1, Number(m[3]), h + offset, Number(m[5]));
}

/** Record Richard's answer where CoS looks for it. Returns the line written. */
export function recordAnswer(decisionId, answer, dir = handoffDir()) {
  if (!/^[0-9a-f]{6,}$/i.test(decisionId)) throw new Error('bad decision id');
  const text = String(answer || '').replace(/\s+/g, ' ').replace(/·/g, '-').trim().slice(0, 500);
  if (!text) throw new Error('empty answer');
  const stamp = new Date().toLocaleString('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true });
  const [d, t] = stamp.split(', ');
  const [mm, dd, yyyy] = d.split('/');
  const line = `- id=${decisionId} · ${yyyy}-${mm}-${dd} ${t} ET · answer: ${text} · via: mission-control\n`;
  fs.mkdirSync(path.join(dir, 'decisions'), { recursive: true });
  fs.appendFileSync(path.join(dir, 'decisions', 'answers.md'), line);
  return line.trim();
}

/** A job report: title, summary, "Needs Richard" bullets. Pure. */
export function parseReport(markdown) {
  const text = String(markdown || '');
  const title = (text.match(/^#\s+(.+)$/m) || [])[1] || '';
  const section = (name) => {
    const m = text.match(new RegExp(`^##\\s+${name}[^\\n]*\\n([\\s\\S]*?)(?=^##\\s|$(?![\\s\\S]))`, 'mi'));
    return m ? m[1].trim() : '';
  };
  const needs = section('Needs Richard')
    .split('\n')
    .map((l) => l.replace(/^\s*[-*]\s+/, '').trim())
    .filter((l) => l && !/^none\.?$/i.test(l));
  return { title, summary: section('Summary'), needs, urgent: section('Urgent').replace(/^none\.?$/i, '') };
}

export async function collect({ now = Date.now() } = {}) {
  const dir = handoffDir();
  if (!fs.existsSync(dir)) return [];
  const jobs = [];
  const answered = answeredIds(dir);
  let queue = '';
  try {
    queue = fs.readFileSync(path.join(dir, 'decisions', 'queue.md'), 'utf8');
  } catch {
    /* no queue */
  }
  for (const d of parseDecisions(queue)) {
    if (answered.has(d.id)) continue;
    const at = etToMs(d.at) || now;
    jobs.push(
      makeJob({
        id: `decision:${d.id}`,
        source: 'hermes',
        title: d.question,
        status: 'needs_you',
        reason: d.options.length ? `Decision from ${d.source || 'the team'}. Pick an option or answer in your own words.` : `Decision from ${d.source || 'the team'}. Ask CoS for the details.`,
        lastActivity: at,
        startedAt: at,
        lastMessage: d.question,
        meta: { decisionId: d.id, options: d.options, from: d.source, kind: 'decision' },
        tags: ['decision', d.source].filter(Boolean),
      }),
    );
  }
  // today's and yesterday's job reports (newest per job)
  const days = [0, 1].map((k) => new Date(now - k * 86400e3).toLocaleDateString('en-CA', { timeZone: 'America/New_York' }));
  const seen = new Set();
  for (const day of days) {
    let files = [];
    try {
      files = fs.readdirSync(path.join(dir, day)).filter((f) => f.endsWith('.md'));
    } catch {
      continue;
    }
    for (const f of files) {
      const slug = f.replace(/\.md$/, '');
      if (seen.has(slug)) continue;
      seen.add(slug);
      const file = path.join(dir, day, f);
      let md = '';
      let mtime = now;
      try {
        md = fs.readFileSync(file, 'utf8');
        mtime = fs.statSync(file).mtimeMs;
      } catch {
        continue;
      }
      const r = parseReport(md);
      jobs.push(
        makeJob({
          id: `handoff:${slug}`,
          source: 'hermes',
          title: r.title || slug.replace(/-/g, ' '),
          status: 'done',
          reason: r.needs.length ? `Report flagged ${r.needs.length} thing${r.needs.length === 1 ? '' : 's'} for you.` : 'Scan finished. Nothing new for you.',
          lastActivity: mtime,
          lastMessage: [r.summary, r.needs.length ? `Needs Richard:\n- ${r.needs.join('\n- ')}` : ''].filter(Boolean).join('\n\n'),
          meta: { file, slug, needs: r.needs, kind: 'report' },
          tags: ['report'],
        }),
      );
    }
  }
  return jobs;
}
