import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { MC_HOME } from '../config.js';
import { which } from '../paths.js';
import { makeJob } from '../jobs/model.js';
import { exists } from './util.js';

/**
 * Long-running bots and agents: Grok/xAI bots, trading bots, Discord/Telegram bots,
 * schedulers, anything that should be "up". Found four ways, merged by name:
 *   1. pm2         `pm2 jlist`
 *   2. launchd     ~/Library/LaunchAgents/*.plist + `launchctl list` (macOS)
 *   3. docker      `docker ps -a`
 *   4. bots.json   ~/.eb28-mission-control/bots.json, for anything the others miss
 * Plus a process scan for command lines matching MC_BOT_KEYWORDS (default grok|xai).
 */
export const id = 'bot';
export const label = 'Bot';

export const PROVIDERS = [
  { id: 'grok', label: 'Grok', color: '#000000', markers: [/api\.x\.ai/i, /XAI_API_KEY/, /\bgrok-[\w.-]+/i, /\bxai\b/i, /\bgrok\b/i] },
  { id: 'claude', label: 'Claude', color: '#d97757', markers: [/api\.anthropic\.com/i, /ANTHROPIC_API_KEY/, /@anthropic-ai\//, /\bclaude-[\w.-]+/i] },
  { id: 'openai', label: 'OpenAI', color: '#10a37f', markers: [/api\.openai\.com/i, /OPENAI_API_KEY/, /\bgpt-[\w.-]+/i] },
  { id: 'gemini', label: 'Gemini', color: '#4285f4', markers: [/generativelanguage\.googleapis/i, /GEMINI_API_KEY|GOOGLE_API_KEY/, /@google\/genai/] },
];

const ERROR_LINE = /\b(\w*error|\w*exception|fatal|unhandled|panic|ECONNREFUSED|ETIMEDOUT|401 unauthorized|429 too many|rate limit)\b/i;
const TRACEBACK_HEADER = /^\s*Traceback \(most recent call last\)/;
const SYSTEM_LABEL = /^(com\.apple|com\.google|com\.microsoft|com\.adobe|com\.docker|com\.dropbox|com\.spotify|com\.zoom|homebrew\.mxcl|org\.mozilla|com\.openai\.chat|com\.anthropic\.claude)/i;

export function botsFile() {
  return process.env.MC_BOTS || path.join(MC_HOME, 'bots.json');
}

export function loadRegistry() {
  try {
    const list = JSON.parse(fs.readFileSync(botsFile(), 'utf8'));
    return Array.isArray(list) ? list : list.bots || [];
  } catch {
    return [];
  }
}

export function saveRegistry(list) {
  fs.mkdirSync(path.dirname(botsFile()), { recursive: true });
  fs.writeFileSync(botsFile(), JSON.stringify(list, null, 2));
}

function run(cmd, args, timeout = 6000) {
  const bin = which(cmd);
  if (!bin) return Promise.resolve(null);
  return new Promise((resolve) => {
    execFile(bin, args, { timeout, maxBuffer: 16 * 1024 * 1024 }, (err, stdout) => resolve(err && !stdout ? null : String(stdout || '')));
  });
}

/** Guess the AI provider from a name, command line, or the script's own source. */
export function detectProvider(...texts) {
  const hay = texts.filter(Boolean).join('\n');
  for (const p of PROVIDERS) if (p.markers.some((re) => re.test(hay))) return p.id;
  return '';
}

function scriptHead(file) {
  try {
    if (!file || !fs.statSync(file).isFile()) return '';
    const fd = fs.openSync(file, 'r');
    const buf = Buffer.alloc(Math.min(200_000, fs.fstatSync(fd).size));
    fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);
    return buf.toString('utf8');
  } catch {
    return '';
  }
}

/** Last lines of a log plus its mtime and the most recent error line, if any. */
export function tailLog(file, bytes = 32 * 1024) {
  try {
    const st = fs.statSync(file);
    const fd = fs.openSync(file, 'r');
    const len = Math.min(bytes, st.size);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, st.size - len);
    fs.closeSync(fd);
    const lines = buf.toString('utf8').split('\n').map((l) => l.trimEnd()).filter(Boolean).slice(-40);
    const lastError = [...lines].reverse().find((l) => ERROR_LINE.test(l) && !TRACEBACK_HEADER.test(l)) || '';
    const errorIsLatest = lines.length > 0 && ERROR_LINE.test(lines[lines.length - 1]);
    return { mtime: st.mtimeMs, lines, lastError, errorIsLatest };
  } catch {
    return null;
  }
}

