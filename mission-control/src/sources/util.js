import fs from 'node:fs';
import path from 'node:path';

/** Read the first `bytes` of a file and return parsed JSONL records (skipping the last partial line). */
export function readHeadJsonl(file, bytes = 96 * 1024) {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    const len = Math.min(bytes, size);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, 0);
    let text = buf.toString('utf8');
    if (len < size) text = text.slice(0, text.lastIndexOf('\n'));
    return parseLines(text);
  } finally {
    fs.closeSync(fd);
  }
}

/** Read the last `bytes` of a file and return parsed JSONL records (skipping the first partial line). */
export function readTailJsonl(file, bytes = 512 * 1024) {
  const fd = fs.openSync(file, 'r');
  try {
    const size = fs.fstatSync(fd).size;
    const len = Math.min(bytes, size);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, size - len);
    let text = buf.toString('utf8');
    if (len < size) text = text.slice(text.indexOf('\n') + 1);
    return parseLines(text);
  } finally {
    fs.closeSync(fd);
  }
}

export function parseLines(text) {
  const out = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      out.push(JSON.parse(trimmed));
    } catch {
      /* skip corrupt line */
    }
  }
  return out;
}

/** Recursively list files matching a predicate, newest first, bounded. */
export function walk(dir, predicate, { limit = 400, maxDepth = 6 } = {}) {
  const found = [];
  const visit = (d, depth) => {
    if (depth > maxDepth) return;
    let entries = [];
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) visit(full, depth + 1);
      else if (predicate(full)) {
        try {
          found.push({ file: full, mtime: fs.statSync(full).mtimeMs });
        } catch {
          /* vanished */
        }
      }
    }
  };
  visit(dir, 0);
  found.sort((a, b) => b.mtime - a.mtime);
  return found.slice(0, limit);
}

export function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

/** Extract plain text from a message content that may be a string or content-block array. */
export function textOf(content) {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((b) => {
        if (!b) return '';
        if (typeof b === 'string') return b;
        if (b.type === 'text' || b.type === 'input_text' || b.type === 'output_text') return b.text || '';
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  if (typeof content === 'object' && content.text) return content.text;
  return '';
}

export function hasBlock(content, type) {
  return Array.isArray(content) && content.some((b) => b && b.type === type);
}
