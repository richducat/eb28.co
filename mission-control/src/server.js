import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { APP_ROOT, HOST, PORT, MC_HOME } from './config.js';
import { buildBoard, setOverride } from './board.js';
import { store } from './store.js';
import { addManual, removeManual, updateManual } from './sources/manual.js';
import { loadRegistry, runAutomation, setAutomationState, lastRun } from './workforce/automations.js';
import { AGENTS, Orchestrator } from './workforce/orchestrator.js';
import { explanationFor } from './workforce/agents/triage.js';
import { notify, messageFor } from './notify.js';
import { readTailJsonl, textOf } from './sources/util.js';

const UI_DIR = path.join(APP_ROOT, 'ui');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };

export function createServer({ orchestrator = new Orchestrator(), nativeNotify = null } = {}) {
  const clients = new Set();

  orchestrator.on('event', (event) => {
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    for (const res of clients) res.write(payload);
    const msg = messageFor(event);
    if (msg) (nativeNotify || notify)(msg);
  });

  const json = (res, code, body) => {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(body));
  };

  const readBody = (req) =>
    new Promise((resolve) => {
      let data = '';
      req.on('data', (c) => {
        data += c;
        if (data.length > 1e6) req.destroy();
      });
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch {
          resolve({});
        }
      });
    });

  const routes = {
    'GET /api/board': async () => {
      const board = orchestrator.board || (await orchestrator.refreshBoard());
      for (const col of board.columns) for (const job of col.jobs) job.explanation = explanationFor(store, job);
      return board;
    },
    'POST /api/refresh': async () => orchestrator.refreshBoard(),
    'GET /api/job': async (_b, q) => jobDetail(q.get('id')),
    'POST /api/job/override': async (b) => {
      if (b.id && b.id.startsWith('manual:')) updateManual(b.id, { status: b.status, notes: b.note });
      const o = setOverride(b.id, { status: b.status, reason: b.reason, note: b.note, snoozedUntil: b.snoozedUntil, archived: b.archived, followUpAt: b.followUpAt });
      await orchestrator.refreshBoard();
      return { ok: true, override: o };
    },
    'POST /api/job/manual': async (b) => {
      if (!b.title) throw new Error('title required');
      const job = addManual(b);
      await orchestrator.refreshBoard();
      return job;
    },
    'DELETE /api/job/manual': async (_b, q) => {
      removeManual(q.get('id'));
      await orchestrator.refreshBoard();
      return { ok: true };
    },
    'POST /api/open': async (b) => openLocal(b),
    'GET /api/workforce': async () => ({
      ...(await orchestrator.status()),
      proposals: store.get('proposals', []).filter((p) => p.status === 'pending'),
      followUps: store.get('follow-ups', { items: [] }),
      scout: store.get('scout-findings', { proposals: [] }),
      digest: store.get('digests', [])[0] || null,
      activity: store.get('activity', []).slice(-40).reverse(),
      log: store.get('workforce-log', []).slice(-40).reverse(),
      agentRuns: store.get('agent-runs', []).slice(-40).reverse(),
    }),
    'POST /api/workforce/pause': async (b) => {
      orchestrator.setPaused(b.paused);
      return { paused: orchestrator.paused };
    },
    'POST /api/workforce/agent': async (b) => {
      const agent = AGENTS.find((a) => a.id === b.id);
      if (!agent) throw new Error('unknown agent');
      if (typeof b.enabled === 'boolean') orchestrator.setAgentEnabled(b.id, b.enabled);
      if (b.run) return orchestrator.runAgent(agent, { force: true });
      return { ok: true };
    },
    'POST /api/workforce/proposal': async (b) => orchestrator.decideProposal(b.id, b.decision, { standing: Boolean(b.standing) }),
    'POST /api/workforce/scout/adopt': async (b) => {
      const finding = store.get('scout-findings', { proposals: [] }).proposals.find((p) => p.id === b.id);
      if (!finding) throw new Error('finding not found');
      const automation = { ...finding.automation, tier: b.tier || finding.automation.tier };
      store.update('custom-automations', [], (list) => [...list.filter((x) => x.id !== automation.id), automation]);
      return automation;
    },
    'GET /api/automations': async () => loadRegistry().map((a) => ({ ...a, lastRun: lastRun(a.id) })),
    'POST /api/automations/run': async (b) => {
      const a = loadRegistry().find((x) => x.id === b.id);
      if (!a) throw new Error('unknown automation');
      if (a.tier === 'manual' && !b.confirmed) throw new Error('manual-tier automation needs confirmed:true');
      runAutomation(a, { trigger: 'manual', onEvent: (e) => orchestrator.emitEvent(e) });
      return { started: true };
    },
    'POST /api/automations/state': async (b) => {
      const patch = {};
      if (typeof b.enabled === 'boolean') patch.enabled = b.enabled;
      if (typeof b.autoApproved === 'boolean') patch.autoApproved = b.autoApproved;
      if (b.schedule !== undefined) patch.schedule = b.schedule;
      return setAutomationState(b.id, patch);
    },
    'GET /api/automations/runs': async (_b, q) => store.get('automation-runs', []).filter((r) => !q.get('id') || r.automationId === q.get('id')).slice(-50).reverse(),
    'GET /api/digests': async () => store.get('digests', []),
    'GET /api/health': async () => ({ ok: true, home: MC_HOME, pid: process.pid }),
  };

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${HOST}`);
    if (req.method === 'GET' && url.pathname === '/api/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write(`data: ${JSON.stringify({ type: 'hello' })}\n\n`);
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    const handler = routes[`${req.method} ${url.pathname}`];
    if (handler) {
      try {
        const body = req.method === 'GET' ? {} : await readBody(req);
        return json(res, 200, await handler(body, url.searchParams));
      } catch (err) {
        return json(res, 400, { error: err.message });
      }
    }
    if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'not found' });
    // static UI
    let file = path.join(UI_DIR, url.pathname === '/' ? 'index.html' : url.pathname);
    if (!file.startsWith(UI_DIR) || !fs.existsSync(file)) file = path.join(UI_DIR, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });

  server.orchestrator = orchestrator;
  return server;
}

function jobDetail(id) {
  if (!id) throw new Error('id required');
  const board = store.get('last-snapshot', {});
  const overrides = store.get('overrides', {});
  const detail = { id, snapshot: board[id] || null, override: overrides[id] || null, transcript: [] };
  const [source, ...rest] = id.split(':');
  if (source === 'claude-code' || source === 'codex') {
    const file = findTranscript(source, rest.join(':'));
    if (file) detail.transcript = transcriptTail(source, file);
  }
  return detail;
}

function findTranscript(source, sessionId) {
  const roots = source === 'claude-code' ? [process.env.MC_CLAUDE_DIR || path.join(process.env.HOME || '', '.claude', 'projects')] : [process.env.MC_CODEX_DIR || path.join(process.env.HOME || '', '.codex', 'sessions')];
  const stack = roots.filter((r) => fs.existsSync(r));
  while (stack.length) {
    const dir = stack.pop();
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.name.endsWith('.jsonl') && e.name.includes(sessionId)) return full;
    }
  }
  return null;
}

function transcriptTail(source, file) {
  const records = readTailJsonl(file, 256 * 1024);
  const out = [];
  for (const r of records) {
    if (source === 'claude-code') {
      if ((r.type !== 'user' && r.type !== 'assistant') || !r.message || r.isSidechain) continue;
      const content = r.message.content;
      const text = textOf(content);
      const tools = Array.isArray(content) ? content.filter((b) => b.type === 'tool_use').map((b) => `${b.name}${b.input && b.input.description ? `: ${b.input.description}` : ''}`) : [];
      if (!text && !tools.length) continue;
      out.push({ role: r.type, text: text.slice(0, 2000), tools, at: r.timestamp });
    } else {
      const p = r.payload || r;
      if (r.type === 'response_item' && p.type === 'message') out.push({ role: p.role, text: textOf(p.content).slice(0, 2000), tools: [], at: r.timestamp });
      else if (r.type === 'response_item' && p.type === 'function_call') out.push({ role: 'assistant', text: '', tools: [p.name], at: r.timestamp });
    }
  }
  return out.slice(-30);
}

function run(bin, args) {
  return new Promise((resolve) => {
    execFile(bin, args, { timeout: 15000 }, (err, stdout, stderr) => {
      if (err) resolve({ ok: false, error: (stderr || err.message || '').trim().split('\n').pop() });
      else resolve({ ok: true, output: String(stdout || '').trim() });
    });
  });
}

/** A login-shell script Terminal can run, so PATH, nvm, and aliases all load first. */
export function terminalScript(command) {
  return `#!/bin/zsh -l\nclear\nprintf '» %s\\n' ${JSON.stringify(command)}\n${command}\n`;
}