/**
 * Decide a status from what we know about a bot. Pure, so it is tested directly.
 * @param {object} b { state: 'running'|'stopped'|'crashed'|'unknown', exitCode, restarts,
 *                     log: tailLog(), health: {ok, error}, staleAfterMin, expected: boolean }
 */
export function botStatus(b, now = Date.now()) {
  const staleMs = (b.staleAfterMin || 60) * 60e3;
  if (b.health && b.health.ok === false) return { status: 'failed', reason: `Health check failed: ${b.health.error}` };
  if (b.state === 'crashed') return { status: 'failed', reason: b.exitCode ? `Crashed with exit code ${b.exitCode}.` : 'Crashed or crash-looping.' };
  if (b.state === 'stopped') {
    if (b.expected === false) return { status: 'done', reason: 'Stopped (not expected to be running).' };
    if (b.expected === true) return { status: 'failed', reason: 'Should be running, but it is not. Restart it.' };
    return { status: 'follow_up', reason: 'Stopped. Start it again or remove it.' };
  }
  if (b.restarts >= 5 && b.recentRestart) return { status: 'failed', reason: `Restarted ${b.restarts} times. It is probably crash-looping.` };
  if (b.log && b.log.errorIsLatest && now - b.log.mtime < staleMs) return { status: 'needs_you', reason: `Running, but the latest log line is an error: ${b.log.lastError.slice(0, 160)}` };
  if (b.state === 'running') {
    if (b.log && now - b.log.mtime > staleMs) return { status: 'follow_up', reason: `Running, but silent for ${Math.round((now - b.log.mtime) / 3600e3)}h. It may be stuck.` };
    return { status: 'working', reason: 'Running.' };
  }
  if (b.expected) return { status: 'failed', reason: 'Expected to be running but no process was found.' };
  return { status: 'follow_up', reason: 'State unknown.' };
}

async function fromPm2(now) {
  const out = await run('pm2', ['jlist']);
  if (!out) return [];
  let list = [];
  try {
    list = JSON.parse(out.slice(out.indexOf('[')));
  } catch {
    return [];
  }
  return list.map((p) => {
    const env = p.pm2_env || {};
    const st = env.status;
    const script = env.pm_exec_path;
    const log = tailLog(env.pm_out_log_path) || null;
    const errLog = tailLog(env.pm_err_log_path);
    const merged = mergeLogs(log, errLog);
    return {
      key: `pm2:${p.name}`,
      name: p.name,
      manager: 'pm2',
      state: st === 'online' ? 'running' : st === 'errored' ? 'crashed' : st === 'stopped' ? 'stopped' : st === 'launching' ? 'running' : 'unknown',
      exitCode: env.exit_code,
      restarts: env.restart_time || 0,
      recentRestart: env.pm_uptime && now - env.pm_uptime < 3600e3,
      pid: p.pid,
      startedAt: env.pm_uptime,
      cwd: env.pm_cwd,
      script,
      logFile: env.pm_out_log_path,
      log: merged,
      provider: detectProvider(p.name, script, scriptHead(script)),
      restart: ['pm2', 'restart', p.name],
      stop: ['pm2', 'stop', p.name],
    };
  });
}

function mergeLogs(a, b) {
  if (!a) return b;
  if (!b) return a;
  const newer = a.mtime >= b.mtime ? a : b;
  return { ...newer, lastError: b.lastError || a.lastError, errorIsLatest: newer.errorIsLatest };
}

