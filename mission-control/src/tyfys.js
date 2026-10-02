import fs from 'node:fs';
import path from 'node:path';
import { MC_HOME } from './config.js';

/**
 * TYFYS operations: the Zoho CRM deal pipeline, read from a local snapshot
 * (~/.eb28-mission-control/tyfys-pipeline.json, initials only, no veteran details).
 * Stages are grouped into lanes, and each case gets an amber/red flag when it has gone
 * too long without an update for its stage.
 */
export const LANES = [
  { id: 'onboarding', name: 'Onboarding', stages: ['Welcome', 'Contract Signed'], amber: 3, red: 7 },
  { id: 'intake', name: 'Intake', stages: ['Intake', 'Intake (Document Collection)'], amber: 7, red: 21 },
  { id: 'evaluation', name: 'Evaluation', stages: ['Evaluation'], amber: 14, red: 30 },
  { id: 'provider', name: 'Provider / DBQs', stages: ['Prepare for Provider', 'Sent to Provider', 'Awaiting DBQS'], amber: 21, red: 45 },
  { id: 'claim', name: 'Claim', stages: ['Claim Validation'], amber: 21, red: 45 },
  { id: 'appeal', name: 'Appeal', stages: ['IN APPEAL'], amber: 30, red: 60 },
  { id: 'stalled', name: 'Stalled', stages: ['Service Paused', '30 days non response'], amber: 14, red: 30 },
];
export const WON = ['Payment complete', 'Service Complete', 'Closed Won'];
export const LOST = ['Lost'];

export const snapshotFile = () => process.env.MC_TYFYS_SNAPSHOT || path.join(MC_HOME, 'tyfys-pipeline.json');

/** Turn a snapshot into lanes, flags and KPIs. Pure; exported for tests. */
export function summarize(snap, now = Date.now()) {
  const cases = (snap.cases || []).filter((c) => !c.test);
  const lanes = LANES.map((l) => {
    const list = cases
      .filter((c) => l.stages.includes(c.stage))
      .map((c) => {
        const days = Math.floor((now - Date.parse(c.updatedAt)) / 86400e3);
        return { ...c, days, flag: days >= l.red ? 'red' : days >= l.amber ? 'amber' : '' };
      })
      .sort((a, b) => b.days - a.days);
    return { id: l.id, name: l.name, stages: l.stages, amber: l.amber, red: l.red, cases: list, redCount: list.filter((c) => c.flag === 'red').length, amberCount: list.filter((c) => c.flag === 'amber').length };
  });
  const counts = snap.stageCounts || {};
  const won = WON.reduce((n, s) => n + (counts[s] || 0), 0);
  const lost = LOST.reduce((n, s) => n + (counts[s] || 0), 0);
  const active = lanes.filter((l) => l.id !== 'stalled').reduce((n, l) => n + l.cases.length, 0);
  const owners = {};
  for (const l of lanes) for (const c of l.cases) owners[c.owner] = (owners[c.owner] || 0) + 1;
  return {
    fetchedAt: snap.fetchedAt,
    source: snap.source,
    kpis: {
      active,
      stalled: lanes.find((l) => l.id === 'stalled').cases.length,
      overdue: lanes.reduce((n, l) => n + l.redCount, 0),
      inAppeal: lanes.find((l) => l.id === 'appeal').cases.length,
      newThisMonth: cases.filter((c) => now - Date.parse(c.createdAt) < 30 * 86400e3).length,
      won,
      lost,
      winRate: won + lost ? Math.round((won / (won + lost)) * 100) : null,
    },
    lanes,
    owners: Object.entries(owners).sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, n })),
  };
}

export function tyfysPipeline(now = Date.now()) {
  let snap;
  try {
    snap = JSON.parse(fs.readFileSync(snapshotFile(), 'utf8'));
  } catch {
    return { ok: false, reason: 'No TYFYS pipeline snapshot yet.' };
  }
  return { ok: true, ...summarize(snap, now) };
}
