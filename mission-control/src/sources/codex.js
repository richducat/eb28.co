import path from 'node:path';
import { PATHS, T } from '../config.js';
import { deriveStatus, makeJob, titleFrom } from '../jobs/model.js';
import { exists, readHeadJsonl, readTailJsonl, textOf, walk } from './util.js';

export const id = 'codex';
export const label = 'Codex';

const WRAPPER = /^\s*<(environment_context|user_instructions|permissions_instructions|collaboration_mode|turn_aborted|app_context)/i;

/** Normalize the two Codex rollout formats into a flat list of events. */
function normalize(records) {
  const events = [];
  let meta = null;
  for (const r of records) {
    if (!r || typeof r !== 'object') continue;
    const ts = r.timestamp ? Date.parse(r.timestamp) : 0;
    if (r.type === 'session_meta' && r.payload) {
      meta = { ...r.payload, ts };
      continue;
    }
    if (!meta && r.id && r.timestamp && !r.type) meta = { id: r.id, cwd: r.cwd, ts }; // legacy header
    const p = r.payload || r;
    if (r.type === 'response_item' || !r.type) {
      if (p.type === 'message' && p.role) {
        const text = textOf(p.content);
        if (p.role === 'user' && WRAPPER.test(text)) continue;
        events.push({ kind: p.role, text, ts });
      } else if (p.type === 'function_call' || p.type === 'local_shell_call' || p.type === 'custom_tool_call') {
        events.push({ kind: 'tool_use', text: p.name || p.type, ts });
      } else if (p.type === 'function_call_output' || p.type === 'local_shell_call_output' || p.type === 'custom_tool_call_output') {
        events.push({ kind: 'tool_result', ts });
      }
    } else if (r.type === 'event_msg') {
      if (p.type === 'task_started') events.push({ kind: 'task_started', ts });
      else if (p.type === 'task_complete') events.push({ kind: 'task_complete', ts, text: p.last_agent_message || '' });
      else if (p.type === 'agent_message') events.push({ kind: 'assistant', text: p.message || '', ts });
      else if (p.type === 'user_message') events.push({ kind: 'user', text: p.message || '', ts });
      else if (p.type === 'error' || p.type === 'stream_error') events.push({ kind: 'error', text: p.message || '', ts });
      else if (p.type === 'exec_approval_request' || p.type === 'apply_patch_approval_request') events.push({ kind: 'approval', ts });
    }
  }
  return { meta, events };
}

export function parseRollout(file, { now = Date.now(), mtime } = {}) {
  const head = normalize(readHeadJsonl(file));
  const tail = normalize(readTailJsonl(file));
  const meta = head.meta || tail.meta || {};
  const sessionId = meta.id || path.basename(file, '.jsonl').replace(/^rollout-[\dT:-]+-/, '');
  const firstUser = head.events.find((e) => e.kind === 'user' && e.text);
  const events = tail.events;
  const lastMeaningful = events.slice().reverse().find((e) => ['user', 'assistant', 'tool_use', 'tool_result'].includes(e.kind));
  const lastAssistant = events.slice().reverse().find((e) => e.kind === 'assistant' && e.text);
  const lastStart = lastIndex(events, 'task_started');
  const lastComplete = lastIndex(events, 'task_complete');
  const lastApproval = lastIndex(events, 'approval');
  const lastError = events.slice().reverse().find((e) => e.kind === 'error');

  let lastKind = lastMeaningful ? lastMeaningful.kind : 'unknown';
  if (lastKind === 'tool_result') lastKind = 'user';
  const lastTs = events.length ? Math.max(...events.map((e) => e.ts || 0)) : 0;
  const lastActivity = Math.max(lastTs, mtime || 0);
  const recent = now - lastActivity < T.workingWindow;
  const alive = recent; // Codex does not publish a pid registry; recency is the best liveness signal.

  let { status, reason } = deriveStatus(
    {
      lastKind,
      lastText: lastAssistant ? lastAssistant.text : '',
      lastActivity,
      alive,
      explicitDone: lastComplete > lastStart,
      explicitFailed: Boolean(lastError) && lastError.ts >= (events[lastStart] ? events[lastStart].ts : 0) && lastComplete < lastStart,
      failReason: lastError ? lastError.text : '',
    },
    now,
  );
  if (lastApproval > lastComplete && lastApproval >= lastStart && !recent) {
    status = 'needs_you';
    reason = 'Codex is waiting for you to approve a command or patch.';
  }

  const cwd = meta.cwd || '';
  return makeJob({
    id: `codex:${sessionId}`,
    source: id,
    title: titleFrom(firstUser ? firstUser.text : ''),
    status,
    reason,
    cwd,
    branch: meta.git && meta.git.branch,
    startedAt: meta.ts || (firstUser && firstUser.ts),
    lastActivity,
    lastMessage: lastAssistant ? lastAssistant.text : firstUser ? firstUser.text : '',
    resumeCommand: `codex resume ${sessionId}`,
    alive,
    meta: { sessionId, file, model: meta.model, cliVersion: meta.cli_version, originator: meta.originator },
  });
}

function lastIndex(events, kind) {
  for (let i = events.length - 1; i >= 0; i -= 1) if (events[i].kind === kind) return i;
  return -1;
}

export async function collect({ now = Date.now() } = {}) {
  const root = PATHS.codexSessions;
  if (!exists(root)) return [];
  const files = walk(root, (f) => f.endsWith('.jsonl'), { limit: 300 });
  const jobs = [];
  for (const { file, mtime } of files) {
    if (now - mtime > T.hideDoneAfter) continue;
    try {
      const job = parseRollout(file, { now, mtime });
      if (job.title === 'Untitled job' && !job.lastMessage) continue;
      jobs.push(job);
    } catch {
      /* unreadable */
    }
  }
  return jobs;
}
