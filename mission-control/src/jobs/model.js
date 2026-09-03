import { T } from '../config.js';

/**
 * Canonical statuses. Every source maps into these so the board stays simple:
 *   working    - an agent is actively doing something right now
 *   needs_you  - blocked on Richard (question, permission, review, decision)
 *   follow_up  - unfinished and quiet for too long, or stopped mid-task
 *   done       - finished (kept visible for a few days)
 *   failed     - finished with an error
 */
export const STATUSES = ['working', 'needs_you', 'follow_up', 'done', 'failed'];

export const SOURCES = {
  'claude-code': { label: 'Claude Code', color: '#d97757' },
  codex: { label: 'Codex', color: '#10a37f' },
  openclaw: { label: 'OpenClaw', color: '#7c3aed' },
  gemini: { label: 'Gemini CLI', color: '#4285f4' },
  hermes: { label: 'Hermes', color: '#f59e0b' },
  github: { label: 'GitHub PR', color: '#24292f' },
  automation: { label: 'Automation', color: '#0891b2' },
  manual: { label: 'Tracked', color: '#64748b' },
};

const QUESTION_PATTERNS = [
  /\?\s*$/m,
  /\b(let me know|should i|do you want|would you like|which (one|option)|can you confirm|please confirm|your call|need your (input|decision|approval))\b/i,
  /\b(waiting (on|for) (you|your)|blocked on)\b/i,
];

const PERMISSION_PATTERNS = [/\b(permission|approve|allow)\b.*\b(tool|command|edit)\b/i];

/** True when assistant text reads like it is asking Richard something. */
export function looksLikeQuestion(text = '') {
  const tail = String(text).trim().slice(-600);
  if (!tail) return false;
  return QUESTION_PATTERNS.some((re) => re.test(tail));
}

export function looksLikePermissionAsk(text = '') {
  return PERMISSION_PATTERNS.some((re) => re.test(String(text)));
}

export function isPidAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch (err) {
    return err && err.code === 'EPERM';
  }
}

/** Compact one-line title from a raw prompt. */
export function titleFrom(text, max = 90) {
  const clean = String(text || '')
    .replace(/<[^>]+>[\s\S]*?<\/[^>]+>/g, ' ') // strip xml-ish wrappers (codex env context etc)
    .replace(/[#*`_>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return 'Untitled job';
  const firstSentence = clean.split(/(?<=[.!?])\s/)[0];
  const pick = firstSentence.length >= 20 ? firstSentence : clean;
  return pick.length > max ? `${pick.slice(0, max - 1).trimEnd()}…` : pick;
}

/**
 * Derive a status for a transcript-style session (Claude Code, Codex, Gemini).
 * @param {object} s
 * @param {'user'|'assistant'|'tool_use'|'tool_result'|'unknown'} s.lastKind last meaningful record
 * @param {string} s.lastText last assistant text
 * @param {number} s.lastActivity epoch ms of last record / file mtime
 * @param {boolean} s.alive whether the agent process is still running
 * @param {boolean} [s.explicitDone] source reported completion
 * @param {boolean} [s.explicitFailed]
 * @param {number} [now]
 */
export function deriveStatus(s, now = Date.now()) {
  const age = now - (s.lastActivity || 0);
  const recent = age < T.workingWindow;

  if (s.explicitFailed) return { status: 'failed', reason: s.failReason || 'The agent reported an error.' };

  if (s.lastKind === 'tool_use') {
    if (s.alive && age > T.permissionWait) {
      return { status: 'needs_you', reason: 'Waiting on a tool permission or approval.' };
    }
    if (recent || s.alive) return { status: 'working', reason: 'Running tools right now.' };
    return { status: 'follow_up', reason: 'Stopped in the middle of a tool call. Resume or restart it.' };
  }

  if (s.lastKind === 'user') {
    if (recent || s.alive) return { status: 'working', reason: 'Thinking about your last message.' };
    return { status: 'follow_up', reason: 'Your last message was never answered.' };
  }

  // assistant finished a turn
  const asked = looksLikeQuestion(s.lastText) || looksLikePermissionAsk(s.lastText);
  if (asked) {
    return {
      status: s.alive || age < T.followUpAfter ? 'needs_you' : 'follow_up',
      reason: 'The agent asked you something and is waiting for your answer.',
    };
  }
  if (s.explicitDone) return { status: 'done', reason: 'Task reported complete.' };
  if (s.alive && recent) return { status: 'working', reason: 'Session is active.' };
  if (s.alive) return { status: 'needs_you', reason: 'Session is open and idle. Reply or close it.' };
  return { status: 'done', reason: 'Turn finished and the session closed.' };
}

/** Build a normalized job record. */
export function makeJob(partial) {
  const job = {
    id: partial.id,
    source: partial.source,
    title: partial.title || 'Untitled job',
    status: partial.status || 'done',
    reason: partial.reason || '',
    cwd: partial.cwd || '',
    project: partial.project || projectName(partial.cwd),
    branch: partial.branch || '',
    startedAt: toIso(partial.startedAt),
    lastActivity: toIso(partial.lastActivity),
    lastMessage: (partial.lastMessage || '').slice(0, 800),
    resumeCommand: partial.resumeCommand || '',
    link: partial.link || '',
    alive: Boolean(partial.alive),
    meta: partial.meta || {},
    tags: partial.tags || [],
  };
  return job;
}

export function projectName(cwd = '') {
  const parts = String(cwd).split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] || '';
}

export function toIso(v) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Human-readable relative time. */
export function ago(iso, now = Date.now()) {
  if (!iso) return '';
  const diff = Math.max(0, now - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
