import http from 'node:http';
import { listCrew } from './sources/hermes-crew.js';
import { recordAnswer } from './sources/hermes-handoff.js';
import { usage } from './usage.js';
import { tradingRoutes } from './trading/routes.js';
import { tyfysPipeline } from './tyfys.js';
import { boardFrom, days as replayDays, frames as replayFrames } from './replay.js';
import { askCos, chats, PROFILES as COS_PROFILES } from './cos.js';
import { askFor, claudeReady, replyRun, sendReply, startClaudeLogin, suggest } from './reply.js';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { APP_ROOT, HOST, PORT, MC_HOME } from './config.js';
import { buildBoard, setOverride } from './board.js';
import { store } from './store.js';
import { addManual, removeManual, updateManual } from './sources/manual.js';
import { loadRegistry, runAutomation, setAutomationState, lastRun, nextRunAt, missingTarget, resolveCwd, parseSchedule, TIERS } from './workforce/automations.js';
import { AGENTS, Orchestrator } from './workforce/orchestrator.js';
import { explanationFor } from './workforce/agents/triage.js';
import { notify, messageFor } from './notify.js';
import { readTailJsonl, textOf } from './sources/util.js';
import { loadRegistry as loadBots, saveRegistry as saveBots, PROVIDERS } from './sources/bots.js';
import { restartBot } from './workforce/bot-control.js';
import { createMobile, mobileAllowed } from './mobile.js';
import { today as todayData, suggestFocus } from './today.js';
import { events as calendarEvents } from './calendar.js';
import { addTask, updateTask, deleteTask, tasks as taskList, updateDay, setHabits, ymd, isRealDay } from './planner.js';

const UI_DIR = path.join(APP_ROOT, 'ui');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png' };

