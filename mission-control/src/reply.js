import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { which } from './paths.js';
import { store } from './store.js';
import { describeTool } from './jobs/model.js';
import { readTailJsonl, textOf } from './sources/util.js';
import { firstJson, localComplete } from './local-llm.js';

/**
 * Answer agents without leaving Mission Control.
 *
 *   askFor(job)        -> what the agent is asking + one-click options (heuristic, instant)
 *   suggest(job)       -> better options from the free local model (cached, async)
 *   sendReply(job, …)  -> continue the session headlessly with Richard's answer
 *
 * Claude Code sessions continue with `claude -p --resume <id>`; a session that is still
 * open in the desktop app is forked (`--fork-session`) so the two never write the same
 * transcript. Codex threads continue with `codex exec resume <id>`. Commands the agent
 * then wants to run come back as Approve items instead of failing silently.
 */

/* ---------- binaries ---------- */
export function claudeBin() {
  if (process.env.MC_CLAUDE_BIN) return process.env.MC_CLAUDE_BIN;
  const onPath = which('claude');
  if (onPath) return onPath;
  const root = path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude-code');
  try {
    const versions = fs.readdirSync(root).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    for (const v of versions) {
      for (const h of fs.readdirSync(path.join(root, v))) {
        const bin = path.join(root, v, h, 'claude.app', 'Contents', 'MacOS', 'claude');
        if (fs.existsSync(bin)) return bin;
      }
    }
  } catch {
    /* not installed */
  }
  return null;
}

export function codexBin() {
  if (process.env.MC_CODEX_BIN) return process.env.MC_CODEX_BIN;
  return which('codex') || ['/Applications/ChatGPT.app/Contents/Resources/codex-cli/bin/codex', '/Applications/Codex.app/Contents/Resources/codex-cli/bin/codex'].find((p) => fs.existsSync(p)) || null;
}

function runCapture(bin, args, { cwd, timeout = 20000, input } = {}) {
  return new Promise((resolve) => {
    let out = '';
    let child;
    try {
      child = spawn(bin, args, { cwd: cwd || os.homedir(), env: process.env });
    } catch (err) {
      resolve({ code: -1, out: err.message });
      return;
    }
    const timer = setTimeout(() => child.kill('SIGTERM'), timeout);
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('error', (err) => { out += err.message; });
    child.on('close', (code) => { clearTimeout(timer); resolve({ code, out }); });
    if (input) child.stdin.end(input);
    else child.stdin.end();
  });
}

/** Is the Claude CLI signed in? Cached for a minute. */
let authCache = { at: 0, ok: false };
export async function claudeReady() {
  if (Date.now() - authCache.at < 60e3) return authCache.ok;
  const bin = claudeBin();
  if (!bin) return (authCache = { at: Date.now(), ok: false }).ok;
  const res = await runCapture(bin, ['auth', 'status'], { timeout: 8000 });
  const ok = res.code === 0 && !/not logged in|logged out/i.test(res.out);
  authCache = { at: Date.now(), ok };
  return ok;
}

/** Start the browser sign-in for the Claude CLI (Richard finishes it in his browser). */
export function startClaudeLogin() {
  const bin = claudeBin();
  if (!bin) return { ok: false, error: 'Claude Code is not installed.' };
  const child = spawn(bin, ['auth', 'login', '--claudeai'], { detached: true, stdio: 'ignore' });
  child.on('error', () => { authCache.at = 0; }); // a missing/broken binary must not crash the app
  child.unref();
  authCache.at = 0;
  return { ok: true };
}

