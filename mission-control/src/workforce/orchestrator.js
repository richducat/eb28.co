import { EventEmitter } from 'node:events';
import { buildBoard } from '../board.js';
import { store } from '../store.js';
import { loadRegistry, runAutomation, setAutomationState } from './automations.js';
import { available as llmAvailable, MODEL } from './llm.js';
import * as triage from './agents/triage.js';
import * as followUp from './agents/follow-up.js';
import * as reporter from './agents/reporter.js';
import * as scout from './agents/automation-scout.js';
import * as opsRunner from './agents/ops-runner.js';
import * as prSteward from './agents/pr-steward.js';
import * as janitor from './agents/janitor.js';

export const AGENTS = [triage, opsRunner, followUp, prSteward, reporter, scout, janitor];

/**
 * The workforce: a single in-process scheduler that wakes every `tick` ms, rebuilds the
 * board once, then hands it to every agent that is due. Agents are plain modules with
 * `run(ctx)`; they read and write the shared store and emit events for the UI.
 */
export class Orchestrator extends EventEmitter {
  constructor({ tick = 60 * 1000 } = {}) {
    super();
    this.tick = tick;
    this.timer = null;
    this.board = null;
    this.running = new Set();
    this.paused = store.get('workforce-settings', { paused: false }).paused;
  }

  emitEvent(event) {
    this.emit('event', { at: new Date().toISOString(), ...event });
  }

  async refreshBoard() {
    this.board = await buildBoard();
    this.emitEvent({ type: 'board:refresh', summary: this.board.summary });
    return this.board;
  }

  agentState(id) {
    return store.get('agent-state', {})[id] || {};
  }

  isDue(agent, now) {
    const state = this.agentState(agent.id);
    if (state.enabled === false) return false;
    const last = state.lastRunAt ? Date.parse(state.lastRunAt) : 0;
    if (agent.every) return now - last >= agent.every;
    if (agent.clock) {
      const d = new Date(now);
      return agent.clock.some(({ hour, minute }) => {
        const slot = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, minute).getTime();
        return now >= slot && last < slot;
      });
    }
    return false;
  }

  async runAgent(agent, { force = false, now = Date.now() } = {}) {
    if (this.running.has(agent.id)) return { skipped: 'already running' };
    if (!force && this.paused) return { skipped: 'workforce paused' };
    this.running.add(agent.id);
    const started = Date.now();
    this.emitEvent({ type: 'agent:start', agent: agent.id });
    let result;
    try {
      const board = this.board || (await this.refreshBoard());
      result = await agent.run({ board, store, now, emit: (e) => this.emitEvent(e), registry: loadRegistry() });
      store.update('agent-state', {}, (all) => ({ ...all, [agent.id]: { ...(all[agent.id] || {}), lastRunAt: new Date(now).toISOString(), lastSummary: result && result.summary, lastError: '' } }));
    } catch (err) {
      result = { error: err.message };
      store.update('agent-state', {}, (all) => ({ ...all, [agent.id]: { ...(all[agent.id] || {}), lastRunAt: new Date(now).toISOString(), lastError: err.message } }));
      store.append('workforce-log', { level: 'error', agent: agent.id, message: err.stack || err.message });
    } finally {
      this.running.delete(agent.id);
    }
    store.append('agent-runs', { agent: agent.id, durationMs: Date.now() - started, summary: result && (result.summary || result.error || result.skipped) });
    this.emitEvent({ type: 'agent:finish', agent: agent.id, summary: result && (result.summary || result.error) });
    return result;
  }

  async cycle() {
    const now = Date.now();
    try {
      await this.refreshBoard();
    } catch (err) {
      store.append('workforce-log', { level: 'error', agent: 'board', message: err.message });
    }
    if (this.paused) return;
    for (const agent of AGENTS) {
      if (this.isDue(agent, now)) await this.runAgent(agent, { now });
    }
  }

  start() {
    if (this.timer) return;
    this.cycle();
    this.timer = setInterval(() => this.cycle(), this.tick);
    this.timer.unref?.();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  setPaused(paused) {
    this.paused = Boolean(paused);
    store.set('workforce-settings', { paused: this.paused });
    this.emitEvent({ type: 'workforce:paused', paused: this.paused });
  }

  setAgentEnabled(id, enabled) {
    store.update('agent-state', {}, (all) => ({ ...all, [id]: { ...(all[id] || {}), enabled: Boolean(enabled) } }));
  }

  /** Resolve a proposal. Approving an automation proposal runs it now. */
  async decideProposal(id, decision, { standing = false } = {}) {
    let proposal = null;
    store.update('proposals', [], (list) =>
      list.map((p) => {
        if (p.id !== id) return p;
        proposal = { ...p, status: decision, decidedAt: new Date().toISOString(), standing };
        return proposal;
      }),
    );
    if (!proposal) throw new Error('proposal not found');
    if (decision === 'approved' && proposal.automationId) {
      const a = loadRegistry().find((x) => x.id === proposal.automationId);
      if (!a) throw new Error('automation not found');
      if (standing) setAutomationState(a.id, { autoApproved: true, enabled: true });
      runAutomation(a, { trigger: standing ? 'standing-approval' : 'approved', onEvent: (e) => this.emitEvent(e) });
    }
    if (decision === 'approved' && proposal.automation) {
      // Scout proposal: add to the registry state as a user-added automation.
      store.update('custom-automations', [], (list) => [...list.filter((x) => x.id !== proposal.automation.id), proposal.automation]);
    }
    this.emitEvent({ type: 'proposal:decided', id, decision });
    return proposal;
  }

  async status() {
    const state = store.get('agent-state', {});
    return {
      paused: this.paused,
      llm: { available: await llmAvailable(), model: MODEL },
      agents: AGENTS.map((a) => ({
        id: a.id,
        name: a.name,
        role: a.role,
        tier: a.tier,
        cadence: a.every ? `every ${Math.round(a.every / 60000)} min` : a.clock ? a.clock.map((c) => `${String(c.hour).padStart(2, '0')}:${String(c.minute).padStart(2, '0')}`).join(' & ') : 'on demand',
        enabled: state[a.id]?.enabled !== false,
        running: this.running.has(a.id),
        lastRunAt: state[a.id]?.lastRunAt || null,
        lastSummary: state[a.id]?.lastSummary || '',
        lastError: state[a.id]?.lastError || '',
      })),
    };
  }
}
