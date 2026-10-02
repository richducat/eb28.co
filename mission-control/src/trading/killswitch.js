import { loadConfig, saveKillSwitch } from './config.js';
import { store } from '../store.js';

/**
 * Kill switches. Mission Control has a master switch (trading.killSwitch, default ON).
 * Engaging is always one click. Disengaging needs Touch ID AND a typed phrase, and is
 * refused entirely outside the desktop app. Every project's own switch is aggregated;
 * "unknown" is treated as unsafe.
 */
export const DISENGAGE_PHRASE = 'DISENGAGE KILL SWITCH';

export function master() {
  return loadConfig().killSwitch !== false;
}

export function engage(reason = 'manual') {
  saveKillSwitch(true);
  store.append('trading-alerts', { at: new Date().toISOString(), kind: 'killswitch', level: 'info', text: `Master kill switch ENGAGED (${reason}).` }, 500);
  return true;
}

export async function disengage({ phrase = '' } = {}, { confirmOwner } = {}) {
  if (!confirmOwner) throw new Error('Disengaging needs Touch ID, which only works in the desktop app.');
  if (String(phrase).trim().toUpperCase() !== DISENGAGE_PHRASE) throw new Error(`Type exactly: ${DISENGAGE_PHRASE}`);
  await confirmOwner('disengage the Mission Control trading kill switch');
  saveKillSwitch(false);
  store.append('trading-alerts', { at: new Date().toISOString(), kind: 'killswitch', level: 'warn', text: 'Master kill switch DISENGAGED with Touch ID.' }, 500);
  return false;
}

/** project rows: { id, name, state: 'safe'|'unsafe'|'unknown', detail } */
export function summarize(projects) {
  const unsafe = projects.filter((p) => p.state !== 'safe');
  return { master: master(), projects, allSafe: master() && unsafe.length === 0, unsafeCount: unsafe.length };
}