/* ---------- what is the agent asking? ---------- */
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Pull 2–4 obvious answers out of the agent's own words. Pure; exported for tests. */
export function optionsFromText(text) {
  const t = String(text || '').trim();
  if (!t) return [];
  const lines = t.split('\n').map((l) => l.trim());
  // A numbered/lettered/bulleted list that follows a question or "options" line.
  const listItem = /^(?:\*\*)?(?:(\d+|[A-Ca-c])[.)]|[-*•])\s+(.{2,160})$/;
  const tail = lines.slice(-14);
  const cue = tail.findIndex((l) => /\?$|\b(options?|choose|pick|prefer|which (one|way)|would you like|want me to)\b/i.test(l));
  if (cue >= 0) {
    const items = [];
    for (const l of tail.slice(cue + 1)) {
      const m = l.match(listItem);
      if (m) items.push(m[2].replace(/\*\*/g, '').trim());
      else if (items.length && l) break;
    }
    // A list of questions is several things to answer, not choices to pick from.
    if (items.length >= 2 && items.length <= 5 && items.filter((i) => /\?$/.test(i)).length < 2) {
      return items.map((label, i) => ({ label: clip(label.replace(/[:.]$/, ''), 70), reply: `Go with option ${i + 1}: ${label}` }));
    }
  }
  const lastQ = [...t.matchAll(/[^.!?\n]*\?/g)].map((m) => m[0].trim()).pop() || '';
  if (/\b(want me to|should i|shall i|would you like me to|do you want me to|ok to|okay to|can i|may i|ready for me to)\b/i.test(lastQ)) {
    return [
      { label: 'Yes, go ahead', reply: 'Yes, go ahead.' },
      { label: 'No, hold off', reply: 'No, hold off on that for now.' },
    ];
  }
  const or = lastQ.match(/^(?:.*?\b(?:should (?:we|it)|do you want|would you prefer|prefer)\s+)?(.{3,60}?),?\s+or\s+(.{3,60}?)\?$/i);
  if (or) {
    return [or[1], or[2]].map((s) => s.replace(/^(to|the|a|an)\s+/i, '').trim()).filter(Boolean).map((label) => ({ label: clip(label, 60), reply: `Let's go with ${label}.` }));
  }
  return [];
}

function claudeAsk(job) {
  const recs = readTailJsonl(job.meta.file, 768 * 1024).filter((r) => !r.isSidechain && (r.type === 'assistant' || r.type === 'user') && r.message);
  let lastAssistant = null;
  let pending = null;
  for (let i = recs.length - 1; i >= 0; i -= 1) {
    const r = recs[i];
    if (r.type === 'user' && !Array.isArray(r.message.content)) break;
    if (r.type === 'user' && !r.message.content.some((b) => b && b.type === 'tool_result')) break;
    if (r.type === 'assistant') {
      if (!lastAssistant && textOf(r.message.content).trim()) lastAssistant = r;
      if (!pending && Array.isArray(r.message.content)) {
        const tu = r.message.content.filter((b) => b && b.type === 'tool_use').pop();
        const answered = tu && recs.slice(i + 1).some((x) => x.type === 'user' && Array.isArray(x.message.content) && x.message.content.some((b) => b && b.type === 'tool_result' && b.tool_use_id === tu.id));
        if (tu && !answered && i === recs.length - 1) pending = tu;
      }
      if (lastAssistant) break;
    }
  }
  const text = lastAssistant ? textOf(lastAssistant.message.content).trim() : '';
  if (pending && pending.name === 'AskUserQuestion' && pending.input && Array.isArray(pending.input.questions)) {
    const qs = pending.input.questions;
    return {
      kind: 'answer',
      question: qs.map((q) => q.question).join('\n'),
      context: text,
      options: (qs[0].options || []).slice(0, 4).map((o) => ({ label: clip(o.label, 70), detail: o.description || '', reply: qs.length > 1 ? `${qs[0].question} → ${o.label}` : o.label })),
    };
  }
  if (pending) {
    const d = describeTool(pending.name, pending.input);
    const cmd = pending.input && (pending.input.command || pending.input.file_path || pending.input.url || '');
    return {
      kind: 'approve',
      question: `Claude wants to: ${d.label}`,
      detail: cmd ? String(cmd).slice(0, 400) : '',
      context: text,
      tool: pending.name,
      toolInput: pending.input,
      options: [
        { label: 'Approve', reply: 'Approved. Go ahead and run it.', approve: true },
        { label: "Don't do that", reply: "Don't run that. Tell me what you need instead or take a different approach." },
      ],
    };
  }
  return { kind: job.ask === 'answer' ? 'answer' : 'review', question: text ? lastQuestion(text) : '', context: text, options: optionsFromText(text) };
}

