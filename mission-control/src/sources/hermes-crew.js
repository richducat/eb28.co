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
  const m = String(text).match(new RegExp(`^\\s*${key}:\\s*(?:"([^"]*)"|(.+?))\\s*$`, 'm'));
  return m ? (m[1] ?? m[2]).trim() : '';
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
      title: yamlField(yaml, 'title') || name,
      description: yamlField(yaml, 'description'),
      lastActive: lastActive ? new Date(lastActive).toISOString() : null,
      busy: Boolean(lastActive) && now - lastActive < 3 * 60e3,
    };
  });
}
