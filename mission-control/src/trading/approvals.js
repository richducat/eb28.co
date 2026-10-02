import { store } from '../store.js';

/**
 * Trading approvals queue. Approving ONLY records Richard's decision; the owning project
 * (or Richard) carries out the change. Mission Control never places orders or moves funds.
 */
export const RISKY = /\b(live|transfer|withdraw|send|unpause|raise|increase|enable real|real trading|cap)\b/i;
export const phraseFor = (a) => `I APPROVE ${a.project} ${a.change}`.toUpperCase();

export function list() {
  return store.get('trading-approvals', []).slice(-100).reverse();
}

export function request({ project, change, requestedBy = 'Richard', risk = '' }) {
  if (!project || !change) throw new Error('project and change are required');
  const entry = { id: `ta:${Date.now()}`, project: String(project).slice(0, 60), change: String(change).slice(0, 200), requestedBy: String(requestedBy).slice(0, 60), risk: String(risk).slice(0, 200), at: new Date().toISOString(), decision: 'pending' };
  store.append('trading-approvals', entry, 300);
  return entry;
}

/** Record a decision. Risky approvals need Touch ID (confirmOwner) and the typed phrase. */
export async function decide({ id, decision, phrase = '' }, { confirmOwner } = {}) {
  const all = store.get('trading-approvals', []);
  const a = all.find((x) => x.id === id);
  if (!a) throw new Error('approval not found');
  if (a.decision !== 'pending') throw new Error('already decided');
  if (!['approved', 'denied'].includes(decision)) throw new Error('decision must be approved or denied');
  let confirmMethod = 'none';
  if (decision === 'approved' && RISKY.test(a.change)) {
    if (!confirmOwner) throw new Error('This approval needs Touch ID, which only works in the desktop app.');
    if (String(phrase).trim().toUpperCase() !== phraseFor(a)) throw new Error(`Type exactly: ${phraseFor(a)}`);
    await confirmOwner(`approve "${a.change}" for ${a.project}`);
    confirmMethod = 'touchid';
  }
  store.update('trading-approvals', [], (list) => list.map((x) => (x.id === id ? { ...x, decision, decidedAt: new Date().toISOString(), confirmMethod } : x)));
  return { ...a, decision, confirmMethod };
}