function codexAsk(job) {
  const recs = readTailJsonl(job.meta.file, 768 * 1024);
  let text = '';
  let approval = null;
  for (let i = recs.length - 1; i >= 0; i -= 1) {
    const r = recs[i];
    const p = r.payload || r;
    if (!approval && r.type === 'event_msg' && /approval_request$/.test(p.type || '')) approval = p;
    if (r.type === 'event_msg' && (p.type === 'agent_message' || p.type === 'task_complete')) {
      text = p.message || p.last_agent_message || '';
      if (text) break;
    }
    if (p.type === 'message' && p.role === 'assistant') {
      text = textOf(p.content);
      if (text) break;
    }
    if (p.type === 'message' && p.role === 'user') break;
  }
  text = text.trim();
  if (approval && job.ask === 'approve') {
    const cmd = Array.isArray(approval.command) ? approval.command.join(' ') : approval.command || '';
    return {
      kind: 'approve',
      question: `Codex wants to: ${describeTool('shell', { command: cmd }).label}`,
      detail: cmd,
      context: text,
      options: [
        { label: 'Approve', reply: 'Approved. Go ahead and run it.', approve: true },
        { label: "Don't do that", reply: "Don't run that. Take a different approach." },
      ],
    };
  }
  return { kind: job.ask === 'answer' ? 'answer' : 'review', question: text ? lastQuestion(text) : '', context: text, options: optionsFromText(text) };
}

function lastQuestion(text) {
  const qs = [...String(text).matchAll(/[^.!?\n]*\?/g)].map((m) => m[0].trim()).filter((q) => q.length > 8);
  if (qs.length) return qs.slice(-3).join('\n');
  const paras = String(text).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  return clip(paras[paras.length - 1] || '', 400);
}

/** What the agent is asking right now, with instant options. */
export function askFor(job) {
  if (!job) return null;
  if (job.meta && job.meta.kind === 'decision') {
    return {
      kind: 'decision',
      question: job.title,
      context: '',
      options: (job.meta.options || []).map((o) => ({ label: o, reply: o })),
      canReply: true,
      suggested: null,
    };
  }
  let ask = { kind: 'review', question: '', context: job.lastMessage || '', options: [] };
  try {
    if (job.source === 'claude-code' && job.meta.file) ask = claudeAsk(job);
    else if (job.source === 'codex' && job.meta.file) ask = codexAsk(job);
  } catch {
    /* unreadable transcript: fall back to the last message */
  }
  const canReply = (job.source === 'claude-code' && Boolean(claudeBin())) || (job.source === 'codex' && Boolean(codexBin()));
  if (ask.kind === 'review' && !ask.options.length) {
    ask.options = [
      { label: 'Keep going', reply: 'Looks good. Keep going with the next step.' },
      { label: 'Wrap up', reply: 'Please wrap up: finish what is in progress, then summarize what was done and anything left for me.' },
    ];
  }
  const cached = store.get('suggestions', {})[suggestKey(job, ask)];
  return { ...ask, canReply, suggested: cached ? cached.options : null, context: clip(ask.context || '', 2400) };
}

/* ---------- smarter options, written by Claude ---------- */
const suggestKey = (job, ask) => crypto.createHash('sha1').update(`${job.id}|${job.lastActivity}|${ask.question}`).digest('hex').slice(0, 16);
const inflight = new Set();

