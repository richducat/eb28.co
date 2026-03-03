import fs from 'node:fs';
import path from 'node:path';

export function readFeed() {
  const p = path.join(process.cwd(), 'public', 'data', 'tyfys-feed.json');
  const raw = fs.readFileSync(p, 'utf8');
  return JSON.parse(raw);
}
