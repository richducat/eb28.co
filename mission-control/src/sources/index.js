import * as claudeCode from './claude-code.js';
import * as codex from './codex.js';
import * as gemini from './gemini.js';
import * as openclaw from './openclaw.js';
import * as hermes from './hermes.js';
import * as github from './github.js';
import * as manual from './manual.js';
import * as automationRuns from './automation-runs.js';
import * as bots from './bots.js';
import * as handoff from './hermes-handoff.js';
import * as cos from '../cos.js';
import * as trading from './trading.js';

export const SOURCE_MODULES = [claudeCode, codex, gemini, openclaw, hermes, github, manual, automationRuns, bots, handoff, cos, trading];

/**
 * Run every source, isolating failures so one broken tool never blanks the board.
 * @returns {Promise<{jobs: object[], errors: {source:string, error:string}[], timings: object}>}
 */
export async function collectAll({ now = Date.now(), only } = {}) {
  const jobs = [];
  const errors = [];
  const timings = {};
  await Promise.all(
    SOURCE_MODULES.filter((m) => !only || only.includes(m.id)).map(async (mod) => {
      const started = Date.now();
      try {
        const found = await mod.collect({ now });
        jobs.push(...found);
      } catch (err) {
        errors.push({ source: mod.id, error: err && err.message ? err.message : String(err) });
      }
      timings[mod.id] = Date.now() - started;
    }),
  );
  return { jobs, errors, timings };
}