export function createServer({ orchestrator = new Orchestrator(), nativeNotify = null, confirmOwner = null, mobile: mobileOn = false } = {}) {
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
      if (b.id && b.id.startsWith('manual:')) {
        const patch = {};
        if (b.status !== undefined) patch.status = b.status;
        if (b.note !== undefined) patch.notes = b.note;
        if (Object.keys(patch).length) updateManual(b.id, patch);
      }
      const o = setOverride(b.id, { status: b.status, reason: b.reason, note: b.note, snoozedUntil: b.snoozedUntil, archived: b.archived, followUpAt: b.followUpAt, business: b.business });
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
      if (b.tier && !TIERS.includes(b.tier)) throw new Error(`tier must be one of ${TIERS.join(', ')}`);
      const automation = { ...finding.automation, tier: b.tier || finding.automation.tier };
      store.update('custom-automations', [], (list) => [...list.filter((x) => x.id !== automation.id), automation]);
      return automation;
    },
    'GET /api/automations': async () =>
      loadRegistry().map((a) => {
        const last = lastRun(a.id);
        const unavailable = missingTarget(a, resolveCwd(a));
        return { ...a, lastRun: last, unavailable, nextRunAt: a.enabled && !unavailable && !orchestrator.paused ? nextRunAt(a.schedule, last && (last.finishedAt || last.startedAt)) : null };
      }),
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
      if (b.schedule !== undefined) {
        if (b.schedule && !parseSchedule(b.schedule)) throw new Error(`Schedule not understood: "${b.schedule}". Try "every 30m", "daily 06:00" or "weekdays 09:30".`);
        patch.schedule = b.schedule;
      }
      return setAutomationState(b.id, patch);
    },
    'GET /api/automations/runs': async (_b, q) => store.get('automation-runs', []).filter((r) => !q.get('id') || r.automationId === q.get('id')).slice(-50).reverse(),
    'GET /api/digests': async () => store.get('digests', []),
    'GET /api/bots': async () => {
      const board = orchestrator.board || (await orchestrator.refreshBoard());
      const bots = board.columns.flatMap((c) => c.jobs).concat(board.snoozed || []).filter((j) => j.source === 'bot');
      return { bots, registry: loadBots(), providers: PROVIDERS.map(({ id, label, color }) => ({ id, label, color })), restarts: store.get('bot-restarts', []).slice(-30).reverse() };
    },
    'POST /api/bots/restart': async (b) => {
      const board = orchestrator.board || (await orchestrator.refreshBoard());
      const bot = board.columns.flatMap((c) => c.jobs).concat(board.snoozed || []).find((j) => j.id === b.id);
      if (!bot) throw new Error('bot not found');
      const res = await restartBot(bot, { trigger: 'manual' });
      orchestrator.emitEvent({ type: 'bot:restart', name: bot.title, ok: res.ok });
      setTimeout(() => orchestrator.refreshBoard(), 2000);
      return res;
    },
    'POST /api/bots/registry': async (b) => {
      if (!b.name) throw new Error('name required');
      if (b.process) {
        try { new RegExp(b.process, 'i'); } catch { throw new Error(`"Process match" is not a valid pattern: ${b.process}`); }
      }
      const entry = cleanBotEntry(b);
      const list = loadBots();
      const idx = list.findIndex((x) => (x.id || x.name) === (b.originalName || entry.name));
      // an edit replaces the entry (cleared fields stay cleared); keep only its id
      if (idx >= 0) {
        // the edit form owns most fields; keep the ones it can't show (id, heartbeat, hidden, match)
        const keep = Object.fromEntries(['id', 'heartbeat', 'hidden', 'match'].filter((k) => list[idx][k] !== undefined).map((k) => [k, list[idx][k]]));
        list[idx] = { ...keep, ...entry };
      }
      else list.push(entry);
      saveBots(list);
      await orchestrator.refreshBoard();
      return entry;
    },
    'DELETE /api/bots/registry': async (_b, q) => {
      saveBots(loadBots().filter((x) => (x.id || x.name) !== q.get('name')));
      await orchestrator.refreshBoard();
      return { ok: true };
    },
    // What a waiting job is asking, with one-click options (read-only).
    'GET /api/ask': async (_b, q) => {
      const board = orchestrator.board || (await orchestrator.refreshBoard());
      const job = board.columns.flatMap((c) => c.jobs).concat(board.snoozed || []).find((j) => j.id === q.get('id'));
      if (!job) throw new Error('job not found');
      const ask = askFor(job);
      if (!ask.suggested && ask.kind !== 'approve' && ask.kind !== 'decision') suggest(job, () => orchestrator.emitEvent({ type: 'ask:suggested', jobId: job.id })).catch(() => {});
      return { ...ask, run: replyRun(job.id) };
    },
    // Send Richard's answer to the agent's session (Claude Code or Codex), headless.
    'POST /api/reply': async (b) => {
      const board = orchestrator.board || (await orchestrator.refreshBoard());
      const job = board.columns.flatMap((c) => c.jobs).concat(board.snoozed || []).find((j) => j.id === b.id);
      if (!job) throw new Error('job not found');
      // `allow` approves one command the agent was denied during an earlier reply
      const ask = b.approve && !b.allow ? askFor(job) : {};
      try {
        return await sendReply(job, b.text, {
          approve: Boolean(b.approve || b.allow),
          tool: b.allow ? b.allow.tool : ask.tool,
          toolInput: b.allow ? b.allow.input : ask.toolInput,
          onEvent: (e) => {
            orchestrator.emitEvent(e);
            if (e.type === 'reply:done') {
              if (e.run.forked && e.run.status === 'done') setOverride(job.id, { status: 'done', reason: 'Continued from Mission Control in a new thread.' });
              setTimeout(() => orchestrator.refreshBoard(), 500);
            }
          },
        });
      } catch (err) {
        if (err.code === 'claude-login') return { ok: false, needsLogin: true, error: err.message };
        throw err;
      }
    },
    'GET /api/claude/status': async () => ({ ready: await claudeReady() }),
    'POST /api/claude/login': async () => startClaudeLogin(),
    // Answer a Hermes decision: written to ~/hermes-handoff/decisions/answers.md for CoS.
    'POST /api/decision': async (b) => {
      const line = recordAnswer(String(b.id || '').replace(/^decision:/, ''), b.answer);
      await orchestrator.refreshBoard();
      return { ok: true, line };
    },
    'GET /api/cos': async () => ({ profiles: COS_PROFILES, chats: chats().reverse() }),
    'POST /api/cos': async (b) => {
      const entry = askCos({ text: b.text, profile: b.profile, onEvent: (e) => { orchestrator.emitEvent(e); orchestrator.refreshBoard(); } });
      setTimeout(() => orchestrator.refreshBoard(), 300);
      return entry;
    },
    // Daily replay: snapshots of the board, rebuilt into boards the Arcade can show.
    'GET /api/replay': async (_b, q) => {
      const board = orchestrator.board || (await orchestrator.refreshBoard());
      const frames = replayFrames(q.get('date') || undefined);
      // businesses/apps are sent once; each frame carries only its jobs
      return { days: replayDays(), businesses: board.businesses, apps: board.apps, frames: frames.map((f) => ({ t: f.t, board: boardFrom(f, undefined, undefined) })) };
    },
    'GET /api/tyfys': async () => tyfysPipeline(),
    'GET /api/usage': async (_b, q) => usage({ fresh: q.get('fresh') === '1' }),
    'GET /api/crew': async () => listCrew(),
    // Who "Dot" (OG Kush) is: Codex voice delegations by default, or any job/bot/crew id.
    'GET /api/dot': async () => store.get('dot', { target: 'codex-voice' }),
    'POST /api/dot': async (b) => {
      const dot = { target: String(b.target || 'codex-voice') };
      store.set('dot', dot);
      return dot;
    },
    ...tradingRoutes({ orchestrator, confirmOwner }),
    // Today, calendar and tasks
    'GET /api/today': async (_b, q) => todayData(orchestrator.board || (await orchestrator.refreshBoard()), validDay(q.get('date')) || ymd()),
    'POST /api/today/suggest': async (b) => ({ focus: await suggestFocus(await todayData(orchestrator.board || (await orchestrator.refreshBoard()), validDay(b.date) || ymd())) }),
    'GET /api/calendar': async (_b, q) => {
      const start = validDay(q.get('start'));
      const end = validDay(q.get('end'));
      if (!start || !end || end <= start) throw new Error('start and end (YYYY-MM-DD) required');
      const cal = await calendarEvents(start, end, { fresh: q.get('fresh') === '1' });
      return { ...cal, tasks: taskList().filter((t) => t.due && t.due >= start && t.due < end) };
    },
    'GET /api/tasks': async () => taskList(),
    'POST /api/tasks': async (b) => {
      if (b.add) return addTask(b.add);
      if (b.delete) return deleteTask(b.delete);
      if (b.id) return updateTask(b.id, b.patch || {});
      throw new Error('add, delete or id+patch required');
    },
    'POST /api/day': async (b) => updateDay(validDay(b.date) || ymd(), b),
    'POST /api/habits': async (b) => setHabits(b.habits),
    'GET /api/health': async () => ({ ok: true, home: MC_HOME, pid: process.pid }),
  };

  // `remote` = the iPhone app over the phone listener (already token-checked in mobile.js)
  const handle = async (req, res, opts = {}) => {
    try {
      return await route(req, res, opts);
    } catch (err) {
      // never let one odd request (bad URL, closed socket) take the server down
      if (!res.headersSent) json(res, 400, { error: err.message });
      else res.end();
    }
  };
  const route = async (req, res, { remote = false } = {}) => {
    const url = new URL(req.url, `http://${HOST}`);
    if (!remote) {
      // every local request, reads included, must be addressed to Mission Control itself
      // (a DNS-rebinding page would otherwise read the board, trading or the phone pairing code)
      const host = checkHost(req);
      if (!host.ok) return json(res, 403, { error: host.reason });
    }
    if (req.method === 'GET' && url.pathname === '/api/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write(`data: ${JSON.stringify({ type: 'hello' })}\n\n`);
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    const handler = routes[`${req.method} ${url.pathname}`];
    if (handler && req.method !== 'GET') {
      const guard = remote ? jsonOnly(req) : checkWrite(req);
      if (!guard.ok) return json(res, 403, { error: guard.reason });
    }
    if (remote && !handler) return json(res, 404, { error: 'not found' });
    if (handler) {
      try {
        const body = req.method === 'GET' ? {} : await readBody(req);
        if (remote) {
          const ok = mobileAllowed(req.method, url.pathname, body);
          if (!ok.ok) return json(res, ok.code, { error: ok.reason });
        }
        return json(res, 200, await handler(body, url.searchParams));
      } catch (err) {
        return json(res, 400, { error: err.message });
      }
    }
    if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'not found' });
    // static UI
    let file = path.join(UI_DIR, url.pathname === '/' ? 'index.html' : url.pathname);
    const isFile = (f) => { try { return fs.statSync(f).isFile(); } catch { return false; } };
    // only real files inside ui/ (a directory like /vendor used to crash the server)
    if (!file.startsWith(UI_DIR + path.sep) || !isFile(file)) file = path.join(UI_DIR, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
  };
  const server = http.createServer((req, res) => handle(req, res));

  // Phone access (local only: the phone listener refuses these routes)
  const mobile = createMobile({ handle });
  routes['GET /api/mobile'] = async () => mobile.status();
  routes['POST /api/mobile'] = async (b) => mobile.set({ enabled: typeof b.enabled === 'boolean' ? b.enabled : undefined, rotate: Boolean(b.rotate) });
  if (mobileOn) mobile.autostart();
  server.on('close', () => mobile.stop());

  server.orchestrator = orchestrator;
  server.mobile = mobile;
  return server;
}

