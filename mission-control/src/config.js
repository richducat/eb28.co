import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const APP_ROOT = path.resolve(HERE, '..');
export const HOME = os.homedir();

/** Where Mission Control keeps its own state (overrides, notes, agent runs, digests). */
export const MC_HOME = process.env.MC_HOME || path.join(HOME, '.eb28-mission-control');

export const PORT = Number(process.env.MC_PORT || 47831);
export const HOST = '127.0.0.1';

/** Repo roots the workforce is allowed to run allow-listed commands in. */
export function repoRoots() {
  const fromEnv = (process.env.MC_REPOS || '')
    .split(path.delimiter)
    .map((s) => s.trim())
    .filter(Boolean);
  const defaults = [path.resolve(APP_ROOT, '..')];
  const all = [...fromEnv, ...defaults].filter((p, i, arr) => arr.indexOf(p) === i);
  return all.filter((p) => fs.existsSync(p));
}

export const PATHS = {
  claudeProjects: process.env.MC_CLAUDE_DIR || path.join(HOME, '.claude', 'projects'),
  claudeSessions: process.env.MC_CLAUDE_SESSIONS || path.join(HOME, '.claude', 'sessions'),
  codexSessions: process.env.MC_CODEX_DIR || path.join(HOME, '.codex', 'sessions'),
  geminiTmp: process.env.MC_GEMINI_DIR || path.join(HOME, '.gemini', 'tmp'),
  openclawHome: process.env.MC_OPENCLAW_HOME || path.join(HOME, '.openclaw'),
  hermesOpenLoops:
    process.env.OPEN_LOOPS_PATH ||
    path.join(HOME, '.hermes', 'personal-assistant', 'working-context', 'OPEN_LOOPS.md'),
};

/** Timing thresholds (ms). */
export const T = {
  workingWindow: 3 * 60 * 1000, // file touched within this => actively working
  permissionWait: 90 * 1000, // tool_use with no result for this long while alive => waiting on you
  followUpAfter: 6 * 60 * 60 * 1000, // silent this long while unfinished => follow up
  staleAfter: 3 * 24 * 60 * 60 * 1000, // ignore finished jobs older than this in the main board
  hideDoneAfter: 7 * 24 * 60 * 60 * 1000,
};

export function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
  return p;
}
