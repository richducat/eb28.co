import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Hermes profiles (~/.hermes/profiles/<name>) are a standing crew of specialist agents.
 * Each gets a title from profile.yaml and a "last active" time from its newest log file.
 */
export function crewDir() {
  return process.env.MC_HERMES_PROFILES || path.join(os.homedir(), '.hermes', 'profiles');
}

function newestMtime(dir) {
  let best = 0;
  try {
    for (const name of fs.readdirSync(dir)) {
      try {
        const st = fs.statSync(path.join(dir, name));
        if (st.isFile() && st.mtimeMs > best) best = st.mtimeMs;
      } catch {
        /* vanished */
      }
    }
  } catch {
    /* no dir */
  }
  return best;
}

export function yamlField(text, key) {
  const lines = String(text).split('\n');
  const i = lines.findIndex((l) => new RegExp(`^(\\s*)${key}:\\s*`).test(l));
  if (i < 0) return '';
  const indent = lines[i].match(/^\s*/)[0].length;
  const first = lines[i].replace(new RegExp(`^\\s*${key}:\\s*`), '');
  if (/^"/.test(first)) return (first.match(/^"([^"]*)"/) || [, ''])[1].trim();
  // plain scalars may continue on more-indented lines
  const parts = [first];
  for (let k = i + 1; k < lines.length; k += 1) {
    const l = lines[k];
    if (!l.trim() || l.match(/^\s*/)[0].length <= indent || /^\s*[\w-]+:\s/.test(l)) break;
    parts.push(l.trim());
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function listCrew({ dir = crewDir(), now = Date.now() } = {}) {
  let names = [];
  try {
    names = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
    return [];
  }
  return names.sort().map((name) => {
    const base = path.join(dir, name);
    let yaml = '';
    try {
      yaml = fs.readFileSync(path.join(base, 'profile.yaml'), 'utf8');
    } catch {
      /* optional */
    }
    const lastActive = Math.max(newestMtime(path.join(base, 'logs')), newestMtime(path.join(base, 'sessions')));
    return {
      id: `crew:${name}`,
      name,
      dir: base,
      title: yamlField(yaml, 'title') || name,
      description: yamlField(yaml, 'description'),
      lastActive: lastActive ? new Date(lastActive).toISOString() : null,
      busy: Boolean(lastActive) && now - lastActive < 3 * 60e3,
    };
  });
}
