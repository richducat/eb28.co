import fs from 'node:fs';
import { PATHS, T } from '../config.js';
import { deriveStatus, makeJob, titleFrom } from '../jobs/model.js';
import { exists, textOf, walk } from './util.js';

export const id = 'gemini';
export const label = 'Gemini CLI';

/** Gemini CLI keeps chats under ~/.gemini/tmp/<project-hash>/chats/session-*.json */
export function parseChat(file, { now = Date.now(), mtime } = {}) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const messages = Array.isArray(data.messages) ? data.messages : Array.isArray(data) ? data : [];
  const norm = messages
    .map((m) => ({
      kind: m.type === 'user' || m.role === 'user' ? 'user' : m.type === 'gemini' || m.role === 'model' ? 'assistant' : 'unknown',
      text: textOf(m.content) || textOf(m.parts) || '',
      ts: m.timestamp ? Date.parse(m.timestamp) : 0,
      tools: Array.isArray(m.toolCalls) && m.toolCalls.length > 0,
    }))
    .filter((m) => m.kind !== 'unknown');
  const first = norm.find((m) => m.kind === 'user');
  const last = norm[norm.length - 1];
  const lastAssistant = norm.slice().reverse().find((m) => m.kind === 'assistant');
  const lastActivity = Math.max(last ? last.ts : 0, mtime || 0, data.lastUpdated ? Date.parse(data.lastUpdated) : 0);
  const alive = now - lastActivity < T.workingWindow;
  const lastKind = !last ? 'unknown' : last.kind === 'assistant' && last.tools && !last.text ? 'tool_use' : last.kind;
  const { status, reason } = deriveStatus({ lastKind, lastText: lastAssistant ? lastAssistant.text : '', lastActivity, alive }, now);
  const sessionId = data.sessionId || file.split(/[\\/]/).pop().replace(/\.json$/, '');
  return makeJob({
    id: `gemini:${sessionId}`,
    source: id,
    title: titleFrom(first ? first.text : ''),
    status,
    reason,
    cwd: data.projectRoot || data.cwd || '',
    startedAt: data.startTime || (first && first.ts),
    lastActivity,
    lastMessage: lastAssistant ? lastAssistant.text : first ? first.text : '',
    resumeCommand: `gemini --resume ${sessionId}`,
    alive,
    meta: { sessionId, file },
  });
}

export async function collect({ now = Date.now() } = {}) {
  const root = PATHS.geminiTmp;
  if (!exists(root)) return [];
  const files = walk(root, (f) => /[\\/]chats[\\/]session-.*\.json$/.test(f), { limit: 100 });
  const jobs = [];
  for (const { file, mtime } of files) {
    if (now - mtime > T.hideDoneAfter) continue;
    try {
      const job = parseChat(file, { now, mtime });
      if (job.title === 'Untitled job') continue;
      jobs.push(job);
    } catch {
      /* skip */
    }
  }
  return jobs;
}
