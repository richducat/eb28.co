import fs from 'node:fs';
import path from 'node:path';
import { repoRoots } from '../../config.js';

export const id = 'automation-scout';
export const name = 'Automation Scout';
export const role = 'Reads package scripts, GitHub workflows, and cron jobs, and proposes what else could be automated, with a risk tier for each.';
export const tier = 'propose';
export const clock = [{ hour: 9, minute: 15 }];

const RISKY = /(send|publish|deploy|push|pay|charge|email|sms|post|submit|delete|purge|live)/i;
const WRITES = /(generate|build|write|sync|record|export|prepare|create|update|refresh)/i;

/** Pure classifier so it can be tested. */
export function classifyScript(name, command = '') {
  const text = `${name} ${command}`;
  if (RISKY.test(text)) return 'manual';
  if (WRITES.test(text)) return 'approval';
  if (/^(check|verify|test|lint|validate|audit|dry-run)/.test(name) || /--dry-run|--verify|--preflight/.test(command)) return 'safe';
  return 'approval';
}

export async function run(ctx) {
  const { store, registry } = ctx;
  const known = new Set(registry.map((a) => a.command.join(' ')));
  const proposals = [];
  for (const root of repoRoots()) {
    let pkg;
    try {
      pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    } catch {
      continue;
    }
    for (const [name, command] of Object.entries(pkg.scripts || {})) {
      if (['dev', 'preview', 'start', 'test'].includes(name)) continue;
      const argv = ['npm', 'run', '--silent', name];
      if (known.has(argv.join(' '))) continue;
      proposals.push({
        id: `scout:${path.basename(root)}:${name}`,
        kind: 'add-automation',
        title: `Track "${name}" as an automation`,
        description: `${command}`,
        suggestedTier: classifyScript(name, command),
        automation: { id: `script:${name.replace(/[^a-z0-9:_-]/gi, '-')}`, title: name, description: command, command: argv, tier: classifyScript(name, command), area: path.basename(root) },
      });
    }
  }
  store.set('scout-findings', { generatedAt: new Date().toISOString(), proposals });
  return { summary: `${proposals.length} scripts not yet in the registry (${proposals.filter((p) => p.suggestedTier === 'safe').length} look safe to run unattended).` };
}
