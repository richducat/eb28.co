import fs from 'node:fs';
import path from 'node:path';
import { PATHS, T } from '../config.js';
import { deriveStatus, isPidAlive, makeJob, titleFrom } from '../jobs/model.js';
import { exists, hasBlock, readHeadJsonl, readTailJsonl, textOf, walk } from './util.js';

export const id = 'claude-code';
export const label = 'Claude Code';

/** Map of sessionId -> live process info from ~/.claude/sessions/<pid>.json */
export function liveSessions(dir = PATHS.claudeSessions) {
  const live = new Map();
  if (!exists(dir)) return live;
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.json')) continue;
    try {
      const info = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
      if (info && info.sessionId && isPidAlive(info.pid)) live.set(info.sessionId, info);
    } catch {
      /* ignore */
    }
  }
  return live;
}

function isSkippable(rec) {
  if (!rec || typeof rec !== 'object') return true;
  if (rec.isSidechain) return true;
  if (rec.type !== 'user' && rec.type !== 'assistant') return true;
  if (!rec.message) return true;
  return false;
}

/** Parse a single Claude Code transcript into a job. Exported for tests. */
export function parseTranscript(file, { live = new Map(), now = Date.now(), mtime } = {}) {
  const head = readHeadJsonl(file);
  const tail = readTailJsonl(file);
  const first = head.find((r) => r.type === 'user' && r.message && !r.isSidechain && !isMeta(r));
  const anyMeta = head.find((r) => r.sessionId) || tail.find((r) => r.sessionId) || {};
  const sessionId = anyMeta.sessionId || path.basename(file, '.jsonl');
  const summary = tail.slice().reverse().find((r) => r.type === 'summary' && r.summary);

  const records = tail.filter((r) => !isSkippable(r));
  const last = records[records.length - 1];
  const lastAssistant = records.slice().reverse().find((r) => r.type === 'assistant');
  const lastAssistantText = lastAssistant ? textOf(lastAssistant.message.content) : '';

  let lastKind = 'unknown';
  if (last) {
    if (last.type === 'assistant') lastKind = hasBlock(last.message.content, 'tool_use') ? 'tool_use' : 'assistant';
    else lastKind = hasBlock(last.message.content, 'tool_result') ? 'tool_result' : 'user';
  }
  // A tool_result as the very last record means Claude is about to think again.
  if (lastKind === 'tool_result') lastKind = 'user';

  const lastTs = last && last.timestamp ? Date.parse(last.timestamp) : 0;
  const lastActivity = Math.max(lastTs || 0, mtime || 0);
  const liveInfo = live.get(sessionId);
  const alive = Boolean(liveInfo);

  const { status, reason } = deriveStatus(
    { lastKind, lastText: lastAssistantText, lastActivity, alive },
    now,
  );

  const cwd = (first && first.cwd) || (last && last.cwd) || (liveInfo && liveInfo.cwd) || '';
  const branch = (last && last.gitBranch) || (first && first.gitBranch) || '';
  const promptText = first ? textOf(first.message.content) : '';
  const title = summary ? summary.summary : titleFrom(promptText);

  return makeJob({
    id: `claude-code:${sessionId}`,
    source: id,
    title,
    status,
    reason,
    cwd,
    branch,
    startedAt: first && first.timestamp,
    lastActivity,
    lastMessage: lastAssistantText || promptText,
    resumeCommand: cwd ? `cd ${shellQuote(cwd)} && claude --resume ${sessionId}` : `claude --resume ${sessionId}`,
    alive,
    meta: {
      sessionId,
      file,
      pid: liveInfo ? liveInfo.pid : null,
      entrypoint: (first && first.entrypoint) || (liveInfo && liveInfo.entrypoint) || '',
      model: lastAssistant && lastAssistant.message.model,
      version: first && first.version,
    },
  });
}

function isMeta(rec) {
  const text = textOf(rec.message && rec.message.content);
  return rec.isMeta || /^<(command-name|local-command|system-reminder)/.test(text.trim());
}

export function shellQuote(s) {
  return /^[\w./-]+$/.test(s) ? s : `'${String(s).replace(/'/g, `'\\''`)}'`;
}

export async function collect({ now = Date.now() } = {}) {
  const root = PATHS.claudeProjects;
  if (!exists(root)) return [];
  const live = liveSessions();
  const files = walk(root, (f) => f.endsWith('.jsonl') && !f.includes(`${path.sep}subagents${path.sep}`), { limit: 300 });
  const jobs = [];
  for (const { file, mtime } of files) {
    if (now - mtime > T.hideDoneAfter && !live.size) continue;
    try {
      const job = parseTranscript(file, { live, now, mtime });
      if (now - mtime > T.hideDoneAfter && !job.alive) continue;
      if (job.title === 'Untitled job' && !job.lastMessage) continue;
      jobs.push(job);
    } catch {
      /* unreadable transcript */
    }
  }
  return jobs;
}