/** Keep only known bots.json fields, split command strings into argv. */
export function cleanBotEntry(b) {
  const argv = (v) => (Array.isArray(v) ? v.filter(Boolean) : String(v || '').trim() ? String(v).trim().split(/\s+/) : undefined);
  const entry = {
    name: String(b.name).trim(),
    provider: String(b.provider || '').trim().toLowerCase() || undefined,
    description: b.description || undefined,
    match: b.match || undefined,
    process: b.process || undefined,
    log: b.log || undefined,
    heartbeat: b.heartbeat || undefined,
    health: b.health || undefined,
    link: b.link || undefined,
    restart: argv(b.restart),
    expected: b.expected === undefined || b.expected === '' ? undefined : b.expected === true || b.expected === 'true',
    autoRestart: b.autoRestart === true || b.autoRestart === 'true' ? true : b.autoRestart === undefined ? undefined : false,
    staleAfterMin: b.staleAfterMin ? Number(b.staleAfterMin) : undefined,
    hidden: b.hidden === true || undefined,
  };
  for (const k of Object.keys(entry)) if (entry[k] === undefined) delete entry[k];
  return entry;
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

/**
 * Write guard for every non-GET API route. The server has no auth and binds to localhost, so
 * without this any web page open in a browser could POST to it (a "simple" text/plain request
 * needs no CORS preflight) and, say, send replies to agents or run automations. Requiring a
 * JSON content type forces a preflight the server never answers, and checking Host/Origin
 * blocks DNS rebinding and cross-site requests. Exported for tests.
 */
export function checkHost(req) {
  const port = req.socket && req.socket.localPort;
  const allowed = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
  const host = String(req.headers.host || '');
  if (!allowed.has(host)) return { ok: false, reason: 'Refused: request did not come from Mission Control (host).' };
  const origin = req.headers.origin;
  if (origin && !allowed.has(origin.replace(/^https?:\/\//, ''))) return { ok: false, reason: 'Refused: request did not come from Mission Control (origin).' };
  return { ok: true };
}

export function checkWrite(req) {
  const host = checkHost(req);
  if (!host.ok) return host;
  if (!/^application\/json\b/i.test(String(req.headers['content-type'] || ''))) return { ok: false, reason: 'Refused: write requests must be JSON.' };
  return { ok: true };
}

const validDay = (s) => (isRealDay(s) ? String(s) : null);

/** Phone requests are token-checked and route-limited; writes must still be JSON. */
function jsonOnly(req) {
  if (!/^application\/json\b/i.test(String(req.headers['content-type'] || ''))) return { ok: false, reason: 'Refused: write requests must be JSON.' };
  return { ok: true };
}

export function listen(server, port = PORT) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, HOST, () => resolve(server.address().port));
  });
}
