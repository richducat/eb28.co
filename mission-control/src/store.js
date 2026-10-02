import fs from 'node:fs';
import path from 'node:path';
import { MC_HOME, ensureDir } from './config.js';

/**
 * Tiny JSON-file store. Each named collection lives in <MC_HOME>/<name>.json.
 * Writes are atomic (temp file + rename) so a crash never leaves a half file.
 */
export class Store {
  constructor(root = MC_HOME) {
    this.root = ensureDir(root);
    this.cache = new Map();
  }

  file(name) {
    return path.join(this.root, `${name}.json`);
  }

  /** File modification time, or 0 if it doesn't exist. */
  mtime(name) {
    try { return fs.statSync(this.file(name)).mtimeMs; } catch { return 0; }
  }

  get(name, fallback) {
    // cached, unless another process (CLI run, second instance) has written the file since
    const hit = this.cache.get(name);
    if (hit && hit.mtime === this.mtime(name)) return hit.value;
    let value = fallback;
    try {
      value = JSON.parse(fs.readFileSync(this.file(name), 'utf8'));
    } catch {
      value = typeof fallback === 'function' ? fallback() : fallback;
    }
    this.cache.set(name, { value, mtime: this.mtime(name) });
    return value;
  }

  set(name, value) {
    const target = this.file(name);
    const tmp = `${target}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
    fs.renameSync(tmp, target);
    this.cache.set(name, { value, mtime: this.mtime(name) });
    return value;
  }

  update(name, fallback, fn) {
    const next = fn(this.get(name, fallback));
    return this.set(name, next);
  }

  /** Append to a capped log collection. */
  append(name, entry, cap = 500) {
    return this.update(name, [], (list) => {
      const next = [...list, { at: new Date().toISOString(), ...entry }];
      return next.length > cap ? next.slice(next.length - cap) : next;
    });
  }
}

export const store = new Store();