function plistValue(xml, key) {
  const m = xml.match(new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`));
  return m ? m[1] : '';
}

function plistArgs(xml) {
  const m = xml.match(/<key>ProgramArguments<\/key>\s*<array>([\s\S]*?)<\/array>/);
  return m ? [...m[1].matchAll(/<string>([^<]*)<\/string>/g)].map((x) => x[1]) : [];
}

async function fromLaunchd() {
  if (process.platform !== 'darwin') return [];
  const dir = path.join(os.homedir(), 'Library', 'LaunchAgents');
  if (!exists(dir)) return [];
  const listed = new Map();
  const out = await run('launchctl', ['list']);
  for (const line of (out || '').split('\n').slice(1)) {
    const [pid, code, label] = line.trim().split(/\s+/);
    if (label) listed.set(label, { pid: pid === '-' ? null : Number(pid), code: Number(code) || 0 });
  }
  const uid = typeof process.getuid === 'function' ? process.getuid() : 501;
  const bots = [];
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.plist')) continue;
    let xml = '';
    try {
      xml = fs.readFileSync(path.join(dir, name), 'utf8');
    } catch {
      continue;
    }
    const label = plistValue(xml, 'Label') || name.replace(/\.plist$/, '');
    if (SYSTEM_LABEL.test(label)) continue;
    const args = plistArgs(xml);
    const program = plistValue(xml, 'Program') || args[0] || '';
    const script = args.find((a, i) => i > 0 && /\.(m?js|cjs|ts|py|sh|rb)$/.test(a)) || '';
    const logFile = plistValue(xml, 'StandardOutPath') || plistValue(xml, 'StandardErrorPath');
    const live = listed.get(label);
    const keepAlive = /<key>KeepAlive<\/key>\s*<true\/>/.test(xml) || /<key>KeepAlive<\/key>\s*<dict>/.test(xml);
    const interval = /<key>StartInterval<\/key>|<key>StartCalendarInterval<\/key>/.test(xml);
    let state = 'unknown';
    if (live && live.pid) state = 'running';
    else if (live && live.code !== 0) state = 'crashed';
    else if (live) state = interval ? 'idle' : 'stopped';
    else state = 'stopped';
    bots.push({
      key: `launchd:${label}`,
      name: label,
      manager: 'launchd',
      state: state === 'idle' ? 'running' : state,
      scheduled: interval,
      expected: keepAlive || interval ? true : undefined,
      exitCode: live ? live.code : undefined,
      pid: live && live.pid,
      cwd: plistValue(xml, 'WorkingDirectory'),
      script: script || program,
      logFile,
      log: logFile ? mergeLogs(tailLog(plistValue(xml, 'StandardOutPath')), tailLog(plistValue(xml, 'StandardErrorPath'))) : null,
      provider: detectProvider(label, args.join(' '), scriptHead(script)),
      restart: ['launchctl', 'kickstart', '-k', `gui/${uid}/${label}`],
      staleAfterMin: interval ? 24 * 60 : undefined,
    });
  }
  return bots;
}

async function fromDocker() {
  const out = await run('docker', ['ps', '-a', '--format', '{{json .}}'], 4000);
  if (!out) return [];
  return out
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .map((c) => {
      const exited = /^Exited \((\d+)\)/.exec(c.Status || '');
      return {
        key: `docker:${c.Names}`,
        name: c.Names,
        manager: 'docker',
        state: (c.State || '').toLowerCase() === 'running' ? 'running' : exited && exited[1] !== '0' ? 'crashed' : 'stopped',
        exitCode: exited ? Number(exited[1]) : undefined,
        restarting: /restarting/i.test(c.State || ''),
        provider: detectProvider(c.Names, c.Image, c.Command),
        script: c.Image,
        restart: ['docker', 'restart', c.Names],
      };
    });
}

/** `ps` scan: anything whose command line matches the bot keywords. */
export function parsePs(out, keywords = /grok|xai/i, selfPid = process.pid) {
  const rows = [];
  for (const line of String(out || '').split('\n')) {
    const m = line.trim().match(/^(\d+)\s+(\S+)\s+(.*)$/);
    if (!m) continue;
    const [, pid, etime, command] = m;
    if (Number(pid) === selfPid || !keywords.test(command)) continue;
    if (/\b(ps|grep|rg|mission-control|Electron Helper|Google Chrome|Safari)\b/.test(command)) continue;
    const script = command.split(/\s+/).find((a) => /\.(m?js|cjs|ts|py|sh|rb)$/.test(a)) || '';
    rows.push({ pid: Number(pid), etime, command, script, name: path.basename(script || command.split(/\s+/)[0]) });
  }
  return rows;
}

async function fromProcesses() {
  const keywords = new RegExp(process.env.MC_BOT_KEYWORDS || 'grok|xai', 'i');
  const out = await run('ps', ['-axo', 'pid=,etime=,command=']);
  return parsePs(out, keywords).map((p) => ({
    key: `proc:${p.script || p.command.slice(0, 80)}`,
    name: p.name,
    manager: 'process',
    state: 'running',
    pid: p.pid,
    script: p.script,
    provider: detectProvider(p.command, scriptHead(p.script)),
    restart: null,
  }));
}

async function checkHealth(url) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    return res.ok ? { ok: true } : { ok: false, error: `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, error: err.name === 'AbortError' ? 'timed out' : err.message };
  }
}