/** Ask the local model for the 2–3 most likely replies. Cached; never throws. */
export async function suggest(job, onDone) {
  const ask = askFor(job);
  if (!ask || ask.kind === 'approve' || ask.kind === 'decision') return null;
  const key = suggestKey(job, ask);
  const cache = store.get('suggestions', {});
  if (cache[key]) return cache[key].options;
  if (inflight.has(key)) return null;
  inflight.add(key);
  const prompt = `An AI agent working for Richard stopped and is waiting for his reply. Here is the agent's last message:\n\n"""\n${clip(ask.context || ask.question, 3500)}\n"""\n\nWrite the 2 or 3 replies Richard is most likely to send, most likely first. Each label is at most 7 words; each reply is what gets sent to the agent (one or two sentences, decisive, first person). Prefer letting the agent proceed when it asked permission. Answer with JSON only: {"options":[{"label":"...","reply":"..."}]}`;
  try {
    // free: the local Qwen model Hermes runs, never Claude/Grok usage
    const json = firstJson(await localComplete(prompt, { maxTokens: 400 })) || {};
    const options = (json.options || []).filter((o) => o && o.label && o.reply).slice(0, 3).map((o) => ({ label: clip(String(o.label), 60), reply: String(o.reply).slice(0, 600) }));
    if (options.length) {
      store.update('suggestions', {}, (all) => {
        const next = { ...all, [key]: { at: new Date().toISOString(), options } };
        const keys = Object.keys(next);
        if (keys.length > 200) for (const k of keys.slice(0, keys.length - 200)) delete next[k];
        return next;
      });
      if (onDone) onDone(options);
      return options;
    }
  } catch {
    /* suggestions are a nicety */
  } finally {
    inflight.delete(key);
  }
  return null;
}

/* ---------- send the reply ---------- */
const runs = new Map(); // jobId -> run

export function replyRun(jobId) {
  return runs.get(jobId) || store.get('replies', []).filter((r) => r.jobId === jobId).pop() || null;
}

function saveRun(run) {
  store.update('replies', [], (list) => {
    const i = list.findIndex((r) => r.id === run.id);
    const next = i >= 0 ? list.map((r, k) => (k === i ? run : r)) : [...list, run];
    return next.slice(-100);
  });
}

/** Turn a stream-json line from either CLI into a short progress note. */
export function progressFrom(line) {
  let ev;
  try {
    ev = JSON.parse(line);
  } catch {
    return null;
  }
  // Claude Code stream-json
  if (ev.type === 'system' && ev.subtype === 'init') return { sessionId: ev.session_id };
  if (ev.type === 'assistant' && ev.message && Array.isArray(ev.message.content)) {
    const tu = ev.message.content.filter((b) => b.type === 'tool_use').pop();
    if (tu) return { note: `${describeTool(tu.name, tu.input).icon} ${describeTool(tu.name, tu.input).label}` };
    const t = textOf(ev.message.content).trim();
    return t ? { text: t } : null;
  }
  if (ev.type === 'result') return { done: true, ok: !ev.is_error, text: ev.result || '', denials: ev.permission_denials || [] };
  // Codex exec --json
  const item = ev.item || ev.msg || {};
  if (ev.type === 'thread.started' && ev.thread_id) return { sessionId: ev.thread_id };
  if ((ev.type === 'item.completed' || ev.type === 'item.started') && item.type === 'command_execution') return { note: `⚙️ Running ${clip(String(item.command || ''), 60)}` };
  if (ev.type === 'item.completed' && (item.type === 'agent_message' || item.type === 'assistant_message')) return { text: item.text || '' };
  if (ev.type === 'turn.completed') return { done: true, ok: true };
  if (ev.type === 'turn.failed' || ev.type === 'error') return { done: true, ok: false, text: (ev.error && ev.error.message) || ev.message || 'Codex reported an error.' };
  return null;
}

/**
 * Continue the job's session with `text`. `approve` lets exactly the pending tool run.
 * Emits {type:'reply:progress'|'reply:done', jobId, run} through onEvent.
 */
