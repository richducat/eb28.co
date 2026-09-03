import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

/**
 * GUI apps on macOS (and some Linux launchers) start with a bare PATH such as
 * /usr/bin:/bin, so `npm`, `node`, `claude`, `codex`, `openclaw` are all "not found".
 * Ask the user's login shell for its PATH once, merge in the usual tool locations,
 * and install the result into process.env.PATH.
 */
const HOME = os.homedir();
const COMMON = [
  '/opt/homebrew/bin',
  '/opt/homebrew/sbin',
  '/usr/local/bin',
  '/usr/local/sbin',
  path.join(HOME, '.local', 'bin'),
  path.join(HOME, '.volta', 'bin'),
  path.join(HOME, '.bun', 'bin'),
  path.join(HOME, '.cargo', 'bin'),
  path.join(HOME, '.claude', 'local', 'bin'),
  path.join(HOME, 'bin'),
  '/usr/bin',
  '/bin',
  '/usr/sbin',
  '/sbin',
];

function nvmBins() {
  const root = path.join(HOME, '.nvm', 'versions', 'node');
  try {
    return fs
      .readdirSync(root)
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
      .map((v) => path.join(root, v, 'bin'));
  } catch {
    return [];
  }
}

function shellPath() {
  if (process.platform === 'win32') return '';
  const shell = process.env.SHELL || '/bin/zsh';
  try {
    const res = spawnSync(shell, ['-ilc', 'printf "__MC__%s__MC__" "$PATH"'], { encoding: 'utf8', timeout: 5000, env: { ...process.env, TERM: 'dumb' } });
    const m = String(res.stdout || '').match(/__MC__(.*?)__MC__/s);
    return m ? m[1] : '';
  } catch {
    return '';
  }
}

let fixed = false;
export function fixPath() {
  if (fixed) return process.env.PATH;
  fixed = true;
  const sep = path.delimiter;
  const parts = [...(process.env.PATH || '').split(sep), ...shellPath().split(sep), ...nvmBins(), ...COMMON]
    .map((p) => p.trim())
    .filter((p, i, arr) => p && arr.indexOf(p) === i && fs.existsSync(p));
  process.env.PATH = parts.join(sep);
  return process.env.PATH;
}

/** Resolve an executable name to an absolute path using the (fixed) PATH. */
export function which(cmd) {
  if (!cmd) return null;
  if (cmd.includes('/') || cmd.includes('\\')) return fs.existsSync(cmd) ? cmd : null;
  const exts = process.platform === 'win32' ? ['.cmd', '.exe', '.bat', ''] : [''];
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    for (const ext of exts) {
      const full = path.join(dir, cmd + ext);
      try {
        fs.accessSync(full, fs.constants.X_OK);
        return full;
      } catch {
        /* next */
      }
    }
  }
  return null;
}

fixPath();
