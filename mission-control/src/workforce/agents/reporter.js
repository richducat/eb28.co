import { ask } from '../llm.js';
import { ago } from '../../jobs/model.js';

export const id = 'reporter';
export const name = 'Reporter';
export const role = 'Writes the morning and end-of-day briefing: what needs you, what shipped, what stalled, what the workforce ran.';
export const tier = 'observe';
export const clock = [{ hour: 8, minute: 0 }, { hour: 17, minute: 0 }];

export async function run(ctx) {
  const { board, store, now, registry } = ctx;
  const jobs = board.columns.flatMap((c) => c.jobs);
  const by = (s) => jobs.filter((j) => j.status === s);
  const runs = store.get('automation-runs', []).filter((r) => now - Date.parse(r.startedAt) < 24 * 3600e3);
  const proposals = store.get('proposals', []).filter((p) => p.status === 'pending');

  const lines = [];
  lines.push(`# Briefing — ${new Date(now).toLocaleString()}`);
  lines.push('');
  lines.push(`**${by('needs_you').length} need you · ${by('working').length} working · ${by('follow_up').length} to follow up · ${by('done').length} done · ${by('failed').length} failed**`);
  const section = (title, list, fmt) => {
    lines.push('', `## ${title}`);
    if (!list.length) lines.push('_Nothing here._');
    for (const item of list) lines.push(`- ${fmt(item)}`);
  };
  section('Needs you', by('needs_you'), (j) => `**${j.title}** (${j.source}, ${ago(j.lastActivity, now)}) — ${j.reason}`);
  section('Failed', by('failed'), (j) => `**${j.title}** — ${j.reason}`);
  section('Follow up', by('follow_up'), (j) => `**${j.title}** (${ago(j.lastActivity, now)}) — ${j.reason}`);
  section('Working now', by('working'), (j) => `${j.title} (${j.source})`);
  section('Done recently', by('done').slice(0, 15), (j) => `${j.title} (${j.source}, ${ago(j.lastActivity, now)})`);
  section('Workforce ran in the last 24h', runs, (r) => `${r.ok ? '✅' : r.status === 'running' ? '⏳' : '❌'} ${r.title || r.automationId} (${r.trigger}, ${ago(r.startedAt, now)})`);
  section('Waiting for your approval', proposals, (p) => `**${p.title}** — ${p.description}`);
  const disabled = registry.filter((a) => a.tier === 'approval' && !a.autoApproved);
  if (disabled.length) {
    lines.push('', `## Could be automated with one approval`, ...disabled.map((a) => `- ${a.title}: ${a.description}`));
  }
  const template = lines.join('\n');

  const prose = await ask({
    key: `brief:${new Date(now).toISOString().slice(0, 13)}`,
    system: 'You are the chief of staff for a solo founder who runs many AI coding agents and business automations. Write a calm, concrete briefing in Markdown. Lead with the 3 things that most need his attention today and why. Keep it under 250 words. Do not invent anything not in the data.',
    prompt: `Here is the raw status board:\n\n${template}`,
    maxTokens: 900,
    effort: 'medium',
  });

  const digest = { generatedAt: new Date(now).toISOString(), markdown: prose ? `${prose}\n\n---\n\n${template}` : template };
  store.update('digests', [], (list) => [digest, ...list].slice(0, 30));
  return { summary: `Briefing written (${prose ? 'with Claude' : 'template only'}).` };
}
