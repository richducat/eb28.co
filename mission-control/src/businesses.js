import fs from 'node:fs';
import path from 'node:path';
import { MC_HOME } from './config.js';

/**
 * Which business a job belongs to. Matched against the job's folder, title, Hermes
 * profile and tags. Richard can add or reorder businesses in ~/.eb28-mission-control/
 * businesses.json (same shape as DEFAULTS); a per-job override wins over both.
 */
export const DEFAULTS = [
  { id: 'tyfys', name: 'TYFYS', full: 'Thank You For Your Service', color: '#c8102e', match: ['tyfys', 'thank ?you ?for ?your ?service', 'veteran', '\\bva\\b', 'buddy statement', 'zoho', 'ringcentral', 'upwork'] },
  { id: 'eb28', name: 'EB28', full: 'EB28 studio', color: '#2d9c67', match: ['eb28', 'mission-control', 'growth hosting', '32940', 'social-publisher', 'fundmanager', 'buffer'] },
  { id: 'inspection', name: 'Inspection Rent', full: 'Inspection Rent / HIP', color: '#2f6fdb', match: ['inspection', 'insprent', '\\bhip-', 'home-inspection'] },
  { id: 'syncstep', name: 'SyncStep', full: 'SyncStep', color: '#8b5cf6', match: ['sync+step', 'syncc'] },
  { id: 'apps', name: 'Apps', full: 'Other apps', color: '#f59e0b', match: ['labstudio', 'snapgrid', 'parentpath', 'cadetcatch', 'microfit', 'teslaware', 'cosmicchat', 'solana'] },
];
export const OTHER = { id: 'other', name: 'Other', full: 'Everything else', color: '#6b7280', match: [] };

export function loadBusinesses() {
  try {
    const list = JSON.parse(fs.readFileSync(path.join(MC_HOME, 'businesses.json'), 'utf8'));
    if (Array.isArray(list) && list.length) return list;
  } catch {
    /* defaults */
  }
  return DEFAULTS;
}

const compiled = new WeakMap();
function regexFor(b) {
  if (!compiled.has(b)) compiled.set(b, b.match.length ? new RegExp(b.match.join('|'), 'i') : null);
  return compiled.get(b);
}

export function businessOf(job, list = loadBusinesses()) {
  if (job.business && list.some((b) => b.id === job.business)) return job.business;
  const hay = [job.cwd, job.project, job.title, job.meta && job.meta.section, job.meta && job.meta.script, ...(job.tags || [])].filter(Boolean).join(' \n ');
  for (const b of list) {
    const re = regexFor(b);
    if (re && re.test(hay)) return b.id;
  }
  return OTHER.id;
}

/**
 * What kind of action a "needs you" job is asking for, so the queue can say it plainly:
 * approve (a permission or tool approval), answer (a question), fix (an error),
 * review (finished or idle, take a look).
 */
export function askOf(job) {
  if (job.status === 'failed') return 'fix';
  if (job.status !== 'needs_you') return '';
  const r = `${job.reason || ''} ${(job.meta && job.meta.activity && job.meta.activity.label) || ''}`;
  if (/approv|permission|allow/i.test(r)) return 'approve';
  if (/error|crash|fail|down/i.test(r)) return 'fix';
  if (/asked|question|waiting for your answer/i.test(r)) return 'answer';
  return 'review';
}