/** Apply a bots.json entry on top of a discovered bot (or create one from scratch). */
async function fromRegistryEntry(entry, discovered, psRows) {
  const match = discovered.find((d) => d.key === entry.match || d.name === entry.name || d.name === entry.match);
  const base = match ? { ...match } : { key: `registry:${entry.id || entry.name}`, name: entry.name, manager: 'registry', state: 'unknown' };
  if (!match && entry.process) {
    const re = new RegExp(entry.process, 'i');
    const hit = psRows.find((r) => re.test(r.command));
    base.state = hit ? 'running' : 'stopped';
    if (hit) base.pid = hit.pid;
  }
  if (entry.log) base.log = tailLog(entry.log.replace(/^~/, os.homedir()));
  if (entry.heartbeat) {
    const hb = tailLog(entry.heartbeat.replace(/^~/, os.homedir()));
    if (hb) base.log = base.log || hb;
    if (!entry.process && !match) base.state = hb ? 'running' : 'unknown';
  }
  if (entry.health) base.health = await checkHealth(entry.health);
  if (entry.health && !entry.process && !match) base.state = base.health.ok ? 'running' : 'crashed';
  return {
    ...base,
    name: entry.name || base.name,
    provider: entry.provider || base.provider,
    description: entry.description || '',
    expected: entry.expected !== undefined ? entry.expected : base.expected,
    staleAfterMin: entry.staleAfterMin || base.staleAfterMin,
    restart: entry.restart || base.restart,
    autoRestart: Boolean(entry.autoRestart),
    link: entry.link || '',
    registryId: entry.id || entry.name,
  };
}

export function providerInfo(idOrName) {
  const p = PROVIDERS.find((x) => x.id === idOrName);
  if (p) return p;
  return { id: idOrName || '', label: idOrName ? idOrName[0].toUpperCase() + idOrName.slice(1) : '', color: '#6b7280' };
}

export function botToJob(b, now = Date.now()) {
  const { status, reason } = botStatus(b, now);
  const prov = providerInfo(b.provider);
  return makeJob({
    id: `bot:${b.key}`,
    source: 'bot',
    title: b.name,
    status,
    reason,
    cwd: b.cwd || '',
    startedAt: b.startedAt,
    lastActivity: b.log ? b.log.mtime : status === 'working' ? now : b.startedAt,
    lastMessage: b.log ? b.log.lines.slice(-12).join('\n') : b.description || '',
    resumeCommand: b.restart ? b.restart.join(' ') : '',
    link: b.link || '',
    alive: b.state === 'running',
    meta: {
      provider: prov.id,
      providerLabel: prov.label,
      providerColor: prov.color,
      manager: b.manager,
      pid: b.pid || null,
      script: b.script || '',
      logFile: b.logFile || '',
      restart: b.restart || null,
      autoRestart: Boolean(b.autoRestart),
      restarts: b.restarts || 0,
      lastError: b.log ? b.log.lastError : '',
      registryId: b.registryId || '',
    },
    tags: ['bot', b.manager, prov.id].filter(Boolean),
  });
}

export async function discover() {
  const [pm2, launchd, docker, procs, psOut] = await Promise.all([fromPm2(Date.now()), fromLaunchd(), fromDocker(), fromProcesses(), run('ps', ['-axo', 'pid=,etime=,command='])]);
  const managed = [...pm2, ...launchd, ...docker];
  // A process already owned by pm2/launchd/docker is not listed twice.
  const managedPids = new Set(managed.map((b) => b.pid).filter(Boolean));
  const managedScripts = new Set(managed.map((b) => b.script).filter(Boolean));
  const loose = procs.filter((p) => !managedPids.has(p.pid) && !managedScripts.has(p.script));
  const discovered = [...managed, ...loose];
  const psRows = parsePs(psOut, /./);
  const registry = loadRegistry();
  const merged = [];
  const used = new Set();
  for (const entry of registry) {
    if (entry.hidden) {
      const hit = discovered.find((d) => d.key === entry.match || d.name === entry.name);
      if (hit) used.add(hit.key);
      continue;
    }
    const bot = await fromRegistryEntry(entry, discovered, psRows);
    used.add(bot.key);
    merged.push(bot);
  }
  // Discovered launchd/docker entries with no AI provider and no registry entry are
  // usually unrelated apps; keep pm2 and process-scan hits, which are almost always bots.
  for (const d of discovered) {
    if (used.has(d.key)) continue;
    if ((d.manager === 'launchd' || d.manager === 'docker') && !d.provider && process.env.MC_BOTS_ALL !== '1') continue;
    merged.push(d);
  }
  return merged;
}

export async function collect({ now = Date.now() } = {}) {
  const bots = await discover();
  return bots.map((b) => botToJob(b, now));
}