/** Open a URL or folder, or run a command in a fresh terminal window. Always resolves. */
export async function openLocal({ path: target, url, command }) {
  const platform = process.platform;
  const opener = platform === 'darwin' ? 'open' : platform === 'win32' ? 'cmd' : 'xdg-open';
  if (url && /^https?:\/\//.test(url)) return run(opener, platform === 'win32' ? ['/c', 'start', '', url] : [url]);
  if (target) return fs.existsSync(target) ? run(opener, platform === 'win32' ? ['/c', 'start', '', target] : [target]) : { ok: false, error: `folder not found: ${target}` };
  if (!command) return { ok: false, error: 'nothing to open' };
  if (platform === 'darwin') {
    // Write the command to a script so quoting never breaks, then have Terminal run it.
    const scriptPath = path.join(MC_HOME, 'last-run.command');
    fs.writeFileSync(scriptPath, terminalScript(command), { mode: 0o755 });
    const res = await run('osascript', ['-e', 'tell application "Terminal" to activate', '-e', `tell application "Terminal" to do script "${scriptPath.replace(/(["\\])/g, '\\$1')}"`]);
    return res.ok ? { ok: true, opened: 'Terminal' } : { ok: false, error: `Terminal refused: ${res.error}. Copy the command instead.` };
  }
  if (platform === 'win32') return run('cmd', ['/c', 'start', 'cmd', '/k', command]);
  for (const term of ['x-terminal-emulator', 'gnome-terminal', 'konsole', 'xterm']) {
    const args = term === 'gnome-terminal' ? ['--', 'bash', '-lc', `${command}; exec bash`] : ['-e', `bash -lc '${command.replace(/'/g, "'\\''")}; exec bash'`];
    const res = await run(term, args);
    if (res.ok) return { ok: true, opened: term };
  }
  return { ok: false, error: 'no terminal emulator found. Copy the command instead.' };
}

export function listen(server, port = PORT) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, HOST, () => resolve(server.address().port));
  });
}