export async function sendReply(job, text, { approve = false, tool, toolInput, onEvent } = {}) {
  const reply = String(text || '').trim();
  if (!reply) throw new Error('Type a reply first.');
  if (runs.has(job.id)) throw new Error('Already sending a reply to this agent. Give it a moment.');
  const sessionId = job.meta && job.meta.sessionId;
  if (!sessionId) throw new Error('This job has no session to reply to.');
  const cwd = job.cwd && fs.existsSync(job.cwd) ? job.cwd : os.homedir();
  let bin;
  let args;
  if (job.source === 'claude-code') {
    bin = claudeBin();
    if (!bin) throw new Error('Claude Code is not installed on this Mac.');
    if (!(await claudeReady())) {
      const err = new Error('Connect Claude first (one-time sign-in), then send again.');
      err.code = 'claude-login';
      throw err;
    }
    args = ['-p', '--resume', sessionId, '--output-format', 'stream-json', '--verbose', '--permission-mode', 'acceptEdits'];
    if (job.alive) args.push('--fork-session'); // the desktop app still holds this transcript
    if (approve && tool) args.push('--allowedTools', allowRule(tool, toolInput));
  } else if (job.source === 'codex') {
    bin = codexBin();
    if (!bin) throw new Error('Codex is not installed on this Mac.');
    args = ['exec', 'resume', sessionId, '--json', '--skip-git-repo-check', '-'];
  } else {
    throw new Error(`Replying to ${job.source} jobs is not supported yet.`);
  }
  const run = { id: `reply:${Date.now()}`, jobId: job.id, title: job.title, source: job.source, text: reply, at: new Date().toISOString(), status: 'running', notes: [], answer: '', forked: Boolean(job.source === 'claude-code' && job.alive) };
  runs.set(job.id, run);
  saveRun(run);
  const emit = (type) => onEvent && onEvent({ type, jobId: job.id, run: { ...run, notes: run.notes.slice(-6) } });
  emit('reply:progress');
  // `--` ends option parsing: --allowedTools takes several values and would swallow the reply
  const child = spawn(bin, args.concat(job.source === 'claude-code' ? ['--', reply] : []), { cwd, env: { ...process.env, MC_REPLY: '1' } });
  if (job.source === 'codex') child.stdin.end(reply);
  else child.stdin.end();
  let buf = '';
  let errText = '';
  const onLine = (line) => {
    const p = progressFrom(line);
    if (!p) return;
    if (p.sessionId) run.sessionId = p.sessionId;
    if (p.note) run.notes.push(p.note);
    if (p.text) run.answer = p.text;
    if (p.done) {
      run.ok = p.ok;
      if (p.denials && p.denials.length) run.denials = p.denials.map((d) => ({ tool: d.tool_name, input: d.tool_input }));
    }
    emit('reply:progress');
  };
  child.stdout.on('data', (d) => {
    buf += d;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      onLine(buf.slice(0, i));
      buf = buf.slice(i + 1);
    }
  });
  child.stderr.on('data', (d) => { errText = (errText + d).slice(-2000); });
  // a stalled CLI must not lock this job forever: stop it after 30 minutes
  const timer = setTimeout(() => { errText += '\nStopped after 30 minutes without finishing.'; child.kill('SIGTERM'); }, 30 * 60 * 1000);
  let finished = false;
  const finish = (code) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    if (buf.trim()) onLine(buf);
    runs.delete(job.id);
    run.status = code === 0 && run.ok !== false ? 'done' : 'failed';
    if (run.status === 'failed' && !run.answer) run.answer = clip(errText.trim() || `Exited with code ${code}.`, 600);
    run.finishedAt = new Date().toISOString();
    saveRun(run);
    emit('reply:done');
  };
  child.on('error', (err) => { errText += err.message; setTimeout(() => finish(-1), 50); });
  child.on('close', (code) => finish(code));
  return run;
}

/** The narrowest --allowedTools rule for an approved tool call. */
export function allowRule(tool, input = {}) {
  if (tool === 'Bash' && input && input.command) return `Bash(${String(input.command).replace(/\)/g, '\\)')})`;
  return tool;
}
