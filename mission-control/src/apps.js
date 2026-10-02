import fs from 'node:fs';
import path from 'node:path';
import { MC_HOME } from './config.js';

/**
 * Richard's apps. Each becomes a ride in the Arcade's Fun Park, and any job whose folder or
 * title matches an app rides it. Override or extend in ~/.eb28-mission-control/apps.json
 * (same shape as DEFAULTS).
 */
export const DEFAULTS = [
  { id: 'tyfys-app', name: 'TYFYS APP', color: '#c8102e', match: ['tyfys app', 'tyfys-benefits', 'va doc', 'app\\.tyfys'] },
  { id: 'labstudio', name: 'LABSTUDIO', color: '#ff7a3c', match: ['lab ?studio'] },
  { id: 'snapgrid', name: 'SNAPGRID', color: '#4ab8ff', match: ['snap ?grid'] },
  { id: 'parentpath', name: 'PARENTPATH', color: '#7ad07a', match: ['parent ?path'] },
  { id: 'cadetcatch', name: 'CADETCATCH', color: '#3a5ad0', match: ['cadet ?catch'] },
  { id: 'syncstep', name: 'SYNCSTEP', color: '#8b5cf6', match: ['sync+ ?step', 'syncc'] },
  { id: 'microfit', name: 'MICROFIT', color: '#22c3a0', match: ['micro ?fit'] },
  { id: 'teslahelper', name: 'TESLAHELPER', color: '#e03a3a', match: ['tesla ?helper', 'teslaware'] },
  { id: 'cosmicchat', name: 'COSMICCHAT', color: '#a070ff', match: ['cosmic ?chat', 'cosmic coach'] },
  { id: 'inspection', name: 'INSPECTION RENT', color: '#2f6fdb', match: ['inspection', 'insprent', '\\bhip-', 'home-inspection'] },
  { id: 'techkombat', name: 'TECH KOMBAT', color: '#ffb43c', match: ['tech ?kombat'] },
  { id: 'contentfactory', name: 'CONTENT FACTORY', color: '#ff5ab0', match: ['content ?factory', 'social-engine', 'social-publish'] },
  { id: 'daytrading', name: 'DAY TRADING BOT', color: '#2d9c67', match: ['day ?trading', 'fund ?manager', 'trading ?bot'] },
];

export function loadApps() {
  try {
    const list = JSON.parse(fs.readFileSync(path.join(MC_HOME, 'apps.json'), 'utf8'));
    if (Array.isArray(list) && list.length) return list;
  } catch {
    /* defaults */
  }
  return DEFAULTS;
}

const compiled = new WeakMap();
export function appOf(job, list = loadApps()) {
  const hay = [job.cwd, job.project, job.title, job.meta && job.meta.script, ...(job.tags || [])].filter(Boolean).join(' \n ');
  for (const a of list) {
    if (!compiled.has(a)) compiled.set(a, new RegExp(a.match.join('|'), 'i'));
    if (compiled.get(a).test(hay)) return a.id;
  }
  return '';
}
